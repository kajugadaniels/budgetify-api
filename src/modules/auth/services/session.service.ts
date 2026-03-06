import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Session, User, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { RequestMetadata } from '../../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { JwtRefreshPayload } from '../interfaces/jwt-refresh-payload.interface';
import { TokenPair } from '../interfaces/token-pair.interface';
import { TokenService } from './token.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;
type SessionWithUser = Prisma.SessionGetPayload<{ include: { user: true } }>;

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async createAuthenticatedSession(params: {
    user: User;
    metadata: RequestMetadata;
    db?: Prisma.TransactionClient;
  }): Promise<TokenPair> {
    const db = params.db ?? this.prisma;
    const sessionId = randomUUID();
    const tokenPair = await this.tokenService.createTokenPair(
      {
        userId: params.user.id,
        email: params.user.email,
      },
      sessionId,
    );

    await db.session.create({
      data: {
        id: sessionId,
        userId: params.user.id,
        refreshTokenHash: this.tokenService.hashRefreshToken(
          tokenPair.refreshToken,
        ),
        userAgent: params.metadata.userAgent,
        ipAddress: params.metadata.ipAddress,
        expiresAt: tokenPair.refreshTokenExpiresAt,
      },
    });

    return tokenPair;
  }

  async rotateRefreshToken(
    payload: JwtRefreshPayload,
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<{ user: User; tokens: TokenPair }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      this.assertSessionCanRefresh(session, payload.sub, refreshToken);
      this.assertUserIsAvailable(session.user);

      await tx.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
        },
      });

      const tokens = await this.createAuthenticatedSession({
        user: session.user,
        metadata,
        db: tx,
      });

      return {
        user: session.user,
        tokens,
      };
    });
  }

  async revokeRefreshToken(
    payload: JwtRefreshPayload,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        !this.tokenService.matchesRefreshToken(
          refreshToken,
          session.refreshTokenHash,
        )
      ) {
        return;
      }

      await tx.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
        },
      });
    });
  }

  private assertSessionCanRefresh(
    session: SessionWithUser | null,
    userId: string,
    refreshToken: string,
  ): asserts session is SessionWithUser {
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh session has been revoked.');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session has expired.');
    }

    if (
      !this.tokenService.matchesRefreshToken(
        refreshToken,
        session.refreshTokenHash,
      )
    ) {
      throw new UnauthorizedException('Refresh token does not match session.');
    }
  }

  private assertUserIsAvailable(user: User): void {
    if (user.deletedAt) {
      throw new ForbiddenException('User account is no longer available.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not active.');
    }
  }
}
