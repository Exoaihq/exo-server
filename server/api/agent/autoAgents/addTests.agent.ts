import {
  convertToTestFileName,
  getFilePrefix,
} from "../../../../utils/getFileName";
import { createAiWritenCode } from "../../aiCreatedCode/aiCreatedCode.repository";
import {
  createCodeFile,
  findTestFile,
  updateFileById,
} from "../../codeFile/codeFile.repository";
import { createTestBasedOnExistingCode } from "../../codeFile/codeFile.service";
import { getLongSnippets } from "../../codeSnippet/codeSnippet.repository";
import { compareAndUpdateSnippets } from "../../supabase/supabase.service";

export async function findAndAddTestAgent() {
  // This agent searches the code base for complex code snippets and makes sure there are tests for this code

  console.log("Running find and add test agent");
  const longSnippets = await getLongSnippets(30);
  console.log(longSnippets.length);

  if (!longSnippets) {
    return;
  }

  const topTwo = longSnippets.slice(0, 3);

  for (let snippet of topTwo) {
    if (
      !snippet ||
      !snippet.code_file ||
      !snippet.account_id ||
      !snippet.code_string
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
        codeFile.test_file_id ||
        !codeFile.file_name ||
        !codeFile.id ||
        !codeFile.file_path ||
        !codeFile.account_id
      ) {
        continue;
        // Consider updating the test file if the snippet has changed
      } else {
        // Look for a test file that hasn't been linked

        const filePrefix = getFilePrefix(codeFile.file_name);
        const found = await findTestFile(filePrefix, snippet.account_id);
        if (found) {
          console.log("Found test file");

          await updateFileById(codeFile.id, {
            test_file_id: found.id,
            updated_at: new Date().toISOString(),
          });
        } else {
          // Create a test file
          const test = await createTestBasedOnExistingCode(snippet.code_string);
          if (test) {
            const file_name = convertToTestFileName(codeFile.file_name);

            const newAiCode = await createAiWritenCode({
              code: test,
              account_id: snippet.account_id,
              location: "newFile",
              path: codeFile.file_path,
              file_name,
              functionality: "test for existing code",
              completed_at: new Date().toISOString(),
              existing_code: snippet.code_string,
            });

            if (newAiCode) {
              // Create new file
              // Create new snippet
              await createCodeFile(snippet.account_id, {
                file_name,
                file_path: codeFile.file_path,
                code_directory_id: codeFile.code_directory_id,
                code_directory_parent_id: codeFile.code_directory_parent_id,
                test_file_id: codeFile.id,
              });

              await compareAndUpdateSnippets(
                {
                  filePath: codeFile.file_path,
                  contents: test,
                },
                codeFile.account_id
              );
            }
          }
        }
      }
    }
  }
}
