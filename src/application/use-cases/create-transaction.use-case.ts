import { Inject, Injectable } from '@nestjs/common';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Delivery } from '../../domain/models/delivery.model';
import { Product } from '../../domain/models/product.model';
import { Transaction } from '../../domain/models/transaction.model';
import { AmountCalculatorService } from '../../domain/services/amount-calculator.service';
import { CardBrandService } from '../../domain/services/card-brand.service';
import { DocumentTypeEnum } from '../../domain/resources/document-type.enum';
import { generateTransactionReference } from '../../utilities/reference-generator';
import { CUSTOMER_REPOSITORY_PORT } from '../ports/customer-repository.port';
import type { CustomerRepositoryPort } from '../ports/customer-repository.port';
import { DELIVERY_REPOSITORY_PORT } from '../ports/delivery-repository.port';
import type { DeliveryRepositoryPort } from '../ports/delivery-repository.port';
import { PRODUCT_REPOSITORY_PORT } from '../ports/product-repository.port';
import type { ProductRepositoryPort } from '../ports/product-repository.port';
import { TRANSACTION_REPOSITORY_PORT } from '../ports/transaction-repository.port';
import type { TransactionRepositoryPort } from '../ports/transaction-repository.port';

export interface CreateTransactionInput {
  readonly productId: string;
  readonly quantity: number;
  readonly customer: {
    readonly email: string;
    readonly fullName: string;
    readonly document: string;
    readonly documentType: DocumentTypeEnum;
    readonly phoneNumber: string;
  };
  readonly delivery: {
    readonly recipientName: string;
    readonly address: string;
    readonly city: string;
    readonly region: string;
    readonly country: string;
    readonly phoneNumber: string;
    readonly postalCode?: string | null;
  };
  /** Only the number is used, and only to derive brand + last four digits. */
  readonly cardNumber: string;
}

export interface CreateTransactionOutput {
  readonly transaction: Transaction;
  readonly delivery: Delivery;
  readonly product: Product;
}

/**
 * Step 5.1 of the business process: persist a PENDING transaction and return
 * its number, before any money movement is attempted.
 *
 * Written as a Railway Oriented Programming pipeline: every step either stays
 * on the success track or short-circuits onto the failure track.
 */
@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY_PORT)
    private readonly customerRepository: CustomerRepositoryPort,
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(DELIVERY_REPOSITORY_PORT)
    private readonly deliveryRepository: DeliveryRepositoryPort,
  ) {}

  execute(
    input: CreateTransactionInput,
  ): ResultAsync<CreateTransactionOutput, DomainError> {
    return this.validateQuantity(input.quantity)
      .andThen(() => this.validateCard(input.cardNumber))
      .andThen(() => this.loadAvailableProduct(input.productId, input.quantity))
      .andThen((product) =>
        this.customerRepository
          .upsertByEmail(input.customer)
          .map((customer) => ({ product, customer })),
      )
      .andThen(({ product, customer }) => {
        const amounts = AmountCalculatorService.calculate(
          product,
          input.quantity,
        );

        return this.transactionRepository
          .create({
            reference: generateTransactionReference(),
            paymentDescription: `${product.name} x${input.quantity}`,
            quantity: input.quantity,
            amounts,
            customerId: customer.id,
            productId: product.id,
            cardBrand: CardBrandService.detectBrand(input.cardNumber),
            cardLastFour: CardBrandService.lastFour(input.cardNumber),
          })
          .map((transaction) => ({ product, customer, transaction }));
      })
      .andThen(({ product, customer, transaction }) =>
        this.deliveryRepository
          .create({
            ...input.delivery,
            transactionId: transaction.transactionId,
            customerId: customer.id,
          })
          .map((delivery) => ({ transaction, delivery, product })),
      );
  }

  private validateQuantity(quantity: number): ResultAsync<true, DomainError> {
    return Number.isInteger(quantity) && quantity > 0
      ? okAsync(true as const)
      : errAsync(DomainError.invalidQuantity(quantity));
  }

  private validateCard(cardNumber: string): ResultAsync<true, DomainError> {
    return CardBrandService.isValidNumber(cardNumber)
      ? okAsync(true as const)
      : errAsync(
          DomainError.invalidCard('Card number failed the Luhn checksum.'),
        );
  }

  private loadAvailableProduct(
    productId: string,
    quantity: number,
  ): ResultAsync<Product, DomainError> {
    return this.productRepository.findById(productId).andThen((product) => {
      if (product === null) {
        return errAsync(DomainError.productNotFound(productId));
      }
      if (!product.hasStockFor(quantity)) {
        return errAsync(DomainError.insufficientStock(product.stock, quantity));
      }
      return okAsync(product);
    });
  }
}
