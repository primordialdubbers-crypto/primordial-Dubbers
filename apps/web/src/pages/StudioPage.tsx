import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChallengeRecord } from '@pdi/shared';
import {
  Mic,
  Square,
  RotateCcw,
  Upload,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Volume2,
  Sliders,
  FileText,
  Layers,
  ArrowLeft,
  Play,
  Pause,
} from 'lucide-react';

export const StudioPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const { challengeId: paramChallengeId } = useParams<{ challengeId?: string }>();
  const navigate = useNavigate();

  // Selected Challenge
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(
    paramChallengeId || searchParams.get('challengeId') || ''
  );
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeRecord | null>(null);

  // Audio Recording Engine State
  const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm');
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);
  const [artistNotes, setArtistNotes] = useState<string>('');

  // Audio Visualizer / Web Audio API
  const [micVolume, setMicVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Reference Player & Playback
  const referenceMediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [autoSyncReference, setAutoSyncReference] = useState<boolean>(true);
  const takeAudioRef = useRef<HTMLAudioElement | null>(null);


  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load challenges
  useEffect(() => {
    fetch('/api/v1/challenges?isActive=true')
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data?.challenges) {
          setChallenges(body.data.challenges);
          if (!selectedChallengeId && body.data.challenges.length > 0) {
            setSelectedChallengeId(body.data.challenges[0].id);
          }
        }
      })
      .catch((err) => console.warn('Failed to load challenges:', err));
  }, []);

  // Update current challenge when selectedChallengeId changes
  useEffect(() => {
    if (selectedChallengeId && challenges.length > 0) {
      const found = challenges.find((c) => c.id === selectedChallengeId);
      if (found) setCurrentChallenge(found);
    }
  }, [selectedChallengeId, challenges]);

  useEffect(() => {
    if (paramChallengeId) {
      setSelectedChallengeId(paramChallengeId);
    }
  }, [paramChallengeId]);

  const [isPreviewSyncing, setIsPreviewSyncing] = useState<boolean>(false);

  const handleToggleSyncPreview = () => {
    if (!takeAudioRef.current) return;
    const offsetSec = syncOffsetMs / 1000;

    if (isPreviewSyncing) {
      takeAudioRef.current.pause();
      if (referenceMediaRef.current) referenceMediaRef.current.pause();
      setIsPreviewSyncing(false);
    } else {
      takeAudioRef.current.currentTime = 0;
      if (referenceMediaRef.current) {
        referenceMediaRef.current.currentTime = Math.max(0, -offsetSec);
        if (offsetSec > 0) {
          setTimeout(() => {
            if (referenceMediaRef.current) referenceMediaRef.current.play().catch(console.warn);
          }, offsetSec * 1000);
        } else {
          referenceMediaRef.current.play().catch(console.warn);
        }
      }
      takeAudioRef.current.play().catch(console.warn);
      setIsPreviewSyncing(true);
    }
  };

  // Determine supported mime-type for MediaRecorder
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'audio/webm';
  };

  // Request Microphone Permission and Setup Web Audio API Analyser
  const requestMicAccess = async (): Promise<MediaStream | null> => {
    setPermissionState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;
      setPermissionState('granted');

      // Initialize Web Audio API AnalyserNode
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start volume meter loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      return stream;
    } catch (err) {
      console.error('Microphone access denied:', err);
      setPermissionState('denied');
      return null;
    }
  };

  // Start Recording
  const startRecording = async () => {
    setFeedback(null);
    let stream = mediaStreamRef.current;
    if (!stream || permissionState !== 'granted') {
      stream = await requestMicAccess();
      if (!stream) return;
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const mime = getSupportedMimeType();
    setRecordedMimeType(mime);
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
    };

    recorder.start(100);
    setIsRecording(true);
    setRecordingSeconds(0);
    setRecordedBlob(null);
    setRecordedUrl(null);

    // Sync reference video playback if available
    if (autoSyncReference && referenceMediaRef.current) {
      referenceMediaRef.current.currentTime = 0;
      referenceMediaRef.current.play().catch(console.warn);
    }

    // Interval timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev >= 600) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (referenceMediaRef.current) {
      referenceMediaRef.current.pause();
    }
  };

  // Reset Take
  const resetTake = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSeconds(0);
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
    };
  }, []);

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Submit Recorded Take
  const handleSubmitTake = async () => {
    if (!recordedBlob || !selectedChallengeId) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      const ext = recordedMimeType.includes('mp4')
        ? 'mp4'
        : recordedMimeType.includes('ogg')
        ? 'ogg'
        : recordedMimeType.includes('wav')
        ? 'wav'
        : 'webm';
      const file = new File([recordedBlob], `take_${Date.now()}.${ext}`, {
        type: recordedMimeType,
      });

      formData.append('challengeId', selectedChallengeId);
      formData.append('audio', file);
      formData.append('durationSeconds', Math.max(0.5, recordingSeconds).toString());
      formData.append('submissionType', 'recorded');
      formData.append('mimeType', recordedMimeType);
      formData.append('syncOffsetMs', syncOffsetMs.toString());
      if (artistNotes.trim()) {
        formData.append('notes', artistNotes.trim());
      }

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
        message: 'Audition take successfully submitted! Casting Directors will review your 100-point rubric.',
      });

      setTimeout(() => {
        navigate('/student/submissions');
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error submitting take' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Studio Header - Combo 03: Charcoal Violet & Cyber Lime */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pdi-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-wider text-cyber-lime font-bold">
              Dubbing Booth
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-charcoal-violet text-cyber-lime border border-cyber-lime/30">
              Web Audio Studio v2.0
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
            Browser Dubbing Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Record directly into your browser, synchronize with reference media clips, calibrate mic latency, and submit takes.
          </p>
        </div>

        <Link
          to="/student/auditions"
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-pdi-surface border border-pdi-border hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Auditions
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {challenges.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white font-heading">No challenges currently active</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are currently no audition challenges available in MongoDB. Once casting directors publish new challenges, they will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Challenge Selector */}
          <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-cyber-lime" />
              <label className="text-xs font-bold text-white uppercase font-heading">
                Target Audition Scene:
              </label>
            </div>

            <select
              value={selectedChallengeId}
              onChange={(e) => setSelectedChallengeId(e.target.value)}
              className="w-full md:w-96 px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-cyber-lime"
            >
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {c.characterName} ({c.difficulty})
                </option>
              ))}
            </select>
          </div>

          {currentChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Script & Reference Clip Section */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-pdi-surface border border-pdi-border shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold font-heading text-white">
                    {currentChallenge.title}
                  </h2>
                  <div className="text-xs font-mono text-cyber-lime mt-0.5">
                    Role: {currentChallenge.characterName} • Target Rank: Tier {currentChallenge.targetRank} ({currentChallenge.difficulty})
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                  Active Challenge
                </span>
              </div>

              {/* Reference Media Player if provided */}
              {currentChallenge.referenceMediaUrl ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Reference Timing Guide:
                  </span>
                  <div className="rounded-xl overflow-hidden bg-black border border-slate-800">
                    <video
                      ref={referenceMediaRef as any}
                      src={currentChallenge.referenceMediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-56 object-contain"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={autoSyncReference}
                      onChange={(e) => setAutoSyncReference(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyber-lime focus:ring-0"
                    />
                    <span>Auto-play reference track when recording begins</span>
                  </label>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Volume2 size={16} className="text-slate-500" />
                  <span>No reference clip attached. Dub from character script below.</span>
                </div>
              )}

              {/* Script Teleprompter / Reader */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 block flex items-center gap-1.5">
                  <FileText size={13} className="text-cyber-lime" /> Dialogue Teleprompter:
                </span>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-52 overflow-y-auto font-sans text-sm text-slate-100 leading-relaxed whitespace-pre-wrap selection:bg-cyber-lime selection:text-slate-950">
                  {currentChallenge.script}
                </div>
              </div>
            </div>
          </div>

          {/* Recording & Dubbing Booth Deck */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-charcoal-violet/50 border border-cyber-lime/30 shadow-2xl space-y-6">
              {/* VU-Meter & Mic Activity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-cyber-lime" /> Mic Input Level:
                  </span>
                  <span
                    className={`font-bold ${
                      micVolume > 85
                        ? 'text-rose-400'
                        : micVolume > 50
                        ? 'text-amber-300'
                        : 'text-cyber-lime'
                    }`}
                  >
                    {micVolume}% {micVolume > 85 ? '(Clipping Warn)' : ''}
                  </span>
                </div>

                {/* Animated LED VU-Meter Bar */}
                <div className="w-full h-3 rounded-full bg-slate-950 p-0.5 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      micVolume > 85
                        ? 'bg-rose-500'
                        : micVolume > 50
                        ? 'bg-amber-400'
                        : 'bg-cyber-lime'
                    }`}
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>

              {/* Recording Controls Center */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                <div className="text-4xl font-mono font-black tracking-widest text-white">
                  {formatTime(recordingSeconds)}
                </div>

                <div className="flex items-center justify-center gap-4">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-6 py-3 rounded-xl bg-cyber-lime hover:bg-lime-400 text-slate-950 font-heading font-black text-sm flex items-center gap-2 shadow-lg shadow-cyber-lime/20 transition-all hover:scale-105"
                    >
                      <Mic size={18} />
                      <span>{recordedBlob ? 'Record New Take' : 'Start Recording'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 animate-pulse transition-all"
                    >
                      <Square size={18} />
                      <span>Stop Recording Take</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  {isRecording ? (
                    <span className="text-cyber-lime animate-pulse">● Live microphone audio streaming</span>
                  ) : permissionState === 'granted' ? (
                    <span className="text-slate-400">Microphone connected ({recordedMimeType})</span>
                  ) : (
                    <span className="text-slate-500">Hit Record to enable microphone capture</span>
                  )}
                </div>
              </div>

              {/* Latency / Hardware Sync Offset Slider */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5 font-semibold">
                    <Sliders size={13} className="text-cyber-lime" /> Hardware Mic Latency Compensation:
                  </span>
                  <span className="font-mono text-cyber-lime font-bold">
                    {syncOffsetMs > 0 ? `+${syncOffsetMs}` : syncOffsetMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="10"
                  value={syncOffsetMs}
                  onChange={(e) => setSyncOffsetMs(parseInt(e.target.value, 10))}
                  className="w-full accent-cyber-lime"
                />
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>-500ms (Advance)</span>
                  <button
                    type="button"
                    onClick={() => setSyncOffsetMs(0)}
                    className="text-slate-400 hover:text-white underline"
                  >
                    Reset to 0ms
                  </button>
                  <span>+500ms (Delay)</span>
                </div>
              </div>

              {/* Take Review & Playback Deck */}
              {recordedUrl && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-heading flex items-center gap-1.5">
                      <Sparkles size={14} className="text-cyber-lime" /> Recorded Take Review
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Duration: {recordingSeconds}s
                    </span>
                  </div>

                  <audio
                    ref={takeAudioRef}
                    src={recordedUrl}
                    controls
                    className="w-full h-10 rounded"
                  />


                  {/* Optional Artist Notes for Reviewing Director */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Artist Note for Casting Director (Optional):
                    </label>
                    <input
                      type="text"
                      value={artistNotes}
                      onChange={(e) => setArtistNotes(e.target.value)}
                      placeholder="e.g. Aimed for a fatigued cyberpunk detective tone..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetTake}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={13} /> Discard & Retake
                      </button>

                      {currentChallenge?.referenceMediaUrl && (
                        <button
                          type="button"
                          onClick={handleToggleSyncPreview}
                          className="px-3 py-1.5 rounded-lg bg-charcoal-violet border border-cyber-lime/40 text-cyber-lime text-xs font-semibold flex items-center gap-1.5 hover:bg-charcoal-violet/80 transition-colors shadow-sm"
                        >
                          {isPreviewSyncing ? <Pause size={13} /> : <Play size={13} />}
                          <span>{isPreviewSyncing ? 'Pause Sync Test' : 'Test Sync (Take + Video)'}</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitTake}
                      className="px-5 py-2 rounded-lg bg-cyber-lime hover:bg-lime-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyber-lime/20 transition-all disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{isSubmitting ? 'Uploading Take...' : 'Submit Take for Director Review'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
