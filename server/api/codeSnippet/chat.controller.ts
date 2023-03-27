import { Request, Response } from "express";
import { ChatMessage } from "../../../types/chatMessage.type";
import { createFile } from "../../../utils/createfile";
import {
  createTextCompletion,
  getCompletion,
  handlePromptAfterClassification,
} from "../openAi/openai.service";

export const startClassification = async (req: Request, res: Response) => {
  try {
    const messages: ChatMessage[] = req.body ? req.body : [];

    const response = await handlePromptAfterClassification(messages);
    return res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startChat = async (req: Request, res: Response) => {
  try {
    const messages = [
      {
        role: "user",
        content: `Write a typescript function that creates a loading elipsis with three dots and cycles through them every second. The function should take a string as an argument and return the loading elipsis as a string.`,
      },
    ];
    const completion = await createTextCompletion(
      messages[0].content,
      1,
      "Loading",
      "chat"
    );
    console.log(completion);

    const content = completion.choices[0].message?.content
      ? completion.choices[0].message?.content
      : "";
    console.log(content);

    createFile("elipsis.ts", content, "./example");

    res.status(200).json({ data: completion.choices[0] });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const runCalculator = async (req: Request, res: Response) => {
  const prompt =
    "You are GPT-3, and you can't do math.\
    You can do basic math, and your memorization abilities are impressive, but you can't do any complex calculations that a human could not do in their head. You also have an annoying tendency to just make up highly specific, but wrong, answers.\
    So we hooked you up to a javaScript kernel, and now you can execute code. If anyone gives you a hard math problem, just use this format and well take care of the rest:\
    Question: ${ {Question with hard calculation.} }\
    ```javaScript\
    ${{ Code that prints what you need to know }}\
    ```\
        ```output\
    ${{ Output of your code }}\
    ```\
    Answer: ${ { Answer } }\
    Otherwise, use this simpler format:\
    Question: ${ {Question without hard calculation } }\
    Answer: ${ { Answer } }\
    Begin.\
        Question: What is 37593 * 67 ?\
    ```javaScript\
    console.log(37593 * 67)\
    ```\
    ```output\
    2518731\
    ```\
    Answer: 2518731\
    Question: What is the 13 raised to the .345 power\
    ";

  try {
    const completion = await getCompletion(prompt);
    res.status(200).json({ data: completion.data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
