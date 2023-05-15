import { ChatMessage, ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { createMessageWithUser } from "../../message/message.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { updateSession } from "../../session/session.repository";
import {
  requiredFunctionalityOnlyPrompt,
  useChooseDirectory,
  useChooseFile,
} from "../codeCompletion.prompts";
import {
  addSystemMessage,
  codeCompletionResponse,
} from "../codeCompletion.service";
import { CodeCompletionResponse } from "../codeCompletion.types";

export async function handleKNnowLocButNotFunc(
  messages: ChatMessage[],
  userId: string,
  sessionId: string,
  classification: { location: string; functionality: any }
): Promise<CodeCompletionResponse> {
  const { location, functionality } = classification;

  updateSession(userId, sessionId, {
    location,
    functionality,
  });

  if (classification.location === "existingFile") {
    const adaptedMessages = addSystemMessage(messages, useChooseFile());
    const response = await createChatCompletion(
      adaptedMessages,
      EngineName.Turbo,
      0.3
    );

    codeCompletionResponse.metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: false,
      requiredFunctionality: "",
    };

    return {
      choices: [
        {
          message: {
            content: response,
            role: ChatUserType.assistant,
          },
        },
      ],
      metadata: {
        projectDirectory: "existingFile",
        projectFile: "",
        newFile: false,
        requiredFunctionality: "",
      },
    };
  } else if (classification.location === "newFile") {
    console.log("new file");
    const adaptedMessages = addSystemMessage(messages, useChooseDirectory());
    const response = await createChatCompletion(
      adaptedMessages,
      EngineName.Turbo,
      0.3,
      400
    );

    codeCompletionResponse.metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: true,
      requiredFunctionality: "",
    };
    return {
      choices: [
        {
          message: {
            content: response,
            role: ChatUserType.assistant,
          },
        },
      ],
      metadata: {
        projectDirectory: "newFile",
        projectFile: "",
        newFile: true,
        requiredFunctionality: "",
      },
    };
  } else {
    // Write to the scratch pad

    const adaptedMessages = await addSystemMessage(
      messages,
      requiredFunctionalityOnlyPrompt(messages)
    );
    const response = await createChatCompletion(
      adaptedMessages,
      EngineName.Turbo,
      0.1
    );

    await createMessageWithUser(
      {
        content: response,
        role: ChatUserType.assistant,
      },
      sessionId
    );

    return {
      choices: [
        {
          message: {
            content: response,
            role: ChatUserType.assistant,
          },
        },
      ],
      metadata: {
        projectDirectory: "scratchPad",
        projectFile: "",
        newFile: false,
        requiredFunctionality: "",
      },
    };
  }
}
