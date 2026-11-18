import React, { useRef, useState } from 'react';
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
  icon: string;
  iconColorClass: string;
}> = [
  { id: 'video', label: 'V1 Video', icon: 'videocam', iconColorClass: 'text-primary' },
  { id: 'captions', label: 'T1 Captions', icon: 'closed_caption', iconColorClass: 'text-secondary' },
  { id: 'sfx', label: 'A1 Sound FX', icon: 'volume_down', iconColorClass: 'text-tertiary' },
  { id: 'music', label: 'A2 Background', icon: 'music_note', iconColorClass: 'text-primary-fixed' },
  { id: 'voiceover', label: 'A3 Voiceover', icon: 'mic', iconColorClass: 'text-secondary' },
  { id: 'overlay', label: 'V2 Overlays', icon: 'layers', iconColorClass: 'text-primary' },
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
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);
  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || null;

  const totalTimelineWidth = Math.max(920, Math.ceil((project.duration + 3) * pixelsPerSecond));
  const anyTrackSolo = Object.values(project.mixer).some((m) => m.solo);

  const handleRulerSeek = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const targetSec = clamp(clickX / pixelsPerSecond, 0, project.duration);
    onSeek(Math.round(targetSec * project.fps) / project.fps);
  };

  return (
    <section
      aria-label="Multi-Track Timeline Editor"
      className="h-52 lg:h-64 bg-surface-container-low flex flex-col flex-shrink-0 z-30 shadow-2xl relative select-none"
    >
      {/* Timeline Global Toolbar */}
      <div className="h-10 bg-surface-container px-2 sm:px-space-md flex items-center justify-between flex-shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-space-sm">
          {/* Track Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onSplitAtPlayhead}
              disabled={!selectedClip}
              aria-label="Split clip at playhead"
              title="Split at Playhead (S)"
              className="px-2 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors flex items-center gap-1 font-label-sm text-label-sm cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                splitscreen
              </span>
              <span>Split</span>
            </button>

            <button
              type="button"
              onClick={() => onTrimSelected('out', -0.5)}
              disabled={!selectedClip}
              aria-label="Trim clip end -0.5s"
              className="px-1.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors font-label-sm text-label-sm cursor-pointer shrink-0"
            >
              Trim -0.5s
            </button>

            <button
              type="button"
              onClick={() => onTrimSelected('out', 0.5)}
              disabled={!selectedClip}
              aria-label="Extend clip end +0.5s"
              className="px-1.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors font-label-sm text-label-sm cursor-pointer shrink-0"
            >
              Trim +0.5s
            </button>

            <button
              type="button"
              onClick={() => onDeleteSelected(false)}
              disabled={!selectedClip}
              aria-label="Delete selected clip"
              title="Delete Selected Segment (Del)"
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteSelected(true)}
              disabled={!selectedClip}
              aria-label="Ripple delete selected clip"
              title="Ripple Delete"
              className="px-2 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors flex items-center gap-1 font-label-sm text-label-sm cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                auto_delete
              </span>
              <span>Ripple</span>
            </button>

            <button
              type="button"
              onClick={() => onReorderSelected('prev')}
              disabled={!selectedClip}
              aria-label="Move clip earlier"
              title="Move Clip Left"
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">west</span>
            </button>

            <button
              type="button"
              onClick={() => onReorderSelected('next')}
              disabled={!selectedClip}
              aria-label="Move clip later"
              title="Move Clip Right"
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">east</span>
            </button>

            <button
              type="button"
              onClick={onTriggerFreezeFrame}
              title="Insert 2.5s Freeze Frame + Annotation"
              className="px-2 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1 font-label-sm text-label-sm cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">ac_unit</span>
              <span>Freeze</span>
            </button>

            <button
              type="button"
              onClick={onToggleSnap}
              aria-label="Toggle timeline magnetic snap"
              aria-pressed={snapEnabled}
              title="Magnet Snap"
              className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                snapEnabled
                  ? 'text-primary bg-surface-container-high'
                  : 'text-outline hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                filter_center_focus
              </span>
            </button>

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo edit"
              title="Undo (Ctrl+Z)"
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-35 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">undo</span>
            </button>

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo edit"
              title="Redo (Ctrl+Shift+Z)"
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-35 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">redo</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-surface-container-high" />

          {/* Playhead Scrub Time Code in Timeline */}
          <span className="font-label-md text-label-md text-secondary font-semibold tabular-nums">
            {formatTimecode(playheadTime, project.fps).slice(3)}
          </span>
        </div>

        {/* Timeline Zoom / Scaling Controls */}
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            type="button"
            onClick={() => onChangeZoom(clamp(pixelsPerSecond - 12, 40, 140))}
            aria-label="Zoom out timeline"
            className="text-outline hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_out</span>
          </button>
          <input
            type="range"
            aria-label="Timeline zoom scale"
            min={40}
            max={140}
            value={pixelsPerSecond}
            onChange={(e) => onChangeZoom(Number(e.target.value))}
            className="w-24 accent-primary cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onChangeZoom(clamp(pixelsPerSecond + 12, 40, 140))}
            aria-label="Zoom in timeline"
            className="text-outline hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(62)}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Fit to Screen (Shift + Z)"
          >
            <span className="material-symbols-outlined text-[16px]">fit_screen</span>
          </button>
        </div>
      </div>

      {/* Timeline Workspace (Tracks Pane + Sequencer Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Track Header Labels Rail */}
        <div className="w-28 sm:w-40 lg:w-48 bg-surface-container-low flex flex-col flex-shrink-0 shadow-sm z-20">
          <div className="h-6 px-1.5 sm:px-space-sm flex items-center justify-between text-[9px] sm:text-[10px] font-label-sm text-outline bg-surface-container-lowest/60">
            <span>TRACKS</span>
            <span>{project.clips.length} CLIPS</span>
          </div>

          <div className="flex-1 flex flex-col justify-around">
            {TRACK_CONFIG.map((track) => {
              const mixerState = project.mixer[track.id];
              return (
                <div
                  key={track.id}
                  className="h-[26px] lg:h-[31px] px-1.5 sm:px-space-sm flex items-center justify-between bg-surface-container-low hover:bg-surface-container/60 transition-colors"
                >
                  <div className="flex items-center gap-1 sm:gap-space-xs min-w-0">
                    <span
                      className={`material-symbols-outlined text-[14px] sm:text-[16px] ${track.iconColorClass}`}
                    >
                      {track.icon}
                    </span>
                    <span className="font-title-md text-[11px] sm:text-body-sm text-on-surface font-semibold truncate">
                      {track.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleTrackMute(track.id)}
                      aria-label={`Mute ${track.label} track`}
                      className={`p-0.5 rounded transition-colors cursor-pointer ${
                        mixerState.muted
                          ? 'text-error bg-error/15'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                        {mixerState.muted ? 'volume_off' : 'volume_up'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleTrackSolo(track.id)}
                      aria-label={`Solo ${track.label} track`}
                      className={`px-1 rounded font-label-sm text-[9px] sm:text-[10px] cursor-pointer ${
                        mixerState.solo
                          ? 'bg-secondary text-on-secondary font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
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

        {/* Right Sequencer Stage Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-surface-container-lowest flex flex-col">
          <div style={{ width: `${totalTimelineWidth}px` }} className="relative h-full flex flex-col">
            {/* Ruler Time Tick Marks Bar with Pointer Scrubbing */}
            <div
              ref={rulerRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsScrubbingRuler(true);
                handleRulerSeek(e.clientX);
              }}
              onPointerMove={(e) => {
                if (isScrubbingRuler) {
                  handleRulerSeek(e.clientX);
                }
              }}
              onPointerUp={() => setIsScrubbingRuler(false)}
              onPointerCancel={() => setIsScrubbingRuler(false)}
              className="h-6 bg-surface-container-lowest flex items-center relative text-[10px] font-label-sm text-outline select-none cursor-pointer touch-none"
            >
              {Array.from({ length: Math.ceil(project.duration + 3) }).map((_, sec) => {
                if (sec % 2 !== 0) return null;
                const isNearPlayhead = Math.abs(playheadTime - sec) <= 1;
                return (
                  <span
                    key={sec}
                    style={{ left: `${sec * pixelsPerSecond}px` }}
                    className={`absolute pl-1 ${
                      isNearPlayhead ? 'text-secondary font-bold' : 'text-outline'
                    }`}
                  >
                    00:{String(sec).padStart(2, '0')}
                  </span>
                );
              })}
            </div>

            {/* Active Yellow Playhead Needle */}
            <div
              style={{ left: `${playheadTime * pixelsPerSecond}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-secondary z-30 pointer-events-none shadow-[0_0_12px_#ffe083]"
            >
              <div className="w-3.5 h-3.5 bg-secondary -ml-[6px] -mt-1 rounded-sm rotate-45 flex items-center justify-center" />
            </div>

            {/* 6 Track Lanes */}
            <div className="flex-1 flex flex-col justify-around">
              {TRACK_CONFIG.map((track) => {
                const trackClips = project.clips.filter((c) => c.trackId === track.id);
                const mixerState = project.mixer[track.id];
                const isTrackSilenced =
                  mixerState.muted || (anyTrackSolo && !mixerState.solo);

                return (
                  <div
                    key={track.id}
                    data-testid={`timeline-track-${track.id}`}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        onSeek(clamp(clickX / pixelsPerSecond, 0, project.duration));
                      }
                    }}
                    className={`h-[31px] relative flex items-center px-1 hover:bg-surface-container/30 transition-all ${
                      isTrackSilenced ? 'opacity-40' : ''
                    }`}
                  >
                    {trackClips.map((clip: TimelineClip) => {
                      const leftPx = clip.startTime * pixelsPerSecond;
                      const widthPx = Math.max(44, clip.duration * pixelsPerSecond);
                      const isSelected = clip.id === selectedClipId;

                      if (track.id === 'video') {
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClip(clip.id);
                            }}
                            style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                            aria-label={`Select clip ${clip.name}`}
                            className={`absolute h-[27px] bg-primary/20 hover:bg-primary/25 rounded-lg flex items-center px-space-sm justify-between shadow-sm cursor-pointer transition-all overflow-hidden ${
                              isSelected ? 'ring-1 ring-primary' : ''
                            }`}
                          >
                            <div className="flex items-center gap-space-xs min-w-0">
                              <span className="material-symbols-outlined text-primary text-[15px] shrink-0">
                                movie
                              </span>
                              <span className="font-label-sm text-label-sm text-primary-fixed font-semibold truncate">
                                {clip.name}
                              </span>
                              <span className="bg-primary/30 text-primary-fixed px-1.5 py-0.5 rounded text-[9px] font-label-sm uppercase shrink-0">
                                {clip.speed !== 1 ? `${clip.speed}x` : '4K 60FPS'}
                              </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 bg-surface-container-lowest/80 px-2 py-0.5 rounded-full text-secondary font-label-sm text-[9px] shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                              <span>Auto-Reframe Active</span>
                            </div>
                          </button>
                        );
                      }

                      if (track.id === 'captions') {
                        const isHotBlock = clip.name.includes('[HOT]');
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClip(clip.id);
                            }}
                            style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                            aria-label={`Select clip ${clip.name}`}
                            className={`absolute h-[26px] rounded-md flex items-center justify-between px-2 cursor-pointer transition-all overflow-hidden ${
                              isHotBlock
                                ? 'bg-secondary-container text-on-secondary-container shadow-[0_0_16px_rgba(238,194,0,0.4)] font-black'
                                : 'bg-surface-container-high hover:bg-surface-variant text-on-surface justify-center'
                            } ${isSelected ? 'ring-1 ring-white' : ''}`}
                          >
                            <span className="font-label-sm text-[10px] tracking-wide truncate">
                              {clip.name}
                            </span>
                            {isHotBlock && (
                              <span className="material-symbols-outlined text-[13px] text-on-secondary-container shrink-0">
                                local_fire_department
                              </span>
                            )}
                          </button>
                        );
                      }

                      if (track.id === 'sfx') {
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClip(clip.id);
                            }}
                            style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                            aria-label={`Select clip ${clip.name}`}
                            className={`absolute h-[25px] bg-tertiary-container/35 hover:bg-tertiary-container/50 rounded-md flex items-center px-2 gap-1 cursor-pointer overflow-hidden ${
                              isSelected ? 'ring-1 ring-tertiary' : ''
                            }`}
                          >
                            <span className="material-symbols-outlined text-tertiary text-[13px] shrink-0">
                              graphic_eq
                            </span>
                            <span className="font-label-sm text-[10px] text-tertiary font-medium truncate">
                              {clip.name}
                            </span>
                          </button>
                        );
                      }

                      if (track.id === 'music') {
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClip(clip.id);
                            }}
                            style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                            aria-label={`Select clip ${clip.name}`}
                            className={`absolute h-[25px] bg-primary-container/20 hover:bg-primary-container/30 rounded-md flex items-center px-space-sm justify-between cursor-pointer overflow-hidden ${
                              isSelected ? 'ring-1 ring-primary' : ''
                            }`}
                          >
                            <div className="flex items-center gap-space-xs min-w-0">
                              <span className="material-symbols-outlined text-primary text-[13px] shrink-0">
                                music_note
                              </span>
                              <span className="font-label-sm text-[10px] text-primary font-medium truncate">
                                {clip.name}
                              </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 font-label-sm text-[9px] text-primary-fixed bg-surface-container-lowest/80 px-2 py-0.5 rounded shrink-0">
                              <span>Auto-Ducked -16dB</span>
                            </div>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={clip.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                          }}
                          style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                          aria-label={`Select clip ${clip.name}`}
                          className={`absolute h-[24px] rounded-md px-2 flex items-center justify-between overflow-hidden font-label-sm text-[10px] cursor-pointer ${
                            track.id === 'voiceover'
                              ? 'bg-secondary/15 text-secondary'
                              : 'bg-primary/15 text-primary-fixed'
                          } ${isSelected ? 'ring-1 ring-white' : ''}`}
                        >
                          <span className="truncate">{clip.name}</span>
                          <span className="opacity-80 shrink-0 ml-1">
                            {clip.duration.toFixed(1)}s
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
