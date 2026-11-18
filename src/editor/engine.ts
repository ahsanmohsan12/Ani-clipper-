export type TrackId = 'video' | 'overlay' | 'captions' | 'voiceover' | 'sfx' | 'music';

export type RightsSourceType = 'own' | 'licensed' | 'permission' | 'fair-use';

export type OverlayKind = 'text' | 'sticker' | 'shape' | 'arrow' | 'zoom-highlight' | 'title-card';

export type CommentaryLayoutMode = 'standard' | 'pip-Bhd' | 'split-vertical' | 'split-horizontal';

export interface CropRect {
  top: number;    // 0 to 40 (%)
  right: number;  // 0 to 40 (%)
  bottom: number; // 0 to 40 (%)
  left: number;   // 0 to 40 (%)
}

export interface TransformKeyframe {
  id: string;
  offsetSec: number; // relative to clip start (0..duration)
  x: number;         // -100 to 100 (%)
  y: number;         // -100 to 100 (%)
  scale: number;     // 0.5 to 3.0
  rotation: number;  // -180 to 180 deg
  easing: 'linear' | 'ease-in-out' | 'punch';
}

export interface ColorSettings {
  brightness: number; // -50 to 50 (0 default)
  contrast: number;   // -50 to 50 (0 default)
  saturation: number; // -100 to 100 (0 default)
  filter: 'none' | 'cinema-warm' | 'kodak-2383' | 'noir-contrast' | 'cyber-teal' | 'vintage-fade';
}

export interface CaptionWord {
  id: string;
  word: string;
  startOffset: number; // relative to clip start
  endOffset: number;   // relative to clip start
  highlight?: boolean;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  activeWordColor: string;
  bgColor: string;
  animation: 'word-pop' | 'karaoke-fill' | 'typewriter' | 'fade-up';
  positionY: number; // 10 to 90 (%)
}

export interface OverlayDetail {
  kind: OverlayKind;
  text: string;
  subtext?: string;
  color: string;
  accentColor?: string;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  targetX?: number; // for arrows (0 to 100%)
  targetY?: number; // for arrows (0 to 100%)
  scale: number;
  rotation: number;
  stickerSymbol?: string;
  shapeType?: 'rectangle' | 'circle' | 'callout-box' | 'highlight-ring';
}

export interface TimelineClip {
  id: string;
  trackId: TrackId;
  name: string;
  startTime: number;     // timeline start in seconds
  duration: number;      // current duration on timeline in seconds
  baseDuration: number;  // duration at 1.0x speed
  sourceOffset: number;  // in-point offset in source media
  speed: number;         // 0.5 to 2.0
  preservePitch: boolean;
  gainDb: number;        // -36 to +12 dB
  muted: boolean;
  isFreezeFrame?: boolean;
  freezeFrameTime?: number;
  thumbnailUrl?: string;
  colorSettings: ColorSettings;
  crop: CropRect;
  keyframes: TransformKeyframe[];
  overlay?: OverlayDetail;
  captions?: CaptionWord[];
  captionStyle?: CaptionStyle;
  licenseTag?: string;   // e.g. 'CC0 1.0 Public Domain' or 'ClipForge Studio License'
  waveformSeed?: number;
}

export interface TrackMixerState {
  video: { gainDb: number; muted: boolean; solo: boolean };
  overlay: { gainDb: number; muted: boolean; solo: boolean };
  captions: { gainDb: number; muted: boolean; solo: boolean };
  voiceover: { gainDb: number; muted: boolean; solo: boolean };
  sfx: { gainDb: number; muted: boolean; solo: boolean };
  music: { gainDb: number; muted: boolean; solo: boolean };
}

export interface CommentaryConfig {
  layoutMode: CommentaryLayoutMode;
  pipCorner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  pipScale: number; // 0.2 to 0.45
  webcamActive: boolean;
  webcamAvatarUrl: string;
  creatorName: string;
  brandTagline: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  splitRatio: number; // 0.3 to 0.7 (default 0.5)
}

export interface RightsMetadata {
  sourceType: RightsSourceType;
  sourceUrl: string;
  creatorCredit: string;
  licenseNotes: string;
  fairUseRationale: string;
}

