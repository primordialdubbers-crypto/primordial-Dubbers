import React, { useState, useEffect } from 'react';
import { 
  AWARDS_CATALOG, 
  DEDUCTIONS_CATALOG, 
  REVIEW_RUBRIC_MAX,
  RANK_TIERS,
  RankTier
} from '@pdi/shared';
import { RankBadge } from '../components/RankBadge';
import { ShieldAlert, BookOpen, Scale, CheckCircle2, Sparkles } from 'lucide-react';

export const RankRulesPage: React.FC = () => {
  const [liveCatalog, setLiveCatalog] = useState<{
    awards: typeof AWARDS_CATALOG;
    deductions: typeof DEDUCTIONS_CATALOG;
  }>({
    awards: AWARDS_CATALOG,
    deductions: DEDUCTIONS_CATALOG,
  });

  useEffect(() => {
    fetch('/api/v1/ranks')
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data) {
          setLiveCatalog({
            awards: body.data.awards || AWARDS_CATALOG,
            deductions: body.data.deductions || DEDUCTIONS_CATALOG,
          });
        }
      })
      .catch((err) => console.warn('Could not refresh ranks from API:', err));
  }, []);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-10">
      <div className="border-b border-pdi-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white">
            PDI VOICE ARTIST RANK SYSTEM — OFFICIAL RULES & RUBRICS
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Grounded strictly in Master PRD v2.1. Server-authoritative rank calculations, demotions, and rubric evaluations.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-pdi-surface border border-cyber-lime/40 text-cyber-lime text-xs font-semibold shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4" />
          <span>Server-Authoritative Ranking</span>
        </div>
      </div>

      {/* Official 5-Tier Ranking Hierarchy */}
      <section className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-cyber-lime" />
          <h2 className="text-xl font-bold font-heading text-white">
            Official Rank Hierarchy & Progression Tiers
          </h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          The PDI Voice Artist Ranking System establishes a server-authoritative 5-tier progression from baseline cadet to elite commercial voice talent. Artists earn rank points through verified audition evaluations, maintaining an immutable ledger with non-negative balance protection and automatic demotion on approved deductions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(['S', 'A', 'B', 'C', 'ED'] as RankTier[]).map((tierKey) => {
            const tier = RANK_TIERS[tierKey];
            return (
              <div
                key={tierKey}
                className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <RankBadge rank={tierKey} size="md" />
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      {tier.minPoints.toLocaleString()} {tierKey === 'S' ? '+ pts' : 'pts'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 font-heading">{tier.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{tier.level}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Tier: {tierKey}</span>
                  <span className="text-cyber-lime">{tierKey === 'S' ? 'Mastery' : 'Competitive'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 100-Point Review Rubric */}
      <section className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-cyber-lime" />
          <h2 className="text-xl font-bold font-heading text-white">
            100-Point Evaluation Rubric (Casting Directors)
          </h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          Every submission is evaluated against a 100-point standard. Rubric scores evaluate artistic performance and do NOT directly mutate rank points. Point proposals are separately submitted by directors and approved by admins.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-slate-200">Voice Acting & Emotion</span>
              <span className="text-xs font-mono font-bold text-cyber-lime">{REVIEW_RUBRIC_MAX.acting} pts</span>
            </div>
            <p className="text-[11px] text-slate-400">Authentic character emotion, tone modulation, and vocal energy.</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-slate-200">Lip Sync & Timing</span>
              <span className="text-xs font-mono font-bold text-cyber-lime">{REVIEW_RUBRIC_MAX.timing} pts</span>
            </div>
            <p className="text-[11px] text-slate-400">Precise synchronization with mouth flaps, pauses, and speech beats.</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-slate-200">Pronunciation & Diction</span>
              <span className="text-xs font-mono font-bold text-cyber-lime">{REVIEW_RUBRIC_MAX.pronunciation} pts</span>
            </div>
            <p className="text-[11px] text-slate-400">Clarity of dialogue, accent accuracy, dialect consistency, and enunciation.</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-slate-200">Character Expression</span>
              <span className="text-xs font-mono font-bold text-cyber-lime">{REVIEW_RUBRIC_MAX.expression} pts</span>
            </div>
            <p className="text-[11px] text-slate-400">Capturing character intent, subtext, urgency, and comedic/dramatic weight.</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-slate-200">Audio Quality</span>
              <span className="text-xs font-mono font-bold text-cyber-lime">{REVIEW_RUBRIC_MAX.audio} pts</span>
            </div>
            <p className="text-[11px] text-slate-400">Clean noise floor, absence of plosives/clipping, appropriate recording room acoustics.</p>
          </div>

          <div className="p-4 rounded-lg bg-charcoal-violet/50 border border-cyber-lime/30 flex flex-col justify-center">
            <span className="text-xs font-mono text-slate-300">Total Rubric Score</span>
            <span className="text-2xl font-bold font-heading text-cyber-lime">100 MAXIMUM</span>
          </div>
        </div>
      </section>

      {/* Promotion and Demotion Rules */}
      <section className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scale className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold font-heading text-white">
            Promotion & Demotion Policy (Locked PRD Rule)
          </h2>
        </div>
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong className="text-white">Rank Demotion is strictly enabled:</strong> Whenever an approved deduction transaction is committed, the artist’s current rank points decrease and their rank is recalculated immediately.
          </p>
          <div className="p-4 rounded-lg bg-slate-900 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300 text-sm">Example Boundary Scenario:</span>
              <p className="mt-1 text-slate-300">
                A student has 5,040 points (Rank B, where Rank B requires 5,000–11,999 pts). If an approved deduction of -100 points is processed, the balance becomes 4,940 points. The student is immediately demoted to Rank C (Developing Artist).
              </p>
            </div>
          </div>
          <p>
            <strong className="text-white">Non-negative balance rule:</strong> An artist’s balance can never drop below zero. If a deduction exceeds current balance, the balance remains 0 (ED Rank).
          </p>
        </div>
      </section>

      {/* Live Awards Catalog */}
      <section className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
        <h2 className="text-xl font-bold font-heading text-white mb-2">
          Approved Point Awards Catalog
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          Awards credited upon completed challenges, director evaluations, and verified audition submissions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {liveCatalog.awards.map((item) => (
            <div key={item.code} className="p-3 rounded-lg bg-slate-900 border border-slate-700 flex justify-between items-center">
              <span className="text-xs text-slate-200">{item.name}</span>
              <span className="text-xs font-mono font-bold text-cyber-lime">+{item.points} pts</span>
            </div>
          ))}
        </div>
      </section>

      {/* Suggested Deductions & Appeals */}
      <section className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
        <h2 className="text-xl font-bold font-heading text-white mb-2">
          Deductions & Student Appeal Rights
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          Deductions require category justification, evidence, and admin approval. Ordinary beginner weaknesses are addressed via feedback rather than punitive deductions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {liveCatalog.deductions.map((item) => (
            <div key={item.code} className="p-3 rounded-lg bg-slate-900 border border-slate-700 flex justify-between items-center">
              <span className="text-xs text-slate-200">{item.name}</span>
              <span className="text-xs font-mono font-bold text-rose-400">{item.points} pts</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-lime-sprout shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <strong className="text-white">Appeal Process:</strong> Every student receives an automated notification upon any deduction. Students may file an appeal through the Student Dashboard with counter-evidence. If an admin approves the appeal, an opposite reversing transaction is posted to the ledger, restoring points and rank without ever altering historical records.
          </div>
        </div>
      </section>
    </div>
  );
};
