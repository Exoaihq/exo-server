import { getLongSnippets } from "../../codeSnippet/codeSnippet.repository";
import { getOrCreateExoConfig } from "../../exoConfig/exoConfig.service";

export async function improveCodeAgent() {
  const longSnippets = await getLongSnippets(30);
  console.log(longSnippets.length);

  if (!longSnippets) {
    return;
  }
  const topTwo = longSnippets.slice(4, 7);

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
        // console.log("code", snippet.code_string);

        // Find exo config
        // If not present create one
        const exoConfig = await getOrCreateExoConfig(snippet.code_file_id);
        if (!exoConfig || !exoConfig.code_snippet) {
          continue;
        }
        console.log(exoConfig.code_snippet);
      }
    }
  }
}
