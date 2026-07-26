import {
  toCustomerModel,
  toDeliveryModel,
  toProductModel,
  toTransactionModel,
} from './prisma.mappers';
import { CardBrandEnum } from '../../../domain/resources/card-brand.enum';
import { DeliveryStatusEnum } from '../../../domain/resources/delivery-status.enum';
import { DocumentTypeEnum } from '../../../domain/resources/document-type.enum';
import { TransactionStatusEnum } from '../../../domain/resources/transaction-status.enum';

const now = new Date();

describe('prisma mappers', () => {
  it('maps a product row', () => {
    const product = toProductModel({
      id: 'p1',
      name: 'Shoes',
      description: 'Nice',
      priceInCents: 100,
      stock: 3,
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    } as never);

    expect(product.hasStockFor(3)).toBe(true);
    expect(product.imageUrl).toBeNull();
  });

  it('maps a customer row including the document type', () => {
    const customer = toCustomerModel({
      id: 'c1',
      email: 'a@b.com',
      fullName: 'A B',
      document: '123',
      documentType: 'NIT',
      phoneNumber: '300',
      createdAt: now,
      updatedAt: now,
    } as never);

    expect(customer.documentType).toBe(DocumentTypeEnum.NIT);
  });

  it('maps a delivery row', () => {
    const delivery = toDeliveryModel({
      id: 'd1',
      recipientName: 'A B',
      address: 'Calle',
      city: 'Bga',
      region: 'San',
      country: 'CO',
      postalCode: null,
      phoneNumber: '300',
      status: 'ASSIGNED',
      deliveredAt: null,
      transactionId: 't1',
      customerId: 'c1',
      createdAt: now,
      updatedAt: now,
    } as never);

    expect(delivery.status).toBe(DeliveryStatusEnum.ASSIGNED);
    expect(delivery.postalCode).toBeNull();
  });

  it('maps a transaction row into its amount breakdown', () => {
    const transaction = toTransactionModel({
      transactionId: 't1',
      reference: 'REF',
      paymentDescription: 'Shoes x1',
      status: 'APPROVED',
      solicitedDate: now,
      quantity: 2,
      productAmountInCents: 200,
      baseFeeInCents: 50,
      deliveryFeeInCents: 120,
      amountInCents: 370,
      wompiTransactionId: 'gw-1',
      statusMessage: null,
      cardBrand: 'MASTERCARD',
      cardLastFour: '4444',
      customerId: 'c1',
      productId: 'p1',
      createdAt: now,
      updatedAt: now,
    } as never);

    expect(transaction.status).toBe(TransactionStatusEnum.APPROVED);
    expect(transaction.cardBrand).toBe(CardBrandEnum.MASTERCARD);
    expect(transaction.amounts.amountInCents).toBe(370);
    expect(transaction.wasApproved()).toBe(true);
  });
});
