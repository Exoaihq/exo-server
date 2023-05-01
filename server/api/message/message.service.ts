import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { Database } from "../../../types/supabase";
import { getGlobalPromptsDb } from "../prompt/prompt.service";
import { supabase } from "../supabase/supabase.service";

export const getMessagesWithUser = async (
  userId: string
): Promise<Database["public"]["Tables"]["messages"]["Row"][]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", userId);

  return data || [];
};

export const getHelerMessagesWithUser = async (
  userId: string
): Promise<any> => {
  const { data, error } = await supabase
    .from("messages")
    .select("content, created_at, session_id, role")
    .eq("user_id", userId)
    .eq("is_helper_message", true);

  return data || [];
};

export const getMessagesByUserAndSession = async (
  userId: string,
  sessionId: string
): Promise<Database["public"]["Tables"]["messages"]["Row"][]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*, message_prompts(prompt_id)")
    .order("created_at", { ascending: true })
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  const globalMessagePrompts = await getGlobalPromptsDb();

  const withMessagePrompts = await data?.map((message) => {
    if (!message.message_prompts) {
      return message;
    }
    if (Array.isArray(message.message_prompts)) {
      const messagePromptsWithPrompt = message.message_prompts.map(
        (messagePrompt) => {
          if (!messagePrompt.prompt_id) {
            return messagePrompt;
          }
          const prompt = globalMessagePrompts.find(
            (prompt) => prompt.id === messagePrompt.prompt_id
          );
          if (!prompt) {
            return messagePrompt;
          }
          return {
            ...prompt,
          };
        }
      );
      return {
        ...message,
        message_prompts: [...messagePromptsWithPrompt],
      };
    } else {
      if (!message.message_prompts.prompt_id) {
        return message;
      } else {
        const prompt = globalMessagePrompts.find(
          // @ts-ignore
          (prompt) => prompt.id === message.message_prompts.prompt_id
        );
        return {
          ...message,
          message_prompts: [{ ...prompt }],
        };
      }
    }
  });

  // @ts-ignore
  return withMessagePrompts || [];
};

export const getOnlyRoleAndContentMessagesSession = async (
  sessionId: string
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at, session_id")
    .order("created_at", { ascending: false })
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

export const getOnlyRoleAndContentMessagesByUserAndSession = async (
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at, session_id")
    .order("created_at", { ascending: false })
    .eq("user_id", userId)
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
  userId: string,
  message: Database["public"]["Tables"]["messages"]["Insert"],
  sessionId: string
): Promise<{
  content: string | null;
  created_at: string | null;
  created_location: string | null;
  id: string;
  role: "user" | "system" | "assistant" | null;
  session_id: string | null;
  user_id: string | null;
} | null> => {
  message["user_id"] = userId;
  message["session_id"] = sessionId;

  const { data, error } = await supabase
    .from("messages")
    // @ts-ignore
    .insert([message])
    .select("*");

  if (error || !data || data.length === 0) {
    console.log("Error creating message", error);
    return null;
  }

  return data[0];
};

export const createMessagesWithUser = async (
  userId: string,
  message: Database["public"]["Tables"]["messages"]["Insert"][],
  sessionId: string
): Promise<PostgrestSingleResponse<null>> => {
  const updateMessages = message.map((message) => {
    return { ...message, user_id: userId, session_id: sessionId };
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

export const findUnseenHelperMessages = async (
  userId: string,
  sessionId: string
) => {
  const userMessages = await getHelerMessagesWithUser(userId);
  const { data, error } = await supabase
    .from("app_helper_messages")
    .select("*");

  if (error || !data || data.length === 0) {
    return;
  }

  if (!userMessages || userMessages.length === 0) {
    if (data) {
      createMessageWithUser(
        userId,
        {
          content: data[0].text,
          role: "assistant",
          is_helper_message: true,
        },
        sessionId
      );
      createMessageWithUser(
        userId,
        {
          content: data[1].text,
          role: "assistant",
          is_helper_message: true,
        },
        sessionId
      );
    }
  } else {
    // Return the next helper message

    for (let i = 0; i < data?.length; i++) {
      const messageExists = userMessages.find(
        (userMessage: { content: string | null }) => {
          return userMessage.content === data[i].text;
        }
      );

      if (!messageExists) {
        await createMessageWithUser(
          userId,
          {
            content: data[i].text,
            role: "assistant",
            is_helper_message: true,
          },
          sessionId
        );
        // Only write one helper message at a time
        return;
      }
    }
  }
};
