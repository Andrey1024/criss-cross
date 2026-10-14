import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { User } from '@prisma/client';

export const IS_PUBLIC = 'isPublic';
/** Skips the global AuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest().user,
);
