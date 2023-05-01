import { Database } from "../../../types/supabase";
import { convertToTestFileName } from "../../../utils/getFileName";
import { createAiCodeFromNewFilePrompt } from "../aiCreatedCode/aiCreatedCode.service";
import { ExpectedNextAction } from "../codeCompletion/scenerios/codeCompletion.knownNextAction";
import { handleUpdatingExistingCode } from "../codeCompletion/scenerios/codeCompletion.updateExisting";
import { createMessageWithUser } from "../message/message.service";
import { resetSession, supabase } from "../supabase/supabase.service";

export const getGlobalPromptsDb = async (): Promise<
  Database["public"]["Tables"]["prompt"]["Row"][]
> => {
  const { data, error } = await supabase
    .from("prompt")
    .select("*")
    .eq("global", true);

  return data || [];
};

export const getPromptById = async (
  promptId: string
): Promise<Database["public"]["Tables"]["prompt"]["Row"] | null> => {
  const { data, error } = await supabase
    .from("prompt")
    .select("*")
    .eq("id", promptId);

  return (data && data[0]) || null;
};

export const getMessageExamplePrompts = async (): Promise<
  Database["public"]["Tables"]["prompt"]["Row"][]
> => {
  const { data, error } = await supabase
    .from("prompt")
    .select("*")
    .eq("global", true)
    .in("name", ["Array", "Create test", "Dry code", "Inline improvements"]);

  return data || [];
};

export const createNewMessagePrompt = async (messageId: string) => {
  const prompts = await getMessageExamplePrompts();
  const { data, error } = await supabase.from("message_prompts").insert(
    prompts.map((prompt) => {
      return {
        message_id: messageId,
        prompt_id: prompt.id,
      };
    })
  );
};

export const createPromptForLlm = ({
  promptPrefix,
  promptBody,
  promptSuffix,
}: {
  promptPrefix?: string | null;
  promptBody?: string | null;
  promptSuffix?: string | null;
}) => {
  return `
    ${promptPrefix || ""}
    ${promptBody || ""}
    ${promptSuffix || ""}
    `;
};

export const handleUsingSelectedPrompt = async (
  dbSession: {
    code_content: any;
    created_at?: string | null;
    expected_next_action: any;
    file_name: any;
    file_path: any;
    functionality?: string | null;
    id?: string;
    location: any;
    new_file?: boolean | null;
    scratch_pad_content?: string | null;
    updated_at?: string | null;
    user_id?: string | null;
  },
  sessionId: string,
  userId: string,
  prompt: {
    body?: string | null;
    created_at?: string | null;
    description?: string | null;
    global?: boolean | null;
    id?: string;
    message_id?: string | null;
    name?: string | null;
    prefix: any;
    suffix: any;
    user_id?: string | null;
  }
) => {
  // The prompts are only added to the messages when we expect the next action - existing file or new file
  if (dbSession.expected_next_action === ExpectedNextAction.EXISTING_FILE) {
    const path =
      prompt.name === "Create test"
        ? dbSession.file_path + "/" + convertToTestFileName(dbSession.file_name)
        : dbSession.file_path + "/" + dbSession.file_name;

    handleUpdatingExistingCode(
      createPromptForLlm({
        promptPrefix: prompt.prefix,
        promptSuffix: prompt.suffix,
      }),
      dbSession.code_content || "",
      path,
      sessionId,
      dbSession.location || "",
      userId
    );

    createMessageWithUser(
      userId,
      {
        content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
        role: "assistant",
      },
      sessionId
    );
    resetSession(userId, sessionId);
  } else if (dbSession.expected_next_action === ExpectedNextAction.NEW_FILE) {
    createAiCodeFromNewFilePrompt(
      userId,
      createPromptForLlm({
        promptPrefix: prompt.prefix,
        promptSuffix: prompt.suffix,
        promptBody: dbSession.code_content,
      }),
      sessionId,
      dbSession.file_path || ""
    );

    createMessageWithUser(
      userId,
      {
        content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
        role: "assistant",
      },
      sessionId
    );
    resetSession(userId, sessionId);
  } else {
    createMessageWithUser(
      userId,
      {
        content: `Hmm, I don't know what to do with that prompt. Did you select a file to update or a location to write a new file?`,
        role: "assistant",
      },
      sessionId
    );
  }
};
