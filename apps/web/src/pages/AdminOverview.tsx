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
} from 'lucide-react';
import { AWARDS_CATALOG, DEDUCTIONS_CATALOG } from '@pdi/shared';

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

export const AdminOverview: React.FC = () => {
  const { user, token } = useAuth();
  const [adminVerified, setAdminVerified] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
  const [adjustStudentId, setAdjustStudentId] = useState<string>('');
  const [artists, setArtists] = useState<{ userId: string; displayName: string; currentRank: string }[]>([]);
  const [adjustDelta, setAdjustDelta] = useState<number>(50);
  const [adjustCategory, setAdjustCategory] = useState<string>('training');
  const [adjustReason, setAdjustReason] = useState<string>('');
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

    fetch('/api/v1/leaderboard')
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data?.leaderboard) {
          setArtists(body.data.leaderboard);
        }
      })
      .catch((err) => console.warn('Failed to load artists:', err));
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
        message: `Points mutated: ${body.data.balanceBefore} -> ${body.data.balanceAfter} pts (${body.data.newRank} Tier). Transaction saved.`,
      });
      setAdjustReason('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to adjust points' });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Admin Executive Banner - Theme: Combo 05 Fresh Canopy (#2D3E2C) & Lime Sprout (#E4FD97) */}
      <div className="rounded-2xl border border-lime-sprout/40 bg-gradient-to-r from-fresh-canopy/90 via-slate-900 to-pdi-surface p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-fresh-canopy border border-lime-sprout text-lime-sprout flex items-center justify-center font-bold shadow-lg shadow-lime-sprout/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-white">
                PDI ADMINISTRATION COMMAND CONSOLE
              </h1>
              {adminVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-lime-sprout/20 border border-lime-sprout/40 text-[10px] text-lime-sprout font-mono font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  Live RBAC Clearance Level 1
                </span>
              )}
            </div>
            <p className="text-xs text-lime-sprout font-mono">
              Administrator: {user?.displayName} ({user?.email}) • Theme: Combo 05 (Fresh Canopy & Lime Sprout)
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border border-rose-800 text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <span className="text-[11px] text-slate-300 mt-1 block">Search, moderate, & delete extra/test IDs</span>
        </Link>

        <div className="rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">Approval Queue</span>
            <CheckSquare className="w-4 h-4 text-lime-sprout" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-white mt-2">
            {proposals.length} Items
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Filtered proposals queue</span>
        </div>

        <div className="rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">Open Appeals</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-amber-400 mt-2">
            {appeals.length} Pending
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Student deduction dispute desk</span>
        </div>

        <div className="rounded-xl border border-lime-sprout/30 bg-fresh-canopy/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-300">Ledger Security</span>
            <ShieldCheck className="w-4 h-4 text-lime-sprout" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-lime-sprout mt-2">ACID Valid</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Additive inverse reversal engine</span>
        </div>
      </div>

      {/* Phase 3: Interactive Admin Approval Queue */}
      <div className="rounded-2xl border border-lime-sprout/30 bg-pdi-surface p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-lime-sprout font-bold">
              Director Oversight & Approval Queue
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
            <table className="w-full text-left text-xs">
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

      {/* Phase 3: Appeals Resolution Desk (Additive Inverse Reversals) */}
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
              Granting an appeal records an <strong>additive inverse transaction</strong> (+delta), restoring points and rank without deleting past records.
            </p>
          </div>

          <button
            onClick={fetchAppeals}
            disabled={isLoadingAppeals}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw size={13} className={isLoadingAppeals ? 'animate-spin' : ''} /> Refresh Appeals
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

      {/* Direct Authoritative Point Adjustment (Admin Tool) */}
      <div className="rounded-2xl border border-lime-sprout/30 bg-pdi-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold font-heading text-white mb-2 flex items-center gap-2">
          <Send size={18} className="text-lime-sprout" /> Direct Points Mutation (Authoritative Ledger)
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Direct administrator point credits or approved deductions. Commits immediately in an ACID transaction and updates artist rank automatically.
        </p>

        <form onSubmit={handleDirectAdjust} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Student User ID
            </label>
            <input
              type="text"
              list="admin-artists-list"
              required
              value={adjustStudentId}
              onChange={(e) => setAdjustStudentId(e.target.value)}
              placeholder="Select student or paste ID..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-lime-sprout"
            />
            <datalist id="admin-artists-list">
              {artists.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.displayName} (Tier {a.currentRank})
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Points Delta (+ / -)
            </label>
            <input
              type="number"
              required
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10))}
              placeholder="e.g. 100 or -25"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white font-mono focus:outline-none focus:border-lime-sprout"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={adjustCategory}
              onChange={(e) => setAdjustCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-lime-sprout"
            >
              <option value="training">Training Session (+50)</option>
              <option value="audition">Audition Submitted (+20)</option>
              <option value="role_approved">Role Approved (+100)</option>
              <option value="scene_mastery">Scene Mastery (+100)</option>
              <option value="consistency">Consistency Milestone (+200)</option>
              <option value="deduction_pronunciation">Pronunciation Deduction (-10)</option>
              <option value="deduction_lipsync">Lip Sync Deduction (-20)</option>
              <option value="deduction_audio">Audio Quality Deduction (-25)</option>
              <option value="deduction_deadline">Missed Deadline (-30)</option>
              <option value="admin_adjustment">Custom Admin Adjustment</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isAdjusting}
              className="w-full admin-theme-btn py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {isAdjusting ? 'Committing...' : 'Apply Mutation'}
            </button>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Authoritative Reason / Audit Note
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Detailed justification for audit log (e.g. 'Completed Advanced Anime Scene #3 with 98% lip sync fidelity')..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-lime-sprout"
            />
          </div>
        </form>
      </div>

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
