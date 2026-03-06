export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
  jti: string;
}
