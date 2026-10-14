import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CheckSquare,
  Search,
  Check,
  X,
  RefreshCw,
  Scale,
  Undo2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

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

export const ApprovalQueuePage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeView, setActiveView] = useState<'proposals' | 'appeals'>('proposals');

  // Proposal State
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalStatus, setProposalStatus] = useState<string>('pending');
  const [proposalSearch, setProposalSearch] = useState<string>('');
  const [proposalPage, setProposalPage] = useState<number>(1);
  const [proposalTotalPages, setProposalTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(false);

  // Appeals State
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoadingAppeals, setIsLoadingAppeals] = useState<boolean>(false);
  const [appealResolutionNote, setAppealResolutionNote] = useState<Record<string, string>>({});

  // Decision Note Modal for Proposal
  const [activeProposalAction, setActiveProposalAction] = useState<{
    id: string;
    action: 'approve' | 'reject';
    studentName: string;
    delta: number;
  } | null>(null);
  const [actionDecisionNote, setActionDecisionNote] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProposals = async () => {
    setIsLoadingProposals(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `/api/v1/admin/point-proposals?status=${proposalStatus}&page=${proposalPage}&limit=10`;
      if (proposalSearch.trim()) {
        url += `&search=${encodeURIComponent(proposalSearch.trim())}`;
      }

      const res = await fetch(url, { headers, credentials: 'include' });
      if (res.ok) {
        const body = await res.json();
        setProposals(body.data?.proposals || []);
        if (body.data?.pagination) {
          setProposalTotalPages(body.data.pagination.totalPages || 1);
          setTotalCount(body.data.pagination.total || 0);
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
    fetchProposals();
    fetchAppeals();
  }, [token, proposalStatus, proposalPage]);

  const handleExecuteProposalAction = async () => {
    if (!activeProposalAction) return;

    setIsProcessingAction(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const endpoint = `/api/v1/admin/point-proposals/${activeProposalAction.id}/${activeProposalAction.action}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          decisionNote: actionDecisionNote.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Action execution failed');

      setFeedback({ type: 'success', message: body.message });
      setActiveProposalAction(null);
      setActionDecisionNote('');
      fetchProposals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error processing proposal' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleResolveAppeal = async (appealId: string, decision: 'grant' | 'reject') => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const note =
        appealResolutionNote[appealId] ||
        (decision === 'grant' ? 'Appeal granted upon administrative audit' : 'Appeal rejected');

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

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header Banner - Combo 05: Fresh Canopy (#2D3E2C) & Lime Sprout (#E4FD97) */}
      <div className="rounded-2xl border border-lime-sprout/40 bg-gradient-to-r from-fresh-canopy/90 via-slate-900 to-pdi-surface p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-fresh-canopy border border-lime-sprout text-lime-sprout flex items-center justify-center font-bold shadow-lg shadow-lime-sprout/10">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-heading text-white">
                  ADMINISTRATIVE APPROVAL QUEUE
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-lime-sprout/20 border border-lime-sprout/40 text-[10px] text-lime-sprout font-mono font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  Mandatory Oversight
                </span>
              </div>
              <p className="text-xs text-lime-sprout font-mono">
                Operator: {user?.displayName} • Dual-Control Approval for Sensitive Deductions & Awards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchProposals();
                fetchAppeals();
              }}
              disabled={isLoadingProposals || isLoadingAppeals}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw
                size={13}
                className={isLoadingProposals || isLoadingAppeals ? 'animate-spin' : ''}
              />
              <span>Refresh Queue</span>
            </button>
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

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-pdi-border pb-3">
        <button
          onClick={() => setActiveView('proposals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold transition-all ${
            activeView === 'proposals'
              ? 'bg-fresh-canopy text-lime-sprout border border-lime-sprout/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <CheckSquare size={14} />
          <span>Director Point Proposals ({totalCount})</span>
        </button>

        <button
          onClick={() => setActiveView('appeals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold transition-all ${
            activeView === 'appeals'
              ? 'bg-fresh-canopy text-lime-sprout border border-lime-sprout/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Scale size={14} />
          <span>Student Deduction Appeals ({appeals.length})</span>
        </button>
      </div>

      {/* VIEW 1: Proposals Queue */}
      {activeView === 'proposals' && (
        <div className="rounded-2xl border border-lime-sprout/30 bg-pdi-surface p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs font-mono">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setProposalStatus(st);
                      setProposalPage(1);
                    }}
                    className={`px-3 py-1 rounded capitalize transition-colors ${
                      proposalStatus === st
                        ? 'bg-fresh-canopy text-lime-sprout font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 font-mono">
                Showing {proposals.length} of {totalCount} records
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search category, reason..."
                value={proposalSearch}
                onChange={(e) => setProposalSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProposals()}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-sprout"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              No point proposals found matching status filter "{proposalStatus}".
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
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pdi-border/60">
                  {proposals.map((prop) => {
                    const isCredit = prop.delta > 0;
                    return (
                      <tr key={prop.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{prop.studentName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{prop.studentId}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{prop.requesterName}</td>
                        <td className="py-3 px-4 font-mono text-[10px] uppercase text-slate-400">
                          {prop.category}
                        </td>
                        <td className="py-3 px-4 max-w-sm text-slate-200">
                          <p>{prop.reason}</p>
                          {prop.decisionNote && (
                            <span className="text-[10px] text-lime-sprout font-mono block mt-1">
                              Note: {prop.decisionNote}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
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
                                onClick={() =>
                                  setActiveProposalAction({
                                    id: prop.id,
                                    action: 'approve',
                                    studentName: prop.studentName,
                                    delta: prop.delta,
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-fresh-canopy hover:bg-emerald-700 text-lime-sprout font-semibold flex items-center gap-1 transition-colors border border-lime-sprout/40"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() =>
                                  setActiveProposalAction({
                                    id: prop.id,
                                    action: 'reject',
                                    studentName: prop.studentName,
                                    delta: prop.delta,
                                  })
                                }
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

          {/* Pagination */}
          {proposalTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-pdi-border pt-4 text-xs text-slate-400">
              <span>
                Page {proposalPage} of {proposalTotalPages} ({totalCount} total proposals)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={proposalPage <= 1}
                  onClick={() => setProposalPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={proposalPage >= proposalTotalPages}
                  onClick={() => setProposalPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Student Appeals Queue */}
      {activeView === 'appeals' && (
        <div className="rounded-2xl border border-amber-500/30 bg-pdi-surface p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Scale size={14} /> Student Deduction Dispute Desk
              </span>
              <h2 className="text-lg font-bold font-heading text-white">
                Pending Deduction Appeals ({appeals.length})
              </h2>
            </div>
          </div>

          {appeals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              No pending deduction appeals currently in queue.
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
                      <span className="text-xs text-slate-400 font-mono ml-2">
                        ({appeal.studentEmail})
                      </span>
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
                        Original Deduction Context:
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
                      placeholder="Audit decision note..."
                      value={appealResolutionNote[appeal.id] || ''}
                      onChange={(e) =>
                        setAppealResolutionNote({
                          ...appealResolutionNote,
                          [appeal.id]: e.target.value,
                        })
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

      {/* Decision Confirmation Modal */}
      {activeProposalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-lime-sprout/40 bg-pdi-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-lime-sprout" />
                <span>
                  Confirm Proposal {activeProposalAction.action === 'approve' ? 'Approval' : 'Rejection'}
                </span>
              </h3>
              <button
                onClick={() => setActiveProposalAction(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are about to{' '}
              <strong className={activeProposalAction.action === 'approve' ? 'text-lime-sprout' : 'text-rose-400'}>
                {activeProposalAction.action.toUpperCase()}
              </strong>{' '}
              the point proposal for <strong>{activeProposalAction.studentName}</strong> (
              {activeProposalAction.delta > 0 ? `+${activeProposalAction.delta}` : activeProposalAction.delta} pts).
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Audit Decision Note (Optional)
              </label>
              <textarea
                rows={3}
                value={actionDecisionNote}
                onChange={(e) => setActionDecisionNote(e.target.value)}
                placeholder="Audit notes or feedback for the requester..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-lime-sprout"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveProposalAction(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleExecuteProposalAction}
                className={`px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-colors disabled:opacity-50 ${
                  activeProposalAction.action === 'approve'
                    ? 'bg-fresh-canopy hover:bg-emerald-700 text-lime-sprout border border-lime-sprout/50'
                    : 'bg-rose-700 hover:bg-rose-600 text-white'
                }`}
              >
                {isProcessingAction
                  ? 'Processing...'
                  : activeProposalAction.action === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
