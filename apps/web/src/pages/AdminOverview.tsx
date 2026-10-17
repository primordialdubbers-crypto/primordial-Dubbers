import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  CheckSquare,
  Sliders,
  AlertTriangle,
  Send,
  Check,
  X,
  RefreshCw,
  Search,
  Scale,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  UserCheck
} from 'lucide-react';
import { AWARDS_CATALOG, DEDUCTIONS_CATALOG, STAFF_AWARDS_CATALOG } from '@pdi/shared';

interface Proposal {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  delta: number;
  category: string;
  reason: string;
  sourceType: string;
  status: string;
  requesterName: string;
  deciderName?: string;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

interface Appeal {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  transactionId: string;
  transactionDelta: number;
  transactionReason: string;
  transactionCategory: string;
  reason: string;
  evidenceText?: string;
  status: string;
  deciderName?: string;
  decisionNote?: string;
  createdAt: string;
}

interface ArtistItem {
  userId: string;
  displayName: string;
  email?: string;
  currentRank: string;
  rankPoints: number;
  roles?: string[];
  staffDesignation?: string;
}

export const AdminOverview: React.FC = () => {
  const { user, token } = useAuth();
  const [adminVerified, setAdminVerified] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active section view state
  const [activeTab, setActiveTab] = useState<'points' | 'proposals' | 'appeals' | 'catalogs'>('points');

  // Proposals State
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalStatus, setProposalStatus] = useState<string>('pending');
  const [proposalSearch, setProposalSearch] = useState<string>('');
  const [proposalPage, setProposalPage] = useState<number>(1);
  const [proposalTotalPages, setProposalTotalPages] = useState<number>(1);
  const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(false);

