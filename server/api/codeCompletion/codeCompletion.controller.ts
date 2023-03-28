import { Request, Response } from "express";
import { writeStringToFileAtLocation } from "../../../utils/appendFile";
import { createMessagesWithUser } from "../message/message.service";
import { createTextCompletion } from "../openAi/openai.service";
import { checkSessionOrThrow, findOrUpdateSession } from "../supabase.service";
import {
  createBaseClassificationPrompt,
  runBaseClassificaitonChatCompletion,
} from "./codeCompletion.classifier";
import { checkDbSession } from "./codeCompletion.service";
import { CodeCompletionRequest } from "./codeCompletion.types";

export const handleCodeCompletion = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { messages, fullFilePathWithName, sessionId } =
      req.body as CodeCompletionRequest;

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

const fun =
  "export async function findAllSnippetWithoutFiles(): Promise<SnippetWithoutFiles[] | null> {\n const { data, error } = await supabase.from('code_snippet')\n.select('file_name, id').is('code_file_id', null)\n if (error) {console.log(error)return null}if (!data) {return null}return data}\n";

export const addToSpecificFileLocation = async (
  req: Request,
  res: Response
) => {
  try {
    const location = "/Users/kg/Repos/code-gen-server/example/example.ts";

    const response = await writeStringToFileAtLocation(location, fun, 14);

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
