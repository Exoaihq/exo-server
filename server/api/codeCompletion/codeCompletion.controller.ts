import { Request, Response } from "express";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { writeStringToFileAtLocation } from "../../../utils/appendFile";
import { deserializeJson } from "../../../utils/deserializeJson";
import {
  extractFileNameAndPathFromFullPath,
  getFileSuffix,
} from "../../../utils/getFileName";
import { checkSession } from "../codeSnippet/supabase.service";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import {
  creatCodeClassificationPrompt,
  createBaseClassificationPrompt,
} from "./codeCompletion.classifier";
import {
  AllValues,
  requiredFunctionalityOnlyPrompt,
} from "./codeCompletion.prompts";
import { whatValuesDoWeNeed } from "./codeCompletion.rules";
import {
  addSystemMessage,
  handleParsingCreatedCode,
  handleUpdatingExistingCode,
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

    const { messages, codeContent, fullFilePathWithName } =
      req.body as CodeCompletionRequest;

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

      console.log("classifyCodeCreation", classifyCodeCreation);

      const messageAndModel = await updateCodeCompletionSystemMessage(
        req.body as CodeCompletionRequest,
        metadata
      );

      const json: AllValues = deserializeJson(
        classifyCodeCreation.choices[0].text
          ? classifyCodeCreation.choices[0].text.trim()
          : ""
      );

      // If you have a full file path including name and the code content you can update it

      if (codeContent && fullFilePathWithName) {
        if (json && json.requiredFunctionality) {
          const { fileName, extractedPath } =
            extractFileNameAndPathFromFullPath(fullFilePathWithName);
          const fileSuffix = getFileSuffix(fileName);

          response = await handleUpdatingExistingCode(
            codeContent,
            json.requiredFunctionality,
            `The file ${fileName} has the suffix ${fileSuffix}. The update code should be the same type of code as the suffix indicates.`
          );

          console.log("Updating code:", response);

          metadata = {
            projectDirectory: extractedPath,
            projectFile: fileName,
            newFile: false,
            requiredFunctionality: "",
          };

          return res
            .status(200)
            .json({ data: handleParsingCreatedCode(response, metadata) });
        } else {
          const adaptedMessages = await addSystemMessage(
            messages,
            requiredFunctionalityOnlyPrompt(messages)
          );
          response = await createChatCompletion(
            adaptedMessages,
            EngineName.Turbo
          );

          const { fileName, extractedPath } =
            extractFileNameAndPathFromFullPath(fullFilePathWithName);

          metadata = {
            projectDirectory: extractedPath,
            projectFile: fileName,
            newFile: false,
            requiredFunctionality: "",
          };

          const completionResponse: CodeCompletionResponse = {
            choices: response.choices,
            metadata,
          };

          console.log("need required functionality", completionResponse);
          return res.status(200).json({ data: completionResponse });
        }
      }

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
