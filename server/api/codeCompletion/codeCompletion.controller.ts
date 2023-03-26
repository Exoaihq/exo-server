import { Request, Response } from "express";
import { writeStringToFileAtLocation } from "../../../utils/appendFile";
import { deserializeJson } from "../../../utils/deserializeJson";
import { checkSession } from "../codeSnippet/supabase.service";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import {
  creatCodeClassificationPrompt,
  createBaseClassificationPrompt,
} from "./codeCompletion.classifier";
import { AllValues } from "./codeCompletion.prompts";
import { whatValuesDoWeNeed } from "./codeCompletion.rules";
import {
  handleParsingCreatedCode,
  handleWritingNewFile,
  runBaseClassificaitonChatCompletion,
  updateCodeCompletionSystemMessage,
} from "./codeCompletion.service";
import {
  CodeCompletionRequest,
  CodeCompletionResponse,
} from "./codeCompletion.types";

export const handleCodeCompletion = async (req: Request, res: Response) => {
  try {
    const { access_token, refresh_token } = req.headers;

    const access = access_token as string;
    const refresh = refresh_token as string;

    const session = await checkSession({
      access_token: access,
      refresh_token: refresh,
    });

    if (!access_token || !refresh_token || !session || !session.data?.user) {
      return res
        .status(401)
        .json({ message: "You have to be logged in to do that" });
    }

    const { messages, codeContent } = req.body as CodeCompletionRequest;

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
    let response;

    if (baseClassificaiton === "generalChat") {
      const choices = await (
        await runBaseClassificaitonChatCompletion(messages)
      ).choices;

      return res.status(200).json({
        data: {
          choices,
          metadata,
        },
      });
    } else if (baseClassificaiton === "creatingCode") {
      // TODO - figure out how to extrapolate this functionality into a service
      const classifyCodeCreation = await createTextCompletion(
        creatCodeClassificationPrompt(messages)
      );

      const messageAndModel = await updateCodeCompletionSystemMessage(
        req.body as CodeCompletionRequest,
        metadata
      );

      const json: AllValues = deserializeJson(
        classifyCodeCreation.choices[0].text
          ? classifyCodeCreation.choices[0].text.trim()
          : ""
      );
      if (json) {
        console.log("json", json);
        const neededValues = whatValuesDoWeNeed(json);

        console.log("neededValues", neededValues);

        metadata = { ...json };

        if (neededValues === "none") {
          console.log("creating code", json.requiredFunctionality);

          if (json.newFile) {
            response = await handleWritingNewFile(json.requiredFunctionality);
          } else {
            response = await createChatCompletion(
              messageAndModel.addMessages,
              messageAndModel.model
            );
          }

          return res
            .status(200)
            .json({ data: handleParsingCreatedCode(response, metadata) });
        }
      }

      const { addMessages, model } = messageAndModel;

      response = await createChatCompletion(addMessages, model);

      const completionResponse: CodeCompletionResponse = {
        choices: response.choices,
        metadata,
      };

      console.log("completionResponse", completionResponse);

      return res.status(200).json({ data: completionResponse });
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
