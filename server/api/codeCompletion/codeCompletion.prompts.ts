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

export function useChooseFile() {
  return `
  ${prefix}
  The user wants to update an existing file. You have full access to the file system. Ask them to use the choose file button that is the located in the scratch pad to select the file they wish to upload.
  `;
}

export function useChooseDirectory() {
  return `
  ${prefix}
  If the user wants to create a new file you should tell them to use the choose directory button to select the location where they would like to create the file.
  This is an example of how you can help the user:
  "Ok you want to create a new file. Use the choose directory button to select the location where you would like to create the file."
  For example if the users says they want to create a new file then you would respond with: "Ok you want to create a new file. Use the choose directory button to select the location where you would like to create the file."
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

export function fileUploadPromp() {
  return `${prefix}
       The user just uploaded a file that you can help refactor.
      Ask the user to tell you the required refactor they want to make.
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

export function fileUploadClassificaitonPrompt(
  messages: ChatMessage[],
  functionality: string
) {
  const userMessages = messages.filter((message) => message.role === "user");
  return `
   ${prefix}
    '''
    The user just uploaded a file. I need to know if the system has the functionality the user needs to update the file.
    '''
    Here is the functionality stored in the database:
    ${functionality}
    '''
    Here are the messages so far:
    ${JSON.stringify(messages, null, 2)}
    '''
    This is the most recent message:
    ${userMessages[userMessages.length - 1]}
    '''
    This is the format you need to respond with:
    {
      "functionality": {functionality}
    }
    Respond with a json object based on the information you have so far. The updated json object is

    `;
}

export function createCodeClassificationPrompt(
  messages: ChatMessage[],
  sessionDetails: LocationAndFunctionality
) {
  const userMessages = messages.filter((message) => message.role === "user");

  return `${prefix}
     
      You need the following information to continue:
      '''
      location - The location where we will be writing the code. This has can be the "scratch pad", a "new file", or an "existing file"
      functionality - The required functionality the user wants to add
      '''
      Here is what you know so far:
      {
      location: "${sessionDetails.location}"
      functionality: "${sessionDetails.functionality}"
      }
      '''
      Here are the messages so far:
      ${JSON.stringify(messages)}
      '''
      This is the most recent message:
      ${userMessages[userMessages.length - 1]}
      If this message defines functionality it should be returned as "functionality"
      If this message defines the location it should be returned as "location"
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
