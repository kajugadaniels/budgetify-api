import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { InvitePartnerRequestDto } from './dto/invite-partner.request.dto';
import { AcceptInviteRequestDto } from './dto/accept-invite.request.dto';
import { InviteInfoResponseDto } from './dto/invite-info.response.dto';
import {
  PartnershipResponseDto,
  PartnerUserDto,
} from './dto/partnership-response.dto';
import {
  PartnershipsRepository,
  PartnershipWithUsers,
} from './partnerships.repository';

const INVITE_EXPIRES_DAYS = 7;

@Injectable()
export class PartnershipsService {
  constructor(
    private readonly partnershipsRepository: PartnershipsRepository,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async getMyPartnership(
    userId: string,
  ): Promise<PartnershipResponseDto | null> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const partnership =
      (await this.partnershipsRepository.findActiveByUserId(userId)) ??
      (await this.partnershipsRepository.findPendingWithUsersByOwnerId(userId));

    if (!partnership) return null;

    return this.toPartnershipResponse(partnership, userId);
  }

  async invitePartner(
    userId: string,
    payload: InvitePartnerRequestDto,
    frontendUrl: string,
    mobileAppInviteUrl: string,
  ): Promise<PartnershipResponseDto> {
    const owner = await this.usersService.findActiveByIdOrThrow(userId);

    if (owner.email.toLowerCase() === payload.email.toLowerCase()) {
      throw new BadRequestException('You cannot invite yourself.');
    }

    const existing =
      await this.partnershipsRepository.findAnyActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException(
        'You already have an active or pending partnership. Remove it before sending a new invitation.',
      );
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.partnershipsRepository.create({
      ownerId: userId,
      inviteeEmail: payload.email.toLowerCase(),
      tokenHash,
      expiresAt,
    });

    const ownerName = owner.fullName ?? owner.firstName ?? null;
    const acceptUrl = `${frontendUrl}/partnership/accept?token=${rawToken}`;
    const appAcceptUrl = this.appendTokenToUrl(mobileAppInviteUrl, rawToken);

    await this.emailService.sendPartnershipInviteEmail(
      payload.email.toLowerCase(),
      ownerName,
      appAcceptUrl,
      acceptUrl,
    );

    const partnershipWithUsers =
      await this.partnershipsRepository.findByTokenHash(tokenHash);

    return this.toPartnershipResponse(partnershipWithUsers!, userId);
  }

  async getInviteInfo(rawToken: string): Promise<InviteInfoResponseDto> {
    const tokenHash = this.hashToken(rawToken);
    const partnership =
      await this.partnershipsRepository.findByTokenHash(tokenHash);

    if (!partnership) {
      throw new NotFoundException(
        'Invitation not found or has already been used.',
      );
    }

    if (new Date() > partnership.expiresAt) {
      throw new BadRequestException('This invitation has expired.');
    }

    return {
      partnershipId: partnership.id,
      inviteeEmail: partnership.inviteeEmail,
      ownerFirstName: partnership.owner.firstName,
      ownerLastName: partnership.owner.lastName,
      ownerFullName: partnership.owner.fullName,
      ownerAvatarUrl: partnership.owner.avatarUrl,
      expiresAt: partnership.expiresAt,
    };
  }

  async acceptInvite(
    userId: string,
    payload: AcceptInviteRequestDto,
  ): Promise<PartnershipResponseDto> {
    const user = await this.usersService.findActiveByIdOrThrow(userId);
    const tokenHash = this.hashToken(payload.token);
    const partnership =
      await this.partnershipsRepository.findByTokenHash(tokenHash);

    if (!partnership) {
      throw new NotFoundException(
        'Invitation not found or has already been used.',
      );
    }

    if (new Date() > partnership.expiresAt) {
      throw new BadRequestException('This invitation has expired.');
    }

    if (partnership.ownerId === userId) {
      throw new BadRequestException('You cannot accept your own invitation.');
    }

    if (user.email.toLowerCase() !== partnership.inviteeEmail) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address.',
      );
    }

    const existingForInvitee =
      await this.partnershipsRepository.findAnyActiveByUserId(userId);
    if (existingForInvitee) {
      throw new BadRequestException(
        'You already have an active or pending partnership.',
      );
    }

    await this.partnershipsRepository.clearRevokedPartnerLocks(userId);
    await this.partnershipsRepository.accept(partnership.id, userId);

    const accepted =
      await this.partnershipsRepository.findActiveByUserId(userId);
    return this.toPartnershipResponse(accepted!, userId);
  }

  async removeMine(userId: string): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const partnership =
      await this.partnershipsRepository.findActiveByUserId(userId);

    if (!partnership) {
      throw new NotFoundException('You do not have an active partnership.');
    }

    if (partnership.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the person who sent the invitation can remove the partnership.',
      );
    }

    await this.partnershipsRepository.revoke(partnership.id);
  }

  async cancelPendingInvite(userId: string): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const pending =
      await this.partnershipsRepository.findPendingByOwnerId(userId);

    if (!pending) {
      throw new NotFoundException('No pending invitation found.');
    }

    await this.partnershipsRepository.revoke(pending.id);
  }

  /**
   * Returns the list of user IDs whose financial records are visible to the
   * given user — their own ID plus their accepted partner's ID if one exists.
   */
  async getVisibleUserIds(userId: string): Promise<string[]> {
    const partnership =
      await this.partnershipsRepository.findActiveByUserId(userId);

    if (!partnership) return [userId];

    const partnerId =
      partnership.ownerId === userId
        ? partnership.partnerId
        : partnership.ownerId;

    if (!partnerId) return [userId];

    return [userId, partnerId];
  }

  private toPartnershipResponse(
    partnership: PartnershipWithUsers,
    currentUserId: string,
  ): PartnershipResponseDto {
    return {
      id: partnership.id,
      status: partnership.status,
      inviteeEmail: partnership.inviteeEmail,
      isOwner: partnership.ownerId === currentUserId,
      owner: this.toPartnerUserDto(partnership.owner),
      partner: partnership.partner
        ? this.toPartnerUserDto(partnership.partner)
        : null,
      expiresAt: partnership.expiresAt,
      createdAt: partnership.createdAt,
    };
  }

  private toPartnerUserDto(
    user: PartnershipWithUsers['owner'],
  ): PartnerUserDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private appendTokenToUrl(baseUrl: string, rawToken: string): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${rawToken}`;
  }
}
