import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetProductUseCase } from '../../../../application/use-cases/get-product.use-case';
import { ListProductsUseCase } from '../../../../application/use-cases/list-products.use-case';
import { ProductResponseDto } from '../dtos/responses.dto';
import { unwrapOrThrow } from '../utilities/result.helper';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the store catalogue with available stock' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  async findAll(): Promise<ProductResponseDto[]> {
    const products = await unwrapOrThrow(this.listProducts.execute());
    return products.map((product) => ProductResponseDto.fromDomain(product));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single product' })
  @ApiOkResponse({ type: ProductResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await unwrapOrThrow(this.getProduct.execute(id));
    return ProductResponseDto.fromDomain(product);
  }
}
