import type { ReactNode } from 'react';

const tones = {
  primary: 'bg-primary-soft text-primary',
  neutral: 'bg-[#F2F4F7] text-[#475467]',
  warn: 'bg-[#FEF3E2] text-warn-ink',
} as const;

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

const DIFFICULTY_COLOR = { Beginner: '#16A34A', Intermediate: '#D97706', Advanced: '#DC2626' } as const;

export function DifficultyDot({ level }: { level: keyof typeof DIFFICULTY_COLOR }) {
  return <span className="h-2 w-2 rounded-full" style={{ background: DIFFICULTY_COLOR[level] }} />;
}
