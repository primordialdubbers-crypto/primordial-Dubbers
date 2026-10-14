import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RankBadge } from '../components/RankBadge';
import { RANK_TIERS, RankTier, MilestoneBadge } from '@pdi/shared';
import {
  Mic,
  ArrowLeft,
  Calendar,
  Tag,
  Trophy,
  Shield,
  TrendingUp,
  Award,
  Crown,
  Sparkles,
  Film,
  Flame,
  Globe,
} from 'lucide-react';

interface PublicProfile {
  userId: string;
  displayName: string;
  bio?: string;
  voiceTypes: string[];
  languages?: string[];
  publicOptIn: boolean;
  rankPoints: number;
  currentRank: RankTier;
  performanceAverage: number;
  joinedAt?: string;
  milestones?: MilestoneBadge[];
}

export const PublicArtistProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/artists/${userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Artist profile was not found or is private.');
          }
          throw new Error('Failed to load artist details');
        }
        const body = await res.json();
        setProfile(body.data.profile);
      } catch (err: any) {
        setError(err?.message || 'Error loading profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-cyber-lime border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading artist casting card...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="p-6 rounded-2xl bg-pdi-surface border border-pdi-border">
          <h2 className="text-lg font-heading font-bold text-white mb-2">Profile Not Available</h2>
          <p className="text-xs text-slate-400 mb-6">{error || 'This voice artist profile is not accessible.'}</p>
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const rankDef = RANK_TIERS[profile.currentRank || 'ED'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/leaderboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} /> Back to Leaderboard
      </Link>

      {/* Main Casting Hero Card */}
      <div className="rounded-2xl border border-pdi-border bg-gradient-to-br from-[#3C1A47]/40 via-pdi-surface to-pdi-surface p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyber-lime/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-pdi-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-cyber-lime/70 flex items-center justify-center text-white font-heading font-black text-2xl shadow-xl">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-cyber-lime font-bold tracking-wider px-2 py-0.5 rounded bg-cyber-lime/10 border border-cyber-lime/30">
                  Voice Artist
                </span>
                {profile.joinedAt && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> Joined {new Date(profile.joinedAt).getFullYear()}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
                {profile.displayName}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mic size={12} className="text-cyber-lime" /> {rankDef.title} • {rankDef.level}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <RankBadge tier={profile.currentRank} size="lg" />
            <div>
              <div className="text-2xl font-mono font-bold text-white">
                {profile.rankPoints.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">PTS</span>
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-500">
                Authoritative Score
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="py-6 border-b border-pdi-border/60">
          <h2 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-2">
            Artist Statement
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed">
            {profile.bio || 'No public statement provided by this artist yet.'}
          </p>
        </div>

        {/* Vocal Styles / Tags */}
        <div className="pt-6">
          <h2 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-3 flex items-center gap-1.5">
            <Tag size={13} className="text-cyber-lime" /> Vocal Classifications & Specialties
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.voiceTypes && profile.voiceTypes.length > 0 ? (
              profile.voiceTypes.map((vt) => (
                <span
                  key={vt}
                  className="px-3 py-1 rounded-md bg-[#3C1A47] border border-cyber-lime/40 text-cyber-lime text-xs font-medium"
                >
                  {vt}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No vocal specialties tagged.</span>
            )}
          </div>
        </div>

        {/* Spoken Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <div className="pt-4">
            <h2 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <Globe size={13} className="text-sky-400" /> Dubbing Languages
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((lang) => (
                <span
                  key={lang}
                  className="px-3 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium font-mono"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements & Milestones Section */}
        {profile.milestones && profile.milestones.length > 0 && (
          <div className="pt-6 mt-6 border-t border-pdi-border/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
                <Trophy size={14} className="text-cyber-lime" /> Artist Achievements & Milestones
              </h2>
              <span className="text-[11px] font-mono text-cyber-lime">
                {profile.milestones.filter((m) => m.unlocked).length} / {profile.milestones.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.milestones.map((m) => {
                const getIcon = (iconName: string) => {
                  switch (iconName) {
                    case 'Shield':
                      return <Shield className="w-4 h-4" />;
                    case 'TrendingUp':
                      return <TrendingUp className="w-4 h-4" />;
                    case 'Mic':
                      return <Mic className="w-4 h-4" />;
                    case 'Award':
                      return <Award className="w-4 h-4" />;
                    case 'Crown':
                      return <Crown className="w-4 h-4" />;
                    case 'Sparkles':
                      return <Sparkles className="w-4 h-4" />;
                    case 'Film':
                      return <Film className="w-4 h-4" />;
                    case 'Flame':
                      return <Flame className="w-4 h-4" />;
                    default:
                      return <Trophy className="w-4 h-4" />;
                  }
                };

                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      m.unlocked
                        ? 'bg-[#3C1A47]/30 border-cyber-lime/40 shadow-sm shadow-cyber-lime/10'
                        : 'bg-slate-900/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        m.unlocked
                          ? 'bg-cyber-lime/10 border-cyber-lime/50 text-cyber-lime shadow-md shadow-cyber-lime/20'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                    >
                      {getIcon(m.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-heading font-bold text-white">
                          {m.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            m.unlocked
                              ? 'bg-cyber-lime/20 text-cyber-lime font-bold border border-cyber-lime/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {m.unlocked ? 'Unlocked' : `${m.currentValue.toLocaleString()} / ${m.targetValue.toLocaleString()} ${m.unit}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
