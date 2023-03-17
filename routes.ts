import { Router } from 'express';
import { handleCodeCompletion } from './server/api/codeCompletion/codeCompletion.controller';
import { findAndUpdateFiles, findCodeFile } from './server/api/codeFile/codeFile.controller';
import { runCalculator, startChat, startClassification } from './server/api/codeSnippet/chat.controller';
import { addAllFilesToDb, assignSnippetToFile, createCodeSnippet, findAllFilesWithoutExplainations, findAllFilesWithoutExplainationsAndAddThem, findAllSnippetsWithoutFiles, findAllSnippetsWithoutFilesAndAssign, findFileById, generateCode, getCodeSnippet, helloWorld, searchCodeEmbeddings, testCodeNodeParsing, testOpenAi, testParser } from './server/api/codeSnippet/codeSnippet.controller';
import { getModels } from './server/api/openAi/openAi.controller';


export const routes = Router();

const codeSnippet = Router();
codeSnippet.get('/', helloWorld);

codeSnippet.get('/code-snippet', getCodeSnippet);
codeSnippet.get('/code-snippet/create', createCodeSnippet);
codeSnippet.get('/code-snippet/run', testParser);
codeSnippet.get('/code-snippet/openai', testOpenAi);
codeSnippet.get('/code-snippet/search', searchCodeEmbeddings);
codeSnippet.get('/code-snippet/generate-code', generateCode);
codeSnippet.get('/code-snippet/parse-nodes', testCodeNodeParsing);

codeSnippet.get('/code-snippet/find-and-assign-file', findAllSnippetsWithoutFilesAndAssign)

codeSnippet.get('/code-files/add', addAllFilesToDb);
codeSnippet.get('/code-files/assign-snippet', assignSnippetToFile);
codeSnippet.get('/code-files/find-all-snippets-without-files', findAllSnippetsWithoutFiles);
codeSnippet.get('/code-files/find-by-id', findFileById);
codeSnippet.get('/code-files/find-without-explaination', findAllFilesWithoutExplainations)
codeSnippet.get('/code-files/find-without-explaination-add-them', findAllFilesWithoutExplainationsAndAddThem)

codeSnippet.get('/code-files/find-and-update', findAndUpdateFiles)

codeSnippet.post('/chat', startClassification)
codeSnippet.get('/chat/test-gpt4', startChat)

codeSnippet.get('/calculator', runCalculator)

codeSnippet.get('/query', findCodeFile)

codeSnippet.post('/code', handleCodeCompletion)

codeSnippet.get('/models', getModels)

routes.use(codeSnippet)

export default routes;