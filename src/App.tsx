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
import { triggerMp4ShortDownload } from './editor/exportHelper';
import { studioAudio } from './editor/audioSynth';

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [mobileEditorPane, setMobileEditorPane] = useState<'stage' | 'inspector' | 'tools'>(
    'stage'
  );

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
    try {
      localStorage.setItem('clipforge_saved_project_v1', JSON.stringify(project));
    } catch {
      // Ignore storage quota errors
    }
    try {
      await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
    } catch {
      // Offline / static host fallback already saved in localStorage
    }
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
    triggerMp4ShortDownload({
      title: project.title,
      aspectRatio: project.aspectRatio,
      imageUrl:
        primaryClip?.thumbnailUrl ||
        '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
    });
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
    <div className="bg-surface text-on-surface font-body-md text-body-md min-h-screen overflow-x-hidden">
      {/* Mobile Sidebar Backdrop Scrim */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar (Fixed on Desktop lg:w-64, Slide-over Drawer on Mobile) */}
      <aside
        aria-label="ClipForge Primary Sidebar"
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col justify-between py-space-md select-none transition-transform duration-200 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-space-md">
          <div className="px-space-md flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveScreen('editor');
                setIsMobileSidebarOpen(false);
              }}
              className="cursor-pointer focus:outline-none"
            >
              <ClipForgeLogoMark />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation menu"
              className="lg:hidden p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
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
                  onClick={() => {
                    setActiveScreen(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
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

      {/* Main Content Container offset by w-64 sidebar on desktop */}
      <div className="pl-0 lg:pl-64 pb-14 lg:pb-0">
        {/* Fixed Top Header (`h-14 sm:h-16 bg-surface/85 backdrop-blur-xl` matching code_a5f5c0ca.html) */}
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 lg:h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.2)] z-40 flex items-center justify-between px-3 sm:px-space-md md:px-margin-desktop select-none">
          {/* Mobile Left Logo + Hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              data-testid="mobile-menu-trigger"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('editor')}
              className="cursor-pointer focus:outline-none"
            >
              <ClipForgeLogoMark />
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-space-xs">
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

          <div className="flex items-center gap-2 sm:gap-space-md">
            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-high">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase">
                AI Engine Online
              </span>
            </div>

            <div className="px-2.5 sm:px-space-sm py-1 sm:py-space-xs rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[10px] sm:text-label-md font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">bolt</span>
              <span>Pro Trial</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </header>

        {/* Active View Area */}
        <main className="w-full pt-14 lg:pt-16 bg-surface">
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
            <div className="flex flex-col w-full h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)] overflow-hidden select-none bg-surface-container-lowest">
              {/* Top Subheader Studio Bar (Responsive on mobile + exact match to code_a5f5c0ca.html on desktop) */}
              <div className="min-h-12 lg:h-14 py-1.5 lg:py-0 bg-surface-container-low px-2.5 sm:px-space-md md:px-margin-desktop flex items-center justify-between flex-shrink-0 z-30 shadow-md gap-2">
                <div className="flex items-center gap-2 sm:gap-space-md min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-space-sm min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveScreen('dashboard')}
                      className="p-1 sm:p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
                      title="Back to Dashboard"
                    >
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                        arrow_back
                      </span>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
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
                            className="bg-surface-container-lowest px-2 py-0.5 rounded font-headline-md text-body-sm sm:text-title-md text-on-surface focus:outline-none ring-1 ring-primary w-40 sm:w-auto"
                          />
                        ) : (
                          <>
                            <span className="font-headline-md text-body-sm sm:text-title-md text-on-surface font-semibold truncate lg:whitespace-nowrap">
                              {project.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditingTitle(true)}
                              aria-label="Edit project title"
                              className="material-symbols-outlined text-[15px] sm:text-[16px] text-on-surface-variant cursor-pointer hover:text-primary shrink-0"
                            >
                              edit
                            </button>
                          </>
                        )}
                      </div>
                      <span className="hidden sm:inline font-label-sm text-label-sm text-outline truncate">
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
                <div className="flex items-center gap-1.5 sm:gap-space-sm shrink-0">
                  {/* Rights Check Warning Indicator when source is external */}
                  {rightsState.requiresWarningBanner && (
                    <button
                      type="button"
                      data-testid="global-rights-warning-bar"
                      onClick={() => {
                        setRightTab('reframe');
                        setMobileEditorPane('inspector');
                      }}
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
                    className="hidden md:flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface px-space-sm py-space-xs rounded-lg transition-colors cursor-pointer"
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
                    className="flex items-center gap-1 bg-secondary/20 hover:bg-secondary/30 text-secondary px-2.5 sm:px-space-sm py-1.5 sm:py-space-xs rounded-lg font-title-md text-[12px] sm:text-body-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[17px]">
                      download
                    </span>
                    <span className="hidden sm:inline">Download .MP4</span>
                    <span className="inline sm:hidden">.MP4</span>
                  </button>

                  {/* Render & Export Short CTA */}
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="relative group flex items-center gap-1 sm:gap-space-xs bg-primary hover:bg-primary-fixed-dim text-on-primary px-2.5 sm:px-space-md py-1.5 sm:py-space-xs rounded-lg transition-all duration-200 shadow-[0_0_24px_rgba(202,190,255,0.35)] hover:shadow-[0_0_32px_rgba(202,190,255,0.55)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                      bolt
                    </span>
                    <span className="font-title-md text-[12px] sm:text-title-md font-semibold text-on-primary">
                      <span className="hidden sm:inline">Render &amp; Export Short</span>
                      <span className="inline sm:hidden">Export</span>
                    </span>
                    <span className="hidden sm:inline material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>

              {/* Mobile Studio Workspace Switcher (< lg only) */}
              <div
                data-testid="mobile-editor-pane-switcher"
                className="lg:hidden flex items-center bg-surface-container p-1 gap-1 px-2 border-b border-outline-variant/20 shrink-0"
              >
                {(
                  [
                    { id: 'stage', label: 'Stage & Timeline', icon: 'smart_display' },
                    { id: 'inspector', label: 'Captions & Mix', icon: 'tune' },
                    { id: 'tools', label: 'Tools & Mic', icon: 'mic' },
                  ] as const
                ).map((pane) => {
                  const active = mobileEditorPane === pane.id;
                  return (
                    <button
                      key={pane.id}
                      type="button"
                      onClick={() => {
                        setMobileEditorPane(pane.id);
                        if (pane.id === 'tools' && !drawerOpen) {
                          setLeftTab('commentary');
                          setDrawerOpen(true);
                        }
                      }}
                      className={`flex-1 min-w-0 py-1.5 px-1.5 rounded-lg font-title-md text-[11px] sm:text-[12px] flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        active
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] shrink-0">
                        {pane.icon}
                      </span>
                      <span className="truncate">{pane.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Studio Stage & Multi-Panels (Fixed Vertical Body) */}
              <div className="flex-1 flex overflow-hidden relative min-h-0">
                {/* Left Tool Dock: Always visible on Desktop lg:, visible on Mobile when 'tools' selected */}
                <div
                  className={`${
                    mobileEditorPane === 'tools' ? 'flex w-full' : 'hidden'
                  } lg:flex lg:w-auto h-full`}
                >
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
                </div>

                {/* Center Preview Monitor: Always visible on Desktop lg:, visible on Mobile when 'stage' selected */}
                <div
                  className={`${
                    mobileEditorPane === 'stage' ? 'flex' : 'hidden'
                  } lg:flex flex-1 min-w-0 h-full`}
                >
                  <PreviewMonitor
                    project={project}
                    playheadTime={playheadTime}
                    isPlaying={isPlaying}
                    loopPlayback={loopPlayback}
                    selectedClipId={selectedClipId}
                    activeCaptionPresetId={activeCaptionPresetId}
                    activeTransition={activeTransition}
                    autoReframeActive={autoReframeActive}
                    onTogglePlay={() => {
                      setIsPlaying((p) => {
                        if (!p) studioAudio.triggerTransportCue('play');
                        return !p;
                      });
                    }}
                    onToggleLoop={() => setLoopPlayback((l) => !l)}
                    onSeek={(t) => setPlayheadTime(clamp(t, 0, project.duration))}
                    onStepFrames={(delta) => {
                      studioAudio.triggerTransportCue('step');
                      setPlayheadTime((t) =>
                        stepFrame(t, delta, project.fps, project.duration)
                      );
                    }}
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
                </div>

                {/* Right Inspector: Always visible on Desktop lg:, visible on Mobile when 'inspector' selected */}
                <div
                  className={`${
                    mobileEditorPane === 'inspector' ? 'flex w-full' : 'hidden'
                  } lg:flex lg:w-auto h-full`}
                >
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
              </div>

              {/* Bottom Multi-Track Timeline Studio (Docked on Desktop & Mobile Stage View) */}
              <div
                className={`${
                  mobileEditorPane === 'stage' ? 'block' : 'hidden'
                } lg:block shrink-0`}
              >
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
            </div>
          )}
        </main>
      </div>

      {/* Fixed Bottom Mobile Navigation Bar (< lg only) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        data-testid="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant/30 z-40 flex items-center justify-around px-2 select-none"
      >
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label-sm text-[10px] font-semibold mt-0.5">
                {item.id === 'editor'
                  ? 'Editor'
                  : item.id === 'mobile'
                  ? 'Companion'
                  : item.id === 'landing'
                  ? 'Landing'
                  : 'Dashboard'}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Server-Side FFmpeg CRF 16 Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />
    </div>
  );
}
