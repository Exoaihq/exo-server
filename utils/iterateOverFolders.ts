import * as fs from 'fs';

export const folderLooper = (folderPath: string, handleFile: any, handleSnippet: any) => {
    let output = '';
    const files = fs.readdirSync(folderPath);
    files.forEach((file, index) => {
        const filePath = `${folderPath}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            console.log("File path >>>>>>>>>>>>>>>>>>", filePath)


            const contents = fs.readFileSync(filePath, 'utf8');

            handleFile(contents, handleSnippet)


            // parse the file into functions

            // Use the parsing to create embedding snippets

            // Store the embeddings

            // Store the snippets?


        } else if (stats.isDirectory()) {
            console.log("Folder >>>>>>>>>>>>>>>>>>")
            output += folderLooper(filePath, handleFile, handleSnippet);
        }
    });
    return output;
};

