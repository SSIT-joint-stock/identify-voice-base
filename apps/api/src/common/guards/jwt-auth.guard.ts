import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { UnauthorizedError } from '@/common/response';
import { AuthTokenService } from '../../module/auth/service/auth-token.service';
import { IS_OPTIONAL_AUTH_KEY } from '@/common/decorators/option-auth.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: AuthTokenService,
    private readonly reflector: Reflector, // ← Inject Reflector để đọc metadata
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

      request.user = payload.payload;

      return true;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired access token').addDetails(
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}
