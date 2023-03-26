import { ChatMessage } from "../../../types/chatMessage.type";
import { AllValues } from "./codeCompletion.prompts";

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
];

export function creatCodeClassificationPrompt(messages: ChatMessage[]) {
  const examples = codeClassificationExamples.map((example) => {
    return `${example.example.trim()}: ${example.response}`;
  });

  return `Here are the messages so far:
      ${JSON.stringify(messages)}
      You need the following information to continue:
      ${JSON.stringify(all, null, 2)}
      ${examples}
      Respond with the object based on the information you have:
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
