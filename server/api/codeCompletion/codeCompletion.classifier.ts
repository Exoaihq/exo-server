import { ChatMessage } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../types/supabase";
import { deserializeJson } from "../../../utils/deserializeJson";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import {
  AllValues,
  basePrompt,
  createCodeClassificationPrompt,
  createUpdateExistingOrCreateNewPrompt,
  fileUploadClassificaitonPrompt,
  LocationAndFunctionality,
} from "./codeCompletion.prompts";
import { addSystemMessage } from "./codeCompletion.service";
import { OpenAiChatCompletionResponse } from "./codeCompletion.types";

const all: AllValues = {
  projectFile: "",
  requiredFunctionality: "",
  projectDirectory: "",
  newFile: null,
};

export interface CodeClassifcationExamples {
  example: string;
  response: AllValues;
}

const baseClassificaitonExamples = [
  {
    generalChat: "Hi, how are you?",
  },
  {
    generalChat: "What is your favorite color?",
  },
  {
    creatingCode: "/User/Code/Project/Directory",
  },
  {
    creatingCode: "index.html",
  },
  {
    creatingCode: "Hi there can you write some code for me",
  },
  {
    creatingCode: "new file",
  },
  {
    creatingCode: "existing file",
  },
];

export function createBaseClassificationPrompt(messages: ChatMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  return `Here is the most recent message:
        ${userMessages[userMessages.length - 1].content}
       Please classifiy the most recent message as one of the following:
       generalChat - The user is asking a general question that doesn't relate to creating code
       creatingCode - The user is asking for help creating code or responding to a request to help create code
       Examples:
       ${JSON.stringify(baseClassificaitonExamples)}
        Respond with the classification either "generalChat" or "creatingCode":
       "
    `;
}

export async function runCodeClassificaiton(
  whatWeKnow: LocationAndFunctionality,
  sessionMessages: ChatMessage[]
): Promise<LocationAndFunctionality> {
  const classificationPrompt = createCodeClassificationPrompt(
    sessionMessages,
    whatWeKnow
  );

  console.log("Code classification prompt", classificationPrompt);

  const response = await createTextCompletion(classificationPrompt, 0.1);

  const classification = response.choices[0].text;

  const base = {
    location: "",
    functionality: "",
  };

  if (classification) {
    const json: LocationAndFunctionality = deserializeJson(
      classification ? classification.trim() : ""
    );
    if (json) {
      return json;
    } else {
      console.log("Classification conversion to json failed", classification);
      return base;
    }
  } else {
    console.log("No classification found", classification);
    return base;
  }
}

export async function runUpdateExistingOrCreateNewClassificaiton(
  lastMessage: string
): Promise<{ where: "existing" | "new" | string }> {
  const classificationPrompt =
    createUpdateExistingOrCreateNewPrompt(lastMessage);

  const response = await createTextCompletion(classificationPrompt, 0.1);

  const classification = response.choices[0].text;

  const base = {
    where: "",
  };

  if (classification) {
    const json: {
      where: "existing" | "new";
    } = deserializeJson(classification ? classification.trim() : "");
    if (json) {
      return json;
    } else {
      console.log("Classification conversion to json failed", classification);
      return base;
    }
  } else {
    console.log("No classification found", classification);
    return base;
  }
}

export async function runFileUploadClassificaiton(
  messages: ChatMessage[],
  dbSession: Database["public"]["Tables"]["session"]["Row"]
): Promise<{ functionality: string }> {
  const classificationPrompt = fileUploadClassificaitonPrompt(
    messages,
    dbSession.functionality || ""
  );

  const response = await createTextCompletion(classificationPrompt, 0.1);

  const classification = response.choices[0].text;

  const base = {
    functionality: "",
  };

  if (classification) {
    const json: LocationAndFunctionality = deserializeJson(
      classification ? classification.trim() : ""
    );
    if (json) {
      return json;
    } else {
      console.log("Classification conversion to json failed", classification);
      return base;
    }
  } else {
    console.log("No classification found", classification);
    return base;
  }
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
