import { CardBrandEnum } from '../resources/card-brand.enum';

const VISA_PATTERN = /^4\d{12}(\d{3})?(\d{3})?$/;
// Classic 51-55 range plus the 2221-2720 range introduced in 2017.
const MASTERCARD_PATTERN =
  /^(5[1-5]\d{14}|222[1-9]\d{12}|22[3-9]\d{13}|2[3-6]\d{14}|27[01]\d{13}|2720\d{12})$/;

/**
 * Pure card helpers. No framework, no I/O: fully unit-testable and reused by
 * both the domain validation and the UI brand badge.
 */
export class CardBrandService {
  static sanitize(cardNumber: string): string {
    return cardNumber.replace(/[\s-]/g, '');
  }

  static detectBrand(cardNumber: string): CardBrandEnum {
    const digits = CardBrandService.sanitize(cardNumber);

    if (VISA_PATTERN.test(digits)) {
      return CardBrandEnum.VISA;
    }
    if (MASTERCARD_PATTERN.test(digits)) {
      return CardBrandEnum.MASTERCARD;
    }
    return CardBrandEnum.UNKNOWN;
  }

  /** Luhn checksum. Rejects structurally impossible card numbers. */
  static isValidNumber(cardNumber: string): boolean {
    const digits = CardBrandService.sanitize(cardNumber);

    if (!/^\d{13,19}$/.test(digits)) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  static lastFour(cardNumber: string): string {
    return CardBrandService.sanitize(cardNumber).slice(-4);
  }

  static isNotExpired(expMonth: string, expYear: string, now: Date = new Date()): boolean {
    const month = Number(expMonth);
    const year = Number(expYear);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return false;
    }
    if (!Number.isInteger(year) || year < 0 || year > 99) {
      return false;
    }

    const fullYear = 2000 + year;
    const lastValidMoment = new Date(fullYear, month, 1);

    return now < lastValidMoment;
  }
}
