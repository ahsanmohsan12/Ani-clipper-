import React, { useState, useEffect, useCallback } from 'react';
import {
  type ProjectState,
  type TimelineClip,
  type TrackId,
  type StylePreset,
  createHistoryStack,
  pushHistory,
  undoHistory,
  redoHistory,
  splitClipAtTime,
  deleteClip,
  reorderClip,
  trimClip,
  applyClipSpeed,
  upsertKeyframe,
  addZoomHighlightKeyframes,
  insertFreezeFrameWithAnnotation,
  computeProjectRightsState,
  stepFrame,
  roundToMs,
  clamp,
} from './editor/engine';
import {
  createInitialProject,
  type CaptionVisualPreset,
  type DashboardProjectCard,
} from './editor/defaultProject';
import { LeftToolDock, type LeftDockTab } from './components/LeftToolDock';
import { PreviewMonitor } from './components/PreviewMonitor';
import { RightInspector, type RightInspectorTab } from './components/RightInspector';
import { MultiTrackTimeline } from './components/MultiTrackTimeline';
import { ExportModal } from './components/ExportModal';
import {
  ClipForgeLogoMark,
  DashboardView,
  MobileCompanionView,
  ViralHeroView,
} from './components/DashboardAndHeroViews';

export type WorkspaceScreen = 'editor' | 'dashboard' | 'mobile' | 'landing';

