import React, { useEffect, useRef, useState } from 'react';
import {
  type ProjectState,
  type TimelineClip,
  formatTimecode,
  interpolateTransformAtTime,
  clamp,
} from '../editor/engine';
import type { CaptionVisualPreset } from '../editor/defaultProject';

interface PreviewMonitorProps {
  project: ProjectState;
  playheadTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectedClipId: string | null;
  activeCaptionPresetId: CaptionVisualPreset['id'];
  activeTransition: 'fade' | 'zoom' | 'slide';
  autoReframeActive: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onSeek: (time: number) => void;
  onStepFrames: (deltaFrames: number) => void;
  onChangeAspectRatio: (ratio: ProjectState['aspectRatio']) => void;
  onUpdateClipTransform: (
    clipId: string,
    patch: { x?: number; y?: number; scale?: number; rotation?: number }
  ) => void;
  onTriggerZoomHighlight: (clipId: string) => void;
  onTriggerFreezeFrame: () => void;
  onChangeCommentaryLayout: (mode: ProjectState['commentary']['layoutMode']) => void;
  onOpenExportModal?: () => void;
  onQuickDownloadMp4?: () => void;
}

export const PreviewMonitor: React.FC<PreviewMonitorProps> = ({
  project,
  playheadTime,
  isPlaying,
  activeCaptionPresetId,
  activeTransition,
  autoReframeActive,
  onTogglePlay,
  onSeek,
  onStepFrames,
  onChangeAspectRatio,
  onUpdateClipTransform,
  onTriggerZoomHighlight,
  onTriggerFreezeFrame,
  onChangeCommentaryLayout,
  onOpenExportModal,
  onQuickDownloadMp4,
}) => {
  const [isDraggingHud, setIsDraggingHud] = useState(false);
  const dragOriginRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const activeVideoClip =
    project.clips.find(
      (c) =>
        c.trackId === 'video' &&
        !c.muted &&
        playheadTime >= c.startTime &&
        playheadTime <= c.startTime + c.duration
    ) ||
    project.clips.find(
      (c) =>
        c.trackId === 'video' &&
        playheadTime >= c.startTime &&
        playheadTime <= c.startTime + c.duration
    );

  const activeOverlays = project.clips.filter(
    (c) =>
      c.trackId === 'overlay' &&
      !c.muted &&
      playheadTime >= c.startTime &&
      playheadTime <= c.startTime + c.duration
  );

  const activeCaptionClip =
    project.clips.find(
      (c) =>
        c.trackId === 'captions' &&
        !c.muted &&
        playheadTime >= c.startTime &&
        playheadTime <= c.startTime + c.duration
    ) ||
    project.clips.find((c) => c.id === 'clip_cap_2') ||
    project.clips.find((c) => c.trackId === 'captions');

  const interpTransform = activeVideoClip
    ? interpolateTransformAtTime(activeVideoClip, playheadTime)
    : { x: 0, y: 0, scale: 1, rotation: 0 };

  const getCssFilterString = (clip?: TimelineClip): string => {
    if (!clip) return 'none';
    const { brightness, contrast, saturation, filter } = clip.colorSettings;
    const b = 1 + brightness / 100;
    const c = 1 + contrast / 100;
    const s = Math.max(0, 1 + saturation / 100);
    let presetExtra = '';
    if (filter === 'kodak-2383') presetExtra = 'sepia(0.12) contrast(1.08)';
    if (filter === 'cinema-warm') presetExtra = 'sepia(0.18) saturate(1.14)';
    if (filter === 'noir-contrast') presetExtra = 'grayscale(0.92) contrast(1.25)';
    if (filter === 'cyber-teal') presetExtra = 'hue-rotate(-8deg) saturate(1.18) contrast(1.06)';
    if (filter === 'vintage-fade') presetExtra = 'sepia(0.24) brightness(1.05)';
    return `brightness(${b.toFixed(2)}) contrast(${c.toFixed(2)}) saturate(${s.toFixed(2)}) ${presetExtra}`.trim();
  };

  const handleHudMouseDown = (e: React.MouseEvent) => {
    if (!activeVideoClip) return;
    e.preventDefault();
    setIsDraggingHud(true);
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: interpTransform.x,
      origY: interpTransform.y,
    };
  };

  useEffect(() => {
    if (!isDraggingHud || !activeVideoClip) return;
    const handleMove = (e: MouseEvent) => {
      if (!dragOriginRef.current) return;
      const dx = (e.clientX - dragOriginRef.current.startX) * 0.25;
      const dy = (e.clientY - dragOriginRef.current.startY) * 0.25;
      onUpdateClipTransform(activeVideoClip.id, {
        x: Math.round(clamp(dragOriginRef.current.origX + dx, -60, 60)),
        y: Math.round(clamp(dragOriginRef.current.origY + dy, -60, 60)),
      });
    };
    const handleUp = () => {
      setIsDraggingHud(false);
      dragOriginRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingHud, activeVideoClip, onUpdateClipTransform]);

  const formatTimeSecTenths = (sec: number) => {
    const clamped = Math.max(0, sec);
    const mins = String(Math.floor(clamped / 60)).padStart(2, '0');
    const secs = (clamped % 60).toFixed(1).padStart(4, '0');
    return `${mins}:${secs}`;
  };

  const aspectStageClass =
    project.aspectRatio === '9:16'
      ? 'h-full aspect-[9/16]'
      : project.aspectRatio === '1:1'
      ? 'h-[360px] aspect-square'
      : 'w-full max-w-[560px] aspect-video';

  const pipCornerClasses: Record<ProjectState['commentary']['pipCorner'], string> = {
    'bottom-right': 'bottom-10 right-3',
    'bottom-left': 'bottom-10 left-3',
    'top-right': 'top-10 right-3',
    'top-left': 'top-10 left-3',
  };

  const wordsToRender =
    activeCaptionClip?.captions && activeCaptionClip.captions.length > 0
      ? activeCaptionClip.captions
      : [
          { id: 'w1', word: 'THE', startOffset: 0, endOffset: 0.7 },
          { id: 'w2', word: 'FUTURE', startOffset: 0.7, endOffset: 1.4 },
          { id: 'w3', word: 'OF', startOffset: 1.4, endOffset: 2.0 },
          { id: 'w4', word: 'INTELLIGENCE', startOffset: 2.0, endOffset: 3.4, highlight: true },
          { id: 'w5', word: 'IS', startOffset: 3.4, endOffset: 3.9 },
          { id: 'w6', word: 'HERE', startOffset: 3.9, endOffset: 4.5 },
        ];

  const highlightChipClass =
    activeCaptionPresetId === 'mr-beast'
      ? 'text-on-primary bg-primary px-2.5 py-0.5 rounded-lg shadow-[0_0_30px_rgba(202,190,255,0.85)] scale-105 inline-block transform rotate-1 font-black'
      : activeCaptionPresetId === 'ali-abdaal'
      ? 'text-surface bg-on-surface px-2.5 py-0.5 rounded-md shadow-md inline-block font-bold'
      : activeCaptionPresetId === 'karaoke-glow'
      ? 'text-on-tertiary bg-tertiary px-2.5 py-0.5 rounded-lg shadow-[0_0_28px_rgba(255,183,128,0.85)] scale-105 inline-block font-black'
      : 'text-secondary-container bg-surface-container-lowest/95 px-2.5 py-0.5 rounded-lg shadow-[0_0_30px_rgba(238,194,0,0.85)] scale-105 inline-block transform -rotate-1 font-black';

  return (
    <section
      aria-label="Frame-Accurate Preview Monitor"
      className="flex-1 flex flex-col bg-surface relative overflow-hidden items-center justify-between p-space-md min-w-0 select-none"
    >
      {/* Stage Breadcrumb & Ratio Controls (Exact match to code_a5f5c0ca.html) */}
      <div className="w-full flex items-center justify-between px-space-sm gap-2 flex-wrap">
        <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
          <span className="text-secondary font-bold">LIVE FRAME SCRUB</span>
          <span>•</span>
          <span className="text-on-surface truncate">
            Auto-Track: Speaker #1 (Sam Altman)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Commentary Layout Quick Pills */}
          <div className="hidden xl:flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
            <button
              type="button"
              onClick={() => onChangeCommentaryLayout('standard')}
              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer ${
                project.commentary.layoutMode === 'standard'
                  ? 'bg-surface-container-high text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => onChangeCommentaryLayout('pip-Bhd')}
              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer ${
                project.commentary.layoutMode === 'pip-Bhd'
                  ? 'bg-surface-container-high text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              PiP Cam
            </button>
            <button
              type="button"
              onClick={() => onChangeCommentaryLayout('split-vertical')}
              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer ${
                project.commentary.layoutMode === 'split-vertical'
                  ? 'bg-surface-container-high text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Dual Split
            </button>
          </div>

          {/* Aspect Ratio Switcher Pill */}
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1 rounded-full shadow-sm">
            <button
              type="button"
              onClick={() => onChangeAspectRatio('9:16')}
              className={`px-space-xs font-label-sm text-label-sm cursor-pointer ${
                project.aspectRatio === '9:16'
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              9:16 TikTok
            </button>
            <span className="text-outline text-label-sm">/</span>
            <button
              type="button"
              onClick={() => onChangeAspectRatio('1:1')}
              className={`px-space-xs font-label-sm text-label-sm cursor-pointer ${
                project.aspectRatio === '1:1'
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              1:1 Square
            </button>
            <span className="text-outline text-label-sm">/</span>
            <button
              type="button"
              onClick={() => onChangeAspectRatio('16:9')}
              className={`px-space-xs font-label-sm text-label-sm cursor-pointer ${
                project.aspectRatio === '16:9'
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              16:9 Wide
            </button>
          </div>
        </div>
      </div>

      {/* Phone Viewport Stage (9:16 Mockup matching code_a5f5c0ca.html) */}
      <div className="relative flex-1 flex items-center justify-center my-1 w-full max-h-[490px] min-h-[260px]">
        <div
          data-testid="preview-canvas-stage"
          onMouseDown={handleHudMouseDown}
          className={`relative ${aspectStageClass} rounded-2xl bg-surface-container-lowest overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col justify-between cursor-move`}
        >
          {/* Split-Screen vs Single/PiP Video Layer */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div
              style={{
                width:
                  project.commentary.layoutMode === 'split-vertical'
                    ? `${Math.round(project.commentary.splitRatio * 100)}%`
                    : '100%',
              }}
              className="relative h-full overflow-hidden"
            >
              <div
                style={{
                  transform: `translate(${interpTransform.x}%, ${interpTransform.y}%) scale(${
                    interpTransform.scale * (activeTransition === 'zoom' ? 1.04 : 1)
                  }) rotate(${interpTransform.rotation}deg)`,
                  clipPath: activeVideoClip
                    ? `inset(${activeVideoClip.crop.top}% ${activeVideoClip.crop.right}% ${activeVideoClip.crop.bottom}% ${activeVideoClip.crop.left}%)`
                    : undefined,
                  filter: getCssFilterString(activeVideoClip),
                }}
                className="w-full h-full relative transition-transform duration-75"
              >
                <img
                  className="w-full h-full object-cover pointer-events-none"
                  alt="Keynote speaker Sam Altman in moody dark studio lighting"
                  src={
                    activeVideoClip?.thumbnailUrl ||
                    '/src/assets/images/commentary_creator_cam_1794941711189.jpg'
                  }
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes('commentary_creator_cam_1794941711189.jpg')) {
                      img.src = '/src/assets/images/commentary_creator_cam_1794941711189.jpg';
                    }
                  }}
                />
              </div>
            </div>

            {project.commentary.layoutMode === 'split-vertical' && (
              <div
                style={{ width: `${Math.round((1 - project.commentary.splitRatio) * 100)}%` }}
                className="relative h-full border-l-2 border-primary bg-surface-container-lowest overflow-hidden"
              >
                <img
                  src={project.commentary.webcamAvatarUrl}
                  alt={project.commentary.creatorName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-surface-container-lowest/90 px-2 py-0.5 rounded font-label-sm text-[9px] text-secondary uppercase">
                  COMMENTARY • {project.commentary.creatorName}
                </div>
              </div>
            )}
          </div>

          {/* Subtle Top & Bottom Gradient Scrims */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          {/* Top Overlay: Viral Score Pill & REC 60FPS Badge */}
          <div className="relative z-10 p-space-sm flex items-center justify-between">
            <div className="flex items-center gap-1 bg-surface-container-lowest/80 backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm">
              <span
                className="material-symbols-outlined text-secondary text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_fix_high
              </span>
              <span className="font-label-sm text-label-sm font-semibold text-secondary">
                VIRAL HOOK 99%
              </span>
            </div>
            <div className="flex items-center gap-1 bg-surface-container-lowest/70 backdrop-blur-md px-2 py-0.5 rounded-full text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              REC 60FPS
            </div>
          </div>

          {/* Freeze-Frame Active Badge if playhead is on a freeze segment */}
          {activeVideoClip?.isFreezeFrame && (
            <div className="relative z-20 mx-auto px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-[10px] font-bold shadow-lg">
              FREEZE FRAME HOLD • {formatTimecode(activeVideoClip.freezeFrameTime ?? playheadTime, project.fps)}
            </div>
          )}

          {/* AI Speaker Lock Bounding Box (Centering indicator) */}
          {autoReframeActive && (
            <div
              style={{
                transform: `translate(${interpTransform.x * 0.5}px, ${interpTransform.y * 0.5}px)`,
              }}
              className="absolute top-[19%] left-[14%] right-[14%] h-[36%] rounded-xl pointer-events-none flex flex-col justify-between p-1.5 shadow-[0_0_20px_rgba(202,190,255,0.15)] bg-primary/5 border border-primary/25"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded-md text-[9px] font-label-sm text-primary truncate">
                  <span className="material-symbols-outlined text-[11px]">
                    center_focus_strong
                  </span>
                  <span>AI SPEAKER LOCK (98.4%)</span>
                </div>
                <span className="text-[9px] font-label-sm text-secondary bg-surface-container-lowest/90 px-1 rounded shrink-0">
                  X: {542 + interpTransform.x} Y: {380 + interpTransform.y}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="w-2 h-2 rounded-bl-sm bg-primary" />
                <span className="w-2 h-2 rounded-br-sm bg-primary" />
              </div>
            </div>
          )}

          {/* Picture-in-Picture (PiP) Reaction Webcam Overlay */}
          {project.commentary.layoutMode === 'pip-Bhd' && project.commentary.webcamActive && (
            <div
              style={{ width: `${Math.round(project.commentary.pipScale * 100)}%` }}
              className={`absolute ${pipCornerClasses[project.commentary.pipCorner]} aspect-video rounded-lg overflow-hidden border-2 border-primary shadow-xl bg-surface-container-lowest z-20 pointer-events-none`}
            >
              <img
                src={project.commentary.webcamAvatarUrl}
                alt="Creator PiP Reaction Cam"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 bg-surface-container-lowest/85 flex items-center justify-between text-[8px] font-label-sm">
                <span className="text-on-surface truncate">{project.commentary.creatorName}</span>
                <span className="text-secondary">CAM</span>
              </div>
            </div>
          )}

          {/* Active V2 Graphic Overlays (Arrows, Callouts, Title Cards) */}
          {activeOverlays.map((ovClip) => {
            const ov = ovClip.overlay;
            if (!ov) return null;

            if (ov.kind === 'title-card') {
              return (
                <div
                  key={ovClip.id}
                  className="absolute inset-0 z-30 bg-surface-container-lowest/92 flex flex-col items-center justify-center p-6 text-center pointer-events-none"
                >
                  <div className="w-10 h-1 mb-3 rounded-full bg-primary" />
                  <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
                    {ov.text}
                  </h2>
                  {ov.subtext && (
                    <p className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
                      {ov.subtext}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div key={ovClip.id} className="absolute inset-0 pointer-events-none z-20">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {ov.kind === 'arrow' && ov.targetX !== undefined && ov.targetY !== undefined && (
                    <>
                      <line
                        x1={ov.x + 8}
                        y1={ov.y + 6}
                        x2={ov.targetX}
                        y2={ov.targetY}
                        stroke={ov.color || '#cabeff'}
                        strokeWidth="1.2"
                      />
                      <circle
                        cx={ov.targetX}
                        cy={ov.targetY}
                        r="4.5"
                        fill="none"
                        stroke={ov.accentColor || '#ffe083'}
                        strokeWidth="1"
                        strokeDasharray="2 1"
                      />
                    </>
                  )}
                </svg>
                <div
                  style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
                  className="absolute max-w-[180px] bg-surface-container-lowest/90 border border-primary/60 px-2 py-1 rounded-md shadow-lg"
                >
                  {ov.subtext && (
                    <div className="text-[8px] font-label-sm text-secondary uppercase">
                      {ov.subtext}
                    </div>
                  )}
                  <div className="text-[10px] font-title-md text-on-surface leading-tight">
                    {ov.stickerSymbol ? `${ov.stickerSymbol} ${ov.text}` : ov.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center Kinetic Hormozi-Style Captions Overlay (Exact match to code_a5f5c0ca.html) */}
          <div className="relative z-10 px-space-sm mb-8 flex flex-col items-center text-center pointer-events-none mt-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
              {wordsToRender.map((w) => {
                const isHot = Boolean(w.highlight) || w.word.toUpperCase() === 'INTELLIGENCE';
                if (isHot) {
                  return (
                    <span key={w.id} className="relative inline-block">
                      <span
                        className={`font-display text-[22px] leading-7 uppercase tracking-tight ${highlightChipClass}`}
                      >
                        {w.word}
                      </span>
                    </span>
                  );
                }
                return (
                  <span
                    key={w.id}
                    className="font-display text-[22px] leading-7 uppercase tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] opacity-90 font-bold"
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>

            {/* Auto-Generated Animated Hook Sticker Badge + End-of-Clip Download Action */}
            <div className="mt-space-sm flex items-center gap-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full text-primary font-label-md text-label-md font-bold shadow-[0_0_16px_rgba(202,190,255,0.4)]">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                <span>SYNTHESIS COMPLETE</span>
              </div>
              {onQuickDownloadMp4 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickDownloadMp4();
                  }}
                  title="Download Short (.MP4)"
                  className="flex items-center gap-1 bg-secondary hover:bg-secondary-fixed-dim text-on-secondary px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold shadow-lg cursor-pointer transition-transform hover:scale-105"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>MP4</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Viewport TikTok Safe Zones Indicator Guide */}
          <div className="relative z-10 p-space-sm flex items-center justify-between text-on-surface-variant/70 font-label-sm text-label-sm">
            <span>Safe Canvas Zone</span>
            <span className="material-symbols-outlined text-[14px]">grid_4x4</span>
          </div>
        </div>
      </div>

      {/* Playback Transport Controller Bar (Exact match to code_a5f5c0ca.html) */}
      <div className="w-full max-w-2xl bg-surface-container-low px-space-md py-space-xs rounded-full flex items-center justify-between shadow-lg my-0.5 gap-2">
        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <button
            type="button"
            onClick={() => onStepFrames(-1)}
            aria-label="Step back 1 frame"
            title="Step -1 Frame (←)"
            className="p-1 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">replay_5</span>
          </button>
          <button
            type="button"
            onClick={() => onSeek(0)}
            aria-label="Jump to start"
            title="Previous Cut ([)"
            className="p-1 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">skip_previous</span>
          </button>
        </div>

        {/* Play / Pause Main Trigger */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause playback' : 'Play timeline'}
          title="Play / Pause (Space)"
          className="w-10 h-10 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_16px_rgba(202,190,255,0.4)] cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[22px]">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <button
            type="button"
            onClick={() => onSeek(project.duration)}
            aria-label="Jump to end"
            title="Next Cut (])"
            className="p-1 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">skip_next</span>
          </button>
          <button
            type="button"
            onClick={() => onStepFrames(1)}
            aria-label="Step forward 1 frame"
            title="Step +1 Frame (→)"
            className="p-1 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">forward_5</span>
          </button>
        </div>

        <div className="h-4 w-[1px] bg-surface-container-high" />

        {/* Timecode Display */}
        <div
          data-testid="smpte-timecode-display"
          title={`SMPTE: ${formatTimecode(playheadTime, project.fps)}`}
          className="flex items-center gap-1 font-label-md text-label-md tabular-nums"
        >
          <span className="text-secondary font-semibold">{formatTimeSecTenths(playheadTime)}</span>
          <span className="text-outline">/</span>
          <span className="text-on-surface-variant">{formatTimeSecTenths(project.duration)}</span>
        </div>

        {/* Quick Highlight, Freeze & Download Short Triggers */}
        <div className="hidden sm:flex items-center gap-1">
          {activeVideoClip && (
            <button
              type="button"
              onClick={() => onTriggerZoomHighlight(activeVideoClip.id)}
              title="Add 3-Keyframe Zoom Highlight"
              className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-surface-container-high text-secondary font-label-sm text-label-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">zoom_in</span>
              <span>Zoom</span>
            </button>
          )}
          <button
            type="button"
            onClick={onTriggerFreezeFrame}
            title="Freeze Frame + Annotation"
            className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">ac_unit</span>
            <span>Freeze</span>
          </button>
          {onOpenExportModal && (
            <button
              type="button"
              data-testid="transport-download-short-btn"
              onClick={onOpenExportModal}
              title="Render & Download Short (.MP4)"
              className="px-2.5 py-0.5 rounded-full bg-secondary/20 hover:bg-secondary/30 text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span>Download Short</span>
            </button>
          )}
        </div>

        {/* Volume Slider Quick Toggle */}
        <div className="hidden md:flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
            volume_up
          </span>
          <div className="w-14 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-3/4" />
          </div>
        </div>
      </div>
    </section>
  );
};
