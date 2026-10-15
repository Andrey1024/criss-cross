import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { GameDetail, GameHistoryPage, Mark, Outcome } from '@cc/shared';
import { PrismaService } from '../prisma.service';
import { toPublicUser } from '../common/mappers';

const PAGE_SIZE = 20;

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string, page: number): Promise<GameHistoryPage> {
    const where: Prisma.GameWhereInput = { result: { not: null }, OR: [{ xPlayerId: userId }, { oPlayerId: userId }] };
    const [rows, played, wins, losses, draws] = await Promise.all([
      this.prisma.game.findMany({
        where,
        orderBy: { endedAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { room: { select: { name: true } }, xPlayer: true, oPlayer: true, _count: { select: { moves: true } } },
      }),
      this.prisma.game.count({ where }),
      this.prisma.game.count({ where: { ...where, winnerId: userId } }),
      this.prisma.game.count({ where: { ...where, winnerId: { not: null }, NOT: { winnerId: userId } } }),
      this.prisma.game.count({ where: { ...where, result: 'DRAW' } }),
    ]);

    return {
      items: rows.map((g) => {
        const myMark: Mark = g.xPlayerId === userId ? 'X' : 'O';
        const outcome: Outcome =
          g.winnerId === userId ? 'win' : g.winnerId ? 'loss' : g.result === 'DRAW' ? 'draw' : 'none';
        return {
          id: g.id,
          roomName: g.room.name,
          opponent: toPublicUser(myMark === 'X' ? g.oPlayer : g.xPlayer),
          myMark,
          outcome,
          result: g.result!,
          moveCount: g._count.moves,
          ratingDiff: g.rated ? (myMark === 'X' ? g.xRatingDiff : g.oRatingDiff) : null,
          startedAt: g.startedAt.toISOString(),
          endedAt: (g.endedAt ?? g.startedAt).toISOString(),
        };
      }),
      total: played,
      page,
      pageSize: PAGE_SIZE,
      stats: { played, wins, losses, draws },
    };
  }

  async detail(gameId: string): Promise<GameDetail> {
    const g = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: { select: { name: true, boardSize: true } },
        xPlayer: true,
        oPlayer: true,
        moves: { orderBy: { moveNumber: 'asc' } },
      },
    });
    if (!g) throw new NotFoundException('Game not found');
    return {
      id: g.id,
      roomName: g.room.name,
      boardSize: g.room.boardSize,
      players: { X: toPublicUser(g.xPlayer), O: toPublicUser(g.oPlayer) },
      winner: g.winnerId === g.xPlayerId ? 'X' : g.winnerId === g.oPlayerId ? 'O' : null,
      result: g.result,
      startedAt: g.startedAt.toISOString(),
      endedAt: g.endedAt?.toISOString() ?? null,
      moves: g.moves.map((m) => ({ x: m.x, y: m.y, mark: m.playerId === g.xPlayerId ? 'X' : 'O' })),
    };
  }
}
