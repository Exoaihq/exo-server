import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { Database, Json } from "../../../../types/supabase";
import { createMessageWithUser } from "../../message/message.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { updateSession } from "../../supabase/supabase.service";
import {
  createNewCodePrompt,
  refactorCodePrompt,
  useChooseFile,
} from "../codeCompletion.prompts";
import { CodeCompletionResponse } from "../codeCompletion.types";
import { handleUpdatingExistingCode } from "./codeCompletion.updateExisting";
import {
  addSystemMessage,
  handleParsingCreatedCode,
} from "../codeCompletion.service";
import { runUpdateExistingOrCreateNewClassificaiton } from "../codeCompletion.classifier";
import {
  getAiCodeBySessionCodeNotNull,
  updateAiWritenCode,
} from "../../aiCreatedCode/aiCreatedCode.service";

export async function handleExistingFileUpdate(
  messages: any[],
  classification: { functionality: any; location?: string },
  user: {
    avatar_url: string | null;
    billing_address: Json;
    email: string | null;
    full_name: string | null;
    id: string;
    payment_method: Json;
  },
  sessionId: string,
  code_content: any,
  file_name: string,
  file_path: string,
  writeCodeObject: Partial<
    Database["public"]["Tables"]["ai_created_code"]["Row"]
  >
): Promise<CodeCompletionResponse> {
  const userMessages = messages.filter((message) => message.role === "user");
  const functionality = userMessages[userMessages.length - 1].content;

  if (!file_name || !file_path) {
    console.log(
      "No file name or path provided, asking user to choose file",
      functionality
    );
    const adaptedMessages = addSystemMessage(messages, useChooseFile());
    const response = await createChatCompletion(
      adaptedMessages,
      EngineName.Turbo,
      0.1
    );

    await createMessageWithUser(user, response.choices[0].message, sessionId);

    if (writeCodeObject && writeCodeObject.id) {
      updateAiWritenCode(writeCodeObject.id, {
        functionality,
      });
    }

    updateSession(user, sessionId, {
      location: "existingFile",
      functionality,
      file_name: "",
      file_path: "",
      new_file: false,
      code_content: "",
    });
    console.log("Reponse from no name or path", response.choices[0].message);
    return {
      choices: response.choices,
      metadata: {
        projectDirectory: "existingFile",
        projectFile: "",
        newFile: false,
        requiredFunctionality: "functionality",
      },
    };
  }

  console.log("Functionality for existing file", functionality);

  handleUpdatingExistingCode(
    functionality,
    code_content || "",
    file_path + "/" + file_name,
    sessionId,
    classification.location || "",
    user,
    writeCodeObject
  );

  await createMessageWithUser(
    user,
    {
      content: `I have add your request to the queue:\n
        "${userMessages[userMessages.length - 1].content}". \n
        Once completed it will be added to your file.`,
      role: ChatUserType.assistant,
    },
    sessionId
  );

  return {
    choices: [],
    metadata: {
      projectDirectory: "",
      projectFile: "",
      newFile: null,
      requiredFunctionality: "",
    },
    completedCode: "",
  };
}

export async function handleScratchPadUpdate(
  messages: any[],
  classification: { functionality: any; location: any },
  user: any,
  sessionId: any,
  location: any,
  writeCodeObject: Partial<
    Database["public"]["Tables"]["ai_created_code"]["Row"]
  >
): Promise<CodeCompletionResponse> {
  console.log(">>>>>>>>>>>>>>> Write code onject", writeCodeObject);
  console.log("Writing to the scratch pad");
  const userMessages = messages.filter((message) => message.role === "user");

  // Need a classifier to see if they want to update the previous or create a new one

  const res = await runUpdateExistingOrCreateNewClassificaiton(
    userMessages[userMessages.length - 1].content
  );

  console.log("New code or update exisit", res);

  const functionality = userMessages[userMessages.length - 1].content;

  console.log("Functionality for writing to scratch pad", functionality);

  const existingCode = await getAiCodeBySessionCodeNotNull(sessionId);

  const content =
    res.where === "existing" && existingCode && existingCode.code
      ? refactorCodePrompt(existingCode.code, functionality, "")
      : createNewCodePrompt(functionality, "");

  console.log("New functionality for scratch pad", content);

  const response = await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content,
      },
    ],
    EngineName.GPT4
  );

  console.log("gpt response for scratch pad", response);
  const metadata = {
    projectDirectory: "scratch pad",
    projectFile: "",
    newFile: false,
    requiredFunctionality: "",
  };

  updateSession(user, sessionId, {
    location: classification.location,
    functionality: classification.functionality,
  });

  if (writeCodeObject && writeCodeObject.id) {
    updateAiWritenCode(writeCodeObject.id, {
      functionality,
      code: response.choices[0].message?.content,
      completed_at: new Date().toISOString(),
      location,
    });
  }

  return handleParsingCreatedCode(
    response,
    metadata,
    sessionId,
    location,
    user,
    functionality
  );
}