export interface StylePreset {
  id: string;
  name: string;
  category: 'built-in' | 'custom';
  colorSettings: ColorSettings;
  captionStyle: CaptionStyle;
  commentaryLayout: CommentaryLayoutMode;
}

export interface ProjectState {
  id: string;
  title: string;
  fps: number; // 24, 30, 60
  aspectRatio: '16:9' | '9:16' | '1:1';
  duration: number;
  baseDescription: string;
  fullDescription: string;
  rights: RightsMetadata;
  commentary: CommentaryConfig;
  mixer: TrackMixerState;
  clips: TimelineClip[];
}

export interface HistoryStack {
  past: ProjectState[];
  present: ProjectState;
  future: ProjectState[];
}

export interface FfmpegRenderSpec {
  command: string;
  videoCodec: 'libx264';
  crf: 16;
  preset: 'slow';
  audioCodec: 'aac';
  audioBitrate: '256k';
  sampleRate: 48000;
  resolution: string;
  fps: number;
  filterComplex: string[];
  attributionAppended: boolean;
  rightsCompliant: boolean;
  warnings: string[];
  estimatedSizeMb: number;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function roundToMs(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

/**
 * Formats seconds into SMPTE frame-accurate timecode: HH:MM:SS:FF
 */
export function formatTimecode(seconds: number, fps: number = 30): string {
  const safeSec = Math.max(0, seconds);
  const totalFrames = Math.round(safeSec * fps);
  const frames = totalFrames % fps;
  const totalWholeSeconds = Math.floor(totalFrames / fps);
  const secs = totalWholeSeconds % 60;
  const mins = Math.floor(totalWholeSeconds / 60) % 60;
  const hours = Math.floor(totalWholeSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

/**
 * Steps playhead forward or backward by exact frame count
 */
export function stepFrame(
  currentSec: number,
  deltaFrames: number,
  fps: number,
  maxDuration: number
): number {
  const currentFrame = Math.round(currentSec * fps);
  const targetFrame = clamp(currentFrame + deltaFrames, 0, Math.round(maxDuration * fps));
  return roundToMs(targetFrame / fps);
}

/**
 * Computes all magnetic snap points (0, playhead, and clip boundaries)
 */
export function getSnapPoints(clips: TimelineClip[], playheadSec: number, excludeClipId?: string): number[] {
  const points = new Set<number>([0, roundToMs(playheadSec)]);
  for (const clip of clips) {
    if (clip.id === excludeClipId) continue;
    points.add(roundToMs(clip.startTime));
    points.add(roundToMs(clip.startTime + clip.duration));
  }
  return Array.from(points).sort((a, b) => a - b);
}

export function snapTime(
  targetSec: number,
  snapEnabled: boolean,
  snapPoints: number[],
  thresholdSec: number = 0.25
): { time: number; snapped: boolean; snapTarget: number | null } {
  if (!snapEnabled) {
    return { time: roundToMs(Math.max(0, targetSec)), snapped: false, snapTarget: null };
  }
  let closestPoint: number | null = null;
  let minDistance = thresholdSec;
  for (const pt of snapPoints) {
    const dist = Math.abs(pt - targetSec);
    if (dist <= minDistance) {
      minDistance = dist;
      closestPoint = pt;
    }
  }
  if (closestPoint !== null) {
    return { time: roundToMs(closestPoint), snapped: true, snapTarget: closestPoint };
  }
  return { time: roundToMs(Math.max(0, targetSec)), snapped: false, snapTarget: null };
}

/**
 * Splits a clip at `splitTime` (timeline seconds) into two independent clips.
 * Returns unchanged array if `splitTime` is not strictly inside the clip (with >= 0.2s margin).
 */
export function splitClipAtTime(
  clips: TimelineClip[],
  clipId: string,
  splitTime: number
): { clips: TimelineClip[]; leftClipId: string | null; rightClipId: string | null } {
  const target = clips.find((c) => c.id === clipId);
  if (!target) {
    return { clips, leftClipId: null, rightClipId: null };
  }

  const minSegmentDuration = 0.2;
  const relSplit = roundToMs(splitTime - target.startTime);
  if (relSplit < minSegmentDuration || target.duration - relSplit < minSegmentDuration) {
    return { clips, leftClipId: null, rightClipId: null };
  }

  const leftDuration = relSplit;
  const rightDuration = roundToMs(target.duration - relSplit);
  const ratioLeft = leftDuration / target.duration;

  const leftId = `${target.id}_L`;
  const rightId = `${target.id}_R`;

  // Split keyframes proportionally or by offset
  const leftKeyframes: TransformKeyframe[] = target.keyframes
    .filter((kf) => kf.offsetSec <= leftDuration)
    .map((kf) => ({ ...kf, id: `${kf.id}_L` }));

  const rightKeyframes: TransformKeyframe[] = target.keyframes
    .filter((kf) => kf.offsetSec >= leftDuration)
    .map((kf) => ({
      ...kf,
      id: `${kf.id}_R`,
      offsetSec: roundToMs(kf.offsetSec - leftDuration),
    }));

  if (rightKeyframes.length === 0) {
    const interp = interpolateTransformAtTime(target, splitTime);
    rightKeyframes.push({
      id: `kf_${rightId}_0`,
      offsetSec: 0,
      x: interp.x,
      y: interp.y,
      scale: interp.scale,
      rotation: interp.rotation,
      easing: 'linear',
    });
  }

  // Split word captions if present
  let leftCaptions: CaptionWord[] | undefined;
  let rightCaptions: CaptionWord[] | undefined;
  if (target.captions) {
    leftCaptions = target.captions
      .filter((w) => w.startOffset < leftDuration)
      .map((w) => ({
        ...w,
        endOffset: Math.min(leftDuration, w.endOffset),
      }));
    rightCaptions = target.captions
      .filter((w) => w.endOffset > leftDuration)
      .map((w) => ({
        ...w,
        id: `${w.id}_R`,
        startOffset: roundToMs(Math.max(0, w.startOffset - leftDuration)),
        endOffset: roundToMs(w.endOffset - leftDuration),
      }));
  }

  const leftClip: TimelineClip = {
    ...structuredClone(target),
    id: leftId,
    name: `${target.name} (A)`,
    duration: leftDuration,
    baseDuration: roundToMs(target.baseDuration * ratioLeft),
    keyframes: leftKeyframes,
    captions: leftCaptions,
  };

  const rightClip: TimelineClip = {
    ...structuredClone(target),
    id: rightId,
    name: `${target.name} (B)`,
    startTime: roundToMs(target.startTime + leftDuration),
    duration: rightDuration,
    baseDuration: roundToMs(target.baseDuration * (1 - ratioLeft)),
    sourceOffset: roundToMs(target.sourceOffset + leftDuration * target.speed),
    keyframes: rightKeyframes,
    captions: rightCaptions,
  };

  const nextClips: TimelineClip[] = [];
  for (const c of clips) {
    if (c.id === clipId) {
      nextClips.push(leftClip, rightClip);
    } else {
      nextClips.push(c);
    }
  }

  return { clips: nextClips, leftClipId: leftId, rightClipId: rightId };
}

/**
 * Deletes a clip. When `ripple` is true, all clips on the same track that start at or after
 * the deleted clip's startTime shift earlier by `deletedClip.duration`.
 */
export function deleteClip(
  clips: TimelineClip[],
  clipId: string,
  ripple: boolean
): TimelineClip[] {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return clips;

  const remaining = clips.filter((c) => c.id !== clipId);
  if (!ripple) {
    return remaining;
  }

  const shiftSec = target.duration;
  return remaining.map((c) => {
    if (c.trackId === target.trackId && c.startTime >= target.startTime) {
      return {
        ...c,
        startTime: roundToMs(Math.max(0, c.startTime - shiftSec)),
      };
    }
    return c;
  });
}

/**
 * Reorders a clip left ('prev') or right ('next') relative to its immediate neighbor on the same track.
 */
export function reorderClip(
  clips: TimelineClip[],
  clipId: string,
  direction: 'prev' | 'next'
): TimelineClip[] {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return clips;

  const trackClips = clips
    .filter((c) => c.trackId === target.trackId)
    .sort((a, b) => a.startTime - b.startTime);

  const idx = trackClips.findIndex((c) => c.id === clipId);
  const swapIdx = direction === 'prev' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= trackClips.length) {
    return clips;
  }

  const firstIdx = Math.min(idx, swapIdx);
  const secondIdx = Math.max(idx, swapIdx);
  const firstClip = trackClips[firstIdx];
  const secondClip = trackClips[secondIdx];

  const gapBetween = Math.max(0, secondClip.startTime - (firstClip.startTime + firstClip.duration));
  const anchorStart = firstClip.startTime;

  const updatedSecond: TimelineClip = {
    ...secondClip,
    startTime: roundToMs(anchorStart),
  };
  const updatedFirst: TimelineClip = {
    ...firstClip,
    startTime: roundToMs(anchorStart + secondClip.duration + gapBetween),
  };

  return clips.map((c) => {
    if (c.id === updatedFirst.id) return updatedFirst;
    if (c.id === updatedSecond.id) return updatedSecond;
    return c;
  });
}

/**
 * Trims either the start ('in') or end ('out') of a clip.
 */
export function trimClip(
  clips: TimelineClip[],
  clipId: string,
  edge: 'in' | 'out',
  newEdgeTime: number,
  snapEnabled: boolean = false
): TimelineClip[] {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return clips;

  const snapPts = getSnapPoints(clips, newEdgeTime, clipId);
  const { time: snappedTime } = snapTime(newEdgeTime, snapEnabled, snapPts, 0.2);
  const minDur = 0.25;

  if (edge === 'in') {
    const currentEnd = target.startTime + target.duration;
    const clampedStart = clamp(snappedTime, 0, currentEnd - minDur);
    const delta = roundToMs(clampedStart - target.startTime);
    const newDuration = roundToMs(currentEnd - clampedStart);
    return clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            startTime: roundToMs(clampedStart),
            duration: newDuration,
            baseDuration: roundToMs(newDuration * c.speed),
            sourceOffset: roundToMs(Math.max(0, c.sourceOffset + delta * c.speed)),
          }
        : c
    );
  } else {
    const clampedEnd = Math.max(target.startTime + minDur, snappedTime);
    const newDuration = roundToMs(clampedEnd - target.startTime);
    return clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            duration: newDuration,
            baseDuration: roundToMs(newDuration * c.speed),
          }
        : c
    );
  }
}

