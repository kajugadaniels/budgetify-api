export interface JwtAccessPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: 'access';
}
