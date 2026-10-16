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
  VolumeX,
  Sliders,
  FileText,
  Layers,
  ArrowLeft,
  Play,
  Pause,
  Video,
  Scissors,
  Headphones,
  RefreshCw,
  FileAudio,
  User,
} from 'lucide-react';

export const StudioPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const { challengeId: paramChallengeId } = useParams<{ challengeId?: string }>();
  const navigate = useNavigate();

  // Mode Selection: Official Assigned Challenges vs Custom Clip Dubbing
  const [sceneMode, setSceneMode] = useState<'catalog' | 'custom'>('catalog');

  // Selected Challenge / Catalog
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(
    paramChallengeId || searchParams.get('challengeId') || ''
  );
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeRecord | null>(null);

  // Custom Clip State
  const [customTitle, setCustomTitle] = useState<string>('My Custom Dubbing Scene');
  const [customCharacter, setCustomCharacter] = useState<string>('Protagonist');
  const [customScript, setCustomScript] = useState<string>('');
  const [customClipFile, setCustomClipFile] = useState<File | null>(null);
  const [customClipUrl, setCustomClipUrl] = useState<string | null>(null);

  // Voice Input Mode: Mic Recording vs External File Upload
  const [voiceInputMode, setVoiceInputMode] = useState<'mic' | 'file'>('mic');
  const [uploadedVoiceFile, setUploadedVoiceFile] = useState<File | null>(null);

  // Audio Recording Engine State
  const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm');
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

  // Mic Loopback Test
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);
  const [loopbackStatus, setLoopbackStatus] = useState<'idle' | 'recording' | 'playing'>('idle');

  // In-Browser Audio Editing Suite Controls
  const [isOriginalMuted, setIsOriginalMuted] = useState<boolean>(false);
  const [originalVolume, setOriginalVolume] = useState<number>(100); // 0% to 100%
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0); // -500ms to +500ms
  const [voiceGain, setVoiceGain] = useState<number>(100); // 50% to 200%
  const [trimStart, setTrimStart] = useState<number>(0); // seconds
  const [trimEnd, setTrimEnd] = useState<number>(0); // seconds
  const [takeDuration, setTakeDuration] = useState<number>(0); // total duration in seconds

  // Reference Player & Playback
  const referenceMediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [autoSyncReference, setAutoSyncReference] = useState<boolean>(true);
  const takeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewSyncing, setIsPreviewSyncing] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load challenges
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/v1/challenges?isActive=true', { headers, credentials: 'include' })
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
  }, [token]);

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
      setSceneMode('catalog');
    }
  }, [paramChallengeId]);

  // Handle local video clip upload for custom dubbing
  const handleCustomClipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (customClipUrl) {
      URL.revokeObjectURL(customClipUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomClipFile(file);
    setCustomClipUrl(objectUrl);
    setFeedback({
      type: 'success',
      message: `Custom clip '${file.name}' loaded! You can now dub your voice over it.`,
    });
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

  // 3-Second Mic Loopback Test
  const startLoopbackTest = async () => {
    setIsTestingMic(true);
    setLoopbackStatus('recording');
    let stream = mediaStreamRef.current;
    if (!stream || permissionState !== 'granted') {
      stream = await requestMicAccess();
      if (!stream) {
        setIsTestingMic(false);
        setLoopbackStatus('idle');
        return;
      }
    }

    const mime = getSupportedMimeType();
    const testChunks: Blob[] = [];
    const testRecorder = new MediaRecorder(stream, { mimeType: mime });

    testRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        testChunks.push(e.data);
      }
    };

    testRecorder.onstop = () => {
      setLoopbackStatus('playing');
      const testBlob = new Blob(testChunks, { type: mime });
      const testUrl = URL.createObjectURL(testBlob);
      const testAudio = new Audio(testUrl);

      testAudio.onended = () => {
        URL.revokeObjectURL(testUrl);
        setIsTestingMic(false);
        setLoopbackStatus('idle');
      };

      testAudio.play().catch((err) => {
        console.warn('Loopback playback failed:', err);
        setIsTestingMic(false);
        setLoopbackStatus('idle');
      });
    };

    testRecorder.start();
    setTimeout(() => {
      if (testRecorder.state === 'recording') {
        testRecorder.stop();
      }
    }, 3000);
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
      referenceMediaRef.current.muted = isOriginalMuted;
      referenceMediaRef.current.volume = isOriginalMuted ? 0 : originalVolume / 100;
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

  // Handle External Voice File Upload
  const handleUploadedVoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedVoiceFile(file);
    setRecordedBlob(file);
    setRecordedUrl(objectUrl);
    setRecordedMimeType(file.type || 'audio/wav');
    setFeedback({
      type: 'success',
      message: `Voice file '${file.name}' loaded! Use the editing controls below to trim, calibrate gain, and test sync.`,
    });
  };

  // Reset Take
  const resetTake = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setUploadedVoiceFile(null);
    setRecordingSeconds(0);
    setTrimStart(0);
    setTrimEnd(0);
    setTakeDuration(0);
    setIsPreviewSyncing(false);
  };

  // On Audio Take Loaded Metadata (Capture Duration & Initialize Trimming)
  const handleTakeLoadedMetadata = () => {
    if (takeAudioRef.current) {
      const dur = takeAudioRef.current.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        setTakeDuration(dur);
        setTrimStart(0);
        setTrimEnd(Number(dur.toFixed(2)));
        if (recordingSeconds === 0) {
          setRecordingSeconds(Math.round(dur));
        }
      }
    }
  };

  // Real-Time Synchronized Dual-Preview
  const handleToggleSyncPreview = () => {
    if (!takeAudioRef.current) return;
    const offsetSec = syncOffsetMs / 1000;

    if (isPreviewSyncing) {
      takeAudioRef.current.pause();
      if (referenceMediaRef.current) referenceMediaRef.current.pause();
      setIsPreviewSyncing(false);
    } else {
      // Apply voice gain volume
      takeAudioRef.current.volume = Math.min(1.0, voiceGain / 100);

      // Apply original clip volume & mute
      if (referenceMediaRef.current) {
        referenceMediaRef.current.muted = isOriginalMuted;
        referenceMediaRef.current.volume = isOriginalMuted ? 0 : originalVolume / 100;
      }

      // Set voice start time to trimStart
      takeAudioRef.current.currentTime = trimStart;

      // Calculate video start time considering trimStart and sync offset
      if (referenceMediaRef.current) {
        const vidStartTime = Math.max(0, trimStart - offsetSec);
        referenceMediaRef.current.currentTime = vidStartTime;
        referenceMediaRef.current.play().catch(console.warn);
      }

      takeAudioRef.current.play().catch(console.warn);
      setIsPreviewSyncing(true);
    }
  };

  // Stop preview if audio reaches trimEnd
  const handleTakeTimeUpdate = () => {
    if (takeAudioRef.current && isPreviewSyncing) {
      if (trimEnd > 0 && takeAudioRef.current.currentTime >= trimEnd) {
        takeAudioRef.current.pause();
        if (referenceMediaRef.current) referenceMediaRef.current.pause();
        setIsPreviewSyncing(false);
      }
    }
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
      if (customClipUrl) {
        URL.revokeObjectURL(customClipUrl);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []);

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Submit Take
  const handleSubmitTake = async () => {
    if (!recordedBlob) {
      setFeedback({ type: 'error', message: 'No recorded or uploaded take available to submit.' });
      return;
    }

    if (sceneMode === 'catalog' && !selectedChallengeId) {
      setFeedback({ type: 'error', message: 'Please select an audition challenge.' });
      return;
    }

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
        : recordedMimeType.includes('mpeg') || recordedMimeType.includes('mp3')
        ? 'mp3'
        : 'webm';

      const file = new File([recordedBlob], `take_${Date.now()}.${ext}`, {
        type: recordedMimeType,
      });

      formData.append('audio', file);

      // Duration taking trimming into account
      const effectiveDuration =
        trimEnd > trimStart
          ? Number((trimEnd - trimStart).toFixed(2))
          : Math.max(0.5, recordingSeconds);

      formData.append('durationSeconds', effectiveDuration.toString());
      formData.append('submissionType', voiceInputMode === 'mic' ? 'recorded' : 'uploaded');
      formData.append('mimeType', recordedMimeType);
      formData.append('syncOffsetMs', syncOffsetMs.toString());

      if (sceneMode === 'catalog') {
        formData.append('challengeId', selectedChallengeId);
      } else {
        formData.append('customTitle', customTitle.trim() || 'Custom Dubbing Practice');
        formData.append('characterName', customCharacter.trim() || 'Voice Character');
        if (customClipUrl) {
          formData.append('videoUrl', customClipUrl);
        }
      }

      let fullNotes = artistNotes.trim();
      if (trimStart > 0 || (trimEnd > 0 && trimEnd < takeDuration)) {
        fullNotes += ` [Trimmed: ${trimStart.toFixed(1)}s - ${trimEnd.toFixed(1)}s, Gain: ${voiceGain}%]`;
      }
      if (fullNotes.trim()) {
        formData.append('notes', fullNotes.trim());
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
        message: 'Audition take successfully submitted! Casting Directors will review your 100-point rubric and award points.',
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

  // Active scene media URL
  const activeMediaUrl =
    sceneMode === 'custom'
      ? customClipUrl
      : currentChallenge?.referenceMediaUrl || null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pdi-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-wider text-cyber-lime font-bold">
              PDI Dubbing Suite
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-charcoal-violet text-cyber-lime border border-cyber-lime/30">
              Web Audio Studio v2.5
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
            Browser Dubbing Studio & Audio Editor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dub assigned materials or your own clips. Check your mic, remove original dialogue, trim, align sync offset, and preview in real-time.
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

      {/* Mode Switcher: Official Assigned Materials vs Custom Dubbing Clip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-xl bg-pdi-surface border border-pdi-border">
        <button
          type="button"
          onClick={() => setSceneMode('catalog')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold font-heading flex items-center justify-center gap-2 transition-all ${
            sceneMode === 'catalog'
              ? 'bg-cyber-lime text-slate-950 shadow-md shadow-cyber-lime/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers size={15} />
          <span>Assigned & Official Materials ({challenges.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSceneMode('custom')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold font-heading flex items-center justify-center gap-2 transition-all ${
            sceneMode === 'custom'
              ? 'bg-cyber-lime text-slate-950 shadow-md shadow-cyber-lime/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Video size={15} />
          <span>Dub My Own Custom Clip</span>
        </button>
      </div>

      {/* Mode 1: Official Catalog Selector */}
      {sceneMode === 'catalog' && (
        <div className="p-4 rounded-xl bg-pdi-surface border border-pdi-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-cyber-lime" />
            <label className="text-xs font-bold text-white uppercase font-heading">
              Select Audition Scene:
            </label>
          </div>

          <select
            value={selectedChallengeId}
            onChange={(e) => setSelectedChallengeId(e.target.value)}
            className="w-full md:w-96 px-3 py-2 rounded-lg bg-slate-900 border border-pdi-border text-xs text-white focus:outline-none focus:border-cyber-lime"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.isAssignedToMe ? '★ [Assigned Directly to You] ' : ''}
                {c.title} — {c.characterName} ({c.difficulty})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mode 2: Custom Clip Uploader & Scene Metadata */}
      {sceneMode === 'custom' && (
        <div className="p-5 rounded-2xl bg-pdi-surface border border-cyber-lime/30 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-cyber-lime font-mono uppercase flex items-center gap-1.5">
              <Video size={14} /> Custom Clip Studio Configuration
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Instant in-browser playback (no server upload delay)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                Upload Custom Video or Audio File from Device:
              </label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg,audio/mp3,audio/wav,audio/m4a"
                onChange={handleCustomClipChange}
                className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyber-lime file:text-slate-950 hover:file:bg-lime-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                Scene / Movie Title:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Spider-Man 2: Clock Tower Scene"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyber-lime"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                Character Name:
              </label>
              <input
                type="text"
                value={customCharacter}
                onChange={(e) => setCustomCharacter(e.target.value)}
                placeholder="e.g. Peter Parker / Spider-Man"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyber-lime"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
              Dialogue Lines / Script (Optional Teleprompter):
            </label>
            <textarea
              rows={2}
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              placeholder="Paste the dialogue here so it displays while you record..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
            />
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Video Player, Original Dialogue Muter/Ducker, and Teleprompter */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-pdi-surface border border-pdi-border shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-white">
                  {sceneMode === 'custom' ? customTitle : currentChallenge?.title || 'Audition Scene'}
                </h2>
                <div className="text-xs font-mono text-cyber-lime mt-0.5">
                  Role: {sceneMode === 'custom' ? customCharacter : currentChallenge?.characterName || 'Voice'}
                  {sceneMode === 'catalog' && currentChallenge && ` • Tier ${currentChallenge.targetRank} (${currentChallenge.difficulty})`}
                </div>
              </div>

              {sceneMode === 'catalog' && currentChallenge?.isAssignedToMe && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-cyber-lime/10 border border-cyber-lime text-cyber-lime font-bold animate-pulse">
                  ★ Directly Assigned to You
                </span>
              )}
            </div>

            {/* Video Player */}
            {activeMediaUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-black border border-slate-800 max-h-64 flex items-center justify-center">
                  <video
                    ref={referenceMediaRef as any}
                    src={activeMediaUrl}
                    controls
                    playsInline
                    className="w-full max-h-64 object-contain"
                  />
                </div>

                {/* ORIGINAL AUDIO REMOVAL / DUCKING DECK */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-heading flex items-center gap-1.5">
                      <Volume2 size={14} className="text-cyber-lime" /> Original Clip Audio Control
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isOriginalMuted;
                        setIsOriginalMuted(next);
                        if (referenceMediaRef.current) referenceMediaRef.current.muted = next;
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1 transition-colors ${
                        isOriginalMuted
                          ? 'bg-rose-950 border border-rose-700 text-rose-300'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isOriginalMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      {isOriginalMuted ? 'Original Muted ✓' : 'Mute Original Voice'}
                    </button>
                  </div>

                  {/* Volume Ducking Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Original Track Volume:</span>
                      <span className="text-cyber-lime font-bold">{isOriginalMuted ? '0%' : `${originalVolume}%`}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={isOriginalMuted}
                      value={isOriginalMuted ? 0 : originalVolume}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setOriginalVolume(val);
                        if (referenceMediaRef.current) {
                          referenceMediaRef.current.volume = val / 100;
                        }
                      }}
                      className="w-full accent-cyber-lime disabled:opacity-30"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0% (Silence original dialogue)</span>
                      <span>100% (Full volume)</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={autoSyncReference}
                      onChange={(e) => setAutoSyncReference(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyber-lime focus:ring-0"
                    />
                    <span>Auto-play video when recording starts</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <Video className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs text-slate-300 font-semibold">No Reference Video Clip Attached</div>
                <p className="text-[11px] text-slate-500">
                  {sceneMode === 'custom'
                    ? 'Upload an MP4/WebM video clip above to dub directly over it.'
                    : 'This challenge has no reference video. Read the dialogue from the teleprompter below.'}
                </p>
              </div>
            )}

            {/* Script Teleprompter */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 block flex items-center gap-1.5">
                <FileText size={13} className="text-cyber-lime" /> Dialogue Teleprompter:
              </span>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto font-sans text-sm text-slate-100 leading-relaxed whitespace-pre-wrap selection:bg-cyber-lime selection:text-slate-950">
                {sceneMode === 'custom'
                  ? customScript || 'No dialogue script added. Speak your own performance or improvisation.'
                  : currentChallenge?.script || 'No script lines provided.'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Voice Check, Input Deck & Audio Editor */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-charcoal-violet/50 border border-cyber-lime/30 shadow-2xl space-y-5">
            {/* VOICE CHECK & MICROPHONE CALIBRATION */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-white uppercase font-heading flex items-center gap-1.5">
                  <Headphones size={14} className="text-cyber-lime" /> Microphone Voice Check
                </span>

                <button
                  type="button"
                  onClick={startLoopbackTest}
                  disabled={isTestingMic}
                  className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyber-lime text-[11px] font-semibold font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Headphones size={12} />
                  {loopbackStatus === 'recording'
                    ? 'Recording 3s Test...'
                    : loopbackStatus === 'playing'
                    ? 'Playing into Headphones...'
                    : 'Hear My Voice (3-Sec Loopback)'}
                </button>
              </div>

              {/* Decibel Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Input Sensitivity:</span>
                  <span
                    className={`font-bold ${
                      micVolume > 85
                        ? 'text-rose-400'
                        : micVolume > 50
                        ? 'text-amber-300'
                        : 'text-cyber-lime'
                    }`}
                  >
                    {micVolume}% {micVolume > 85 ? '(Clip/Distort)' : micVolume > 50 ? '(Loud)' : '(Nominal)'}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden">
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

                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>-60 dB (Silence)</span>
                  <span>-18 dB (Sweet Spot)</span>
                  <span>-6 dB (Hot)</span>
                  <span>0 dB (Clip)</span>
                </div>
              </div>
            </div>

            {/* VOICE TRACK INPUT MODE TABS */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVoiceInputMode('mic')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  voiceInputMode === 'mic'
                    ? 'bg-cyber-lime text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic size={14} /> Record Live Take
              </button>

              <button
                type="button"
                onClick={() => setVoiceInputMode('file')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  voiceInputMode === 'file'
                    ? 'bg-cyber-lime text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload size={14} /> Upload Audio File
              </button>
            </div>

            {/* OPTION 1: RECORD WITH MIC */}
            {voiceInputMode === 'mic' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                <div className="text-4xl font-mono font-black tracking-widest text-white">
                  {formatTime(recordingSeconds)}
                </div>

                <div className="flex items-center justify-center">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-cyber-lime hover:bg-lime-400 text-slate-950 font-heading font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyber-lime/20 transition-all hover:scale-105 active:scale-95 min-h-[48px]"
                    >
                      <Mic size={18} />
                      <span>{recordedBlob ? 'Record New Take' : 'Start Recording'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 animate-pulse transition-all active:scale-95 min-h-[48px]"
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
            )}

            {/* OPTION 2: UPLOAD AUDIO FILE */}
            {voiceInputMode === 'file' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <FileAudio className="w-10 h-10 text-cyber-lime mx-auto" />
                <div className="text-xs font-bold text-white">Upload Pre-Recorded Audio Take</div>
                <p className="text-[11px] text-slate-400">
                  Recorded externally on your phone or studio DAW? Upload your `.wav`, `.mp3`, or `.m4a` file here.
                </p>
                <input
                  type="file"
                  accept="audio/wav,audio/mpeg,audio/webm,audio/mp3,audio/m4a,audio/aac"
                  onChange={handleUploadedVoiceChange}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyber-lime file:text-slate-950 hover:file:bg-lime-400 cursor-pointer"
                />
              </div>
            )}

            {/* IN-BROWSER AUDIO EDITING & TRIMMING SUITE */}
            {recordedUrl && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white uppercase font-heading flex items-center gap-1.5">
                    <Scissors size={14} className="text-cyber-lime" /> In-Browser Audio Editing Deck
                  </span>
                  <span className="text-xs font-mono text-cyber-lime">
                    Take Length: {takeDuration ? `${takeDuration.toFixed(1)}s` : `${recordingSeconds}s`}
                  </span>
                </div>

                {/* Audio Element */}
                <audio
                  ref={takeAudioRef}
                  src={recordedUrl}
                  controls
                  onLoadedMetadata={handleTakeLoadedMetadata}
                  onTimeUpdate={handleTakeTimeUpdate}
                  className="w-full h-10 rounded"
                />

                {/* Trimming Controls: Start & End */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Scissors size={13} className="text-cyber-lime" /> Audio Trim & Crop:
                    </span>
                    <span className="font-mono text-cyber-lime text-[11px]">
                      Crop: {trimStart.toFixed(1)}s ➔ {trimEnd > 0 ? `${trimEnd.toFixed(1)}s` : `${takeDuration.toFixed(1)}s`} (
                      {trimEnd > trimStart ? (trimEnd - trimStart).toFixed(1) : takeDuration.toFixed(1)}s)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Trim Start (Cut silence at beginning):
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, trimEnd - 0.5)}
                        step="0.1"
                        value={trimStart}
                        onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                        className="w-full accent-cyber-lime"
                      />
                      <div className="text-[10px] font-mono text-slate-400">{trimStart.toFixed(1)}s</div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Trim End (Cut tail end):
                      </label>
                      <input
                        type="range"
                        min={trimStart + 0.5}
                        max={takeDuration || Math.max(recordingSeconds, 1)}
                        step="0.1"
                        value={trimEnd || takeDuration || recordingSeconds}
                        onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                        className="w-full accent-cyber-lime"
                      />
                      <div className="text-[10px] font-mono text-slate-400">
                        {(trimEnd || takeDuration || recordingSeconds).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </div>

                {/* Latency / Hardware Sync Offset Slider */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5 font-semibold">
                      <Sliders size={13} className="text-cyber-lime" /> Video Sync Latency Calibration:
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

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <button
                      type="button"
                      onClick={() => setSyncOffsetMs((prev) => Math.max(-500, prev - 25))}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:text-white"
                    >
                      -25ms
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncOffsetMs(0)}
                      className="text-slate-400 hover:text-white underline"
                    >
                      Reset 0ms
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncOffsetMs((prev) => Math.min(500, prev + 25))}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:text-white"
                    >
                      +25ms
                    </button>
                  </div>
                </div>

                {/* Voice Volume Gain / Boost */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Voice Gain / Boost:</span>
                    <span className="font-mono text-cyber-lime">{voiceGain}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={voiceGain}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setVoiceGain(val);
                      if (takeAudioRef.current) {
                        takeAudioRef.current.volume = Math.min(1.0, val / 100);
                      }
                    }}
                    className="w-full accent-cyber-lime"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>50% (Attenuate)</span>
                    <span>100% (Normal)</span>
                    <span>200% (Boost quiet mics)</span>
                  </div>
                </div>

                {/* Artist Notes */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Notes for Director (Vocal style, mic type, or intention):
                  </label>
                  <input
                    type="text"
                    value={artistNotes}
                    onChange={(e) => setArtistNotes(e.target.value)}
                    placeholder="e.g. Used Shure SM7B, took inspiration from gritty anime dubbing..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyber-lime"
                  />
                </div>

                {/* Action Buttons: Discard Take, Synchronized Dual-Preview & Submit */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={resetTake}
                      className="flex-1 sm:flex-none justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs flex items-center gap-1 transition-colors min-h-[44px] active:scale-95"
                    >
                      <RotateCcw size={13} /> Discard & Reset
                    </button>

                    {activeMediaUrl && (
                      <button
                        type="button"
                        onClick={handleToggleSyncPreview}
                        className={`flex-1 sm:flex-none justify-center px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm min-h-[44px] active:scale-95 ${
                          isPreviewSyncing
                            ? 'bg-rose-950 border-rose-600 text-rose-200'
                            : 'bg-charcoal-violet border-cyber-lime/40 text-cyber-lime hover:bg-charcoal-violet/80'
                        }`}
                      >
                        {isPreviewSyncing ? <Pause size={13} /> : <Play size={13} />}
                        <span>{isPreviewSyncing ? 'Stop Sync' : 'Test Sync (Video + Take)'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitTake}
                    className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-lg bg-cyber-lime hover:bg-lime-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyber-lime/20 transition-all disabled:opacity-50 min-h-[44px] active:scale-95"
                  >
                    <Upload size={14} />
                    <span>{isSubmitting ? 'Submitting Take...' : 'Submit Dubbing Take'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