/**
 * Applies speed control per segment (0.5x to 2.0x) and audio pitch correction.
 * Adjusts timeline duration inversely (`baseDuration / speed`).
 */
export function applyClipSpeed(
  clips: TimelineClip[],
  clipId: string,
  newSpeed: number,
  preservePitch: boolean
): TimelineClip[] {
  const clampedSpeed = roundToMs(clamp(newSpeed, 0.5, 2.0));
  return clips.map((c) => {
    if (c.id !== clipId) return c;
    const oldDuration = c.duration;
    const newDuration = roundToMs(c.baseDuration / clampedSpeed);
    const scaleRatio = oldDuration > 0 ? newDuration / oldDuration : 1;

    return {
      ...c,
      speed: clampedSpeed,
      preservePitch,
      duration: newDuration,
      keyframes: c.keyframes.map((kf) => ({
        ...kf,
        offsetSec: roundToMs(clamp(kf.offsetSec * scaleRatio, 0, newDuration)),
      })),
      captions: c.captions?.map((w) => ({
        ...w,
        startOffset: roundToMs(w.startOffset * scaleRatio),
        endOffset: roundToMs(w.endOffset * scaleRatio),
      })),
    };
  });
}

/**
 * Interpolates a clip's keyframe transform (x, y, scale, rotation) at a given timeline playhead time.
 */
