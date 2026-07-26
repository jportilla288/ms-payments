import { AmountCalculatorService } from './amount-calculator.service';
import { Product } from '../models/product.model';
import {
  BASE_FEE_IN_CENTS,
  DELIVERY_FEE_IN_CENTS,
} from '../resources/fees.constants';

describe('AmountCalculatorService', () => {
  const product = new Product('id-1', 'Shoes', 'Nice shoes', 100_000, 10, null);

  it('adds the base fee and the delivery fee to the product amount', () => {
    const breakdown = AmountCalculatorService.calculate(product, 1);

    expect(breakdown.productAmountInCents).toBe(100_000);
    expect(breakdown.baseFeeInCents).toBe(BASE_FEE_IN_CENTS);
    expect(breakdown.deliveryFeeInCents).toBe(DELIVERY_FEE_IN_CENTS);
    expect(breakdown.amountInCents).toBe(
      100_000 + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS,
    );
  });

  it('multiplies the product amount by the quantity but charges fees once', () => {
    const breakdown = AmountCalculatorService.calculate(product, 3);

    expect(breakdown.productAmountInCents).toBe(300_000);
    expect(breakdown.baseFeeInCents).toBe(BASE_FEE_IN_CENTS);
    expect(breakdown.amountInCents).toBe(
      300_000 + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS,
    );
  });
});
