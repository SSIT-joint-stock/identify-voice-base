import { resolveAccountPermissions } from '@/common/auth/permissions';
import { IS_OPTIONAL_AUTH_KEY } from '@/common/decorators/option-auth.decorator';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { UnauthorizedError } from '@/common/response';
import { PrismaService } from '@/database/prisma/prisma.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { AuthTokenService } from '../../module/auth/service/auth-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: AuthTokenService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // check if is public endpoint
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Nếu route dùng @OptionalAuth() → skip JwtAuthGuard, để OptionalAuthGuard xử lý
    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptional) return true;

    const request = context.switchToHttp().getRequest();

    // get token form header Authorization
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(
        'Access token not found in Authorization header',
      );
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      const account = await this.prisma.auth_accounts.findUnique({
        where: { id: payload.payload.id },
      });

      if (!account || account.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedError('Tài khoản không hợp lệ hoặc đã bị khóa');
      }

      request.user = {
        ...account,
        permissions: resolveAccountPermissions(account),
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new UnauthorizedError('Invalid or expired access token').addDetails(
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}
