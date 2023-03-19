import { ParseCode, ParsedCode, Element } from "../types/parseCode.types";
import { SimpleGit, simpleGit, SimpleGitOptions } from 'simple-git';
const Parser = require("tree-sitter")
const TypeScript = require('tree-sitter-typescript').typescript;

const parser = new Parser();

parser.setLanguage(TypeScript);

export async function getGitDiff() {
  console.log(process.cwd());

  const options: Partial<SimpleGitOptions> = {
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  };

  const git: SimpleGit = simpleGit(options);

  const gitDiffOptions = [
    "--word-diff",
    "--unified=0"
  ]

  const diff = await git.diff(gitDiffOptions)
  return diff
}


// To achieve this, we need to parse the git diff result, extract the file names and changed line numbers, and create an object with the extracted information. Here's a possible implementation of the function:

// typescript
type GitDiffOutput = {
  fileName: string;
  changedLines: number[];
};

export function parseGitDiff(gitDiffResult: string): GitDiffOutput[] {
  const lines = gitDiffResult.split('\n');
  const result: GitDiffOutput[] = [];

  let currentFile: GitDiffOutput | null = null;

  for (const line of lines) {
    // Check if line is a file indicator
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        result.push(currentFile);
      }

      const fileName = line.split(' ')[2].trim();
      currentFile = { fileName, changedLines: [] };
      continue;
    }

    // Check if line is a change indicator
    if (line.startsWith('@@')) {
      if (!currentFile) continue;

      const lineNumbersMatcher = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
      const match = lineNumbersMatcher.exec(line);

      if (!match) continue;

      const startLine = parseInt(match[1], 10);
      const linesCount = parseInt(match[2], 10) || 1;

      for (let i = 0; i < linesCount; i++) {
        currentFile.changedLines.push(startLine + i);
      }
    }
  }

  if (currentFile) {
    result.push(currentFile);
  }

  return result;
}

export async function getDiffAndParse() {
  return parseGitDiff(await getGitDiff())
}
