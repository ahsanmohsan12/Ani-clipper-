import React, { useState, useEffect } from 'react';
import {
  type ProjectState,
  type TimelineClip,
  type StylePreset,
  type OverlayKind,
  roundToMs,
} from '../editor/engine';
import {
  ROYALTY_FREE_LIBRARY,
  BUILT_IN_STYLE_PRESETS,
  type RoyaltyFreeAudioAsset,
} from '../editor/defaultProject';
import { studioAudio } from '../editor/audioSynth';

export type LeftDockTab =
  | 'select'
  | 'captions'
  | 'overlays'
  | 'audio'
  | 'commentary'
  | 'presets'
  | 'settings';

interface LeftToolDockProps {
  activeTab: LeftDockTab;
  drawerOpen: boolean;
  onSelectRailTab: (tab: LeftDockTab) => void;
  onCloseDrawer: () => void;
  onSplitAtPlayhead: () => void;
  project: ProjectState;
  playheadTime: number;
  selectedClipId: string | null;
  onAddClip: (clip: TimelineClip) => void;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => void;
  onApplyStylePreset: (preset: StylePreset) => void;
  onUpdateCommentaryConfig: (patch: Partial<ProjectState['commentary']>) => void;
  onInsertFreezeFrame: (
    explanationText: string,
    shapeType: 'callout-box' | 'highlight-ring' | 'rectangle'
  ) => void;
  onSaveProjectToServer: () => Promise<void>;
  onLoadProjectState: (loaded: ProjectState) => void;
}

