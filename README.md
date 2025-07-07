# Desafio Técnico HUB Brasil - Processadora de Cupons

Este projeto foi desenvolvido como parte do desafio técnico para a HUB, para Lucas Faggioni.

## Sobre o Projeto

A "Processadora de Cupons" é um serviço back-end responsável por:

1.  Receber os dados de um cupom fiscal via API REST.
2.  Realizar uma série de validações nos dados recebidos (formato, CNPJ, valores e produtos).
3.  Persistir os dados válidos em um banco de dados PostgreSQL.
4.  Publicar as informações do cupom em uma fila do RabbitMQ para processamento assíncrono por um serviço externo (a "Mineradora de compradores").
5.  Ouvir uma fila de resposta para receber os dados do comprador e atualizar o registro do cupom no banco de dados.

## Tecnologias Utilizadas

O projeto foi construído utilizando as seguintes tecnologias:

-   **Linguagem:** TypeScript
-   **Ambiente:** Node.js
-   **Containerização:** Docker e Docker Compose
-   **Banco de Dados:** PostgreSQL
-   **Mensageria:** RabbitMQ
-   **Testes de API:** Postman/Jest

## Como Executar o Projeto

Siga os passos abaixo para configurar e executar o ambiente de desenvolvimento.

### Pré-requisitos

-   Docker
-   Docker Compose
-   Node.js (para gerenciamento de pacotes)

### 1. Clone o Repositório

```bash
git clone <url-do-seu-repositorio>
cd <nome-do-repositorio>
```
Depois disso entre na pasta das 2 api`s e execute o comando npm i e depois npm run dev
