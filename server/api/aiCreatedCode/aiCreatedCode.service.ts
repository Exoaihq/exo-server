import { ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../types/supabase";
import { deserializeJson } from "../../../utils/deserializeJson";
import {
  createNewCodePrompt,
  getFileNameAndFunctionalityPrompt,
} from "../codeCompletion/codeCompletion.prompts";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import { getSessionById } from "../supabase/supabase.service";
import {
  createAiWritenCode,
  getAiCodeBySession,
  updateAiWritenCode,
} from "./aiCreatedCode.repository";

export const createAiCodeFromNewFilePrompt = async (
  userId: string,
  content: string,
  sessionId: string,
  path: string
) => {
  // Parse the content into file name and functionality

  const fileNameAndFunc = await createTextCompletion(
    getFileNameAndFunctionalityPrompt(content),
    0.2
  );
  if (!fileNameAndFunc.choices[0].text) {
    throw new Error("Could not parse file name and functionality");
  }
  const { fileName, functionality } = deserializeJson(
    fileNameAndFunc.choices[0].text
  );

  if (!fileName || !functionality) {
    throw new Error("Could not parse file name and functionality");
  }
  console.log("fileNameAndFunc", fileNameAndFunc, fileName, functionality);

  const session = await getSessionById(sessionId);

  const codePrompt = createNewCodePrompt(
    functionality,
    "",
    session.scratch_pad_content || ""
  );

  // Create the code
  const response = await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: codePrompt,
      },
    ],
    EngineName.GPT4
  );

  const code = response.choices[0].message?.content;

  // Add it to ai created code

  createAiWritenCode({
    code,
    functionality,
    session_id: sessionId,
    location: "newFile",
    completed_at: new Date().toISOString(),
    path,
    file_name: fileName,
  });
};

export const findAndUpdateAiCodeBySession = async (
  sessionId: string,
  updates: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>,
  property:
    | "code"
    | "completed_at"
    | "created_at"
    | "file_name"
    | "functionality"
    | "id"
    | "location"
    | "path"
    | "session_id"
    | "writen_to_file_at"
) => {
  const aiGeneratedCode = await getAiCodeBySession(sessionId);

  if (aiGeneratedCode.length > 0) {
    // Get the most recent ai generated code that the location is not set to
    const aiGeneratedCodeWithProperyNotSet = aiGeneratedCode.find(
      (aiCreatedCode) => aiCreatedCode[property] === null
    );

    // If there is an ai generated code that has not been set to the property
    if (aiGeneratedCodeWithProperyNotSet) {
      await updateAiWritenCode(aiGeneratedCodeWithProperyNotSet.id, {
        ...updates,
      });
    } else {
      // If there is not an ai generated code, create one
      await createAiWritenCode({
        session_id: sessionId,
        ...updates,
      });
    }
  } else {
    await createAiWritenCode({
      session_id: sessionId,
      ...updates,
    });
  }
};
