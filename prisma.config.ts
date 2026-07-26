// Prisma 7 configuration.
// Environment variables are loaded here because Prisma no longer reads .env automatically.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // The generated client is ESM-shaped TypeScript, so the seed runs against
    // the compiled output instead of through ts-node.
    seed: 'npm run build && node dist/prisma/seed.js',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
