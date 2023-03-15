import { ParseCode, ParsedCode, Element } from "../types/parseCode.types";
import { SimpleGit, simpleGit, SimpleGitOptions } from 'simple-git';
const Parser = require("tree-sitter")
const TypeScript = require('tree-sitter-typescript').typescript;

const parser = new Parser();

parser.setLanguage(TypeScript);

function compareGitChangesToTreeSitter(filePath: string): void {

  const options: Partial<SimpleGitOptions> = {
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  };

  const git: SimpleGit = simpleGit(options);

  // Get the git log for the file
  const gitLog = git.diff();

  // Get the tree sitter output for the file
  const treeSitterOutput = parser.parse(filePath);

  // Compare the git log and tree sitter output
  const changes = gitLog.diff(treeSitterOutput);

  // Log the changes
  console.log(changes);
}