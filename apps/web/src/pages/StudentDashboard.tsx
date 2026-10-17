import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import {
  RANK_TIERS,
  SubmissionRecord,
  EvaluationRecord,
  REVIEW_RUBRIC_MAX,
} from '@pdi/shared';
import {
  Mic2,
  Upload,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Award,
  Clock,
  Play,
  FileAudio,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, profile, token } = useAuth();
  const [serverVerified, setServerVerified] = useState<boolean>(false);

  // Submissions & Evaluation Feedback State
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(true);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationRecord | null>>({});
  const [loadingEvals, setLoadingEvals] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/v1/student/dashboard-summary', {
      headers,
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) setServerVerified(true);
      })
      .catch((err) => console.warn('Student clearance check failed:', err));

    // Fetch student's recent submissions
    setIsLoadingSubmissions(true);
    fetch('/api/v1/submissions/my', {
      headers,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data?.submissions) {
          setSubmissions(body.data.submissions);
        }
      })
      .catch((err) => console.warn('Failed to load student submissions:', err))
      .finally(() => setIsLoadingSubmissions(false));
  }, [token]);

  const handleToggleEvaluation = async (submissionId: string) => {
    if (expandedSubId === submissionId) {
      setExpandedSubId(null);
      return;
    }

    setExpandedSubId(submissionId);

    if (evaluations[submissionId] !== undefined) {
      return;
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
      console.warn('Failed to load evaluation feedback:', err);
      setEvaluations((prev) => ({ ...prev, [submissionId]: null }));
    } finally {
      setLoadingEvals((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const seekAudio = (submissionId: string, seconds: number) => {
    const audioEl = audioRefs.current[submissionId];
    if (audioEl) {
      audioEl.currentTime = seconds;
      audioEl.play().catch(console.warn);
    }
  };

  const rank = profile?.currentRank || 'ED';
  const points = profile?.rankPoints || 0;

  // Calculate next rank target
  const getNextRank = () => {
    if (rank === 'ED') return { next: 'C', target: 5000, needed: 5000 - points };
    if (rank === 'C') return { next: 'B', target: 12000, needed: 12000 - points };
    if (rank === 'B') return { next: 'A', target: 25000, needed: 25000 - points };
    if (rank === 'A') return { next: 'S', target: 50000, needed: 50000 - points };
    return { next: 'S (Elite)', target: 100000, needed: Math.max(0, 100000 - points) };
  };

  const nextInfo = getNextRank();
  const currentTier = RANK_TIERS[rank];
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((points - currentTier.minPoints) / (nextInfo.target - currentTier.minPoints)) * 100))
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Student Profile Hero Card styled with Combo 03: Charcoal Violet & Cyber Lime */}
      <div className="rounded-2xl border border-cyber-lime/30 bg-gradient-to-r from-charcoal-violet/80 via-slate-900 to-pdi-surface p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-charcoal-violet border-2 border-cyber-lime flex items-center justify-center text-cyber-lime font-heading text-2xl font-bold shadow-lg shadow-cyber-lime/20">
              {user?.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">{user?.displayName}</h1>
                <RankBadge rank={rank} size="md" />
                {serverVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyber-lime/10 border border-cyber-lime/30 text-[10px] text-cyber-lime font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Session
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {user?.email} • {currentTier.level}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Total Verified Points</span>
            <span className="text-3xl font-extrabold font-heading text-cyber-lime">
              {points.toLocaleString()} <span className="text-sm font-normal text-slate-400">PTS</span>
            </span>
          </div>
        </div>

        {/* Progress bar towards next tier */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-300">
              Progression to Rank <strong className="text-cyber-lime">{nextInfo.next}</strong> ({nextInfo.target.toLocaleString()} pts)
            </span>
            <span className="font-mono text-cyber-lime font-semibold">
              {progressPercent}% ({nextInfo.needed.toLocaleString()} pts needed)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyber-lime transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Launchpad Cards with Active Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/student/studio"
          className="rounded-xl border border-pdi-border bg-pdi-surface p-5 flex flex-col justify-between hover:border-cyber-lime/50 transition-all hover:shadow-lg hover:shadow-cyber-lime/5 group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-cyber-lime font-bold">Dubbing Studio</span>
              <Mic2 className="w-4 h-4 text-cyber-lime group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-base font-bold font-heading text-white mb-1">Record In-Browser Take</h3>
            <p className="text-xs text-slate-400">
              Microphone recording with VU volume meter, latency compensation, and reference scene sync.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-pdi-border flex items-center justify-between text-xs text-cyber-lime font-semibold">
            <span>Open Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/student/auditions"
          className="rounded-xl border border-pdi-border bg-pdi-surface p-5 flex flex-col justify-between hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-400/5 group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-blue-400 font-bold">Auditions</span>
              <Upload className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-base font-bold font-heading text-white mb-1">Upload Audio Take</h3>
            <p className="text-xs text-slate-400">
              Browse audition challenges, read character teleprompters, and submit mastered takes.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-pdi-border flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span>Browse Library</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/student/ledger"
          className="rounded-xl border border-pdi-border bg-pdi-surface p-5 flex flex-col justify-between hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-400/5 group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">Ledger</span>
              <TrendingUp className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-base font-bold font-heading text-white mb-1">Points Ledger & Appeals</h3>
            <p className="text-xs text-slate-400">
              Audited transaction history, reason codes, rank demotion alerts, and appeal submissions.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-pdi-border flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>View Ledger</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Phase 6.2: Detailed Feedback Viewer on Student Dashboard */}
      <div className="rounded-2xl border border-pdi-border bg-pdi-surface p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-cyber-lime" />
              <h2 className="text-lg font-bold font-heading text-white">
                Recent Auditions & Director Feedback
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Playback your recorded takes and inspect 100-point rubric breakdown reviews from Casting Directors.
            </p>
          </div>
          <Link
            to="/student/submissions"
            className="text-xs font-mono text-cyber-lime hover:underline flex items-center gap-1 font-semibold"
          >
            All Submissions ({submissions.length}) <ArrowRight size={12} />
          </Link>
        </div>

        {isLoadingSubmissions ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading your audition records and feedback...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-3 border border-dashed border-slate-800 rounded-xl">
            <FileAudio className="w-8 h-8 text-slate-600 mx-auto" />
            <p>You haven't submitted any audition takes yet.</p>
            <Link
              to="/student/studio"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-lime text-slate-950 font-bold text-xs hover:bg-lime-400 transition-colors"
            >
              <Mic2 size={13} /> Record Your First Take
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.slice(0, 3).map((sub) => {
              const isExpanded = expandedSubId === sub.id;
              const evalData = evaluations[sub.id];
              const isLoadingEval = loadingEvals[sub.id];

              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold font-heading text-white">
                          {sub.challengeTitle || 'Audition Challenge'}
                        </span>
                        <span className="text-xs font-mono text-cyber-lime">
                          Role: {sub.characterName || 'Voice Artist'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            sub.status === 'reviewed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {sub.status === 'reviewed' ? 'Evaluation Completed' : 'Pending Review'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                        <span>Duration: {sub.durationSeconds.toFixed(1)}s</span>
                        <span>•</span>
                        <span className="capitalize">{sub.submissionType} Take</span>
                        {sub.syncOffsetMs !== undefined && sub.syncOffsetMs !== 0 && (
                          <>
                            <span>•</span>
                            <span className="text-cyber-lime flex items-center gap-1">
                              <Sliders size={11} /> {sub.syncOffsetMs > 0 ? `+${sub.syncOffsetMs}` : sub.syncOffsetMs}ms Sync
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEvaluation(sub.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isExpanded
                            ? 'bg-slate-800 text-white border border-slate-600'
                            : 'bg-charcoal-violet border border-cyber-lime/40 text-cyber-lime hover:bg-charcoal-violet/80'
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} /> Hide Critique
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> View 100-Point Critique
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Audio Take Player */}
                  <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 flex items-center gap-3">
                    <audio
                      ref={(el) => {
                        audioRefs.current[sub.id] = el;
                      }}
                      src={sub.audioUrl}
                      controls
                      className="w-full h-8"
                    />
                  </div>

                  {/* Expanded 100-Point Rubric Critique Drawer */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-800 space-y-4 animate-fadeIn">
                      {isLoadingEval ? (
                        <div className="py-4 text-center text-xs text-slate-500 font-mono">
                          Loading evaluation breakdown...
                        </div>
                      ) : !evalData ? (
                        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center">
                          A Casting Director has not finalized the evaluation for this take yet. Once submitted, your 100-point score and critique markers will appear here.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Score & Grade Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                                Overall Assessment
                              </span>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black font-heading text-cyber-lime">
                                  {evalData.totalScore}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">/ 100 PTS</span>
                                <span className="ml-2 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-charcoal-violet border border-cyber-lime/40 text-cyber-lime">
                                  {evalData.grade}
                                </span>
                              </div>
                            </div>
                            <div className="text-right text-xs font-mono text-slate-400">
                              <span>Reviewed by: <strong className="text-white">{evalData.directorName || 'Casting Director'}</strong></span>
                            </div>
                          </div>

                          {/* 5-Component Rubric Breakdown */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-semibold">Acting & Emotion</span>
                                <span className="font-mono text-cyber-lime font-bold">
                                  {evalData.scores.acting}/{REVIEW_RUBRIC_MAX.acting}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className="h-full bg-cyber-lime"
                                  style={{
                                    width: `${(evalData.scores.acting / REVIEW_RUBRIC_MAX.acting) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-semibold">Lip Sync & Timing</span>
                                <span className="font-mono text-blue-400 font-bold">
                                  {evalData.scores.timing}/{REVIEW_RUBRIC_MAX.timing}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className="h-full bg-blue-400"
                                  style={{
                                    width: `${(evalData.scores.timing / REVIEW_RUBRIC_MAX.timing) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-semibold">Pronunciation</span>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {evalData.scores.pronunciation}/{REVIEW_RUBRIC_MAX.pronunciation}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400"
                                  style={{
                                    width: `${(evalData.scores.pronunciation / REVIEW_RUBRIC_MAX.pronunciation) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-semibold">Character Expression</span>
                                <span className="font-mono text-amber-400 font-bold">
                                  {evalData.scores.expression}/{REVIEW_RUBRIC_MAX.expression}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400"
                                  style={{
                                    width: `${(evalData.scores.expression / REVIEW_RUBRIC_MAX.expression) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-semibold">Audio Quality</span>
                                <span className="font-mono text-purple-400 font-bold">
                                  {evalData.scores.audio}/{REVIEW_RUBRIC_MAX.audio}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div
                                  className="h-full bg-purple-400"
                                  style={{
                                    width: `${(evalData.scores.audio / REVIEW_RUBRIC_MAX.audio) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Qualitative Feedback */}
                          {(evalData.summaryNotes || evalData.strengths || evalData.areasForImprovement) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              {evalData.summaryNotes && (
                                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">
                                    Summary Notes
                                  </span>
                                  <p className="text-slate-200 leading-relaxed">{evalData.summaryNotes}</p>
                                </div>
                              )}
                              {evalData.strengths && (
                                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">
                                    Key Strengths
                                  </span>
                                  <p className="text-slate-200 leading-relaxed">{evalData.strengths}</p>
                                </div>
                              )}
                              {evalData.areasForImprovement && (
                                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-[10px] uppercase font-mono text-amber-400 block font-bold">
                                    Focus for Next Take
                                  </span>
                                  <p className="text-slate-200 leading-relaxed">{evalData.areasForImprovement}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Timestamped Critique Comments */}
                          {evalData.timestampComments && evalData.timestampComments.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Clock size={13} className="text-cyber-lime" /> Timestamped Director Notes (Click to Seek)
                              </span>
                              <div className="space-y-1.5">
                                {evalData.timestampComments.map((tc, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800"
                                  >
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => seekAudio(sub.id, tc.timestampSeconds)}
                                        className="px-2 py-0.5 rounded bg-charcoal-violet text-cyber-lime hover:bg-charcoal-violet/80 border border-cyber-lime/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                                      >
                                        <Play size={10} /> {tc.timestampSeconds.toFixed(1)}s
                                      </button>
                                      <span className="text-slate-200">{tc.comment}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Academy Platform Status Notice */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-cyber-lime shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <strong className="text-white block text-sm mb-1 font-heading">
            PDI ARTIST PORTAL ACTIVE
          </strong>
          You are authenticated with server-verified credentials. Dubbing Studio (Phase 6), 100-Point Rubric Feedback (Phase 5), Auditions (Phase 4), and Immutable Ledger (Phases 2 & 3) are active and synchronized with Casting Director workflows.
        </div>
      </div>
    </div>
  );
};
