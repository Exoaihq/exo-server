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

export function extractFileNameAndPathFromFullPath(path: string): {
  fileName: string;
  extractedPath: string;
} {
  if (!path) return { fileName: "", extractedPath: "" };
  const fileName = path.split("/");
  const extractedPath = fileName.slice(0, fileName.length - 1).join("/");
  return { fileName: fileName[fileName.length - 1], extractedPath };
}

export function getFileSuffix(fileName: string): string {
  const split = fileName.split(".");
  return split[split.length - 1];
}

export function getFilePrefix(fileName: string): string {
  const split = fileName.split(".");
  return split[0];
}

export const getDirectoryNameFromPath = (path: string) => {
  const pathArray = path.split("/");
  return pathArray[pathArray.length - 1];
};

export function convertToTestFileName(fileName: string): string {
  const fileExtension = fileName.split(".").pop();
  const fileNameWithoutExtension = fileName.substring(
    0,
    fileName.lastIndexOf(".")
  );

  return `${fileNameWithoutExtension}.test.${fileExtension}`;
}
