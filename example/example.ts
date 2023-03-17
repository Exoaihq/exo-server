import path from "path";

const fs = require('fs');
const { promisify } = require('util');
const appendFile = promisify(fs.appendFile);

export function createFile(fileName: string, text: string, folder: string = './src') {
    const location = path.join(folder, fileName);
    fs.writeFile(location, text, (err: any) => {
        if (err) throw err;
        console.log(`${location} has been created and populated with text.`);
    });
}

export async function addCodeToTheBottonOfFile(fileName: string, code: string) {
    try {
        await appendFile(fileName, code);
        console.log(`${fileName} has been updated with text.`);
    } catch (err) {
        throw err;
    }
}