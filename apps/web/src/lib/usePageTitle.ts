import { useEffect } from 'react';

/** Keeps document.title in sync during client-side navigation. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
