import { Response } from "express";
import { ChatMessage } from "../../../../types/chatMessage.type";
import { Json } from "../../../../types/supabase";
import { deserializeJson } from "../../../../utils/deserializeJson";
import { createAiCodeFromNewFilePrompt } from "../../aiCreatedCode/aiCreatedCode.service";
import { createMessageWithUser } from "../../message/message.service";
import { createTextCompletion } from "../../openAi/openai.service";
import { doesMessageAnswerExpectedNextActionPrompt } from "../codeCompletion.prompts";

export enum ExpectedNextAction {
  NEW_FILE = "User to send functionality and file name",
}

export async function handleKnownNextAction(
  sessionMessages: ChatMessage[],
  dbSession: {
    code_content?: string | null;
    created_at?: string | null;
    expected_next_action: any;
    file_name?: string | null;
    file_path?: string | null;
    functionality?: string | null;
    id?: string;
    location?: string | null;
    new_file?: boolean | null;
    updated_at?: string | null;
    user_id?: string | null;
  },
  user: {
    avatar_url: string | null;
    billing_address: Json;
    email: string | null;
    full_name: string | null;
    id: string;
    payment_method: Json;
  },
  sessionId: string,
  res: Response<any, Record<string, any>>
) {
  const doesItAnswerTheQuestion = await createTextCompletion(
    doesMessageAnswerExpectedNextActionPrompt(
      sessionMessages,
      dbSession.expected_next_action
    ),
    0.2
  );

  if (!doesItAnswerTheQuestion.choices[0].text) {
    createMessageWithUser(
      user,
      {
        content: "I'm sorry, I don't understand. Can you clarify or rephrase?",
        role: "assistant",
      },
      sessionId
    );
  } else {
    const doesIt = deserializeJson(doesItAnswerTheQuestion.choices[0].text);

    if (doesIt.answer === false) {
      createMessageWithUser(
        user,
        {
          content: doesIt.remedy,
          role: "assistant",
        },
        sessionId
      );
      return res.status(200).json({
        data: {
          choices: doesItAnswerTheQuestion.choices,
          metadata: {
            projectDirectory: "",
            projectFile: "",
            newFile: null as null | boolean,
            requiredFunctionality: "",
          },
        },
      });
    } else if (doesIt.answer === true) {
      // Handle the expected next action

      if (dbSession.expected_next_action === ExpectedNextAction.NEW_FILE) {
        console.log("handle writing file");
        const userMessages = sessionMessages.filter(
          (message) => message.role === "user"
        );
        createAiCodeFromNewFilePrompt(
          user,
          userMessages[userMessages.length - 1].content,
          sessionId,
          dbSession.file_path || ""
        );

        // Add message
        createMessageWithUser(
          user,
          {
            content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
            role: "assistant",
          },
          sessionId
        );
      }

      return res.status(200).json({
        data: {
          choices: doesItAnswerTheQuestion.choices,
          metadata: {
            projectDirectory: "",
            projectFile: "",
            newFile: null as null | boolean,
            requiredFunctionality: "",
          },
        },
      });
    }
  }
}
