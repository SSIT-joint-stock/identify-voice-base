import { resolveAccountPermissions } from '@/common/auth/permissions';
import { Injectable } from '@nestjs/common';

import { UnauthorizedError } from '@/common/response';
import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { AuthTokenService } from '../service/auth-token.service';
import { UserStatus } from '@prisma/client';

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class RefreshTokenUseCase implements BaseUseCase<
  string,
  RefreshTokenResponse
> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: AuthTokenService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshTokenResponse> {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is missing');
    }

    try {
      // 1. Verify the refresh token
      const decoded = this.tokenService.verifyRefreshToken(refreshToken);

      // 2. Find user and check if token matches
      const user = await this.prismaService.auth_accounts.findUnique({
        where: { id: decoded.payload.id || decoded.payload.id },
      });

      if (!user) {
        throw new UnauthorizedError(
          'Invalid or expired refresh token.',
        ).addDetails({
          reason: 'User not found',
        });
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedError('Tài khoản đã bị khóa');
      }

      if (user.refresh_token !== refreshToken) {
        throw new UnauthorizedError(
          'Invalid or expired refresh token.',
        ).addDetails({
          reason: 'Token mismatch in database',
        });
      }

      // 3. Generate new token pair
      const payload = {
        id: user.id,
        email: user.email,
        username: user.username || '',
        role: user.role,
        status: user.status,
        permissions: resolveAccountPermissions(user),
      };
      const { access_token, refresh_token } =
        this.tokenService.generateTokenPair(payload);

      // 4. Update refresh token in database
      await this.prismaService.auth_accounts.update({
        where: { id: user.id },
        data: { refresh_token: refresh_token },
      });

      return {
        access_token,
        refresh_token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }
}
