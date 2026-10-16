import React from 'react';
import { RankTier } from '@pdi/shared';
import { ShieldCheck, Award, Sparkles, Star } from 'lucide-react';

interface StaffBadgeProps {
  tier?: RankTier;
  designation?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const staffTierConfig: Record<
  RankTier,
  {
    bg: string;
    text: string;
    border: string;
    glow: string;
    pillBg: string;
    defaultDesignation: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  ED: {
    bg: 'bg-slate-900/90',
    text: 'text-slate-300',
    border: 'border-slate-600',
    glow: 'shadow-slate-500/20',
    pillBg: 'bg-slate-800',
    defaultDesignation: 'Junior Reviewer',
    icon: Award,
  },
  C: {
    bg: 'bg-teal-950/90',
    text: 'text-cyan-300',
    border: 'border-cyan-500/60',
    glow: 'shadow-cyan-500/20',
    pillBg: 'bg-cyan-900/40',
    defaultDesignation: 'Associate Director',
    icon: Award,
  },
  B: {
    bg: 'bg-indigo-950/90',
    text: 'text-indigo-300',
    border: 'border-indigo-500/60',
    glow: 'shadow-indigo-500/30',
    pillBg: 'bg-indigo-900/40',
    defaultDesignation: 'Casting Director',
    icon: Star,
  },
  A: {
    bg: 'bg-amber-950/90',
    text: 'text-amber-300',
    border: 'border-amber-400/70',
    glow: 'shadow-amber-400/30',
    pillBg: 'bg-amber-900/40',
    defaultDesignation: 'Senior Director',
    icon: Sparkles,
  },
  S: {
    bg: 'bg-rose-950/90',
    text: 'text-rose-300',
    border: 'border-rose-500/80',
    glow: 'shadow-rose-500/40',
    pillBg: 'bg-rose-900/50',
    defaultDesignation: 'Lead Executive Director',
    icon: ShieldCheck,
  },
};

export const StaffBadge: React.FC<StaffBadgeProps> = ({
  tier = 'ED',
  designation,
  size = 'md',
  showIcon = true,
}) => {
  const cfg = staffTierConfig[tier] || staffTierConfig.ED;
  const displayTitle = designation || cfg.defaultDesignation;
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs md:text-sm font-medium',
    lg: 'px-4 py-1.5 text-sm md:text-base font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-heading shadow-md transition-all ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.glow} ${sizeClasses}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 opacity-90 text-current flex-shrink-0" />}
      <span className={`px-1.5 py-0.2 rounded text-[10px] tracking-wider font-bold uppercase ${cfg.pillBg} border border-current/20`}>
        Tier {tier}
      </span>
      <span className="tracking-wide">{displayTitle}</span>
    </span>
  );
};
