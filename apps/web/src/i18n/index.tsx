// Languages. English lives at the site root, every other language mirrors the whole site under
// its own prefix (/ru, /ru/rules, /ru/room/…), so search engines see separate pages and shared
// links keep their language. The language always comes from the URL.
import { createContext, forwardRef, useContext, type ComponentProps } from 'react';
import {
  Link as RouterLink,
  Navigate as RouterNavigate,
  NavLink as RouterNavLink,
  useNavigate as useRouterNavigate,
  type NavigateOptions,
  type To,
} from 'react-router';
import { en, type Messages } from './en';
import { ru } from './ru';

export const LANGS = ['en', 'ru'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export const MESSAGES: Record<Lang, Messages> = { en, ru };
/** BCP 47 tags for Intl formatting and <html lang>. */
export const LOCALE: Record<Lang, string> = { en: 'en', ru: 'ru-RU' };
/** Each language's name in that language, for the switcher. */
export const LANG_NAME: Record<Lang, string> = { en: 'English', ru: 'Русский' };

const PREFIXED = new RegExp(`^/(${LANGS.filter((l) => l !== DEFAULT_LANG).join('|')})(?=[/?#]|$)`);

/** The language a path belongs to. */
export function langFromPath(path: string): Lang {
  return (PREFIXED.exec(path)?.[1] as Lang | undefined) ?? DEFAULT_LANG;
}

/** The path without its language prefix: /ru/rules -> /rules, /ru -> /. */
export function stripLang(path: string): string {
  const stripped = path.replace(PREFIXED, '');
  return stripped === '' || stripped.startsWith('?') || stripped.startsWith('#') ? `/${stripped}` : stripped;
}

/** An app path in `lang`. Paths that already carry a language prefix are left alone. */
export function localizePath(path: string, lang: Lang): string {
  if (!path.startsWith('/') || PREFIXED.test(path)) return path;
  if (lang === DEFAULT_LANG) return path;
  return `/${lang}${path === '/' ? '' : path.startsWith('/?') || path.startsWith('/#') ? path.slice(1) : path}`;
}

const LangContext = createContext<Lang>(DEFAULT_LANG);
export const LangProvider = LangContext.Provider;

// Non-component helpers (date formatting, error labels) read the language of the current render.
// The whole tree re-renders under the new value whenever the URL's language changes.
let currentLang: Lang = DEFAULT_LANG;
export function setCurrentLang(lang: Lang) {
  currentLang = lang;
}
export const currentMessages = (): Messages => MESSAGES[currentLang];
export const currentLocale = (): string => LOCALE[currentLang];

export function useLang(): Lang {
  return useContext(LangContext);
}

/** The current language's messages. */
export function useT(): Messages {
  return MESSAGES[useContext(LangContext)];
}

/** Turns an app path into the current language's URL. */
export function useLocalize(): (path: string) => string {
  const lang = useContext(LangContext);
  return (path) => localizePath(path, lang);
}

function localizeTo(to: To, lang: Lang): To {
  return typeof to === 'string' ? localizePath(to, lang) : to;
}

// Drop-in replacements for React Router's link components that keep the current language.
export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof RouterLink>>(function Link({ to, ...props }, ref) {
  return <RouterLink ref={ref} to={localizeTo(to, useLang())} {...props} />;
});

export const NavLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof RouterNavLink>>(function NavLink({ to, ...props }, ref) {
  return <RouterNavLink ref={ref} to={localizeTo(to, useLang())} {...props} />;
});

export function Navigate({ to, ...props }: ComponentProps<typeof RouterNavigate>) {
  return <RouterNavigate to={localizeTo(to, useLang())} {...props} />;
}

export function useNavigate() {
  const navigate = useRouterNavigate();
  const lang = useLang();
  return (to: To, options?: NavigateOptions) => navigate(localizeTo(to, lang), options);
}

const LANG_KEY = 'lang';

/** The language the visitor picked with the switcher, if any. */
export function savedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return (LANGS as readonly string[]).includes(v ?? '') ? (v as Lang) : null;
  } catch {
    return null;
  }
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Not important if it can't be remembered.
  }
}

export { ruPlural } from './plural';
