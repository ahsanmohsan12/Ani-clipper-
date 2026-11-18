import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimecode,
  stepFrame,
  splitClipAtTime,
  deleteClip,
  reorderClip,
  trimClip,
  applyClipSpeed,
  interpolateTransformAtTime,
  addZoomHighlightKeyframes,
  insertFreezeFrameWithAnnotation,
  computeProjectRightsState,
  buildFfmpegRenderSpec,
  createHistoryStack,
  pushHistory,
  undoHistory,
  redoHistory,
  formatSrtTimestamp,
  buildSrtFromProject,
  type TimelineClip,
  type ProjectState,
} from './engine';

function makeSampleClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id: 'clip_1',
    trackId: 'video',
    name: 'Tokyo Skate Flip',
    startTime: 0,
    duration: 8,
    baseDuration: 8,
    sourceOffset: 0,
    speed: 1.0,
    preservePitch: true,
    gainDb: 0,
    muted: false,
    colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    keyframes: [
      { id: 'kf_0', offsetSec: 0, x: 0, y: 0, scale: 1.0, rotation: 0, easing: 'linear' },
      { id: 'kf_1', offsetSec: 8, x: 20, y: -10, scale: 1.5, rotation: 10, easing: 'linear' },
    ],
    captions: [
      { id: 'w1', word: 'Watch', startOffset: 0.5, endOffset: 2.0 },
      { id: 'w2', word: 'the', startOffset: 2.0, endOffset: 3.5 },
      { id: 'w3', word: 'landing', startOffset: 4.5, endOffset: 6.5, highlight: true },
    ],
    ...overrides,
  };
}

function makeSampleProject(): ProjectState {
  const c1 = makeSampleClip({ id: 'v1', startTime: 0, duration: 6, baseDuration: 6 });
  const c2 = makeSampleClip({ id: 'v2', name: 'Synth Patch Breakdown', startTime: 6, duration: 6, baseDuration: 6 });
  return {
    id: 'proj_test',
    title: 'Skate Physics & Synth Sound Design Breakdown',
    fps: 30,
    aspectRatio: '16:9',
    duration: 12,
    baseDescription: 'Frame-by-frame breakdown of angular momentum and modular synthesis.',
    fullDescription: '',
    rights: {
      sourceType: 'fair-use',
      sourceUrl: 'https://example.org/original-skate-reel-4k',
      creatorCredit: '@TokyoStreetArchive (CC-BY / Fair-Use Critique)',
      licenseNotes: 'BGM: CC0 Public Domain Analog Tape Loop',
      fairUseRationale: 'Transformative educational physics & sound design commentary with freeze-frame telestration.',
    },
    commentary: {
      layoutMode: 'pip-Bhd',
      pipCorner: 'bottom-right',
      pipScale: 0.28,
      webcamActive: true,
      webcamAvatarUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
      creatorName: 'Alex Rivera',
      brandTagline: 'FRAME THEORY STUDIO',
      brandPrimaryColor: '#E56B38',
      brandAccentColor: '#F59E0B',
      splitRatio: 0.5,
    },
    mixer: {
      video: { gainDb: -2, muted: false, solo: false },
      overlay: { gainDb: 0, muted: false, solo: false },
      captions: { gainDb: 0, muted: false, solo: false },
      voiceover: { gainDb: 3, muted: false, solo: false },
      sfx: { gainDb: -4, muted: false, solo: false },
      music: { gainDb: -12, muted: false, solo: false },
    },
    clips: [c1, c2],
  };
}

test('SMPTE timecode formatting and frame stepping are frame-accurate', () => {
  assert.equal(formatTimecode(0, 30), '00:00:00:00');
  assert.equal(formatTimecode(1.5, 30), '00:00:01:15');
  assert.equal(formatTimecode(65.1, 30), '00:01:05:03');

  const nextFrame = stepFrame(1.0, 1, 30, 10);
  assert.equal(formatTimecode(nextFrame, 30), '00:00:01:01');

  const prevFrame = stepFrame(1.0, -1, 30, 10);
  assert.equal(formatTimecode(prevFrame, 30), '00:00:00:29');
});

test('splitClipAtTime splits clip into two contiguous clips with preserved captions and keyframes', () => {
  const clip = makeSampleClip();
  const res = splitClipAtTime([clip], 'clip_1', 4.0);
  assert.equal(res.clips.length, 2);
  assert.equal(res.leftClipId, 'clip_1_L');
  assert.equal(res.rightClipId, 'clip_1_R');

  const [left, right] = res.clips;
  assert.equal(left.startTime, 0);
  assert.equal(left.duration, 4);
  assert.equal(right.startTime, 4);
  assert.equal(right.duration, 4);
  assert.equal(right.sourceOffset, 4);
  assert.equal(left.captions?.length, 2);
  assert.equal(right.captions?.length, 1);
  assert.equal(right.captions?.[0].word, 'landing');
  assert.equal(right.captions?.[0].startOffset, 0.5);
});

test('deleteClip supports both standard delete and ripple delete', () => {
  const proj = makeSampleProject();
  const nonRipple = deleteClip(proj.clips, 'v1', false);
  assert.equal(nonRipple.length, 1);
  assert.equal(nonRipple[0].startTime, 6);

  const rippled = deleteClip(proj.clips, 'v1', true);
  assert.equal(rippled.length, 1);
  assert.equal(rippled[0].startTime, 0);
});

