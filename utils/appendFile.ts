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