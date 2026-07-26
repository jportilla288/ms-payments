import { generateTransactionReference } from './reference-generator';

describe('generateTransactionReference', () => {
  it('uses the TX prefix and an uppercase suffix', () => {
    expect(generateTransactionReference()).toMatch(/^TX-\d+-[0-9A-F]{8}$/);
  });

  it('never repeats a reference', () => {
    const references = new Set(
      Array.from({ length: 200 }, () => generateTransactionReference()),
    );

    expect(references.size).toBe(200);
  });
});
