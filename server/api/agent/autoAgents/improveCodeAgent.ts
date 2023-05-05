import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { createAiWritenCode } from "../../aiCreatedCode/aiCreatedCode.repository";
import { getLongExportSnippets } from "../../codeSnippet/codeSnippet.repository";
import { createNewFileFromSnippets } from "../../codeSnippet/codeSnippet.service";
import { getOrCreateExoConfig } from "../../exoConfig/exoConfig.service";
import { createChatCompletion } from "../../openAi/openai.service";
import exoConfig from "../../../../exo-config.json";
import { convertToExoSuggestionFileName } from "../../../../utils/getFileName";

const updated: number[] = [];

export async function improveCodeAgent() {
  const longSnippets = await getLongExportSnippets(30);
  console.log(longSnippets.length);

  if (!longSnippets) {
    return;
  }
  const topTwo = longSnippets.slice(9, 11);

  for (let snippet of topTwo) {
    console.log(snippet.name);
    if (
      !snippet ||
      !snippet.code_file ||
      !snippet.account_id ||
      !snippet.code_string ||
      !snippet.code_file_id
    ) {
      continue;
    }
    if (snippet.code_file) {
      let codeFile;
      if (Array.isArray(snippet.code_file)) {
        codeFile = snippet.code_file[0];
      } else {
        codeFile = snippet.code_file;
      }

      if (
        !codeFile.file_name ||
        !codeFile.id ||
        !codeFile.file_path ||
        !codeFile.account_id
      ) {
        continue;
        // Consider updating the test file if the snippet has changed
      } else {
        // Pass it to GPT4 and ask for improvements.
        // Will need to get the location of the code in the file
        console.log("Start row", snippet.start_row);
        console.log("End row", snippet.end_row);
        console.log("code id", snippet.id);

        // Find exo config
        // If not present create one
        const exoConfig = await getOrCreateExoConfig(snippet.code_file_id);
        if (
          !exoConfig ||
          // @ts-ignore
          !exoConfig.code_snippet ||
          // @ts-ignore
          !exoConfig.code_snippet[0] ||
          // @ts-ignore
          !exoConfig.code_snippet[0].code_string ||
          updated.includes(snippet.id)
        ) {
          return;
        }
        const parsedExoConfig = JSON.parse(
          // @ts-ignore
          exoConfig.code_snippet[0].code_string
        );
        if (!parsedExoConfig || !parsedExoConfig.codeStandards) {
          continue;
        }

        const prompt = `
        Please improve the following code snippet to meet the following standards:
        ${parsedExoConfig.codeStandards.join("\n")}

        If you want to add a part of the code to a new file, please add the following comment to the code: // New file: <file_name>

        You can assume that all the imports are already present in the file. You don't need to add, remove or change any imports.

        Here is the code:
        ${snippet.code_string}

        Improve the code:
        `;

        updated.push(snippet.id);

        const res = await createChatCompletion(
          [
            {
              content: prompt,
              role: ChatUserType.user,
            },
          ],
          EngineName.GPT4,
          0.5,
          4000
        );
        if (
          !res ||
          !res.choices ||
          !res.choices[0] ||
          !res.choices[0].message
        ) {
          continue;
        } else {
          await createAiWritenCode({
            code: res.choices[0].message.content,
            location: "newFile",
            path: codeFile.file_path,
            file_name: convertToExoSuggestionFileName(codeFile.file_name),
            account_id: codeFile.account_id,
            completed_at: new Date().toISOString(),
          });
        }
      }
    }
  }
}