export const LeftToolDock: React.FC<LeftToolDockProps> = ({
  activeTab,
  drawerOpen,
  onSelectRailTab,
  onCloseDrawer,
  onSplitAtPlayhead,
  project,
  playheadTime,
  onAddClip,
  onApplyStylePreset,
  onUpdateCommentaryConfig,
  onInsertFreezeFrame,
  onSaveProjectToServer,
  onLoadProjectState,
}) => {
  const [customPresets, setCustomPresets] = useState<StylePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const importFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [overlayText, setOverlayText] = useState('Key Horizon Shift');
  const [overlaySubtext, setOverlaySubtext] = useState('Speaker #1 Analysis');
  const [selectedSticker, setSelectedSticker] = useState('🔥');

  const [freezeExplanation, setFreezeExplanation] = useState(
    'Compute scaling inflection point — 4x retention spike'
  );
  const [freezeShape, setFreezeShape] = useState<
    'callout-box' | 'highlight-ring' | 'rectangle'
  >('callout-box');

  const [isRecordingVo, setIsRecordingVo] = useState(false);
  const [voRecordStartSec, setVoRecordStartSec] = useState(0);
  const [voElapsedSec, setVoElapsedSec] = useState(0);
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<'all' | 'music' | 'sfx'>(
    'all'
  );

  useEffect(() => {
    if (!isRecordingVo) return;
    const interval = window.setInterval(() => {
      setVoElapsedSec((prev) => roundToMs(prev + 0.2));
    }, 200);
    return () => window.clearInterval(interval);
  }, [isRecordingVo]);

  const handleAddOverlayElement = (kind: OverlayKind) => {
    const newClip: TimelineClip = {
      id: `ov_${kind}_${Date.now()}`,
      trackId: 'overlay',
      name: `${kind.toUpperCase()}: ${overlayText.slice(0, 16)}`,
      startTime: roundToMs(playheadTime),
      duration: 3.5,
      baseDuration: 3.5,
      sourceOffset: 0,
      speed: 1.0,
      preservePitch: true,
      gainDb: 0,
      muted: false,
      colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      keyframes: [
        {
          id: `kf_${Date.now()}`,
          offsetSec: 0,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          easing: 'punch',
        },
      ],
      overlay: {
        kind,
        text: overlayText || 'Key Frame Point',
        subtext: overlaySubtext,
        color: '#cabeff',
        accentColor: '#ffe083',
        x: 22,
        y: 24,
        targetX: 54,
        targetY: 48,
        scale: 1,
        rotation: 0,
        stickerSymbol: kind === 'sticker' ? selectedSticker : undefined,
        shapeType: kind === 'zoom-highlight' ? 'highlight-ring' : 'rectangle',
      },
    };
    onAddClip(newClip);
  };

  const handleAddTitleCard = (placement: 'intro' | 'outro') => {
    const startSec =
      placement === 'intro' ? 0 : roundToMs(Math.max(0, project.duration - 3.0));
    const cardClip: TimelineClip = {
      id: `title_${placement}_${Date.now()}`,
      trackId: 'overlay',
      name: `${placement === 'intro' ? 'Intro' : 'Outro'}: ${project.commentary.creatorName}`,
      startTime: startSec,
      duration: 3.0,
      baseDuration: 3.0,
      sourceOffset: 0,
      speed: 1.0,
      preservePitch: true,
      gainDb: 0,
      muted: false,
      colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      keyframes: [],
      overlay: {
        kind: 'title-card',
        text:
          placement === 'intro'
            ? project.title
            : `Commentary by ${project.commentary.creatorName}`,
        subtext: `${project.commentary.brandTagline} • ${
          placement === 'intro' ? 'TRANSFORMATIVE BREAKDOWN' : 'SUBSCRIBE FOR MORE SHORTS'
        }`,
        color: project.commentary.brandPrimaryColor,
        accentColor: project.commentary.brandAccentColor,
        x: 50,
        y: 50,
        scale: 1,
        rotation: 0,
      },
    };
    onAddClip(cardClip);
  };

  const handleToggleVoiceoverRecording = () => {
    if (!isRecordingVo) {
      setVoRecordStartSec(roundToMs(playheadTime));
      setVoElapsedSec(0.2);
      setIsRecordingVo(true);
    } else {
      const recordedDuration = Math.max(2.0, roundToMs(voElapsedSec));
      setIsRecordingVo(false);
      const voClip: TimelineClip = {
        id: `vo_rec_${Date.now()}`,
        trackId: 'voiceover',
        name: `Mic_Take_${new Date().toLocaleTimeString([], { hour12: false })}.wav`,
        startTime: voRecordStartSec,
        duration: recordedDuration,
        baseDuration: recordedDuration,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 2.0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        licenseTag: 'Recorded Studio Mic Commentary',
      };
      onAddClip(voClip);
    }
  };

  const handleAddRoyaltyFreeAudio = (asset: RoyaltyFreeAudioAsset) => {
    const newAudioClip: TimelineClip = {
      id: `rf_${asset.category}_${Date.now()}`,
      trackId: asset.category === 'music' ? 'music' : 'sfx',
      name: asset.name,
      startTime: roundToMs(playheadTime),
      duration: asset.duration,
      baseDuration: asset.duration,
      sourceOffset: 0,
      speed: 1.0,
      preservePitch: true,
      gainDb: asset.category === 'music' ? -16 : -3.5,
      muted: false,
      colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      keyframes: [],
      licenseTag: asset.license,
    };
    onAddClip(newAudioClip);
  };

  const handleCreateCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const refVideo = project.clips.find((c) => c.trackId === 'video');
    const refCap = project.clips.find((c) => c.trackId === 'captions');
    const preset: StylePreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      category: 'custom',
      colorSettings: refVideo
        ? { ...refVideo.colorSettings }
        : { brightness: 0, contrast: 14, saturation: 8, filter: 'kodak-2383' },
      captionStyle: refCap?.captionStyle
        ? { ...refCap.captionStyle }
        : {
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            textColor: '#FFFFFF',
            activeWordColor: '#eec200',
            bgColor: 'rgba(8, 15, 23, 0.95)',
            animation: 'word-pop',
            positionY: 74,
          },
      commentaryLayout: project.commentary.layoutMode,
    };
    setCustomPresets((prev) => [preset, ...prev]);
    setNewPresetName('');
    setSaveBanner(`Saved preset "${preset.name}"`);
    setTimeout(() => setSaveBanner(null), 2500);
  };

  const handleExportProjectJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_clipforge.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      aria-label="Studio Tool Shelf"
      className="flex flex-shrink-0 w-full lg:w-auto h-full z-20 select-none overflow-hidden"
    >
      {/* Mini Tool Shelf (Far Left Rail matching code_a5f5c0ca.html) */}
      <div className="w-14 bg-surface-container-low flex flex-col items-center py-space-sm gap-space-xs flex-shrink-0 z-20">
        <button
          type="button"
          onClick={() => onSelectRailTab('select')}
          title="Select Tool (V)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'select' && !drawerOpen
              ? 'bg-surface-container text-primary shadow-[0_0_12px_rgba(202,190,255,0.2)]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">near_me</span>
        </button>

        <button
          type="button"
          onClick={onSplitAtPlayhead}
          title="Razor Cut at Playhead (C)"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">content_cut</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectRailTab('overlays')}
          title="Stickers, Arrows, Shapes & Overlays (S)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'overlays' && drawerOpen
              ? 'bg-surface-container text-primary shadow-[0_0_12px_rgba(202,190,255,0.2)]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            auto_awesome_motion
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectRailTab('audio')}
          title="Voiceover Mic & CC0 Royalty-Free Audio (A)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'audio' && drawerOpen
              ? 'bg-surface-container text-primary shadow-[0_0_12px_rgba(202,190,255,0.2)]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectRailTab('commentary')}
          title="Commentary Tools: Freeze Frame, PiP, Intro/Outro (M)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'commentary' && drawerOpen
              ? 'bg-surface-container text-primary shadow-[0_0_12px_rgba(202,190,255,0.2)]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">animation</span>
        </button>

        <div className="w-6 h-[1px] bg-surface-container-high my-space-xs" />

        <button
          type="button"
          onClick={() => onSelectRailTab('presets')}
          title="Style Presets & AI Hook Templates"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'presets' && drawerOpen
              ? 'bg-surface-container text-secondary shadow-[0_0_12px_rgba(255,224,131,0.2)]'
              : 'text-secondary hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">magic_button</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectRailTab('settings')}
          title="Save / Load Project & Safe Margins"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'settings' && drawerOpen
              ? 'bg-surface-container text-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">aspect_ratio</span>
        </button>

        <div className="mt-auto flex flex-col gap-space-xs items-center">
          <button
            type="button"
            onClick={() => onSelectRailTab('settings')}
            title="Keyboard Shortcuts"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard</span>
          </button>
        </div>
      </div>

      {/* Expandable Studio Drawer for Overlays, Commentary, CC0 Audio & Presets */}
      {drawerOpen && (
        <div className="flex-1 min-w-0 lg:flex-initial lg:w-72 bg-surface-container-low border-l border-surface-container-high flex flex-col overflow-hidden shadow-2xl">
          <div className="h-10 px-space-md bg-surface-container-lowest flex items-center justify-between shrink-0">
            <span className="font-title-md text-body-md text-on-surface font-semibold">
              {activeTab === 'overlays'
                ? 'Stickers, Arrows & Shapes'
                : activeTab === 'audio'
                ? 'Mic & CC0 Audio Library'
                : activeTab === 'commentary'
                ? 'Commentary & Freeze Tools'
                : activeTab === 'presets'
                ? 'Custom Style Presets'
                : 'Project Save & Shortcuts'}
            </span>
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close tool drawer"
              className="text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-md">
            {saveBanner && (
              <div className="px-3 py-1.5 rounded-lg bg-secondary/15 text-secondary font-label-sm text-label-sm">
                {saveBanner}
              </div>
            )}

            {/* OVERLAYS TAB */}
            {activeTab === 'overlays' && (
              <div className="flex flex-col gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                    Callout Headline
                  </label>
                  <input
                    type="text"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm text-on-surface"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                      Subtext
                    </label>
                    <input
                      type="text"
                      value={overlaySubtext}
                      onChange={(e) => setOverlaySubtext(e.target.value)}
                      className="bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-label-sm text-label-sm text-on-surface"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                      Sticker
                    </label>
                    <select
                      aria-label="Sticker symbol"
                      value={selectedSticker}
                      onChange={(e) => setSelectedSticker(e.target.value)}
                      className="bg-surface-container-lowest px-2 py-1.5 rounded-lg font-label-sm text-label-sm text-on-surface"
                    >
                      <option value="🔥">🔥 Fire</option>
                      <option value="🎯">🎯 Target</option>
                      <option value="⚡">⚡ Bolt</option>
                      <option value="🧠">🧠 Brain</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddOverlayElement('text')}
                    className="py-2 px-2 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">title</span>
                    <span>+ Text Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOverlayElement('arrow')}
                    className="py-2 px-2 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">north_east</span>
                    <span>+ Vector Arrow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOverlayElement('shape')}
                    className="py-2 px-2 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">crop_free</span>
                    <span>+ Shape Box</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOverlayElement('sticker')}
                    className="py-2 px-2 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">add_reaction</span>
                    <span>+ Sticker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOverlayElement('zoom-highlight')}
                    className="col-span-2 py-2 px-2 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                    <span>+ Key Moment Zoom-In Highlight</span>
                  </button>
                </div>
              </div>
            )}

            {/* AUDIO TAB: MIC RECORDING & CC0 MUSIC/SFX LIBRARY */}
            {activeTab === 'audio' && (
              <div className="flex flex-col gap-space-sm">
                <div className="p-space-sm rounded-xl bg-surface-container flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-title-md text-body-sm text-on-surface font-semibold">
                      Direct Voiceover Mic
                    </span>
                    <span className="font-label-sm text-[10px] text-outline">
                      Record commentary over clip
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleVoiceoverRecording}
                    className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer ${
                      isRecordingVo
                        ? 'bg-error text-on-error'
                        : 'bg-primary text-on-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">mic</span>
                    <span>
                      {isRecordingVo ? `Stop (${voElapsedSec.toFixed(1)}s)` : 'Record VO'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1 p-1 bg-surface-container-lowest rounded-lg">
                  {(['all', 'music', 'sfx'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAudioCategoryFilter(cat)}
                      className={`flex-1 py-1 rounded font-label-sm text-label-sm uppercase cursor-pointer ${
                        audioCategoryFilter === cat
                          ? 'bg-surface-container-high text-primary font-bold'
                          : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  {ROYALTY_FREE_LIBRARY.filter(
                    (a) =>
                      audioCategoryFilter === 'all' || a.category === audioCategoryFilter
                  ).map((asset) => (
                    <div
                      key={asset.id}
                      className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-title-md text-body-sm text-on-surface truncate">
                            {asset.name}
                          </div>
                          <div className="font-label-sm text-[10px] text-outline">
                            {asset.artist} • {asset.duration}s
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => studioAudio.triggerAssetPreview(asset.synthPreset)}
                          aria-label={`Preview ${asset.name}`}
                          className="p-1 rounded bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            play_arrow
                          </span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-[9px] text-secondary">
                          {asset.license}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddRoyaltyFreeAudio(asset)}
                          className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-[10px] cursor-pointer"
                        >
                          + Add to Track
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMMENTARY TAB: FREEZE FRAME + ANNOTATION, PIP, INTRO/OUTRO */}
            {activeTab === 'commentary' && (
              <div className="flex flex-col gap-space-sm">
                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-2">
                  <span className="font-title-md text-body-sm text-on-surface font-semibold">
                    Freeze Frame + Annotation
                  </span>
                  <input
                    type="text"
                    value={freezeExplanation}
                    onChange={(e) => setFreezeExplanation(e.target.value)}
                    className="bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm text-on-surface"
                  />
                  <select
                    aria-label="Annotation callout style"
                    value={freezeShape}
                    onChange={(e) =>
                      setFreezeShape(
                        e.target.value as 'callout-box' | 'highlight-ring' | 'rectangle'
                      )
                    }
                    className="bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-label-sm text-label-sm text-on-surface"
                  >
                    <option value="callout-box">Vector Arrow + Callout Box</option>
                    <option value="highlight-ring">Zoom Spotlight Ring</option>
                    <option value="rectangle">Frame Bounding Box</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onInsertFreezeFrame(freezeExplanation, freezeShape)}
                    className="py-2 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">ac_unit</span>
                    <span>Insert 2.5s Freeze + Callout</span>
                  </button>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-2">
                  <span className="font-title-md text-body-sm text-on-surface font-semibold">
                    Intro / Outro Title Card Builder
                  </span>
                  <input
                    type="text"
                    value={project.commentary.creatorName}
                    onChange={(e) =>
                      onUpdateCommentaryConfig({ creatorName: e.target.value })
                    }
                    placeholder="Creator / Channel Name"
                    className="bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm text-on-surface"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddTitleCard('intro')}
                      className="py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm cursor-pointer"
                    >
                      + Intro Card
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTitleCard('outro')}
                      className="py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm cursor-pointer"
                    >
                      + Outro Card
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRESETS TAB */}
            {activeTab === 'presets' && (
              <div className="flex flex-col gap-space-sm">
                {[...customPresets, ...BUILT_IN_STYLE_PRESETS].map((preset) => (
                  <div
                    key={preset.id}
                    className="p-space-sm rounded-xl bg-surface-container flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-title-md text-body-sm text-on-surface truncate">
                        {preset.name}
                      </div>
                      <div className="font-label-sm text-[10px] text-outline">
                        {preset.colorSettings.filter} • {preset.captionStyle.animation}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyStylePreset(preset);
                        setSaveBanner(`Applied "${preset.name}"`);
                        setTimeout(() => setSaveBanner(null), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ))}

                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Custom preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-surface-container-lowest px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomPreset}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-sm text-label-sm font-bold cursor-pointer shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="flex flex-col gap-space-sm">
                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-2">
                  <span className="font-title-md text-body-sm text-on-surface font-semibold">
                    Save / Load Project State
                  </span>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(String(reader.result)) as ProjectState;
                          if (parsed && parsed.id && Array.isArray(parsed.clips)) {
                            onLoadProjectState(parsed);
                            setSaveBanner(`Loaded "${parsed.title}"`);
                            setTimeout(() => setSaveBanner(null), 2500);
                          }
                        } catch {
                          setSaveBanner('Invalid project JSON file');
                          setTimeout(() => setSaveBanner(null), 2500);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        await onSaveProjectToServer();
                        setSaveBanner('Project saved to studio storage');
                        setTimeout(() => setSaveBanner(null), 2500);
                      }}
                      className="py-2 px-2 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-bold cursor-pointer"
                    >
                      Save Project
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem('clipforge_saved_project_v1');
                          if (raw) {
                            const parsed = JSON.parse(raw) as ProjectState;
                            if (parsed && parsed.id && Array.isArray(parsed.clips)) {
                              onLoadProjectState(parsed);
                              setSaveBanner(`Restored "${parsed.title}"`);
                              setTimeout(() => setSaveBanner(null), 2500);
                              return;
                            }
                          }
                        } catch {
                          // Ignore storage error
                        }
                        setSaveBanner('No saved project in local storage yet');
                        setTimeout(() => setSaveBanner(null), 2500);
                      }}
                      className="py-2 px-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm font-semibold cursor-pointer"
                    >
                      Load Saved
                    </button>
                    <button
                      type="button"
                      onClick={handleExportProjectJson}
                      className="py-2 px-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm cursor-pointer"
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => importFileInputRef.current?.click()}
                      className="py-2 px-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-secondary font-label-sm text-label-sm cursor-pointer"
                    >
                      Import JSON
                    </button>
                  </div>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="text-on-surface font-semibold">Studio Shortcuts</span>
                  <div className="flex justify-between">
                    <span>Play / Pause</span>
                    <span className="text-secondary">Space</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Step -1f / +1f</span>
                    <span className="text-secondary">← / →</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Undo / Redo</span>
                    <span className="text-secondary">Ctrl+Z / Ctrl+Shift+Z</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
