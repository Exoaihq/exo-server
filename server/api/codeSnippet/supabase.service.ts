import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { Database } from "../../../types/supabase"
import { ParseCode, ParsedCode, ParsedDirectory, ParsedFile, Element, SnippetByFileName } from "../../../types/parseCode.types";
import { createEmbeddings, createTextCompletion } from "../openAi/openai.service";
import { AddModel } from '../../../types/openAiTypes/openAiEngine';
import { parseCode, parseFile } from '../../../utils/treeSitter';
import { getSubstringFromMultilineCode } from '../../../utils/getSubstringFromMultilineCode';
import { extractFileNameAndPathFromFullPath } from '../../../utils/getFileName';


// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

export async function checkSession(session: {
    access_token: string;
    refresh_token: string;
}){
    return await supabase.auth.setSession(session)
} 

function areAnyValuesNull(obj: any) {
    return Object.values(obj).some(x => x === null);
}

// Use this function to update snippets in the database
export async function compareAndUpdateSnippet(contents: ParsedCode, snippet: SnippetByFileName) {
    if (areAnyValuesNull(snippet)) {
        // Update the snippet in the db
    }
}

// Use this function to update snippets in the database
export async function compareAndUpdateSnippets(contents: ParseCode, snippets: SnippetByFileName[], printTotalsOnly: boolean = false) {


    const tree = await parseFile(contents.contents)
    const lines = contents.contents.split('\n')

    const { fileName, extractedPath } = extractFileNameAndPathFromFullPath(contents.filePath)

    let updateCount = 0
    let matchedCount = 0
    let notFound = 0

    for await (const [index, element] of tree.rootNode.children.entries()) {

        const { startPosition, endPosition, type }: Element = element
        const codeSnippet = getSubstringFromMultilineCode(lines, startPosition.row, startPosition.column, endPosition.row, endPosition.column)

        const found = snippets.find((snippet) => snippet.code_string === codeSnippet)

        if (found) {
            if (startPosition.row === found.start_row && endPosition.row === found.end_row && startPosition.column === found.start_column && endPosition.column === found.end_column) {
                matchedCount++
                // Do not need to update db
                continue
            } else {
                // update db entry
                updateCount++
                if (!printTotalsOnly) {
                    await addCodeToSupabase({
                        code: codeSnippet,
                        metadata: {
                            element,
                            filePath: extractedPath,
                            type,
                            fileName
                        }
                    }, found.id)
                }

            }
        } else {
            notFound++
            if (!printTotalsOnly) {
                await addCodeToSupabase({
                    code: codeSnippet,
                    metadata: {
                        element,
                        filePath: extractedPath,
                        type,
                        fileName
                    }
                })
            }

        }
    }

    return { updateCount, matchedCount, notFound }
}

export async function addCodeToSupabase(snippet: ParsedCode, dbSnippetId?: number) {

    const codeExplaination = await createTextCompletion("What does this code do:" + snippet.code)

    const code_embedding = await createEmbeddings([snippet.code])

    let code_explaination = null
    let code_explaination_embedding = null

    if (codeExplaination && codeExplaination.choices && codeExplaination.choices[0] && codeExplaination.choices[0].text) {
        const { choices } = codeExplaination
        if (!choices[0].text) {
            return
        }
        code_explaination = choices[0].text.trim()
        const e = await createEmbeddings([code_explaination])
        code_explaination_embedding = e[0]
    }

    code_explaination_embedding = await createEmbeddings([code_explaination])

    const fileId = await findFileId(snippet.metadata.fileName)

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
        code_file_id: fileId
    }

    if (dbSnippetId) {
        const { data, error } = await supabase
            .from('code_snippet')
            .update(dbRecord)
            .eq('id', dbSnippetId)

        console.log(data, error)
    }

    const { data, error } = await supabase
        .from('code_snippet')
        .insert([dbRecord])

    console.log(data, error)
}


export async function addDirectoryToSupabase(directory: ParsedDirectory) {

    const { directoryName, filePath } = directory

    const directoryExplaination = await createTextCompletion("This is a folder directory that contains files with code. These are the explainations of what the files do:" + directory.files.concat.toString() + "Wrtie an exmplaination for this directory does.")

    const directory_explaination_embedding = await createEmbeddings([directoryExplaination.choices[0].text?.trim()])

    const dbRecord = {
        directory_explaination: directoryExplaination.choices[0].text?.trim(),
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


export async function findSnippetByFileName(fileName: string): Promise<SnippetByFileName[] | null> {
    const { data, error } = await supabase
        .from('code_snippet')
        .select('file_name, id, code_file_id, code_string, code_explaination, start_row, start_column, end_row, end_column')
        .eq('file_name', fileName)

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

        const explaination = fileExplaination.choices[0].text?.trim()

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

export async function findFileByExplainationEmbedding(embedding: number[]) {

    const query = {
        query_embedding: embedding,
        similarity_threshold: 0.50,
        match_count: 10,
    }

    const { data, error } = await supabase.rpc("match_code_file", query)

    if (error) {
        console.log(error)
        return null
    }
    if (!data) {
        return null
    }
    return data
}


export async function updateOpenAiModels(models: AddModel[]) {

    const { data, error } = await supabase
        .from('openai_models')
        .upsert(models)

    console.log(data, error)
}

export async function getOpenAiModelsFromDb(): Promise<{
    created_at: string | null;
    id: string;
    object: string | null;
    ready: boolean | null;
    updated_at: string;
}[] | null> {

    const { data, error } = await supabase
        .from('openai_models')
        .select("*")

    return data
}

function parsefile(contents: ParseCode) {
    throw new Error('Function not implemented.');
}
