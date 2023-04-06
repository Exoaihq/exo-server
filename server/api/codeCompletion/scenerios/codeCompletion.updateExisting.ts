import { ChatMessage, ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../../types/supabase";
import {
  extractFileNameAndPathFromFullPath,
  getDirectoryNameFromPath,
  getFileSuffix,
} from "../../../../utils/getFileName";
import {
  createCodeDirectory,
  createDirectoryIfNotExists,
} from "../../codeDirectory/codeDirectory.service";
import { createMessageWithUser } from "../../message/message.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { updateSession } from "../../supabase/supabase.service";
import { fileUploadPromp, refactorCodePrompt } from "../codeCompletion.prompts";
import {
  addSystemMessage,
  handleParsingCreatedCode,
} from "../codeCompletion.service";
import { CodeCompletionResponse } from "../codeCompletion.types";

export async function handleGetFunctionalityWhenFileExists(
  messages: ChatMessage[],
  fullFilePathWithName: string,
  user: Database["public"]["Tables"]["users"]["Row"],
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
    user,
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
    await createMessageWithUser(user, response.choices[0].message, sessionId);
  }

  updateSession(user, sessionId, {
    location: "existingFile",
    functionality: "",
    file_name: fileName,
    file_path: extractedPath,
    new_file: false,
    code_content: codeContent,
  });
  return completionResponse;
}

export async function handleUpdatingExistingCode(
  requiredFunctionality: string,
  existingContent: string,
  fullFilePathWithName: string,
  sessionId: string,
  location: string,
  user: Database["public"]["Tables"]["users"]["Row"],
  writeCodeObject: Partial<
    Database["public"]["Tables"]["ai_created_code"]["Row"]
  >
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

  const refactorPrompt = refactorCodePrompt(
    existingContent,
    requiredFunctionality,
    codeMetadata
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

  return handleParsingCreatedCode(
    response,
    metadata,
    sessionId,
    location,
    user,
    requiredFunctionality,
    writeCodeObject
  );
}
