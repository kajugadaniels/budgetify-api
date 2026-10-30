import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type {
  AuthenticatedShortcutCredential,
  ShortcutImportRequest,
} from './shortcut-import-auth.types';

export const ShortcutCredential = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedShortcutCredential => {
    const request = context.switchToHttp().getRequest<ShortcutImportRequest>();

    return request.shortcutCredential;
  },
);