export function interpolateTransformAtTime(
  clip: TimelineClip,
  playheadTime: number
): { x: number; y: number; scale: number; rotation: number } {
  const kfs = [...clip.keyframes].sort((a, b) => a.offsetSec - b.offsetSec);
  if (kfs.length === 0) {
    return { x: 0, y: 0, scale: 1, rotation: 0 };
  }

  const localSec = clamp(playheadTime - clip.startTime, 0, clip.duration);

  if (localSec <= kfs[0].offsetSec) {
    return {
      x: kfs[0].x,
      y: kfs[0].y,
      scale: kfs[0].scale,
      rotation: kfs[0].rotation,
    };
  }

  const last = kfs[kfs.length - 1];
  if (localSec >= last.offsetSec) {
    return {
      x: last.x,
      y: last.y,
      scale: last.scale,
      rotation: last.rotation,
    };
  }

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (localSec >= a.offsetSec && localSec <= b.offsetSec) {
      const span = b.offsetSec - a.offsetSec;
      const rawT = span > 0 ? (localSec - a.offsetSec) / span : 0;
      let t = rawT;
      if (b.easing === 'ease-in-out') {
        t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;
      } else if (b.easing === 'punch') {
        t = 1 - Math.pow(1 - rawT, 3);
      }

      return {
        x: Math.round((a.x + (b.x - a.x) * t) * 100) / 100,
        y: Math.round((a.y + (b.y - a.y) * t) * 100) / 100,
        scale: Math.round((a.scale + (b.scale - a.scale) * t) * 1000) / 1000,
        rotation: Math.round((a.rotation + (b.rotation - a.rotation) * t) * 100) / 100,
      };
    }
  }

  return { x: 0, y: 0, scale: 1, rotation: 0 };
}

