import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";

export const prefix = `You are a friendly chat bot that is helping the user create code and have full access to the users file system.
`;

const suffix = `Please respond with a friendly message and nudge the user to tell you `;

export interface AllValues {
  projectFile: string;
  requiredFunctionality: string;
  projectDirectory: string;
  newFile: boolean | null;
}

export interface LocationAndFunctionality {
  location: string;
  functionality: string;
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

export function locationPrompt() {
  return `
  ${prefix}
  You need to get the user to tell you where they want to put the updated code before you can continue. Three options are: "in a new file", "in an existing file", or "in the scratch pad".
  The user has not told you where they want to put the code yet. Please ask them where they want to put the code.
  `;
}

export function directoryOnlyPrompt(messages: ChatMessage[]) {
  return `
    ${prefix}
    You need to get the user to tell you the project directory before you can continue.
    Here is the conversation so far:
    ${JSON.stringify(messages, null, 2)}
    When you know the directory say: "Ok I have the directory. What would you like to create a new file or update an existing one?" 
    If the directory is not in the conversation ${suffix} the directory or scratch pad. Also say that the user can use the upload button to select a file or directroy or they can use the scratch pad.
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
    Here is some information about the code:
    ${codeMetadata}
    '''
    And here is the refactor I want to make:
    ${requiredFunctionality}
    '''
    Write the code to make the changes.
    `;
}

export function createNewCodePrompt(
  functionality: string,
  codeMetadata: string
) {
  return `You an and api chatbot that is helping me create code.
    '''
    Here is some information about the code:
    ${codeMetadata}
    '''
    And here is the functionality the code should have:
    ${functionality}
    '''
    Write the code to make the changes.
    `;
}
