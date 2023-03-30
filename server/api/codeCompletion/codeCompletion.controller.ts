import { Request, Response } from "express";
import { createMessagesWithUser } from "../message/message.service";
import { createTextCompletion } from "../openAi/openai.service";
import {
  checkSessionOrThrow,
  findOrUpdateSession,
} from "../supabase/supabase.service";
import {
  createBaseClassificationPrompt,
  runBaseClassificaitonChatCompletion,
} from "./codeCompletion.classifier";
import { checkDbSession } from "./codeCompletion.service";
import { CodeCompletionRequest } from "./codeCompletion.types";
import { handleGetFunctionalityWhenFileExists } from "./scenerios/codeCompletion.updateExisting";

export const handleCodeCompletion = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { messages, sessionId } = req.body as CodeCompletionRequest;

    const dbSession = await findOrUpdateSession(user, sessionId);

    const classifyMessage = await createTextCompletion(
      createBaseClassificationPrompt(messages),
      0.2
    );

    const baseClassificaiton = classifyMessage.choices[0].text?.trim();
    console.log("baseClassificaiton", baseClassificaiton);

    let metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: null as null | boolean,
      requiredFunctionality: "",
    };

    if (baseClassificaiton === "generalChat") {
      const choices = await (
        await runBaseClassificaitonChatCompletion(messages)
      ).choices;

      await createMessagesWithUser(
        user,
        choices.map((choice) => choice.message),
        sessionId
      );
      return res.status(200).json({
        data: {
          choices,
          metadata,
        },
      });
    } else if (baseClassificaiton === "creatingCode") {
      const responseBasedOnDbSession = await checkDbSession(
        dbSession,
        messages,
        user,
        sessionId
      );

      return res.status(200).json({
        data: responseBasedOnDbSession,
      });
    } else {
      res
        .status(500)
        .json({ message: "Something went wrong with the classification" });
    }
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const handleFileUpload = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { messages, fullFilePathWithName, sessionId, codeContent } =
      req.body as CodeCompletionRequest;

    await findOrUpdateSession(user, sessionId);

    const response = await handleGetFunctionalityWhenFileExists(
      messages,
      fullFilePathWithName,
      user,
      sessionId,
      codeContent
    );

    return res.status(200).json({
      data: response,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
