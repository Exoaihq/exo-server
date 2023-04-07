import { createClient } from "@supabase/supabase-js";
import { ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../types/supabase";
import { deserializeJson } from "../../../utils/deserializeJson";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { getFileNameAndFunctionalityPrompt } from "../codeCompletion/codeCompletion.prompts";
import {
  createChatCompletion,
  createTextCompletion,
} from "../openAi/openai.service";
import { updateSession } from "../supabase/supabase.service";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const createAiCodeFromNewFilePrompt = async (
  user: Database["public"]["Tables"]["users"]["Row"],
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
  // Create the code
  const response = await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: functionality,
      },
    ],
    EngineName.GPT4
  );

  const code = response.choices[0].message?.content;

  updateSession(user, sessionId, {
    code_content: code,
    file_name: fileName,
    file_path: path,
    new_file: false,
    location: "existingFile",
    expected_next_action: null,
  });

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

export const getAiCodeBySession = async (
  sessionId: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"][]> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code error", error);
  }

  return data as Database["public"]["Tables"]["ai_created_code"]["Row"][];
};

export const getAiCodeBySessionCodeNotNull = async (
  sessionId: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .eq("session_id", sessionId)
    .not("code", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code error", error);
  }

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const findOrCreateAiWritenCode = async (
  sessionId: string,
  values?: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .eq("session_id", sessionId);

  if (data) {
    console.log("Write code object found. ID:", data && data[0] && data[0].id);
  }

  // Create a new object if the object was already created
  if (data && data.length > 0 && data[0] && !data[0].completed_at) {
    return data[0];
  } else {
    const { data } = await supabase
      .from("ai_created_code")
      .insert([{ session_id: sessionId, ...values }])
      .select();

    // @ts-ignore
    return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
  }
};

export const createAiWritenCode = async (
  values: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data } = await supabase
    .from("ai_created_code")
    .insert([{ ...values }])
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const createAiWritenCodeWithSessionLocationAndCode = async (
  sessionId: string,
  code: string,
  location: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data } = await supabase
    .from("ai_created_code")
    .insert([{ code, session_id: sessionId, location }])
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const updateAiWritenCode = async (
  id: string,
  values?: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>
): Promise<void> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .update({ ...values })
    .eq("id", id);

  console.log("Updated code", data, error);
};
