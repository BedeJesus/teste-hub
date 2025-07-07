// src/services/rabbitmq.service.ts

import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Fila para onde enviaremos o cupom processado
const COUPON_TO_PROCESS_QUEUE = 'coupon_to_process'; 
// Fila de onde receberemos os dados do comprador
const BUYER_DATA_PROCESSED_QUEUE = 'buyer_data_processed'; 

/**
 * Interface para a mensagem que esperamos receber da "Mineradora".
 * Ela contém os dados do comprador e o ID do cupom para associação.
 */
interface BuyerDataMessage {
  cupomId: string;
  name: string;
  document: string;
  birthDate: string; // A data virá como string e será convertida
}

class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  // Usamos o padrão Singleton para garantir uma única conexão
  private static instance: RabbitMQService;

  private constructor() {}

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  /**
   * Conecta ao servidor RabbitMQ e cria um canal.
   */
  public async connect(): Promise<void> {
    try {
      if (this.channel) {
        return;
      }

      // Obtém a URL do RabbitMQ do ambiente (definida no docker-compose.yml)
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      
      // A conexão com o servidor RabbitMQ é estabelecida aqui
      this.connection = await amqp.connect(url);

      // Um canal é criado a partir da conexão. O erro de tipo ocorre se esta linha for atribuída a this.connection
      if (!this.connection) {
        throw new Error('Falha ao criar canal: conexão RabbitMQ não está estabelecida.');
      }
      this.channel = await this.connection.createChannel(); 

      console.log('✅ Conectado ao RabbitMQ com sucesso!');

      // Garante que as filas existem antes de usá-las
      await this.channel.assertQueue(COUPON_TO_PROCESS_QUEUE, { durable: true });
      await this.channel.assertQueue(BUYER_DATA_PROCESSED_QUEUE, { durable: true });

    } catch (error) {
      console.error('❌ Falha ao conectar ao RabbitMQ:', error);
      // Implementar lógica de retry se necessário
      throw error;
    }
  }

  /**
   * Publica uma mensagem em uma fila específica.
   * @param queue O nome da fila.
   * @param message O objeto da mensagem a ser enviado.
   */
  public async publishMessage(queue: string, message: object): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal do RabbitMQ não está disponível. Conecte primeiro.');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    // A opção { persistent: true } garante que a mensagem sobreviva a uma reinicialização do RabbitMQ
    this.channel.sendToQueue(queue, messageBuffer, { persistent: true });
    
    console.log(`📤 Mensagem publicada na fila '${queue}':`, message);
  }

  /**
   * Configura um consumidor (listener) para uma fila específica.
   * @param queue O nome da fila.
   * @param onMessage A função de callback a ser executada para cada mensagem recebida.
   */
  public async consumeMessages(queue: string, onMessage: (msg: any) => Promise<void> | void): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal do RabbitMQ não está disponível. Conecte primeiro.');
    }

    console.log(`👂 Escutando a fila '${queue}'...`);
    
    this.channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          // Converte o buffer da mensagem de volta para um objeto
          const parsedMessage = JSON.parse(msg.content.toString());
          console.log(`📥 Mensagem recebida da fila '${queue}':`, parsedMessage);
          
          // Executa a função de callback e aguarda sua conclusão, caso seja uma Promise
          await onMessage(parsedMessage);

          // Confirma o recebimento e processamento da mensagem
          this.channel?.ack(msg);
        } catch (error) {
          console.error(`Erro ao processar mensagem da fila '${queue}':`, error);
          // Rejeita a mensagem sem enfileirar novamente em caso de erro de processamento
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  /**
   * Inicia o consumidor que escuta por dados de compradores processados
   * e atualiza o banco de dados, associando o comprador ao cupom.
   */
  public async startBuyerDataConsumer(): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal do RabbitMQ não está disponível. Conecte primeiro.');
    }

    const processBuyerData = async (msg: BuyerDataMessage) => {
      const { cupomId, name, document, birthDate } = msg;

      try {
        // Verifica se já existe um comprador para este cupom para evitar duplicatas
        const existingComprador = await prisma.comprador.findUnique({
          where: { cupomId },
        });

        if (existingComprador) {
          console.log(`[RabbitMQ] Comprador para o cupom ${cupomId} já existe. Ignorando a mensagem.`);
          return; // Mensagem já processada, apenas confirma (ack)
        }

        // Cria o registro do comprador e o associa ao cupom
        const newComprador = await prisma.comprador.create({
          data: { name, document, birthDate: new Date(birthDate), cupomId },
        });

        console.log(`✅ [DB Update] Comprador ${newComprador.id} criado e associado ao cupom ${cupomId}.`);
      } catch (error) {
        console.error(`❌ Erro ao processar dados do comprador para o cupom ${cupomId}:`, error);
        // Lança o erro para que o `consumeMessages` possa fazer o nack, evitando reprocessamento infinito.
        throw error;
      }
    };

    await this.consumeMessages(BUYER_DATA_PROCESSED_QUEUE, processBuyerData);
  }
}

// Exporta a instância única do serviço
export const rabbitMQService = RabbitMQService.getInstance();