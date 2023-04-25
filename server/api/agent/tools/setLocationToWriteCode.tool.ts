// import { ToolName } from ".";
// import { extractPath } from "../../../../utils/fileOperations.service";
// import { extractFileNameAndPathFromFullPath } from "../../../../utils/getFileName";
// import { getAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.repository";
// import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
// import { updateSession } from "../../supabase/supabase.service";
// import { ToolInterface } from "../agent.service";
// import { searchCodeTool } from "./searchCode.tool";
// import { setLocationPrompt } from "./setLocationToWriteCode.prompt";

// export function setLocationToWriteCodeTool(): ToolInterface {
//   async function handleGetLocation(
//     userId: string,
//     sessionId: string,
//     text: string
//   ) {
//     const doesTextIncludePath = text.includes("/");

//     if (!doesTextIncludePath) {
//       return {
//         output: `It doesn't look like you've included a path. Please try again.`,
//       };
//     }

//     const fullPath = extractPath(text);

//     const { fileName, extractedPath } =
//       extractFileNameAndPathFromFullPath(fullPath);

//     const maybeFileName = fileName.includes(".") ? fileName : null;

//     await updateSession(userId, sessionId, {
//       location: text,
//       file_path: fullPath,
//       file_name: maybeFileName,
//     });

//     await findAndUpdateAiCodeBySession(
//       sessionId,
//       {
//         location: text,
//         path: fullPath,
//         file_name: maybeFileName,
//       },
//       "location"
//     );

//     return {
//       output: `I've set the location to write code to ${text}`,
//     };
//   }

//   const name = ToolName.setLocationToWriteCode;

//   return {
//     name,
//     description:
//       "If you know the location to write code to you can set it here. Before using this tool you should decide if you should search for an exising code location or write new code to a new location.",
//     use: async (userId, sessionId, text) =>
//       handleGetLocation(userId, sessionId, text),
//     arguments: ["location"],
//     promptTemplate: setLocationPrompt,
//     availableTools: [name, ToolName.searchCode, ToolName.finalAnswer],
//   };
// }
