import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RankBadge } from '../components/RankBadge';
import { RankTier } from '@pdi/shared';
import { Trophy, Search, Loader2 } from 'lucide-react';


interface LeaderboardItem {
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
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
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

        const res = await fetch(`/api/v1/leaderboard?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch live leaderboard from server');
        }
        const body = await res.json();
        if (isMounted) {
          setLeaderboard(body.data?.leaderboard || []);
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
  }, [search, selectedTier]);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pdi-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-pdi-gold" />
            <h1 className="text-3xl font-bold font-heading text-white">
              PUBLIC VOICE ARTIST LEADERBOARD
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Displaying artists who have opted-in to public academy visibility. Ordered by verified points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search voice artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-pdi-surface border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-lime w-56"
            />
          </div>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3 py-2 rounded-lg bg-pdi-surface border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
          >
            <option value="ALL">All Tiers</option>
            <option value="S">S Rank</option>
            <option value="A">A Rank</option>
            <option value="B">B Rank</option>
            <option value="C">C Rank</option>
            <option value="ED">ED Rank</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table / Loading / Error / Empty States */}
      <div className="rounded-xl border border-pdi-border bg-pdi-surface overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyber-lime" />
            <span className="text-xs font-mono">Querying verified artist ledger...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            <span>{error}</span>
          </div>
        ) : leaderboard.length === 0 ? (
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
                {leaderboard.map((artist, idx) => (
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
        )}
      </div>
    </div>
  );
};
