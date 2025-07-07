import express from 'express';
import { rabbitMQService } from './services/rabbitmq.service';

const app = express();
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {

    // await rabbitMQService.connect();

    // await rabbitMQService.startBuyerDataConsumer();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar a aplicação:", error);
    process.exit(1); 
  }
};

startServer();
