import type { BanInfo, EndReason, GameResult, Outcome } from '@cc/shared';
import { currentLocale, currentMessages } from '../i18n';

// Dates and labels follow the language of the page being rendered.
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const formatDate = (iso: string) => new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(new Date(iso));
export const formatTime = (iso: string) => new Intl.DateTimeFormat(currentLocale(), { timeStyle: 'short' }).format(new Date(iso));

export function banUntil(ban: BanInfo): string {
  const t = currentMessages().banned;
  return ban.expiresAt ? t.untilDate(formatDateTime(ban.expiresAt)) : t.permanently;
}

export const outcomeLabel = (o: Outcome) => currentMessages().outcome[o];
export const resultLabel = (r: GameResult) => currentMessages().result[r];
export const endReasonLabel = (r: EndReason) => currentMessages().endReason[r];
export const errorText = (code: string) => currentMessages().errors[code] ?? code;
