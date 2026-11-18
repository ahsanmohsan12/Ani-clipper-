import React, { useState } from 'react';
import {
  type ProjectState,
  type TimelineClip,
  type TrackId,
  type RightsSourceType,
  type CaptionWord,
  interpolateTransformAtTime,
  computeProjectRightsState,
  roundToMs,
} from '../editor/engine';
import {
  CAPTION_VISUAL_PRESETS,
  type CaptionVisualPreset,
} from '../editor/defaultProject';

export type RightInspectorTab = 'captions' | 'transitions' | 'audio' | 'reframe';

interface RightInspectorProps {
  activeTab: RightInspectorTab;
  onChangeTab: (tab: RightInspectorTab) => void;
  project: ProjectState;
  playheadTime: number;
  selectedClipId: string | null;
  activeCaptionPresetId: CaptionVisualPreset['id'];
  activeTransition: 'fade' | 'zoom' | 'slide';
  onSelectCaptionPreset: (preset: CaptionVisualPreset) => void;
  onSelectTransition: (transition: 'fade' | 'zoom' | 'slide') => void;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => void;
  onApplyClipSpeed: (clipId: string, speed: number, preservePitch: boolean) => void;
  onUpsertKeyframeAtPlayhead: (
    clipId: string,
    patch: { x?: number; y?: number; scale?: number; rotation?: number }
  ) => void;
  onTriggerZoomHighlight: (clipId: string) => void;
  onUpdateTrackMixer: (
    trackId: TrackId,
    patch: Partial<ProjectState['mixer'][TrackId]>
  ) => void;
  onUpdateRights: (patch: Partial<ProjectState['rights']>) => void;
  onUpdateBaseDescription: (desc: string) => void;
  onChangeCommentaryLayout: (mode: ProjectState['commentary']['layoutMode']) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  activeTab,
  onChangeTab,
  project,
  playheadTime,
  selectedClipId,
  activeCaptionPresetId,
  activeTransition,
  onSelectCaptionPreset,
  onSelectTransition,
  onUpdateClip,
  onApplyClipSpeed,
  onUpsertKeyframeAtPlayhead,
  onTriggerZoomHighlight,
  onUpdateTrackMixer,
  onUpdateRights,
  onUpdateBaseDescription,
  onChangeCommentaryLayout,
}) => {
  const [voiceIsolationPct, setVoiceIsolationPct] = useState(100);
  const [newWordToken, setNewWordToken] = useState('');
  const [emphasizedKeywords, setEmphasizedKeywords] = useState<string[]>([
    'INTELLIGENCE',
    'MOMENT',
    'EXPONENTIAL',
  ]);

  const selectedClip =
    project.clips.find((c) => c.id === selectedClipId) ||
    project.clips.find((c) => c.trackId === 'video') ||
    null;

  const activeCaptionClip =
    project.clips.find((c) => c.id === selectedClipId && c.trackId === 'captions') ||
    project.clips.find(
      (c) =>
        c.trackId === 'captions' &&
        playheadTime >= c.startTime &&
        playheadTime <= c.startTime + c.duration
    ) ||
    project.clips.find((c) => c.id === 'clip_cap_2') ||
    project.clips.find((c) => c.trackId === 'captions');

  const interp = selectedClip
    ? interpolateTransformAtTime(selectedClip, playheadTime)
    : { x: 0, y: 0, scale: 1, rotation: 0 };

  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);

  const activePresetObj =
    CAPTION_VISUAL_PRESETS.find((p) => p.id === activeCaptionPresetId) ||
    CAPTION_VISUAL_PRESETS[0];

  const handleWordEdit = (wordId: string, patch: Partial<CaptionWord>) => {
    if (!activeCaptionClip) return;
    onUpdateClip(activeCaptionClip.id, (clip) => ({
      ...clip,
      captions: (clip.captions || []).map((w) => (w.id === wordId ? { ...w, ...patch } : w)),
    }));
  };

  const handleAddWord = () => {
    if (!activeCaptionClip || !newWordToken.trim()) return;
    const words = activeCaptionClip.captions || [];
    const lastEnd = words.length > 0 ? words[words.length - 1].endOffset : 0;
    const nextWord: CaptionWord = {
      id: `cw_${Date.now()}`,
      word: newWordToken.trim().toUpperCase(),
      startOffset: roundToMs(lastEnd),
      endOffset: roundToMs(lastEnd + 0.7),
      highlight: true,
    };
    onUpdateClip(activeCaptionClip.id, (clip) => ({
      ...clip,
      duration: Math.max(clip.duration, nextWord.endOffset + 0.2),
      captions: [...(clip.captions || []), nextWord],
    }));
    setNewWordToken('');
  };

  return (
    <aside
      aria-label="Context Inspector and Rights Panel"
      className="w-full lg:w-80 xl:w-96 h-full bg-surface-container-low flex flex-col flex-shrink-0 z-20 shadow-xl overflow-hidden select-none"
    >
      {/* Tab Header Strip (Exact match to code_a5f5c0ca.html) */}
      <div className="flex items-center bg-surface-container-lowest p-1 gap-1 shrink-0">
        {(
          [
            { id: 'captions', label: 'Captions' },
            { id: 'transitions', label: 'Transitions' },
            { id: 'audio', label: 'Audio Mixer' },
            { id: 'reframe', label: 'AI Reframe' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 py-space-xs text-center rounded-lg font-title-md text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-surface-container text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-lg">
        {/* ==================== TAB 1: CAPTIONS (Default Active) ==================== */}
        {activeTab === 'captions' && (
          <>
            {/* Style Presets Grid (2x2 matching code_a5f5c0ca.html) */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider">
                  Style Presets
                </span>
                <span className="font-label-sm text-label-sm text-secondary">
                  ACTIVE: {activePresetObj.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                {CAPTION_VISUAL_PRESETS.map((preset) => {
                  const isSelected = preset.id === activeCaptionPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectCaptionPreset(preset)}
                      className={`p-space-sm rounded-xl cursor-pointer transition-all flex flex-col gap-1 text-left ${
                        isSelected
                          ? 'bg-surface-container shadow-[0_0_12px_rgba(202,190,255,0.2)] ring-1 ring-primary/40'
                          : 'bg-surface-container-high/60 hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-title-md text-title-md text-on-surface font-bold">
                          {preset.name}
                        </span>
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            isSelected ? 'text-secondary' : 'text-outline'
                          }`}
                        >
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm ${
                          isSelected ? 'text-secondary' : 'text-on-surface-variant'
                        }`}
                      >
                        {preset.subtitle}
                      </span>
                      <div
                        className={`bg-surface-container-lowest px-2 py-1 rounded text-center mt-1 w-full ${preset.previewTextClass}`}
                      >
                        {preset.previewText}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Customizer (Exact match to code_a5f5c0ca.html) */}
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider">
                Font &amp; Layout
              </span>
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                  <span>Font Family</span>
                  <span className="text-primary font-semibold">
                    {activeCaptionClip?.captionStyle?.fontFamily || 'Space Grotesk'} Black
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs">
                  {(['Space Grotesk', 'Montserrat', 'Impact Ultra'] as const).map((font) => {
                    const currentFont =
                      activeCaptionClip?.captionStyle?.fontFamily || 'Space Grotesk';
                    const isFontActive = currentFont === font;
                    return (
                      <button
                        key={font}
                        type="button"
                        onClick={() => {
                          if (!activeCaptionClip) return;
                          onUpdateClip(activeCaptionClip.id, (c) => ({
                            ...c,
                            captionStyle: {
                              ...(c.captionStyle || {
                                fontSize: 48,
                                textColor: '#FFFFFF',
                                activeWordColor: '#eec200',
                                bgColor: 'rgba(8, 15, 23, 0.95)',
                                animation: 'word-pop',
                                positionY: 74,
                              }),
                              fontFamily: font,
                            },
                          }));
                        }}
                        className={`py-1.5 rounded-lg font-label-sm text-label-sm cursor-pointer transition-colors ${
                          isFontActive
                            ? 'bg-surface-container text-on-surface font-semibold'
                            : 'bg-surface-container-lowest text-outline hover:bg-surface-container'
                        }`}
                      >
                        {font}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Font Size
                </span>
                <div className="flex items-center gap-space-xs">
                  <input
                    type="range"
                    aria-label="Caption font size"
                    min={24}
                    max={72}
                    value={activeCaptionClip?.captionStyle?.fontSize ?? 48}
                    onChange={(e) => {
                      if (!activeCaptionClip) return;
                      const fontSize = Number(e.target.value);
                      onUpdateClip(activeCaptionClip.id, (c) => ({
                        ...c,
                        captionStyle: {
                          ...(c.captionStyle || {
                            fontFamily: 'Space Grotesk',
                            textColor: '#FFFFFF',
                            activeWordColor: '#eec200',
                            bgColor: 'rgba(8, 15, 23, 0.95)',
                            animation: 'word-pop',
                            positionY: 74,
                          }),
                          fontSize,
                        },
                      }));
                    }}
                    className="w-32 accent-primary cursor-pointer"
                  />
                  <span className="font-label-sm text-label-sm text-on-surface tabular-nums">
                    {activeCaptionClip?.captionStyle?.fontSize ?? 48}px
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Kinetic Animation
                </span>
                <select
                  aria-label="Kinetic Animation"
                  value={activeCaptionClip?.captionStyle?.animation ?? 'word-pop'}
                  onChange={(e) => {
                    if (!activeCaptionClip) return;
                    const animation = e.target.value as
                      | 'word-pop'
                      | 'karaoke-fill'
                      | 'typewriter'
                      | 'fade-up';
                    onUpdateClip(activeCaptionClip.id, (c) => ({
                      ...c,
                      captionStyle: {
                        ...(c.captionStyle || {
                          fontFamily: 'Space Grotesk',
                          fontSize: 48,
                          textColor: '#FFFFFF',
                          activeWordColor: '#eec200',
                          bgColor: 'rgba(8, 15, 23, 0.95)',
                          positionY: 74,
                        }),
                        animation,
                      },
                    }));
                  }}
                  className="bg-surface-container px-space-sm py-1 rounded-lg font-label-sm text-label-sm text-on-surface outline-none cursor-pointer"
                >
                  <option value="word-pop">Word Pop Up</option>
                  <option value="karaoke-fill">Bounce In (Karaoke)</option>
                  <option value="fade-up">Fade Glow</option>
                  <option value="typewriter">Wiggle Zoom</option>
                </select>
              </div>
            </div>

            {/* Auto Keyword Highlights */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider">
                  AI Emphasized Keywords
                </span>
                <span className="font-label-sm text-label-sm text-primary">
                  {emphasizedKeywords.length} Words Highlighted
                </span>
              </div>
              <div className="flex flex-wrap gap-space-xs">
                {emphasizedKeywords.map((kw, idx) => (
                  <span
                    key={kw}
                    className={`${
                      idx % 2 === 0
                        ? 'bg-secondary-container/20 text-secondary'
                        : 'bg-primary-container/20 text-primary-fixed'
                    } px-space-sm py-1 rounded-md font-label-sm text-label-sm font-bold flex items-center gap-1`}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() =>
                        setEmphasizedKeywords((prev) => prev.filter((item) => item !== kw))
                      }
                      className="material-symbols-outlined text-[14px] cursor-pointer hover:text-white"
                    >
                      close
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Word-by-Word Timing Editor */}
            {activeCaptionClip && (
              <div className="flex flex-col gap-space-xs bg-surface-container p-space-sm rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold uppercase">
                    Word-Level Timing ({activeCaptionClip.name})
                  </span>
                  <span className="font-label-sm text-[10px] text-secondary">
                    {(activeCaptionClip.captions || []).length} tokens
                  </span>
                </div>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                  {(activeCaptionClip.captions || []).map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-lg"
                    >
                      <input
                        type="text"
                        aria-label={`Caption word ${w.word}`}
                        value={w.word}
                        onChange={(e) => handleWordEdit(w.id, { word: e.target.value })}
                        className="flex-1 min-w-0 bg-surface-container px-2 py-0.5 rounded font-label-sm text-label-sm text-on-surface"
                      />
                      <input
                        type="number"
                        step="0.1"
                        aria-label={`Start time for ${w.word}`}
                        value={w.startOffset}
                        onChange={(e) =>
                          handleWordEdit(w.id, {
                            startOffset: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-12 bg-surface-container px-1 py-0.5 rounded font-label-sm text-[10px] text-on-surface-variant tabular-nums"
                      />
                      <input
                        type="number"
                        step="0.1"
                        aria-label={`End time for ${w.word}`}
                        value={w.endOffset}
                        onChange={(e) =>
                          handleWordEdit(w.id, {
                            endOffset: Math.max(
                              w.startOffset + 0.1,
                              Number(e.target.value)
                            ),
                          })
                        }
                        className="w-12 bg-surface-container px-1 py-0.5 rounded font-label-sm text-[10px] text-on-surface-variant tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => handleWordEdit(w.id, { highlight: !w.highlight })}
                        title="Toggle Hot Highlight"
                        className={`px-1.5 py-0.5 rounded font-label-sm text-[10px] cursor-pointer ${
                          w.highlight
                            ? 'bg-secondary-container text-on-secondary-container font-bold'
                            : 'bg-surface-container text-outline'
                        }`}
                      >
                        ★
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    placeholder="Add word token..."
                    value={newWordToken}
                    onChange={(e) => setNewWordToken(e.target.value)}
                    className="flex-1 bg-surface-container-lowest px-2 py-1 rounded font-label-sm text-label-sm text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={handleAddWord}
                    className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold cursor-pointer"
                  >
                    + Word
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB 2: TRANSITIONS + SPEED & COLOR ==================== */}
        {activeTab === 'transitions' && (
          <>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider">
                Auto Cut Transitions
              </span>
              <div className="flex flex-col gap-space-sm">
                {(
                  [
                    {
                      id: 'zoom',
                      title: 'Whip Pan + Zoom',
                      subtitle: 'Fast dynamic lateral cut',
                      badge: '0.15s',
                      icon: 'swap_horiz',
                    },
                    {
                      id: 'fade',
                      title: 'Glitch Flash',
                      subtitle: 'High-energy cyberpunk stutter',
                      badge: '0.10s',
                      icon: 'flash_on',
                    },
                    {
                      id: 'slide',
                      title: 'Cut to Beat (Sync)',
                      subtitle: 'Snaps to Phonk 128 BPM transients',
                      badge: 'Auto',
                      icon: 'music_note',
                    },
                  ] as const
                ).map((item) => {
                  const isSelected = activeTransition === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTransition(item.id)}
                      className={`p-space-sm rounded-xl cursor-pointer flex items-center justify-between text-left transition-colors ${
                        isSelected
                          ? 'bg-surface-container ring-1 ring-primary/40'
                          : 'bg-surface-container-high/60 hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center gap-space-sm">
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            isSelected ? 'text-primary' : 'text-on-surface-variant'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-title-md text-title-md text-on-surface">
                            {item.title}
                          </span>
                          <span className="font-label-sm text-label-sm text-outline">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm bg-surface-container-lowest px-2 py-0.5 rounded ${
                          isSelected ? 'text-secondary font-bold' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Speed Control per Segment (0.5x-2.0x) with Audio Pitch Correction */}
            {selectedClip && (
              <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-title-md text-on-surface font-semibold">
                    Segment Speed (0.5x – 2.0x)
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold tabular-nums">
                    {selectedClip.speed.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Segment speed multiplier"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={selectedClip.speed}
                  onChange={(e) =>
                    onApplyClipSpeed(
                      selectedClip.id,
                      Number(e.target.value),
                      selectedClip.preservePitch
                    )
                  }
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="grid grid-cols-5 gap-1">
                  {[0.5, 0.75, 1.0, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() =>
                        onApplyClipSpeed(selectedClip.id, spd, selectedClip.preservePitch)
                      }
                      className={`py-1 rounded font-label-sm text-label-sm cursor-pointer ${
                        Math.abs(selectedClip.speed - spd) < 0.02
                          ? 'bg-primary text-on-primary font-bold'
                          : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
                <label className="flex items-center justify-between pt-1 cursor-pointer">
                  <span className="font-label-sm text-label-sm text-on-surface">
                    Audio Pitch Correction (Rubberband)
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedClip.preservePitch}
                    onChange={(e) =>
                      onApplyClipSpeed(selectedClip.id, selectedClip.speed, e.target.checked)
                    }
                    className="accent-primary w-4 h-4 rounded"
                  />
                </label>
              </div>
            )}

            {/* Color Grading & Filters */}
            {selectedClip && (
              <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  Color Adjust &amp; Optical Filters
                </span>

                <div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                    <span>Brightness</span>
                    <span className="text-on-surface tabular-nums">
                      {selectedClip.colorSettings.brightness}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Color Brightness"
                    min={-50}
                    max={50}
                    value={selectedClip.colorSettings.brightness}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        colorSettings: {
                          ...c.colorSettings,
                          brightness: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                    <span>Contrast</span>
                    <span className="text-on-surface tabular-nums">
                      {selectedClip.colorSettings.contrast}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Color Contrast"
                    min={-50}
                    max={50}
                    value={selectedClip.colorSettings.contrast}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        colorSettings: {
                          ...c.colorSettings,
                          contrast: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                    <span>Saturation</span>
                    <span className="text-on-surface tabular-nums">
                      {selectedClip.colorSettings.saturation}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Color Saturation"
                    min={-100}
                    max={100}
                    value={selectedClip.colorSettings.saturation}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        colorSettings: {
                          ...c.colorSettings,
                          saturation: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    LUT Filter
                  </span>
                  <select
                    aria-label="Optical LUT Filter"
                    value={selectedClip.colorSettings.filter}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        colorSettings: {
                          ...c.colorSettings,
                          filter: e.target.value as TimelineClip['colorSettings']['filter'],
                        },
                      }))
                    }
                    className="bg-surface-container-lowest px-2.5 py-1 rounded-lg font-label-sm text-label-sm text-on-surface"
                  >
                    <option value="none">None (Rec.709)</option>
                    <option value="kodak-2383">Kodak 2383 Film</option>
                    <option value="cyber-teal">Cyber Teal Studio</option>
                    <option value="cinema-warm">Cinema Warm</option>
                    <option value="noir-contrast">Noir Monochrome</option>
                    <option value="vintage-fade">16mm Halation</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB 3: AUDIO MIXER (Exact match to code_a5f5c0ca.html) ==================== */}
        {activeTab === 'audio' && (
          <>
            {/* Voice Isolation slider */}
            <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  AI Voice Isolation
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-bold">
                  {voiceIsolationPct}% (Clean)
                </span>
              </div>
              <input
                type="range"
                aria-label="AI Voice Isolation"
                min={0}
                max={100}
                value={voiceIsolationPct}
                onChange={(e) => setVoiceIsolationPct(Number(e.target.value))}
                className="w-full accent-secondary cursor-pointer"
              />
              <span className="font-label-sm text-label-sm text-outline">
                Zero room echo, studio-grade mouth de-click
              </span>
            </div>

            {/* Ducking Slider */}
            <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  Background Ducking
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  {project.mixer.music.gainDb.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                aria-label="Background Ducking dB"
                min={-30}
                max={0}
                step={0.5}
                value={project.mixer.music.gainDb}
                onChange={(e) =>
                  onUpdateTrackMixer('music', { gainDb: Number(e.target.value) })
                }
                className="w-full accent-primary cursor-pointer"
              />
              <span className="font-label-sm text-label-sm text-outline">
                Lowers synth pads automatically while speech is detected
              </span>
            </div>

            {/* SFX Level Meters */}
            <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  SFX Volume &amp; Impact
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  {project.mixer.sfx.gainDb.toFixed(1)} dB
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <div className="flex-1 h-3 bg-surface-container-lowest rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary w-2/3" />
                  <div className="h-full bg-secondary w-1/5" />
                  <div className="h-full bg-error-container w-[5%]" />
                </div>
                <span className="font-label-sm text-label-sm text-secondary">PEAK</span>
              </div>
              <input
                type="range"
                aria-label="SFX Bus Level"
                min={-24}
                max={6}
                step={0.5}
                value={project.mixer.sfx.gainDb}
                onChange={(e) =>
                  onUpdateTrackMixer('sfx', { gainDb: Number(e.target.value) })
                }
                className="w-full accent-tertiary cursor-pointer"
              />
            </div>

            {/* 4-Stem Bus Faders */}
            <div className="flex flex-col gap-space-xs bg-surface-container p-space-md rounded-xl">
              <span className="font-label-md text-label-md text-on-surface font-semibold uppercase">
                Per-Track Audio Stems
              </span>
              {(
                [
                  { id: 'video', label: 'V1 Original Audio' },
                  { id: 'voiceover', label: 'A3 Voiceover Mic' },
                  { id: 'sfx', label: 'A1 Sound FX (CC0)' },
                  { id: 'music', label: 'A2 Background Music' },
                ] as const
              ).map((stem) => {
                const state = project.mixer[stem.id];
                return (
                  <div
                    key={stem.id}
                    className="flex items-center justify-between gap-2 bg-surface-container-lowest px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="font-label-sm text-label-sm text-on-surface w-32 truncate">
                      {stem.label}
                    </span>
                    <input
                      type="range"
                      aria-label={`${stem.label} level`}
                      min={-36}
                      max={12}
                      step={0.5}
                      value={state.gainDb}
                      onChange={(e) =>
                        onUpdateTrackMixer(stem.id, { gainDb: Number(e.target.value) })
                      }
                      className="flex-1 accent-primary cursor-pointer"
                    />
                    <span className="font-label-sm text-[10px] text-secondary w-12 text-right tabular-nums">
                      {state.gainDb > 0 ? `+${state.gainDb}` : state.gainDb}dB
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ==================== TAB 4: AI REFRAME + KEYFRAMES + RIGHTS CHECK ==================== */}
        {activeTab === 'reframe' && (
          <>
            {/* Subject Framing Anchor (Exact match to code_a5f5c0ca.html) */}
            <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
              <span className="font-title-md text-title-md text-on-surface font-semibold">
                Subject Framing Anchor
              </span>
              <div className="grid grid-cols-2 gap-space-sm mt-space-xs">
                <button
                  type="button"
                  onClick={() => onChangeCommentaryLayout('standard')}
                  className={`py-2 rounded-lg font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                    project.commentary.layoutMode === 'standard'
                      ? 'bg-surface-container-high text-primary'
                      : 'bg-surface-container-lowest text-outline hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>Speaker Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeCommentaryLayout('split-vertical')}
                  className={`py-2 rounded-lg font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                    project.commentary.layoutMode === 'split-vertical'
                      ? 'bg-surface-container-high text-primary'
                      : 'bg-surface-container-lowest text-outline hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>Dual Podcaster Split</span>
                </button>
              </div>
              <div className="pt-space-xs flex items-center justify-between text-label-sm text-on-surface-variant">
                <span>Tracking Smoothness:</span>
                <span className="text-on-surface font-semibold">Cinematic Fluid (450ms)</span>
              </div>
            </div>

            {/* Manual Keyframe & Crop Controls */}
            {selectedClip && (
              <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-title-md text-on-surface font-semibold truncate">
                    Keyframes: {selectedClip.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpsertKeyframeAtPlayhead(selectedClip.id, {})}
                    className="px-2 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold cursor-pointer shrink-0"
                  >
                    + Keyframe
                  </button>
                </div>

                <div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                    <span>Position X / Y</span>
                    <span className="text-on-surface tabular-nums">
                      X: {interp.x}% · Y: {interp.y}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="range"
                      aria-label="Keyframe Position X"
                      min={-50}
                      max={50}
                      value={interp.x}
                      onChange={(e) =>
                        onUpsertKeyframeAtPlayhead(selectedClip.id, {
                          x: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                    <input
                      type="range"
                      aria-label="Keyframe Position Y"
                      min={-50}
                      max={50}
                      value={interp.y}
                      onChange={(e) =>
                        onUpsertKeyframeAtPlayhead(selectedClip.id, {
                          y: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
                    <span>Scale &amp; Rotation</span>
                    <span className="text-secondary tabular-nums">
                      {interp.scale.toFixed(2)}x · {interp.rotation}°
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="range"
                      aria-label="Keyframe Scale"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={interp.scale}
                      onChange={(e) =>
                        onUpsertKeyframeAtPlayhead(selectedClip.id, {
                          scale: Number(e.target.value),
                        })
                      }
                      className="w-full accent-secondary cursor-pointer"
                    />
                    <input
                      type="range"
                      aria-label="Keyframe Rotation"
                      min={-45}
                      max={45}
                      step={0.5}
                      value={interp.rotation}
                      onChange={(e) =>
                        onUpsertKeyframeAtPlayhead(selectedClip.id, {
                          rotation: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onTriggerZoomHighlight(selectedClip.id)}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-secondary font-label-sm text-label-sm font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                  <span>Auto-Generate 3-Keyframe Zoom Highlight</span>
                </button>
              </div>
            )}

            {/* Rights Check & Attribution Auto-Sync */}
            <div className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl">
              <span className="font-title-md text-title-md text-on-surface font-semibold">
                Rights Check &amp; Attribution
              </span>

              <select
                aria-label="Project content rights source"
                value={project.rights.sourceType}
                onChange={(e) =>
                  onUpdateRights({ sourceType: e.target.value as RightsSourceType })
                }
                className="w-full bg-surface-container-lowest px-2.5 py-2 rounded-lg font-label-sm text-label-sm text-on-surface"
              >
                <option value="own">Own content (100% Original)</option>
                <option value="licensed">Licensed (Commercial / Stock License)</option>
                <option value="permission">Permission obtained (Written Release)</option>
                <option value="fair-use">Fair-use commentary (Transformative Critique)</option>
              </select>

              {rightsState.requiresWarningBanner && rightsState.warningMessage && (
                <div
                  role="alert"
                  data-testid="rights-warning-banner"
                  className="p-2.5 bg-secondary-container/15 border border-secondary/40 rounded-lg flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1 font-label-sm text-label-sm text-secondary font-bold">
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    <span>External Source Attribution Active</span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    {rightsState.warningMessage}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                  Source URL
                </label>
                <input
                  type="url"
                  aria-label="Source URL"
                  value={project.rights.sourceUrl}
                  onChange={(e) => onUpdateRights({ sourceUrl: e.target.value })}
                  className="w-full bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-label-sm text-label-sm text-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                  Creator Credit / Attribution Text
                </label>
                <input
                  type="text"
                  aria-label="Creator Credit"
                  value={project.rights.creatorCredit}
                  onChange={(e) => onUpdateRights({ creatorCredit: e.target.value })}
                  className="w-full bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-label-sm text-label-sm text-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                  Base Description
                </label>
                <textarea
                  rows={2}
                  aria-label="Editorial Summary"
                  value={project.baseDescription}
                  onChange={(e) => onUpdateBaseDescription(e.target.value)}
                  className="w-full bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm text-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-label-sm text-[10px] text-on-surface-variant">
                  <span>AUTO-APPENDED DESCRIPTION</span>
                  <span className="text-secondary font-bold">SYNCED</span>
                </div>
                <pre
                  data-testid="auto-attribution-description"
                  className="p-2 bg-surface-container-lowest rounded-lg font-label-sm text-[10px] text-on-surface-variant whitespace-pre-wrap max-h-28 overflow-y-auto"
                >
                  {rightsState.fullDescription}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Inspector Footer Export Settings Quick Info (Exact match to code_a5f5c0ca.html) */}
      <div className="mt-auto p-space-md bg-surface-container-lowest flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Target Bitrate
          </span>
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            24 Mbps (CRF 16 / AAC 256k)
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Estimated File
          </span>
          <span className="font-label-md text-label-md text-secondary font-bold">
            18.4 MB
          </span>
        </div>
      </div>
    </aside>
  );
};