/**
 * Adds or updates a keyframe on a clip at `offsetSec`.
 */
export function upsertKeyframe(
  clip: TimelineClip,
  offsetSec: number,
  patch: Partial<Pick<TransformKeyframe, 'x' | 'y' | 'scale' | 'rotation' | 'easing'>>
): TimelineClip {
  const safeOffset = roundToMs(clamp(offsetSec, 0, clip.duration));
  const existingIdx = clip.keyframes.findIndex(
    (k) => Math.abs(k.offsetSec - safeOffset) < 0.08
  );

  if (existingIdx >= 0) {
    const updated = [...clip.keyframes];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...patch,
    };
    return { ...clip, keyframes: updated };
  }

  const currentInterp = interpolateTransformAtTime(clip, clip.startTime + safeOffset);
  const newKf: TransformKeyframe = {
    id: `kf_${Date.now()}_${Math.round(safeOffset * 100)}`,
    offsetSec: safeOffset,
    x: patch.x ?? currentInterp.x,
    y: patch.y ?? currentInterp.y,
    scale: patch.scale ?? currentInterp.scale,
    rotation: patch.rotation ?? currentInterp.rotation,
    easing: patch.easing ?? 'ease-in-out',
  };

  return {
    ...clip,
    keyframes: [...clip.keyframes, newKf].sort((a, b) => a.offsetSec - b.offsetSec),
  };
}

/**
 * Generates a 3-keyframe Zoom-In Highlight sequence on a key moment inside a clip.
 */
export function addZoomHighlightKeyframes(
  clip: TimelineClip,
  focusOffsetSec: number,
  targetScale: number = 1.45,
  panX: number = -8,
  panY: number = -5
): TimelineClip {
  const center = clamp(focusOffsetSec, 0.3, Math.max(0.3, clip.duration - 0.3));
  const entryOffset = roundToMs(Math.max(0, center - 0.35));
  const peakOffset = roundToMs(center);
  const exitOffset = roundToMs(Math.min(clip.duration, center + 0.85));

  let next = upsertKeyframe(clip, entryOffset, { x: 0, y: 0, scale: 1, rotation: 0, easing: 'ease-in-out' });
  next = upsertKeyframe(next, peakOffset, {
    x: panX,
    y: panY,
    scale: targetScale,
    rotation: 0,
    easing: 'punch',
  });
  next = upsertKeyframe(next, exitOffset, { x: 0, y: 0, scale: 1, rotation: 0, easing: 'ease-in-out' });
  return next;
}

/**
 * Transformative Commentary Tool:
 * Inserts a 2.5s Freeze-Frame segment on the video track at `playheadTime` + an synchronized
 * Annotation Callout on the overlay track (`V2 Overlay`) with explanation text and shape/arrow.
 */
