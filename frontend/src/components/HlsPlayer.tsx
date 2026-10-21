'use client';
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
} from 'lucide-react';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  onEnded?: () => void;
}

interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
  label: string;
}

export default function HlsPlayer({
  src,
  poster,
  title,
  className = '',
  onEnded,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setError(null);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsSource = src.includes('.m3u8') || src.includes('/hls');

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const availableLevels: QualityLevel[] = data.levels.map((lvl, idx) => ({
          index: idx,
          height: lvl.height || 0,
          bitrate: lvl.bitrate || 0,
          label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
        }));
        setLevels(availableLevels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HlsPlayer] Fatal network error encountered, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HlsPlayer] Fatal media error encountered, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HlsPlayer] Unrecoverable error:', data);
              setError('Видео уншихад алдаа гарлаа.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari iOS/macOS)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
      });
    } else {
      // Standard MP4 or direct video fallback
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const handleQualityChange = (levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 2800);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative group bg-slate-950 rounded-2xl overflow-hidden shadow-xl aspect-video select-none ${className}`}
    >
      <video
        ref={videoRef}
        poster={poster}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-20 pointer-events-none">
          <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span className="mt-2 text-xs font-semibold text-teal-200">Видео ачаалж байна...</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-6 text-center">
          <p className="text-rose-400 text-sm font-semibold mb-3">{error}</p>
          <button
            onClick={() => {
              if (hlsRef.current) hlsRef.current.startLoad();
              else if (videoRef.current) videoRef.current.load();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Дахин ачаалах
          </button>
        </div>
      )}

      {/* Title Header (visible on hover) */}
      {title && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-10 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <h3 className="text-white text-xs md:text-sm font-bold truncate drop-shadow">{title}</h3>
        </div>
      )}

      {/* Center Big Play/Pause Button on Pause */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 bg-teal-600/90 hover:bg-teal-500 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transform transition hover:scale-110 active:scale-95 z-10"
          aria-label="Тоглуулах"
        >
          <Play className="w-7 h-7 translate-x-0.5 fill-white" />
        </button>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-20 space-y-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div className="flex items-center gap-3 group/bar">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-teal-400 group-hover/bar:h-2 transition-all"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={isPlaying ? 'Түр зогсоох' : 'Тоглуулах'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Дуу хаах/нээх"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400 hidden group-hover/vol:block transition-all"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-[11px] font-mono text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed / Quality Settings Popup Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings ? 'bg-teal-500/30 text-teal-300' : 'hover:bg-white/20 text-white'
                }`}
                title="Тохиргоо (Хурд, Чанар)"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Settings Menu Popup */}
              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs w-48 space-y-3 z-30">
                  {/* Playback speed */}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                      Тоглуулах хурд
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.75, 1, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={`py-1 rounded text-[11px] font-bold ${
                            playbackRate === rate
                              ? 'bg-teal-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality levels (HLS only) */}
                  {levels.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                        Дүрсийн чанар (HLS)
                      </span>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`px-2 py-1 rounded text-left text-[11px] font-bold flex justify-between ${
                            currentLevel === -1
                              ? 'bg-teal-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <span>Auto (Ухаалаг)</span>
                          {currentLevel === -1 && <span>✓</span>}
                        </button>
                        {levels.map((lvl) => (
                          <button
                            key={lvl.index}
                            onClick={() => handleQualityChange(lvl.index)}
                            className={`px-2 py-1 rounded text-left text-[11px] font-bold flex justify-between ${
                              currentLevel === lvl.index
                                ? 'bg-teal-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          >
                            <span>{lvl.label}</span>
                            {currentLevel === lvl.index && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Бүтэн дэлгэц"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