test('reorderClip swaps adjacent clips on the same track and updates startTime', () => {
  const proj = makeSampleProject();
  const reordered = reorderClip(proj.clips, 'v2', 'prev');
  const v2 = reordered.find((c) => c.id === 'v2')!;
  const v1 = reordered.find((c) => c.id === 'v1')!;
  assert.equal(v2.startTime, 0);
  assert.equal(v1.startTime, 6);
});

test('trimClip trims in/out points with magnetic snap', () => {
  const proj = makeSampleProject();
  const trimmedOut = trimClip(proj.clips, 'v1', 'out', 4.5, false);
  assert.equal(trimmedOut.find((c) => c.id === 'v1')!.duration, 4.5);

  const trimmedIn = trimClip(proj.clips, 'v1', 'in', 1.0, false);
  const v1 = trimmedIn.find((c) => c.id === 'v1')!;
  assert.equal(v1.startTime, 1.0);
  assert.equal(v1.duration, 5.0);
  assert.equal(v1.sourceOffset, 1.0);
});

test('applyClipSpeed scales duration between 0.5x and 2.0x and updates pitch flag', () => {
  const clip = makeSampleClip({ duration: 8, baseDuration: 8 });
  const doubleSpeed = applyClipSpeed([clip], 'clip_1', 2.0, true)[0];
  assert.equal(doubleSpeed.speed, 2.0);
  assert.equal(doubleSpeed.duration, 4.0);
  assert.equal(doubleSpeed.preservePitch, true);

  const halfSpeed = applyClipSpeed([clip], 'clip_1', 0.5, false)[0];
  assert.equal(halfSpeed.speed, 0.5);
  assert.equal(halfSpeed.duration, 16.0);
  assert.equal(halfSpeed.preservePitch, false);
});

test('interpolateTransformAtTime & addZoomHighlightKeyframes compute accurate keyframe transforms', () => {
  const clip = makeSampleClip();
  const mid = interpolateTransformAtTime(clip, 4.0);
  assert.equal(mid.x, 10);
  assert.equal(mid.y, -5);
  assert.equal(mid.scale, 1.25);
  assert.equal(mid.rotation, 5);

  const highlighted = addZoomHighlightKeyframes(clip, 3.0, 1.6, -12, -8);
  const atPeak = interpolateTransformAtTime(highlighted, 3.0);
  assert.equal(atPeak.scale, 1.6);
  assert.equal(atPeak.x, -12);
});

test('insertFreezeFrameWithAnnotation splits video, inserts freeze clip, and adds overlay annotation', () => {
  const proj = makeSampleProject();
  const updated = insertFreezeFrameWithAnnotation(proj, 3.0, 'Key ankle rotation angle', 'callout-box');
  const freezeClip = updated.clips.find((c) => c.isFreezeFrame);
  const overlayClip = updated.clips.find((c) => c.trackId === 'overlay');
  assert.ok(freezeClip, 'Freeze clip should be inserted');
  assert.ok(overlayClip, 'Annotation overlay clip should be inserted');
  assert.equal(freezeClip.startTime, 3.0);
  assert.equal(freezeClip.duration, 2.5);
  assert.equal(overlayClip.overlay?.text, 'Key ankle rotation angle');
});

test('computeProjectRightsState flags third-party content and auto-builds attribution manifest', () => {
  const proj = makeSampleProject();
  const fairUseState = computeProjectRightsState(proj.baseDescription, proj.rights);
  assert.equal(fairUseState.requiresWarningBanner, true);
  assert.ok(fairUseState.warningMessage?.includes('Fair-Use Commentary'));
  assert.ok(fairUseState.fullDescription.includes('@TokyoStreetArchive'));
  assert.ok(fairUseState.fullDescription.includes('https://example.org/original-skate-reel-4k'));

  const ownState = computeProjectRightsState(proj.baseDescription, {
    ...proj.rights,
    sourceType: 'own',
  });
  assert.equal(ownState.requiresWarningBanner, false);
  assert.equal(ownState.warningMessage, null);
});

test('buildFfmpegRenderSpec outputs CRF 16 and AAC 256k pipeline with rubberband pitch correction', () => {
  const proj = makeSampleProject();
  const spec = buildFfmpegRenderSpec(proj);
  assert.equal(spec.crf, 16);
  assert.equal(spec.audioCodec, 'aac');
  assert.equal(spec.audioBitrate, '256k');
  assert.ok(spec.command.includes('-crf 16'));
  assert.ok(spec.command.includes('-b:a 256k'));
  assert.ok(spec.command.includes('rubberband=tempo='));
  assert.equal(spec.rightsCompliant, true);
});

test('history stack supports undo and redo accurately', () => {
  const proj = makeSampleProject();
  let stack = createHistoryStack(proj);
  const modified = { ...proj, title: 'Updated Title' };
  stack = pushHistory(stack, modified);
  assert.equal(stack.present.title, 'Updated Title');

  stack = undoHistory(stack);
  assert.equal(stack.present.title, proj.title);

  stack = redoHistory(stack);
  assert.equal(stack.present.title, 'Updated Title');
});

test('buildSrtFromProject formats valid SRT subtitle blocks from timeline captions', () => {
  assert.equal(formatSrtTimestamp(1.5), '00:00:01,500');
  const proj = makeSampleProject();
  const srt = buildSrtFromProject(proj);
  assert.ok(srt.includes('00:00:00,500 --> 00:00:06,500'));
  assert.ok(srt.includes('Watch the landing'));
});

