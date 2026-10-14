import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SubmissionRecord, EvaluationRecord, REVIEW_RUBRIC_MAX } from '@pdi/shared';
import {
  FileAudio,
  RefreshCw,
  Clock,
  ArrowRight,
  Music,
  Award,
  ChevronDown,
  ChevronUp,
  Mic,
  Play,
} from 'lucide-react';

import { Link } from 'react-router-dom';

export const SubmissionsPage: React.FC = () => {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded Evaluation Feedbacks Map
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationRecord | null>>({});
  const [loadingEvals, setLoadingEvals] = useState<Record<string, boolean>>({});

  // Audio Player references to seek timestamps
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const fetchSubmissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/submissions/my', {
        headers,
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to load submitted takes');
      const body = await res.json();
      setSubmissions(body.data?.submissions || []);
    } catch (err: any) {
      console.warn('Submissions load failed:', err);
      setError(err?.message || 'Error loading audition submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  // Toggle and fetch evaluation feedback
  const handleToggleEvaluation = async (submissionId: string) => {
    if (expandedSubId === submissionId) {
      setExpandedSubId(null);
      return;
    }

    setExpandedSubId(submissionId);

    if (evaluations[submissionId] !== undefined) {
      return; // already cached
    }

    setLoadingEvals((prev) => ({ ...prev, [submissionId]: true }));
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/evaluations/submission/${submissionId}`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const body = await res.json();
        setEvaluations((prev) => ({ ...prev, [submissionId]: body.data?.evaluation || null }));
      } else {
        setEvaluations((prev) => ({ ...prev, [submissionId]: null }));
      }
    } catch (err) {
      console.warn('Failed to load evaluation:', err);
      setEvaluations((prev) => ({ ...prev, [submissionId]: null }));
    } finally {
      setLoadingEvals((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // Seek submission audio player to specific timestamp
  const seekAudio = (submissionId: string, seconds: number) => {
    const audioEl = audioRefs.current[submissionId];
    if (audioEl) {
      audioEl.currentTime = seconds;
      audioEl.play().catch(console.warn);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner - Combo 03: Charcoal Violet & Cyber Lime */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pdi-border pb-5">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-cyber-lime font-bold">
            Audition Archive
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
            My Audition Takes & Director Evaluations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review your uploaded takes, playback audio recordings, and inspect 100-point rubric critique sheets from Casting Directors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/student/studio"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-cyber-lime hover:bg-lime-400 text-slate-950 transition-all shadow-md shadow-cyber-lime/10"
          >
            <Mic size={14} /> Open Dubbing Studio
          </Link>
          <button
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-pdi-surface border border-pdi-border hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-cyber-lime" />
          Loading your audition recordings...
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
          <FileAudio size={40} className="mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-bold text-slate-300 font-heading mb-1">
            No Audition Takes Submitted Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Select a scene from our audition library, record or upload your audio take, and earn rank points upon director review.
          </p>
          <Link
            to="/student/auditions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-lime text-slate-950 font-bold text-xs hover:bg-lime-400 transition-colors shadow-md"
          >
            <span>Explore Audition Challenges</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const isExpanded = expandedSubId === sub.id;
            const evalRecord = evaluations[sub.id];
            const isLoadingEval = loadingEvals[sub.id];

            return (
              <div
                key={sub.id}
                className="p-5 rounded-2xl border border-pdi-border bg-pdi-surface shadow-lg space-y-4 hover:border-cyber-lime/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base font-heading">
                        {sub.challengeTitle}
                      </span>
                      <span className="text-xs font-mono text-cyber-lime uppercase">
                        • Role: {sub.characterName || 'Character'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(sub.createdAt).toLocaleString()}
                      </span>
                      <span>• Duration: {sub.durationSeconds.toFixed(1)}s</span>
                      <span className="capitalize">• Type: {sub.submissionType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        sub.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : sub.status === 'reviewed'
                          ? 'bg-sky-950 text-sky-300 border border-sky-700'
                          : sub.status === 'rejected'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}
                    >
                      Status: {sub.status}
                    </span>

                    {(sub.status === 'reviewed' || sub.status === 'approved') && (
                      <button
                        onClick={() => handleToggleEvaluation(sub.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-700 text-xs font-semibold transition-colors"
                      >
                        <Award size={13} />
                        <span>{isExpanded ? 'Hide Rubric Score' : 'View 100-Pt Rubric'}</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Audio Playback Player */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <Music size={13} className="text-cyber-lime" /> Mastered Audio Track
                    </span>
                    <span className="text-[11px]">{sub.mimeType}</span>
                  </div>
                  <audio
                    ref={(el) => (audioRefs.current[sub.id] = el)}
                    controls
                    src={sub.audioUrl}
                    className="w-full h-10 rounded"
                  />
                </div>

                {sub.notes && (
                  <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="font-mono text-[10px] uppercase text-slate-500 block mb-0.5">
                      Artist Notes for Evaluator:
                    </span>
                    <p className="text-slate-300">{sub.notes}</p>
                  </div>
                )}

                {/* DETAILED 100-POINT RUBRIC EVALUATION VIEWER */}
                {isExpanded && (
                  <div className="p-5 rounded-xl bg-slate-950 border-2 border-sky-500/40 space-y-5 animate-fadeIn">
                    {isLoadingEval ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-sky-400" />
                        Fetching director evaluation score sheet...
                      </div>
                    ) : !evalRecord ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No official evaluation sheet published yet.
                      </div>
                    ) : (
                      <>
                        {/* Score Header */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-sky-950 border border-sky-500 flex items-center justify-center text-sky-400">
                              <Award size={24} />
                            </div>
                            <div>
                              <div className="text-xs font-mono uppercase text-sky-400">
                                Casting Director Evaluation
                              </div>
                              <h3 className="text-lg font-bold font-heading text-white">
                                Evaluator: {evalRecord.directorName || 'Casting Director'}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Score</span>
                              <div className="text-2xl font-black font-heading text-sky-400">
                                {evalRecord.totalScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-sky-950 border border-sky-500 text-sky-300">
                              Grade: {evalRecord.grade}
                            </span>
                          </div>
                        </div>

                        {/* 5-Component Rubric Breakdown Bars */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                          {/* Acting */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-semibold">Acting</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {evalRecord.scores.acting}/{REVIEW_RUBRIC_MAX.acting}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-400 h-full rounded-full"
                                style={{ width: `${(evalRecord.scores.acting / REVIEW_RUBRIC_MAX.acting) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Lip Sync / Timing */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-semibold">Lip Sync</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {evalRecord.scores.timing}/{REVIEW_RUBRIC_MAX.timing}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-400 h-full rounded-full"
                                style={{ width: `${(evalRecord.scores.timing / REVIEW_RUBRIC_MAX.timing) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Pronunciation */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-semibold">Pronunciation</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {evalRecord.scores.pronunciation}/{REVIEW_RUBRIC_MAX.pronunciation}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-400 h-full rounded-full"
                                style={{ width: `${(evalRecord.scores.pronunciation / REVIEW_RUBRIC_MAX.pronunciation) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Character Expression */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-semibold">Expression</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {evalRecord.scores.expression}/{REVIEW_RUBRIC_MAX.expression}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-400 h-full rounded-full"
                                style={{ width: `${(evalRecord.scores.expression / REVIEW_RUBRIC_MAX.expression) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Audio Quality */}
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-semibold">Audio Quality</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {evalRecord.scores.audio}/{REVIEW_RUBRIC_MAX.audio}
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-400 h-full rounded-full"
                                style={{ width: `${(evalRecord.scores.audio / REVIEW_RUBRIC_MAX.audio) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Timestamp Comments with Quick Jump */}
                        {evalRecord.timestampComments && evalRecord.timestampComments.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-200 uppercase font-heading flex items-center gap-1.5">
                              <Clock size={14} className="text-sky-400" /> Timestamped Director Notes (Click to Play):
                            </span>
                            <div className="space-y-1.5">
                              {evalRecord.timestampComments.map((tc, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                                >
                                  <button
                                    type="button"
                                    onClick={() => seekAudio(sub.id, tc.timestampSeconds)}
                                    className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-700 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <Play size={11} /> {tc.timestampSeconds.toFixed(1)}s
                                  </button>
                                  <span className="text-xs text-slate-200">{tc.comment}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Qualitative Critique Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                          {evalRecord.summaryNotes && (
                            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                                Executive Critique
                              </span>
                              <p className="text-xs text-slate-300">{evalRecord.summaryNotes}</p>
                            </div>
                          )}

                          {evalRecord.strengths && (
                            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-emerald-400 block">
                                Key Strengths
                              </span>
                              <p className="text-xs text-emerald-200">{evalRecord.strengths}</p>
                            </div>
                          )}

                          {evalRecord.areasForImprovement && (
                            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-amber-400 block">
                                Priority Coaching Areas
                              </span>
                              <p className="text-xs text-amber-200">{evalRecord.areasForImprovement}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
