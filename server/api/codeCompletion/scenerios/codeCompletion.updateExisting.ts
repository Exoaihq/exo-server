import { ChatMessage, ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import {
  extractFileNameAndPathFromFullPath,
  getDirectoryNameFromPath,
  getFileSuffix,
} from "../../../../utils/getFileName";
import {
  createAiWritenCode,
  findAiCodeBySessionAndFileName,
  updateAiWritenCode,
} from "../../aiCreatedCode/aiCreatedCode.repository";
import { createDirectoryIfNotExists } from "../../codeDirectory/codeDirectory.service";
import { createMessageWithUser } from "../../message/message.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { createNewMessagePrompt } from "../../prompt/prompt.service";
import { getSessionById, updateSession } from "../../supabase/supabase.service";
import { fileUploadPromp, refactorCodePrompt } from "../codeCompletion.prompts";
import {
  addSystemMessage,
  handleParsingCreatedCode,
} from "../codeCompletion.service";
import { CodeCompletionResponse } from "../codeCompletion.types";
import { ExpectedNextAction } from "./codeCompletion.knownNextAction";

export async function handleGetFunctionalityWhenFileExists(
  messages: ChatMessage[],
  fullFilePathWithName: string,
  userId: string,
  sessionId: string,
  codeContent: string
) {
  const adaptedMessages = await addSystemMessage(messages, fileUploadPromp());

  const response = await createChatCompletion(
    adaptedMessages,
    EngineName.Turbo
  );

  console.log(
    "I have the file but need the functionality response",
    response.choices[0]
  );

  const { fileName, extractedPath } =
    extractFileNameAndPathFromFullPath(fullFilePathWithName);

  // Adds the directory to the account so that it can be use for future code completion

  await createDirectoryIfNotExists(
    userId,
    extractedPath,
    getDirectoryNameFromPath(extractedPath),
    false
  );

  const metadata = {
    projectDirectory: extractedPath,
    projectFile: fileName,
    newFile: false,
    requiredFunctionality: "",
  };

  const completionResponse: CodeCompletionResponse = {
    choices: response.choices,
    metadata,
  };

  if (completionResponse && completionResponse?.choices[0]) {
    const newMessage = await createMessageWithUser(
      userId,
      response.choices[0].message,
      sessionId
    );

    if (newMessage) {
      await createNewMessagePrompt(newMessage.id);
    }
  }

  updateSession(userId, sessionId, {
    location: "existingFile",
    functionality: "",
    file_name: fileName,
    file_path: extractedPath,
    new_file: false,
    code_content: codeContent,
    expected_next_action: ExpectedNextAction.EXISTING_FILE,
  });
  return completionResponse;
}

export async function handleUpdatingExistingCode(
  requiredFunctionality: string,
  existingContent: string,
  fullFilePathWithName: string,
  sessionId: string,
  location: string,
  userId: string
): Promise<CodeCompletionResponse> {
  const { fileName, extractedPath } =
    extractFileNameAndPathFromFullPath(fullFilePathWithName);
  const fileSuffix = getFileSuffix(fileName);

  const codeMetadata = `The file ${fileName} has the suffix ${fileSuffix}. The update code should be the same type of code as the suffix indicates.`;

  const metadata = {
    projectDirectory: extractedPath,
    projectFile: fileName,
    newFile: false,
    requiredFunctionality: "",
  };

  const session = await getSessionById(sessionId);

  const refactorPrompt = refactorCodePrompt(
    existingContent,
    requiredFunctionality,
    codeMetadata,
    session.expected_next_action || ""
  );

  const response = await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: refactorPrompt,
      },
    ],
    EngineName.GPT4
  );

  const writeCodeObject = await findAiCodeBySessionAndFileName(
    sessionId,
    fileName
  );
  if (writeCodeObject) {
    updateAiWritenCode(writeCodeObject.id, {
      functionality: requiredFunctionality,
      code: response.choices[0].message?.content,
      completed_at: new Date().toISOString(),
      location,
      path: extractedPath,
      file_name: fileName,
    });
  } else {
    createAiWritenCode({
      functionality: requiredFunctionality,
      code: response.choices[0].message?.content,
      completed_at: new Date().toISOString(),
      location,
      path: extractedPath,
      file_name: fileName,
      session_id: sessionId,
    });
  }

  return handleParsingCreatedCode(
    response,
    metadata,
    sessionId,
    location,
    userId,
    requiredFunctionality
  );
}
