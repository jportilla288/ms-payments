import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTransactionUseCase } from '../../../../application/use-cases/create-transaction.use-case';
import { GetTransactionUseCase } from '../../../../application/use-cases/get-transaction.use-case';
import { ProcessPaymentUseCase } from '../../../../application/use-cases/process-payment.use-case';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import { ProcessPaymentDto } from '../dtos/process-payment.dto';
import {
  CheckoutResponseDto,
  DeliveryResponseDto,
  TransactionResponseDto,
} from '../dtos/responses.dto';
import { unwrapOrThrow } from '../utilities/result.helper';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly processPayment: ProcessPaymentUseCase,
    private readonly getTransaction: GetTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a PENDING transaction with its customer and delivery data',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  async create(@Body() dto: CreateTransactionDto): Promise<CheckoutResponseDto> {
    const output = await unwrapOrThrow(this.createTransaction.execute(dto));

    return {
      transaction: TransactionResponseDto.fromDomain(output.transaction),
      delivery: DeliveryResponseDto.fromDomain(output.delivery),
    };
  }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Charge the card, then assign the delivery and update stock',
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  async pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessPaymentDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await unwrapOrThrow(
      this.processPayment.execute({
        transactionId: id,
        card: dto.card,
        installments: dto.installments,
      }),
    );

    return TransactionResponseDto.fromDomain(transaction);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read the current state of a transaction' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await unwrapOrThrow(this.getTransaction.execute(id));
    return TransactionResponseDto.fromDomain(transaction);
  }
}
