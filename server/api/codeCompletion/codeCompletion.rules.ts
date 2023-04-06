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
