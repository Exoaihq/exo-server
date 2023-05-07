import { createClient } from "@supabase/supabase-js";
import { ChatUserType } from "../../../types/chatMessage.type";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { findArray, removeQuotes } from "../../../utils/findArrayInAString";
import {
  extractFunctionName,
  getImportMethodNames,
} from "../../../utils/getMethodName";
import {
  createCodeFile,
  findFileByAccountIdAndFullFilePath,
} from "../codeFile/codeFile.repository";
import { findImportExportMapByImportId } from "../exportImportMap/exportImportMap.repository";
import { createChatCompletion } from "../openAi/openai.service";
import {
  assignCodeSnippetToFile,
  findAllSnippetWithoutFiles,
} from "../supabase/supabase.service";
import {
  createImportExportMap,
  findAllSnippetsImportStatements,
  findAllSnippetsWhereNameIsNull,
  findExportSnippetByNameAndPath,
  findSnippetByMethodNameAndAccount,
  getLongSnippetsWhereExternalMethodNull,
  updateSnippetById,
} from "./codeSnippet.repository";
import { logInfo, logWarning } from "../../../utils/commandLineColors";
import { createEmbeddings } from "../openAi/openAi.repository";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function codeSnippetSearch(code: string) {
  const code_embedding = await createEmbeddings([code]);

  const query = {
    query_embedding: code_embedding,
    similarity_threshold: 0.8,
    match_count: 10,
  };

  const { data, error } = await supabase.rpc("match_code", query);

  return data;
}

export async function findSnippetByExplainationEmbedding(
  embedding: number[],
  accountId: string,
  match_count: number = 10
) {
  const query = {
    accountid: accountId,
    query_embedding: embedding,
    similarity_threshold: 0.5,
    match_count,
  };

  const { data, error } = await supabase.rpc(
    "match_code_snippet_explaination",
    query
  );

  if (error) {
    console.log(error);
    return [];
  }
  if (!data) {
    return [];
  }
  return data;
}

export async function findSnippetsWithoutFilesAndAssignFiles() {
  const snippets = await findAllSnippetWithoutFiles();

  if (!snippets) {
    logInfo("No snippets without files found");
    return;
  }
  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    if (
      !snippet.file_name ||
      !snippet.id ||
      !snippet.relative_file_path ||
      !snippet.account_id
    ) {
      continue;
    }
    const file = await findFileByAccountIdAndFullFilePath(
      snippet.account_id,
      snippet.relative_file_path + "/" + snippet.file_name
    );
    if (!file || !file.id) {
      // Create file
      if (!snippet.account_id) {
        continue;
      }
      const file = await createCodeFile(
        snippet.account_id ? snippet.account_id : "",
        {
          file_name: snippet.file_name,
          file_path: snippet.relative_file_path,
          updated_at: new Date().toISOString(),
        }
      );
      if (!file || !file.id) {
        continue;
      }
      await assignCodeSnippetToFile(file.id, snippet.id);
    } else {
      await assignCodeSnippetToFile(file.id, snippet.id);
    }
  }
}

export const createNewFileFromSnippets = async (
  fullPath: string,
  accountId: string,
  updates?: any
) => {
  const fileWithSnippets = await findFileByAccountIdAndFullFilePath(
    accountId,
    fullPath
  );

  if (
    !fileWithSnippets ||
    !fileWithSnippets.file_name ||
    !fileWithSnippets.file_path
  ) {
    return null;
  }

  if (!fileWithSnippets?.code_snippet) {
    // Create the snippets
  } else {
    // Check the snippets
    const { code_snippet } = fileWithSnippets;

    let codeSnippets: any[] = [];

    if (!Array.isArray(code_snippet)) {
      codeSnippets = [code_snippet];
    } else {
      codeSnippets = [...code_snippet];
    }

    const orderByStartRow = codeSnippets.sort((a, b) => {
      return a.start_row - b.start_row;
    });

    const array: any[] = [];

    let previousStopRow = 0;

    for await (const snippet of orderByStartRow) {
      const emptyLinesToAdd = snippet.start_row - previousStopRow - 1;

      if (emptyLinesToAdd > 0) {
        array.splice(previousStopRow + 1, emptyLinesToAdd, "\n");
      }
      array.splice(
        snippet.start_row,
        snippet.end_row - snippet.start_row,
        snippet.code_string
      );
      previousStopRow = snippet.end_row;
    }

    if (updates) {
      console.log(updates);
    }

    const fileContent = array.join(" ");
    return fileContent;
  }
};

