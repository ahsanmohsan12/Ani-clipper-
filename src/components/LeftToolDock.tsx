import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Subtitles,
  Mic,
  Music,
  Plus,
  Play,
  Square,
  Save,
  Upload,
  Sparkles,
  ArrowUpRight,
  Type,
  Shapes,
  ZoomIn,
  Snowflake,
  LayoutTemplate,
  Check,
} from 'lucide-react';
import {
  type ProjectState,
  type TimelineClip,
  type StylePreset,
  type OverlayKind,
  type CaptionWord,
  type CaptionStyle,
  roundToMs,
} from '../editor/engine';
import {
  ROYALTY_FREE_LIBRARY,
  BUILT_IN_STYLE_PRESETS,
  type RoyaltyFreeAudioAsset,
} from '../editor/defaultProject';
import { studioAudio } from '../editor/audioSynth';

export type LeftDockTab = 'media' | 'captions' | 'commentary' | 'audio';

interface LeftToolDockProps {
  activeTab: LeftDockTab;
  onChangeTab: (tab: LeftDockTab) => void;
  project: ProjectState;
  playheadTime: number;
  selectedClipId: string | null;
  onAddClip: (clip: TimelineClip) => void;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => void;
  onApplyStylePreset: (preset: StylePreset) => void;
  onUpdateCommentaryConfig: (patch: Partial<ProjectState['commentary']>) => void;
  onInsertFreezeFrame: (explanationText: string, shapeType: 'callout-box' | 'highlight-ring' | 'rectangle') => void;
  onSaveProjectToServer: () => Promise<void>;
  onLoadProjectState: (loaded: ProjectState) => void;
}

