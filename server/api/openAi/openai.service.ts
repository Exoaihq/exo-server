import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { CompletionResponse } from "../../../types/openAiTypes/openAiCompletionReqRes";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import {
  clearLoading,
  commandLineLoading,
} from "../../../utils/commandLineLoadingl";

import { logError } from "../../../utils/commandLineColors";
import { OpenAiChatCompletionResponse } from "../codeCompletion/codeCompletion.types";
import {
  baseCreateChat,
  getTexCompletionUsingDavinci,
} from "./openAi.repository";

const raisingHands = String.fromCodePoint(0x1f64c);

export async function createChatWithUserRoleAndLowTemp(
  prompt: string,
  stopToken: string | null = null
) {
  try {
    const res = await baseCreateChat(
      [
        {
          content: prompt,
          role: ChatUserType.user,
        },
      ],
      EngineName.Turbo,
      0.2,
      2048,
      stopToken ? [stopToken] : null,
      "Create chat agent"
    );

    return res;
  } catch (error: any) {
    console.log(">>>>>>>>>>>>>>error", error.reponse);
    return error;
  }
}

export async function getSummaryOfCode(codeContent: string) {
  const interval = commandLineLoading("Summarizing code");

  const res = await createChatCompletion(
    [
      {
        content:
          "What does this code do:" +
          codeContent +
          "Please include the coding language",
        role: ChatUserType.user,
      },
    ],
    EngineName.Turbo,
    0.2
  );

  clearLoading(interval, `Summarizing code query completed`);

  if (!res) {
    logError("Open ai api call to create explaination for code failed ");
    return null;
  } else {
    return res;
  }
}

export async function getSummaryOfFile(
  codeSummary: string,
  fileName: string,
  filePath: string
): Promise<string | null> {
  const interval = commandLineLoading("Summarizing file");

  const res = await createChatCompletion(
    [
      {
        content: `Please give a summary of this file that contains code .
        This is the file name ${fileName}
        This is where the file is located ${filePath}
        And this is a summary of the code in the file ${codeSummary}
        Please provide an explaination summary of this file
          `,
        role: ChatUserType.user,
      },
    ],
    EngineName.Turbo,
    0.2
  );

  clearLoading(interval, `Summarizing file completed`);

  if (!res) {
    logError("Open ai api call to create explaination for file failed ");
    return null;
  } else {
    return res;
  }
}

export async function summarizeDirectoryExplaination(
  text: string
): Promise<any> {
  const interval = commandLineLoading("Summarizing code");
  try {
    const response = await getTexCompletionUsingDavinci(text, 0.2);

    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    return response;
  } catch (error: any) {
    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    console.log(error);
  }
}

export async function createTextCompletion(
  prompt: string,
  temperature: number = 1,
  loadingMessage: string = "Loading",
  type: string = "completion"
): Promise<string> {
  const interval = commandLineLoading(loadingMessage + "creat text completion");

  try {
    const res =
      type === "completion"
        ? await getTexCompletionUsingDavinci(prompt, temperature)
        : await baseCreateChat([
            {
              role: ChatUserType.user,
              content: prompt,
            },
          ]);

    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    return res;
  } catch (error: any) {
    if (error.response) {
      clearLoading(interval, `Error status: ${error.response.status}`);
      console.log(error.response.data);
    } else {
      clearLoading(interval, `Error status: ${error.message}`);
    }
    throw error;
  }
}

export async function createChatCompletion(
  messages: ChatMessage[],
  model?: EngineName,
  temperature: number = 1,
  maxTokens: number = 2048
): Promise<string> {
  try {
    const res = model
      ? await baseCreateChat(messages, model, temperature, maxTokens)
      : await baseCreateChat(messages);

    return res;
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.data);
    }
    return error;
  }
}
