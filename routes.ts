import { Router } from 'express';
import { createCodeSnippet, generateCode, getCodeSnippet, helloWorld, searchCodeEmbeddings, testOpenAi, testParser } from './server/api/codeSnippet/codeSnippert.controller';


export const routes = Router();

const codeSnippet = Router();

codeSnippet.get('/', helloWorld);
codeSnippet.get('/code-snippet', getCodeSnippet);
codeSnippet.get('/code-snippet/create', createCodeSnippet);
codeSnippet.get('/code-snippet/run', testParser);
codeSnippet.get('/code-snippet/openai', testOpenAi);
codeSnippet.get('/code-snippet/search', searchCodeEmbeddings);
codeSnippet.get('/code-snippet/generate-code', generateCode);

routes.use(codeSnippet)

export default routes;