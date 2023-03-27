import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";

const prefix = `You are a friendly chat bot that is helping the user create code and have full access to the users file system.
`;

const suffix = `Please respond with a friendly message and nudge the user to tell you `;

export interface AllValues {
  projectFile: string;
  requiredFunctionality: string;
  projectDirectory: string;
  newFile: boolean | null;
}

export const startingMessage: ChatMessage = {
  role: ChatUserType.system,
  content: `${prefix}`,
};

export function basePrompt() {
  return `
    ${prefix}
    Every once in while mention that you can help the user create code.
`;
}

export function directoryOnlyPrompt(messages: ChatMessage[]) {
  return `
    ${prefix}
    You need to get the user to tell you the project directory before you can continue.
    Here is the conversation so far:
    ${JSON.stringify(messages, null, 2)}
    When you know the directory say: "Ok I have the directory. What would you like to create a new file or update an existing one?" 
    If the directory is not in the conversation ${suffix} the directory. Also mention that the user can use the upload button to select a file or directroy.
`;
}

export function newFilePrompt(messages: ChatMessage[]) {
  return `${prefix}
        You need to get the user to tell you if you need create a new file or update an existing one before you can continue.
        Here is the conversation so far:
        ${JSON.stringify(messages, null, 2)}
        When you know the answer say the answer and ask the user for the file name they want to create or update.
       ${suffix} if they want to create a new file or update an existing one.
    `;
}

export function fileNamePrompt(messages: ChatMessage[]) {
  return `${prefix}
      You need to get the user to tell you the name of the file you want to create or refactor before you can continue.
      Here is the conversation so far:
      ${JSON.stringify(messages, null, 2)}
      When you know the file name say: "Ok I have the file name. What functionality would you like to add?" 
     ${suffix} the file name.
  `;
}

export function requiredFunctionalityOnlyPrompt(messages: ChatMessage[]) {
  return `${prefix}
        You need to get the user to tell you the required functionality you they want to update in the code before you can continue.
        Here is the conversation so far:
        ${JSON.stringify(messages, null, 2)}
        When you know the required functionality repeat it back and ask the user if they want to make these changes now 
       ${suffix} the required functionality.
    `;
}

export function haveAllTheValuesPrompt(messages: ChatMessage[]) {
  return `You an and api chatbot that is helping the user create code. You have all the information you need to make the changes.
        Here is the conversation so far:
        ${JSON.stringify(messages, null, 2)}
       Ask the user if they'd like to make the changes now.
    `;
}

export function refactorCodePrompt(
  codeContent: string,
  requiredFunctionality: string,
  codeMetadata: string
) {
  return `You an and api chatbot that is helping me create code. Here is the content of the file the I want to update:
    '''
    ${codeContent}
    '''
    And here is the refactor I want to make:
    ${requiredFunctionality}
    Here is some information about the code:
    ${codeMetadata}
    Write the code to make the changes.
    `;
}
