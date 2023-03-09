import * as fs from 'fs';

export const folderLooper = async (folderPath: string, handleFile: any, handleSnippet: any) => {
    let output = '';
    const files = fs.readdir(folderPath, async (err: any, files: any) => {
        for await (const file of files) {
            const filePath = `${folderPath}/${file}`;
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                console.log("File path >>>>>>>>>>>>>>>>>>", filePath)

                const contents = fs.readFileSync(filePath, 'utf8');

                handleFile({ filePath, contents }, handleSnippet)

            } else if (stats.isDirectory()) {
                console.log("Folder >>>>>>>>>>>>>>>>>>")
                output += folderLooper(filePath, handleFile, handleSnippet);
            }
        }
    });

    return output;
};

