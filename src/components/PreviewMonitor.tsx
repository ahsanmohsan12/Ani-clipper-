import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Snowflake,
  Maximize2,
  KeyRound,
  ZoomIn,
  Video,
  Columns,
  PictureInPicture2,
} from 'lucide-react';
import {
  type ProjectState,
  type TimelineClip,
  formatTimecode,
  interpolateTransformAtTime,
  clamp,
} from '../editor/engine';

interface PreviewMonitorProps {
  project: ProjectState;
  playheadTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  selectedClipId: string | null;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onSeek: (time: number) => void;
  onStepFrames: (deltaFrames: number) => void;
  onChangeAspectRatio: (ratio: ProjectState['aspectRatio']) => void;
  onUpdateClipTransform: (clipId: string, patch: { x?: number; y?: number; scale?: number; rotation?: number }) => void;
  onTriggerZoomHighlight: (clipId: string) => void;
  onTriggerFreezeFrame: () => void;
  onChangeCommentaryLayout: (mode: ProjectState['commentary']['layoutMode']) => void;
}

export const PreviewMonitor: React.FC<PreviewMonitorProps> = ({
  project,
  playheadTime,
  isPlaying,
  loopPlayback,
  selectedClipId,
  onTogglePlay,
  onToggleLoop,
  onSeek,
  onStepFrames,
  onChangeAspectRatio,
  onUpdateClipTransform,
  onTriggerZoomHighlight,
  onTriggerFreezeFrame,
  onChangeCommentaryLayout,
}) => {
  const [isDraggingHud, setIsDraggingHud] = useState(false);
  const dragOriginRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [liveCameraStream, setLiveCameraStream] = useState<MediaStream | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (webcamVideoRef.current && liveCameraStream) {
      webcamVideoRef.current.srcObject = liveCameraStream;
    }
  }, [liveCameraStream]);

  useEffect(() => {
    return () => {
      if (liveCameraStream) {
        liveCameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [liveCameraStream]);

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

  const activeCaptionClip = project.clips.find(
    (c) =>
      c.trackId === 'captions' &&
      !c.muted &&
      playheadTime >= c.startTime &&
      playheadTime <= c.startTime + c.duration
  );

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
    if (filter === 'kodak-2383') presetExtra = 'sepia(0.14) contrast(1.08)';
    if (filter === 'cinema-warm') presetExtra = 'sepia(0.22) saturate(1.12)';
    if (filter === 'noir-contrast') presetExtra = 'grayscale(0.92) contrast(1.25)';
    if (filter === 'cyber-teal') presetExtra = 'hue-rotate(-14deg) saturate(1.18)';
    if (filter === 'vintage-fade') presetExtra = 'sepia(0.28) brightness(1.05) contrast(0.92)';
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

  const aspectContainerClass =
    project.aspectRatio === '16:9'
      ? 'aspect-video w-full max-w-[780px]'
      : project.aspectRatio === '9:16'
      ? 'aspect-[9/16] h-[340px]'
      : 'aspect-square h-[340px]';

  const pipCornerClasses: Record<ProjectState['commentary']['pipCorner'], string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <section
      aria-label="Frame-Accurate Preview Monitor"
      className="flex flex-col flex-1 bg-[#0B0C0E] border-r border-[#23262F] min-w-0 select-none"
    >
      {/* Top Monitor Context Bar */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-[#23262F] bg-[#14161A]">
        <div className="flex items-center gap-3 text-xs text-[#8E95A5]">
          <span className="font-medium text-[#F1F3F5]">Program Monitor</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[#E56B38]">
            {project.fps} FPS
          </span>
          <span aria-hidden="true">·</span>
          {activeVideoClip ? (
            <span className="truncate max-w-[200px] text-[#F1F3F5]">
              {activeVideoClip.name} ({activeVideoClip.speed.toFixed(2)}x)
            </span>
          ) : (
            <span>No Active Video Segment</span>
          )}
        </div>

        {/* Aspect Ratio & Layout Mode Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0B0C0E] p-0.5 rounded border border-[#23262F]">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onChangeAspectRatio(ratio)}
                aria-label={`Aspect ratio ${ratio}`}
                className={`px-2 py-0.5 text-[11px] font-mono tabular-nums rounded transition-colors whitespace-nowrap shrink-0 ${
                  project.aspectRatio === ratio
                    ? 'bg-[#23262F] text-[#F1F3F5] font-medium'
                    : 'text-[#8E95A5] hover:text-[#F1F3F5]'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#0B0C0E] p-0.5 rounded border border-[#23262F]">
            <button
              type="button"
              onClick={() => onChangeCommentaryLayout('standard')}
              title="Single Source View"
              className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                project.commentary.layoutMode === 'standard'
                  ? 'bg-[#E56B38] text-white font-medium'
                  : 'text-[#8E95A5] hover:text-[#F1F3F5]'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Single</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCommentaryLayout('pip-Bhd')}
              title="Picture-in-Picture Commentary"
              className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                project.commentary.layoutMode === 'pip-Bhd'
                  ? 'bg-[#E56B38] text-white font-medium'
                  : 'text-[#8E95A5] hover:text-[#F1F3F5]'
              }`}
            >
              <PictureInPicture2 className="w-3 h-3" />
              <span>PiP Cam</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCommentaryLayout('split-vertical')}
              title="Split-Screen Commentary"
              className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                project.commentary.layoutMode === 'split-vertical'
                  ? 'bg-[#E56B38] text-white font-medium'
                  : 'text-[#8E95A5] hover:text-[#F1F3F5]'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split-Screen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden bg-[#08090B]">
        <div
          data-testid="preview-canvas-stage"
          onMouseDown={handleHudMouseDown}
          className={`relative ${aspectContainerClass} bg-[#111318] border border-[#272B36] overflow-hidden shadow-2xl cursor-move group`}
        >
          {/* Split-Screen vs Standard/PiP Layout Rendering */}
          <div className="absolute inset-0 flex">
            {/* Primary Source Video Pane */}
            <div
              style={{
                width:
                  project.commentary.layoutMode === 'split-vertical'
                    ? `${Math.round(project.commentary.splitRatio * 100)}%`
                    : '100%',
              }}
              className="relative h-full overflow-hidden bg-[#0D0F14]"
            >
              {activeVideoClip ? (
                <div
                  style={{
                    transform: `translate(${interpTransform.x}%, ${interpTransform.y}%) scale(${interpTransform.scale}) rotate(${interpTransform.rotation}deg)`,
                    clipPath: `inset(${activeVideoClip.crop.top}% ${activeVideoClip.crop.right}% ${activeVideoClip.crop.bottom}% ${activeVideoClip.crop.left}%)`,
                    filter: getCssFilterString(activeVideoClip),
                  }}
                  className="w-full h-full relative transition-transform duration-75"
                >
                  {activeVideoClip.thumbnailUrl ? (
                    <img
                      src={activeVideoClip.thumbnailUrl}
                      alt={activeVideoClip.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C2029] to-[#0E1015]">
                      <Video className="w-10 h-10 text-[#8E95A5]" />
                    </div>
                  )}

                  {/* Subtle film grain / scanline movement when playing */}
                  <div
                    style={{
                      backgroundPosition: `${Math.round((playheadTime * 40) % 100)}px ${Math.round((playheadTime * 25) % 100)}px`,
                    }}
                    className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_0)] bg-[size:16px_16px] pointer-events-none"
                  />

                  {/* Freeze-Frame Indicator Scrim */}
                  {activeVideoClip.isFreezeFrame && (
                    <div className="absolute inset-0 ring-2 ring-inset ring-[#F59E0B]/80 bg-[#0B0C0E]/20 flex items-start justify-left p-3 pointer-events-none">
                      <span className="px-2 py-0.5 bg-[#0B0C0E]/90 border border-[#F59E0B]/50 text-[#F59E0B] font-mono text-[11px] tracking-wider uppercase">
                        FREEZE FRAME · {formatTimecode(activeVideoClip.freezeFrameTime ?? playheadTime, project.fps)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#8E95A5] gap-2">
                  <span>Playhead outside video clips</span>
                  <span className="font-mono text-[11px]">{formatTimecode(playheadTime, project.fps)}</span>
                </div>
              )}

              {/* Interactive Reframe / Keyframe Bounding HUD */}
              {activeVideoClip && (
                <div className="absolute inset-3 border border-dashed border-[#E56B38]/45 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
                  <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#E56B38]" />
                  <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#E56B38]" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#E56B38]" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#E56B38]" />
                  <div className="absolute top-2 left-2 bg-[#0B0C0E]/85 px-2 py-0.5 text-[10px] font-mono tabular-nums text-[#F1F3F5] border border-[#23262F]">
                    XY: {interpTransform.x}%, {interpTransform.y}% · Scale: {interpTransform.scale.toFixed(2)}x · Rot: {interpTransform.rotation}°
                  </div>
                </div>
              )}
            </div>

            {/* Split-Screen Right Commentary Pane */}
            {project.commentary.layoutMode === 'split-vertical' && (
              <div
                style={{ width: `${Math.round((1 - project.commentary.splitRatio) * 100)}%` }}
                className="relative h-full border-l-2 border-[#E56B38] bg-[#14161A] overflow-hidden flex flex-col justify-between"
              >
                {liveCameraStream ? (
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={project.commentary.webcamAvatarUrl}
                    alt={project.commentary.creatorName}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="relative z-10 p-3 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#F59E0B] tracking-wider uppercase">
                      COMMENTARY CAM · {project.commentary.brandTagline}
                    </span>
                    <span className="text-[11px] text-[#F1F3F5] font-medium">
                      {project.commentary.creatorName}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8E95A5]">
                    Transformative Split-Screen Analysis
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Picture-in-Picture (PiP) Reaction Webcam Overlay */}
          {project.commentary.layoutMode === 'pip-Bhd' && project.commentary.webcamActive && (
            <div
              style={{ width: `${Math.round(project.commentary.pipScale * 100)}%` }}
              className={`absolute ${pipCornerClasses[project.commentary.pipCorner]} aspect-video rounded-md overflow-hidden border-2 border-[#E56B38] shadow-xl bg-[#14161A] z-20`}
            >
              {liveCameraStream ? (
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={project.commentary.webcamAvatarUrl}
                  alt="Creator PiP Reaction Webcam"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-0 inset-x-0 px-2 py-0.5 bg-black/75 flex items-center justify-between text-[10px]">
                <span className="text-white font-medium truncate">{project.commentary.creatorName}</span>
                <span className="text-[#F59E0B] font-mono">MIC + CAM</span>
              </div>
            </div>
          )}

          {/* Active Track V2 Overlays (Text, Stickers, Shapes, Arrows, Zoom Highlights, Title Cards) */}
          {activeOverlays.map((ovClip) => {
            const ov = ovClip.overlay;
            if (!ov) return null;

            if (ov.kind === 'title-card') {
              return (
                <div
                  key={ovClip.id}
                  className="absolute inset-0 z-30 bg-[#0B0C0E]/92 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div
                    style={{ backgroundColor: ov.accentColor || '#E56B38' }}
                    className="w-12 h-1 mb-4"
                  />
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight mb-2">
                    {ov.text}
                  </h2>
                  {ov.subtext && (
                    <p className="text-sm font-mono text-[#F59E0B] tracking-widest uppercase">
                      {ov.subtext}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div key={ovClip.id} className="absolute inset-0 pointer-events-none z-20">
                {/* SVG Vector Arrow or Highlight Ring */}
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <marker
                      id={`arrowhead-${ovClip.id}`}
                      markerWidth="6"
                      markerHeight="6"
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 6 3, 0 6" fill={ov.color || '#E56B38'} />
                    </marker>
                  </defs>
                  {ov.kind === 'arrow' && ov.targetX !== undefined && ov.targetY !== undefined && (
                    <>
                      <line
                        x1={ov.x + 8}
                        y1={ov.y + 6}
                        x2={ov.targetX}
                        y2={ov.targetY}
                        stroke={ov.color || '#E56B38'}
                        strokeWidth="0.9"
                        markerEnd={`url(#arrowhead-${ovClip.id})`}
                      />
                      <circle
                        cx={ov.targetX}
                        cy={ov.targetY}
                        r="4.2"
                        fill="none"
                        stroke={ov.accentColor || '#F59E0B'}
                        strokeWidth="0.7"
                        strokeDasharray="1.5 1"
                      />
                    </>
                  )}
                  {(ov.kind === 'zoom-highlight' || ov.shapeType === 'highlight-ring') && (
                    <circle
                      cx={ov.x}
                      cy={ov.y}
                      r="11"
                      fill="none"
                      stroke={ov.color || '#38BDF8'}
                      strokeWidth="0.8"
                      strokeDasharray="2 1"
                    />
                  )}
                  {ov.kind === 'shape' && ov.shapeType === 'rectangle' && (
                    <rect
                      x={ov.x - 10}
                      y={ov.y - 8}
                      width="24"
                      height="16"
                      fill="none"
                      stroke={ov.color || '#E56B38'}
                      strokeWidth="0.9"
                    />
                  )}
                </svg>

                {/* Overlay Callout Label / Sticker */}
                <div
                  style={{
                    left: `${ov.x}%`,
                    top: `${ov.y}%`,
                    transform: `translate(-10%, -50%) scale(${ov.scale || 1}) rotate(${ov.rotation || 0}deg)`,
                  }}
                  className="absolute max-w-[260px] bg-[#0B0C0E]/90 border border-[#E56B38] px-3 py-1.5 rounded shadow-lg"
                >
                  {ov.subtext && (
                    <div className="text-[9px] font-mono text-[#F59E0B] tracking-wider uppercase mb-0.5">
                      {ov.subtext}
                    </div>
                  )}
                  <div className="text-xs font-display font-semibold text-white leading-snug">
                    {ov.stickerSymbol ? `${ov.stickerSymbol} ${ov.text}` : ov.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Active Track C1 Word-by-Word Animated Captions */}
          {activeCaptionClip && activeCaptionClip.captions && (
            <div
              style={{ top: `${activeCaptionClip.captionStyle?.positionY ?? 84}%` }}
              className="absolute inset-x-0 -translate-y-1/2 flex justify-center px-6 pointer-events-none z-25"
            >
              <div
                style={{
                  backgroundColor: activeCaptionClip.captionStyle?.bgColor ?? 'rgba(11, 12, 14, 0.85)',
                  fontFamily: activeCaptionClip.captionStyle?.fontFamily ?? 'Plus Jakarta Sans',
                }}
                className="px-4 py-2 rounded border border-white/10 shadow-xl flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1"
              >
                {activeCaptionClip.captions.map((w) => {
                  const relTime = playheadTime - activeCaptionClip.startTime;
                  const isCurrentWord = relTime >= w.startOffset && relTime <= w.endOffset;
                  return (
                    <span
                      key={w.id}
                      style={{
                        color: isCurrentWord
                          ? activeCaptionClip.captionStyle?.activeWordColor ?? '#F59E0B'
                          : w.highlight
                          ? '#FDE68A'
                          : activeCaptionClip.captionStyle?.textColor ?? '#F1F3F5',
                        transform: isCurrentWord ? 'scale(1.12)' : 'scale(1)',
                      }}
                      className="text-sm md:text-base font-bold tracking-tight transition-transform duration-75 inline-block"
                    >
                      {w.word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Transport & Quick Frame Action Bar */}
      <div className="h-12 px-4 bg-[#14161A] border-t border-[#23262F] flex items-center justify-between gap-4">
        {/* Left: Frame-Accurate SMPTE Timecode Readout */}
        <div className="flex items-center gap-3">
          <div
            data-testid="smpte-timecode-display"
            className="px-2.5 py-1 bg-[#0B0C0E] border border-[#23262F] rounded font-mono text-xs tabular-nums text-[#F1F3F5]"
          >
            <span className="text-[#E56B38] font-semibold">
              {formatTimecode(playheadTime, project.fps)}
            </span>
            <span className="text-[#8E95A5] mx-1.5">/</span>
            <span className="text-[#8E95A5]">
              {formatTimecode(project.duration, project.fps)}
            </span>
          </div>
        </div>

        {/* Center: Frame-Step & Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSeek(0)}
            aria-label="Jump to start"
            className="p-1.5 text-[#8E95A5] hover:text-[#F1F3F5] hover:bg-[#1C1F26] rounded transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrames(-1)}
            aria-label="Step back 1 frame"
            className="px-2 py-1 text-xs font-mono text-[#F1F3F5] bg-[#1C1F26] hover:bg-[#272B36] border border-[#23262F] rounded flex items-center gap-0.5 transition-colors whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>-1f</span>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause playback' : 'Play timeline'}
            className="px-3.5 py-1.5 bg-[#E56B38] hover:bg-[#d45d2c] text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() => onStepFrames(1)}
            aria-label="Step forward 1 frame"
            className="px-2 py-1 text-xs font-mono text-[#F1F3F5] bg-[#1C1F26] hover:bg-[#272B36] border border-[#23262F] rounded flex items-center gap-0.5 transition-colors whitespace-nowrap shrink-0"
          >
            <span>+1f</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSeek(project.duration)}
            aria-label="Jump to end"
            className="p-1.5 text-[#8E95A5] hover:text-[#F1F3F5] hover:bg-[#1C1F26] rounded transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            aria-label="Toggle loop playback"
            className={`p-1.5 rounded border transition-colors ${
              loopPlayback
                ? 'bg-[#1C1F26] border-[#E56B38] text-[#E56B38]'
                : 'border-transparent text-[#8E95A5] hover:text-[#F1F3F5]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Quick Keyframe & Transformative Freeze-Frame Actions */}
        <div className="flex items-center gap-2">
          {activeVideoClip && (
            <button
              type="button"
              onClick={() => onTriggerZoomHighlight(activeVideoClip.id)}
              className="px-2.5 py-1 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Zoom Highlight</span>
            </button>
          )}
          <button
            type="button"
            onClick={onTriggerFreezeFrame}
            className="px-2.5 py-1 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Snowflake className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Freeze + Annotate</span>
          </button>
        </div>
      </div>
    </section>
  );
};
