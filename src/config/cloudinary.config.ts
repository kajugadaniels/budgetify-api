import { registerAs } from '@nestjs/config';

function firstDefined(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '');
}

export const cloudinaryConfig = registerAs('cloudinary', () => ({
  cloudName: firstDefined(process.env.CLOUDINARY_CLOUD_NAME) ?? '',
  apiKey: firstDefined(process.env.CLOUDINARY_API_KEY) ?? '',
  apiSecret: firstDefined(process.env.CLOUDINARY_API_SECRET) ?? '',
  todoFolder: firstDefined(process.env.CLOUDINARY_TODO_FOLDER) ?? 'todos',
}));
