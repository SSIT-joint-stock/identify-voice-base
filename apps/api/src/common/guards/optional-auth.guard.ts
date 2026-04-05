// common/guards/optional-auth.guard.ts
import { IS_OPTIONAL_AUTH_KEY } from '@/common/decorators/option-auth.decorator';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenService } from '../../module/auth/service/auth-token.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: AuthTokenService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Route không có @OptionalAuth() → guard này không làm gì
    if (!isOptional) return true;

    const request = context.switchToHttp().getRequest();

    // Extract guestId from cookies if present
    request.guestId = request.cookies?.['guest_id'] || null;

    const authHeader = request.headers.authorization;

    // Không có token → guest, vẫn cho qua
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.user = null;
      return true;
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      request.user = payload.payload;
    } catch {
      // Token invalid/expired → vẫn cho qua như guest
      request.user = null;
    }

    return true;
  }
}
