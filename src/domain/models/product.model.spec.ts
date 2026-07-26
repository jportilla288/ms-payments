import { Product } from './product.model';

describe('Product', () => {
  const build = (stock: number): Product =>
    new Product('id-1', 'Shoes', 'Nice shoes', 100_000, stock, null);

  it('reports enough stock when units cover the requested quantity', () => {
    expect(build(5).hasStockFor(5)).toBe(true);
  });

  it('reports insufficient stock when units fall short', () => {
    expect(build(2).hasStockFor(3)).toBe(false);
  });

  it('is unavailable when there is no stock left', () => {
    expect(build(0).isAvailable()).toBe(false);
    expect(build(1).isAvailable()).toBe(true);
  });
});
