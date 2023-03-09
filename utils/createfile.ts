import path from "path";

const fs = require('fs');

export function createFile(fileName: string, text: string, folder: string = './src') {
  const location = path.join(folder, fileName);
  fs.writeFile(location, text, (err: any) => {
    if (err) throw err;
    console.log(`${location} has been created and populated with text.`);
  });
}

