# Budgetify API

Budgetify API is the backend service that powers the Budgetify web and mobile
clients. It handles authentication, user sessions, ledger data, recurring todo
logic, file-backed todo images, and the filtering/search infrastructure used by
the product.

## API Overview

- Base prefix: `/api/v1`
- Swagger docs: `/api/v1/docs`
- Primary purpose: serve authenticated finance and planning workflows for
  Budgetify clients

## Core Capabilities

- JWT-based authentication and session handling
- Google identity token verification
- Email OTP flows
- CRUD modules for income, expenses, loans, savings, todos, and users
- Pagination, search, and chosen-date filtering on ledger endpoints
- Prisma-backed PostgreSQL persistence
- Cloudinary-backed todo image storage
- Swagger documentation for the public API surface

## Stack

- NestJS 11
- TypeScript
- Prisma 7
- PostgreSQL / Neon
- Swagger
- Joi validation
- Cloudinary
- Nodemailer

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Fill in the required values in `.env`.

At minimum, configure:

- `PORT`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `OTP_HASH_SECRET`
- `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_IDS`
- mail transport settings if you want OTP email delivery locally

4. Apply existing migrations:

```bash
npm run prisma:migrate:deploy
```

5. Start the API in watch mode:

```bash
npm run start:dev
```

6. Open Swagger locally:

```text
http://localhost:<PORT>/api/v1/docs
```

If you use the current local env in this workspace, that URL is typically:

```text
http://localhost:8000/api/v1/docs
```

## Useful Scripts

```bash
npm run start
npm run start:dev
npm run start:prod
npm run build
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
```

## Data and Environment Notes

- `DATABASE_URL` is used for the pooled connection.
- `DIRECT_DATABASE_URL` should point to the direct database host for Prisma
  migrations.
- Swagger is enabled for local and production verification.
- The production deployment uses release-based deploys plus `prisma migrate deploy`.

## Related Clients

- Web client: `../web`
- Flutter client: `../app`

Both clients rely on this API as their source of truth for authentication and
financial data.
