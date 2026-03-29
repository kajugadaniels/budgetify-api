export const AUTH_ROUTES = {
  base: 'auth',
  google: 'google',
  refresh: 'refresh',
  logout: 'logout',
  me: 'me',
  email: {
    initiate: 'email/initiate',
    verify: 'email/verify',
  },
} as const;
