import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const GuestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.guestId;
  },
);
