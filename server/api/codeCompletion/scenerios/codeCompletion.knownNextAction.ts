import { Response } from "express";
import { ChatMessage, ChatUserType } from "../../../../types/chatMessage.type";
import { deserializeJson } from "../../../../utils/deserializeJson";
import { createAiCodeFromNewFilePrompt } from "../../aiCreatedCode/aiCreatedCode.service";
import { createMessageWithUser } from "../../message/message.service";
import { createTextCompletion } from "../../openAi/openai.service";
import { updateSession } from "../../session/session.repository";
import { doesMessageAnswerExpectedNextActionPrompt } from "../codeCompletion.prompts";
import { handleUpdatingExistingCode } from "./codeCompletion.updateExisting";

export enum ExpectedNextAction {
  NEW_FILE = "User to send functionality and file name",
  EXISTING_FILE = "User to send details about how to update code in existing file that you have access to",
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
  userId: string,
  sessionId: string,
  res: Response<any, Record<string, any>>
) {
  const doesItAnswerTheQuestion = await createTextCompletion(
    doesMessageAnswerExpectedNextActionPrompt(
      sessionMessages,
      dbSession.expected_next_action,
      dbSession.code_content || ""
    ),
    0.2
  );

  if (!doesItAnswerTheQuestion) {
    createMessageWithUser(
      {
        content: "I'm sorry, I don't understand. Can you clarify or rephrase?",
        role: "assistant",
      },
      sessionId
    );
  } else {
    const doesIt = deserializeJson(doesItAnswerTheQuestion);

    if (doesIt.answer === false) {
      createMessageWithUser(
        {
          content: doesIt.remedy,
          role: "assistant",
        },
        sessionId
      );
      return res.status(200).json({
        data: {
          choices: {
            message: {
              content: doesItAnswerTheQuestion,
              role: ChatUserType.assistant,
            },
          },
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
        const userMessages = sessionMessages.filter(
          (message) => message.role === "user"
        );
        createAiCodeFromNewFilePrompt(
          userId,
          userMessages[userMessages.length - 1].content,
          sessionId,
          dbSession.file_path || ""
        );

        // Add message
        createMessageWithUser(
          {
            content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
            role: "assistant",
          },
          sessionId
        );
        updateSession(userId, sessionId, {
          code_content: "",
          file_name: "",
          file_path: "",
          new_file: null,
          location: "",
          expected_next_action: null,
        });
      }

      if (dbSession.expected_next_action === ExpectedNextAction.EXISTING_FILE) {
        console.log("handle writing existing file");
        const userMessages = sessionMessages.filter(
          (message) => message.role === "user"
        );
        handleUpdatingExistingCode(
          userMessages[userMessages.length - 1].content,
          dbSession.code_content || "",
          dbSession.file_path + "/" + dbSession.file_name,
          sessionId,
          dbSession.location || "",
          userId
        );

        // Add message
        createMessageWithUser(
          {
            content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
            role: "assistant",
          },
          sessionId
        );
        updateSession(userId, sessionId, {
          code_content: "",
          file_name: "",
          file_path: "",
          new_file: null,
          location: "",
          expected_next_action: null,
        });
      }

      return res.status(200).json({
        data: {
          choices: [
            {
              message: {
                content: doesItAnswerTheQuestion,
                role: ChatUserType.assistant,
              },
            },
          ],
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