export function insertFreezeFrameWithAnnotation(
  project: ProjectState,
  playheadTime: number,
  explanationText: string,
  shapeType: 'callout-box' | 'highlight-ring' | 'rectangle' = 'callout-box'
): ProjectState {
  const freezeDuration = 2.5;
  const activeVideoClip =
    project.clips.find(
      (c) =>
        c.trackId === 'video' &&
        playheadTime >= c.startTime &&
        playheadTime <= c.startTime + c.duration
    ) || project.clips.find((c) => c.trackId === 'video');

  const insertTime = activeVideoClip
    ? clamp(playheadTime, activeVideoClip.startTime, activeVideoClip.startTime + activeVideoClip.duration)
    : roundToMs(playheadTime);

  let workingClips = [...project.clips];

  // If strictly inside a video clip, split it first so the freeze frame sits cleanly between A and B
  if (
    activeVideoClip &&
    insertTime > activeVideoClip.startTime + 0.2 &&
    insertTime < activeVideoClip.startTime + activeVideoClip.duration - 0.2
  ) {
    const splitResult = splitClipAtTime(workingClips, activeVideoClip.id, insertTime);
    workingClips = splitResult.clips;
  }

  // Shift any video clip starting at or after insertTime forward by freezeDuration
  workingClips = workingClips.map((c) => {
    if (c.trackId === 'video' && c.startTime >= insertTime) {
      return {
        ...c,
        startTime: roundToMs(c.startTime + freezeDuration),
      };
    }
    return c;
  });

  const freezeClipId = `freeze_${Date.now()}`;
  const freezeVideoClip: TimelineClip = {
    id: freezeClipId,
    trackId: 'video',
    name: `Freeze Frame @ ${formatTimecode(insertTime, project.fps)}`,
    startTime: roundToMs(insertTime),
    duration: freezeDuration,
    baseDuration: freezeDuration,
    sourceOffset: activeVideoClip ? activeVideoClip.sourceOffset : 0,
    speed: 1.0,
    preservePitch: true,
    gainDb: -60,
    muted: true,
    isFreezeFrame: true,
    freezeFrameTime: roundToMs(insertTime),
    thumbnailUrl: activeVideoClip?.thumbnailUrl,
    colorSettings: activeVideoClip
      ? { ...activeVideoClip.colorSettings, contrast: Math.min(50, activeVideoClip.colorSettings.contrast + 10) }
      : { brightness: 0, contrast: 10, saturation: -20, filter: 'none' },
    crop: activeVideoClip ? { ...activeVideoClip.crop } : { top: 0, right: 0, bottom: 0, left: 0 },
    keyframes: [
      { id: `kf_${freezeClipId}_0`, offsetSec: 0, x: 0, y: 0, scale: 1.0, rotation: 0, easing: 'linear' },
      { id: `kf_${freezeClipId}_1`, offsetSec: 0.4, x: -4, y: -3, scale: 1.18, rotation: 0, easing: 'punch' },
    ],
  };

  const annotationOverlayClip: TimelineClip = {
    id: `annot_${Date.now()}`,
    trackId: 'overlay',
    name: `Commentary Breakdown: ${explanationText.slice(0, 22)}`,
    startTime: roundToMs(insertTime),
    duration: freezeDuration,
    baseDuration: freezeDuration,
    sourceOffset: 0,
    speed: 1.0,
    preservePitch: true,
    gainDb: 0,
    muted: false,
    colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    keyframes: [
      { id: `kf_annot_0`, offsetSec: 0, x: 0, y: 0, scale: 1, rotation: 0, easing: 'punch' },
    ],
    overlay: {
      kind: 'arrow',
      text: explanationText || 'Notice the frame-level technique here',
      subtext: 'TRANSFORMATIVE COMMENTARY BREAKDOWN',
      color: '#E56B38',
      accentColor: '#F59E0B',
      x: 24,
      y: 26,
      targetX: 54,
      targetY: 48,
      scale: 1,
      rotation: 0,
      shapeType,
    },
  };

  const nextClips = [...workingClips, freezeVideoClip, annotationOverlayClip];
  const maxEnd = nextClips.reduce((acc, c) => Math.max(acc, c.startTime + c.duration), project.duration);

  return {
    ...project,
    duration: roundToMs(Math.max(project.duration, maxEnd)),
    clips: nextClips,
  };
}

/**
 * Evaluates Rights Check status, warning banner requirement, and auto-generated attribution block.
 */
