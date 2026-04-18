import { hasPermission } from '@/common/auth/permissions';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { ForbiddenError } from '@/common/response';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride(Permissions, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenError('User not found in request');
    }

    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      hasPermission(user, permission),
    );

    if (!hasRequiredPermissions) {
      throw new ForbiddenError('Access denied.');
    }

    return true;
  }
}
