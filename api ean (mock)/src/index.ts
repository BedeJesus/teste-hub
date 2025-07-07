import express from 'express';
import cors from 'cors';
import productRouter from './routes/product.router';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', productRouter);

app.listen(port, () => {
    console.log(`Servidor da API mock rodando em http://localhost:${port}`);
});