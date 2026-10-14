import { ForbiddenException } from '@nestjs/common';
import type { BanInfo } from '@cc/shared';

export class BannedException extends ForbiddenException {
  constructor(readonly ban: BanInfo) {
    super({ statusCode: 403, code: 'BANNED', message: 'Your account is banned', ...ban });
  }
}
