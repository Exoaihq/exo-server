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

export async function findFileId(fileName: string): Promise<number | null> {
    const { data, error } = await supabase
        .from('code_file')
        .select('id')
        .eq('file_name', fileName)

    if (!data || !data[0]) {
        return null
    }

    return data[0].id
}

interface SnippetWithoutFiles {
    file_name: string | null,
    id: number
}

export async function findAllSnippetWithoutFiles(): Promise<SnippetWithoutFiles[] | null> {
    const { data, error } = await supabase
        .from('code_snippet')
        .select('file_name, id')
        .is('code_file_id', null)

    if (error) {
        console.log(error)
        return null
    }
    if (!data) {
        return null
    }
    return data
}


export async function assignCodeSnippetToFile(fileId: number, codeSnippetId: number) {

    const dbRecord = {
        code_file_id: fileId,
    }

    const { data, error } = await supabase
        .from('code_snippet')
        .update(dbRecord)
        .eq('id', codeSnippetId)

    console.log(data, error)
}

export async function findSnippetsWithoutFilesAndAssignFiles() {

    const snippets = await findAllSnippetWithoutFiles()

    if (!snippets) {
        return
    }
    for (let i = 0; i < snippets.length; i++) {
        const snippet = snippets[i]
        if (!snippet.file_name) {
            continue
        }
        const fileId = await findFileId(snippet.file_name)
        if (!fileId) {
            continue
        }
        await assignCodeSnippetToFile(fileId, snippet.id)
    }
}

export async function findFilesWithoutExplaination() {
    const { data, error } = await supabase
        .from('code_file')
        .select('id, file_name, code_snippet(id, file_name, code_explaination, parsed_code_type, code_string)')
        .is('file_explaination', null)

    if (error) {
        console.log(error)
        return null
    }
    if (!data) {
        return null
    }
    return data
}

export interface CodeSnippet {
    id: number;
    file_name: string | null;
    code_explaination: string | null;
    parsed_code_type: string | null;
    code_string: string | null;
}

export function getPromptFromSnippets(snippets: CodeSnippet[] | CodeSnippet, codeLanguage: string = "Typescript") {

    const prefix = `This is a file that contains ${codeLanguage} code.`
    const suffix = " Write an exmplaination for this file does. This file has code that "

    if (!Array.isArray(snippets)) {
        return prefix + " This is the explaination for what the code does:" + snippets.code_explaination + suffix
    }

    // These are the import statements:" + get + "." + "These are the explainations of what the code does:" + exportExplainations.join(" ") 
    let importStatements: string[] = []
    let exportExplainations: (string | null)[] = []

    snippets.forEach(s => {
        if (s.parsed_code_type === 'import_statement') {
            importStatements.push(s.code_string ? "import statement: " + s.code_string : "")
        }
        if (s.parsed_code_type === 'export_statement' || s.parsed_code_type === 'lexical_declaration') {
            exportExplainations.push("code explaination: " + s.code_explaination)
        }
    })

    return prefix + " These are the import statements:" + "\n" + importStatements.join("\n") + "." + " These are the explainations of what the code does:" + exportExplainations.join("\n") + "\n" + suffix
}

export async function assignExplainationsForFilesWhereNull(files: {
    id: number;
    file_name: string | null;
    code_snippet: CodeSnippet | CodeSnippet[] | null;
}[] | null) {


    if (!files) {
        return
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.code_snippet || (Array.isArray(file.code_snippet) && file.code_snippet.length === 0)) {
            continue
        }

        const { code_snippet } = file

        const prompt = getPromptFromSnippets(code_snippet)

        const fileExplaination = await createTextCompletion(prompt)
        console.log(fileExplaination)

        const explaination = fileExplaination.choices[0].text.trim()

        const file_explaination_embedding = await createEmbeddings([explaination])
        console.log(file_explaination_embedding)

        const dbRecord = {
            file_explaination: explaination,
            file_explaination_embedding,
        }

        const { data, error } = await supabase
            .from('code_file')
            .update(dbRecord)
            .eq('id', file.id)

        console.log(data, error)


    }

}