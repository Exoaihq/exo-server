import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { parseCodeTypes } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { addCodeToTheBottonOfFile } from "../../../utils/appendFile";
import { findFileAndReturnContents } from "../../../utils/fileOperations.service";
import { parseFile } from "../../../utils/treeSitter";
import {
  createMessagesWithUser,
  dbMessagesToChatMessages,
  getMessagesByUserAndSession,
} from "../message/message.service";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import {
  createAiWritenCode,
  getAiCodePerSession,
  updateSession,
} from "../supabase.service";
import { runCodeClassificaiton } from "./codeCompletion.classifier";
import {} from "./codeCompletion.controller";
import {
  AllValues,
  createNewCodePrompt,
  LocationAndFunctionality,
  locationPrompt,
  refactorCodePrompt,
  requiredFunctionalityOnlyPrompt,
} from "./codeCompletion.prompts";
import { getReleventPrompt, NeededValues } from "./codeCompletion.rules";
import {
  CodeCompletionRequest,
  CodeCompletionResponse,
  CodeCompletionResponseMetadata,
  OpenAiChatCompletionResponse,
} from "./codeCompletion.types";
import { handleUpdatingExistingCode } from "./scenerios/codeCompletion.updateExisting";
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
  const whatWeKnowAboutTheSession: LocationAndFunctionality = {
    location: dbSession.location || "",
    functionality: dbSession.functionality || "",
  };
  const { location, code_content, file_name, file_path } = dbSession;

  const classification: LocationAndFunctionality = await runCodeClassificaiton(
    whatWeKnowAboutTheSession,
    dbMessagesToChatMessages(sessionMessages)
  );

  console.log("classification", classification);

  if (location === "existingFile" && classification.functionality) {
    const latestMessage = messages[messages.length - 1];
    const codeCompletionResponse = await handleUpdatingExistingCode(
      latestMessage.content,
      code_content || "",
      file_path + "/" + file_name,
      sessionId,
      location,
      user
    );

    await createMessagesWithUser(
      user,
      codeCompletionResponse.choices.map((choice) => choice.message),
      sessionId
    );
    return await codeCompletionResponse;
  }

  if (location) {
    if (classification.functionality && textIncludeScratchPad(location)) {
      console.log("Writing to the scratch pad");
      const latestMessage = messages[messages.length - 1];

      const existingCode = await getAiCodePerSession(sessionId);

      console.log(existingCode);

      const content =
        existingCode && existingCode.code
          ? refactorCodePrompt(existingCode.code, latestMessage.content, "")
          : createNewCodePrompt(latestMessage.content, "");

      const response = await createChatCompletion(
        [
          {
            role: ChatUserType.user,
            content,
          },
        ],
        EngineName.GPT4
      );
      const metadata = {
        projectDirectory: "scratch pad",
        projectFile: "",
        newFile: false,
        requiredFunctionality: "",
      };

      updateSession(user, sessionId, {
        location: classification.location,
        functionality: classification.functionality,
      });
      return handleParsingCreatedCode(
        response,
        metadata,
        sessionId,
        location,
        user
      );
    }
  }

  if (!dbSession.location) {
    if (classification.location) {
      const updatedSession = updateSession(user, sessionId, {
        location: classification.location,
        functionality: classification.functionality,
      });

      if (textIncludeScratchPad(classification.location)) {
        // Write to the scratch pad

        const adaptedMessages = await addSystemMessage(
          messages,
          requiredFunctionalityOnlyPrompt(messages)
        );
        const response = await createChatCompletion(
          adaptedMessages,
          EngineName.Turbo,
          0.1
        );
        codeCompletionResponse.choices = response.choices;
      }

      if (classification.location === "existingFile") {
        // Update existing file
      }
    } else {
      const adaptedMessages = await addSystemMessage(
        messages,
        locationPrompt()
      );
      const response = await createChatCompletion(
        adaptedMessages,
        EngineName.Turbo,
        0.1
      );
      codeCompletionResponse.choices = response.choices;
    }
  }

  await createMessagesWithUser(
    user,
    codeCompletionResponse.choices.map((choice) => choice.message),
    sessionId
  );
  return await codeCompletionResponse;
}

export async function handleScratchPad(
  json: AllValues,
  messages: ChatMessage[],
  codeContent: string
) {
  const metadata = {
    projectDirectory: "scratch pad",
    projectFile: "",
    newFile: false,
    requiredFunctionality: "",
  };
  if (json && json.requiredFunctionality) {
    if (codeContent) {
      const latestMessage = messages[messages.length - 1];
      const content = refactorCodePrompt(
        codeContent,
        latestMessage.content,
        ""
      );

      const response = await createChatCompletion(
        [
          {
            role: ChatUserType.user,
            content,
          },
        ],
        EngineName.GPT4
      );
      return handleParsingCreatedCode(response, metadata);
    }

    const response = await handleWritingNewFile(json.requiredFunctionality);

    console.log("Writing code to scratch pad", response);

    return handleParsingCreatedCode(response, metadata);
  } else {
    const adaptedMessages = await addSystemMessage(
      messages,
      requiredFunctionalityOnlyPrompt(messages)
    );
    const response = await createChatCompletion(
      adaptedMessages,
      EngineName.Turbo
    );

    const metadata = {
      projectDirectory: "scratch pad",
      projectFile: "",
      newFile: false,
      requiredFunctionality: "",
    };

    const completionResponse: CodeCompletionResponse = {
      choices: response.choices,
      metadata,
      completedCode: undefined,
    };

    console.log("Need required functionality", completionResponse);
    return completionResponse;
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

export function handleParsingCreatedCode(
  response: OpenAiChatCompletionResponse,
  metadata: CodeCompletionResponseMetadata,
  sessionId?: string,
  location?: string,
  user?: Database["public"]["Tables"]["users"]["Row"],
  functionality?: string
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

  if (sessionId && location) {
    createAiWritenCode(sessionId, parsedContent.code, location);
    if (user) {
      createMessagesWithUser(
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

export function textIncludeScratchPad(text: string) {
  return (
    text.toLowerCase().includes("scratch") || text.toLowerCase().includes("pad")
  );
}
