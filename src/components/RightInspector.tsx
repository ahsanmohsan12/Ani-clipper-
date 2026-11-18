import React from 'react';
import {
  Crop,
  Gauge,
  Palette,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Plus,
  ZoomIn,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  type ProjectState,
  type TimelineClip,
  type TrackId,
  type RightsSourceType,
  interpolateTransformAtTime,
  computeProjectRightsState,
  roundToMs,
} from '../editor/engine';

export type RightInspectorTab = 'transform' | 'color-speed' | 'mixer' | 'rights';

interface RightInspectorProps {
  activeTab: RightInspectorTab;
  onChangeTab: (tab: RightInspectorTab) => void;
  project: ProjectState;
  playheadTime: number;
  selectedClipId: string | null;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => void;
  onApplyClipSpeed: (clipId: string, speed: number, preservePitch: boolean) => void;
  onUpsertKeyframeAtPlayhead: (
    clipId: string,
    patch: { x?: number; y?: number; scale?: number; rotation?: number }
  ) => void;
  onTriggerZoomHighlight: (clipId: string) => void;
  onUpdateTrackMixer: (trackId: TrackId, patch: Partial<ProjectState['mixer'][TrackId]>) => void;
  onUpdateRights: (patch: Partial<ProjectState['rights']>) => void;
  onUpdateBaseDescription: (desc: string) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  activeTab,
  onChangeTab,
  project,
  playheadTime,
  selectedClipId,
  onUpdateClip,
  onApplyClipSpeed,
  onUpsertKeyframeAtPlayhead,
  onTriggerZoomHighlight,
  onUpdateTrackMixer,
  onUpdateRights,
  onUpdateBaseDescription,
}) => {
  const selectedClip =
    project.clips.find((c) => c.id === selectedClipId) ||
    project.clips.find((c) => c.trackId === 'video') ||
    null;

  const interp = selectedClip
    ? interpolateTransformAtTime(selectedClip, playheadTime)
    : { x: 0, y: 0, scale: 1, rotation: 0 };

  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);

  return (
    <aside
      aria-label="Context Inspector and Rights Panel"
      className="w-[320px] shrink-0 bg-[#14161A] border-l border-[#23262F] flex flex-col select-none overflow-hidden"
    >
      {/* 4-Tab Inspector Header */}
      <div className="grid grid-cols-4 p-1.5 gap-1 bg-[#0E1014] border-b border-[#23262F]">
        <button
          type="button"
          onClick={() => onChangeTab('transform')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'transform'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <Crop className="w-3.5 h-3.5 text-[#E56B38]" />
          <span>Reframe</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('color-speed')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'color-speed'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Speed/Color</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('mixer')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'mixer'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Mixer</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('rights')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rights'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          {rightsState.requiresWarningBanner ? (
            <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          )}
          <span>Rights</span>
        </button>
      </div>

      {/* Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
        {/* TAB 1: CROP / REFRAME & KEYFRAME ANIMATOR */}
        {activeTab === 'transform' && selectedClip && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5] truncate">
                Keyframe Transform: {selectedClip.name}
              </h3>
              <button
                type="button"
                onClick={() => onUpsertKeyframeAtPlayhead(selectedClip.id, {})}
                className="px-2 py-1 text-[11px] font-medium bg-[#E56B38] hover:bg-[#d45d2c] text-white rounded flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>+ Keyframe</span>
              </button>
            </div>

            {/* Position, Scale, Rotation Sliders */}
            <div className="space-y-3 bg-[#0B0C0E] p-3 rounded border border-[#23262F]">
              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Position X</span>
                  <span className="font-mono tabular-nums text-[#F1F3F5]">{interp.x}%</span>
                </div>
                <input
                  type="range"
                  aria-label="Keyframe Position X"
                  min={-50}
                  max={50}
                  step={1}
                  value={interp.x}
                  onChange={(e) =>
                    onUpsertKeyframeAtPlayhead(selectedClip.id, { x: Number(e.target.value) })
                  }
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Position Y</span>
                  <span className="font-mono tabular-nums text-[#F1F3F5]">{interp.y}%</span>
                </div>
                <input
                  type="range"
                  aria-label="Keyframe Position Y"
                  min={-50}
                  max={50}
                  step={1}
                  value={interp.y}
                  onChange={(e) =>
                    onUpsertKeyframeAtPlayhead(selectedClip.id, { y: Number(e.target.value) })
                  }
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Scale (Zoom)</span>
                  <span className="font-mono tabular-nums text-[#F59E0B]">
                    {interp.scale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Keyframe Scale"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={interp.scale}
                  onChange={(e) =>
                    onUpsertKeyframeAtPlayhead(selectedClip.id, { scale: Number(e.target.value) })
                  }
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Rotation Angle</span>
                  <span className="font-mono tabular-nums text-[#F1F3F5]">{interp.rotation}°</span>
                </div>
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
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <button
                type="button"
                onClick={() => onTriggerZoomHighlight(selectedClip.id)}
                className="w-full py-1.5 px-3 bg-[#1C1F26] hover:bg-[#272B36] text-[#F59E0B] border border-[#23262F] rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Auto-Generate 3-Keyframe Zoom Highlight</span>
              </button>
            </div>

            {/* Manual Crop / Reframe Edges */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Manual Crop & Edge Reframe (%)
              </h4>
              <div className="grid grid-cols-2 gap-2 bg-[#0B0C0E] p-3 rounded border border-[#23262F]">
                {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
                  <div key={edge}>
                    <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1 capitalize">
                      <span>{edge}</span>
                      <span className="font-mono tabular-nums">
                        {selectedClip.crop[edge]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label={`Crop ${edge}`}
                      min={0}
                      max={35}
                      value={selectedClip.crop[edge]}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          crop: { ...c.crop, [edge]: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#E56B38]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Active Keyframe List */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Clip Keyframes ({selectedClip.keyframes.length})
              </h4>
              <div className="space-y-1">
                {selectedClip.keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="px-2.5 py-1.5 bg-[#0B0C0E] border border-[#23262F] rounded flex items-center justify-between text-[11px] font-mono tabular-nums"
                  >
                    <span className="text-[#F59E0B]">+{kf.offsetSec.toFixed(2)}s</span>
                    <span className="text-[#8E95A5]">
                      {kf.scale.toFixed(2)}x · ({kf.x}%, {kf.y}%)
                    </span>
                    <span className="text-[#F1F3F5]">{kf.easing}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: SPEED CONTROL (0.5x-2x + PITCH) & COLOR ADJUST */}
        {activeTab === 'color-speed' && selectedClip && (
          <>
            {/* Per-Segment Speed & Pitch Correction */}
            <div className="space-y-3 bg-[#0B0C0E] p-3 rounded border border-[#23262F]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-semibold text-[#F1F3F5] flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#E56B38]" />
                  <span>Segment Speed (0.5x – 2.0x)</span>
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums text-[#F59E0B]">
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
                className="w-full accent-[#E56B38]"
              />

              <div className="grid grid-cols-5 gap-1">
                {[0.5, 0.75, 1.0, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() =>
                      onApplyClipSpeed(selectedClip.id, spd, selectedClip.preservePitch)
                    }
                    className={`py-1 text-[11px] font-mono tabular-nums rounded border transition-colors ${
                      Math.abs(selectedClip.speed - spd) < 0.02
                        ? 'bg-[#E56B38] border-[#E56B38] text-white font-semibold'
                        : 'bg-[#14161A] border-[#23262F] text-[#8E95A5] hover:text-[#F1F3F5]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <span className="text-xs text-[#F1F3F5]">
                  Audio Pitch Correction (Rubberband)
                </span>
                <input
                  type="checkbox"
                  checked={selectedClip.preservePitch}
                  onChange={(e) =>
                    onApplyClipSpeed(selectedClip.id, selectedClip.speed, e.target.checked)
                  }
                  className="accent-[#E56B38] w-4 h-4 rounded"
                />
              </label>
            </div>

            {/* Color Adjust: Brightness, Contrast, Saturation, Filters */}
            <div className="space-y-3 bg-[#0B0C0E] p-3 rounded border border-[#23262F]">
              <h4 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Color Grading & Film Filters
              </h4>

              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Brightness</span>
                  <span className="font-mono tabular-nums">
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
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Contrast</span>
                  <span className="font-mono tabular-nums">
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
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Saturation</span>
                  <span className="font-mono tabular-nums">
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
                  className="w-full accent-[#E56B38]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8E95A5] mb-1">
                  Optical LUT Filter
                </label>
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
                  className="w-full px-2.5 py-1.5 text-xs bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5]"
                >
                  <option value="none">None (Rec.709 Neutral)</option>
                  <option value="kodak-2383">Kodak 2383 Print Film</option>
                  <option value="cinema-warm">Golden Hour Anamorphic</option>
                  <option value="noir-contrast">Archival Silver Monochrome</option>
                  <option value="cyber-teal">Teal & Amber Studio</option>
                  <option value="vintage-fade">16mm Halation Fade</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: PER-CLIP & 4-BUS TRACK AUDIO MIXER */}
        {activeTab === 'mixer' && (
          <div className="space-y-4">
            {selectedClip && (
              <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-semibold text-[#F1F3F5] truncate">
                    Clip Gain: {selectedClip.name}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[#F59E0B]">
                    {selectedClip.gainDb > 0 ? `+${selectedClip.gainDb}` : selectedClip.gainDb} dB
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Selected clip audio gain dB"
                  min={-36}
                  max={12}
                  step={0.5}
                  value={selectedClip.gainDb}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      gainDb: roundToMs(Number(e.target.value)),
                    }))
                  }
                  className="w-full accent-[#E56B38]"
                />
              </div>
            )}

            <div className="space-y-2.5">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Master Stem Audio Mixer
              </h3>
              {(
                [
                  { id: 'video', label: 'Original Video Audio', color: '#3B82F6' },
                  { id: 'voiceover', label: 'Voiceover Commentary', color: '#F43F5E' },
                  { id: 'sfx', label: 'SFX Bus (CC0)', color: '#10B981' },
                  { id: 'music', label: 'Music Bed (CC0)', color: '#06B6D4' },
                ] as const
              ).map((bus) => {
                const state = project.mixer[bus.id];
                const meterPct = state.muted
                  ? 0
                  : Math.min(100, Math.max(8, Math.round(((state.gainDb + 36) / 48) * 100)));

                return (
                  <div
                    key={bus.id}
                    className="p-2.5 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#F1F3F5]">
                        {bus.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] tabular-nums text-[#8E95A5]">
                          {state.gainDb > 0 ? `+${state.gainDb}` : state.gainDb} dB
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateTrackMixer(bus.id, { muted: !state.muted })}
                          aria-label={`Mute ${bus.label}`}
                          className={`p-1 rounded border ${
                            state.muted
                              ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                              : 'border-[#23262F] text-[#8E95A5]'
                          }`}
                        >
                          {state.muted ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      aria-label={`${bus.label} level`}
                      min={-36}
                      max={12}
                      step={0.5}
                      value={state.gainDb}
                      onChange={(e) =>
                        onUpdateTrackMixer(bus.id, { gainDb: Number(e.target.value) })
                      }
                      className="w-full accent-[#E56B38]"
                    />

                    {/* Peak VU Meter Bar */}
                    <div className="h-1.5 w-full bg-[#14161A] rounded overflow-hidden">
                      <div
                        style={{
                          width: `${meterPct}%`,
                          backgroundColor: bus.color,
                        }}
                        className="h-full transition-all duration-150"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: RIGHTS CHECK & ATTRIBUTION AUTO-SYNC */}
        {activeTab === 'rights' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-display font-semibold text-[#F1F3F5] mb-1.5">
                Content Rights & Provenance
              </label>
              <select
                aria-label="Project content rights source"
                value={project.rights.sourceType}
                onChange={(e) =>
                  onUpdateRights({ sourceType: e.target.value as RightsSourceType })
                }
                className="w-full px-2.5 py-2 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5] font-medium"
              >
                <option value="own">Own content (100% Original)</option>
                <option value="licensed">Licensed (Commercial / Stock License)</option>
                <option value="permission">Permission obtained (Written Release)</option>
                <option value="fair-use">Fair-use commentary (Transformative Critique)</option>
              </select>
            </div>

            {/* Warning Banner when Source is Someone Else's Content */}
            {rightsState.requiresWarningBanner && rightsState.warningMessage && (
              <div
                role="alert"
                data-testid="rights-warning-banner"
                className="p-3 bg-[#F59E0B]/12 border border-[#F59E0B]/50 rounded space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>External Content Attribution Required</span>
                </div>
                <p className="text-[11px] text-[#FDE68A] leading-relaxed">
                  {rightsState.warningMessage}
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] text-[#8E95A5] mb-1">
                  Source URL (Original Video / Asset Link)
                </label>
                <input
                  type="url"
                  aria-label="Source URL"
                  placeholder="https://..."
                  value={project.rights.sourceUrl}
                  onChange={(e) => onUpdateRights({ sourceUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8E95A5] mb-1">
                  Creator Credit / Attribution Line
                </label>
                <input
                  type="text"
                  aria-label="Creator Credit"
                  placeholder="Footage courtesy of @Creator..."
                  value={project.rights.creatorCredit}
                  onChange={(e) => onUpdateRights({ creatorCredit: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8E95A5] mb-1">
                  Editorial Summary (Base Description)
                </label>
                <textarea
                  rows={2}
                  aria-label="Editorial Summary"
                  value={project.baseDescription}
                  onChange={(e) => onUpdateBaseDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-[#8E95A5] mb-1">
                  <span>Auto-Generated Export Description</span>
                  <span className="font-mono text-[10px] text-[#10B981]">AUTO-APPENDED</span>
                </div>
                <pre
                  data-testid="auto-attribution-description"
                  className="p-2.5 bg-[#0B0C0E] border border-[#23262F] rounded text-[10px] font-mono text-[#8E95A5] whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto"
                >
                  {rightsState.fullDescription}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
