import { ChatMessage } from "../../../types/chatMessage.type";

export interface CodeDirectory {
  projectDirectory: string;
  newFile: boolean;
}

export interface CodeCompletionRequest {
  messages: ChatMessage[];
  codeContent: string;
}

export interface CodeCompletionDetails {
  projectFile: string;
  requiredFunctionality: string;
}

export interface CodeCompletionResponseMetadata {
  projectDirectory: string;
  projectFile: string;
  newFile: boolean | null;
  requiredFunctionality: string;
}

export interface Choice {
  finish_reason: string;
  index: number;
  message: ChatMessage;
}

export interface CodeCompletionResponse {
  choices: Choice[];
  metadata: CodeCompletionResponseMetadata;
  completedCode?: string;
}

export interface OpenAiChatCompletionResponse {
  id: string;
  created: number;
  model: string;
  choices: Choice[];
}

export type BaseClassification = "generalChat" | "creatingCode";

export type CodeOrMessage = "code" | "message";
