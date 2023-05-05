import { Request, Response } from "express";
import { getCompletion } from "../openAi/openai.service";

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
