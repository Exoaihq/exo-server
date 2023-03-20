import * as fs from 'fs';

export function findFileAndReturnContents(fullFilePathAndName: string) {
    return fs.readFileSync(fullFilePathAndName, 'utf8')
}