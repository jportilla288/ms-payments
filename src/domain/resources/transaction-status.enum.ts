/**
 * Transaction lifecycle states.
 *
 * Values are intentionally identical to the ones returned by the payment
 * gateway, so the adapter layer never needs a translation table.
 */
export enum TransactionStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  ERROR = 'ERROR',
}

/** States from which a transaction can no longer change. */
export const FINAL_TRANSACTION_STATUSES: readonly TransactionStatusEnum[] = [
  TransactionStatusEnum.APPROVED,
  TransactionStatusEnum.DECLINED,
  TransactionStatusEnum.VOIDED,
  TransactionStatusEnum.ERROR,
];

export const isFinalStatus = (status: TransactionStatusEnum): boolean =>
  FINAL_TRANSACTION_STATUSES.includes(status);
