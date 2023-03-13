import * as fs from 'fs';

export const iterateOverFolderAndHandleFileContents = async (folderPath: string, handleFile: any, handleSnippet: any) => {
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
                output += iterateOverFolderAndHandleFileContents(filePath, handleFile, handleSnippet);
            }
        }
    });

    return output;
};


export const iterateOverFolder = async (folderPath: string, handleFolder: any) => {
    fs.readdir(folderPath, async (err: any, files: any) => {
        for await (const file of files) {
            const filePath = `${folderPath}/${file}`;
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                console.log("Folder >>>>>>>>>>>>>>>>>>", filePath)
                await handleFolder(filePath)
                iterateOverFolder(filePath, handleFolder);
            }
        }
    });

};

export const iterateOverFolderAndHandleFile = async (folderPath: string, handleFile: any) => {
    fs.readdir(folderPath, async (err: any, files: any) => {

        for await (const file of files) {
            const filePath = `${folderPath}/${file}`;
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                await handleFile(filePath)
            } else if (stats.isDirectory()) {
                if (filePath.includes("node_modules") || filePath.includes("dist") || filePath.includes(".vscode") || filePath.includes(".git")) {
                    console.log("Skipping >>>>>>>>>>>>>>>>>>", filePath)
                } else {
                    iterateOverFolderAndHandleFile(filePath, handleFile);
                }

            }
        }
    });

};


export const findFoldersThatDontHaveExplainations = async (folderPath: string, handleFolder: any) => {

    let foldersThatDontHaveExplainations = []
    fs.readdir(folderPath, async (err: any, files: any) => {
        for await (const file of files) {
            const filePath = `${folderPath}/${file}`;
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {

                if (containsOnlyFiles(filePath)) {
                    // check for explaination
                    // if no explaination create it 
                }

                console.log("Folder >>>>>>>>>>>>>>>>>>", filePath)
                await handleFolder(filePath)
                iterateOverFolder(filePath, handleFolder);
            }
        }
    })
}


const containsOnlyFiles = (folderPath: string): boolean => {
    const files = fs.readdirSync(folderPath)
    return files.findIndex((file: string) => fs.statSync(file).isFile()) === -1 ? false : true
}


// Find a node with only files in it - find the node, if no node than create it
// Get the child node folder
// Find all the files in the folder (or other folders)
// For each file get the explaination