export function computeProjectRightsState(
  baseDescription: string,
  rights: RightsMetadata
): {
  requiresWarningBanner: boolean;
  warningMessage: string | null;
  attributionBlock: string;
  fullDescription: string;
} {
  const requiresWarningBanner = rights.sourceType !== 'own';

  let warningMessage: string | null = null;
  if (rights.sourceType === 'fair-use') {
    warningMessage =
      'Third-Party Content (Fair-Use Commentary): Ensure substantive voiceover, critique, or visual annotation is present to qualify as transformative use under 17 U.S.C. § 107.';
  } else if (rights.sourceType === 'licensed') {
    warningMessage =
      'Third-Party Content (Licensed): Verify license scope covers commercial distribution and keep source attribution intact in exported metadata.';
  } else if (rights.sourceType === 'permission') {
    warningMessage =
      'Third-Party Content (Written Permission): Creator credit and original source URL are automatically embedded into the project description.';
  }

  const labelMap: Record<RightsSourceType, string> = {
    own: 'Original Studio Production (100% Own Content)',
    licensed: 'Licensed Media Asset',
    permission: 'Used with Creator Permission',
    'fair-use': 'Fair-Use Transformative Commentary (17 U.S.C. § 107)',
  };

  const lines: string[] = [
    '---',
    'RIGHTS & ATTRIBUTION MANIFEST',
    `Rights Basis: ${labelMap[rights.sourceType]}`,
  ];

  if (rights.creatorCredit.trim()) {
    lines.push(`Source Credit: ${rights.creatorCredit.trim()}`);
  }
  if (rights.sourceUrl.trim()) {
    lines.push(`Original Source URL: ${rights.sourceUrl.trim()}`);
  }
  if (rights.licenseNotes.trim()) {
    lines.push(`License / Audio Credits: ${rights.licenseNotes.trim()}`);
  }
  if (rights.sourceType === 'fair-use' && rights.fairUseRationale.trim()) {
    lines.push(`Transformative Commentary Note: ${rights.fairUseRationale.trim()}`);
  }

  const attributionBlock = lines.join('\n');
  const cleanBase = baseDescription.trim();
  const fullDescription = cleanBase ? `${cleanBase}\n\n${attributionBlock}` : attributionBlock;

  return {
    requiresWarningBanner,
    warningMessage,
    attributionBlock,
    fullDescription,
  };
}

/**
 * Compiles the project's multi-track timeline, color grading, keyframes, speed/pitch, and audio mixer
 * into a deterministic server-side FFmpeg render specification (CRF 16, AAC 256k).
 */
