import express, {Express, Request, Response} from 'express';
import { routes } from './routes';

const app: Express = express();
const port = 3000;

app.use('/', routes)

app.get('/', (req: Request, res: Response)=>{
    res.send('Hello, this is Express + asdfsadasdfasdfasdfsadfasdfsadfdsa');
});

app.listen(port, ()=> {
console.log(`[Server]: Running at https://localhost:${port}`);
});