import express, { Express, Request, Response } from 'express';
import { routes } from './routes';
import cors from 'cors'

const app: Express = express();
const port = 8081;

var corsOptions = {
    origin: '*',
}

app.use(cors(corsOptions))

app.use('/', routes)
app.listen(port, () => {
    console.log(`[Server]: Running at https://localhost:${port}`);
});