export const LeftToolDock: React.FC<LeftToolDockProps> = ({
  activeTab,
  onChangeTab,
  project,
  playheadTime,
  selectedClipId,
  onAddClip,
  onUpdateClip,
  onApplyStylePreset,
  onUpdateCommentaryConfig,
  onInsertFreezeFrame,
  onSaveProjectToServer,
  onLoadProjectState,
}) => {
  // Custom presets state
  const [customPresets, setCustomPresets] = useState<StylePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Overlay quick-builder state
  const [overlayText, setOverlayText] = useState('Key Momentum Shift');
  const [overlaySubtext, setOverlaySubtext] = useState('FRAME ANALYSIS');
  const [selectedSticker, setSelectedSticker] = useState('🎯');

  // Commentary Freeze-Frame & Voiceover state
  const [freezeExplanation, setFreezeExplanation] = useState(
    'Notice the 42° board angle right before impact'
  );
  const [freezeShape, setFreezeShape] = useState<'callout-box' | 'highlight-ring' | 'rectangle'>('callout-box');
  const [isRecordingVo, setIsRecordingVo] = useState(false);
  const [voRecordStartSec, setVoRecordStartSec] = useState(0);
  const [voElapsedSec, setVoElapsedSec] = useState(0);

  // Caption new word state
  const [newCaptionWord, setNewCaptionWord] = useState('');

  // Audio library filter
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<'all' | 'music' | 'sfx'>('all');

  useEffect(() => {
    if (!isRecordingVo) return;
    const interval = window.setInterval(() => {
      setVoElapsedSec((prev) => roundToMs(prev + 0.2));
    }, 200);
    return () => window.clearInterval(interval);
  }, [isRecordingVo]);

  const activeCaptionClip =
    project.clips.find((c) => c.id === selectedClipId && c.trackId === 'captions') ||
    project.clips.find(
      (c) =>
        c.trackId === 'captions' &&
        playheadTime >= c.startTime &&
        playheadTime <= c.startTime + c.duration
    ) ||
    project.clips.find((c) => c.trackId === 'captions');

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
        : { brightness: 0, contrast: 12, saturation: 5, filter: 'kodak-2383' },
      captionStyle: refCap?.captionStyle
        ? { ...refCap.captionStyle }
        : {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 26,
            textColor: '#F1F3F5',
            activeWordColor: '#F59E0B',
            bgColor: 'rgba(11, 12, 14, 0.84)',
            animation: 'word-pop',
            positionY: 84,
          },
      commentaryLayout: project.commentary.layoutMode,
    };
    setCustomPresets((prev) => [preset, ...prev]);
    setNewPresetName('');
    setSaveBanner(`Saved preset "${preset.name}"`);
    setTimeout(() => setSaveBanner(null), 2500);
  };

  const handleAddOverlayElement = (kind: OverlayKind) => {
    const newClip: TimelineClip = {
      id: `ov_${kind}_${Date.now()}`,
      trackId: 'overlay',
      name: `${kind.toUpperCase()}: ${overlayText.slice(0, 18)}`,
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
        { id: `kf_${Date.now()}`, offsetSec: 0, x: 0, y: 0, scale: 1, rotation: 0, easing: 'punch' },
      ],
      overlay: {
        kind,
        text: overlayText || 'Key Frame Point',
        subtext: overlaySubtext,
        color: '#E56B38',
        accentColor: '#F59E0B',
        x: 28,
        y: 30,
        targetX: 55,
        targetY: 52,
        scale: 1,
        rotation: 0,
        stickerSymbol: kind === 'sticker' ? selectedSticker : undefined,
        shapeType: kind === 'zoom-highlight' ? 'highlight-ring' : 'rectangle',
      },
    };
    onAddClip(newClip);
  };

  const handleAddTitleCard = (placement: 'intro' | 'outro') => {
    const startSec = placement === 'intro' ? 0 : roundToMs(Math.max(0, project.duration - 3.0));
    const cardClip: TimelineClip = {
      id: `title_${placement}_${Date.now()}`,
      trackId: 'overlay',
      name: `${placement === 'intro' ? 'Intro' : 'Outro'} Card: ${project.commentary.creatorName}`,
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
            : `Edited by ${project.commentary.creatorName}`,
        subtext: `${project.commentary.brandTagline} · ${
          placement === 'intro' ? 'ORIGINAL COMMENTARY' : 'THANKS FOR WATCHING'
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
        name: `Mic_Commentary_Take_${new Date().toLocaleTimeString([], { hour12: false })}.wav`,
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
      gainDb: asset.category === 'music' ? -8 : 0,
      muted: false,
      colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      keyframes: [],
      licenseTag: asset.license,
    };
    onAddClip(newAudioClip);
  };

  const handleWordEdit = (wordId: string, patch: Partial<CaptionWord>) => {
    if (!activeCaptionClip) return;
    onUpdateClip(activeCaptionClip.id, (clip) => ({
      ...clip,
      captions: (clip.captions || []).map((w) => (w.id === wordId ? { ...w, ...patch } : w)),
    }));
  };

  const handleAddWordToCaption = () => {
    if (!activeCaptionClip || !newCaptionWord.trim()) return;
    const words = activeCaptionClip.captions || [];
    const lastEnd = words.length > 0 ? words[words.length - 1].endOffset : 0;
    const nextWord: CaptionWord = {
      id: `cw_${Date.now()}`,
      word: newCaptionWord.trim(),
      startOffset: roundToMs(lastEnd),
      endOffset: roundToMs(lastEnd + 0.8),
      highlight: true,
    };
    onUpdateClip(activeCaptionClip.id, (clip) => ({
      ...clip,
      duration: Math.max(clip.duration, nextWord.endOffset + 0.2),
      captions: [...(clip.captions || []), nextWord],
    }));
    setNewCaptionWord('');
  };

  const handleUpdateCaptionStyle = (patch: Partial<CaptionStyle>) => {
    if (!activeCaptionClip) return;
    onUpdateClip(activeCaptionClip.id, (clip) => ({
      ...clip,
      captionStyle: {
        ...(clip.captionStyle || {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 26,
          textColor: '#F1F3F5',
          activeWordColor: '#F59E0B',
          bgColor: 'rgba(11, 12, 14, 0.84)',
          animation: 'word-pop',
          positionY: 84,
        }),
        ...patch,
      },
    }));
  };

  const handleExportProjectJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_clipforge_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      aria-label="Studio Asset and Commentary Dock"
      className="w-[290px] shrink-0 bg-[#14161A] border-r border-[#23262F] flex flex-col select-none overflow-hidden"
    >
      {/* 4-Tab Segmented Navigation */}
      <div className="grid grid-cols-4 p-1.5 gap-1 bg-[#0E1014] border-b border-[#23262F]">
        <button
          type="button"
          onClick={() => onChangeTab('media')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'media'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5 text-[#E56B38]" />
          <span>Overlays</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('captions')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'captions'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <Subtitles className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Captions</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('commentary')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'commentary'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-[#F43F5E]" />
          <span>Commentary</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('audio')}
          className={`py-1.5 px-1 rounded text-[11px] font-medium flex flex-col items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'audio'
              ? 'bg-[#1C1F26] text-[#F1F3F5] border border-[#23262F]'
              : 'text-[#8E95A5] hover:text-[#F1F3F5]'
          }`}
        >
          <Music className="w-3.5 h-3.5 text-[#10B981]" />
          <span>CC0 Audio</span>
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
        {saveBanner && (
          <div className="px-3 py-2 bg-[#10B981]/15 border border-[#10B981]/40 rounded text-xs text-[#10B981] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{saveBanner}</span>
          </div>
        )}

        {/* TAB 1: OVERLAYS, GRAPHICS & STYLE PRESETS */}
        {activeTab === 'media' && (
          <>
            {/* Overlay Generator (Text, Stickers, Shapes, Arrows, Zoom Highlights) */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Add Graphic Overlays at Playhead
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-[#8E95A5] mb-1">
                    Callout / Overlay Headline
                  </label>
                  <input
                    type="text"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] text-[#8E95A5] mb-1">
                      Kicker Label
                    </label>
                    <input
                      type="text"
                      value={overlaySubtext}
                      onChange={(e) => setOverlaySubtext(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#8E95A5] mb-1">
                      Sticker
                    </label>
                    <select
                      aria-label="Sticker symbol"
                      value={selectedSticker}
                      onChange={(e) => setSelectedSticker(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                    >
                      <option value="🎯">🎯 Target</option>
                      <option value="⚡">⚡ Transient</option>
                      <option value="🔍">🔍 Inspect</option>
                      <option value="🔥">🔥 Highlight</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddOverlayElement('text')}
                  className="px-2.5 py-1.5 text-xs bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Type className="w-3.5 h-3.5 text-[#E56B38]" />
                  <span>+ Text Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOverlayElement('arrow')}
                  className="px-2.5 py-1.5 text-xs bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>+ Vector Arrow</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOverlayElement('shape')}
                  className="px-2.5 py-1.5 text-xs bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Shapes className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>+ Bounding Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOverlayElement('sticker')}
                  className="px-2.5 py-1.5 text-xs bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>+ Sticker Badge</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOverlayElement('zoom-highlight')}
                  className="col-span-2 px-2.5 py-1.5 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#38BDF8] border border-[#23262F] rounded flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>+ Key Moment Zoom-In Ring</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#23262F] pt-4 space-y-2.5">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Style Presets (Color + Captions + Layout)
              </h3>
              <div className="space-y-1.5">
                {[...customPresets, ...BUILT_IN_STYLE_PRESETS].map((preset) => (
                  <div
                    key={preset.id}
                    className="p-2.5 bg-[#0B0C0E] border border-[#23262F] rounded flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#F1F3F5] truncate">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-[#8E95A5]">
                        {preset.colorSettings.filter} · {preset.captionStyle.animation}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyStylePreset(preset);
                        setSaveBanner(`Applied "${preset.name}"`);
                        setTimeout(() => setSaveBanner(null), 2000);
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-[#1C1F26] hover:bg-[#E56B38] text-[#F1F3F5] hover:text-white border border-[#23262F] rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>

              {/* Save Current Look as Custom Preset */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Custom preset name..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomPreset}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#E56B38] hover:bg-[#d45d2c] text-white rounded transition-colors whitespace-nowrap shrink-0"
                >
                  Save Preset
                </button>
              </div>
            </div>

            {/* Project Save / Load Persistence */}
            <div className="border-t border-[#23262F] pt-4 space-y-2">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Project Persistence
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveProjectToServer();
                    setSaveBanner('Project saved to studio server');
                    setTimeout(() => setSaveBanner(null), 2500);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5 text-[#E56B38]" />
                  <span>Save Project</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportProjectJson}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Export JSON</span>
                </button>
              </div>
              <label className="block w-full px-2.5 py-1.5 text-xs text-center bg-[#0B0C0E] hover:bg-[#1C1F26] text-[#8E95A5] hover:text-[#F1F3F5] border border-dashed border-[#23262F] rounded cursor-pointer transition-colors">
                <span>Load Project JSON File</span>
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const parsed = JSON.parse(String(reader.result)) as ProjectState;
                        if (parsed && Array.isArray(parsed.clips)) {
                          onLoadProjectState(parsed);
                          setSaveBanner(`Loaded "${parsed.title}"`);
                          setTimeout(() => setSaveBanner(null), 2500);
                        }
                      } catch {
                        setSaveBanner('Invalid project JSON file');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
          </>
        )}

        {/* TAB 2: WORD-BY-WORD CAPTION EDITOR */}
        {activeTab === 'captions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5] whitespace-nowrap shrink-0">
                Word-Level Captions
              </h3>
              <span className="text-[11px] font-mono text-[#F59E0B] truncate max-w-[115px]">
                {activeCaptionClip ? activeCaptionClip.name : 'None Selected'}
              </span>
            </div>

            {activeCaptionClip ? (
              <>
                {/* Word List Editor */}
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                  {(activeCaptionClip.captions || []).map((w) => (
                    <div
                      key={w.id}
                      className="p-2 bg-[#0B0C0E] border border-[#23262F] rounded flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        aria-label={`Caption word ${w.word}`}
                        value={w.word}
                        onChange={(e) => handleWordEdit(w.id, { word: e.target.value })}
                        className="w-24 px-2 py-1 text-xs bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5] font-medium"
                      />
                      <input
                        type="number"
                        step="0.1"
                        aria-label={`Word ${w.word} start offset`}
                        value={w.startOffset}
                        onChange={(e) =>
                          handleWordEdit(w.id, { startOffset: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-14 px-1.5 py-1 text-[11px] font-mono tabular-nums bg-[#14161A] border border-[#23262F] rounded text-[#8E95A5]"
                      />
                      <input
                        type="number"
                        step="0.1"
                        aria-label={`Word ${w.word} end offset`}
                        value={w.endOffset}
                        onChange={(e) =>
                          handleWordEdit(w.id, { endOffset: Math.max(w.startOffset + 0.1, Number(e.target.value)) })
                        }
                        className="w-14 px-1.5 py-1 text-[11px] font-mono tabular-nums bg-[#14161A] border border-[#23262F] rounded text-[#8E95A5]"
                      />
                      <button
                        type="button"
                        onClick={() => handleWordEdit(w.id, { highlight: !w.highlight })}
                        title="Toggle keyword emphasis"
                        className={`px-1.5 py-1 text-[10px] font-mono rounded border transition-colors ${
                          w.highlight
                            ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                            : 'border-[#23262F] text-[#8E95A5]'
                        }`}
                      >
                        ★
                      </button>
                    </div>
                  ))}
                </div>

                {/* Append Word */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add word token..."
                    value={newCaptionWord}
                    onChange={(e) => setNewCaptionWord(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                  />
                  <button
                    type="button"
                    onClick={handleAddWordToCaption}
                    className="px-2.5 py-1.5 text-xs font-medium bg-[#E56B38] hover:bg-[#d45d2c] text-white rounded flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Word</span>
                  </button>
                </div>

                {/* Caption Style & Animation Controls */}
                <div className="border-t border-[#23262F] pt-3 space-y-2.5">
                  <h4 className="text-xs font-display font-semibold text-[#F1F3F5]">
                    Caption Typography & Animation
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#8E95A5] mb-1">
                        Animation Mode
                      </label>
                      <select
                        aria-label="Caption animation mode"
                        value={activeCaptionClip.captionStyle?.animation ?? 'word-pop'}
                        onChange={(e) =>
                          handleUpdateCaptionStyle({
                            animation: e.target.value as CaptionStyle['animation'],
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                      >
                        <option value="word-pop">Word Pop Scale</option>
                        <option value="karaoke-fill">Karaoke Fill</option>
                        <option value="typewriter">Typewriter</option>
                        <option value="fade-up">Editorial Fade</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8E95A5] mb-1">
                        Font Family
                      </label>
                      <select
                        aria-label="Caption font family"
                        value={activeCaptionClip.captionStyle?.fontFamily ?? 'Plus Jakarta Sans'}
                        onChange={(e) => handleUpdateCaptionStyle({ fontFamily: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs bg-[#0B0C0E] border border-[#23262F] rounded text-[#F1F3F5]"
                      >
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                        <option value="DM Sans">DM Sans</option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-[#8E95A5] mb-1">
                      <span>Vertical Position</span>
                      <span className="font-mono tabular-nums">
                        {activeCaptionClip.captionStyle?.positionY ?? 84}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={90}
                      value={activeCaptionClip.captionStyle?.positionY ?? 84}
                      onChange={(e) =>
                        handleUpdateCaptionStyle({ positionY: Number(e.target.value) })
                      }
                      className="w-full accent-[#E56B38]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#8E95A5]">
                Select a caption clip on Track C1 to edit word timings.
              </p>
            )}
          </div>
        )}

        {/* TAB 3: TRANSFORMATIVE COMMENTARY TOOLS */}
        {activeTab === 'commentary' && (
          <div className="space-y-4">
            {/* 1. Direct Microphone Voiceover Recorder */}
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-semibold text-[#F1F3F5]">
                  Direct Voiceover Mic
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[#F43F5E]">
                  {isRecordingVo ? `REC ${voElapsedSec.toFixed(1)}s` : 'READY'}
                </span>
              </div>
              <p className="text-[11px] text-[#8E95A5]">
                Record transformative commentary directly over the active clip onto Track A1.
              </p>
              <button
                type="button"
                onClick={handleToggleVoiceoverRecording}
                className={`w-full py-2 px-3 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  isRecordingVo
                    ? 'bg-[#EF4444] text-white'
                    : 'bg-[#E56B38] hover:bg-[#d45d2c] text-white'
                }`}
              >
                {isRecordingVo ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop & Insert Voiceover ({voElapsedSec.toFixed(1)}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Record Voiceover at Playhead</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Freeze-Frame + Annotation + Text Explanation */}
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-semibold text-[#F1F3F5]">
                  Freeze Frame + Telestration
                </span>
                <Snowflake className="w-3.5 h-3.5 text-[#38BDF8]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#8E95A5] mb-1">
                  Commentary Explanation Text
                </label>
                <input
                  type="text"
                  value={freezeExplanation}
                  onChange={(e) => setFreezeExplanation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8E95A5] mb-1">
                  Annotation Callout Style
                </label>
                <select
                  aria-label="Annotation callout style"
                  value={freezeShape}
                  onChange={(e) =>
                    setFreezeShape(e.target.value as 'callout-box' | 'highlight-ring' | 'rectangle')
                  }
                  className="w-full px-2 py-1.5 text-xs bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5]"
                >
                  <option value="callout-box">Vector Arrow + Callout Box</option>
                  <option value="highlight-ring">Zoom Spotlight Ring</option>
                  <option value="rectangle">Frame Bounding Box</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => onInsertFreezeFrame(freezeExplanation, freezeShape)}
                className="w-full py-1.5 px-3 bg-[#1C1F26] hover:bg-[#272B36] text-[#38BDF8] border border-[#23262F] rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Insert 2.5s Freeze + Annotation</span>
              </button>
            </div>

            {/* 3. PiP Webcam & Split-Screen Controls */}
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2.5">
              <span className="text-xs font-display font-semibold text-[#F1F3F5] block">
                Reaction PiP & Split-Screen Layout
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#8E95A5] mb-1">
                    PiP Corner
                  </label>
                  <select
                    aria-label="PiP webcam corner"
                    value={project.commentary.pipCorner}
                    onChange={(e) =>
                      onUpdateCommentaryConfig({
                        pipCorner: e.target.value as ProjectState['commentary']['pipCorner'],
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5]"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#8E95A5] mb-1">
                    Split Ratio ({Math.round(project.commentary.splitRatio * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.3}
                    max={0.7}
                    step={0.05}
                    value={project.commentary.splitRatio}
                    onChange={(e) =>
                      onUpdateCommentaryConfig({ splitRatio: Number(e.target.value) })
                    }
                    className="w-full accent-[#E56B38] mt-2"
                  />
                </div>
              </div>
            </div>

            {/* 4. Intro / Outro & Title Card Builder */}
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-semibold text-[#F1F3F5]">
                  Branded Intro / Outro Builder
                </span>
                <LayoutTemplate className="w-3.5 h-3.5 text-[#F59E0B]" />
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-[#8E95A5] mb-1">
                    Creator / Channel Name
                  </label>
                  <input
                    type="text"
                    value={project.commentary.creatorName}
                    onChange={(e) => onUpdateCommentaryConfig({ creatorName: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8E95A5] mb-1">
                    Brand Studio Tagline
                  </label>
                  <input
                    type="text"
                    value={project.commentary.brandTagline}
                    onChange={(e) => onUpdateCommentaryConfig({ brandTagline: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#14161A] border border-[#23262F] rounded text-[#F1F3F5]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddTitleCard('intro')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    + Intro Card
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTitleCard('outro')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    + Outro Card
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ROYALTY-FREE MUSIC & SFX LIBRARY (CC0 / LICENSED ONLY) */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display font-semibold text-[#F1F3F5]">
                Cleared Royalty-Free Audio
              </h3>
              <span className="text-[11px] font-mono text-[#10B981]">CC0 / Licensed</span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#0B0C0E] rounded border border-[#23262F]">
              {(['all', 'music', 'sfx'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAudioCategoryFilter(cat)}
                  className={`flex-1 py-1 text-xs font-medium rounded capitalize transition-colors ${
                    audioCategoryFilter === cat
                      ? 'bg-[#1C1F26] text-[#F1F3F5]'
                      : 'text-[#8E95A5] hover:text-[#F1F3F5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {ROYALTY_FREE_LIBRARY.filter(
                (item) => audioCategoryFilter === 'all' || item.category === audioCategoryFilter
              ).map((asset) => (
                <div
                  key={asset.id}
                  className="p-2.5 bg-[#0B0C0E] border border-[#23262F] rounded space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#F1F3F5] truncate">
                        {asset.name}
                      </div>
                      <div className="text-[11px] text-[#8E95A5]">
                        {asset.artist} · {asset.duration}s
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => studioAudio.triggerAssetPreview(asset.synthPreset)}
                      aria-label={`Preview ${asset.name}`}
                      className="p-1.5 bg-[#14161A] hover:bg-[#23262F] text-[#F1F3F5] border border-[#23262F] rounded shrink-0"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                    {asset.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-[#10B981]">
                      {asset.license}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddRoyaltyFreeAudio(asset)}
                      className="px-2.5 py-1 text-xs font-medium bg-[#1C1F26] hover:bg-[#E56B38] text-[#F1F3F5] hover:text-white border border-[#23262F] rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to {asset.category === 'music' ? 'A3' : 'A2'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
