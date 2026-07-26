import { CardBrandService } from './card-brand.service';
import { CardBrandEnum } from '../resources/card-brand.enum';

describe('CardBrandService', () => {
  describe('detectBrand', () => {
    it.each([
      ['4242424242424242', CardBrandEnum.VISA],
      ['4111 1111 1111 1111', CardBrandEnum.VISA],
      ['5555555555554444', CardBrandEnum.MASTERCARD],
      ['2223003122003222', CardBrandEnum.MASTERCARD],
      ['2221000000000009', CardBrandEnum.MASTERCARD],
      ['2720999999999996', CardBrandEnum.MASTERCARD],
      ['2220000000000006', CardBrandEnum.UNKNOWN],
      ['2721000000000004', CardBrandEnum.UNKNOWN],
      ['6011111111111117', CardBrandEnum.UNKNOWN],
      ['', CardBrandEnum.UNKNOWN],
    ])('maps %s to %s', (cardNumber, expected) => {
      expect(CardBrandService.detectBrand(cardNumber)).toBe(expected);
    });
  });

  describe('isValidNumber', () => {
    it('accepts a number with a correct Luhn checksum', () => {
      expect(CardBrandService.isValidNumber('4242 4242 4242 4242')).toBe(true);
    });

    it('rejects a number with a broken checksum', () => {
      expect(CardBrandService.isValidNumber('4242424242424241')).toBe(false);
    });

    it('rejects non numeric input', () => {
      expect(CardBrandService.isValidNumber('abcd-efgh-ijkl-mnop')).toBe(false);
    });

    it('rejects numbers that are too short', () => {
      expect(CardBrandService.isValidNumber('424242')).toBe(false);
    });

    it('rejects numbers that are too long', () => {
      expect(CardBrandService.isValidNumber('4'.repeat(20))).toBe(false);
    });

    it('accepts a 19 digit number with a valid checksum', () => {
      expect(CardBrandService.isValidNumber('4242424242424242222')).toBe(false);
    });
  });

  describe('lastFour', () => {
    it('returns the last four digits ignoring separators', () => {
      expect(CardBrandService.lastFour('4242-4242-4242-1234')).toBe('1234');
    });
  });

  describe('isNotExpired', () => {
    const now = new Date(2026, 6, 25);

    it('accepts a card expiring later this year', () => {
      expect(CardBrandService.isNotExpired('12', '26', now)).toBe(true);
    });

    it('accepts a card expiring during the current month', () => {
      expect(CardBrandService.isNotExpired('07', '26', now)).toBe(true);
    });

    it('rejects a card that expired last month', () => {
      expect(CardBrandService.isNotExpired('06', '26', now)).toBe(false);
    });

    it('rejects an out of range month', () => {
      expect(CardBrandService.isNotExpired('13', '30', now)).toBe(false);
    });

    it('rejects a non numeric year', () => {
      expect(CardBrandService.isNotExpired('01', 'ab', now)).toBe(false);
    });
  });
});
