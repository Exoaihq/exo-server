import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import {
  CodeCompletionRequest,
  CodeCompletionResponseMetadata,
} from "./codeCompletion.types";

import {
  AllValues,
  directoryOnlyPrompt,
  fileNamePrompt,
  newFilePrompt,
  refactorCodePrompt,
  requiredFunctionalityOnlyPrompt,
} from "./codeCompletion.prompts";

export type NeededValues =
  | "projectDirectory"
  | "newfile"
  | "projectFile"
  | "requiredFunctionality"
  | "writeCode"
  | "none";

export const whatValuesDoWeNeed = (request: AllValues): NeededValues => {
  const { projectFile, newFile, projectDirectory, requiredFunctionality } =
    request;
  if (!projectDirectory) {
    return "projectDirectory";
  } else if (projectDirectory && newFile === null) {
    return "newfile";
  } else if (projectDirectory && newFile !== null && !projectFile) {
    return "projectFile";
  } else if (
    projectDirectory &&
    newFile !== null &&
    projectFile &&
    !requiredFunctionality
  ) {
    return "requiredFunctionality";
  } else if (
    projectDirectory &&
    newFile !== null &&
    projectFile &&
    requiredFunctionality
  ) {
    return "none";
  } else {
    return "projectDirectory";
  }
};

export const getReleventPrompt = (
  response: CodeCompletionRequest,
  metadata: CodeCompletionResponseMetadata
): {
  prompt: string;
  model: EngineName;
  neededValues: NeededValues;
} => {
  const { codeContent } = response;
  const { requiredFunctionality } = metadata;

  const whatDoWeNeed = whatValuesDoWeNeed(metadata);

  switch (whatDoWeNeed) {
    case "projectDirectory":
      return {
        prompt: directoryOnlyPrompt(response.messages),
        model: EngineName.Turbo,
        neededValues: "projectDirectory",
      };
    case "newfile":
      return {
        prompt: newFilePrompt(response.messages),
        model: EngineName.Turbo,
        neededValues: "newfile",
      };
    case "projectFile":
      return {
        prompt: fileNamePrompt(response.messages),
        model: EngineName.Turbo,
        neededValues: "projectFile",
      };
    case "requiredFunctionality":
      return {
        prompt: requiredFunctionalityOnlyPrompt(response.messages),
        model: EngineName.Turbo,
        neededValues: "requiredFunctionality",
      };
    case "none":
      if (!codeContent) {
        return {
          prompt:
            "You can't find the file you want to update. Ask the user to clarify the file name and directory",
          model: EngineName.Turbo,
          neededValues: "none",
        };
      }
      return {
        prompt: refactorCodePrompt(codeContent, requiredFunctionality, ""),
        model: EngineName.GPT4,
        neededValues: "none",
      };
    default:
      return {
        prompt: "I don't know what to do",
        model: EngineName.Turbo,
        neededValues: "none",
      };
  }
};
