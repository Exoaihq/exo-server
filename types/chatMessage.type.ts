

export enum ChatUserType {
    system = "system",
    user = "user",
    assistant = "assistant"
}

export interface ChatMessage {
    role: ChatUserType;
    content: string;
}