  // Appeals State
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoadingAppeals, setIsLoadingAppeals] = useState<boolean>(false);
  const [appealResolutionNote, setAppealResolutionNote] = useState<Record<string, string>>({});

  // Direct adjustment form state
  const [pointsRecipientType, setPointsRecipientType] = useState<'student' | 'staff'>('student');
  const [adjustStudentId, setAdjustStudentId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [staffList, setStaffList] = useState<ArtistItem[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState<boolean>(false);
  const [adjustDelta, setAdjustDelta] = useState<number>(50);
  const [adjustCategory, setAdjustCategory] = useState<string>('training');
  const [adjustReason, setAdjustReason] = useState<string>('Completed scheduled dubbing training session');
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  const fetchProposals = async () => {
    setIsLoadingProposals(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `/api/v1/admin/point-proposals?status=${proposalStatus}&page=${proposalPage}&limit=10`;
      if (proposalSearch.trim()) {
        url += `&search=${encodeURIComponent(proposalSearch.trim())}`;
      }

      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        setProposals(body.data?.proposals || []);
        if (body.data?.pagination) {
          setProposalTotalPages(body.data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.warn('Failed to load proposals:', err);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const fetchAppeals = async () => {
    setIsLoadingAppeals(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/admin/appeals?status=pending', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        setAppeals(body.data?.appeals || []);
      }
    } catch (err) {
      console.warn('Failed to load appeals:', err);
    } finally {
      setIsLoadingAppeals(false);
    }
  };

  const fetchArtists = async () => {
    setIsLoadingArtists(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/admin/users?limit=100', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data?.users) {
          const rawUsers = body.data.users;

          const studentList: ArtistItem[] = rawUsers
            .filter(
              (u: any) =>
                u.roles?.includes('student') &&
                !u.roles?.includes('director') &&
                !u.roles?.includes('admin') &&
                !u.roles?.includes('superadmin')
            )
            .map((u: any) => ({
              userId: u.id,
              displayName: u.displayName,
              email: u.email,
              currentRank: u.currentRank || 'ED',
              rankPoints: u.rankPoints ?? 0,
              roles: u.roles,
            }));
          setArtists(studentList);

          const staffUserList: ArtistItem[] = rawUsers
            .filter((u: any) =>
              u.roles?.some((r: string) => ['admin', 'director', 'superadmin'].includes(r))
            )
            .map((u: any) => ({
              userId: u.id,
              displayName: u.displayName,
              email: u.email,
              currentRank: u.currentRank || 'ED',
              rankPoints: u.rankPoints ?? 0,
              roles: u.roles,
              staffDesignation: u.staffDesignation,
            }));
          setStaffList(staffUserList);

          if (!adjustStudentId) {
            if (pointsRecipientType === 'student' && studentList.length > 0) {
              setAdjustStudentId(studentList[0].userId);
            } else if (pointsRecipientType === 'staff' && staffUserList.length > 0) {
              setAdjustStudentId(staffUserList[0].userId);
            }
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load users for points:', e);
    } finally {
      setIsLoadingArtists(false);
    }

    // Fallback to leaderboard if users endpoint not available
    fetch('/api/v1/leaderboard')
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data?.leaderboard) {
          setArtists(body.data.leaderboard);
          if (body.data.leaderboard.length > 0 && !adjustStudentId) {
            setAdjustStudentId(body.data.leaderboard[0].userId);
          }
        }
      })
      .catch((err) => console.warn('Failed to load artists:', err));
  };

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/v1/admin/overview-summary', {
      headers,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data) {
          setAdminVerified(true);
        }
      })
      .catch((err) => console.warn('Admin clearance verification failed:', err));

    fetchProposals();
    fetchAppeals();
    fetchArtists();
  }, [token, proposalStatus, proposalPage]);

  const handleApproveProposal = async (id: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/point-proposals/${id}/approve`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ decisionNote: 'Approved in administrative console' }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Approval failed');

      setFeedback({ type: 'success', message: body.message });
      fetchProposals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error approving proposal' });
    }
  };

  const handleRejectProposal = async (id: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/point-proposals/${id}/reject`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ decisionNote: 'Rejected in administrative console' }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Rejection failed');

      setFeedback({ type: 'success', message: 'Proposal rejected' });
      fetchProposals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error rejecting proposal' });
    }
  };

  const handleResolveAppeal = async (appealId: string, decision: 'grant' | 'reject') => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const note = appealResolutionNote[appealId] || (decision === 'grant' ? 'Appeal granted upon investigation' : 'Appeal rejected');

      const res = await fetch(`/api/v1/admin/appeals/${appealId}/resolve`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          decision,
          decisionNote: note,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to resolve appeal');

      setFeedback({ type: 'success', message: body.message });
      fetchAppeals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error resolving appeal' });
    }
  };

  const handleDirectAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStudentId.trim() || !adjustReason.trim()) return;

    setIsAdjusting(true);
    setFeedback(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const idempotencyKey = `admin_adj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await fetch('/api/v1/admin/points/adjust', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          studentId: adjustStudentId.trim(),
          delta: Number(adjustDelta),
          reason: adjustReason.trim(),
          category: adjustCategory,
          idempotencyKey,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Points adjustment failed');

      setFeedback({
        type: 'success',
        message: `Points updated successfully: ${body.data.balanceBefore} -> ${body.data.balanceAfter} pts (${body.data.newRank} Tier). Transaction saved in ledger.`,
      });

      // Update local state for immediate feedback
      setArtists((prev) =>
        prev.map((a) =>
          a.userId === adjustStudentId
            ? { ...a, rankPoints: body.data.balanceAfter, currentRank: body.data.newRank }
            : a
        )
      );
      setStaffList((prev) =>
        prev.map((s) =>
          s.userId === adjustStudentId
            ? { ...s, rankPoints: body.data.balanceAfter, currentRank: body.data.newRank }
            : s
        )
      );
      setAdjustReason('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to adjust points' });
    } finally {
      setIsAdjusting(false);
    }
  };

  // Quick preset selector
  const applyPreset = (delta: number, category: string, reason: string) => {
    setAdjustDelta(delta);
    setAdjustCategory(category);
    setAdjustReason(reason);
  };

  const currentList = pointsRecipientType === 'staff' ? staffList : artists;
  const filteredList = currentList.filter((a) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase().trim();
    return (
      a.displayName.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.staffDesignation && a.staffDesignation.toLowerCase().includes(q)) ||
      (a.roles && a.roles.some((r) => r.toLowerCase().includes(q)))
    );
  });
  const selectedArtist = currentList.find((a) => a.userId === adjustStudentId);

  return (
    <div className="flex flex-col gap-6">
      {/* Admin Executive Banner - Theme: Combo 05 Fresh Canopy (#2D3E2C) & Lime Sprout (#E4FD97) */}
      <div className="rounded-2xl border border-lime-sprout/40 bg-gradient-to-r from-fresh-canopy/90 via-slate-900 to-pdi-surface p-6 md:p-7 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-fresh-canopy border border-lime-sprout text-lime-sprout flex items-center justify-center font-bold shadow-lg shadow-lime-sprout/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                  PDI ADMINISTRATION COMMAND CONSOLE
                </h1>
                {adminVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-lime-sprout/20 border border-lime-sprout/40 text-[10px] text-lime-sprout font-mono font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    Level 1
                  </span>
                )}
              </div>
              <p className="text-xs text-lime-sprout font-mono">
                Administrator: {user?.displayName} ({user?.email}) • Authoritative Control Desk
              </p>
            </div>
          </div>

          {/* User Management shortcut button */}
          <Link
            to="/admin/users"
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-fresh-canopy/80 hover:bg-lime-sprout hover:text-black text-lime-sprout border border-lime-sprout/50 text-xs font-bold font-heading flex items-center gap-2 transition-all shadow-md group"
          >
            <Users size={16} />
            <span>USER DIRECTORY & DELETION</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-500/60 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-rose-400" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Admin Module Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('points')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'points'
              ? 'bg-lime-sprout text-black font-bold shadow-md shadow-lime-sprout/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Zap size={14} />
          <span>⚡ Give / Deduct Points</span>
        </button>

        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'proposals'
              ? 'bg-lime-sprout text-black font-bold shadow-md shadow-lime-sprout/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <CheckSquare size={14} />
          <span>Proposals Queue ({proposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === 'appeals'
              ? 'bg-lime-sprout text-black font-bold shadow-md shadow-lime-sprout/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Scale size={14} />
          <span>Student Appeals ({appeals.length})</span>
        </button>

        <Link
          to="/admin/users"
          className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-lime-sprout flex items-center gap-1.5 transition-all"
        >
          <Users size={14} />
          <span>👥 User Accounts & Deletion</span>
        </Link>

        <Link
          to="/challenges"
          className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-sky-300 flex items-center gap-1.5 transition-all"
        >
          <Sparkles size={14} />
          <span>🎬 Auditions & Materials</span>
        </Link>
      </div>

      {/* SECTION 1: PROMINENT DIRECT POINTS MUTATION CONSOLE */}
      {activeTab === 'points' && (
        <div className="rounded-2xl border-2 border-lime-sprout/60 bg-gradient-to-b from-fresh-canopy/40 via-pdi-surface to-slate-950 p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-lime-sprout/20 pb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-lime-sprout font-bold flex items-center gap-1.5">
                <Zap size={14} /> Authoritative Server-Side Points Engine
              </span>
              <h2 className="text-xl font-bold font-heading text-white mt-0.5">
                DIRECT POINTS MUTATION (AWARD OR DEDUCT POINTS)
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Select any registered voice artist and mutate points directly. Automatically commits to the ACID ledger, updates rank tier, and registers an immutable transaction.
              </p>
            </div>

            <button
              onClick={fetchArtists}
              disabled={isLoadingArtists}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw size={13} className={isLoadingArtists ? 'animate-spin' : ''} />
              <span>Refresh Students</span>
            </button>
          </div>

          {/* Target Audience Switcher: Students vs Staff */}
          <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 w-fit">
            <button
              type="button"
              onClick={() => {
                setPointsRecipientType('student');
                setUserSearchQuery('');
                if (artists.length > 0) setAdjustStudentId(artists[0].userId);
                applyPreset(50, 'training', 'Completed scheduled dubbing training session');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                pointsRecipientType === 'student'
                  ? 'bg-lime-sprout text-black font-bold shadow-md shadow-lime-sprout/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={14} />
              <span>🎙️ Voice Artists / Students</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPointsRecipientType('staff');
                setUserSearchQuery('');
                if (staffList.length > 0) setAdjustStudentId(staffList[0].userId);
                applyPreset(50, 'evaluation', 'Timely Audition Review & Scoring');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                pointsRecipientType === 'staff'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck size={14} className="text-amber-300" />
              <span>👔 Academy Staff & Mentors</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                Staff Points
              </span>
            </button>
          </div>

          {/* Quick Presets Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              {pointsRecipientType === 'staff'
                ? 'Staff Performance Merit Presets:'
                : 'Voice Artist 1-Click Presets:'}
            </span>

            {pointsRecipientType === 'staff' ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {STAFF_AWARDS_CATALOG.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => applyPreset(item.points, item.category, item.name)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900 transition-colors font-medium flex items-center gap-1.5"
                  >
                    <span>⭐ {item.name}</span>
                    <span className="font-mono text-amber-300 font-bold">+{item.points}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset(50, 'training', 'Completed scheduled dubbing training session')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition-colors font-medium"
                >
                  ⭐ Training (+50)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(100, 'role_approved', 'Cast and approved for official character role')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition-colors font-medium"
                >
                  🎬 Role Approved (+100)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(100, 'scene_mastery', 'Demonstrated exceptional lip sync scene mastery')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition-colors font-medium"
                >
                  🌟 Scene Mastery (+100)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(20, 'audition', 'Submitted verified audition challenge')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition-colors font-medium"
                >
                  🎙️ Audition Take (+20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(200, 'consistency', 'Maintained 30-day streak of active dubbing takes')}
                  className="px-2.5 py-1 rounded-lg bg-lime-950/80 text-lime-300 border border-lime-700/60 hover:bg-lime-900 transition-colors font-medium"
                >
                  🏆 Consistency (+200)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(-10, 'deduction_pronunciation', 'Phonetic/pronunciation defect on key dialogue')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900 transition-colors font-medium"
                >
                  ⚠️ Pronunciation (-10)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(-20, 'deduction_lipsync', 'Severe lip sync mismatch (>300ms drift)')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900 transition-colors font-medium"
                >
                  ⚠️ Lip Sync (-20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(-25, 'deduction_audio', 'Excessive room reverb, distortion, or background noise')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900 transition-colors font-medium"
                >
                  ⚠️ Audio Quality (-25)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(-30, 'deduction_deadline', 'Failed to submit scene audition by scheduled deadline')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900 transition-colors font-medium"
                >
                  ⚠️ Deadline (-30)
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleDirectAdjust} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* User Dropdown with Name Search */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {pointsRecipientType === 'staff'
                      ? 'Select Staff Member (Search by Name / Role)'
                      : 'Select Voice Artist (Search by Name / Email)'}
                  </label>
                  {userSearchQuery && (
                    <span className="text-[10px] font-mono text-lime-sprout">
                      Found {filteredList.length} of {currentList.length}
                    </span>
                  )}
                </div>

                {/* Instant Name / Email Search Box */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      const q = e.target.value.toLowerCase().trim();
                      if (q) {
                        const firstMatch = currentList.find(
                          (a) =>
                            a.displayName.toLowerCase().includes(q) ||
                            (a.email && a.email.toLowerCase().includes(q)) ||
                            (a.staffDesignation && a.staffDesignation.toLowerCase().includes(q))
                        );
                        if (firstMatch) {
                          setAdjustStudentId(firstMatch.userId);
                        }
                      }
                    }}
                    placeholder={
                      pointsRecipientType === 'staff'
                        ? '🔍 Type name (e.g. John, Mentor, Editor, Developer)...'
                        : '🔍 Type artist name or email to quickly filter...'
                    }
                    className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-sprout font-medium"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown populated from filteredList */}
                <select
                  required
                  value={adjustStudentId}
                  onChange={(e) => setAdjustStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-sprout font-medium"
                >
                  <option value="">
                    {pointsRecipientType === 'staff'
                      ? '-- Choose academy staff member --'
                      : '-- Choose registered student --'}
                  </option>
                  {filteredList.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.displayName} {a.email ? `(${a.email})` : ''} {a.staffDesignation ? `— [${a.staffDesignation}]` : ''} — Tier {a.currentRank} • {a.rankPoints.toLocaleString()} PTS
                    </option>
                  ))}
                  {filteredList.length === 0 && (
                    <option disabled value="">
                      No users match "{userSearchQuery}"
                    </option>
                  )}
                </select>
              </div>

              {/* Points Delta Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Points Mutation Delta (+ / -)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 50 or -20"
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border text-sm font-mono font-bold focus:outline-none ${
                      adjustDelta >= 0
                        ? 'border-emerald-700 text-emerald-400 focus:border-emerald-500'
                        : 'border-rose-700 text-rose-400 focus:border-rose-500'
                    }`}
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-mono text-slate-400 pointer-events-none">
                    PTS
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Target Live Preview */}
            {selectedArtist && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-lime-sprout" />
                  <span className="text-slate-300">Target {pointsRecipientType === 'staff' ? 'Staff' : 'Artist'}:</span>
                  <strong className="text-white">{selectedArtist.displayName}</strong>
                  <span className="text-slate-400 font-mono">({selectedArtist.email})</span>
                  {selectedArtist.roles && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                      {selectedArtist.roles.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span>Current: <strong className="text-cyber-lime">{selectedArtist.rankPoints.toLocaleString()} PTS</strong> (Tier {selectedArtist.currentRank})</span>
                  <span>&rarr;</span>
                  <span>
                    New Balance:{' '}
                    <strong className={selectedArtist.rankPoints + adjustDelta >= selectedArtist.rankPoints ? 'text-emerald-400' : 'text-rose-400'}>
                      {Math.max(0, selectedArtist.rankPoints + adjustDelta).toLocaleString()} PTS
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Classification Category
                </label>
                <select
                  value={adjustCategory}
                  onChange={(e) => setAdjustCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-sprout"
                >
                  {pointsRecipientType === 'staff' ? (
                    <>
                      <option value="evaluation">Audition Evaluation & Scoring</option>
                      <option value="casting">Talent Casting & Role Selection</option>
                      <option value="quality_control">Script & Audio QC Audit</option>
                      <option value="mentorship">Workshop & Student Mentorship</option>
                      <option value="governance">Executive Administrative Merit</option>
                      <option value="admin_adjustment">Custom Staff Adjustment</option>
                    </>
                  ) : (
                    <>
                      <option value="training">Training Session (+50)</option>
                      <option value="audition">Audition Submitted (+20)</option>
                      <option value="role_approved">Role Approved (+100)</option>
                      <option value="scene_mastery">Scene Mastery (+100)</option>
                      <option value="consistency">Consistency Milestone (+200)</option>
                      <option value="deduction_pronunciation">Pronunciation Deduction (-10)</option>
                      <option value="deduction_lipsync">Lip Sync Deduction (-20)</option>
                      <option value="deduction_audio">Audio Quality Deduction (-25)</option>
                      <option value="deduction_deadline">Missed Deadline (-30)</option>
                      <option value="admin_adjustment">Custom Administrative Adjustment</option>
                    </>
                  )}
                </select>
              </div>

              {/* Reason */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Authoritative Justification / Reason
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for audit log (e.g. 'Completed anime dubbing take #2 with excellent emotion')..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-sprout"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAdjusting || !adjustStudentId}
              className="w-full py-3 rounded-xl bg-lime-sprout text-black font-heading font-black text-sm uppercase tracking-wider hover:bg-lime-400 shadow-xl shadow-lime-sprout/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <Zap size={16} />
              <span>{isAdjusting ? 'COMMITTING TO LEDGER...' : 'COMMIT POINTS TO LEDGER'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/users"
          className="rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5 hover:border-lime-sprout transition-all group shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">User Directory</span>
            <Users className="w-4 h-4 text-lime-sprout group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-lime-sprout mt-2 flex items-center justify-between">
            <span>Manage Users</span>
            <span className="text-xs font-normal underline">Open &rarr;</span>
          </div>
          <span className="text-[11px] text-slate-300 mt-1 block">Search, reset passwords, & delete IDs</span>
        </Link>

        <button
          onClick={() => setActiveTab('proposals')}
          className="text-left rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5 hover:border-lime-sprout transition-all shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">Approval Queue</span>
            <CheckSquare className="w-4 h-4 text-lime-sprout" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-white mt-2">
            {proposals.length} Items
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Click to view proposals queue</span>
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className="text-left rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5 hover:border-lime-sprout transition-all shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">Open Appeals</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-amber-400 mt-2">
            {appeals.length} Pending
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Student deduction dispute desk</span>
        </button>

        <Link
          to="/challenges"
          className="rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5 hover:border-lime-sprout transition-all shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">Auditions Desk</span>
            <Sparkles className="w-4 h-4 text-lime-sprout" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-lime-sprout mt-2 flex items-center justify-between">
            <span>Challenges</span>
            <span className="text-xs font-normal underline">Manage &rarr;</span>
          </div>
          <span className="text-[11px] text-slate-300 mt-1 block">Upload scripts, clips & materials</span>
        </Link>
      </div>

      {/* SECTION 2: PROPOSALS MANAGEMENT QUEUE */}
      {(activeTab === 'proposals' || activeTab === 'points') && (
        <div className="rounded-2xl border border-lime-sprout/30 bg-pdi-surface p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-lime-sprout font-bold">
                Director Recommendations Queue
              </span>
              <h2 className="text-lg font-bold font-heading text-white">
                Point Proposals Management
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs font-mono">
                <button
                  onClick={() => { setProposalStatus('pending'); setProposalPage(1); }}
                  className={`px-3 py-1 rounded transition-colors ${
                    proposalStatus === 'pending' ? 'bg-fresh-canopy text-lime-sprout font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => { setProposalStatus('approved'); setProposalPage(1); }}
                  className={`px-3 py-1 rounded transition-colors ${
                    proposalStatus === 'approved' ? 'bg-fresh-canopy text-lime-sprout font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => { setProposalStatus('rejected'); setProposalPage(1); }}
                  className={`px-3 py-1 rounded transition-colors ${
                    proposalStatus === 'rejected' ? 'bg-fresh-canopy text-lime-sprout font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rejected
                </button>
                <button
                  onClick={() => { setProposalStatus('all'); setProposalPage(1); }}
                  className={`px-3 py-1 rounded transition-colors ${
                    proposalStatus === 'all' ? 'bg-fresh-canopy text-lime-sprout font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search reason, category..."
                  value={proposalSearch}
                  onChange={(e) => setProposalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProposals()}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-sprout"
                />
                <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
              </div>

              <button
                onClick={fetchProposals}
                disabled={isLoadingProposals}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
              >
                <RefreshCw size={13} className={isLoadingProposals ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              No proposals found matching status filter "{proposalStatus}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-900 border-b border-pdi-border text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Recommended By</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Reason & Justification</th>
                    <th className="py-3 px-4 text-right">Points Delta</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pdi-border/60">
                  {proposals.map((prop) => {
                    const isCredit = prop.delta > 0;
                    return (
                      <tr key={prop.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{prop.studentName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{prop.studentId}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{prop.requesterName}</td>
                        <td className="py-3 px-4 font-mono text-[10px] uppercase text-slate-400">
                          {prop.category}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-200">
                          <p>{prop.reason}</p>
                          {prop.decisionNote && (
                            <span className="text-[10px] text-lime-sprout font-mono block mt-0.5">
                              Note: {prop.decisionNote}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                              isCredit
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {isCredit ? `+${prop.delta}` : prop.delta}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              prop.status === 'approved'
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                                : prop.status === 'rejected'
                                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/60'
                                : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                            }`}
                          >
                            {prop.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {prop.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveProposal(prop.id)}
                                className="px-2.5 py-1 rounded bg-fresh-canopy hover:bg-emerald-700 text-lime-sprout font-semibold flex items-center gap-1 transition-colors border border-lime-sprout/40"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectProposal(prop.id)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 text-slate-400 font-semibold flex items-center gap-1 transition-colors"
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">
                              {prop.deciderName ? `Decided by ${prop.deciderName}` : 'Decided'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          {proposalTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-pdi-border pt-4 mt-4 text-xs text-slate-400">
              <span>Page {proposalPage} of {proposalTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={proposalPage <= 1}
                  onClick={() => setProposalPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={proposalPage >= proposalTotalPages}
                  onClick={() => setProposalPage((p) => p + 1)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: APPEALS RESOLUTION DESK */}
      {(activeTab === 'appeals' || activeTab === 'points') && (
        <div className="rounded-2xl border border-amber-500/30 bg-pdi-surface p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Scale size={14} /> Student Deduction Dispute Desk
              </span>
              <h2 className="text-lg font-bold font-heading text-white">
                Pending Student Appeals ({appeals.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Granting an appeal records an <strong>additive inverse transaction</strong> (+delta), restoring points and rank without mutating past history.
              </p>
            </div>

            <button
              onClick={fetchAppeals}
              disabled={isLoadingAppeals}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw size={13} className={isLoadingAppeals ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {appeals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              No pending student deduction appeals awaiting resolution.
            </div>
          ) : (
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="font-bold text-white text-sm">{appeal.studentName}</span>
                      <span className="text-xs text-slate-400 font-mono ml-2">({appeal.studentEmail})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-950 text-rose-300 border border-rose-800">
                        Contested Deduction: {appeal.transactionDelta} pts
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(appeal.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Original Deduction Reason:
                      </span>
                      <p className="text-slate-300 font-medium">{appeal.transactionReason}</p>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">
                        Category: {appeal.transactionCategory}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-1">
                        Student Justification & Evidence:
                      </span>
                      <p className="text-white font-medium">{appeal.reason}</p>
                      {appeal.evidenceText && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          Evidence: "{appeal.evidenceText}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="Decision note (optional audit justification)..."
                      value={appealResolutionNote[appeal.id] || ''}
                      onChange={(e) =>
                        setAppealResolutionNote({ ...appealResolutionNote, [appeal.id]: e.target.value })
                      }
                      className="w-full sm:w-80 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveAppeal(appeal.id, 'grant')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Undo2 size={13} /> Grant Reversal (+{Math.abs(appeal.transactionDelta)} pts)
                      </button>
                      <button
                        onClick={() => handleResolveAppeal(appeal.id, 'reject')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 text-slate-400 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <X size={13} /> Reject Appeal
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Catalog & Configuration Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
          <h2 className="text-base font-bold font-heading text-white mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-lime-sprout" />
            <span>Configured Point Awards (PRD Baseline)</span>
          </h2>
          <div className="space-y-2">
            {AWARDS_CATALOG.map((a) => (
              <div
                key={a.code}
                className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-slate-800 text-xs"
              >
                <span className="text-slate-200">{a.name}</span>
                <span className="font-mono font-bold text-lime-sprout">+{a.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6">
          <h2 className="text-base font-bold font-heading text-white mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-400" />
            <span>Configured Point Deductions (Admin Approval Required)</span>
          </h2>
          <div className="space-y-2">
            {DEDUCTIONS_CATALOG.map((d) => (
              <div
                key={d.code}
                className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-slate-800 text-xs"
              >
                <span className="text-slate-200">{d.name}</span>
                <span className="font-mono font-bold text-rose-400">{d.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
