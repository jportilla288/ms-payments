// Loads DATABASE_URL from .env before the client connects.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PRODUCTS = [
  {
    name: 'Pro Running Shoes',
    description: 'Lightweight training and marathon shoes with responsive cushioning.',
    priceInCents: 480_000_00,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=70',
  },
  {
    name: 'Sport Smartwatch v2',
    description: 'Heart-rate monitor, built-in GPS and seven-day battery life.',
    priceInCents: 342_000_00,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=70',
  },
  {
    name: 'Noise Cancelling Headphones',
    description: 'Active noise cancellation with 30 hours of playback.',
    priceInCents: 799_900_00,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=70',
  },
  {
    name: 'Mechanical Keyboard TKL',
    description: 'Tenkeyless hot-swappable keyboard with PBT keycaps.',
    priceInCents: 259_000_00,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=70',
  },
  {
    name: 'Portable Power Bank 20000mAh',
    description: 'Fast-charging power bank with dual USB-C output.',
    priceInCents: 129_900_00,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=70',
  },
];

async function main(): Promise<void> {
  console.info('Seeding database with dummy products...');

  // Order matters: children first to satisfy foreign keys.
  await prisma.delivery.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  await prisma.product.createMany({ data: PRODUCTS });

  console.info(`Seed complete: ${PRODUCTS.length} products created.`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
