import * as fs from "fs";

export function findFileAndReturnContents(fullFilePathAndName: string) {
  return fs.readFileSync(fullFilePathAndName, "utf8");
}

// Here's a TypeScript function that extracts the path from the given string:

// ```ts
export function extractPath(input: string): string {
  const pathMatch = input.match(/\/[\w\-\./]+/);
  const removeTailingPeriod = (path: string) => {
    return path[path.length - 1] === "." ? path.slice(0, -1) : path;
  };

  return pathMatch ? removeTailingPeriod(pathMatch[0]) : "";
}

// Example usage:
const input =
  "The directory name that best matches this search is: agent which is located at: /Users/kg/Repos/code-gen-server/server/api/agent";
const extractedPath = extractPath(input);
// console.log(extractedPath); // Output: /Users/kg/Repos/code-gen-server/server/api/agent
// ```

// This function uses a regular expression to search for the path in the input string and returns it. If no path is found, it returns an empty string.
