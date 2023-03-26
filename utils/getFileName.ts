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
    return getTimestamp() + "-newFile.ts";
  }
}

export async function generateFileNameWithOpenAi(
  prompt: string,
  suffix: string = "ts",
  apiKey: string
) {
  const promptModifier = `Create a one line filename using camel case with a ${suffix} suffix from the following prompt:`;
  return await createTextCompletion(
    promptModifier + prompt,
    1,
    "Generating file name"
  ).then(async (data) => {
    return data.choices[0]?.text?.trim();
  });
}

export function extractFileNameAndPathFromFullPath(path: string): {
  fileName: string;
  extractedPath: string;
} {
  const fileName = path.split("/");
  const extractedPath = fileName.slice(0, fileName.length - 1).join("/");
  return { fileName: fileName[fileName.length - 1], extractedPath };
}
