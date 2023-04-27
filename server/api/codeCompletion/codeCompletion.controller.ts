import { Request, Response } from "express";
import {
  createMessagesWithUser,
  getOnlyRoleAndContentMessagesByUserAndSession,
} from "../message/message.service";
import { createTextCompletion } from "../openAi/openai.service";
import { handleSearch } from "../search/search.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
  updateSession,
} from "../supabase/supabase.service";
import {
  createBaseClassificationPrompt,
  runBaseClassificaitonChatCompletion,
} from "./codeCompletion.classifier";
import {
  checkDbSession,
  handleFileUploadWithSession,
} from "./codeCompletion.service";
import { CodeCompletionRequest } from "./codeCompletion.types";
import { handleKnownNextAction } from "./scenerios/codeCompletion.knownNextAction";

export const handleCodeCompletion = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { sessionId, scratchPadContent } = req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      user.id,
      sessionId
    );

    const dbSession = await findOrCreateSession(user.id, sessionId);

    await updateSession(user.id, sessionId, {
      scratch_pad_content: scratchPadContent,
    });

    if (dbSession.expected_next_action) {
      return await handleKnownNextAction(
        sessionMessages,
        dbSession,
        user.id,
        sessionId,
        res
      );
    }

    // if (scratchPadContent){
    //   return await handleScratchPadContent(
    //     sessionMessages,
    //     dbSession,
    //     userId
    //     sessionId,
    //     scratchPadContent,
    //     res
    //   );
    // }

    const classifyMessage = await createTextCompletion(
      createBaseClassificationPrompt(sessionMessages),
      0.2
    );

    const baseClassificaiton = classifyMessage.choices[0].text?.trim();

    console.log("Base classificaiton", baseClassificaiton);

    let metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: null as null | boolean,
      requiredFunctionality: "",
    };

    if (baseClassificaiton === "generalChat") {
      const choices = await (
        await runBaseClassificaitonChatCompletion(sessionMessages)
      ).choices;

      await createMessagesWithUser(
        user.id,
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
        sessionMessages,
        user.id,
        sessionId
      );

      return res.status(200).json({
        data: responseBasedOnDbSession,
      });
    } else if (baseClassificaiton === "search") {
      return res.status(200).json(await handleSearch(user.id, sessionId));
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
