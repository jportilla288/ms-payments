import { TransactionStatusEnum } from '../resources/transaction-status.enum';
import { aTransaction } from '../../test-support/builders';

describe('Transaction', () => {
  it.each([
    [TransactionStatusEnum.APPROVED, true],
    [TransactionStatusEnum.DECLINED, true],
    [TransactionStatusEnum.VOIDED, true],
    [TransactionStatusEnum.ERROR, true],
    [TransactionStatusEnum.PENDING, false],
  ])('reports %s as finalized=%s', (status, expected) => {
    expect(aTransaction(status).isFinalized()).toBe(expected);
  });

  it('is approved only in the APPROVED state', () => {
    expect(aTransaction(TransactionStatusEnum.APPROVED).wasApproved()).toBe(true);
    expect(aTransaction(TransactionStatusEnum.DECLINED).wasApproved()).toBe(false);
  });

  it('keeps the amount breakdown consistent with the total', () => {
    const { amounts } = aTransaction();

    expect(
      amounts.productAmountInCents + amounts.baseFeeInCents + amounts.deliveryFeeInCents,
    ).toBe(amounts.amountInCents);
  });
});
