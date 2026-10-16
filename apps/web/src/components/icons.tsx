import type { ReactNode } from 'react';

/** 24px stroke icons for navigation; colour follows the text colour. */
function Icon({ children, className = 'h-6 w-6' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </Icon>
);

export const ComputerIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5" />
  </Icon>
);

export const TrophyIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M8 21h8M12 16v5" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 5.5h2.5A1.5 1.5 0 0 1 21 7c0 2.2-1.8 4-4 4M7 5.5H4.5A1.5 1.5 0 0 0 3 7c0 2.2 1.8 4 4 4" />
  </Icon>
);

export const HistoryIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
    <path d="M3.5 3.5v5h5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const BookIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2Z" />
    <path d="M4 19a2 2 0 0 0 2 2h14v-4" />
  </Icon>
);
