import React from 'react';
import { Link } from 'react-router-dom';
import { RankBadge } from '../components/RankBadge';
import { RANK_TIERS, AWARDS_CATALOG } from '@pdi/shared';
import { 
  Mic2, 
  Upload, 
  Award, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-pdi-surface to-pdi-bg border border-pdi-border p-8 md:p-14 text-center max-w-6xl mx-auto w-full">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex justify-center mb-6">
          <img
            src="/pdi-logo.jpg"
            alt="Primordial Dubbers India Logo"
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-contain border-2 border-slate-700/80 shadow-2xl shadow-blue-500/25 bg-black p-2"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyber-lime/30 bg-charcoal-violet/50 text-cyber-lime text-xs font-mono uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official PDI Voice Academy Baseline</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-wider text-white font-heading mb-4">
          PRIMORDIAL DUBBERS <span className="text-pdi-blue">INDIA</span>
        </h1>
        <p className="text-2xl md:text-3xl font-semibold tracking-wide text-slate-200 font-heading mb-6">
          EARN YOUR RANK. <span className="text-cyber-lime">MASTER YOUR VOICE.</span>
        </p>

        <p className="max-w-2xl mx-auto text-slate-300 text-sm md:text-base leading-relaxed mb-8">
          The premier platform for voice actors and dubbing artists. Dub professional scenes, submit
          browser-recorded takes, receive 100-point rubric critiques from casting directors, and rise through the official PDI rank tiers.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3 rounded-lg bg-cyber-lime text-black font-heading font-bold text-base hover:bg-lime-400 shadow-lg shadow-cyber-lime/20 flex items-center gap-2 transition-all hover:scale-105"
          >
            <span>JOIN THE ACADEMY</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            to="/rules"
            className="px-6 py-3 rounded-lg border border-slate-700 bg-pdi-surface hover:bg-slate-800 text-slate-200 font-heading font-semibold text-base transition-colors"
          >
            EXPLORE RANK TIERS & RULES
          </Link>
        </div>
      </section>

      {/* Official Rank Tiers Showcase */}
      <section className="max-w-6xl mx-auto w-full px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-white">
            OFFICIAL PDI RANK TIERS
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Server-authoritative progression. Points determine eligibility; rank demotions occur on approved deductions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(Object.keys(RANK_TIERS) as Array<keyof typeof RANK_TIERS>).map((tierKey) => {
            const tier = RANK_TIERS[tierKey];
            const maxDisplay = tier.maxPoints === Number.MAX_SAFE_INTEGER ? '25,000+' : `${tier.maxPoints.toLocaleString()}`;
            return (
              <div
                key={tier.tier}
                className="rounded-xl border border-pdi-border bg-pdi-surface/80 p-5 flex flex-col items-center text-center hover:border-slate-600 transition-all shadow-md group"
              >
                <div className="mb-3 group-hover:scale-110 transition-transform">
                  <RankBadge rank={tier.tier} size="lg" />
                </div>
                <span className="text-xs font-mono text-slate-400 mb-1">{tier.level}</span>
                <span className="text-lg font-bold font-heading text-white mb-2">
                  {tier.minPoints.toLocaleString()} – {maxDisplay} PTS
                </span>
                <div className="w-full pt-3 mt-auto border-t border-pdi-border/60 text-[11px] text-slate-400">
                  {tier.tier === 'ED' && 'Entry / Beginner baseline'}
                  {tier.tier === 'C' && 'Developing dubbing skills'}
                  {tier.tier === 'B' && 'Intermediate studio mastery'}
                  {tier.tier === 'A' && 'Advanced commercial dubbing'}
                  {tier.tier === 'S' && 'Elite casting priority'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dual Submission & Features Grid */}
      <section className="max-w-6xl mx-auto w-full px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6 flex flex-col">
          <div className="w-12 h-12 rounded-lg bg-cyber-lime/10 border border-cyber-lime/30 text-cyber-lime flex items-center justify-center mb-4">
            <Mic2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-heading text-white mb-2">Browser Dubbing Studio</h3>
          <p className="text-xs text-slate-300 leading-relaxed flex-1">
            Zero plugins required. Record microphone audio with real-time waveform visualization, latency offset calibration, and reference video sync.
          </p>
          <div className="mt-4 pt-3 border-t border-pdi-border text-[11px] font-mono text-cyber-lime">
            ✓ MediaRecorder API & Audio Waveforms
          </div>
        </div>

        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6 flex flex-col">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-heading text-white mb-2">Studio File Uploads</h3>
          <p className="text-xs text-slate-300 leading-relaxed flex-1">
            Prefer recording in Pro Tools, Reaper, or Audacity? Upload WAV/MP3 takes directly into your submission queue with automated checksum and MIME checks.
          </p>
          <div className="mt-4 pt-3 border-t border-pdi-border text-[11px] font-mono text-blue-400">
            ✓ Private Object Storage & Presigned URLs
          </div>
        </div>

        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6 flex flex-col">
          <div className="w-12 h-12 rounded-lg bg-lime-sprout/10 border border-lime-sprout/30 text-lime-sprout flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-heading text-white mb-2">Audited Points Ledger</h3>
          <p className="text-xs text-slate-300 leading-relaxed flex-1">
            Directors evaluate using a 100-point rubric and submit recommendations; Admins review and approve sensitive point changes with an immutable audit trail.
          </p>
          <div className="mt-4 pt-3 border-t border-pdi-border text-[11px] font-mono text-lime-sprout">
            ✓ ACID Transactions & Full Demotion Support
          </div>
        </div>
      </section>

      {/* Point Earning Catalog */}
      <section className="max-w-6xl mx-auto w-full px-4">
        <div className="rounded-xl border border-pdi-border bg-charcoal-violet/20 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold font-heading text-white">HOW TO EARN POINTS</h2>
              <p className="text-xs text-slate-300">Point incentives catalog from official PDI guidelines</p>
            </div>
            <Link
              to="/rules"
              className="text-xs font-semibold text-cyber-lime hover:underline flex items-center gap-1"
            >
              <span>View full deduction and appeal policies</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {AWARDS_CATALOG.map((item) => (
              <div
                key={item.code}
                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-700/80 bg-pdi-surface/90"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-cyber-lime" />
                  <span className="text-xs font-medium text-slate-200">{item.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/30">
                  +{item.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
