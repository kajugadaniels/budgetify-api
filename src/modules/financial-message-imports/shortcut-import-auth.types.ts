import type { Request } from 'express';

export interface AuthenticatedShortcutCredential {
  id: string;
  userId: string;
}

export interface ShortcutImportRequest extends Request {
  shortcutCredential: AuthenticatedShortcutCredential;
}
