
import { createTextCompletion } from "../server/api/openAi/openai.service";
import { getTimestamp } from "./getTimestamp";

const getFilenameFromComment = (comment: any) => {
  const regex = /filename: (.*)/;
  const matches = comment.match(regex);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return null;
};

const getFileNameRegex = (str: string): string[] => {
  const regex = /\w+\.\w+/g;
  const matches = str.match(regex);
  return matches ? matches : [];
};


export function findFileName(str: string): string {
  const fileNameFromComment = getFilenameFromComment(str);
  const fileNameRegex = getFileNameRegex(str);
  if (fileNameFromComment) {
    return fileNameFromComment;
  } else if (fileNameRegex.length > 0) {
    return fileNameRegex[0];
  } else {
    return getTimestamp() + "-newFile.ts"
  }
}

export async function generateFileNameWithOpenAi(prompt: string, suffix: string = "ts", apiKey: string) {
  const promptModifier = `Create a one line filename using camel case with a ${suffix} suffix from the following prompt:`
  return await createTextCompletion(promptModifier + prompt, "Generating file name").then(async (data) => {
    return data.choices[0].text.trim()
  })
}