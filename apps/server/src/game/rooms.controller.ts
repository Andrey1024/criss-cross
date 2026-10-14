import { Body, Controller, Get, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { createRoomSchema, type LobbyRoom } from '@cc/shared';
import { CurrentUser } from '../auth/decorators';
import { toPublicUser } from '../common/mappers';
import { ZodPipe } from '../common/zod.pipe';
import { GameService } from './game.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly game: GameService) {}

  @Get()
  list(): LobbyRoom[] {
    return this.game.lobbyRooms();
  }

  @Post()
  create(@CurrentUser() user: User, @Body(new ZodPipe(createRoomSchema)) body: { name: string }): Promise<LobbyRoom> {
    return this.game.createRoom(toPublicUser(user), body.name);
  }
}
