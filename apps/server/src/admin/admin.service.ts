import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import {
  Events,
  type AdminChatMessage,
  type AdminUsersPage,
  type BanInfo,
  type BanInput,
  type BanRecord,
  type Role,
} from '@cc/shared';
import { PrismaService } from '../prisma.service';
import { activeBanWhere, toBanInfo, toMe, toPublicUser } from '../common/mappers';
import { GameService } from '../game/game.service';
import { toChatDto } from '../game/chat.service';

const PAGE_SIZE = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly game: GameService,
  ) {}

  async users(q: { page: number; search?: string; banned?: 'true' | 'false' }): Promise<AdminUsersPage> {
    const where: Prisma.UserWhereInput = {};
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.banned === 'true') where.bans = { some: activeBanWhere() };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          bans: { where: activeBanWhere(), orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { gamesAsX: true, gamesAsO: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map(({ bans, _count, ...u }) => ({
        ...toMe(u),
        activeBan: bans[0] ? toBanInfo(bans[0]) : null,
        gamesPlayed: _count.gamesAsX + _count.gamesAsO,
      })),
      total,
      page: q.page,
      pageSize: PAGE_SIZE,
    };
  }

  async setRole(admin: User, userId: string, role: Role) {
    if (userId === admin.id) throw new BadRequestException('You cannot change your own role');
    await this.getUser(userId);
    await this.prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async banHistory(userId: string): Promise<BanRecord[]> {
    const rows = await this.prisma.ban.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { admin: true },
    });
    return rows.map((b) => ({
      id: b.id,
      reason: b.reason,
      admin: toPublicUser(b.admin),
      createdAt: b.createdAt.toISOString(),
      expiresAt: b.expiresAt?.toISOString() ?? null,
      revokedAt: b.revokedAt?.toISOString() ?? null,
    }));
  }

  async ban(admin: User, userId: string, input: BanInput): Promise<BanInfo> {
    if (userId === admin.id) throw new BadRequestException('You cannot ban yourself');
    const target = await this.getUser(userId);
    if (target.role === 'ADMIN') throw new BadRequestException('Admins cannot be banned — remove the admin role first');

    const expiresAt = input.durationDays ? new Date(Date.now() + input.durationDays * DAY_MS) : null;
    const ban = await this.prisma.$transaction(async (tx) => {
      // Only one active ban at a time: a new ban replaces the current one.
      await tx.ban.updateMany({ where: { userId, ...activeBanWhere() }, data: { revokedAt: new Date() } });
      return tx.ban.create({ data: { userId, adminId: admin.id, reason: input.reason, expiresAt } });
    });
    const info = toBanInfo(ban);
    this.game.kickUser(userId, info);
    return info;
  }

  async unban(userId: string) {
    await this.getUser(userId);
    await this.prisma.ban.updateMany({ where: { userId, ...activeBanWhere() }, data: { revokedAt: new Date() } });
  }

  closeRoom(roomId: string) {
    if (!this.game.closeRoom(roomId, 'closed')) throw new NotFoundException('Room not found or already closed');
  }

  async messages(page: number): Promise<AdminChatMessage[]> {
    const rows = await this.prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 100,
      take: 100,
      include: { user: true, room: { select: { name: true } } },
    });
    return rows.map((m) => ({ ...toChatDto(m), roomName: m.room.name }));
  }

  async deleteMessage(id: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.prisma.chatMessage.delete({ where: { id } });
    this.game.emitToRoom(msg.roomId, Events.ChatDeleted, { id });
  }

  private async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
