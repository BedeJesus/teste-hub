import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { cnpj } from 'cpf-cnpj-validator'; 
import { rabbitMQService } from '../services/rabbitmq.service';


const prisma = new PrismaClient()

interface ProdutoInput {
    name: string;
    ean: string;
    unitaryPrice: number;
    quantity: number;
}

interface CreateCupomRequest {
    code44: string;
    purchaseDate: string;
    totalValue: number;
    companyDocument: string;
    state: string;
    products: ProdutoInput[];
}

export default class CupomController {
    static async create(req: Request, res: Response) {
        try {
            const {
                code44,
                purchaseDate,
                totalValue,
                companyDocument,
                state,
                products
            }: CreateCupomRequest = req.body;

            // 1. Validações de entrada
            if (!code44 || !/^\d{44}$/.test(code44)) {
                return res.status(422).json({ message: 'O campo "code44" precisa ter exatamente 44 caracteres numéricos.' });
            }

            if (!companyDocument) {
                return res.status(422).json({ message: 'O CNPJ da empresa é obrigatório.' });
            }

            if (!cnpj.isValid(companyDocument)) {
                return res.status(422).json({ message: 'O CNPJ da empresa é inválido.' });
            }

            if (!products || products.length === 0) {
                return res.status(422).json({ message: 'A lista de produtos não pode estar vazia.' });
            }

            // 2. Validação do valor total
            const calculatedTotal = products.reduce((acc, produto) => {
                return acc + (produto.quantity * produto.unitaryPrice);
            }, 0);

            // Usar uma tolerância para comparação de ponto flutuante
            if (Math.abs(calculatedTotal - totalValue) > 0.001) {
                return res.status(422).json({ message: `O valor total do cupom (${totalValue}) não corresponde à soma dos products (${calculatedTotal}).` });
            }

            // 3. Validação dos produtos
            for (const produto of products) {
                try {
                    const response = await fetch(`http://localhost:3000/api/products/${produto.ean}`);

                    if (!response.ok) {
                        if (response.status === 404) {
                            return res.status(422).json({ message: `EAN '${produto.ean}' do produto '${produto.name}' não encontrado na API mock.` });
                        }
                        return res.status(response.status).json({ message: `Erro ao validar o produto '${produto.name}' na API mock.` });
                    }

                    const mockProduct = await response.json();

                    if (produto.unitaryPrice < mockProduct.minPrice || produto.unitaryPrice > mockProduct.maxPrice) {
                        return res.status(422).json({
                            message: `Preço do produto '${produto.name}' (${produto.unitaryPrice}) fora da faixa permitida (${mockProduct.minPrice} - ${mockProduct.maxPrice}).`
                        });
                    }
                } catch (apiError) {
                    console.error("Erro ao conectar com a API mock:", apiError);
                    return res.status(500).json({ message: "Não foi possível conectar à API de validação de produtos." });
                }
            }

            // 4. Verificar se o cupom já existe
            const existingCupom = await prisma.cupom.findFirst({
                where: { code44 }
            });

            if (existingCupom) {
                return res.status(409).json({ message: 'Este cupom já foi processado.' });
            }

            // 5. Salvar no banco de dados
            const cupom = await prisma.cupom.create({
                data: {
                    code44,
                    purchaseDate: new Date(purchaseDate),
                    totalValue,
                    companyDocument,
                    state,
                    products: {
                        create: products.map((p: ProdutoInput) => ({
                            name: p.name,
                            ean: p.ean.toString(),
                            unitaryPrice: p.unitaryPrice,
                            quantity: p.quantity,
                        }))
                    }
                },
                include: {
                    products: true
                }
            });

            // 6. Publicar no RabbitMQ
            await rabbitMQService.publishMessage('coupon_to_process', {
                cupomId: cupom.id,
                code44: cupom.code44,
            });

            return res.status(201).json({ message: 'Cupom recebido e em processamento!', cupom });

        } catch (err) {
            if (err instanceof Error) {
                console.error(err);
                return res.status(500).json({ message: "Erro interno no servidor", error: err.message });
            }
        }
    }
}
