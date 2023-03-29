import { ChatMessage } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { deserializeJson } from "../../../utils/deserializeJson";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import {
  AllValues,
  basePrompt,
  LocationAndFunctionality,
  prefix,
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

const codeClassificationExamples = [
  {
    example:
      "For example if you don't have the project directory or any other values, the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "",
      projectDirectory: "",
      newFile: null,
    },
  },
  {
    example:
      "For example if you have the project directory, but nothing else the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "",
      projectDirectory: "The/project/directory",
      newFile: null,
    },
  },
  {
    example:
      "For example if you have the project directory and the user wants to create a new file, the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "",
      projectDirectory: "some/path",
      newFile: true,
    },
  },
  {
    example:
      "For example if you have the project directory and the user wants to update an existing file, the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "",
      projectDirectory: "some/path",
      newFile: false,
    },
  },
  {
    example:
      "For example if you have the project directory and the user wants to update an existing file, and you have the required functionality the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "This is the required functionality",
      projectDirectory: "some/path",
      newFile: false,
    },
  },
  {
    example:
      "For example if you don't have the project directory or any other values, the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "",
      projectDirectory: "",
      newFile: null,
    },
  },
  {
    example:
      "For example if the user says they want the scratch pad the response would be:",
    response: {
      projectFile: "",
      requiredFunctionality: "",
      projectDirectory: "/scratch_pad",
      newFile: null,
    },
  },
];

export function createCodeClassificationPrompt(
  messages: ChatMessage[],
  sessionDetails: LocationAndFunctionality
) {
  const examples = codeClassificationExamples.map((example) => {
    return `${example.example.trim()}: ${example.response}`;
  });

  return `${prefix}
     
      You need the following information to continue:
      '''
      location - The location where we will be writing the code. This has can be the "scratch pad", a "new file", or an "existing file"
      requiredFunctionality - The required functionality the user wants to add
      '''
      Here is what you know so far:
      {
      location: "${sessionDetails.location}"
      requiredFunctionality: "${sessionDetails.functionality}"
      }
      '''
      Here are the messages so far:
      ${JSON.stringify(messages)}
      '''
      '''
      scratch pad should be returned as "scratchPad"
      new file should be returned as "newFile"
      existing file should be returned as "existingFile"
      '''
      This is the format you need to respond with:
      {
        "location": {location},
        "functionality": {functionality}
      }
      Respond with a json object based on the information you have so far. The updated json object is
      
      
  `;
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
];

export function createBaseClassificationPrompt(messages: ChatMessage[]) {
  return `Here are the messages so far:
        ${JSON.stringify(messages, null, 2)}
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
