import { Customer } from '../domain/models/customer.model';
import { Delivery } from '../domain/models/delivery.model';
import { Product } from '../domain/models/product.model';
import { Transaction } from '../domain/models/transaction.model';
import { CardBrandEnum } from '../domain/resources/card-brand.enum';
import { DeliveryStatusEnum } from '../domain/resources/delivery-status.enum';
import { DocumentTypeEnum } from '../domain/resources/document-type.enum';
import { TransactionStatusEnum } from '../domain/resources/transaction-status.enum';

/** Shared fixtures so specs stay focused on behaviour instead of setup. */

export const aProduct = (stock = 10): Product =>
  new Product('prod-1', 'Pro Running Shoes', 'Nice shoes', 100_000, stock, null);

export const aCustomer = (): Customer =>
  new Customer(
    'cus-1',
    'jane@example.com',
    'Jane Doe',
    '1098765432',
    DocumentTypeEnum.CC,
    '3001234567',
  );

export const aTransaction = (
  status: TransactionStatusEnum = TransactionStatusEnum.PENDING,
): Transaction =>
  new Transaction(
    'tx-1',
    'TX-REF',
    'Pro Running Shoes x1',
    status,
    new Date('2026-07-26T00:00:00Z'),
    1,
    {
      productAmountInCents: 100_000,
      baseFeeInCents: 50_000,
      deliveryFeeInCents: 120_000,
      amountInCents: 270_000,
    },
    'cus-1',
    'prod-1',
    null,
    null,
    CardBrandEnum.VISA,
    '4242',
  );

export const aDelivery = (): Delivery =>
  new Delivery(
    'del-1',
    'tx-1',
    'cus-1',
    'Jane Doe',
    'Calle 100',
    'Bucaramanga',
    'Santander',
    'CO',
    '3001234567',
    DeliveryStatusEnum.PENDING,
  );

export const aCard = () => ({
  number: '4242424242424242',
  cvc: '123',
  expMonth: '08',
  expYear: '29',
  cardHolder: 'JANE DOE',
});
