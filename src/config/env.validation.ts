import * as Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .required(),
  DIRECT_DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .optional(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_IDS: Joi.string().optional(),
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
