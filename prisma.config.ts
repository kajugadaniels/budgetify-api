import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

const envFilePath =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

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
