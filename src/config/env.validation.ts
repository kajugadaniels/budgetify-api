import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  CORS_ALLOWED_ORIGINS: Joi.string().trim().optional(),
  MOBILE_APP_INVITE_URL: Joi.string()
    .pattern(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+$/)
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

  // ── Transactional email: Resend ─────────────────────────────────────────────
  RESEND_API_KEY: Joi.string().pattern(/^re_/).required(),
  RESEND_FROM: Joi.string().min(3).required(),

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
