import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import { RANK_TIERS, RankTier, PointTransactionRecord, RankEventRecord, AppealRecord } from '@pdi/shared';
import {
  TrendingUp,
  TrendingDown,
  Award,
  History,
  Sparkles,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  Scale,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PointsData {
  currentPoints: number;
  currentRank: RankTier;
  nextRank: RankTier | null;
  pointsToNextRank: number;
  rankProgressPercent: number;
  totalEarned: number;
  totalDeducted: number;
  transactions: PointTransactionRecord[];
}

export const PointsLedgerPage: React.FC = () => {
  const { token, profile } = useAuth();
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [rankEvents, setRankEvents] = useState<RankEventRecord[]>([]);
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'rankEvents' | 'appeals'>('ledger');
  const [filter, setFilter] = useState<'all' | 'awards' | 'deductions'>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Appeal Modal State
  const [appealModalTx, setAppealModalTx] = useState<PointTransactionRecord | null>(null);
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealEvidence, setAppealEvidence] = useState<string>('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState<boolean>(false);
  const [appealModalError, setAppealModalError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [pointsRes, rankRes, appealsRes] = await Promise.all([
        fetch('/api/v1/me/points', { headers, credentials: 'include' }),
        fetch('/api/v1/me/rank-history', { headers, credentials: 'include' }),
        fetch('/api/v1/me/appeals', { headers, credentials: 'include' }),
      ]);

      if (!pointsRes.ok) throw new Error('Failed to load points history');
      const pointsJson = await pointsRes.json();
      setPointsData(pointsJson.data);

      if (rankRes.ok) {
        const rankJson = await rankRes.json();
        setRankEvents(rankJson.data?.rankEvents || []);
      }

      if (appealsRes.ok) {
        const appealsJson = await appealsRes.json();
        setAppeals(appealsJson.data?.appeals || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error connecting to points ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const currentRank = pointsData?.currentRank || profile?.currentRank || 'ED';
  const currentPoints = pointsData?.currentPoints ?? profile?.rankPoints ?? 0;
  const rankDef = RANK_TIERS[currentRank];

  const filteredTransactions = (pointsData?.transactions || []).filter((tx) => {
    if (filter === 'awards') return tx.delta > 0;
    if (filter === 'deductions') return tx.delta < 0;
    return true;
  });

  const handleOpenAppealModal = (tx: PointTransactionRecord) => {
    setAppealModalTx(tx);
    setAppealReason('');
    setAppealEvidence('');
    setAppealModalError(null);
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealModalTx) return;

    if (appealReason.trim().length < 10) {
      setAppealModalError('Appeal justification must be at least 10 characters.');
      return;
    }

    setIsSubmittingAppeal(true);
    setAppealModalError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/me/appeals', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          transactionId: appealModalTx.id,
          reason: appealReason.trim(),
          evidenceText: appealEvidence.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Failed to submit appeal');
      }

      setAppealModalTx(null);
      setSuccessMsg('Appeal submitted successfully! An administrator will review your dispute.');
      fetchData();
    } catch (err: any) {
      setAppealModalError(err?.message || 'Error submitting appeal');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const getAppealForTx = (txId: string) => {
    return appeals.find((a) => a.transactionId === txId);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pdi-border pb-5">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-cyber-lime font-bold">
            Authoritative Ledger & Appeals
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
            Points Ledger & Appeals System
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable transactional record. Every point credit, deduction, and appeal reversal is audited and permanent.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-pdi-surface border border-pdi-border hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh Ledger
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline text-red-200">
            Retry
          </button>
        </div>
      )}

      {/* Hero Overview Card: User Theme (Charcoal Violet & Cyber Lime) */}
      <div className="rounded-2xl border border-pdi-border bg-gradient-to-br from-[#3C1A47]/40 via-pdi-surface to-pdi-surface p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyber-lime/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Rank Badge & Tier */}
          <div className="lg:col-span-4 flex items-center gap-4">
            <RankBadge rank={currentRank} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-cyber-lime tracking-wider">
                  Tier {currentRank}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {rankDef.level}
                </span>
              </div>
              <h2 className="text-3xl font-heading font-black text-white mt-1">
                {currentPoints.toLocaleString()} <span className="text-sm font-normal text-slate-400">PTS</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Balance floor protected: cannot fall below 0.
              </p>
            </div>
          </div>

          {/* Progress to Next Tier */}
          <div className="lg:col-span-5 border-y lg:border-y-0 lg:border-x border-pdi-border/60 py-4 lg:py-0 lg:px-6">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyber-lime" />
                {pointsData?.nextRank ? (
                  <>Progress to Rank {pointsData.nextRank}</>
                ) : (
                  <>S-Rank Elite Mastery (50k Cap)</>
                )}
              </span>
              <span className="font-mono text-cyber-lime font-bold">
                {pointsData?.rankProgressPercent ?? 0}%
              </span>
            </div>

            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyber-lime rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(2, pointsData?.rankProgressPercent || 0))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
              <span>{rankDef.minPoints.toLocaleString()} pts</span>
              <span>
                {pointsData?.nextRank ? (
                  <>
                    <strong className="text-slate-200">{pointsData.pointsToNextRank.toLocaleString()} pts</strong> needed to promote
                  </>
                ) : (
                  <>Continuous Lifetime Accumulation</>
                )}
              </span>
            </div>
          </div>

          {/* Ledger Totals */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp size={13} /> Earned
                </span>
                <span className="font-mono font-bold text-white">
                  +{(pointsData?.totalEarned || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-rose-400">
                  <TrendingDown size={13} /> Deducted
                </span>
                <span className="font-mono font-bold text-white">
                  -{(pointsData?.totalDeducted || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex items-center justify-between border-b border-pdi-border">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 text-xs font-heading tracking-wider uppercase border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'border-cyber-lime text-cyber-lime font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={14} />
            Ledger Entries ({pointsData?.transactions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('rankEvents')}
            className={`px-4 py-2.5 text-xs font-heading tracking-wider uppercase border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'rankEvents'
                ? 'border-cyber-lime text-cyber-lime font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award size={14} />
            Rank Events ({rankEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`px-4 py-2.5 text-xs font-heading tracking-wider uppercase border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'appeals'
                ? 'border-cyber-lime text-cyber-lime font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale size={14} />
            My Appeals ({appeals.length})
          </button>
        </div>

        {activeTab === 'ledger' && (
          <div className="flex items-center gap-1 bg-pdi-surface border border-pdi-border rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded ${
                filter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('awards')}
              className={`px-2.5 py-1 rounded ${
                filter === 'awards' ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Credits (+)
            </button>
            <button
              onClick={() => setFilter('deductions')}
              className={`px-2.5 py-1 rounded ${
                filter === 'deductions' ? 'bg-slate-800 text-rose-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Debits (-)
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Points Ledger Entries */}
      {activeTab === 'ledger' && (
        <div className="rounded-xl border border-pdi-border bg-pdi-surface overflow-hidden shadow-lg">
          {isLoading && !pointsData ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-cyber-lime" />
              Loading cryptographic ledger history...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History size={36} className="mx-auto mb-3 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-200 font-heading">No Ledger Transactions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Points are awarded by casting directors and admins through auditions, training completion, and scene mastery.
              </p>
              <Link
                to="/rules"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <HelpCircle size={13} /> View Points Catalog
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-pdi-border text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Reason & Context</th>
                    <th className="py-3 px-4 text-right">Points Change</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4 text-right">Action / Appeal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pdi-border/60">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.delta > 0;
                    const existingAppeal = getAppealForTx(tx.id);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}{' '}
                          <span className="text-slate-500">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              tx.category === 'appeal_reversal'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                                : 'bg-slate-800 border border-slate-700 text-slate-300'
                            }`}
                          >
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-md">
                          <p className="text-slate-200 font-medium leading-relaxed">{tx.reason}</p>
                          <span className="text-[10px] font-mono text-slate-500">
                            Authorized: {tx.actorName || 'System Admin'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                              isCredit
                                ? 'bg-emerald-950/60 text-cyber-lime border border-emerald-800/50'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                            }`}
                          >
                            {isCredit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {isCredit ? `+${tx.delta}` : tx.delta}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-200 font-semibold">
                          {tx.balanceAfter.toLocaleString()} pts
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {tx.delta < 0 ? (
                            existingAppeal ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                                  existingAppeal.status === 'granted'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : existingAppeal.status === 'rejected'
                                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                }`}
                              >
                                Appeal {existingAppeal.status}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenAppealModal(tx)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 ml-auto transition-colors"
                              >
                                <Scale size={12} /> Appeal Deduction
                              </button>
                            )
                          ) : (
                            <span className="text-slate-600 text-[11px] font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Rank Promotions & Demotions Audit History */}
      {activeTab === 'rankEvents' && (
        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-base font-bold font-heading text-white">Rank Event Timeline</h3>
            <p className="text-xs text-slate-400">
              Audit log of all rank tier transitions triggered by authoritative point mutations.
            </p>
          </div>

          {rankEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Award size={36} className="mx-auto mb-3 text-slate-600" />
              <p>No rank transitions recorded yet. You are currently in {currentRank} tier.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 my-4">
              {rankEvents.map((event) => {
                const oldTierRank = ['ED', 'C', 'B', 'A', 'S'].indexOf(event.oldRank);
                const newTierRank = ['ED', 'C', 'B', 'A', 'S'].indexOf(event.newRank);
                const isPromotion = newTierRank > oldTierRank;

                return (
                  <div key={event.id} className="relative">
                    <div
                      className={`absolute -left-[31px] top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                        isPromotion
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : 'bg-rose-950 border-rose-500 text-rose-400'
                      }`}
                    >
                      {isPromotion ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
                              isPromotion
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                                : 'bg-rose-900/60 text-rose-300 border border-rose-700/60'
                            }`}
                          >
                            {isPromotion ? 'Rank Promotion' : 'Rank Demotion'}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <RankBadge rank={event.oldRank} size="sm" />
                          <ChevronRight size={14} className="text-slate-500" />
                          <RankBadge rank={event.newRank} size="sm" />
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        Transitioned from <strong>Tier {event.oldRank}</strong> to{' '}
                        <strong className={isPromotion ? 'text-cyber-lime' : 'text-rose-400'}>
                          Tier {event.newRank}
                        </strong>{' '}
                        with a recorded balance of {event.pointsAtEvent.toLocaleString()} points.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Appeals History */}
      {activeTab === 'appeals' && (
        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-base font-bold font-heading text-white">Dispute & Appeals Records</h3>
            <p className="text-xs text-slate-400">
              Contest deductions with justification. If granted by an admin, an additive inverse reversal entry is recorded in your ledger.
            </p>
          </div>

          {appeals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Scale size={36} className="mx-auto mb-3 text-slate-600" />
              <p>No active or past appeals filed. You can appeal any deduction from the ledger tab.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
                          appeal.status === 'granted'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : appeal.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                        }`}
                      >
                        {appeal.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Filed: {new Date(appeal.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-rose-400 font-bold">
                      Contested Deduction: {appeal.transactionDelta} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">
                        Deduction Category & Reason
                      </span>
                      <p className="text-slate-300 font-medium">
                        [{appeal.transactionCategory}] {appeal.transactionReason}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-cyber-lime block mb-0.5">
                        Your Justification
                      </span>
                      <p className="text-white font-medium">{appeal.reason}</p>
                      {appeal.evidenceText && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          Evidence: "{appeal.evidenceText}"
                        </p>
                      )}
                    </div>
                  </div>

                  {appeal.decisionNote && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-xs">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                        Administrator Decision Note ({appeal.deciderName || 'Admin'}):
                      </span>
                      <p className="text-slate-300 italic">{appeal.decisionNote}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appeal Submission Modal */}
      {appealModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-pdi-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold font-heading text-white">
                  Contest Deduction Appeal
                </h3>
              </div>
              <button
                onClick={() => setAppealModalTx(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Contested Deduction:</span>
                <span className="font-mono font-bold text-rose-400">{appealModalTx.delta} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-mono text-slate-200">{appealModalTx.category}</span>
              </div>
              <div className="text-slate-300 pt-1 border-t border-slate-800">
                Reason: {appealModalTx.reason}
              </div>
            </div>

            {appealModalError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{appealModalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAppeal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Justification / Explanation *
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={10}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain why this deduction was erroneous or what technical/production circumstance occurred..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Supporting Evidence / Incident References (Optional)
                </label>
                <input
                  type="text"
                  value={appealEvidence}
                  onChange={(e) => setAppealEvidence(e.target.value)}
                  placeholder="e.g. Studio ticket #102, hardware maintenance report, email timestamp..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealModalTx(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAppeal}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <FileText size={14} />
                  {isSubmittingAppeal ? 'Submitting Dispute...' : 'Transmit Appeal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
