import { Reflector } from '@nestjs/core';
import type { AppPermission } from '@/common/auth/permissions';

export const Permissions = Reflector.createDecorator<AppPermission[]>();
