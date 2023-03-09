import { Router } from 'express';
import { createCodeSnippet, getCodeSnippet, searchCodeEmbeddings, testOpenAi, testParser } from './server/api/codeSnippet/codeSnippert.controller';

export const routes = Router();

const codeSnippet = Router();

codeSnippet.get('/code-snippet', getCodeSnippet);
codeSnippet.get('/code-snippet/create', createCodeSnippet);
codeSnippet.get('/code-snippet/run', testParser);
codeSnippet.get('/code-snippet/openai', testOpenAi);
codeSnippet.get('/code-snippet/search', searchCodeEmbeddings);

routes.use(codeSnippet)

export default routes;