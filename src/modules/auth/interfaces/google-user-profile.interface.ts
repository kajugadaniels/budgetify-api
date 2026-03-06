import { AuthProvider } from '@prisma/client';

export interface GoogleUserProfile {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  isEmailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}
