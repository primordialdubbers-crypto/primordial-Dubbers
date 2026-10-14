import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import { RANK_TIERS, RankTier, MilestoneBadge } from '@pdi/shared';
import {
  User,
  Mic,
  Tag,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Save,
  Plus,
  X,
  ExternalLink,
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
import { Link } from 'react-router-dom';

const SUGGESTED_VOICE_TYPES = [
  'Anime Lead',
  'Commercial Warm',
  'Cinematic Trailer',
  'Deep Villain',
  'Child / Teen Voice',
  'Corporate Narration',
  'Gaming Hero',
  'Comedic Sidekick',
  'British RP',
  'Urban Conversational',
];

const SUGGESTED_LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Bengali',
  'Marathi',
  'Malayalam',
  'Japanese',
];

export const ArtistProfilePage: React.FC = () => {
  const { user, profile, token, setProfile } = useAuth();

  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [voiceTypes, setVoiceTypes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [publicOptIn, setPublicOptIn] = useState<boolean>(true);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [customLangInput, setCustomLangInput] = useState<string>('');
  const [milestones, setMilestones] = useState<MilestoneBadge[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v1/me/profile', { headers, credentials: 'include' });
        if (res.ok) {
          const body = await res.json();
          const p = body.data.profile;
          setDisplayName(p.displayName || user?.displayName || '');
          setBio(p.bio || '');
          setVoiceTypes(p.voiceTypes || []);
          setLanguages(p.languages && p.languages.length > 0 ? p.languages : ['English']);
          setPublicOptIn(p.publicOptIn !== false);
          setMilestones(p.milestones || []);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [token, user]);

  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;
    if (voiceTypes.includes(cleanTag)) return;
    if (voiceTypes.length >= 10) {
      setStatusMessage({ type: 'error', text: 'Maximum 10 voice types allowed' });
      return;
    }
    setVoiceTypes([...voiceTypes, cleanTag]);
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setVoiceTypes(voiceTypes.filter((t) => t !== tagToRemove));
  };

  const handleAddLanguage = (langToAdd: string) => {
    const clean = langToAdd.trim();
    if (!clean) return;
    if (languages.includes(clean)) return;
    if (languages.length >= 10) {
      setStatusMessage({ type: 'error', text: 'Maximum 10 languages allowed' });
      return;
    }
    setLanguages([...languages, clean]);
    setCustomLangInput('');
  };

  const handleRemoveLanguage = (langToRemove: string) => {
    setLanguages(languages.filter((l) => l !== langToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/me/profile', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          voiceTypes,
          languages,
          publicOptIn,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || 'Failed to update profile');
      }

      setStatusMessage({ type: 'success', text: 'Artist profile updated successfully!' });
      if (body.data?.profile) {
        setProfile((prev) => (prev ? { ...prev, ...body.data.profile } : body.data.profile));
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error updating profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const currentRank: RankTier = profile?.currentRank || 'ED';
  const rankDef = RANK_TIERS[currentRank];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-pdi-border pb-5">
        <span className="text-xs uppercase font-mono tracking-wider text-cyber-lime font-bold">
          Artist Identity
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
          Artist Profile & Voice Tags
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Customize your casting card, vocal specializations, and public leaderboard visibility.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-cyber-lime'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Edit Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-pdi-border bg-pdi-surface p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <User size={18} className="text-cyber-lime" /> Profile Information
            </h2>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Artist / Stage Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-pdi-border text-white text-sm focus:outline-none focus:border-cyber-lime transition-colors"
                placeholder="e.g. Alex Drake"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Visible to casting directors on submissions and leaderboard.
              </p>
            </div>

            {/* Bio */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Biography & Experience
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {bio.length}/500
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-pdi-border text-white text-xs leading-relaxed focus:outline-none focus:border-cyber-lime transition-colors resize-none"
                placeholder="Describe your vocal range, character styles, languages, and acting experience..."
              />
            </div>

            {/* Voice Types */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} className="text-cyber-lime" /> Vocal Styles & Specialties
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {voiceTypes.length}/10 tags
                </span>
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-900/60 border border-pdi-border/80 min-h-[50px] mb-3">
                {voiceTypes.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No voice tags added yet. Choose from below or type custom.</span>
                ) : (
                  voiceTypes.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#3C1A47] border border-cyber-lime/40 text-cyber-lime text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-rose-400 transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Custom Tag */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  maxLength={30}
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(customTagInput);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-cyber-lime"
                  placeholder="Type custom specialty (e.g. 'French Fluent')..."
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(customTagInput)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Suggested tags */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_VOICE_TYPES.map((suggestion) => {
                    const isSelected = voiceTypes.includes(suggestion);
                    return (
                      <button
                        type="button"
                        key={suggestion}
                        disabled={isSelected}
                        onClick={() => handleAddTag(suggestion)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          isSelected
                            ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyber-lime hover:text-white'
                        }`}
                      >
                        + {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dubbing Languages */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-sky-400" /> Dubbing Languages
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {languages.length}/10 languages
                </span>
              </div>

              {/* Language Badges */}
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-900/60 border border-pdi-border/80 min-h-[50px] mb-3">
                {languages.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No languages added yet. Choose from below or type custom.</span>
                ) : (
                  languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium font-mono"
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(lang)}
                        className="hover:text-rose-400 transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Custom Language */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customLangInput}
                  onChange={(e) => setCustomLangInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLanguage(customLangInput);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-sky-400"
                  placeholder="Type custom language (e.g. 'Spanish', 'German')..."
                />
                <button
                  type="button"
                  onClick={() => handleAddLanguage(customLangInput)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Suggested languages */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_LANGUAGES.map((suggestion) => {
                    const isSelected = languages.includes(suggestion);
                    return (
                      <button
                        type="button"
                        key={suggestion}
                        disabled={isSelected}
                        onClick={() => handleAddLanguage(suggestion)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          isSelected
                            ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-sky-400 hover:text-white'
                        }`}
                      >
                        + {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Public Leaderboard Opt-in */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-pdi-border flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {publicOptIn ? (
                    <Eye size={16} className="text-cyber-lime" />
                  ) : (
                    <EyeOff size={16} className="text-slate-400" />
                  )}
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Public Leaderboard Visibility
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When enabled, your rank tier, points, and artist name are listed on the public ranking leaderboard. When disabled, your progress remains 100% private.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={publicOptIn}
                  onChange={(e) => setPublicOptIn(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-lime peer-checked:after:bg-[#080D17]"></div>
              </label>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-pdi-border">
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="user-theme-btn px-6 py-2.5 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={15} />
                {isSaving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Casting Card Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
              Live Casting Card Preview
            </span>
            {user?.id && (
              <Link
                to={`/artists/${user.id}`}
                target="_blank"
                className="text-[11px] text-cyber-lime hover:underline flex items-center gap-1"
              >
                View Public Card <ExternalLink size={11} />
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-pdi-border bg-gradient-to-b from-[#3C1A47]/30 to-pdi-surface p-6 shadow-2xl relative overflow-hidden">
            {/* Header / Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-cyber-lime/60 flex items-center justify-center text-white font-heading font-black text-xl shadow-lg">
                {(displayName || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-white tracking-wide">
                  {displayName || 'Your Artist Name'}
                </h3>
                <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mic size={12} className="text-cyber-lime" /> Voice Talent • {rankDef.title}
                </span>
              </div>
            </div>

            {/* Rank Badge & Points Pill */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <RankBadge tier={currentRank} size="md" />
                <div>
                  <div className="text-xs font-bold text-white">{rankDef.level}</div>
                  <div className="text-[11px] text-slate-400">Verified System Tier</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-mono font-bold text-cyber-lime">
                  {(profile?.rankPoints || 0).toLocaleString()}
                </div>
                <div className="text-[10px] uppercase font-mono text-slate-500">Rank Points</div>
              </div>
            </div>

            {/* Bio Preview */}
            <div className="mb-4">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                Bio Statement
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                {bio || 'No artist bio provided yet. Write a brief statement describing your vocal capabilities and career highlights.'}
              </p>
            </div>

            {/* Vocal Tags Preview */}
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1.5">
                Vocal Specialties
              </span>
              <div className="flex flex-wrap gap-1.5">
                {voiceTypes.length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic">No specialties chosen</span>
                ) : (
                  voiceTypes.map((vt) => (
                    <span
                      key={vt}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300"
                    >
                      {vt}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Languages Preview */}
            <div className="mt-3">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1.5 flex items-center gap-1">
                <Globe size={11} className="text-sky-400" /> Dubbing Languages
              </span>
              <div className="flex flex-wrap gap-1.5">
                {languages.length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic">No languages selected</span>
                ) : (
                  languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-200"
                    >
                      {lang}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Visibility Badge */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Status:</span>
              <span
                className={`font-semibold ${
                  publicOptIn ? 'text-cyber-lime' : 'text-slate-400'
                }`}
              >
                {publicOptIn ? 'Visible on Public Leaderboard' : 'Private Profile'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements & Milestones Section */}
      {milestones && milestones.length > 0 && (
        <div className="rounded-2xl border border-pdi-border bg-pdi-surface p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-pdi-border">
            <div>
              <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                <Trophy size={18} className="text-cyber-lime" /> Artist Achievements & Milestones
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Milestones unlocked through authoritative rank progression and verified audition completions.
              </p>
            </div>
            <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/30">
              {milestones.filter((m) => m.unlocked).length} / {milestones.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {milestones.map((m) => {
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
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    m.unlocked
                      ? 'bg-charcoal-violet/20 border-cyber-lime/40 shadow-sm shadow-cyber-lime/5'
                      : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                          m.unlocked
                            ? 'bg-cyber-lime/10 border-cyber-lime/50 text-cyber-lime shadow-md shadow-cyber-lime/20'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {getIcon(m.icon)}
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          m.unlocked
                            ? 'bg-cyber-lime/20 text-cyber-lime font-bold border border-cyber-lime/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {m.unlocked ? 'Unlocked' : `${m.currentValue.toLocaleString()} / ${m.targetValue.toLocaleString()} ${m.unit}`}
                      </span>
                    </div>

                    <h3 className="text-xs font-heading font-bold text-white mb-1">
                      {m.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
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
  );
};
