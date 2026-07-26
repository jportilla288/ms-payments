import { CardBrandEnum } from '../resources/card-brand.enum';
import {
  TransactionStatusEnum,
  isFinalStatus,
} from '../resources/transaction-status.enum';

export interface AmountBreakdown {
  readonly productAmountInCents: number;
  readonly baseFeeInCents: number;
  readonly deliveryFeeInCents: number;
  readonly amountInCents: number;
}

export class Transaction {
  constructor(
    public readonly transactionId: string,
    public readonly reference: string,
    public readonly paymentDescription: string,
    public readonly status: TransactionStatusEnum,
    public readonly solicitedDate: Date,
    public readonly quantity: number,
    public readonly amounts: AmountBreakdown,
    public readonly customerId: string,
    public readonly productId: string,
    public readonly wompiTransactionId: string | null = null,
    public readonly statusMessage: string | null = null,
    public readonly cardBrand: CardBrandEnum | null = null,
    public readonly cardLastFour: string | null = null,
  ) {}

  /** A finalized transaction must never be mutated again. */
  isFinalized(): boolean {
    return isFinalStatus(this.status);
  }

  wasApproved(): boolean {
    return this.status === TransactionStatusEnum.APPROVED;
  }
}