export function buildFfmpegRenderSpec(project: ProjectState): FfmpegRenderSpec {
  const resMap: Record<ProjectState['aspectRatio'], string> = {
    '16:9': '1920x1080',
    '9:16': '1080x1920',
    '1:1': '1080x1080',
  };
  const resolution = resMap[project.aspectRatio];
  const filterComplex: string[] = [];

  const videoClips = project.clips
    .filter((c) => c.trackId === 'video')
    .sort((a, b) => a.startTime - b.startTime);

  videoClips.forEach((clip, idx) => {
    const ptsFactor = (1 / clip.speed).toFixed(4);
    const b = (clip.colorSettings.brightness / 100).toFixed(2);
    const c = (1 + clip.colorSettings.contrast / 50).toFixed(2);
    const s = (1 + clip.colorSettings.saturation / 100).toFixed(2);

    const cropW = `iw*${((100 - clip.crop.left - clip.crop.right) / 100).toFixed(2)}`;
    const cropH = `ih*${((100 - clip.crop.top - clip.crop.bottom) / 100).toFixed(2)}`;
    const cropX = `iw*${(clip.crop.left / 100).toFixed(2)}`;
    const cropY = `ih*${(clip.crop.top / 100).toFixed(2)}`;

    filterComplex.push(
      `[${idx}:v]trim=start=${clip.sourceOffset}:duration=${clip.baseDuration},setpts=${ptsFactor}*(PTS-STARTPTS),crop=${cropW}:${cropH}:${cropX}:${cropY},eq=brightness=${b}:contrast=${c}:saturation=${s},scale=${resolution.replace('x', ':')}[vseg${idx}]`
    );

    if (!clip.muted) {
      const pitchFilter = clip.preservePitch
        ? `rubberband=tempo=${clip.speed.toFixed(2)}:pitch=1.0`
        : `asetrate=48000*${clip.speed.toFixed(2)},aresample=48000`;
      const totalGain = clip.gainDb + project.mixer.video.gainDb;
      filterComplex.push(
        `[${idx}:a]atrim=start=${clip.sourceOffset}:duration=${clip.baseDuration},${pitchFilter},volume=${totalGain}dB[aseg${idx}]`
      );
    }
  });

  if (project.commentary.layoutMode === 'split-vertical') {
    filterComplex.push(
      `[vconcat][commentary_cam]hstack=inputs=2:shortest=1[vlayout]`
    );
  } else if (project.commentary.layoutMode === 'pip-Bhd' && project.commentary.webcamActive) {
    const scalePct = Math.round(project.commentary.pipScale * 100);
    filterComplex.push(
      `[commentary_cam]scale=iw*0.${scalePct}:-1[pip];[vconcat][pip]overlay=W-w-32:H-h-32[vlayout]`
    );
  }

  const audioTrackIds: TrackId[] = ['voiceover', 'sfx', 'music'];
  audioTrackIds.forEach((tId) => {
    const trackClips = project.clips.filter((c) => c.trackId === tId && !c.muted);
    const mixerTrack = project.mixer[tId];
    if (trackClips.length > 0 && !mixerTrack.muted) {
      filterComplex.push(
        `[a_${tId}]volume=${mixerTrack.gainDb}dB,adelay=${Math.round(trackClips[0].startTime * 1000)}|${Math.round(trackClips[0].startTime * 1000)}[amix_${tId}]`
      );
    }
  });

  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);
  const warnings: string[] = [];
  if (rightsState.requiresWarningBanner && !project.rights.sourceUrl.trim()) {
    warnings.push('Third-party content selected without a Source URL. Add the original URL before publishing.');
  }
  if (rightsState.requiresWarningBanner && !project.rights.creatorCredit.trim()) {
    warnings.push('Third-party content selected without Creator Credit.');
  }

  const filterGraphStr = filterComplex.join('; ');
  const command = [
    `ffmpeg -y`,
    `-i "source_timeline_bundle.mov"`,
    `-filter_complex "${filterGraphStr}"`,
    `-r ${project.fps}`,
    `-c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p`,
    `-c:a aac -b:a 256k -ar 48000`,
    `-metadata title="${project.title.replace(/"/g, '\\"')}"`,
    `-metadata comment="${project.rights.creatorCredit.replace(/"/g, '\\"')}"`,
    `"clipforge_render_${project.id}_crf16.mp4"`,
  ].join(' \\\n  ');

  const estimatedSizeMb = Math.max(4.2, Math.round(project.duration * 2.85 * 10) / 10);

  return {
    command,
    videoCodec: 'libx264',
    crf: 16,
    preset: 'slow',
    audioCodec: 'aac',
    audioBitrate: '256k',
    sampleRate: 48000,
    resolution,
    fps: project.fps,
    filterComplex,
    attributionAppended: rightsState.fullDescription.includes('RIGHTS & ATTRIBUTION MANIFEST'),
    rightsCompliant: warnings.length === 0,
    warnings,
    estimatedSizeMb,
  };
}

/**
 * Undo / Redo History helpers
 */
export function createHistoryStack(initial: ProjectState): HistoryStack {
  return {
    past: [],
    present: structuredClone(initial),
    future: [],
  };
}

export function pushHistory(stack: HistoryStack, nextState: ProjectState): HistoryStack {
  const rightsSynced = computeProjectRightsState(nextState.baseDescription, nextState.rights);
  const normalizedNext: ProjectState = {
    ...structuredClone(nextState),
    fullDescription: rightsSynced.fullDescription,
  };
  return {
    past: [...stack.past.slice(-29), stack.present],
    present: normalizedNext,
    future: [],
  };
}

export function undoHistory(stack: HistoryStack): HistoryStack {
  if (stack.past.length === 0) return stack;
  const previous = stack.past[stack.past.length - 1];
  const newPast = stack.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [stack.present, ...stack.future],
  };
}

export function redoHistory(stack: HistoryStack): HistoryStack {
  if (stack.future.length === 0) return stack;
  const next = stack.future[0];
  const newFuture = stack.future.slice(1);
  return {
    past: [...stack.past, stack.present],
    present: next,
    future: newFuture,
  };
}