export default function App() {
  const [history, setHistory] = useState(() => createHistoryStack(createInitialProject()));
  const project = history.present;

  const [activeScreen, setActiveScreen] = useState<WorkspaceScreen>('editor');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [autoReframeActive, setAutoReframeActive] = useState(true);

  const [playheadTime, setPlayheadTime] = useState<number>(5.4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopPlayback, setLoopPlayback] = useState<boolean>(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip_v1_main');
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(62);

  const [leftTab, setLeftTab] = useState<LeftDockTab>('select');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [rightTab, setRightTab] = useState<RightInspectorTab>('captions');

  const [activeCaptionPresetId, setActiveCaptionPresetId] =
    useState<CaptionVisualPreset['id']>('hormozi');
  const [activeTransition, setActiveTransition] = useState<'fade' | 'zoom' | 'slide'>('zoom');

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const commitProjectChange = useCallback(
    (updater: (prev: ProjectState) => ProjectState) => {
      setHistory((prevStack) => {
        const nextState = updater(prevStack.present);
        return pushHistory(prevStack, nextState);
      });
    },
    []
  );

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1000 / project.fps;
    const timer = window.setInterval(() => {
      setPlayheadTime((prev) => {
        const next = roundToMs(prev + 1 / project.fps);
        if (next >= project.duration) {
          if (loopPlayback) {
            return 0;
          }
          setIsPlaying(false);
          return project.duration;
        }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, loopPlayback, project.fps, project.duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayheadTime((t) => stepFrame(t, -1, project.fps, project.duration));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayheadTime((t) => stepFrame(t, 1, project.fps, project.duration));
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          setHistory((s) => redoHistory(s));
        } else {
          setHistory((s) => undoHistory(s));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.fps, project.duration]);

  const handleSelectRailTab = (tab: LeftDockTab) => {
    if (tab === 'select') {
      setLeftTab('select');
      setDrawerOpen(false);
      return;
    }
    if (leftTab === tab && drawerOpen) {
      setDrawerOpen(false);
    } else {
      setLeftTab(tab);
      setDrawerOpen(true);
    }
  };

  const handleSelectClip = (clipId: string) => {
    setSelectedClipId(clipId);
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    if (clip.trackId === 'captions') {
      setRightTab('captions');
    } else if (clip.trackId === 'sfx' || clip.trackId === 'music' || clip.trackId === 'voiceover') {
      setRightTab('audio');
    }
  };

  const handleSplitAtPlayhead = () => {
    const targetId =
      selectedClipId ||
      project.clips.find(
        (c) =>
          c.trackId === 'video' &&
          playheadTime > c.startTime + 0.2 &&
          playheadTime < c.startTime + c.duration - 0.2
      )?.id;
    if (!targetId) return;

    commitProjectChange((prev) => {
      const targetClip = prev.clips.find((c) => c.id === targetId);
      if (!targetClip) return prev;
      const splitPoint =
        playheadTime > targetClip.startTime + 0.2 &&
        playheadTime < targetClip.startTime + targetClip.duration - 0.2
          ? playheadTime
          : roundToMs(targetClip.startTime + targetClip.duration / 2);

      const res = splitClipAtTime(prev.clips, targetId, splitPoint);
      if (res.rightClipId) {
        setSelectedClipId(res.rightClipId);
      }
      return {
        ...prev,
        clips: res.clips,
      };
    });
  };

  const handleDeleteSelected = (ripple: boolean) => {
    if (!selectedClipId) return;
    commitProjectChange((prev) => {
      const updatedClips = deleteClip(prev.clips, selectedClipId, ripple);
      const nextSelected = updatedClips[0]?.id || null;
      setSelectedClipId(nextSelected);
      return {
        ...prev,
        clips: updatedClips,
      };
    });
  };

  const handleReorderSelected = (direction: 'prev' | 'next') => {
    if (!selectedClipId) return;
    commitProjectChange((prev) => ({
      ...prev,
      clips: reorderClip(prev.clips, selectedClipId, direction),
    }));
  };

  const handleTrimSelected = (edge: 'in' | 'out', deltaSec: number) => {
    if (!selectedClipId) return;
    commitProjectChange((prev) => {
      const target = prev.clips.find((c) => c.id === selectedClipId);
      if (!target) return prev;
      const targetEdgeTime =
        edge === 'in'
          ? target.startTime + deltaSec
          : target.startTime + target.duration + deltaSec;
      return {
        ...prev,
        clips: trimClip(prev.clips, selectedClipId, edge, targetEdgeTime, snapEnabled),
      };
    });
  };

  const handleUpdateClip = (
    clipId: string,
    updater: (clip: TimelineClip) => TimelineClip
  ) => {
    commitProjectChange((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? updater(c) : c)),
    }));
  };

  const handleApplyClipSpeed = (
    clipId: string,
    speed: number,
    preservePitch: boolean
  ) => {
    commitProjectChange((prev) => ({
      ...prev,
      clips: applyClipSpeed(prev.clips, clipId, speed, preservePitch),
    }));
  };

  const handleUpsertKeyframeAtPlayhead = (
    clipId: string,
    patch: { x?: number; y?: number; scale?: number; rotation?: number }
  ) => {
    commitProjectChange((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        const offset = clamp(playheadTime - c.startTime, 0, c.duration);
        return upsertKeyframe(c, offset, patch);
      }),
    }));
  };

  const handleTriggerZoomHighlight = (clipId: string) => {
    commitProjectChange((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id !== clipId) return c;
        const offset = clamp(
          playheadTime - c.startTime,
          0.4,
          Math.max(0.4, c.duration - 0.4)
        );
        return addZoomHighlightKeyframes(c, offset, 1.45, -8, -5);
      }),
    }));
  };

  const handleInsertFreezeFrame = (
    explanationText: string = 'Compute scaling inflection point — 4x retention spike',
    shapeType: 'callout-box' | 'highlight-ring' | 'rectangle' = 'callout-box'
  ) => {
    commitProjectChange((prev) =>
      insertFreezeFrameWithAnnotation(prev, playheadTime, explanationText, shapeType)
    );
  };

  const handleAddClip = (newClip: TimelineClip) => {
    commitProjectChange((prev) => {
      const nextClips = [...prev.clips, newClip];
      const maxEnd = nextClips.reduce(
        (acc, c) => Math.max(acc, c.startTime + c.duration),
        prev.duration
      );
      return {
        ...prev,
        duration: roundToMs(maxEnd),
        clips: nextClips,
      };
    });
    setSelectedClipId(newClip.id);
  };

  const handleApplyStylePreset = (preset: StylePreset) => {
    commitProjectChange((prev) => ({
      ...prev,
      commentary: {
        ...prev.commentary,
        layoutMode: preset.commentaryLayout,
      },
      clips: prev.clips.map((c) => {
        if (c.trackId === 'video') {
          return { ...c, colorSettings: { ...preset.colorSettings } };
        }
        if (c.trackId === 'captions') {
          return { ...c, captionStyle: { ...preset.captionStyle } };
        }
        return c;
      }),
    }));
  };

  const handleSelectCaptionPreset = (preset: CaptionVisualPreset) => {
    setActiveCaptionPresetId(preset.id);
    commitProjectChange((prev) => ({
      ...prev,
      clips: prev.clips.map((c) =>
        c.trackId === 'captions'
          ? {
              ...c,
              captionStyle: {
                ...(c.captionStyle || {
                  fontSize: 48,
                  positionY: 74,
                }),
                fontFamily: preset.fontFamily,
                textColor: preset.textColor,
                activeWordColor: preset.activeWordColor,
                bgColor: preset.bgColor,
                animation: preset.animation,
              },
            }
          : c
      ),
    }));
  };

  const handleSaveProjectToServer = async () => {
    await fetch('/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
  };

  const handleOpenDashboardCardInEditor = (card?: DashboardProjectCard) => {
    if (card) {
      commitProjectChange((prev) => ({
        ...prev,
        title: card.title,
        clips: prev.clips.map((c, idx) =>
          c.trackId === 'video' && idx === 0
            ? { ...c, thumbnailUrl: card.thumbnailUrl }
            : c
        ),
      }));
    }
    setActiveScreen('editor');
  };

  const handleQuickDownloadShortMp4 = () => {
    const primaryClip = project.clips.find((c) => c.trackId === 'video');
    const url = `/api/export/quick-mp4?title=${encodeURIComponent(
      project.title
    )}&aspect=${encodeURIComponent(project.aspectRatio)}&image=${encodeURIComponent(
      primaryClip?.thumbnailUrl || '/src/assets/images/commentary_creator_cam_1794941711189.jpg'
    )}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipforge_${project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')}_crf16.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);

  const navItems: Array<{
    id: WorkspaceScreen;
    label: string;
    icon: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'editor', label: 'Video Editor', icon: 'movie_edit' },
    { id: 'mobile', label: 'Mobile Companion', icon: 'phone_iphone' },
    { id: 'landing', label: 'Landing Page', icon: 'public' },
  ];

  const topHeaderOrder: Array<{
    id: WorkspaceScreen;
    label: string;
  }> = [
    { id: 'landing', label: 'Landing Page' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'editor', label: 'Video Editor' },
    { id: 'mobile', label: 'Mobile Companion' },
  ];

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md min-h-screen">
      {/* Fixed Left Sidebar (Exact match to code_a5f5c0ca.html & code_1c2fef5e.html) */}
      <aside
        aria-label="ClipForge Primary Sidebar"
        className="fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col justify-between py-space-md select-none"
      >
        <div className="flex flex-col gap-space-md">
          <div className="px-space-md">
            <button
              type="button"
              onClick={() => setActiveScreen('editor')}
              className="cursor-pointer focus:outline-none"
            >
              <ClipForgeLogoMark />
            </button>
          </div>

          <div className="px-space-md">
            <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase">
                AI Engine Online
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-space-xs px-space-sm">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-surface-container-high text-on-surface font-title-md text-title-md'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-body-md text-body-md'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-space-md flex flex-col gap-space-sm">
          <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Plan
              </span>
              <span className="font-title-md text-title-md text-secondary">
                Pro Trial (7d)
              </span>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">
              workspace_premium
            </span>
          </div>

          <div className="flex items-center gap-space-sm pt-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
            <div className="flex flex-col truncate">
              <span className="font-title-md text-title-md text-on-surface truncate">
                Creator Studio
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                prod@clipforge.ai
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Container offset by w-64 sidebar */}
      <div className="pl-64">
        {/* Fixed Top Header (`h-16 bg-surface/85 backdrop-blur-xl` matching code_a5f5c0ca.html) */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.2)] z-40 flex items-center justify-between px-space-md md:px-margin-desktop select-none">
          <nav className="flex items-center gap-space-xs">
            {topHeaderOrder.map((tab) => {
              const isActive = activeScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveScreen(tab.id)}
                  className={`px-space-md py-space-xs rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-surface-container text-on-surface font-title-md text-title-md'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-body-md text-body-md'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-space-md">
            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-high">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase">
                AI Engine Online
              </span>
            </div>

            <div className="px-space-sm py-space-xs rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold uppercase tracking-wider inline-flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Pro Trial
            </div>

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </header>

        {/* Active View Area */}
        <main className="w-full pt-16 bg-surface">
          {activeScreen === 'dashboard' ? (
            <DashboardView
              onOpenInEditor={handleOpenDashboardCardInEditor}
              onTriggerExport={(card) => {
                if (card) handleOpenDashboardCardInEditor(card);
                setIsExportModalOpen(true);
              }}
            />
          ) : activeScreen === 'mobile' ? (
            <MobileCompanionView
              onOpenEditor={() => setActiveScreen('editor')}
              onTriggerExport={() => setIsExportModalOpen(true)}
            />
          ) : activeScreen === 'landing' ? (
            <ViralHeroView
              onStartEditing={() => setActiveScreen('editor')}
              onOpenDashboard={() => setActiveScreen('dashboard')}
            />
          ) : (
            <div className="flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden select-none bg-surface-container-lowest">
              {/* Top Subheader Studio Bar (Exact match to code_a5f5c0ca.html) */}
              <div className="h-14 bg-surface-container-low px-space-md md:px-margin-desktop flex items-center justify-between flex-shrink-0 z-30 shadow-md gap-3">
                <div className="flex items-center gap-space-md min-w-0">
                  <div className="flex items-center gap-space-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveScreen('dashboard')}
                      className="p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      title="Back to Dashboard"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        arrow_back
                      </span>
                    </button>
                    <div className="flex flex-col shrink-0">
                      <div className="flex items-center gap-space-xs">
                        {isEditingTitle ? (
                          <input
                            type="text"
                            autoFocus
                            value={project.title}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setIsEditingTitle(false);
                            }}
                            onChange={(e) =>
                              commitProjectChange((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="bg-surface-container-lowest px-2 py-0.5 rounded font-headline-md text-title-md text-on-surface focus:outline-none ring-1 ring-primary"
                          />
                        ) : (
                          <>
                            <span className="font-headline-md text-title-md text-on-surface font-semibold whitespace-nowrap">
                              {project.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditingTitle(true)}
                              aria-label="Edit project title"
                              className="material-symbols-outlined text-[16px] text-on-surface-variant cursor-pointer hover:text-primary"
                            >
                              edit
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-label-sm text-label-sm text-outline whitespace-nowrap">
                        Source: lex_fridman_ep418_raw_4k.mov
                      </span>
                    </div>
                  </div>

                  <div className="h-6 w-[1px] bg-surface-container-high hidden md:block shrink-0" />

                  {/* Virality Score Metric */}
                  <div className="hidden lg:flex items-center gap-space-xs bg-surface-container px-space-sm py-space-xs rounded-full shrink-0">
                    <div className="flex items-center gap-1">
                      <span
                        className="material-symbols-outlined text-secondary text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        local_fire_department
                      </span>
                      <span className="font-label-md text-label-sm text-secondary font-bold">
                        VIRALITY 99/100
                      </span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-outline hidden 2xl:inline-block" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wider hidden 2xl:inline">
                      HIGH HOOK RETENTION
                    </span>
                  </div>

                  {/* Format Pill */}
                  <div className="hidden xl:flex items-center gap-space-xs bg-surface-container-high px-space-sm py-space-xs rounded-lg shrink-0">
                    <span className="material-symbols-outlined text-primary text-[16px]">
                      crop_portrait
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface">
                      1080 x 1920 ({project.aspectRatio})
                    </span>
                  </div>
                </div>

                {/* Center/Right Controls */}
                <div className="flex items-center gap-space-sm shrink-0">
                  {/* Rights Check Warning Indicator when source is external */}
                  {rightsState.requiresWarningBanner && (
                    <button
                      type="button"
                      data-testid="global-rights-warning-bar"
                      onClick={() => setRightTab('reframe')}
                      title="Rights Check: External Source Attribution Active"
                      className="hidden lg:flex items-center gap-1 bg-secondary-container/15 hover:bg-secondary-container/25 text-secondary px-2.5 py-1 rounded-lg font-label-sm text-label-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        verified_user
                      </span>
                      <span>Rights: {project.rights.sourceType.toUpperCase()}</span>
                    </button>
                  )}

                  {/* Auto Reframe Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setAutoReframeActive((v) => !v)}
                    className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface px-space-sm py-space-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      face_retouching_natural
                    </span>
                    <span className="font-label-sm text-label-sm font-medium">
                      Auto-Reframe
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        autoReframeActive
                          ? 'bg-secondary shadow-[0_0_8px_#ffe083]'
                          : 'bg-outline'
                      }`}
                    />
                  </button>

                  {/* 1-Click Direct MP4 Short Download Button */}
                  <button
                    type="button"
                    data-testid="subheader-quick-download-mp4"
                    onClick={handleQuickDownloadShortMp4}
                    title="1-Click Download Rendered Short (.MP4)"
                    className="flex items-center gap-1.5 bg-secondary/20 hover:bg-secondary/30 text-secondary px-space-sm py-space-xs rounded-lg font-title-md text-body-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">download</span>
                    <span>Download .MP4</span>
                  </button>

                  {/* Render & Export Short CTA */}
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="relative group flex items-center gap-space-xs bg-primary hover:bg-primary-fixed-dim text-on-primary px-space-md py-space-xs rounded-lg transition-all duration-200 shadow-[0_0_24px_rgba(202,190,255,0.35)] hover:shadow-[0_0_32px_rgba(202,190,255,0.55)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span className="font-title-md text-title-md font-semibold text-on-primary">
                      Render &amp; Export Short
                    </span>
                    <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>

              {/* Studio Stage & Multi-Panels (Fixed Vertical Body) */}
              <div className="flex-1 flex overflow-hidden relative min-h-0">
                <LeftToolDock
                  activeTab={leftTab}
                  drawerOpen={drawerOpen}
                  onSelectRailTab={handleSelectRailTab}
                  onCloseDrawer={() => setDrawerOpen(false)}
                  onSplitAtPlayhead={handleSplitAtPlayhead}
                  project={project}
                  playheadTime={playheadTime}
                  selectedClipId={selectedClipId}
                  onAddClip={handleAddClip}
                  onUpdateClip={handleUpdateClip}
                  onApplyStylePreset={handleApplyStylePreset}
                  onUpdateCommentaryConfig={(patch) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      commentary: { ...prev.commentary, ...patch },
                    }))
                  }
                  onInsertFreezeFrame={handleInsertFreezeFrame}
                  onSaveProjectToServer={handleSaveProjectToServer}
                  onLoadProjectState={(loaded) => setHistory(createHistoryStack(loaded))}
                />

                <PreviewMonitor
                  project={project}
                  playheadTime={playheadTime}
                  isPlaying={isPlaying}
                  loopPlayback={loopPlayback}
                  selectedClipId={selectedClipId}
                  activeCaptionPresetId={activeCaptionPresetId}
                  activeTransition={activeTransition}
                  autoReframeActive={autoReframeActive}
                  onTogglePlay={() => setIsPlaying((p) => !p)}
                  onToggleLoop={() => setLoopPlayback((l) => !l)}
                  onSeek={(t) => setPlayheadTime(clamp(t, 0, project.duration))}
                  onStepFrames={(delta) =>
                    setPlayheadTime((t) =>
                      stepFrame(t, delta, project.fps, project.duration)
                    )
                  }
                  onChangeAspectRatio={(ratio) =>
                    commitProjectChange((prev) => ({ ...prev, aspectRatio: ratio }))
                  }
                  onUpdateClipTransform={handleUpsertKeyframeAtPlayhead}
                  onTriggerZoomHighlight={handleTriggerZoomHighlight}
                  onTriggerFreezeFrame={() =>
                    handleInsertFreezeFrame(
                      'Compute scaling inflection point — 4x retention spike',
                      'callout-box'
                    )
                  }
                  onChangeCommentaryLayout={(layoutMode) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      commentary: { ...prev.commentary, layoutMode },
                    }))
                  }
                  onOpenExportModal={() => setIsExportModalOpen(true)}
                  onQuickDownloadMp4={handleQuickDownloadShortMp4}
                />

                <RightInspector
                  activeTab={rightTab}
                  onChangeTab={setRightTab}
                  project={project}
                  playheadTime={playheadTime}
                  selectedClipId={selectedClipId}
                  activeCaptionPresetId={activeCaptionPresetId}
                  activeTransition={activeTransition}
                  onSelectCaptionPreset={handleSelectCaptionPreset}
                  onSelectTransition={setActiveTransition}
                  onUpdateClip={handleUpdateClip}
                  onApplyClipSpeed={handleApplyClipSpeed}
                  onUpsertKeyframeAtPlayhead={handleUpsertKeyframeAtPlayhead}
                  onTriggerZoomHighlight={handleTriggerZoomHighlight}
                  onUpdateTrackMixer={(trackId: TrackId, patch) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      mixer: {
                        ...prev.mixer,
                        [trackId]: { ...prev.mixer[trackId], ...patch },
                      },
                    }))
                  }
                  onUpdateRights={(patch) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      rights: { ...prev.rights, ...patch },
                    }))
                  }
                  onUpdateBaseDescription={(baseDescription) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      baseDescription,
                    }))
                  }
                  onChangeCommentaryLayout={(layoutMode) =>
                    commitProjectChange((prev) => ({
                      ...prev,
                      commentary: { ...prev.commentary, layoutMode },
                    }))
                  }
                />
              </div>

              {/* Bottom Multi-Track Timeline Studio (Docked) */}
              <MultiTrackTimeline
                project={project}
                playheadTime={playheadTime}
                selectedClipId={selectedClipId}
                snapEnabled={snapEnabled}
                pixelsPerSecond={pixelsPerSecond}
                canUndo={history.past.length > 0}
                canRedo={history.future.length > 0}
                onSelectClip={handleSelectClip}
                onSeek={(t) => setPlayheadTime(clamp(t, 0, project.duration))}
                onSplitAtPlayhead={handleSplitAtPlayhead}
                onDeleteSelected={handleDeleteSelected}
                onReorderSelected={handleReorderSelected}
                onTrimSelected={handleTrimSelected}
                onToggleSnap={() => setSnapEnabled((s) => !s)}
                onChangeZoom={setPixelsPerSecond}
                onUndo={() => setHistory((s) => undoHistory(s))}
                onRedo={() => setHistory((s) => redoHistory(s))}
                onToggleTrackMute={(trackId: TrackId) =>
                  commitProjectChange((prev) => ({
                    ...prev,
                    mixer: {
                      ...prev.mixer,
                      [trackId]: {
                        ...prev.mixer[trackId],
                        muted: !prev.mixer[trackId].muted,
                      },
                    },
                  }))
                }
                onToggleTrackSolo={(trackId: TrackId) =>
                  commitProjectChange((prev) => ({
                    ...prev,
                    mixer: {
                      ...prev.mixer,
                      [trackId]: {
                        ...prev.mixer[trackId],
                        solo: !prev.mixer[trackId].solo,
                      },
                    },
                  }))
                }
                onTriggerFreezeFrame={() =>
                  handleInsertFreezeFrame(
                    'Compute scaling inflection point — 4x retention spike',
                    'callout-box'
                  )
                }
              />
            </div>
          )}
        </main>
      </div>

      {/* Server-Side FFmpeg CRF 16 Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />
    </div>
  );
}
