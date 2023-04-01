import { ChatMessage } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { Json } from "../../../../types/supabase";
import { createMessageWithUser } from "../../message/message.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { updateSession } from "../../supabase/supabase.service";
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
  user: {
    avatar_url: string | null;
    billing_address: Json;
    email: string | null;
    full_name: string | null;
    id: string;
    payment_method: Json;
  },
  sessionId: string,
  classification: { location: string; functionality: any }
): Promise<CodeCompletionResponse> {
  const { location, functionality } = classification;

  updateSession(user, sessionId, {
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
    codeCompletionResponse.choices = response.choices;
    codeCompletionResponse.metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: false,
      requiredFunctionality: "",
    };

    return {
      choices: response.choices,
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
    codeCompletionResponse.choices = response.choices;
    codeCompletionResponse.metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: true,
      requiredFunctionality: "",
    };
    return {
      choices: response.choices,
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

    await createMessageWithUser(user, response.choices[0].message, sessionId);

    return {
      choices: response.choices,
      metadata: {
        projectDirectory: "scratchPad",
        projectFile: "",
        newFile: false,
        requiredFunctionality: "",
      },
    };
  }
}
