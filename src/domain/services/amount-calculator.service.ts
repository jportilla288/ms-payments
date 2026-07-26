import { AmountBreakdown } from '../models/transaction.model';
import { Product } from '../models/product.model';
import {
  BASE_FEE_IN_CENTS,
  DELIVERY_FEE_IN_CENTS,
} from '../resources/fees.constants';

/**
 * Single source of truth for the price breakdown shown in the summary screen
 * and charged to the gateway. Pure function, trivially unit-testable.
 */
export class AmountCalculatorService {
  static calculate(product: Product, quantity: number): AmountBreakdown {
    const productAmountInCents = product.priceInCents * quantity;

    return {
      productAmountInCents,
      baseFeeInCents: BASE_FEE_IN_CENTS,
      deliveryFeeInCents: DELIVERY_FEE_IN_CENTS,
      amountInCents:
        productAmountInCents + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS,
    };
  }
}
