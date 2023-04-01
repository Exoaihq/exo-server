import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { parseCodeTypes } from "../../../types/parseCode.types";
import { Database, Json } from "../../../types/supabase";
import { findFileAndReturnContents } from "../../../utils/fileOperations.service";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { parseFile } from "../../../utils/treeSitter";
import {
  findOrCreateAiWritenCode,
  updateAiWritenCode,
} from "../aiCreatedCode/aiCreatedCode.service";
import {
  createMessagesWithUser,
  createMessageWithUser,
  dbMessagesToChatMessages,
  getMessagesByUserAndSession,
} from "../message/message.service";
import { createChatCompletion } from "../openAi/openai.service";
import { updateSession } from "../supabase/supabase.service";
import {
  runCodeClassificaiton,
  runFileUploadClassificaiton,
} from "./codeCompletion.classifier";
import {} from "./codeCompletion.controller";
import {
  LocationAndFunctionality,
  locationPrompt,
} from "./codeCompletion.prompts";
import { getReleventPrompt, NeededValues } from "./codeCompletion.rules";
import {
  CodeCompletionRequest,
  CodeCompletionResponse,
  CodeCompletionResponseMetadata,
  OpenAiChatCompletionResponse,
} from "./codeCompletion.types";
import {
  handleExistingFileUpdate,
  handleScratchPadUpdate,
} from "./scenerios/codeCompletion.knowFuncAndLoc";
import { handleKNnowLocButNotFunc } from "./scenerios/codeCompletion.knowLocNotFunc";
import { handleGetFunctionalityWhenFileExists } from "./scenerios/codeCompletion.updateExisting";
const fs = require("fs");

export const codeCompletionResponse: CodeCompletionResponse = {
  choices: [],
  metadata: {
    projectDirectory: "",
    projectFile: "",
    newFile: null,
    requiredFunctionality: "",
  },
  completedCode: "",
};

export function addSystemMessage(messages: ChatMessage[], content: string) {
  return [
    ...messages,
    {
      role: ChatUserType.system,
      content,
    },
  ];
}
export async function checkDbSession(
  dbSession: Database["public"]["Tables"]["session"]["Row"],
  messages: ChatMessage[],
  user: Database["public"]["Tables"]["users"]["Row"],
  sessionId: string
): Promise<CodeCompletionResponse> {
  const sessionMessages = await getMessagesByUserAndSession(user, sessionId);

  const writeCodeObject = await findOrCreateAiWritenCode(sessionId);

  const whatWeKnowAboutTheSession: LocationAndFunctionality = {
    location: dbSession.location || "",
    functionality: dbSession.functionality || "",
  };
  const { code_content, file_name, file_path, location } = dbSession;

  const classification: LocationAndFunctionality = await runCodeClassificaiton(
    whatWeKnowAboutTheSession,
    dbMessagesToChatMessages(sessionMessages)
  );

  console.log("Code classification", classification);

  if (
    location === "existingFile" &&
    code_content &&
    !writeCodeObject.completed_at &&
    classification.functionality
  ) {
    // We have code but we have not udpated it yet

    console.log("We have code but we have not udpated it yet");
    if (classification.functionality) {
      return await handleExistingFileUpdate(
        messages,
        classification,
        user,
        sessionId,
        code_content,
        file_name || "",
        file_path || "",
        writeCodeObject
      );
    }
  }

  // Handle know both
  if (classification.location && classification.functionality) {
    if (classification.location === "existingFile") {
      return handleExistingFileUpdate(
        messages,
        classification,
        user,
        sessionId,
        code_content,
        file_name || "",
        file_path || "",
        writeCodeObject
      );
    }

    if (classification.location === "newFile") {
    }

    if (classification.location === "scratchPad") {
      return await handleScratchPadUpdate(
        messages,
        classification,
        user,
        sessionId,
        classification.location,
        writeCodeObject
      );
    }
  }

  // Handle know location but not functionality
  if (classification.location && !classification.functionality) {
    return await handleKNnowLocButNotFunc(
      messages,
      user,
      sessionId,
      classification
    );
  }

  // Handle know functionality but not location - write to scratch pad
  if (classification.functionality && !classification.location) {
    return await handleScratchPadUpdate(
      messages,
      classification,
      user,
      sessionId,
      "scratchPad",
      writeCodeObject
    );
  }

  // Handle know nothing - this is the default case
  const adaptedMessages = await addSystemMessage(messages, locationPrompt());
  const response = await createChatCompletion(
    adaptedMessages,
    EngineName.Turbo,
    0.1
  );
  codeCompletionResponse.choices = response.choices;

  await createMessageWithUser(
    user,
    codeCompletionResponse.choices[0].message,
    sessionId
  );
  return await codeCompletionResponse;
}

export async function handleFileUploadWithSession(
  sessionMessages: ChatMessage[],
  fullFilePathWithName: string,
  user: {
    avatar_url: string | null;
    billing_address: Json;
    email: string | null;
    full_name: string | null;
    id: string;
    payment_method: Json;
  },
  sessionId: string,
  codeContent: string,
  dbSession: {
    code_content: string | null;
    created_at: string | null;
    file_name: string | null;
    file_path: string | null;
    functionality: string | null;
    id: string;
    location: string | null;
    new_file: boolean | null;
    updated_at: string | null;
    user_id: string | null;
  }
): Promise<CodeCompletionResponse> {
  const classification = await runFileUploadClassificaiton(
    sessionMessages,
    dbSession
  );

  const writeCodeObject = await findOrCreateAiWritenCode(sessionId);

  console.log("File upload classification", classification);

  const { fileName, extractedPath } =
    extractFileNameAndPathFromFullPath(fullFilePathWithName);

  if (classification.functionality) {
    return await handleExistingFileUpdate(
      sessionMessages,
      classification,
      user,
      sessionId,
      codeContent,
      fileName ? fileName : dbSession.file_name || "",
      extractedPath ? extractedPath : dbSession.file_path || "",
      writeCodeObject
    );
  } else {
    return await handleGetFunctionalityWhenFileExists(
      sessionMessages,
      fullFilePathWithName,
      user,
      sessionId,
      codeContent
    );
  }
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

export async function handleParsingCreatedCode(
  response: OpenAiChatCompletionResponse,
  metadata: CodeCompletionResponseMetadata,
  sessionId?: string,
  location?: string,
  user?: Database["public"]["Tables"]["users"]["Row"],
  functionality?: string,
  writeCodeObject?: Partial<
    Database["public"]["Tables"]["ai_created_code"]["Row"]
  >
): Promise<CodeCompletionResponse> {
  const parsedContent = parseReturnedCode(response.choices[0].message?.content);
  console.log("parsed content", parsedContent);

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

  if (writeCodeObject && writeCodeObject.id) {
    updateAiWritenCode(writeCodeObject.id, {
      functionality,
      code: parsedContent.code,
      // @ts-ignore
      completed_at: new Date(),
      location,
    });
  }

  if (sessionId && location) {
    if (user) {
      await createMessagesWithUser(
        user,
        codeCompletionChoiceResponse.map((choice) => choice.message),
        sessionId
      );

      updateSession(user, sessionId, {
        location,
        code_content: parsedContent.code,
        functionality,
      });
    }
  }

  const completionResponse: CodeCompletionResponse = {
    choices: codeCompletionChoiceResponse,
    metadata,
    completedCode: parsedContent.code,
  };

  console.log("completion response", completionResponse);
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

export function textIncludeScratchPad(text: string) {
  return (
    text.toLowerCase().includes("scratch") || text.toLowerCase().includes("pad")
  );
}
