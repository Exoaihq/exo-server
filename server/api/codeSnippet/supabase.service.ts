import { createEmbeddings, createTextCompletion } from "../../../utils/openAi"
import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { Database } from "../../../types/supabase"
import { ParsedCode, ParsedDirectory, ParsedFile } from "../../../types/parseCode.types";

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey)


export async function addCodeToSupabase(snippet: ParsedCode) {

    const codeExplaination = await createTextCompletion("What does this code snippet do:" + snippet.code)

    const code_embedding = await createEmbeddings([snippet.code])

    let code_explaination = null
    let code_explaination_embedding = null

    if (codeExplaination && codeExplaination.choices && codeExplaination.choices[0] && codeExplaination.choices[0].text) {
        const { choices } = codeExplaination
        code_explaination = choices[0].text.trim()
        const e = await createEmbeddings([code_explaination])
        code_explaination_embedding = e[0]
    }

    code_explaination_embedding = await createEmbeddings([code_explaination])

    const dbRecord = {
        code_string: snippet.code,
        code_explaination,
        code_explaination_embedding,
        code_embedding,
        relative_file_path: snippet.metadata.filePath,
        parsed_code_type: snippet.metadata.type,
        start_row: snippet.metadata.element.startPosition.row,
        start_column: snippet.metadata.element.startPosition.column,
        end_row: snippet.metadata.element.endPosition.row,
        end_column: snippet.metadata.element.endPosition.column,
        file_name: snippet.metadata.fileName,
    }

    const { data, error } = await supabase
        .from('code_snippet')
        .insert([dbRecord])

    console.log(data, error)
}


export async function addDirectoryToSupabase(directory: ParsedDirectory) {

    const { directoryName, filePath } = directory

    const directoryExplaination = await createTextCompletion("This is a folder directory that contains files with code. These are the explainations of what the files do:" + directory.files.concat.toString() + "Wrtie an exmplaination for this directory does.")

    const directory_explaination_embedding = await createEmbeddings([directoryExplaination.choices[0].text.trim()])

    const dbRecord = {
        directory_explaination: directoryExplaination.choices[0].text.trim(),
        directory_explaination_embedding,
        file_path: filePath,
        directory_name: directoryName
    }

    const { data, error } = await supabase
        .from('code_directory')
        .insert([dbRecord])

    console.log(data, error)
}

export async function addFileToSupabase(parsedFile: ParsedFile) {

    const { fileName, filePath } = parsedFile

    const dbRecord = {
        file_name: fileName,
        file_path: filePath,
    }

    const { data, error } = await supabase
        .from('code_file')
        .insert([dbRecord])

    console.log(data, error)
}