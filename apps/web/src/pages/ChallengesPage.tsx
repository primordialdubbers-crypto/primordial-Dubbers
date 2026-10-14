import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import { ChallengeRecord } from '@pdi/shared';
import {
  Upload,
  Search,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Volume2,
  X,
  FileAudio,
  Sparkles,
  RefreshCw,
  Mic,
} from 'lucide-react';


export const ChallengesPage: React.FC = () => {
  const { token } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Challenge for audition submission / script reader modal
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeRecord | null>(null);

  // Audio Upload & Preview State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [submissionType, setSubmissionType] = useState<'recorded' | 'uploaded'>('uploaded');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      let url = '/api/v1/challenges?isActive=true';
      if (difficultyFilter !== 'all') url += `&difficulty=${encodeURIComponent(difficultyFilter)}`;
      if (rankFilter !== 'all') url += `&targetRank=${encodeURIComponent(rankFilter)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        setChallenges(body.data?.challenges || []);
      }
    } catch (err) {
      console.warn('Failed to load challenges:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [difficultyFilter, rankFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME
    const allowed = [
      'audio/wav',
      'audio/mpeg',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/x-wav',
      'audio/mp3',
      'audio/aac',
    ];

    if (!allowed.includes(file.type.toLowerCase()) && !file.name.match(/\.(wav|mp3|webm|ogg|m4a|aac)$/i)) {
      setFeedback({
        type: 'error',
        message: 'Unsupported audio format. Strictly audio only: WAV, MP3, WebM, OGG, MP4/AAC.',
      });
      return;
    }

    // Validate size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'File size exceeds maximum allowed 50MB limit.',
      });
      return;
    }

    setAudioFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAudioPreviewUrl(objectUrl);

    // Calculate duration using Audio element
    const tempAudio = new Audio(objectUrl);
    tempAudio.onloadedmetadata = () => {
      setAudioDuration(tempAudio.duration || 10);
    };
    setFeedback(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileChange({ target: fileInputRef.current } as any);
    }
  };

  const handleSubmitAudition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge || !audioFile) {
      setFeedback({ type: 'error', message: 'Please select an audio file to submit.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('challengeId', selectedChallenge.id);
      formData.append('durationSeconds', String(audioDuration || 10));
      formData.append('mimeType', audioFile.type || 'audio/wav');
      formData.append('submissionType', submissionType);
      if (submissionNotes) formData.append('notes', submissionNotes);

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Failed to submit audition take');
      }

      setFeedback({
        type: 'success',
        message: `Audition take for "${selectedChallenge.title}" submitted successfully! Directors will evaluate your performance.`,
      });
      setAudioFile(null);
      setAudioPreviewUrl(null);
      setSubmissionNotes('');
      setSelectedChallenge(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error uploading audition take' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner - Combo 03: Charcoal Violet & Cyber Lime */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pdi-border pb-5">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-cyber-lime font-bold">
            Audition & Scene Library
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
            Dubbing Scene Challenges
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Master anime battle climaxes, dramatic dialogue, and commercial voice-overs. Upload or record takes for director rubric evaluations.
          </p>
        </div>

        <button
          onClick={fetchChallenges}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-pdi-surface border border-pdi-border hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh Challenges
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-pdi-border bg-pdi-surface flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
            >
              <option value="all">All Difficulties</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Master">Master</option>
            </select>
          </div>

          {/* Rank Tier Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">Target Rank:</span>
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
            >
              <option value="all">All Tiers</option>
              <option value="ED">Tier ED</option>
              <option value="C">Tier C</option>
              <option value="B">Tier B</option>
              <option value="A">Tier A</option>
              <option value="S">Tier S</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search character or scene..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchChallenges()}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
          />
          <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
        </div>
      </div>

      {/* Challenges Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-cyber-lime" />
          Loading audition library...
        </div>
      ) : challenges.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
          <BookOpen size={36} className="mx-auto mb-3 text-slate-600" />
          <p>No audition challenges match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-pdi-border bg-pdi-surface p-6 flex flex-col justify-between hover:border-cyber-lime/40 transition-colors shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    {c.difficulty}
                  </span>
                  <RankBadge rank={c.targetRank} size="sm" />
                </div>

                <span className="text-xs font-mono uppercase text-cyber-lime block font-bold mb-1">
                  Character: {c.characterName}
                </span>
                <h3 className="text-base font-bold font-heading text-white mb-2 group-hover:text-cyber-lime transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {c.description}
                </p>

                {/* Script snippet preview */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 italic line-clamp-3 mb-4">
                  "{c.script}"
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-pdi-border flex items-center justify-between gap-2">
                {c.referenceMediaUrl ? (
                  <a
                    href={c.referenceMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <Volume2 size={13} /> Ref
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-600 font-mono">No Ref</span>
                )}

                <div className="flex items-center gap-2">
                  <Link
                    to={`/student/studio?challengeId=${c.id}`}
                    className="px-2.5 py-1.5 rounded-lg bg-charcoal-violet text-cyber-lime border border-cyber-lime/40 font-bold text-xs flex items-center gap-1 hover:bg-charcoal-violet/80 transition-colors shadow-sm"
                  >
                    <Mic size={13} /> Studio
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedChallenge(c);
                      setAudioFile(null);
                      setAudioPreviewUrl(null);
                      setFeedback(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyber-lime text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-lime-400 transition-colors shadow-md"
                  >
                    <Upload size={13} /> Upload
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Audition Take Submission Modal & Script Reader */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-cyber-lime/40 bg-pdi-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyber-lime uppercase font-bold">
                  Audition Take Submission
                </span>
                <h3 className="text-lg font-bold font-heading text-white">
                  {selectedChallenge.title} — Role: {selectedChallenge.characterName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Script Reader */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono uppercase">
                <span className="flex items-center gap-1 text-cyber-lime">
                  <BookOpen size={13} /> Teleprompter / Script Reader
                </span>
                <RankBadge rank={selectedChallenge.targetRank} size="sm" />
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 text-sm text-slate-100 font-serif leading-relaxed whitespace-pre-wrap selection:bg-cyber-lime selection:text-black">
                {selectedChallenge.script}
              </div>
              {selectedChallenge.referenceMediaUrl && (
                <div className="pt-2 flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Reference Stream:</span>
                  <a
                    href={selectedChallenge.referenceMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-mono"
                  >
                    {selectedChallenge.referenceMediaUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Upload & Preview Interface */}
            <form onSubmit={handleSubmitAudition} className="space-y-4 text-xs">
              <div className="flex items-center gap-4">
                <label className="text-slate-300 font-semibold uppercase text-[11px]">
                  Submission Mode:
                </label>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('uploaded')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      submissionType === 'uploaded'
                        ? 'bg-cyber-lime text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}
                  >
                    Upload Mastered File
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('recorded')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      submissionType === 'recorded'
                        ? 'bg-cyber-lime text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}
                  >
                    Direct Studio Take
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyber-lime/60 rounded-xl p-8 text-center cursor-pointer bg-slate-950/60 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/wav,audio/mpeg,audio/webm,audio/ogg,audio/mp4,audio/x-wav,audio/mp3,audio/aac"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <FileAudio className="w-10 h-10 text-cyber-lime mx-auto mb-2 opacity-80" />
                <p className="text-slate-200 font-semibold mb-1">
                  {audioFile ? audioFile.name : 'Click to select or drag & drop audio take'}
                </p>
                <p className="text-slate-400 text-[11px] font-mono">
                  Supported formats: WAV, MP3, WebM, OGG, MP4/AAC (Max 50MB)
                </p>
              </div>

              {/* In-Browser Preview Player */}
              {audioPreviewUrl && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Volume2 size={14} className="text-cyber-lime" /> Take Audio Preview
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {audioFile ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </span>
                  </div>
                  <audio controls src={audioPreviewUrl} className="w-full h-10 rounded" />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Notes for Casting Director (Optional)
                </label>
                <input
                  type="text"
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Mic: Shure SM7B, 2nd take focusing on soft delivery..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-cyber-lime"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedChallenge(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !audioFile}
                  className="px-6 py-2 rounded-lg bg-cyber-lime text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg hover:bg-lime-400 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  {isSubmitting ? 'Uploading Audition Take...' : 'Confirm & Submit Audition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
