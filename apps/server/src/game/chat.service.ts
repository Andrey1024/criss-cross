import { Injectable } from '@nestjs/common';
import type { ChatMessage, User } from '@prisma/client';
import type { ChatMessageDto, PublicUser } from '@cc/shared';
import { PrismaService } from '../prisma.service';
import { toPublicUser } from '../common/mappers';

const HISTORY_SIZE = 50;
const RATE_WINDOW_MS = 5_000;
const RATE_MAX_MESSAGES = 5;

export function toChatDto(m: ChatMessage & { user: User }): ChatMessageDto {
  return { id: m.id, roomId: m.roomId, user: toPublicUser(m.user), text: m.text, createdAt: m.createdAt.toISOString() };
}

@Injectable()
export class ChatService {
  private readonly sent = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  async history(roomId: string): Promise<ChatMessageDto[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_SIZE,
      include: { user: true },
    });
    return rows.reverse().map(toChatDto);
  }

  /** Sliding-window rate limit: at most RATE_MAX_MESSAGES per RATE_WINDOW_MS per user. */
  allow(userId: string, now = Date.now()): boolean {
    const recent = (this.sent.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX_MESSAGES) {
      this.sent.set(userId, recent);
      return false;
    }
    recent.push(now);
    this.sent.set(userId, recent);
    return true;
  }

  async send(user: PublicUser, roomId: string, text: string): Promise<ChatMessageDto> {
    const row = await this.prisma.chatMessage.create({
      data: { roomId, userId: user.id, text },
      include: { user: true },
    });
    return toChatDto(row);
  }
}
