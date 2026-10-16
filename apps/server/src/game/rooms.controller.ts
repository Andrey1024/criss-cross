import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import {
  createRoomSchema,
  GUEST_COOKIE,
  guestJoinSchema,
  type CreateRoomInput,
  type GuestJoinInput,
  type LobbyRoom,
  type PublicUser,
  type RoomInvite,
} from '@cc/shared';
import { AuthService, GUEST_TOKEN_TTL_SECONDS } from '../auth/auth.service';
import { CurrentUser, Public } from '../auth/decorators';
import { config } from '../config';
import { toPublicUser } from '../common/mappers';
import { ZodPipe } from '../common/zod.pipe';
import { GameService } from './game.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly game: GameService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(): LobbyRoom[] {
    return this.game.lobbyRooms();
  }

  @Post()
  create(@CurrentUser() user: User, @Body(new ZodPipe(createRoomSchema)) body: CreateRoomInput): Promise<LobbyRoom> {
    return this.game.createRoom(toPublicUser(user), body.name, body.unrated);
  }

  /** What an invite link shows before joining, so a signed-out visitor can join an unrated room. */
  @Public()
  @Get(':id/invite')
  invite(@Param('id') id: string): RoomInvite {
    const invite = this.game.invite(id);
    if (!invite) throw new NotFoundException('Room not found');
    return invite;
  }

  /**
   * Joins an unrated room as a guest with just a display name. Guests can only be created
   * through a live unrated room's link; an existing guest is renamed instead.
   */
  @Public()
  @Post(':id/guest')
  @HttpCode(200)
  async joinAsGuest(
    @Param('id') id: string,
    @Body(new ZodPipe(guestJoinSchema)) body: GuestJoinInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    if (!this.game.invite(id)?.unrated) throw new NotFoundException('Room not found');
    const guest = await this.auth.joinAsGuest(req.cookies?.[GUEST_COOKIE], body);
    res.cookie(GUEST_COOKIE, this.auth.signGuestToken(guest), {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: GUEST_TOKEN_TTL_SECONDS * 1000,
      path: '/',
    });
    return toPublicUser(guest);
  }
}
