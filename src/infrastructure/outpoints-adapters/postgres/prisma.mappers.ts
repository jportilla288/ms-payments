import type {
  Customer as CustomerRow,
  Delivery as DeliveryRow,
  Product as ProductRow,
  Transaction as TransactionRow,
} from '../../../../generated/prisma/client';
import { Customer } from '../../../domain/models/customer.model';
import { Delivery } from '../../../domain/models/delivery.model';
import { Product } from '../../../domain/models/product.model';
import { Transaction } from '../../../domain/models/transaction.model';
import { CardBrandEnum } from '../../../domain/resources/card-brand.enum';
import { DeliveryStatusEnum } from '../../../domain/resources/delivery-status.enum';
import { DocumentTypeEnum } from '../../../domain/resources/document-type.enum';
import { TransactionStatusEnum } from '../../../domain/resources/transaction-status.enum';

/**
 * Translation between persistence rows and domain models.
 *
 * Keeping this in one file means Prisma types never leak past the adapter.
 */
export const toProductModel = (row: ProductRow): Product =>
  new Product(
    row.id,
    row.name,
    row.description,
    row.priceInCents,
    row.stock,
    row.imageUrl,
  );

export const toCustomerModel = (row: CustomerRow): Customer =>
  new Customer(
    row.id,
    row.email,
    row.fullName,
    row.document,
    row.documentType as DocumentTypeEnum,
    row.phoneNumber,
  );

export const toDeliveryModel = (row: DeliveryRow): Delivery =>
  new Delivery(
    row.id,
    row.transactionId,
    row.customerId,
    row.recipientName,
    row.address,
    row.city,
    row.region,
    row.country,
    row.phoneNumber,
    row.status as DeliveryStatusEnum,
    row.postalCode,
  );

export const toTransactionModel = (row: TransactionRow): Transaction =>
  new Transaction(
    row.transactionId,
    row.reference,
    row.paymentDescription,
    row.status as TransactionStatusEnum,
    row.solicitedDate,
    row.quantity,
    {
      productAmountInCents: row.productAmountInCents,
      baseFeeInCents: row.baseFeeInCents,
      deliveryFeeInCents: row.deliveryFeeInCents,
      amountInCents: row.amountInCents,
    },
    row.customerId,
    row.productId,
    row.wompiTransactionId,
    row.statusMessage,
    row.cardBrand as CardBrandEnum | null,
    row.cardLastFour,
  );
