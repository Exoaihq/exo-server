import path from "path";

const fs = require('fs');
const { promisify } = require('util');
const appendFile = promisify(fs.appendFile);

export async function addCodeToTheBottonOfFile(fileName: string, code: string) {
    try {
        await appendFile(fileName, code);
        console.log(`${fileName} has been updated with text.`);
    } catch (err) {
        throw err;
    }
}

export async function overwriteFile(filePath: string, code: string) {
    await fs.writeFile(filePath, code, (err: any) => err && console.log(err));
}



export async function writeStringToFileAtLocation(
    filePath: string,
    content: string,
    lineNumber: number = 0
): Promise<void> {
    try {
        if (lineNumber < 0) {
            throw new Error('Line number must be non-negative');
        }

        // Read the file
        const fileContent = await fs.readFileSync(filePath, 'utf-8');
        console.log(fileContent)

        // Split the contents into an array of lines
        const fileLines = fileContent.split('\n');

        // If the line number is bigger than the total number of lines set it to the last line.
        if (lineNumber > fileLines.length) {
            lineNumber = fileLines.length;
        }

        // Insert the new content at the specified line number
        fileLines.splice(lineNumber, 0, content);

        // Join the lines back into a single string
        const newContent = fileLines.join('\n');
        console.log(newContent)

        // Write the updated contents back to the file

        await fs.writeFile(filePath, newContent, (err: any) => err && console.log(err));

        console.log(`Content added at line ${lineNumber} in ${filePath}`);
    } catch (error) {
        console.error(`Error inserting content at line ${lineNumber} in ${filePath}:`, error);
    }

} 
