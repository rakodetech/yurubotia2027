import React, { useEffect, useRef, useState, useCallback } from 'react';
import { voiceService, LipSyncData } from '../services/voiceService';
import corporateAvatarImg from '../assets/images/corporate_avatar_neutral_1793718425841.jpg';
import {
  Video,
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  ShieldCheck,
  Clock,
  Sparkles,
  Play,
  Pause,
  X,
  Activity,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

export interface CorporateAvatarVideoProps {
  className?: string;
  isMobileFrame?: boolean;
  variant?: 'embedded' | 'floating' | 'fixed-header';
  onQuickQuery?: (text: string) => void;
}

export const CorporateAvatarVideo: React.FC<CorporateAvatarVideoProps> = ({
  className = '',
  isMobileFrame = false,
  variant = 'embedded',
  onQuickQuery
}) => {
  // Video and Presenter State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [mode, setMode] = useState<'avatar' | 'video'>('avatar'); // 'avatar' (Interactive Digital Presenter) or 'video' (Corporate Video Reel)
  const [isPipMinimized, setIsPipMinimized] = useState(false);
  const [isEmbeddedCollapsed, setIsEmbeddedCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Lip Sync Reference (Synchronized at 60 FPS directly from voiceService)
  const lipSyncRef = useRef<LipSyncData>(voiceService.getLipSyncData());

  // Canvas refs for the interactive presenter video loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Video element ref for corporate video reel
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // Session timer: tracks session uptime continuously
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Subscribe to real-time voice synthesis and lip-sync events
  useEffect(() => {
    const unsubscribeState = voiceService.subscribeSpeakingState((speaking, text) => {
      setIsSpeaking(speaking);
      if (text) {
        setCurrentText(text);
      } else if (!speaking) {
        // clear subtitle text shortly after speech completes
        setTimeout(() => {
          if (!voiceService.getIsSpeaking()) {
            setCurrentText('');
          }
        }, 1500);
      }
    });

    const unsubscribeLipSync = voiceService.subscribeLipSync((data) => {
      lipSyncRef.current = data;
    });

    return () => {
      unsubscribeState();
      unsubscribeLipSync();
    };
  }, []);

  // Preload corporate avatar image
  useEffect(() => {
    const img = new Image();
    img.src = corporateAvatarImg;
    img.onload = () => {
      imgRef.current = img;
    };
  }, []);

  // 60FPS Procedural Corporate Presenter Animation Loop
  // Simulates realistic breathing, eye blinks, speaking mouth movements and holographic corporate telemetry
  const renderPresenterFrame = useCallback(
    (canvas: HTMLCanvasElement, timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw animated high-tech corporate background gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        20,
        width / 2,
        height / 2,
        width * 0.75
      );
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.6, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle cyber holographic grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const lipSync = lipSyncRef.current;
      const isLipActive = isPlaying && (isSpeaking || lipSync.isSpeaking) && lipSync.mouthOpen > 0.03;

      // 2. Compute organic micro-movements
      // Breathing frequency (approx 12-14 breaths per min = ~0.2Hz)
      const breathPhase = Math.sin(timestamp * 0.0018);
      const breathOffsetY = isPlaying ? breathPhase * 2.0 : 0;

      // Subtle stochastic eye blink cycle (blink every 4.2 seconds for ~140ms)
      const blinkCycle = timestamp % 4200;
      const isBlinking = isPlaying && blinkCycle > 4000 && blinkCycle < 4140;

      // 3. Draw corporate presenter avatar with 16:9 Broadcast Framing
      const img = imgRef.current;
      if (img && img.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, [16]);
        ctx.clip();

        // Source crop in 1024x1024 original image:
        // Centers bust & face: X center = 502, Y eyes = 275, Y mouth = 352
        const sx = 75;
        const sy = 110;
        const sw = 853;
        const sh = 480;

        // Draw portrait onto canvas
        ctx.drawImage(img, sx, sy, sw, sh, 0, breathOffsetY, width, height);

        // Blinking eyelids (calibrated to exact pupil coordinates: Left X=477, Right X=548, Y=284)
        if (isBlinking) {
          ctx.fillStyle = 'rgba(50, 32, 28, 0.88)';
          const eyeY = height * (174 / 480) + breathOffsetY;
          ctx.beginPath();
          ctx.ellipse(width * (402 / 853), eyeY, width * 0.026, 2.2, 0, 0, Math.PI * 2);
          ctx.ellipse(width * (473 / 853), eyeY, width * 0.026, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // REAL-TIME NATURAL LIP SYNC ARTICULATION ALIGNED TO HER REAL MOUTH
        // Neutral face has closed lips at seam (X=514, Y=362 in 1024x1024 image)
        if (isLipActive) {
          // Exact coordinates in cropped 16:9 canvas (sx=75, sy=110, sw=853, sh=480)
          // Photo mouth seam center: X=514 -> (514-75)/853 = 439/853 = 0.51465
          // Photo mouth seam line: Y=362 -> (362-110)/480 = 252/480 = 0.52500
          const cx = width * (439 / 853);
          const cy = height * (252 / 480) + breathOffsetY;

          // Real mouth width in photo: from left corner X=483 to right corner X=545 = 62px (halfW = 31px)
          const baseHalfW = width * (31 / 853);
          const widthMod = Math.max(0.94, Math.min(1.06, lipSync.mouthWidth || 1.0));
          const halfW = baseHalfW * widthMod;

          // Measured lip thicknesses from photo:
          // Upper lip: Y=355.5 to Y=362 = 6.5px (0.01354 * sh)
          // Lower lip: Y=362 to Y=372 = 10px (0.02083 * sh)
          const upperLipH = height * (6.5 / 480);
          const lowerLipH = height * (10 / 480);

          // Subtle conversational speech aperture: 1.5px to 5px max (natural human phonation)
          const openAmt = Math.min(1.0, Math.max(0, lipSync.mouthOpen));
          const upLipOffset = -Math.min(height * 0.004, openAmt * height * 0.003);
          const downLipOffset = Math.min(height * 0.015, openAmt * height * 0.012 + (lipSync.jawDrop || 0) * height * 0.003);
          const openGap = downLipOffset - upLipOffset;

          if (openGap > 0.8) {
            ctx.save();

            // 1. Oral Cavity Depth (inside parted lips - dark natural oral interior)
            ctx.beginPath();
            ctx.moveTo(cx - halfW, cy);
            ctx.quadraticCurveTo(cx, cy + upLipOffset, cx + halfW, cy);
            ctx.quadraticCurveTo(cx, cy + downLipOffset, cx - halfW, cy);
            ctx.closePath();

            const oralGrad = ctx.createRadialGradient(
              cx,
              cy + (downLipOffset + upLipOffset) * 0.5,
              1,
              cx,
              cy + (downLipOffset + upLipOffset) * 0.5,
              halfW
            );
            oralGrad.addColorStop(0, '#160406');
            oralGrad.addColorStop(0.7, '#26070c');
            oralGrad.addColorStop(1, '#380a11');
            ctx.fillStyle = oralGrad;
            ctx.fill();

            // 2. Tongue (subtle curve visible at base during vowels like 'A', 'O')
            if (openAmt > 0.35 && openGap > 2.6) {
              ctx.beginPath();
              ctx.ellipse(cx, cy + downLipOffset - 0.5, halfW * 0.45, openGap * 0.35, 0, 0, Math.PI);
              ctx.fillStyle = '#9e3e4a';
              ctx.fill();
            }

            // 3. Upper Teeth Arch (subtle enamel line nestled behind upper lip)
            if (openGap > 1.8) {
              const teethH = Math.min(openGap * 0.42, height * 0.0062);
              const teethW = halfW * 0.62;
              ctx.beginPath();
              ctx.moveTo(cx - teethW, cy + upLipOffset + 0.5);
              ctx.quadraticCurveTo(cx, cy + upLipOffset, cx + teethW, cy + upLipOffset + 0.5);
              ctx.quadraticCurveTo(cx, cy + upLipOffset + teethH, cx - teethW, cy + upLipOffset + 0.5);
              ctx.fillStyle = '#f5f0e8';
              ctx.fill();

              // Center interdental separation
              ctx.fillStyle = 'rgba(120, 95, 90, 0.25)';
              ctx.fillRect(cx - 0.4, cy + upLipOffset, 0.8, teethH * 0.9);
            }

            // 4. Upper Lip Sculpture (matching her natural neutral tone and Cupid's bow contour)
            ctx.beginPath();
            ctx.moveTo(cx - halfW, cy);
            ctx.bezierCurveTo(
              cx - halfW * 0.4, cy + upLipOffset - upperLipH,
              cx - 2, cy + upLipOffset - upperLipH - 0.5,
              cx, cy + upLipOffset - upperLipH
            );
            ctx.bezierCurveTo(
              cx + 2, cy + upLipOffset - upperLipH - 0.5,
              cx + halfW * 0.4, cy + upLipOffset - upperLipH,
              cx + halfW, cy
            );
            ctx.quadraticCurveTo(cx, cy + upLipOffset, cx - halfW, cy);
            ctx.fillStyle = '#8f4e4f';
            ctx.fill();

            // 5. Lower Lip Sculpture (moves with natural jaw articulation, matching rosy color from photo)
            ctx.beginPath();
            ctx.moveTo(cx - halfW, cy);
            ctx.quadraticCurveTo(cx, cy + downLipOffset, cx + halfW, cy);
            ctx.bezierCurveTo(
              cx + halfW * 0.5, cy + downLipOffset + lowerLipH,
              cx - halfW * 0.5, cy + downLipOffset + lowerLipH,
              cx - halfW, cy
            );
            ctx.fillStyle = '#a05857';
            ctx.fill();

            // Specular sheen on lower lip
            ctx.beginPath();
            ctx.ellipse(cx, cy + downLipOffset + lowerLipH * 0.4, halfW * 0.35, lowerLipH * 0.25, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(240, 195, 195, 0.32)';
            ctx.fill();

            // 6. Natural mouth corner dimple shadows
            ctx.fillStyle = 'rgba(60, 18, 20, 0.45)';
            ctx.beginPath();
            ctx.arc(cx - halfW, cy, 1.2, 0, Math.PI * 2);
            ctx.arc(cx + halfW, cy, 1.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        }

        ctx.restore();
      }

      // 4. Draw Audio Waveform Overlay when Speaking
      if (isSpeaking && isPlaying) {
        ctx.save();
        const barCount = 18;
        const totalBarWidth = width * 0.7;
        const barWidth = 4;
        const gap = (totalBarWidth - barCount * barWidth) / (barCount - 1);
        const startX = (width - totalBarWidth) / 2;
        const baseY = height - 28;

        const speechIntensity = Math.max(0.1, lipSync.mouthOpen);
        for (let i = 0; i < barCount; i++) {
          const freq = Math.sin(timestamp * 0.018 + i * 0.42) * 0.5 + 0.5;
          const barHeight = 3 + (freq * 12 + speechIntensity * 18);

          const barGrad = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY);
          barGrad.addColorStop(0, '#38bdf8');
          barGrad.addColorStop(1, '#2563eb');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(startX + i * (barWidth + gap), baseY - barHeight, barWidth, barHeight, 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. Draw live telemetry watermark & scanline
      ctx.save();
      const scanY = (timestamp * 0.08) % height;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.fillRect(0, scanY, width, 3);

      // OESVICA Live Badge inside the stream
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(12, 12, 86, 22, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Red recording/live dot
      const dotAlpha = Math.sin(timestamp * 0.005) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(239, 68, 68, ${dotAlpha})`;
      ctx.beginPath();
      ctx.arc(22, 23, 4, 0, Math.PI * 2);
      ctx.fill();

      // "EN VIVO" label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      ctx.fillText('EN VIVO', 32, 26);

      ctx.restore();
    },
    [isPlaying, isSpeaking]
  );

  // Main animation ticker
  useEffect(() => {
    let animId: number;

    const tick = (timestamp: number) => {
      if (canvasRef.current) {
        renderPresenterFrame(canvasRef.current, timestamp);
      }
      if (modalCanvasRef.current) {
        renderPresenterFrame(modalCanvasRef.current, timestamp);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    animationFrameRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [renderPresenterFrame]);

  // Handle Play / Pause Toggle
  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Handle Mute / Unmute
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    if (isMuted) {
      if (!isSpeaking) {
        voiceService.speak('Audio corporativo de OESVICA activado. ¿En qué puedo orientarte hoy?');
      }
    } else {
      voiceService.stop();
    }
  };

  // Immediate voice & lip sync test trigger
  const handleTestSpeech = () => {
    if (isSpeaking) {
      voiceService.stop();
    } else {
      voiceService.speak(
        'Hola, mi nombre es OESVICA. Estoy aquí para asistirte con cualquier consulta o gestión relacionada con tu bienestar laboral.'
      );
    }
  };

  // Quick prompt handler for modal
  const handleQuickQuestion = (question: string) => {
    if (onQuickQuery) {
      onQuickQuery(question);
      setIsModalOpen(false);
    }
  };

  // ----------------------------------------------------
  // FIXED-HEADER VARIANT & EMBEDDED VARIANT
  // ----------------------------------------------------
  if (variant === 'fixed-header' || variant === 'embedded') {
    const isFixed = variant === 'fixed-header';
    return (
      <div className={isFixed ? `w-full bg-slate-950 text-white select-none ${className}` : `w-full max-w-2xl mx-auto mb-3 animate-in fade-in slide-in-from-top-3 duration-300 ${className}`}>
        <div className={isFixed ? "bg-slate-950 text-white transition-all border-b border-slate-800" : "bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-blue-500/30 shadow-xl overflow-hidden ring-1 ring-blue-500/20 text-white transition-all"}>
          {/* Card / Header Control Bar */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 px-3.5 py-2 flex items-center justify-between border-b border-blue-500/20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-blue-200 tracking-wide text-xs truncate">
                    Asistente Corporativo OESVICA
                  </span>
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">
                    EN VIVO
                  </span>
                </div>
                <p className="text-[10px] text-blue-300/80 leading-none mt-0.5 truncate hidden sm:block">
                  Transmisión Continua • Uptime: {formatTime(sessionSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden md:flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-white/10 text-[10px] text-slate-300">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="font-mono">{formatTime(sessionSeconds)}</span>
              </div>

              {/* Test Voice & Lipsync Button */}
              <button
                onClick={handleTestSpeech}
                className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ring-1 ring-white/20"
                title={isSpeaking ? 'Detener voz del avatar' : 'Probar voz y movimiento de labios'}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-emerald-300' : ''}`} />
                <span className="hidden sm:inline">{isSpeaking ? 'Detener Voz' : 'Probar Habla'}</span>
              </button>

              {/* Audio Mute/Unmute */}
              <button
                onClick={toggleMute}
                className={`p-1.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Activar Audio' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Mode switch */}
              <button
                onClick={() => setMode(mode === 'avatar' ? 'video' : 'avatar')}
                className="hidden lg:inline-flex px-2 py-1 bg-slate-800/90 hover:bg-slate-700 text-[10px] font-medium rounded-lg text-blue-300 border border-blue-400/30 transition-all cursor-pointer"
              >
                {mode === 'avatar' ? 'Video Reel' : 'Avatar IA'}
              </button>

              {/* Studio Fullscreen */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
                title="Abrir Estudio en Pantalla Completa"
                aria-label="Abrir Estudio en Pantalla Completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Collapse/Expand button */}
              <button
                onClick={() => setIsEmbeddedCollapsed(!isEmbeddedCollapsed)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
                title={isEmbeddedCollapsed ? 'Expandir video del avatar' : 'Plegar video del avatar'}
                aria-label={isEmbeddedCollapsed ? 'Expandir video del avatar' : 'Plegar video del avatar'}
              >
                {isEmbeddedCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {!isEmbeddedCollapsed ? (
            <div>
              {/* Video Presenter Display */}
              <div className={`relative w-full bg-black overflow-hidden group flex justify-center items-center ${isFixed ? 'h-[160px] sm:h-[185px] md:h-[200px]' : 'aspect-[16/9] sm:aspect-[21/9] max-h-[220px] sm:max-h-[260px]'}`}>
                {mode === 'avatar' ? (
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={315}
                    className="w-full h-full object-contain mx-auto"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                    autoPlay
                    loop
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-contain mx-auto"
                    onError={() => setMode('avatar')}
                  />
                )}

                {/* Real-time speech transcript banner */}
                {isSpeaking && currentText && (
                  <div className="absolute bottom-2 left-3 right-3 bg-black/85 backdrop-blur-md rounded-xl p-2 border border-blue-400/40 text-xs text-blue-100 shadow-xl flex items-center gap-2 animate-fadeIn z-10">
                    <Activity className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                    <p className="truncate line-clamp-1 italic text-[11px] sm:text-xs">{currentText}</p>
                  </div>
                )}

                {/* Overlaid Controls Bar on Hover / Active */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 z-10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 bg-blue-600/90 hover:bg-blue-500 rounded-full text-white transition-all shadow cursor-pointer"
                      title={isPlaying ? 'Pausar video' : 'Reanudar video'}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={toggleMute}
                      className={`p-1.5 rounded-full transition-all shadow cursor-pointer ${
                        isMuted
                          ? 'bg-red-500/80 hover:bg-red-400 text-white'
                          : 'bg-slate-700/80 hover:bg-slate-600 text-white'
                      }`}
                      title={isMuted ? 'Activar Audio' : 'Silenciar'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMode(mode === 'avatar' ? 'video' : 'avatar')}
                      className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-[10px] font-medium rounded-full text-blue-300 border border-blue-400/30 transition-all cursor-pointer"
                    >
                      {mode === 'avatar' ? 'Ver Video Loop' : 'Ver Avatar IA'}
                    </button>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-[10px] font-medium rounded-full text-white transition-all shadow cursor-pointer"
                    >
                      Estudio HD
                    </button>
                  </div>
                </div>
              </div>

              {/* Informational Sub-Bar with Status */}
              <div className="px-3.5 py-1.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300 truncate">
                    Asistente Virtual OESVICA • Presentador Continuo
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {isSpeaking ? 'HABLANDO' : 'EN LÍNEA'}
                  </span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="hidden sm:inline">1080p 60FPS</span>
                </div>
              </div>
            </div>
          ) : (
            /* Minimized/Collapsed Compact Bar */
            <div className="px-3.5 py-2 bg-slate-900/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={corporateAvatarImg}
                  alt="Avatar OESVICA"
                  className="w-7 h-7 rounded-full object-cover border border-blue-400/40"
                />
                <span className="text-[11px] text-slate-300">
                  Transmisión de Avatar en línea (minimizada)
                </span>
              </div>
              <button
                onClick={() => setIsEmbeddedCollapsed(false)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                Expandir Video
              </button>
            </div>
          )}
        </div>

        {/* FULL CORPORATE PRESENTER STUDIO MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-3xl bg-slate-900 rounded-3xl border border-blue-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 px-6 py-4 border-b border-blue-500/20 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 shadow-inner">
                    <Sparkles className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                      Estudio de Atención Virtual OESVICA
                    </h3>
                    <p className="text-xs text-blue-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Transmisión Continua en Tiempo Real • Uptime: {formatTime(sessionSeconds)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                  title="Cerrar estudio"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Video Display Window (Left / Top 7 Cols) */}
                  <div className="md:col-span-7 flex flex-col space-y-3">
                    <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-blue-500/30 shadow-xl">
                      {mode === 'avatar' ? (
                        <canvas
                          ref={modalCanvasRef}
                          width={640}
                          height={360}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          ref={modalVideoRef}
                          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                          autoPlay
                          loop
                          playsInline
                          muted={isMuted}
                          className="w-full h-full object-cover"
                          onError={() => setMode('avatar')}
                        />
                      )}

                      {/* Watermark in Studio */}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        <span className="font-semibold text-white text-[11px]">HD 1080p 60FPS</span>
                      </div>

                      {/* Active Transcript Overlay */}
                      {isSpeaking && currentText && (
                        <div className="absolute bottom-3 left-3 right-3 bg-black/85 backdrop-blur-md rounded-xl p-3 border border-blue-400/40 text-xs text-blue-100 shadow-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span className="font-semibold text-[10px] uppercase tracking-wider text-emerald-400">
                              Voz Sintetizada OESVICA
                            </span>
                          </div>
                          <p className="leading-relaxed italic">"{currentText}"</p>
                        </div>
                      )}
                    </div>

                    {/* Studio Video Controls */}
                    <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={togglePlay}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow"
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{isPlaying ? 'Pausar' : 'Reanudar'}</span>
                        </button>

                        <button
                          onClick={toggleMute}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            isMuted
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isMuted ? 'Silenciado' : 'Audio ON'}</span>
                        </button>

                        <button
                          onClick={handleTestSpeech}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow"
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-emerald-300' : ''}`} />
                          <span>{isSpeaking ? 'Detener' : 'Probar Habla'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Modo:</span>
                        <button
                          onClick={() => setMode('avatar')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            mode === 'avatar'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Avatar Digital
                        </button>
                        <button
                          onClick={() => setMode('video')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            mode === 'video'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Video Loop
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Presenter Information & Direct Inquiries (Right 5 Cols) */}
                  <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={corporateAvatarImg}
                          alt="Asistente Corporativo OESVICA"
                          className="w-12 h-12 rounded-xl object-cover border border-blue-500/40"
                        />
                        <div>
                          <h4 className="font-bold text-white text-sm">Asistente OESVICA</h4>
                          <p className="text-xs text-blue-400">
                            Coordinación de Bienestar y Gestión Social
                          </p>
                          <p className="text-[11px] text-slate-400">OESVICA C.A. • RIF J-00000000-0</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                        "Bienvenido al portal interactivo de autogestión para los trabajadores de
                        OESVICA. Estoy aquí de manera continua para guiarte en la emisión de tus
                        recibos de pago, constancias de trabajo, verificación de Cesta Tickets y
                        formatos oficiales."
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400">
                          <span className="block text-slate-500 text-[10px]">Estado</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            En Línea 24/7
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400">
                          <span className="block text-slate-500 text-[10px]">Sesión Activa</span>
                          <span className="text-blue-300 font-mono font-semibold">
                            {formatTime(sessionSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Topics */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Consultas Rápidas al Asistente
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => handleQuickQuestion('Quiero consultar mi último recibo de pago')}
                          className="p-2.5 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left text-xs text-slate-200 transition-all flex items-center justify-between group"
                        >
                          <span>📄 Descargar mi Recibo de Pago</span>
                          <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
                        <button
                          onClick={() => handleQuickQuestion('Necesito emitir una carta de trabajo')}
                          className="p-2.5 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left text-xs text-slate-200 transition-all flex items-center justify-between group"
                        >
                          <span>📋 Solicitar Carta de Trabajo con Sueldo</span>
                          <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
                        <button
                          onClick={() => handleQuickQuestion('¿Cuánto me corresponde de Cesta Ticket este mes?')}
                          className="p-2.5 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left text-xs text-slate-200 transition-all flex items-center justify-between group"
                        >
                          <span>🍽️ Consultar Monto de Cesta Ticket</span>
                          <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-900 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Seguridad OESVICA • Conexión protegida SSL y verificación de identidad
                </span>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-all"
                >
                  Volver al Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // FLOATING VARIANT (Optional fallback mode)
  // ----------------------------------------------------
  return (
    <>
      <div
        className={`fixed z-40 transition-all duration-300 ease-out ${
          isMobileFrame ? 'bottom-16 right-3 sm:right-6' : 'bottom-6 right-6'
        } ${className}`}
        style={{ maxWidth: isPipMinimized ? '74px' : '300px' }}
      >
        {isPipMinimized ? (
          <button
            onClick={() => setIsPipMinimized(false)}
            title="Expandir Asistente Corporativo OESVICA"
            aria-label="Expandir Asistente Corporativo OESVICA"
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 shadow-xl border-2 border-white/80 dark:border-blue-400/50 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="absolute -inset-1 rounded-full bg-blue-500/40 animate-ping opacity-75"></span>
            <img
              src={corporateAvatarImg}
              alt="Avatar OESVICA"
              className="w-13 h-13 rounded-full object-cover border border-white/40"
            />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
              </span>
            )}
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-sm flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              LIVE
            </span>
          </button>
        ) : (
          <div className="relative bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden ring-1 ring-blue-500/20 text-white transition-all w-[270px] sm:w-[290px]">
            <div className="bg-gradient-to-r from-blue-900/90 via-slate-900 to-blue-950 px-3 py-2 flex items-center justify-between border-b border-blue-500/20 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-blue-200 tracking-wide text-[11px] truncate">
                  OESVICA Live Presenter
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1 hover:bg-white/10 rounded text-blue-300 hover:text-white transition-colors"
                  title="Pantalla Completa Corporativa"
                  aria-label="Pantalla Completa Corporativa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsPipMinimized(true)}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                  title="Minimizar a burbuja flotante"
                  aria-label="Minimizar a burbuja flotante"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative w-full aspect-[4/3] bg-black overflow-hidden group">
              {mode === 'avatar' ? (
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                  autoPlay
                  loop
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-cover"
                  onError={() => setMode('avatar')}
                />
              )}

              {isSpeaking && currentText && (
                <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-md rounded-lg p-1.5 border border-blue-400/40 text-[11px] text-blue-100 leading-tight flex items-center gap-1.5 animate-fadeIn shadow-lg">
                  <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                  <p className="truncate line-clamp-1 italic">{currentText}</p>
                </div>
              )}

              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-slate-300">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="font-mono">{formatTime(sessionSeconds)}</span>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 bg-blue-600/90 hover:bg-blue-500 rounded-full text-white transition-all shadow"
                    title={isPlaying ? 'Pausar video' : 'Reanudar video'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className={`p-1.5 rounded-full transition-all shadow ${
                      isMuted
                        ? 'bg-red-500/80 hover:bg-red-400 text-white'
                        : 'bg-slate-700/80 hover:bg-slate-600 text-white'
                    }`}
                    title={isMuted ? 'Activar Audio' : 'Silenciar'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMode(mode === 'avatar' ? 'video' : 'avatar')}
                    className="px-2 py-0.5 bg-slate-800/90 hover:bg-slate-700 text-[10px] font-medium rounded-full text-blue-300 border border-blue-400/30 transition-all"
                  >
                    {mode === 'avatar' ? 'Video Reel' : 'Avatar IA'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-200 text-[11px] leading-tight">
                  Asistente OESVICA
                </p>
                <p className="text-[10px] text-blue-400 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                  Atención OESVICA C.A.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-medium shadow-sm transition-all flex items-center gap-1"
              >
                <span>Ver Estudio</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULL CORPORATE PRESENTER STUDIO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-slate-900 rounded-3xl border border-blue-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 px-6 py-4 border-b border-blue-500/20 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 shadow-inner">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                    Estudio de Atención Virtual OESVICA
                  </h3>
                  <p className="text-xs text-blue-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Transmisión Continua en Tiempo Real • Uptime: {formatTime(sessionSeconds)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                title="Cerrar estudio"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 flex flex-col space-y-3">
                  <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-blue-500/30 shadow-xl">
                    {mode === 'avatar' ? (
                      <canvas
                        ref={modalCanvasRef}
                        width={640}
                        height={360}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        ref={modalVideoRef}
                        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                        autoPlay
                        loop
                        playsInline
                        muted={isMuted}
                        className="w-full h-full object-cover"
                        onError={() => setMode('avatar')}
                      />
                    )}

                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      <span className="font-semibold text-white text-[11px]">HD 1080p 60FPS</span>
                    </div>

                    {isSpeaking && currentText && (
                      <div className="absolute bottom-3 left-3 right-3 bg-black/85 backdrop-blur-md rounded-xl p-3 border border-blue-400/40 text-xs text-blue-100 shadow-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="font-semibold text-[10px] uppercase tracking-wider text-emerald-400">
                            Voz Sintetizada OESVICA
                          </span>
                        </div>
                        <p className="leading-relaxed italic">"{currentText}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlay}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pausar' : 'Reanudar'}</span>
                      </button>

                      <button
                        onClick={toggleMute}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          isMuted
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isMuted ? 'Silenciado' : 'Audio ON'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Modo:</span>
                      <button
                        onClick={() => setMode('avatar')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          mode === 'avatar'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Avatar Digital
                      </button>
                      <button
                        onClick={() => setMode('video')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          mode === 'video'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Video Loop
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={corporateAvatarImg}
                        alt="Asistente Corporativo OESVICA"
                        className="w-12 h-12 rounded-xl object-cover border border-blue-500/40"
                      />
                      <div>
                        <h4 className="font-bold text-white text-sm">Asistente OESVICA</h4>
                        <p className="text-xs text-blue-400">
                          Coordinación de Bienestar y Gestión Social
                        </p>
                        <p className="text-[11px] text-slate-400">OESVICA C.A. • RIF J-00000000-0</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                      "Bienvenido al portal interactivo de autogestión para los trabajadores de
                      OESVICA. Estoy aquí de manera continua para guiarte en la emisión de tus
                      recibos de pago, constancias de trabajo, verificación de Cesta Tickets y
                      formatos oficiales."
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400">
                        <span className="block text-slate-500 text-[10px]">Estado</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          En Línea 24/7
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400">
                        <span className="block text-slate-500 text-[10px]">Sesión Activa</span>
                        <span className="text-blue-300 font-mono font-semibold">
                          {formatTime(sessionSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Consultas Rápidas al Asistente
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => handleQuickQuestion('Quiero consultar mi último recibo de pago')}
                        className="p-2.5 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left text-xs text-slate-200 transition-all flex items-center justify-between group"
                      >
                        <span>📄 Descargar mi Recibo de Pago</span>
                        <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                      <button
                        onClick={() => handleQuickQuestion('Necesito emitir una carta de trabajo')}
                        className="p-2.5 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left text-xs text-slate-200 transition-all flex items-center justify-between group"
                      >
                        <span>📋 Solicitar Carta de Trabajo con Sueldo</span>
                        <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                      <button
                        onClick={() => handleQuickQuestion('¿Cuánto me corresponde de Cesta Ticket este mes?')}
                        className="p-2.5 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left text-xs text-slate-200 transition-all flex items-center justify-between group"
                      >
                        <span>🍽️ Consultar Monto de Cesta Ticket</span>
                        <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Seguridad OESVICA • Conexión protegida SSL y verificación de identidad
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-all"
              >
                Volver al Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
