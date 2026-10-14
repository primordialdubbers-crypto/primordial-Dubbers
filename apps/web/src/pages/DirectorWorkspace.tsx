import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Award,
  ShieldCheck,
  Send,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Clock,
  FileText,
  User,
  RefreshCw,
  Plus,
  Trash2,
  Bookmark,
  Check,
  Video,
  Sliders,
} from 'lucide-react';

import {
  REVIEW_RUBRIC_MAX,
  calculateEvaluationGrade,
  AWARDS_CATALOG,
  DEDUCTIONS_CATALOG,
  RubricScores,
  TimestampComment,
} from '@pdi/shared';

interface QueueItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  challengeId: string;
  challengeTitle: string;
  characterName: string;
  difficulty: string;
  targetRank: string;
  referenceMediaUrl?: string;
  script?: string;
  audioUrl: string;
  durationSeconds: number;
  mimeType: string;
  submissionType: string;
  syncOffsetMs?: number;
  status: string;
  notes?: string;
  createdAt: string;
  evaluation?: {
    id: string;
    totalScore: number;
    grade: string;
    status: 'draft' | 'submitted';
    scores: RubricScores;
    timestampComments: TimestampComment[];
    summaryNotes?: string;
    strengths?: string;
    areasForImprovement?: string;
  } | null;
}

