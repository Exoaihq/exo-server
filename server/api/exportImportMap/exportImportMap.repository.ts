import { findAllSnippetsImportStatements } from "../codeSnippet/codeSnippet.repository";
import { supabase } from "../supabase/supabase.service";

export const getExportImportMaps = async () => {
  const { data, error } = await supabase
    .from("export_import_snippet_map")
    .select("*, code_snippet(file_name, name, id)");

  const imports = await findAllSnippetsImportStatements();

  let withExport = [];
  if (data && data.length > 0) {
    for (let map of data) {
      withExport.push({
        ...map,
        import_snippet: imports.find((i) => i.id === map.import_id),
      });
    }
  } else {
    return [];
  }
  return withExport;
};
