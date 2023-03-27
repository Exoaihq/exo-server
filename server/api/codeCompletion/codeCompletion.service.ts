import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { parseCodeTypes } from "../../../types/parseCode.types";
import { addCodeToTheBottonOfFile } from "../../../utils/appendFile";
import { findFileAndReturnContents } from "../../../utils/fileOperations.service";
import { parseFile } from "../../../utils/treeSitter";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import {} from "./codeCompletion.controller";
import { basePrompt, refactorCodePrompt } from "./codeCompletion.prompts";
import { getReleventPrompt, NeededValues } from "./codeCompletion.rules";
import {
  CodeCompletionRequest,
  CodeCompletionResponse,
  CodeCompletionResponseMetadata,
  OpenAiChatCompletionResponse,
} from "./codeCompletion.types";
const fs = require("fs");

export function addSystemMessage(messages: ChatMessage[], content: string) {
  return [
    {
      role: ChatUserType.system,
      content,
    },
    ...messages,
  ];
}

export async function runBaseClassificaitonChatCompletion(
  messages: ChatMessage[]
): Promise<OpenAiChatCompletionResponse> {
  const newMessages = updateBaseClassificationSystemMessage(messages);
  return await createChatCompletion(newMessages, EngineName.Turbo);
}

export function updateBaseClassificationSystemMessage(messages: ChatMessage[]) {
  const prompt = basePrompt();

  const addMessages = addSystemMessage(messages, prompt);
  return addMessages;
}

export async function updateCodeCompletionSystemMessage(
  request: CodeCompletionRequest,
  metadata: CodeCompletionResponseMetadata
): Promise<{
  addMessages: ChatMessage[];
  model: EngineName;
  neededValues: NeededValues;
}> {
  const { messages } = request;
  const { prompt, model, neededValues } = getReleventPrompt(request, metadata);

  const addMessages = addSystemMessage(messages, prompt);

  return { addMessages, model, neededValues };
}

export async function handleWritingNewFile(requiredFunctionality: string) {
  return await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: requiredFunctionality,
      },
    ],
    EngineName.GPT4
  );
}

export async function handleUpdatingExistingCode(
  requiredFunctionality: string,
  existingContent: string,
  codeMetadata: string
) {
  return await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: refactorCodePrompt(
          existingContent,
          requiredFunctionality,
          codeMetadata
        ),
      },
    ],
    EngineName.GPT4
  );
}

export function handleParsingCreatedCode(
  response: OpenAiChatCompletionResponse,
  metadata: CodeCompletionResponseMetadata
): CodeCompletionResponse {
  const parsedContent = parseReturnedCode(response.choices[0].message?.content);

  const codeCompletionChoiceResponse = [
    {
      message: {
        role: ChatUserType.assistant,
        content: parsedContent.message,
      },
      index: response.choices[0].index,
      finish_reason: response.choices[0].finish_reason,
    },
    {
      message: {
        role: ChatUserType.assistant,
        content:
          "How does it look? Let me know if you'd like to make any changes.",
      },
      index: response.choices[0].index,
      finish_reason: response.choices[0].finish_reason,
    },
  ];

  const completionResponse: CodeCompletionResponse = {
    choices: codeCompletionChoiceResponse,
    metadata,
    completedCode: parsedContent.code,
  };
  return completionResponse;
}

export const parseReturnedCode = (
  content: string
): { message: string; code: string } => {
  let res = {
    message: "",
    code: "",
  };

  if (content.includes("```")) {
    const split = content.split("```");
    res.message = split[0];
    res.code = split[1];
  } else if (content.includes("'''")) {
    const split = content.split("'''");
    res.message = split[0];
    res.code = split[1];
  }

  // res.code = commentOutProgammingLanguage(res.code);

  return res;
};

export function commentOutProgammingLanguage(code: string) {
  const refactor = code.split("\n").map((word: string, index: number) => {
    if (word.includes("typescript")) {
      return word.replace("typescript", "// typescript");
    }
  });
  return refactor.join("\n");
}

export function checkForAllValuesInObject(object: any) {
  for (const key in object) {
    if (
      object[key] === "" ||
      object[key] === null ||
      object[key] === undefined
    ) {
      return false;
    }
  }
}

// Takes a file name, parsed the code and uses it to prompt a new function
export async function refactorFile(prompt: string, filePath: string) {
  const prefix = "Here is a function you can refactor:";

  let response = null;

  await fs.readFile(filePath, "utf8", async function (err: any, data: any) {
    if (err) throw err;

    const entirePrompt = prefix + (await data) + "\n" + prompt;
    console.log(">>>>>>>>>>", entirePrompt);
    const res = await createTextCompletion(entirePrompt, 1, "Refactoring...");
    if (res.choices[0].text) {
      addCodeToTheBottonOfFile(filePath, res.choices[0].text);
    }
    console.log(res);
    response = res;
    return res;
  });

  return response;
}

// This is javascript scecific
function getNameOfAFunction(fullFunction: string) {
  const splitFunction = fullFunction.split(" ");
  const functionOrConst = fullFunction.includes("function")
    ? "function"
    : "const";
  const functionIndex = splitFunction.indexOf(functionOrConst);
  return splitFunction[functionIndex + 1].replace(/[{()}]/g, "");
}

// Takes a file name, parsed the code and uses it to prompt a new function
export async function refactorFunctionInAFile(
  prompt: string,
  filePath: string,
  functionName: string
) {
  const prefix = "Here is a function you can refactor:";

  let response = null;

  const fileContents = findFileAndReturnContents(filePath);

  const tree = await parseFile(fileContents);

  for await (const element of tree.rootNode.children) {
    const { type, text, startPosition, endPosition } = element;

    const fullElement = element.text;
    const namedChild = element.namedChildren;

    if (
      parseCodeTypes.find((type) => type.name === element.type && type.parse)
    ) {
      const nameOfFunction = getNameOfAFunction(fullElement);
      const match = functionName.includes(nameOfFunction);

      if (match) {
        console.log(">>>>>>>>>>", fullElement);
        return fullElement;
      } else {
        console.log("Function does not exist in file");
      }
    }
  }

  return response;
}

export const hasFileNameAndPath = (filePath: string) => {
  return filePath.includes("/") && filePath.includes(".");
};
