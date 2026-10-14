import React from 'react';
import { RankTier } from '@pdi/shared';

interface RankBadgeProps {
  rank?: RankTier;
  tier?: RankTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}


const rankConfig: Record<RankTier, { bg: string; text: string; border: string; glow: string; label: string }> = {
  ED: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-500',
    glow: 'shadow-slate-500/20',
    label: 'ED Rank',
  },
  C: {
    bg: 'bg-sky-950/80',
    text: 'text-sky-300',
    border: 'border-sky-500',
    glow: 'shadow-sky-500/20',
    label: 'C Rank',
  },
  B: {
    bg: 'bg-blue-950/80',
    text: 'text-blue-400',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
    label: 'B Rank',
  },
  A: {
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-400',
    glow: 'shadow-amber-400/30',
    label: 'A Rank',
  },
  S: {
    bg: 'bg-rose-950/80',
    text: 'text-rose-400',
    border: 'border-rose-500',
    glow: 'shadow-rose-500/40',
    label: 'S Rank',
  },
};

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, tier, size = 'md', showLabel = true }) => {
  const effectiveRank = tier || rank || 'ED';
  const cfg = rankConfig[effectiveRank] || rankConfig.ED;


  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm font-semibold tracking-wider',
    lg: 'px-5 py-2 text-base font-bold tracking-widest',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-heading uppercase shadow-md transition-all ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.glow} ${sizeClasses}`}
    >
      <span className="w-2 h-2 rounded-full bg-current animate-pulse opacity-80" />
      <span>{showLabel ? cfg.label : rank}</span>
    </span>
  );
};
