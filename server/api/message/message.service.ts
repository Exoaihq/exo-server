import { createClient, PostgrestSingleResponse } from "@supabase/supabase-js";
import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const getMessagesWithUser = async (
  user: Database["public"]["Tables"]["users"]["Row"]
): Promise<Database["public"]["Tables"]["messages"]["Row"][]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", user.id);

  return data || [];
};

export const getMessagesByUserAndSession = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  sessionId: string
): Promise<Database["public"]["Tables"]["messages"]["Row"][]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  return data || [];
};

export const getOnlyRoleAndContentMessagesByUserAndSession = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  sessionId: string
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at, session_id")
    .order("created_at", { ascending: false })
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .limit(5);

  let response = [] as ChatMessage[];

  if (data) {
    // @ts-ignore
    response = data.map((message) => {
      return {
        role: message.role,
        content: message.content,
      };
    });
  }

  return response?.reverse() as ChatMessage[];
};

export const createMessageWithUser = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  message: Database["public"]["Tables"]["messages"]["Insert"],
  sessionId: string
): Promise<PostgrestSingleResponse<null>> => {
  message["user_id"] = user.id;
  message["session_id"] = sessionId;

  console.log(message);
  const res = await supabase
    .from("messages")
    // @ts-ignore
    .insert([message]);

  return res;
};

export const createMessagesWithUser = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  message: Database["public"]["Tables"]["messages"]["Insert"][],
  sessionId: string
): Promise<PostgrestSingleResponse<null>> => {
  const updateMessages = message.map((message) => {
    return { ...message, user_id: user.id, session_id: sessionId };
  });

  const res = await supabase
    .from("messages")
    // @ts-ignore
    .insert([...updateMessages]);

  return res;
};

export const dbMessagesToChatMessages = (
  dbMessages: Database["public"]["Tables"]["messages"]["Row"][]
): ChatMessage[] => {
  return dbMessages.map((message) => {
    const role =
      message.role === "user"
        ? ChatUserType.user
        : message.role === "system"
        ? ChatUserType.system
        : ChatUserType.assistant;
    return {
      role,
      content: message.content ? message.content : "",
    };
  });
};
