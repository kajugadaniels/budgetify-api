import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

const migrationDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? env('DATABASE_URL');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: migrationDatabaseUrl,
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
