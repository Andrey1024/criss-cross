import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  adminUsersQuerySchema,
  banSchema,
  pageQuerySchema,
  roleSchema,
  type AdminChatMessage,
  type AdminUsersPage,
  type BanInfo,
  type BanInput,
  type BanRecord,
  type Role,
  type RoomState,
} from '@cc/shared';
import { AdminGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { GameService } from '../game/game.service';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly game: GameService,
  ) {}

  @Get('users')
  users(@Query(new ZodPipe(adminUsersQuerySchema)) q: { page: number; search?: string; banned?: 'true' | 'false' }): Promise<AdminUsersPage> {
    return this.admin.users(q);
  }

  @Patch('users/:id')
  @HttpCode(204)
  setRole(@CurrentUser() me: User, @Param('id') id: string, @Body(new ZodPipe(roleSchema)) body: { role: Role }) {
    return this.admin.setRole(me, id, body.role);
  }

  @Get('users/:id/bans')
  bans(@Param('id') id: string): Promise<BanRecord[]> {
    return this.admin.banHistory(id);
  }

  @Post('users/:id/ban')
  ban(@CurrentUser() me: User, @Param('id') id: string, @Body(new ZodPipe(banSchema)) body: BanInput): Promise<BanInfo> {
    return this.admin.ban(me, id, body);
  }

  @Delete('users/:id/ban')
  @HttpCode(204)
  unban(@Param('id') id: string) {
    return this.admin.unban(id);
  }

  @Get('rooms')
  rooms(): RoomState[] {
    return this.game.allRooms();
  }

  @Delete('rooms/:id')
  @HttpCode(204)
  closeRoom(@Param('id') id: string) {
    this.admin.closeRoom(id);
  }

  @Get('messages')
  messages(@Query(new ZodPipe(pageQuerySchema)) q: { page: number }): Promise<AdminChatMessage[]> {
    return this.admin.messages(q.page);
  }

  @Delete('messages/:id')
  @HttpCode(204)
  deleteMessage(@Param('id') id: string) {
    return this.admin.deleteMessage(id);
  }
}
