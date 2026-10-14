import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import {
  TalentRecord,
  AWARDS_CATALOG,
} from '@pdi/shared';
import {
  Users,
  Search,
  Filter,
  Play,
  Pause,
  Star,
  ExternalLink,
  Award,
  Volume2,
  Check,
  AlertCircle,
  X,
  Globe,
} from 'lucide-react';

const COMMON_VOICE_TYPES = [
  'Heroic Lead',
  'Deep Baritone',
  'Anime Heroine',
  'Villainous',
  'Warm Alto',
  'Teen Energetic',
  'Commercial Ad',
  'Character Voice',
  'Documentary Narrator',
];

const COMMON_LANGUAGES = [
  'Hindi',
  'English',
  'Tamil',
  'Telugu',
  'Bengali',
  'Marathi',
  'Malayalam',
  'Japanese',
];

interface AudioPlayerProps {
  url: string;
  isActive: boolean;
  onPlay: () => void;
  onPause: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, isActive, onPlay, onPause }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!audioRef.current) return;
    if (!isActive && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isActive) {
      audioRef.current.pause();
      onPause();
    } else {
      audioRef.current
        .play()
        .then(() => onPlay())
        .catch((e) => {
          console.error('Audio play error:', e);
          onPause();
        });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setProgress((cur / dur) * 100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    onPause();
    setProgress(0);
  };

  const handleError = () => {
    onPause();
  };

  const formatSecs = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-black flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md shadow-sky-500/20"
      >
        {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-sky-400 h-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
          <span>{audioRef.current ? formatSecs(audioRef.current.currentTime) : '0:00'}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export const CastingBoardPage: React.FC = () => {
  const { token } = useAuth();
  const [talents, setTalents] = useState<TalentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [selectedVoiceType, setSelectedVoiceType] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [minPoints, setMinPoints] = useState<number>(0);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pdi_casting_shortlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showShortlistOnly, setShowShortlistOnly] = useState<boolean>(false);

  // Recommendation Modal
  const [recommendTarget, setRecommendTarget] = useState<TalentRecord | null>(null);
  const [proposalDelta, setProposalDelta] = useState<number>(50);
  const [proposalCategory, setProposalCategory] = useState<string>('EXCELLENT_REVIEW');
  const [proposalReason, setProposalReason] = useState<string>('Casting Director role recommendation');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState<boolean>(false);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Toggle Shortlist
  const toggleShortlist = (userId: string) => {
    setShortlistedIds((prev) => {
      const updated = prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId];
      try {
        localStorage.setItem('pdi_casting_shortlist', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save shortlist', e);
      }
      return updated;
    });
  };

  const fetchTalents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedRank !== 'ALL') params.set('rank', selectedRank);
      if (selectedVoiceType) params.set('voiceType', selectedVoiceType);
      if (selectedLanguage) params.set('language', selectedLanguage);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (minPoints > 0) params.set('minPoints', minPoints.toString());
      params.set('limit', '50');

      const res = await fetch(`/api/v1/director/talents?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve voice talents');
      }

      const body = await res.json();
      setTalents(body.data?.talents || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading talent directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTalents();
  }, [token, selectedRank, selectedVoiceType, selectedLanguage, minPoints]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTalents();
  };

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendTarget) return;

    setIsSubmittingProposal(true);
    setProposalError(null);
    setProposalSuccess(null);

    try {
      const idempotencyKey = `prop_dir_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch('/api/v1/points/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          studentId: recommendTarget.userId,
          delta: proposalDelta,
          category: proposalCategory,
          reason: proposalReason,
          sourceType: 'review',
          idempotencyKey,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to submit points recommendation');
      }

      setProposalSuccess(`Successfully recommended ${proposalDelta > 0 ? '+' : ''}${proposalDelta} points for ${recommendTarget.displayName}! Sent to Admin queue.`);
      setTimeout(() => {
        setRecommendTarget(null);
        setProposalSuccess(null);
      }, 2000);
    } catch (err: any) {
      setProposalError(err?.message || 'Error submitting recommendation');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const displayedTalents = showShortlistOnly
    ? talents.filter((t) => shortlistedIds.includes(t.userId))
    : talents;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-pdi-surface to-pdi-surface p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                Casting Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {displayedTalents.length} Talents Available
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1.5 flex items-center gap-2.5">
              <Users className="w-7 h-7 text-sky-400" /> Talent Casting Board
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Explore opted-in Indian voice artists across competitive rank tiers (ED → S). Review demo audio reels, vocal tags, and recommend point awards or shortlist for production dubs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShortlistOnly(!showShortlistOnly)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                showShortlistOnly
                  ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showShortlistOnly ? 'fill-black' : ''}`} />
              <span>Shortlisted ({shortlistedIds.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-pdi-border bg-pdi-surface p-4 space-y-3">
        {/* Search Bar & Rank Tabs */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search artists by name, statement, or bio keywords..."
              className="w-full pl-9 pr-20 py-2 rounded-lg bg-slate-900/90 border border-pdi-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-sky-500 hover:bg-sky-400 text-black text-[11px] font-bold"
            >
              Filter
            </button>
          </form>

          {/* Rank Tier Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-pdi-border overflow-x-auto scrollbar-none">
            {['ALL', 'S', 'A', 'B', 'C', 'ED'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedRank(tier)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  selectedRank === tier
                    ? 'bg-sky-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tier === 'ALL' ? 'All Tiers' : `${tier} Rank`}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Type Chips & Min Points */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-pdi-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-sky-400" /> Vocal Specialty:
            </span>
            <button
              onClick={() => setSelectedVoiceType('')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors ${
                !selectedVoiceType
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Types
            </button>
            {COMMON_VOICE_TYPES.map((vt) => (
              <button
                key={vt}
                onClick={() => setSelectedVoiceType(selectedVoiceType === vt ? '' : vt)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors ${
                  selectedVoiceType === vt
                    ? 'bg-sky-500 text-black font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {vt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Min Points:</span>
            <select
              value={minPoints}
              onChange={(e) => setMinPoints(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-sky-500"
            >
              <option value="0">Any (0+)</option>
              <option value="1000">1,000+ (C Rank)</option>
              <option value="5000">5,000+ (B Rank)</option>
              <option value="12000">12,000+ (A Rank)</option>
              <option value="25000">25,000+ (S Rank)</option>
            </select>
          </div>
        </div>

        {/* Language Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-pdi-border/50 text-xs">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mr-1">
            <Globe className="w-3 h-3 text-sky-400" /> Language:
          </span>
          <button
            onClick={() => setSelectedLanguage('')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors ${
              !selectedLanguage
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Languages
          </button>
          {COMMON_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(selectedLanguage === lang ? '' : lang)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors ${
                selectedLanguage === lang
                  ? 'bg-sky-500 text-black font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Talent Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading casting talent directory...
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-500/40 text-center text-rose-300 text-xs">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
          {error}
        </div>
      ) : displayedTalents.length === 0 ? (
        <div className="rounded-xl border border-pdi-border bg-pdi-surface p-12 text-center text-slate-400">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">No voice artists match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your rank tier filter, vocal specialty chips, or search terms to discover more talents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedTalents.map((talent) => {
            const isShortlisted = shortlistedIds.includes(talent.userId);
            return (
              <div
                key={talent.userId}
                className={`rounded-xl border transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
                  isShortlisted
                    ? 'border-amber-400/50 bg-slate-900/95 shadow-amber-400/5'
                    : 'border-pdi-border bg-pdi-surface hover:border-slate-700'
                }`}
              >
                {/* Talent Card Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-heading font-black text-lg text-white shadow-inner">
                        {talent.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-heading font-bold text-sm text-white hover:text-sky-300 transition-colors">
                            {talent.displayName}
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {talent.email || 'Verified Voice Artist'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleShortlist(talent.userId)}
                      title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isShortlisted
                          ? 'bg-amber-400 text-black border-amber-300'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isShortlisted ? 'fill-black' : ''}`} />
                    </button>
                  </div>

                  {/* Badges: Rank & Points */}
                  <div className="flex items-center justify-between bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                    <RankBadge rank={talent.currentRank} size="sm" />
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white">
                        {talent.rankPoints.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">PTS</span>
                      </span>
                      {talent.performanceAverage > 0 && (
                        <span className="text-[10px] font-mono text-sky-400 block -mt-0.5">
                          Avg: {talent.performanceAverage.toFixed(1)}/100
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vocal Tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {talent.voiceTypes && talent.voiceTypes.length > 0 ? (
                      talent.voiceTypes.map((vt) => (
                        <span
                          key={vt}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 border border-slate-700 text-slate-300"
                        >
                          {vt}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No vocal classifications set</span>
                    )}
                  </div>

                  {/* Languages */}
                  {talent.languages && talent.languages.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate">{talent.languages.join(' • ')}</span>
                    </div>
                  )}

                  {/* Bio statement */}
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed min-h-[36px]">
                    {talent.bio || 'Professional voice artist participating in PDI Academy dubbing auditions.'}
                  </p>

                  {/* Audition Demo Audio Reel */}
                  {talent.sampleAudioUrl ? (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono uppercase text-sky-400 font-semibold mb-1 block flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> Audition Demo Reel
                      </span>
                      <AudioPlayer
                        url={talent.sampleAudioUrl}
                        isActive={activeAudioUrl === talent.sampleAudioUrl}
                        onPlay={() => setActiveAudioUrl(talent.sampleAudioUrl!)}
                        onPause={() => setActiveAudioUrl(null)}
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-900/50 border border-dashed border-slate-800 text-center text-[11px] text-slate-500">
                      No sample audition clip available
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 border-t border-pdi-border bg-slate-900/40 flex items-center justify-between gap-2">
                  <Link
                    to={`/artists/${talent.userId}`}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    <span>Full Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => {
                      setRecommendTarget(talent);
                      setProposalDelta(50);
                      setProposalCategory('EXCELLENT_REVIEW');
                      setProposalReason(`Casting recommendation for ${talent.displayName}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-black shadow-sm transition-all"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Recommend</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Point Recommendation Modal */}
      {recommendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-sky-500/30 bg-slate-950 p-6 shadow-2xl">
            <button
              onClick={() => setRecommendTarget(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-sky-400" />
              <div>
                <h3 className="font-heading font-bold text-lg text-white">
                  Recommend Points for {recommendTarget.displayName}
                </h3>
                <p className="text-xs text-slate-400">
                  Submit a points proposal to the Admin Approval Queue for casting review.
                </p>
              </div>
            </div>

            {proposalSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{proposalSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleProposalSubmit} className="space-y-4">
                {proposalError && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{proposalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Standard Recommendation Type
                  </label>
                  <select
                    value={proposalCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setProposalCategory(cat);
                      const award = AWARDS_CATALOG.find((a) => a.code === cat);
                      if (award) setProposalDelta(award.points);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    {AWARDS_CATALOG.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name} (+{a.points} pts)
                      </option>
                    ))}
                    <option value="ROLE_APPROVED">Approved Dubbing Role (+100 pts)</option>
                    <option value="CONSISTENCY_MILESTONE">Casting Consistency Milestone (+200 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Points Delta: {proposalDelta > 0 ? `+${proposalDelta}` : proposalDelta} PTS
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={proposalDelta}
                    onChange={(e) => setProposalDelta(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Casting Justification & Role Context
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={proposalReason}
                    onChange={(e) => setProposalReason(e.target.value)}
                    placeholder="E.g. Excellent audition performance for the villain lead in Project Genesis..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRecommendTarget(null)}
                    className="px-4 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProposal}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-md shadow-sky-500/20 disabled:opacity-50"
                  >
                    {isSubmittingProposal ? 'Submitting...' : 'Submit to Admin Queue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
