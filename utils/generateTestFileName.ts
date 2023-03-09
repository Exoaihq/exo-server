

export function createTestFileName(fileName: string) {
  const fileNameParts = fileName.split('.');
  const testFileName = `${fileNameParts[0]}.test.${fileNameParts[1]}`;
  return testFileName;
};

// Test
const testFileName = createTestFileName('myFile.txt');
console.assert(testFileName === 'myFile.test.txt', 'Test file name should be myFile.test.txt');