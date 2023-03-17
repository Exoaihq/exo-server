export interface ParseCode {
    contents: string,
    filePath: string
}

export interface ParsedCodeMetadata {
    element: Element,
    filePath: string,
    type: string
    fileName: string

}

export interface ParsedCode {
    code: string,
    metadata: ParsedCodeMetadata
}

export interface Position {
    row: number,
    column: number
}

export interface Element {
    type: string,
    startPosition: Position,
    endPosition: Position,
    startIndex: number,
    endIndex: number
}

export interface ParsedDirectory {
    directoryName: string,
    filePath: string,
    files: string[]
}

export interface ParsedFile {
    fileName: string,
    filePath: string,
}

export const parseCodeTypes = [
    {
        name: 'function_declaration',
        prefix: 'function',
        parse: true,
    },
    {
        name: 'lexical_declaration',
        prefix: 'const',
        parse: true,
    },
    {
        name: 'export_statement',
        prefix: "export",
        parse: true,
    },
    {
        name: 'import_statement',
        prefix: null,
        parse: true
    },
    {
        name: 'empty_statement',
        prefix: null,
        parse: false
    }
]

export interface SnippetByFileName {
    file_name: string | null,
    id: number,
    code_file_id: number | null,
    code_string: string | null,
    code_explaination: string | null,
    start_row: number | null,
    start_column: number | null,
    end_row: number | null,
    end_column: number | null
}