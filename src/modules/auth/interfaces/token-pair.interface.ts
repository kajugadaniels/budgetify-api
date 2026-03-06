import { TokenType } from '../../../common/enums/token-type.enum';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: TokenType;
  refreshTokenExpiresAt: Date;
}
