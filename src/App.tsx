import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
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
import { createInitialProject } from './editor/defaultProject';
import { LeftToolDock, type LeftDockTab } from './components/LeftToolDock';
import { PreviewMonitor } from './components/PreviewMonitor';
import { RightInspector, type RightInspectorTab } from './components/RightInspector';
import { MultiTrackTimeline } from './components/MultiTrackTimeline';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [history, setHistory] = useState(() => createHistoryStack(createInitialProject()));
  const project = history.present;

  const [playheadTime, setPlayheadTime] = useState<number>(2.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loopPlayback, setLoopPlayback] = useState<boolean>(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip_v1_skate');
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(68);

  const [leftTab, setLeftTab] = useState<LeftDockTab>('media');
  const [rightTab, setRightTab] = useState<RightInspectorTab>('transform');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const commitProjectChange = useCallback((updater: (prev: ProjectState) => ProjectState) => {
    setHistory((prevStack) => {
      const nextState = updater(prevStack.present);
      return pushHistory(prevStack, nextState);
    });
  }, []);

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

  // Keyboard shortcuts (Space for play/pause, J/L frame step, Cmd/Ctrl+Z undo)
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

  const handleSelectClip = (clipId: string) => {
    setSelectedClipId(clipId);
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    if (clip.trackId === 'captions') {
      setLeftTab('captions');
    } else if (clip.trackId === 'voiceover') {
      setLeftTab('commentary');
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
      // If playhead isn't inside the selected clip, split at its midpoint so the button always works deterministically
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

  const handleUpdateClip = (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => {
    commitProjectChange((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? updater(c) : c)),
    }));
  };

  const handleApplyClipSpeed = (clipId: string, speed: number, preservePitch: boolean) => {
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
        const offset = clamp(playheadTime - c.startTime, 0.4, Math.max(0.4, c.duration - 0.4));
        return addZoomHighlightKeyframes(c, offset, 1.48, -10, -6);
      }),
    }));
  };

  const handleInsertFreezeFrame = (
    explanationText: string = 'Frame-accurate physics & technique callout',
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

  const handleSaveProjectToServer = async () => {
    await fetch('/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
  };

  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0C0E] text-[#F1F3F5]">
      {/* Top Bar Contract: [Brand title, one line] — [4 nav links, 1-2 word labels] — [1 primary action] */}
      <header className="h-12 px-5 bg-[#14161A] border-b border-[#23262F] flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Brand Title (single text element wordmark) */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setLeftTab('media');
            setRightTab('transform');
          }}
          className="text-base font-display font-bold tracking-tight text-[#F1F3F5] whitespace-nowrap shrink-0"
        >
          ClipForge
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav aria-label="Studio Workspace Navigation" className="hidden md:flex items-center gap-6 text-xs font-medium text-[#8E95A5]">
          <a
            href="#overlays"
            onClick={(e) => {
              e.preventDefault();
              setLeftTab('media');
              setRightTab('transform');
            }}
            className={`hover:text-[#F1F3F5] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              leftTab === 'media' && rightTab === 'transform' ? 'text-[#F1F3F5] underline' : ''
            }`}
          >
            Timeline Studio
          </a>
          <a
            href="#captions"
            onClick={(e) => {
              e.preventDefault();
              setLeftTab('captions');
            }}
            className={`hover:text-[#F1F3F5] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              leftTab === 'captions' ? 'text-[#F1F3F5] underline' : ''
            }`}
          >
            Caption Editor
          </a>
          <a
            href="#commentary"
            onClick={(e) => {
              e.preventDefault();
              setLeftTab('commentary');
            }}
            className={`hover:text-[#F1F3F5] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              leftTab === 'commentary' ? 'text-[#F1F3F5] underline' : ''
            }`}
          >
            Commentary Lab
          </a>
          <a
            href="#rights"
            onClick={(e) => {
              e.preventDefault();
              setRightTab('rights');
            }}
            className={`hover:text-[#F1F3F5] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              rightTab === 'rights' ? 'text-[#F1F3F5] underline' : ''
            }`}
          >
            Rights & Mixer
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E56B38] hover:bg-[#d45d2c] rounded transition-colors whitespace-nowrap shrink-0"
          >
            Export CRF 16
          </button>
        </div>
      </header>

      {/* Persistent Rights Check Warning Banner when source is someone else's content */}
      {rightsState.requiresWarningBanner && (
        <div
          data-testid="global-rights-warning-bar"
          className="px-5 py-1.5 bg-[#F59E0B]/15 border-b border-[#F59E0B]/40 flex items-center justify-between gap-4 text-xs shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
            <span className="font-medium text-[#FDE68A] truncate">
              Rights Check ({project.rights.sourceType.toUpperCase()}): External source detected — Attribution auto-appended to project description.
            </span>
            {project.rights.sourceUrl && (
              <span className="hidden lg:inline-flex items-center gap-1 font-mono text-[11px] text-[#F59E0B] truncate">
                <ExternalLink className="w-3 h-3" />
                {project.rights.sourceUrl}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setRightTab('rights')}
            className="text-[11px] font-medium text-[#F59E0B] hover:underline whitespace-nowrap shrink-0"
          >
            Configure Source & Credit
          </button>
        </div>
      )}

      {/* Main Studio Workbench (Upper 3-Pane Split + Lower Multi-Track Timeline) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Upper Workbench: Left Tool Dock + Center Frame Monitor + Right Context Inspector */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <LeftToolDock
            activeTab={leftTab}
            onChangeTab={setLeftTab}
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
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onToggleLoop={() => setLoopPlayback((l) => !l)}
            onSeek={(t) => setPlayheadTime(clamp(t, 0, project.duration))}
            onStepFrames={(delta) =>
              setPlayheadTime((t) => stepFrame(t, delta, project.fps, project.duration))
            }
            onChangeAspectRatio={(ratio) =>
              commitProjectChange((prev) => ({ ...prev, aspectRatio: ratio }))
            }
            onUpdateClipTransform={handleUpsertKeyframeAtPlayhead}
            onTriggerZoomHighlight={handleTriggerZoomHighlight}
            onTriggerFreezeFrame={() =>
              handleInsertFreezeFrame('Frame-by-frame trajectory breakdown', 'callout-box')
            }
            onChangeCommentaryLayout={(layoutMode) =>
              commitProjectChange((prev) => ({
                ...prev,
                commentary: { ...prev.commentary, layoutMode },
              }))
            }
          />

          <RightInspector
            activeTab={rightTab}
            onChangeTab={setRightTab}
            project={project}
            playheadTime={playheadTime}
            selectedClipId={selectedClipId}
            onUpdateClip={handleUpdateClip}
            onApplyClipSpeed={handleApplyClipSpeed}
            onUpsertKeyframeAtPlayhead={handleUpsertKeyframeAtPlayhead}
            onTriggerZoomHighlight={handleTriggerZoomHighlight}
            onUpdateTrackMixer={(trackId, patch) =>
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
          />
        </div>

        {/* Lower Multi-Track Timeline Editor */}
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
                [trackId]: { ...prev.mixer[trackId], muted: !prev.mixer[trackId].muted },
              },
            }))
          }
          onToggleTrackSolo={(trackId: TrackId) =>
            commitProjectChange((prev) => ({
              ...prev,
              mixer: {
                ...prev.mixer,
                [trackId]: { ...prev.mixer[trackId], solo: !prev.mixer[trackId].solo },
              },
            }))
          }
          onTriggerFreezeFrame={() =>
            handleInsertFreezeFrame('Key frame pause & telestration callout', 'callout-box')
          }
        />
      </main>

      {/* Server-Side FFmpeg CRF 16 Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />
    </div>
  );
}
