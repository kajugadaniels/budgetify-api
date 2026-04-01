import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),

  // ── Database ─────────────────────────────────────────────────────────────────
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .required(),
  DIRECT_DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .optional(),

  // ── JWT ──────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ── OTP ──────────────────────────────────────────────────────────────────────
  // Used as the HMAC key when hashing 6-digit OTP codes before storing in DB.
  // Must be at least 32 characters and kept separate from JWT secrets.
  OTP_HASH_SECRET: Joi.string().min(32).required(),

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_IDS: Joi.string().optional(),

  // ── Email delivery ───────────────────────────────────────────────────────────
  // Preferred: Gmail-compatible MAIL_* variables.
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),

  // Backward-compatible legacy SMTP_* variables.
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  EMAIL_FROM_NAME: Joi.string().default('Budgetify'),
  EMAIL_FROM_ADDRESS: Joi.string().email().optional(),

  // ── Cloudinary media storage ───────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  CLOUDINARY_TODO_FOLDER: Joi.string().default('todos'),
})
  .custom((value: Record<string, unknown>, helpers) => {
    if (!value['GOOGLE_CLIENT_ID'] && !value['GOOGLE_CLIENT_IDS']) {
      return helpers.error('any.custom', {
        message: 'Either GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS must be set.',
      });
    }

    const hasMailUser = Boolean(value['MAIL_USER']);
    const hasMailPass = Boolean(value['MAIL_PASS']);
    const hasLegacyUser = Boolean(value['SMTP_USER']);
    const hasLegacyPass = Boolean(value['SMTP_PASS']);

    if (hasMailUser !== hasMailPass) {
      return helpers.error('any.custom', {
        message: 'MAIL_USER and MAIL_PASS must be provided together.',
      });
    }

    if (hasLegacyUser !== hasLegacyPass) {
      return helpers.error('any.custom', {
        message: 'SMTP_USER and SMTP_PASS must be provided together.',
      });
    }

    if (!hasMailUser && !hasLegacyUser) {
      return helpers.error('any.custom', {
        message:
          'Either MAIL_USER/MAIL_PASS or SMTP_USER/SMTP_PASS must be set.',
      });
    }

    if (hasLegacyUser && !value['SMTP_HOST'] && !value['MAIL_HOST']) {
      return helpers.error('any.custom', {
        message:
          'SMTP_HOST is required when using legacy SMTP_USER/SMTP_PASS settings.',
      });
    }

    if (
      !value['MAIL_FROM'] &&
      !value['EMAIL_FROM_ADDRESS'] &&
      !value['MAIL_USER'] &&
      !value['SMTP_USER']
    ) {
      return helpers.error('any.custom', {
        message:
          'Set MAIL_FROM, EMAIL_FROM_ADDRESS, or an email transport user for the sender address.',
      });
    }

    const hasCloudinaryCloudName = Boolean(value['CLOUDINARY_CLOUD_NAME']);
    const hasCloudinaryApiKey = Boolean(value['CLOUDINARY_API_KEY']);
    const hasCloudinaryApiSecret = Boolean(value['CLOUDINARY_API_SECRET']);
    const configuredCloudinaryValues = [
      hasCloudinaryCloudName,
      hasCloudinaryApiKey,
      hasCloudinaryApiSecret,
    ].filter(Boolean).length;

    if (configuredCloudinaryValues > 0 && configuredCloudinaryValues < 3) {
      return helpers.error('any.custom', {
        message:
          'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be provided together.',
      });
    }

    return value;
  })
  .messages({
    'any.custom': '{{#message}}',
  });

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { error, value } = envSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  }) as { error?: Joi.ValidationError; value: Record<string, unknown> };

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value;
}
