import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import { StaffBadge } from '../components/StaffBadge';
import { RankTier, StaffLeaderboardEntry } from '@pdi/shared';
import { Trophy, Search, Loader2, Users, ShieldCheck, CheckCircle2, Award } from 'lucide-react';

interface StudentLeaderboardItem {
  id: string;
  userId: string;
  displayName: string;
  currentRank: RankTier;
  rankPoints: number;
  voiceTypes: string[];
  performanceAverage: number;
  bio: string;
}

export const LeaderboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const isStaff = Boolean(
    user?.roles?.some((r) => ['admin', 'director', 'superadmin'].includes(r))
  );

  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  const [students, setStudents] = useState<StudentLeaderboardItem[]>([]);
  const [staffList, setStaffList] = useState<StaffLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selectedTier !== 'ALL') params.set('tier', selectedTier);
        if (search.trim()) params.set('q', search.trim());

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (activeTab === 'staff' && isStaff) {
          params.set('type', 'staff');
          const res = await fetch(`/api/v1/leaderboard?${params.toString()}`, {
            headers,
            credentials: 'include',
          });
          if (!res.ok) {
            throw new Error('Failed to fetch staff rankings from server');
          }
          const body = await res.json();
          if (isMounted) {
            setStaffList(body.data?.leaderboard || []);
          }
        } else {
          // Default: Student Voice Artists
          const res = await fetch(`/api/v1/leaderboard?${params.toString()}`, {
            headers,
            credentials: 'include',
          });
          if (!res.ok) {
            throw new Error('Failed to fetch live artist leaderboard from server');
          }
          const body = await res.json();
          if (isMounted) {
            setStudents(body.data?.leaderboard || []);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to connect to leaderboard service');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchLeaderboard();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [search, selectedTier, activeTab, isStaff, token]);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pdi-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-pdi-gold" />
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-white tracking-wide">
              {activeTab === 'staff' ? 'STAFF & DIRECTORS RANKING' : 'PUBLIC VOICE ARTIST LEADERBOARD'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'staff'
              ? 'Authoritative performance standings and leadership tiers for Casting Directors and Executive Staff.'
              : 'Displaying verified voice artists who have opted into academy rankings. Ordered by audited points.'}
          </p>
        </div>

        {/* Search and Tier Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'staff' ? 'Search staff or director...' : 'Search voice artist...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-pdi-surface border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-lime w-52 md:w-56"
            />
          </div>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3 py-2 rounded-lg bg-pdi-surface border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
          >
            <option value="ALL">All Tiers</option>
            <option value="S">S Tier</option>
            <option value="A">A Tier</option>
            <option value="B">B Tier</option>
            <option value="C">C Tier</option>
            <option value="ED">ED Tier</option>
          </select>
        </div>
      </div>

      {/* Role-Gated Separation Tabs (Visible strictly to Admin and Casting Directors) */}
      {isStaff && (
        <div className="flex items-center gap-3 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => {
              setActiveTab('students');
              setSelectedTier('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'students'
                ? 'bg-cyber-lime text-slate-950 font-bold shadow-md shadow-cyber-lime/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>🎙️ Voice Artists</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('staff');
              setSelectedTier('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'staff'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>👔 Staff & Directors</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
              Staff Only
            </span>
          </button>
        </div>
      )}

      {/* Main Leaderboard Table / Container */}
      <div className="rounded-xl border border-pdi-border bg-pdi-surface overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyber-lime" />
            <span className="text-xs font-mono">
              Querying {activeTab === 'staff' ? 'staff performance standings' : 'verified artist ledger'}...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            <span>{error}</span>
          </div>
        ) : activeTab === 'staff' ? (
          /* STAFF LEADERBOARD VIEW */
          staffList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-300">No staff members found matching criteria.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try clearing search or filter to view all academy staff and directors.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Staff Member</th>
                    <th className="px-6 py-4">Leadership Designation</th>
                    <th className="px-6 py-4">Roles & Clearance</th>
                    <th className="px-6 py-4 text-center">Reviews Conducted</th>
                    <th className="px-6 py-4 text-right">Staff Merit Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {staffList.map((staff, idx) => (
                    <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white font-mono text-xs">
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-sm">
                          {staff.displayName}
                        </div>
                        {staff.email && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {staff.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StaffBadge
                          tier={staff.currentRank}
                          designation={staff.staffDesignation}
                          size="sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {staff.roles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                                r === 'superadmin' || r === 'admin'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                                  : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50'
                              }`}
                            >
                              {r === 'director' ? 'Casting Director' : r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono">
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {staff.reviewsConducted ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-pdi-gold text-sm">
                        {staff.rankPoints.toLocaleString()} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* STUDENT / VOICE ARTIST LEADERBOARD VIEW */
          students.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-300">No voice artists found matching criteria.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                No registered voice artists have opted into the public leaderboard yet or match your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Standing</th>
                    <th className="px-6 py-4">Voice Artist</th>
                    <th className="px-6 py-4">Rank Tier</th>
                    <th className="px-6 py-4">Voice Specialties</th>
                    <th className="px-6 py-4 text-right">Rubric Avg</th>
                    <th className="px-6 py-4 text-right">Rank Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {students.map((artist, idx) => (
                    <tr key={artist.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/artists/${artist.userId || artist.id}`}
                          className="font-semibold text-white text-sm hover:text-cyber-lime hover:underline transition-colors block"
                        >
                          {artist.displayName}
                        </Link>
                        {artist.bio && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                            {artist.bio}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <RankBadge rank={artist.currentRank} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {artist.voiceTypes.length > 0 ? (
                            artist.voiceTypes.map((v) => (
                              <span key={v} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-300">
                        {artist.performanceAverage > 0 ? `${artist.performanceAverage.toFixed(1)} / 100` : '–'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-cyber-lime text-sm">
                        {artist.rankPoints.toLocaleString()} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
