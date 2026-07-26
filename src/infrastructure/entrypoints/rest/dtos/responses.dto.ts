import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Delivery } from '../../../../domain/models/delivery.model';
import { Product } from '../../../../domain/models/product.model';
import { Transaction } from '../../../../domain/models/transaction.model';

export class ProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priceInCents!: number;
  @ApiProperty() stock!: number;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;

  static fromDomain(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      priceInCents: product.priceInCents,
      stock: product.stock,
      imageUrl: product.imageUrl,
    };
  }
}

export class AmountBreakdownDto {
  @ApiProperty() productAmountInCents!: number;
  @ApiProperty() baseFeeInCents!: number;
  @ApiProperty() deliveryFeeInCents!: number;
  @ApiProperty() amountInCents!: number;
}

export class TransactionResponseDto {
  @ApiProperty() transactionId!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() status!: string;
  @ApiProperty() paymentDescription!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ type: AmountBreakdownDto }) amounts!: AmountBreakdownDto;
  @ApiProperty() productId!: string;
  @ApiProperty() solicitedDate!: Date;
  @ApiPropertyOptional({ nullable: true }) cardBrand!: string | null;
  @ApiPropertyOptional({ nullable: true }) cardLastFour!: string | null;
  @ApiPropertyOptional({ nullable: true }) statusMessage!: string | null;

  static fromDomain(transaction: Transaction): TransactionResponseDto {
    return {
      transactionId: transaction.transactionId,
      reference: transaction.reference,
      status: transaction.status,
      paymentDescription: transaction.paymentDescription,
      quantity: transaction.quantity,
      amounts: transaction.amounts,
      productId: transaction.productId,
      solicitedDate: transaction.solicitedDate,
      cardBrand: transaction.cardBrand,
      cardLastFour: transaction.cardLastFour,
      statusMessage: transaction.statusMessage,
    };
  }
}

export class DeliveryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty() address!: string;
  @ApiProperty() city!: string;
  @ApiProperty() region!: string;
  @ApiProperty() country!: string;
  @ApiProperty() status!: string;

  static fromDomain(delivery: Delivery): DeliveryResponseDto {
    return {
      id: delivery.id,
      recipientName: delivery.recipientName,
      address: delivery.address,
      city: delivery.city,
      region: delivery.region,
      country: delivery.country,
      status: delivery.status,
    };
  }
}

export class CheckoutResponseDto {
  @ApiProperty({ type: TransactionResponseDto })
  transaction!: TransactionResponseDto;
  @ApiProperty({ type: DeliveryResponseDto }) delivery!: DeliveryResponseDto;
}
