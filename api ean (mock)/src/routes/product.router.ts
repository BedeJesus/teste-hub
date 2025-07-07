import { Router, Request, Response } from 'express';

const router = Router();

const mockProducts = [
    { ean: '7891000315507', ProductName: 'REFRIGERANTE COCA-COLA', minPrice: 4.50, maxPrice: 6.00 },
    { ean: '7891991010138', ProductName: 'CERVEJA HEINEKEN', minPrice: 5.00, maxPrice: 7.50 },
    { ean: '7894900011517', ProductName: 'CHOCOLATE LACTA', minPrice: 3.00, maxPrice: 5.00 },
    { ean: '1234567890123', ProductName: 'PRODUTO DE TESTE', minPrice: 10.00, maxPrice: 20.00 },
    { ean: '4565156131', ProductName: 'Sabão Líquido OMO Lavagem Perfeita 500ml', minPrice: 5.00, maxPrice: 25.35 },
];

interface MockProductResponse {
    ProductName: string;
    minPrice: number;
    maxPrice: number;
}

// Rota para obter informações do produto pelo EAN
router.get('/products/:ean', (req: Request, res: Response<MockProductResponse | { message: string }>) => {
    const { ean } = req.params;

    const product = mockProducts.find(p => p.ean === ean);

    if (product) {
        const { ProductName, minPrice, maxPrice } = product;
        res.status(200).json({ ProductName, minPrice, maxPrice });
    } else {
        res.status(404).json({ message: `Produto com EAN ${ean} não encontrado.` });
    }
});

export default router;