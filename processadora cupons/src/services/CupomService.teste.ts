import { CouponService } from './CouponService';
import { cpf } from 'cpf-cnpj-validator';
import axios from 'axios';

jest.mock('cpf-cnpj-validator');
jest.mock('axios');

const mockedCpf = cpf as jest.Mocked<typeof cpf>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CouponService', () => {
  let couponService: CouponService;

  beforeEach(() => {
    couponService = new CouponService();
    jest.clearAllMocks(); 
  });

  it('deve processar um cupom com documento e EAN válidos', async () => {
    // Arrange (Preparação)
    const coupon = { document: '111.111.111-11', ean: '7891234567890' };
    mockedCpf.isValid.mockReturnValue(true); 
    mockedAxios.get.mockResolvedValue({ data: { valid: true } }); 

    const result = await couponService.process(coupon);

    expect(mockedCpf.isValid).toHaveBeenCalledWith(coupon.document);
    expect(mockedAxios.get).toHaveBeenCalledWith(`http://api-mock:5000/ean/${coupon.ean}`);
    expect(result).toEqual({ status: 'APROVADO' });
  });

  it('deve lançar um erro para um documento inválido', async () => {

    const coupon = { document: 'doc-invalido', ean: '7891234567890' };
    mockedCpf.isValid.mockReturnValue(false); 

    await expect(couponService.process(coupon)).rejects.toThrow('Documento inválido');

    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('deve retornar status EAN_INVALIDO para um EAN inválido', async () => {

    const coupon = { document: '111.111.111-11', ean: 'ean-invalido' };
    mockedCpf.isValid.mockReturnValue(true);
    mockedAxios.get.mockResolvedValue({ data: { valid: false } });

    const result = await couponService.process(coupon);

    expect(result).toEqual({ status: 'EAN_INVALIDO' });
  });
});
