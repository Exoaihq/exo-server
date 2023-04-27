// Sure! Here's a TypeScript function that takes a block of code as a string input, and tries to extract the function or method name:

// ```typescript
export function extractFunctionName(code: string): string | null {
  const nameRegex = /\bfunction\s+([\w_$]+)|[\w_$]+\.prototype\.(?=([\w_$]+))/;
  const functionNameRegex = /const\s+(\w+)\s+=/;
  const constExportRegex = /export\s+const\s+(\w+):/;
  const interfaceRegex = /export\s+interface\s+(\w+)/;
  const defaultRegex = /export\s+default\s+(\w+);/;
  const typeRegex = /export\s+enum\s+(\w+)/;
  const enumRegex = /export\s+type\s+(\w+)/;

  const match =
    code.match(nameRegex) ||
    code.match(functionNameRegex) ||
    code.match(constExportRegex) ||
    code.match(interfaceRegex) ||
    code.match(defaultRegex) ||
    code.match(typeRegex) ||
    code.match(enumRegex);

  return match ? match[1] || match[2] : null;
}

// Example Usage

// const codeBlock = `
//   function theFunction() {
//     console.log("Hello, World!");
//   }
// `;

// console.log(extractFunctionName(codeBlock)); // Output: 'theFunction'
// ```

// This function uses a regular expression to search for function names in the form of `function functionName` or `object.prototype.functionName`. It returns the found function name or `null` if there's no match. Keep in mind that this might not cover all possible use-cases, but it should work for most typical JavaScript functions.

export const getImportMethodNames = (code: string) => {
  const regexPattern = /import\s+{(.+)}\s+from\s+["']([^"']+)["']/;
  const match = code.match(regexPattern);
  if (!match) return null;
  const [, methodNames, importPath] = match;
  return {
    methodNames: methodNames.split(",").map((name) => name.trim()),
    importPath,
  };
};

export function stripPrefix(filePath: string): {
  filePath: string;
  removedCount: number;
} {
  const prefix = "../";
  let result = filePath;
  let removedCount = 0;
  while (result.startsWith(prefix)) {
    removedCount++;
    result = result.slice(prefix.length);
  }
  return {
    filePath: result,
    removedCount,
  };
}

export function stripPath(filePath: string, n: number): string {
  const segments = filePath.split("/");
  const numSegments = segments.length;

  if (numSegments <= n) {
    // If the path has fewer segments than the number to be removed,
    // return an empty string (or throw an error, depending on your use case)
    return "";
  } else {
    // Remove the last n segments from the path and rejoin the remaining segments
    const newSegments = segments.slice(0, numSegments - n);
    return newSegments.join("/");
  }
}
