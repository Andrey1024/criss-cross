import { useSyncExternalStore } from 'react';

// Light/dark theme. The class on <html> is first set by an inline script in index.html, before
// the first paint; this module switches it and remembers an explicit choice.
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#151e2e' };

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  window.dispatchEvent(new Event('themechange'));
}

/** Switches theme and remembers the choice, so it no longer follows the system setting. */
export function setTheme(theme: Theme) {
  apply(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (e.g. private mode): the choice lasts for this page only.
  }
}

/** Until the visitor picks a theme, follow the system setting as it changes. */
export function followSystemTheme() {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Ignore: treat as no saved choice.
    }
    if (!saved) apply(e.matches ? 'dark' : 'light');
  });
}

function subscribe(onChange: () => void) {
  window.addEventListener('themechange', onChange);
  return () => window.removeEventListener('themechange', onChange);
}

/** The current theme; 'light' while pre-rendering. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light');
}
