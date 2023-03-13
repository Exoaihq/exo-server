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