export async function updateCodeSnippetNames() {
  const allSnippetsWhereNameIsNotSet = await findAllSnippetsWhereNameIsNull();

  logInfo(
    `Number of snippets without names: ${allSnippetsWhereNameIsNotSet.length}`
  );

  let matchedCount = 0;
  let notMatchedCount = 0;
  let matchedSnippets: {
    id: number;
    name: string | null;
  }[] = [];

  allSnippetsWhereNameIsNotSet.forEach(async (snippet) => {
    if (!snippet.code_string) {
      return;
    }
    const matched = extractFunctionName(snippet.code_string);
    if (!matched) {
      logWarning(`Not Matched: ${snippet.file_name}`);
      notMatchedCount++;
      return;
    } else {
      matchedCount++;
      matchedSnippets.push({
        id: snippet.id,
        name: matched,
      });
    }
  });

  matchedSnippets.forEach(async (snippet) => {
    await updateSnippetById(snippet.id, {
      name: snippet.name,
      updated_at: new Date().toISOString(),
    });
  });

  console.log("Matched: ", matchedCount);
  console.log("Not Matched: ", notMatchedCount);
  console.log("Total: ", matchedSnippets);
}

export const findAllImportStatements = async () => {
  const imports = await findAllSnippetsImportStatements();

  let matchedCount = 0;
  let notMatchedCount = 0;
  let matchedSnippets: {
    id: number;
    exportId: number;
    code_string: string;
    exportSnippet: string | null;
  }[] = [];

  for (let importSnippet of imports) {
    const matchWithImport = await matchImportSnippetWithExport(importSnippet);
    matchedCount = matchedCount + matchWithImport.matched;
    notMatchedCount = notMatchedCount + matchWithImport.notMatched;
    matchedSnippets.push(...matchWithImport.matchedSnippet);
  }

  console.log("Matched: ", matchedCount);
  console.log("Not Matched: ", notMatchedCount);
  console.log("Total: ", matchedSnippets.length);

  matchedSnippets.forEach(async (snippet) => {
    createImportExportMap({
      import_id: snippet.id,
      export_id: snippet.exportId,
    });
  });
};

export async function matchImportSnippetWithExport(importSnippet: {
  account_id?: any;
  code_string?: any;
  id?: any;
  relative_file_path?: any;
}): Promise<{
  matched: number;
  notMatched: number;
  matchedSnippet: any[];
}> {
  let matched = 0;
  let notMatched = 0;
  let matchedSnippet: {
    id: any;
    exportId: number;
    code_string: any;
    exportSnippet: string | null;
  }[] = [];

  const { code_string, id, relative_file_path } = importSnippet;
  // console.log(importSnippet.code_string);
  if (!code_string || !id || !relative_file_path) {
    return {
      matched,
      notMatched,
      matchedSnippet,
    };
  }
  const foundIndividualImports = getImportMethodNames(code_string);
  if (foundIndividualImports) {
    const { methodNames } = foundIndividualImports;

    for (let importNames of methodNames) {
      const exportSnippet = await findExportSnippetByNameAndPath(
        importNames.trim()
      );

      if (!exportSnippet) {
        notMatched++;
        continue;
      } else {
        matched++;

        if (exportSnippet.account_id !== importSnippet.account_id) {
          // console.log("Account ID not matched");
          continue;
        } else {
          // console.log(exportSnippet.name, code_string);
          matchedSnippet.push({
            id,
            exportId: exportSnippet.id,
            code_string,
            exportSnippet: exportSnippet.name,
          });
        }
      }
    }

    // Get the export snippet by the import path and method name
  } else {
    notMatched++;
  }

  return {
    matched,
    notMatched,
    matchedSnippet,
  };
}

export async function matchExportsInSnippetBody() {
  const longSnippets = await getLongSnippetsWhereExternalMethodNull(10);
  console.log(longSnippets.length);

  let updatedCount = 0;

  for (let snippet of longSnippets) {
    if (
      !snippet ||
      !snippet.code_string ||
      !snippet.id ||
      !snippet.account_id
    ) {
      return;
    }

    const importMap = await findImportExportMapByImportId(snippet.id);

    if (!importMap || !importMap.length || importMap.length === 0) {
      // Match all the methods with exports
      const externalMethods = await createChatCompletion([
        {
          content: `${snippet.code_string}

        return example:
        [
          "findAllFiles",
          "updatedToday"
        ]

      Find all the methods in the above code that are not defined in the code. Return the list as an array of strings.
      `,
          role: ChatUserType.user,
        },
      ]);

      if (!externalMethods) {
        continue;
      }

      console.log(externalMethods);

      const parsed = findArray(externalMethods);
      if (!parsed || !parsed.length || parsed.length === 0) {
        await updateSnippetById(snippet.id, {
          has_external_methods: false,
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      if (parsed && parsed.length > 0) {
        for (let method of parsed) {
          await updateSnippetById(snippet.id, {
            has_external_methods: true,
            updated_at: new Date().toISOString(),
          });

          console.log("Method: ", removeQuotes(method));

          const exportSnippet = await findSnippetByMethodNameAndAccount(
            removeQuotes(method),
            snippet.account_id
          );
          console.log("Export Snippet: ", exportSnippet);
          if (exportSnippet) {
            const created = await createImportExportMap({
              import_id: snippet.id,
              export_id: exportSnippet.id,
            });
            console.log("Map created", created);
            updatedCount++;
          }
        }
      }
    }
  }
  console.log("Updated Count: ", updatedCount);
}