export const DirectorWorkspace: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'recommendation'>('queue');
  const [clearanceActive, setClearanceActive] = useState<boolean>(false);

  // Review Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(true);
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'reviewed'>('all');

  // Currently Evaluating Submission
  const [selectedSubmission, setSelectedSubmission] = useState<QueueItem | null>(null);

  // Rubric Scoring State
  const [scores, setScores] = useState<RubricScores>({
    acting: 20,
    timing: 16,
    pronunciation: 16,
    expression: 16,
    audio: 12,
  });
  const [timestampComments, setTimestampComments] = useState<TimestampComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [newCommentTime, setNewCommentTime] = useState<number>(0);
  const [summaryNotes, setSummaryNotes] = useState<string>('');
  const [strengths, setStrengths] = useState<string>('');
  const [areasForImprovement, setAreasForImprovement] = useState<string>('');

  // Attached Point Recommendation State
  const [attachPointProposal, setAttachPointProposal] = useState<boolean>(false);
  const [proposalDelta, setProposalDelta] = useState<number>(50);
  const [proposalCategory, setProposalCategory] = useState<string>('scene_mastery');
  const [proposalReason, setProposalReason] = useState<string>('');

  const { submissionId: paramSubmissionId } = useParams<{ submissionId?: string }>();
  const navigate = useNavigate();

  // Audio & Video Playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const referenceVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingSync, setIsPlayingSync] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);


  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Standalone Proposal Form state
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [artists, setArtists] = useState<{ userId: string; displayName: string; currentRank: string }[]>([]);
  const [standaloneDelta, setStandaloneDelta] = useState<number>(50);
  const [standaloneCategory, setStandaloneCategory] = useState<string>('review_award');
  const [standaloneReason, setStandaloneReason] = useState<string>('');

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/director/review-queue', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        setQueue(body.data?.queue || []);
      }
    } catch (err) {
      console.warn('Failed to load review queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/v1/director/workspace-summary', {
      headers,
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) setClearanceActive(true);
      })
      .catch((err) => console.warn('Director clearance check failed:', err));

    fetchQueue();

    // Fetch artists for student selector in standalone proposal
    fetch('/api/v1/leaderboard')
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data?.leaderboard) {
          setArtists(body.data.leaderboard);
        }
      })
      .catch((err) => console.warn('Failed to load artists:', err));
  }, [token]);

  // Handle URL param route /director/evaluate/:submissionId
  useEffect(() => {
    if (paramSubmissionId && queue.length > 0) {
      const match = queue.find((q) => q.id === paramSubmissionId);
      if (match) {
        handleOpenEvaluation(match);
      }
    }
  }, [paramSubmissionId, queue]);

  // Handle open evaluation workspace for a specific submission
  const handleOpenEvaluation = (sub: QueueItem) => {
    setSelectedSubmission(sub);
    setFeedback(null);
    setCurrentTime(0);
    setIsPlayingSync(false);

    if (sub.evaluation) {
      setScores(sub.evaluation.scores);
      setTimestampComments(sub.evaluation.timestampComments || []);
      setSummaryNotes(sub.evaluation.summaryNotes || '');
      setStrengths(sub.evaluation.strengths || '');
      setAreasForImprovement(sub.evaluation.areasForImprovement || '');
    } else {
      setScores({
        acting: 20,
        timing: 16,
        pronunciation: 16,
        expression: 16,
        audio: 12,
      });
      setTimestampComments([]);
      setSummaryNotes('');
      setStrengths('');
      setAreasForImprovement('');
    }
    setAttachPointProposal(false);
  };

  // Live Rubric Calculations
  const liveTotalScore =
    Number(scores.acting) +
    Number(scores.timing) +
    Number(scores.pronunciation) +
    Number(scores.expression) +
    Number(scores.audio);

  const liveGrade = calculateEvaluationGrade(liveTotalScore);

  // Audio Event Listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setNewCommentTime(Math.round(audioRef.current.currentTime * 10) / 10);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleToggleSyncPlayback = () => {
    if (!audioRef.current) return;
    const offsetSec = (selectedSubmission?.syncOffsetMs || 0) / 1000;

    if (isPlayingSync) {
      audioRef.current.pause();
      if (referenceVideoRef.current) referenceVideoRef.current.pause();
      setIsPlayingSync(false);
    } else {
      audioRef.current.currentTime = 0;
      if (referenceVideoRef.current) {
        referenceVideoRef.current.currentTime = Math.max(0, -offsetSec);
        if (offsetSec > 0) {
          setTimeout(() => {
            if (referenceVideoRef.current) referenceVideoRef.current.play().catch(console.warn);
          }, offsetSec * 1000);
        } else {
          referenceVideoRef.current.play().catch(console.warn);
        }
      }
      audioRef.current.play().catch(console.warn);
      setIsPlayingSync(true);
    }
  };

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
    if (referenceVideoRef.current && selectedSubmission) {
      const offsetSec = (selectedSubmission.syncOffsetMs || 0) / 1000;
      referenceVideoRef.current.currentTime = Math.max(0, seconds - offsetSec);
    }
  };

  const addTimestampComment = () => {
    if (!newCommentText.trim()) return;
    const item: TimestampComment = {
      timestampSeconds: Math.round(newCommentTime * 10) / 10,
      comment: newCommentText.trim(),
    };
    const updated = [...timestampComments, item].sort(
      (a, b) => a.timestampSeconds - b.timestampSeconds
    );
    setTimestampComments(updated);
    setNewCommentText('');
  };

  const removeTimestampComment = (index: number) => {
    setTimestampComments((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Evaluation (Draft or Submitted)
  const handleSaveEvaluation = async (status: 'draft' | 'submitted') => {
    if (!selectedSubmission) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        submissionId: selectedSubmission.id,
        scores,
        timestampComments,
        summaryNotes,
        strengths,
        areasForImprovement,
        status,
        attachPointProposal,
        pointProposalDelta: attachPointProposal ? Number(proposalDelta) : undefined,
        pointProposalCategory: attachPointProposal ? proposalCategory : undefined,
        pointProposalReason: attachPointProposal
          ? proposalReason || `Evaluation Score ${liveTotalScore}/100: ${summaryNotes}`
          : undefined,
      };

      const res = await fetch('/api/v1/evaluations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Failed to submit evaluation');
      }

      setFeedback({
        type: 'success',
        message:
          status === 'submitted'
            ? `Evaluation officially submitted! Total Score: ${liveTotalScore}/100 (${liveGrade}).${
                attachPointProposal ? ' Point proposal queued for Admin approval.' : ''
              }`
            : 'Evaluation draft saved successfully.',
      });

      await fetchQueue();

      if (status === 'submitted') {
        setTimeout(() => {
          setSelectedSubmission(null);
          if (paramSubmissionId) {
            navigate('/director/evaluations');
          }
        }, 1800);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error saving evaluation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Standalone Proposal Submit (Phase 3)
  const handleStandaloneProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!targetStudentId.trim()) {
      setFeedback({ type: 'error', message: 'Target student ID is required' });
      return;
    }

    if (user && targetStudentId.trim() === user.id) {
      setFeedback({
        type: 'error',
        message: 'Self-proposals are strictly prohibited. You cannot recommend points for yourself.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const idempotencyKey = `dir_prop_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await fetch('/api/v1/director/point-proposals', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          studentId: targetStudentId.trim(),
          delta: Number(standaloneDelta),
          category: standaloneCategory,
          reason: standaloneReason.trim(),
          sourceType: standaloneDelta > 0 ? 'manual_award' : 'manual_deduction',
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit point recommendation');
      }

      setFeedback({
        type: 'success',
        message: `Point recommendation (${standaloneDelta > 0 ? '+' : ''}${standaloneDelta} pts) successfully submitted to Admin Approval Queue!`,
      });
      setStandaloneReason('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error submitting recommendation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtering queue items
  const filteredQueue = queue.filter((item) => {
    if (queueFilter === 'pending') {
      return !item.evaluation || item.evaluation.status === 'draft';
    }
    if (queueFilter === 'reviewed') {
      return item.evaluation?.status === 'submitted';
    }
    return true;
  });

  const pendingCount = queue.filter(
    (item) => !item.evaluation || item.evaluation.status === 'draft'
  ).length;
  const completedCount = queue.filter(
    (item) => item.evaluation?.status === 'submitted'
  ).length;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header Banner - Casting Director Suite */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/70 via-slate-900 to-pdi-surface p-6 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-950 border border-sky-500 text-sky-300 flex items-center justify-center font-bold">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-heading text-white">
                  CASTING DIRECTOR EVALUATION SUITE
                </h1>
                {clearanceActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-[10px] text-sky-300 font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    Clearance Active
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Evaluator: {user?.displayName} ({user?.email}) • 100-Point Standard Rubric & Audition Review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('queue');
                setSelectedSubmission(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Review Queue ({pendingCount} Pending)
            </button>
            <button
              onClick={() => setActiveTab('recommendation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'recommendation'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Manual Point Recommendation
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Review Queue Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-5">
          <span className="text-xs font-mono uppercase text-slate-400">Total Assigned Submissions</span>
          <div className="text-3xl font-extrabold font-heading text-sky-400 mt-2">{queue.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Audition takes in library</span>
        </div>

        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-5">
          <span className="text-xs font-mono uppercase text-slate-400">Pending Evaluation</span>
          <div className="text-3xl font-extrabold font-heading text-amber-400 mt-2">{pendingCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Requires director 100-point rubric</span>
        </div>

        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-5">
          <span className="text-xs font-mono uppercase text-slate-400">Evaluations Completed</span>
          <div className="text-3xl font-extrabold font-heading text-emerald-400 mt-2">{completedCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Critique submitted & feedback visible</span>
        </div>
      </div>

      {/* ACTIVE SUBMISSION EVALUATION WORKSPACE MODAL / IN-PAGE VIEW */}
      {selectedSubmission && (
        <div className="rounded-2xl border-2 border-sky-500/50 bg-slate-950 p-6 md:p-8 shadow-2xl space-y-8 animate-fadeIn">
          {/* Header of Evaluation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  Active Scoring Session
                </span>
                <h2 className="text-xl font-bold font-heading text-white">
                  {selectedSubmission.challengeTitle}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>Artist: <strong className="text-slate-200">{selectedSubmission.studentName}</strong></span>
                <span>• Role: <strong className="text-sky-300">{selectedSubmission.characterName}</strong></span>
                <span>• Duration: {selectedSubmission.durationSeconds.toFixed(1)}s</span>
                <span>• Submitted: {new Date(selectedSubmission.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Score Badge */}
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Rubric Score</span>
                <div className="text-2xl font-black font-heading text-sky-400">
                  {liveTotalScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-sky-950 border border-sky-500 text-sky-300">
                Grade: {liveGrade}
              </span>
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  if (paramSubmissionId) {
                    navigate('/director/evaluations');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Close Evaluator
              </button>
            </div>
          </div>

          {/* Script Reader & Audio/Video Playback Sync */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audition Take Audio & Synchronized Video Player */}
            <div className="p-5 rounded-xl bg-pdi-surface border border-pdi-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-heading text-white flex items-center gap-2">
                  <Play size={16} className="text-sky-400" /> Audition Playback & Marker Tool
                </h3>
                <div className="flex items-center gap-2">
                  {selectedSubmission.syncOffsetMs !== undefined && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-cyber-lime flex items-center gap-1">
                      <Sliders size={11} /> {selectedSubmission.syncOffsetMs > 0 ? `+${selectedSubmission.syncOffsetMs}` : selectedSubmission.syncOffsetMs}ms Offset
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-400">
                    {currentTime.toFixed(1)}s / {duration ? duration.toFixed(1) : selectedSubmission.durationSeconds.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Reference Clip Player if challenge provides reference media */}
              {selectedSubmission.referenceMediaUrl && (
                <div className="space-y-2 rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 flex items-center gap-1.5">
                      <Video size={13} className="text-sky-400" /> Reference Scene Clip
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleSyncPlayback}
                      className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                    >
                      {isPlayingSync ? <Pause size={12} /> : <Play size={12} />}
                      {isPlayingSync ? 'Pause Sync' : 'Sync Play (Video + Audio)'}
                    </button>
                  </div>
                  <div className="rounded-lg overflow-hidden bg-black max-h-48 flex items-center justify-center">
                    <video
                      ref={referenceVideoRef}
                      src={selectedSubmission.referenceMediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Student Audio Take Player */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Student Audio Take:
                </span>
                <audio
                  ref={audioRef}
                  src={selectedSubmission.audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPause={() => setIsPlayingSync(false)}
                  onEnded={() => setIsPlayingSync(false)}
                  className="w-full"
                  controls
                />
              </div>


              {/* Timestamped Critique Creator */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock size={13} className="text-sky-400" /> Drop Timestamp Marker
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewCommentTime(Math.max(0, Math.round((currentTime - 1) * 10) / 10))}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
                    >
                      -1s
                    </button>
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-xs font-mono font-bold">
                      {newCommentTime.toFixed(1)}s
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewCommentTime(Math.round((currentTime + 1) * 10) / 10)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
                    >
                      +1s
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="e.g. Inhale audible here; great crescendo on punchline..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTimestampComment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addTimestampComment}
                    disabled={!newCommentText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 transition-colors"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Timestamp comments list */}
                {timestampComments.length > 0 && (
                  <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto scrollbar-thin">
                    {timestampComments.map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded bg-slate-950 border border-slate-800/80 hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => seekTo(tc.timestampSeconds)}
                            className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 hover:bg-sky-900 border border-sky-800 text-[10px] font-mono font-bold"
                          >
                            ▶ {tc.timestampSeconds.toFixed(1)}s
                          </button>
                          <span className="text-slate-300">{tc.comment}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTimestampComment(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Character Script & Artist Notes */}
            <div className="p-5 rounded-xl bg-pdi-surface border border-pdi-border space-y-4">
              <h3 className="text-sm font-bold font-heading text-white flex items-center gap-2">
                <FileText size={16} className="text-cyber-lime" /> Character Script & Audition Context
              </h3>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                  Dialogue Line:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedSubmission.script || 'No script text attached to this challenge.'}
                </p>
              </div>

              {selectedSubmission.notes && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                    Artist's Notes for Evaluator:
                  </span>
                  <p className="text-slate-300 italic">"{selectedSubmission.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* 100-Point Rubric Breakdown Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <Award size={18} className="text-sky-400" /> 100-Point Rubric Scoring Breakdown
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Acting (25) + Timing (20) + Pronunciation (20) + Expression (20) + Audio (15)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Acting & Emotion */}
              <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 uppercase font-heading">
                    Acting / Emotion
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {scores.acting} / {REVIEW_RUBRIC_MAX.acting}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.acting}
                  value={scores.acting}
                  onChange={(e) =>
                    setScores({ ...scores, acting: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-400"
                />
                <input
                  type="number"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.acting}
                  value={scores.acting}
                  onChange={(e) =>
                    setScores({
                      ...scores,
                      acting: Math.min(
                        REVIEW_RUBRIC_MAX.acting,
                        Math.max(0, parseInt(e.target.value || '0', 10))
                      ),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-center font-mono text-white"
                />
              </div>

              {/* Lip Sync & Timing */}
              <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 uppercase font-heading">
                    Lip Sync / Timing
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {scores.timing} / {REVIEW_RUBRIC_MAX.timing}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.timing}
                  value={scores.timing}
                  onChange={(e) =>
                    setScores({ ...scores, timing: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-400"
                />
                <input
                  type="number"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.timing}
                  value={scores.timing}
                  onChange={(e) =>
                    setScores({
                      ...scores,
                      timing: Math.min(
                        REVIEW_RUBRIC_MAX.timing,
                        Math.max(0, parseInt(e.target.value || '0', 10))
                      ),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-center font-mono text-white"
                />
              </div>

              {/* Pronunciation */}
              <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 uppercase font-heading">
                    Pronunciation
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {scores.pronunciation} / {REVIEW_RUBRIC_MAX.pronunciation}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.pronunciation}
                  value={scores.pronunciation}
                  onChange={(e) =>
                    setScores({ ...scores, pronunciation: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-400"
                />
                <input
                  type="number"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.pronunciation}
                  value={scores.pronunciation}
                  onChange={(e) =>
                    setScores({
                      ...scores,
                      pronunciation: Math.min(
                        REVIEW_RUBRIC_MAX.pronunciation,
                        Math.max(0, parseInt(e.target.value || '0', 10))
                      ),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-center font-mono text-white"
                />
              </div>

              {/* Character Expression */}
              <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 uppercase font-heading">
                    Expression
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {scores.expression} / {REVIEW_RUBRIC_MAX.expression}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.expression}
                  value={scores.expression}
                  onChange={(e) =>
                    setScores({ ...scores, expression: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-400"
                />
                <input
                  type="number"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.expression}
                  value={scores.expression}
                  onChange={(e) =>
                    setScores({
                      ...scores,
                      expression: Math.min(
                        REVIEW_RUBRIC_MAX.expression,
                        Math.max(0, parseInt(e.target.value || '0', 10))
                      ),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-center font-mono text-white"
                />
              </div>

              {/* Audio Quality */}
              <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-200 uppercase font-heading">
                    Audio Quality
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {scores.audio} / {REVIEW_RUBRIC_MAX.audio}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.audio}
                  value={scores.audio}
                  onChange={(e) =>
                    setScores({ ...scores, audio: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-400"
                />
                <input
                  type="number"
                  min="0"
                  max={REVIEW_RUBRIC_MAX.audio}
                  value={scores.audio}
                  onChange={(e) =>
                    setScores({
                      ...scores,
                      audio: Math.min(
                        REVIEW_RUBRIC_MAX.audio,
                        Math.max(0, parseInt(e.target.value || '0', 10))
                      ),
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-center font-mono text-white"
                />
              </div>
            </div>
          </div>

          {/* Qualitative Feedback Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Executive Director Critique
              </label>
              <textarea
                rows={3}
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
                placeholder="High-level artistic evaluation of this audition take..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Key Strengths Demonstrated
              </label>
              <textarea
                rows={3}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="e.g. Dynamic range, authentic vocal grit, crisp enunciation..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Areas for Improvement / Coaching
              </label>
              <textarea
                rows={3}
                value={areasForImprovement}
                onChange={(e) => setAreasForImprovement(e.target.value)}
                placeholder="e.g. Watch plosives at 0:04, relax breath between phrases..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Optional Point Proposal Attachment (Preserving Locked Rule: Rubric Scores Do NOT Directly Grant Points) */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={attachPointProposal}
                  onChange={(e) => setAttachPointProposal(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs font-bold text-white uppercase font-heading">
                  Attach Point Proposal Recommendation to Admin Approval Queue
                </span>
              </label>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800">
                PRD Rule: Admin Approval Required
              </span>
            </div>

            {attachPointProposal && (
              <div className="space-y-3 pt-2 border-t border-slate-800 animate-fadeIn">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-[11px] font-mono text-slate-400">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProposalDelta(50);
                      setProposalCategory('scene_mastery');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400"
                  >
                    +50 Scene Mastery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProposalDelta(20);
                      setProposalCategory('audition_submitted');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400"
                  >
                    +20 Audition Submitted
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProposalDelta(100);
                      setProposalCategory('role_approved');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400"
                  >
                    +100 Role Approved
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Points Delta (+/-)
                    </label>
                    <input
                      type="number"
                      value={proposalDelta}
                      onChange={(e) => setProposalDelta(parseInt(e.target.value || '0', 10))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={proposalCategory}
                      onChange={(e) => setProposalCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Justification Rationale
                    </label>
                    <input
                      type="text"
                      value={proposalReason}
                      onChange={(e) => setProposalReason(e.target.value)}
                      placeholder="e.g. Scored 94 on Vance monologue"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Save Draft & Finalize Submission */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedSubmission(null)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveEvaluation('draft')}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Bookmark size={14} />
                {isSubmitting ? 'Saving Draft...' : 'Save Evaluation Draft'}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveEvaluation('submitted')}
                className="px-6 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                <Check size={14} />
                {isSubmitting ? 'Finalizing...' : 'Finalize & Submit Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pdi-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-400">Filter Queue:</span>
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  queueFilter === 'all'
                    ? 'bg-sky-500/20 border border-sky-500 text-sky-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Submissions ({queue.length})
              </button>
              <button
                onClick={() => setQueueFilter('pending')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  queueFilter === 'pending'
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending Review ({pendingCount})
              </button>
              <button
                onClick={() => setQueueFilter('reviewed')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  queueFilter === 'reviewed'
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            <button
              onClick={fetchQueue}
              disabled={isLoadingQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pdi-surface border border-pdi-border hover:border-slate-500 text-xs text-slate-300"
            >
              <RefreshCw size={13} className={isLoadingQueue ? 'animate-spin' : ''} />
              Refresh Queue
            </button>
          </div>

          {isLoadingQueue ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-sky-400" />
              Loading director review queue...
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              <ClipboardList size={32} className="mx-auto mb-2 text-slate-600" />
              <p>No submissions found matching this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl border border-pdi-border bg-pdi-surface hover:border-sky-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-base font-heading">
                        {item.challengeTitle}
                      </span>
                      <span className="text-xs font-mono text-sky-400">
                        • Role: {item.characterName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        Tier {item.targetRank} ({item.difficulty})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-slate-200">
                        <User size={13} /> {item.studentName}
                      </span>
                      <span>• Duration: {item.durationSeconds.toFixed(1)}s</span>
                      <span>• Submitted: {new Date(item.createdAt).toLocaleString()}</span>
                      <span className="capitalize">• Type: {item.submissionType}</span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-400 italic">
                        Artist note: "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {item.evaluation ? (
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            item.evaluation.status === 'submitted'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-sky-950 text-sky-300 border border-sky-700'
                          }`}
                        >
                          {item.evaluation.status === 'submitted'
                            ? `Reviewed (${item.evaluation.totalScore}/100)`
                            : 'Draft in Progress'}
                        </span>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Grade: {item.evaluation.grade}
                        </div>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-amber-950 text-amber-300 border border-amber-700">
                        Awaiting Review
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenEvaluation(item)}
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors whitespace-nowrap"
                    >
                      <Award size={14} />
                      {item.evaluation ? 'Edit Evaluation' : 'Evaluate Take'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STANDALONE PROPOSAL RECOMMENDATION TAB (PHASE 3 PRESERVED) */}
      {activeTab === 'recommendation' && (
        <div className="rounded-2xl border border-pdi-border bg-pdi-surface p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Send size={18} className="text-sky-400" /> Recommend Point Award or Deduction
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
              Admin Approval Required
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Directors submit formal recommendations with justification. Points are audited and applied after administrative approval.
          </p>

          {/* Quick Catalog Presets */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Standard Catalog Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {AWARDS_CATALOG.slice(0, 4).map((a) => (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => {
                    setStandaloneCategory(a.code.toLowerCase());
                    setStandaloneDelta(a.points);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <TrendingUp size={12} /> {a.name} (+{a.points})
                </button>
              ))}
              {DEDUCTIONS_CATALOG.slice(0, 3).map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => {
                    setStandaloneCategory(d.code.toLowerCase());
                    setStandaloneDelta(d.points);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <TrendingDown size={12} /> {d.name} ({d.points})
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleStandaloneProposalSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Student (Select or Enter ID)
              </label>
              <input
                type="text"
                list="student-artists-list"
                required
                value={targetStudentId}
                onChange={(e) => setTargetStudentId(e.target.value)}
                placeholder="Select student or paste MongoDB ID..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-sky-400"
              />
              <datalist id="student-artists-list">
                {artists.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.displayName} (Tier {a.currentRank})
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Points Value (+ / -)
              </label>
              <input
                type="number"
                required
                value={standaloneDelta}
                onChange={(e) => setStandaloneDelta(parseInt(e.target.value, 10))}
                placeholder="e.g. 50 or -20"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white font-mono focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={standaloneCategory}
                onChange={(e) => setStandaloneCategory(e.target.value)}
                placeholder="e.g. review_award, scene_mastery"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Evaluator's Detailed Justification (Auditable Record)
              </label>
              <textarea
                required
                rows={3}
                minLength={5}
                value={standaloneReason}
                onChange={(e) => setStandaloneReason(e.target.value)}
                placeholder="Provide specific scene context, performance notes, or observed technical defect..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                {isSubmitting ? 'Transmitting Proposal...' : 'Submit Recommendation to Admin Queue'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
