import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

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

  // ── SMTP / Email delivery ────────────────────────────────────────────────────
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  EMAIL_FROM_NAME: Joi.string().default('Budgetify'),
  EMAIL_FROM_ADDRESS: Joi.string().email().required(),
})
  .custom((value: Record<string, unknown>, helpers) => {
    if (!value['GOOGLE_CLIENT_ID'] && !value['GOOGLE_CLIENT_IDS']) {
      return helpers.error('any.custom', {
        message: 'Either GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS must be set.',
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
