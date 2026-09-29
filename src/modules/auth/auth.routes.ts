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
  password: {
    status: 'password/status',
    challenge: 'password/challenge',
    verifyChallenge: 'password/challenge/verify',
    set: 'password/set',
    login: 'password/login',
  },
} as const;
