import React, { useRef } from 'react';
import {
  Scissors,
  Trash2,
  ArrowLeftToLine,
  MoveLeft,
  MoveRight,
  Magnet,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Snowflake,
  Film,
  Layers,
  Subtitles,
  Mic,
  Sparkles,
  Music,
} from 'lucide-react';
import {
  type ProjectState,
  type TrackId,
  type TimelineClip,
  formatTimecode,
  clamp,
} from '../editor/engine';

interface MultiTrackTimelineProps {
  project: ProjectState;
  playheadTime: number;
  selectedClipId: string | null;
  snapEnabled: boolean;
  pixelsPerSecond: number;
  canUndo: boolean;
  canRedo: boolean;
  onSelectClip: (clipId: string) => void;
  onSeek: (time: number) => void;
  onSplitAtPlayhead: () => void;
  onDeleteSelected: (ripple: boolean) => void;
  onReorderSelected: (direction: 'prev' | 'next') => void;
  onTrimSelected: (edge: 'in' | 'out', deltaSec: number) => void;
  onToggleSnap: () => void;
  onChangeZoom: (pps: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTrackMute: (trackId: TrackId) => void;
  onToggleTrackSolo: (trackId: TrackId) => void;
  onTriggerFreezeFrame: () => void;
}

const TRACK_CONFIG: Array<{
  id: TrackId;
  label: string;
  code: string;
  accentColor: string;
  bgTint: string;
  borderTint: string;
}> = [
  {
    id: 'video',
    label: 'Video Master',
    code: 'V1',
    accentColor: '#3B82F6',
    bgTint: 'bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30',
    borderTint: 'border-[#3B82F6]',
  },
  {
    id: 'overlay',
    label: 'Overlays & HUD',
    code: 'V2',
    accentColor: '#8B5CF6',
    bgTint: 'bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30',
    borderTint: 'border-[#8B5CF6]',
  },
  {
    id: 'captions',
    label: 'Word Captions',
    code: 'C1',
    accentColor: '#F59E0B',
    bgTint: 'bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30',
    borderTint: 'border-[#F59E0B]',
  },
  {
    id: 'voiceover',
    label: 'Voiceover Mic',
    code: 'A1',
    accentColor: '#F43F5E',
    bgTint: 'bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30',
    borderTint: 'border-[#F43F5E]',
  },
  {
    id: 'sfx',
    label: 'CC0 SFX',
    code: 'A2',
    accentColor: '#10B981',
    bgTint: 'bg-[#10B981]/20 hover:bg-[#10B981]/30',
    borderTint: 'border-[#10B981]',
  },
  {
    id: 'music',
    label: 'CC0 Music Bed',
    code: 'A3',
    accentColor: '#06B6D4',
    bgTint: 'bg-[#06B6D4]/20 hover:bg-[#06B6D4]/30',
    borderTint: 'border-[#06B6D4]',
  },
];

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  project,
  playheadTime,
  selectedClipId,
  snapEnabled,
  pixelsPerSecond,
  canUndo,
  canRedo,
  onSelectClip,
  onSeek,
  onSplitAtPlayhead,
  onDeleteSelected,
  onReorderSelected,
  onTrimSelected,
  onToggleSnap,
  onChangeZoom,
  onUndo,
  onRedo,
  onToggleTrackMute,
  onToggleTrackSolo,
  onTriggerFreezeFrame,
}) => {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || null;

  const totalTimelineWidth = Math.max(960, Math.ceil((project.duration + 4) * pixelsPerSecond));

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSec = clamp(clickX / pixelsPerSecond, 0, project.duration);
    onSeek(Math.round(targetSec * project.fps) / project.fps);
  };

  const renderTrackIcon = (id: TrackId) => {
    switch (id) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-[#3B82F6]" />;
      case 'overlay':
        return <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />;
      case 'captions':
        return <Subtitles className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case 'voiceover':
        return <Mic className="w-3.5 h-3.5 text-[#F43F5E]" />;
      case 'sfx':
        return <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />;
      case 'music':
        return <Music className="w-3.5 h-3.5 text-[#06B6D4]" />;
    }
  };

  return (
    <section
      aria-label="Multi-Track Timeline Editor"
      className="h-[310px] shrink-0 bg-[#14161A] border-t border-[#23262F] flex flex-col select-none"
    >
      {/* Timeline Action Toolbar */}
      <div className="h-10 px-3 bg-[#181B20] border-b border-[#23262F] flex items-center justify-between gap-2 overflow-x-auto">
        {/* Left: Primary Edit Operations */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo edit"
            className="px-2 py-1 text-xs bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo edit"
            className="px-2 py-1 text-xs bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>

          <div className="h-4 w-px bg-[#23262F] mx-1" />

          <button
            type="button"
            onClick={onSplitAtPlayhead}
            disabled={!selectedClip}
            aria-label="Split clip at playhead"
            className="px-2.5 py-1 text-xs font-medium bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Scissors className="w-3.5 h-3.5 text-[#E56B38]" />
            <span>Split</span>
          </button>

          <button
            type="button"
            onClick={() => onTrimSelected('out', -0.5)}
            disabled={!selectedClip}
            aria-label="Trim clip end -0.5s"
            className="px-2 py-1 text-xs font-mono bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded transition-colors whitespace-nowrap shrink-0"
          >
            Trim -0.5s
          </button>
          <button
            type="button"
            onClick={() => onTrimSelected('out', 0.5)}
            disabled={!selectedClip}
            aria-label="Extend clip end +0.5s"
            className="px-2 py-1 text-xs font-mono bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded transition-colors whitespace-nowrap shrink-0"
          >
            Trim +0.5s
          </button>

          <button
            type="button"
            onClick={() => onDeleteSelected(false)}
            disabled={!selectedClip}
            aria-label="Delete selected clip"
            className="px-2.5 py-1 text-xs bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteSelected(true)}
            disabled={!selectedClip}
            aria-label="Ripple delete selected clip"
            className="px-2.5 py-1 text-xs font-medium bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Ripple Delete</span>
          </button>

          <div className="h-4 w-px bg-[#23262F] mx-1" />

          <button
            type="button"
            onClick={() => onReorderSelected('prev')}
            disabled={!selectedClip}
            aria-label="Move clip earlier"
            className="px-2 py-1 text-xs bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <MoveLeft className="w-3.5 h-3.5" />
            <span>Move Left</span>
          </button>
          <button
            type="button"
            onClick={() => onReorderSelected('next')}
            disabled={!selectedClip}
            aria-label="Move clip later"
            className="px-2 py-1 text-xs bg-[#14161A] hover:bg-[#23262F] disabled:opacity-40 text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Move Right</span>
            <MoveRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Snap, Zoom & Active Selection Summary */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTriggerFreezeFrame}
            className="px-2.5 py-1 text-xs bg-[#14161A] hover:bg-[#23262F] text-[#38BDF8] border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>Insert Freeze</span>
          </button>

          <button
            type="button"
            onClick={onToggleSnap}
            aria-label="Toggle timeline magnetic snap"
            aria-pressed={snapEnabled}
            className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
              snapEnabled
                ? 'bg-[#E56B38]/15 border-[#E56B38] text-[#E56B38] font-medium'
                : 'bg-[#14161A] border-[#23262F] text-[#8E95A5]'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap {snapEnabled ? 'On' : 'Off'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-[#14161A] px-2 py-1 rounded border border-[#23262F]">
            <button
              type="button"
              onClick={() => onChangeZoom(clamp(pixelsPerSecond - 15, 40, 140))}
              aria-label="Zoom out timeline"
              className="text-[#8E95A5] hover:text-[#F1F3F5]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              aria-label="Timeline zoom scale"
              min={40}
              max={140}
              value={pixelsPerSecond}
              onChange={(e) => onChangeZoom(Number(e.target.value))}
              className="w-20 accent-[#E56B38] h-1 bg-[#23262F] rounded cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onChangeZoom(clamp(pixelsPerSecond + 15, 40, 140))}
              aria-label="Zoom in timeline"
              className="text-[#8E95A5] hover:text-[#F1F3F5]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Track Scrollable Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers Column (Fixed 190px) */}
        <div className="w-[190px] shrink-0 bg-[#14161A] border-r border-[#23262F] flex flex-col">
          {/* Ruler Header Corner */}
          <div className="h-7 px-3 border-b border-[#23262F] flex items-center justify-between text-[11px] font-mono text-[#8E95A5] bg-[#101216]">
            <span>6 TRACKS</span>
            <span>{project.clips.length} CLIPS</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 flex flex-col divide-y divide-[#23262F]">
            {TRACK_CONFIG.map((track) => {
              const mixerState = project.mixer[track.id];
              return (
                <div
                  key={track.id}
                  className="h-[39px] px-2.5 flex items-center justify-between bg-[#14161A] hover:bg-[#181B20] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] font-semibold text-[#8E95A5] w-5">
                      {track.code}
                    </span>
                    {renderTrackIcon(track.id)}
                    <span className="text-xs font-medium text-[#F1F3F5] truncate">
                      {track.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleTrackMute(track.id)}
                      aria-label={`Mute ${track.label} track`}
                      className={`w-5 h-5 rounded text-[10px] font-mono flex items-center justify-center border transition-colors ${
                        mixerState.muted
                          ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                          : 'border-[#23262F] text-[#8E95A5] hover:text-[#F1F3F5]'
                      }`}
                    >
                      {mixerState.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleTrackSolo(track.id)}
                      aria-label={`Solo ${track.label} track`}
                      className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center border transition-colors ${
                        mixerState.solo
                          ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                          : 'border-[#23262F] text-[#8E95A5] hover:text-[#F1F3F5]'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable Track Lanes + Timecode Ruler */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0B0C0E]">
          <div style={{ width: `${totalTimelineWidth}px` }} className="relative h-full flex flex-col">
            {/* Interactive Timecode Ruler */}
            <div
              ref={rulerRef}
              onClick={handleRulerClick}
              className="h-7 border-b border-[#23262F] bg-[#101216] relative cursor-pointer"
            >
              {Array.from({ length: Math.ceil(project.duration + 4) }).map((_, sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * pixelsPerSecond}px` }}
                  className="absolute top-0 bottom-0 border-l border-[#23262F] pl-1 flex items-center"
                >
                  <span className="font-mono text-[10px] tabular-nums text-[#8E95A5]">
                    {formatTimecode(sec, project.fps).slice(3)}
                  </span>
                </div>
              ))}
            </div>

            {/* 6 Track Lanes */}
            <div className="flex-1 flex flex-col divide-y divide-[#1C1F26] relative">
              {TRACK_CONFIG.map((track) => {
                const trackClips = project.clips.filter((c) => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    data-testid={`timeline-track-${track.id}`}
                    onClick={(e) => {
                      if (e.target === e.currentTarget && rulerRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        onSeek(clamp(clickX / pixelsPerSecond, 0, project.duration));
                      }
                    }}
                    className="h-[39px] relative bg-[#0E1014] hover:bg-[#12151B] transition-colors"
                  >
                    {trackClips.map((clip: TimelineClip) => {
                      const leftPx = clip.startTime * pixelsPerSecond;
                      const widthPx = Math.max(24, clip.duration * pixelsPerSecond);
                      const isSelected = clip.id === selectedClipId;

                      return (
                        <button
                          key={clip.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                          }}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                          }}
                          aria-label={`Select clip ${clip.name}`}
                          className={`absolute top-1 bottom-1 rounded px-2 flex flex-col justify-between overflow-hidden text-left transition-colors border ${
                            track.bgTint
                          } ${
                            isSelected
                              ? 'border-[#F59E0B] ring-1 ring-[#F59E0B]'
                              : `${track.borderTint}/50`
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-[11px] font-medium text-[#F1F3F5] truncate">
                              {clip.name}
                            </span>
                            <span className="text-[10px] font-mono tabular-nums text-[#F59E0B] shrink-0">
                              {clip.speed !== 1 ? `${clip.speed}x` : `${clip.duration.toFixed(1)}s`}
                            </span>
                          </div>

                          {/* Keyframe Diamonds or Audio Waveform Preview */}
                          <div className="flex items-center justify-between w-full h-2.5 relative">
                            {clip.keyframes && clip.keyframes.length > 0 && (
                              <div className="flex items-center gap-1">
                                {clip.keyframes.map((kf) => (
                                  <span
                                    key={kf.id}
                                    title={`Keyframe @ +${kf.offsetSec}s`}
                                    className="w-1.5 h-1.5 rotate-45 bg-[#F59E0B] inline-block"
                                  />
                                ))}
                              </div>
                            )}
                            {clip.captions && (
                              <span className="text-[9px] font-mono text-[#FDE68A] truncate">
                                {clip.captions.map((w) => w.word).join(' ')}
                              </span>
                            )}
                            {clip.licenseTag && (
                              <span className="text-[9px] font-mono text-[#8E95A5] truncate">
                                {clip.licenseTag}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Playhead Vertical Line & Cap */}
              <div
                style={{ left: `${playheadTime * pixelsPerSecond}px` }}
                className="absolute -top-7 bottom-0 w-px bg-[#E56B38] pointer-events-none z-30"
              >
                <div className="w-3 h-3 -ml-1.5 bg-[#E56B38] rotate-45 -mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
