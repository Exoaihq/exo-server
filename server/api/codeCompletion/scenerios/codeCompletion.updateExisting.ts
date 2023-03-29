import { ChatMessage, ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../../types/supabase";
import {
  extractFileNameAndPathFromFullPath,
  getDirectoryNameFromPath,
  getFileSuffix,
} from "../../../../utils/getFileName";
import { createMessagesWithUser } from "../../message/message.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { createCodeDirectory } from "../../codeDirectory/codeDirectory.service";
import { updateSession } from "../../supabase/supabase.service";
import {
  refactorCodePrompt,
  requiredFunctionalityOnlyPrompt,
} from "../codeCompletion.prompts";
import {
  addSystemMessage,
  codeCompletionResponse,
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
  const adaptedMessages = await addSystemMessage(
    messages,
    requiredFunctionalityOnlyPrompt(messages)
  );

  const response = await createChatCompletion(
    adaptedMessages,
    EngineName.Turbo
  );

  const { fileName, extractedPath } =
    extractFileNameAndPathFromFullPath(fullFilePathWithName);

  // Adds the directory to the account so that it can be use for future code completion

  await createCodeDirectory(
    user,
    extractedPath,
    getDirectoryNameFromPath(extractedPath)
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
  await createMessagesWithUser(
    user,
    codeCompletionResponse.choices.map((choice) => choice.message),
    sessionId
  );

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
  user: Database["public"]["Tables"]["users"]["Row"]
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

  const response = await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: refactorCodePrompt(
          existingContent,
          requiredFunctionality,
          codeMetadata
        ),
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
    requiredFunctionality
  );
}
