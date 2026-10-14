import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AuthController } from './auth/auth.controller';
import { AdminGuard, AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { ChatService } from './game/chat.service';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { RoomsController } from './game/rooms.controller';
import { PrismaService } from './prisma.service';
import { HistoryService } from './users/history.service';
import { MeController } from './users/me.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, RoomsController, MeController, AdminController],
  providers: [
    PrismaService,
    AuthService,
    GameService,
    ChatService,
    GameGateway,
    HistoryService,
    AdminService,
    AdminGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
