import {
  type ProjectState,
  type StylePreset,
  computeProjectRightsState,
} from './engine';

export interface RoyaltyFreeAudioAsset {
  id: string;
  name: string;
  category: 'music' | 'sfx';
  duration: number;
  bpm?: number;
  license: 'CC0 1.0 Public Domain' | 'ClipForge Studio Royalty-Free License';
  artist: string;
  synthPreset: 'analog-pulse' | 'lo-fi-tape' | 'sub-drone' | 'whoosh-transition' | 'camera-shutter' | 'vinyl-crackle' | 'riser-hit';
  description: string;
}

export interface CaptionVisualPreset {
  id: 'hormozi' | 'mr-beast' | 'ali-abdaal' | 'karaoke-glow';
  name: string;
  subtitle: string;
  previewText: string;
  previewTextClass: string;
  textColor: string;
  activeWordColor: string;
  bgColor: string;
  fontFamily: string;
  animation: 'word-pop' | 'karaoke-fill' | 'typewriter' | 'fade-up';
}

export interface DashboardProjectCard {
  id: string;
  title: string;
  viralityScore: number;
  scoreBadgeType: 'gold' | 'primary' | 'tertiary' | 'secondary';
  scoreIcon: string;
  timeRange: string;
  tagLabel: string;
  tagColorClass: string;
  durationFormatted: string;
  durationSec: number;
  thumbnailUrl: string;
  fallbackUrl: string;
  captionText: string;
  captionStyleClass: string;
  progressWidth: string;
  progressColorClass: string;
}

export const CAPTION_VISUAL_PRESETS: CaptionVisualPreset[] = [
  {
    id: 'hormozi',
    name: 'Hormozi',
    subtitle: 'Bold Yellow Pop',
    previewText: 'FUTURE LOOKS',
    previewTextClass: 'font-display text-body-sm text-secondary font-black',
    textColor: '#FFFFFF',
    activeWordColor: '#eec200',
    bgColor: 'rgba(8, 15, 23, 0.95)',
    fontFamily: 'Space Grotesk',
    animation: 'word-pop',
  },
  {
    id: 'mr-beast',
    name: 'Mr. Beast',
    subtitle: 'Kinetic Bounce 3D',
    previewText: 'INSANE IMPACT!',
    previewTextClass: 'font-display text-body-sm text-primary font-black',
    textColor: '#FFFFFF',
    activeWordColor: '#cabeff',
    bgColor: 'rgba(25, 32, 41, 0.92)',
    fontFamily: 'Space Grotesk',
    animation: 'word-pop',
  },
  {
    id: 'ali-abdaal',
    name: 'Ali Abdaal',
    subtitle: 'Minimalist Modern',
    previewText: 'clarity and focus.',
    previewTextClass: 'font-body-md text-body-sm text-on-surface',
    textColor: '#dce3f0',
    activeWordColor: '#ffe083',
    bgColor: 'rgba(13, 20, 29, 0.78)',
    fontFamily: 'Inter',
    animation: 'fade-up',
  },
  {
    id: 'karaoke-glow',
    name: 'Karaoke Glow',
    subtitle: 'Word-by-Word Radiance',
    previewText: 'sing the pulse',
    previewTextClass: 'font-display text-body-sm text-tertiary font-bold',
    textColor: '#ffdcc4',
    activeWordColor: '#ffb780',
    bgColor: 'rgba(8, 15, 23, 0.88)',
    fontFamily: 'Space Grotesk',
    animation: 'karaoke-fill',
  },
];

export const DASHBOARD_PROJECT_CARDS: DashboardProjectCard[] = [
  {
    id: 'proj_card_1',
    title: 'Sam Altman on AGI Horizon & Timeline',
    viralityScore: 99,
    scoreBadgeType: 'gold',
    scoreIcon: 'local_fire_department',
    timeRange: '01:42:10 — 01:42:58',
    tagLabel: 'Viral Peak',
    tagColorClass: 'text-secondary',
    durationFormatted: '00:48',
    durationSec: 15,
    thumbnailUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
    fallbackUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
    captionText: 'THIS IS WHY AI CHANGES EVERYTHING',
    captionStyleClass: 'bg-secondary text-on-secondary transform -rotate-1',
    progressWidth: 'w-full',
    progressColorClass: 'bg-secondary',
  },
  {
    id: 'proj_card_2',
    title: 'How neural nets scale exponentially',
    viralityScore: 92,
    scoreBadgeType: 'primary',
    scoreIcon: 'bolt',
    timeRange: '00:14:20 — 00:14:55',
    tagLabel: 'High Hook',
    tagColorClass: 'text-primary',
    durationFormatted: '00:35',
    durationSec: 15,
    thumbnailUrl: '/src/assets/images/clip_synth_studio_1794941709891.jpg',
    fallbackUrl: '/src/assets/images/clip_synth_studio_1794941709891.jpg',
    captionText: 'THE SECRET FORMULA',
    captionStyleClass: 'bg-surface-container-lowest/90 text-primary transform rotate-1',
    progressWidth: 'w-[88%]',
    progressColorClass: 'bg-primary-container',
  },
  {
    id: 'proj_card_3',
    title: 'Hilarious podcast outtake on robot hands',
    viralityScore: 88,
    scoreBadgeType: 'tertiary',
    scoreIcon: 'sentiment_satisfied',
    timeRange: '02:08:44 — 02:09:36',
    tagLabel: 'Humor Spike',
    tagColorClass: 'text-tertiary',
    durationFormatted: '00:52',
    durationSec: 15,
    thumbnailUrl: '/src/assets/images/clip_skate_aerial_1794941709829.jpg',
    fallbackUrl: '/src/assets/images/clip_skate_aerial_1794941709829.jpg',
    captionText: 'UNEXPECTED REACTION!',
    captionStyleClass: 'bg-tertiary-container text-on-tertiary-container transform -rotate-2',
    progressWidth: 'w-[75%]',
    progressColorClass: 'bg-tertiary',
  },
  {
    id: 'proj_card_4',
    title: 'The #1 Trap for Modern Tech Founders',
    viralityScore: 95,
    scoreBadgeType: 'secondary',
    scoreIcon: 'trending_up',
    timeRange: '02:45:10 — 02:45:51',
    tagLabel: 'Story Arc',
    tagColorClass: 'text-secondary',
    durationFormatted: '00:41',
    durationSec: 15,
    thumbnailUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
    fallbackUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
    captionText: "DON'T MAKE THIS MISTAKE",
    captionStyleClass: 'bg-error text-on-error transform rotate-1',
    progressWidth: 'w-[94%]',
    progressColorClass: 'bg-secondary',
  },
];

export const ROYALTY_FREE_LIBRARY: RoyaltyFreeAudioAsset[] = [
  {
    id: 'rf_music_1',
    name: 'Dark Phonk Beats — Horizon Drift (CC0)',
    category: 'music',
    duration: 15.0,
    bpm: 128,
    license: 'CC0 1.0 Public Domain',
    artist: 'ClipForge Audio Commons',
    synthPreset: 'analog-pulse',
    description: 'Auto-ducked under voice (-16dB). Cleared CC0 dark phonk bassline for viral shorts.',
  },
  {
    id: 'rf_music_2',
    name: 'Cinematic Motivational Strings',
    category: 'music',
    duration: 15.0,
    bpm: 92,
    license: 'CC0 1.0 Public Domain',
    artist: 'Studio Commons Collective',
    synthPreset: 'lo-fi-tape',
    description: 'Warm crescendo build ideal for storytelling and transformative commentary essays.',
  },
  {
    id: 'rf_music_3',
    name: 'Deep Neural Synthwave Pulse',
    category: 'music',
    duration: 15.0,
    bpm: 110,
    license: 'ClipForge Studio Royalty-Free License',
    artist: 'ClipForge Sound Lab',
    synthPreset: 'sub-drone',
    description: 'Deep arpeggiated analog pulse for high-retention keynote breakdowns.',
  },
  {
    id: 'rf_sfx_1',
    name: 'Whoosh_02.wav (Kinetic Whip Pan)',
    category: 'sfx',
    duration: 1.5,
    license: 'CC0 1.0 Public Domain',
    artist: 'Foley Vault CC0',
    synthPreset: 'whoosh-transition',
    description: 'Punchy transition whoosh synced to caption pop and zoom highlights.',
  },
  {
    id: 'rf_sfx_2',
    name: 'Impact_Boom.wav (35mm Freeze Hit)',
    category: 'sfx',
    duration: 1.8,
    license: 'CC0 1.0 Public Domain',
    artist: 'Foley Vault CC0',
    synthPreset: 'camera-shutter',
    description: 'Crisp sub-impact & shutter snap for freeze-frame commentary callouts.',
  },
  {
    id: 'rf_sfx_3',
    name: 'Sub_Drop.wav (Bass Transient)',
    category: 'sfx',
    duration: 1.8,
    license: 'ClipForge Studio Royalty-Free License',
    artist: 'ClipForge Sound Lab',
    synthPreset: 'riser-hit',
    description: 'Deep transient hit for emphasizing key moments on the timeline.',
  },
];

export const BUILT_IN_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'preset_hormozi_pop',
    name: 'Hormozi Bold Yellow Pop',
    category: 'built-in',
    colorSettings: {
      brightness: 4,
      contrast: 18,
      saturation: 12,
      filter: 'kodak-2383',
    },
    captionStyle: {
      fontFamily: 'Space Grotesk',
      fontSize: 48,
      textColor: '#FFFFFF',
      activeWordColor: '#eec200',
      bgColor: 'rgba(8, 15, 23, 0.95)',
      animation: 'word-pop',
      positionY: 74,
    },
    commentaryLayout: 'standard',
  },
  {
    id: 'preset_beast_3d',
    name: 'Mr. Beast Kinetic Bounce 3D',
    category: 'built-in',
    colorSettings: {
      brightness: 2,
      contrast: 22,
      saturation: 18,
      filter: 'cyber-teal',
    },
    captionStyle: {
      fontFamily: 'Space Grotesk',
      fontSize: 48,
      textColor: '#FFFFFF',
      activeWordColor: '#cabeff',
      bgColor: 'rgba(25, 32, 41, 0.92)',
      animation: 'word-pop',
      positionY: 74,
    },
    commentaryLayout: 'pip-Bhd',
  },
  {
    id: 'preset_dual_podcaster',
    name: 'Dual Podcaster Split Commentary',
    category: 'built-in',
    colorSettings: {
      brightness: 0,
      contrast: 16,
      saturation: 8,
      filter: 'cinema-warm',
    },
    captionStyle: {
      fontFamily: 'Inter',
      fontSize: 40,
      textColor: '#dce3f0',
      activeWordColor: '#ffe083',
      bgColor: 'rgba(13, 20, 29, 0.85)',
      animation: 'karaoke-fill',
      positionY: 76,
    },
    commentaryLayout: 'split-vertical',
  },
];

export function createInitialProject(): ProjectState {
  const baseDescription =
    'Sam Altman breaks down the tipping point of compute scaling and the AGI Horizon Moment. Includes transformative voiceover commentary, AI speaker lock keyframes, and synced kinetic subtitles.';

  const rights = {
    sourceType: 'fair-use' as const,
    sourceUrl: 'https://youtube.com/live/stream?v=agi-summit-horizon-2025-mainstage',
    creatorCredit: 'Source: lex_fridman_ep418_raw_4k.mov — Transformative Commentary by Creator Studio',
    licenseNotes: 'Music & SFX: Dark Phonk Beats — Horizon Drift & Impact_Boom.wav (CC0 1.0 Public Domain)',
    fairUseRationale:
      'Transformative commentary edit featuring custom voiceover analysis, keyframe zoom reframing, freeze-frame annotations, and dynamic word-by-word captions.',
  };

  const rightsComputed = computeProjectRightsState(baseDescription, rights);

  return {
    id: 'cf_agi_horizon_01',
    title: '#01 — AGI Horizon Moment',
    fps: 30,
    aspectRatio: '9:16',
    duration: 15,
    baseDescription,
    fullDescription: rightsComputed.fullDescription,
    rights,
    commentary: {
      layoutMode: 'standard',
      pipCorner: 'top-left',
      pipScale: 0.3,
      webcamActive: true,
      webcamAvatarUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
      creatorName: 'Creator Studio',
      brandTagline: 'CLIPFORGE AUTONOMOUS ENGINE',
      brandPrimaryColor: '#cabeff',
      brandAccentColor: '#ffe083',
      splitRatio: 0.5,
    },
    mixer: {
      video: { gainDb: 0, muted: false, solo: false },
      overlay: { gainDb: 0, muted: false, solo: false },
      captions: { gainDb: 0, muted: false, solo: false },
      voiceover: { gainDb: 2.0, muted: false, solo: false },
      sfx: { gainDb: -3.5, muted: false, solo: false },
      music: { gainDb: -16.0, muted: false, solo: false },
    },
    clips: [
      // Track V1: Video Footage (Lex_Sam_Clip_01.mp4 & Part 2)
      {
        id: 'clip_v1_main',
        trackId: 'video',
        name: 'Lex_Sam_Clip_01.mp4',
        startTime: 0,
        duration: 9.0,
        baseDuration: 9.0,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        thumbnailUrl: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
        colorSettings: {
          brightness: 4,
          contrast: 18,
          saturation: 12,
          filter: 'cyber-teal',
        },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [
          { id: 'kf_v1_0', offsetSec: 0, x: 0, y: 0, scale: 1.0, rotation: 0, easing: 'linear' },
          { id: 'kf_v1_1', offsetSec: 4.5, x: -3, y: -2, scale: 1.18, rotation: 0, easing: 'punch' },
          { id: 'kf_v1_2', offsetSec: 8.5, x: 0, y: 0, scale: 1.05, rotation: 0, easing: 'ease-in-out' },
        ],
        waveformSeed: 101,
      },
      {
        id: 'clip_v1_climax',
        trackId: 'video',
        name: 'AGI_Compute_Scaling_02.mp4',
        startTime: 9.0,
        duration: 6.0,
        baseDuration: 6.0,
        sourceOffset: 0.5,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        thumbnailUrl: '/src/assets/images/clip_synth_studio_1794941709891.jpg',
        colorSettings: {
          brightness: 4,
          contrast: 16,
          saturation: 10,
          filter: 'kodak-2383',
        },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [
          { id: 'kf_v2_0', offsetSec: 0, x: 0, y: 0, scale: 1.05, rotation: 0, easing: 'linear' },
          { id: 'kf_v2_1', offsetSec: 3.0, x: 4, y: -3, scale: 1.26, rotation: 0, easing: 'punch' },
        ],
        waveformSeed: 202,
      },

      // Track T1: Captions (4 Segmented blocks matching code_a5f5c0ca.html)
      {
        id: 'clip_cap_1',
        trackId: 'captions',
        name: 'THE FUTURE',
        startTime: 0.4,
        duration: 2.4,
        baseDuration: 2.4,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        captionStyle: {
          fontFamily: 'Space Grotesk',
          fontSize: 48,
          textColor: '#FFFFFF',
          activeWordColor: '#eec200',
          bgColor: 'rgba(8, 15, 23, 0.95)',
          animation: 'word-pop',
          positionY: 74,
        },
        captions: [
          { id: 'cw_1', word: 'THE', startOffset: 0.0, endOffset: 0.8 },
          { id: 'cw_2', word: 'FUTURE', startOffset: 0.8, endOffset: 1.6, highlight: true },
          { id: 'cw_3', word: 'OF', startOffset: 1.6, endOffset: 2.4 },
        ],
      },
      {
        id: 'clip_cap_2',
        trackId: 'captions',
        name: 'INTELLIGENCE [HOT]',
        startTime: 3.0,
        duration: 4.5,
        baseDuration: 4.5,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        captionStyle: {
          fontFamily: 'Space Grotesk',
          fontSize: 48,
          textColor: '#FFFFFF',
          activeWordColor: '#eec200',
          bgColor: 'rgba(8, 15, 23, 0.95)',
          animation: 'word-pop',
          positionY: 74,
        },
        captions: [
          { id: 'cw_4', word: 'THE', startOffset: 0.0, endOffset: 0.7 },
          { id: 'cw_5', word: 'FUTURE', startOffset: 0.7, endOffset: 1.4 },
          { id: 'cw_6', word: 'OF', startOffset: 1.4, endOffset: 2.0 },
          { id: 'cw_7', word: 'INTELLIGENCE', startOffset: 2.0, endOffset: 3.4, highlight: true },
          { id: 'cw_8', word: 'IS', startOffset: 3.4, endOffset: 3.9 },
          { id: 'cw_9', word: 'HERE', startOffset: 3.9, endOffset: 4.5 },
        ],
      },
      {
        id: 'clip_cap_3',
        trackId: 'captions',
        name: 'IS HERE TODAY',
        startTime: 7.8,
        duration: 3.2,
        baseDuration: 3.2,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        captionStyle: {
          fontFamily: 'Space Grotesk',
          fontSize: 48,
          textColor: '#FFFFFF',
          activeWordColor: '#eec200',
          bgColor: 'rgba(8, 15, 23, 0.95)',
          animation: 'word-pop',
          positionY: 74,
        },
        captions: [
          { id: 'cw_10', word: 'IS', startOffset: 0.0, endOffset: 0.9 },
          { id: 'cw_11', word: 'HERE', startOffset: 0.9, endOffset: 2.0, highlight: true },
          { id: 'cw_12', word: 'TODAY', startOffset: 2.0, endOffset: 3.2, highlight: true },
        ],
      },
      {
        id: 'clip_cap_4',
        trackId: 'captions',
        name: 'ACCELERATING NOW',
        startTime: 11.3,
        duration: 3.5,
        baseDuration: 3.5,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        captionStyle: {
          fontFamily: 'Space Grotesk',
          fontSize: 48,
          textColor: '#FFFFFF',
          activeWordColor: '#eec200',
          bgColor: 'rgba(8, 15, 23, 0.95)',
          animation: 'karaoke-fill',
          positionY: 74,
        },
        captions: [
          { id: 'cw_13', word: 'EXPONENTIAL', startOffset: 0.0, endOffset: 1.8, highlight: true },
          { id: 'cw_14', word: 'MOMENT', startOffset: 1.8, endOffset: 3.5, highlight: true },
        ],
      },

      // Track V2: Overlays
      {
        id: 'clip_ov_focus',
        trackId: 'overlay',
        name: 'Synthesis Complete Sticker',
        startTime: 9.2,
        duration: 4.0,
        baseDuration: 4.0,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [
          { id: 'kf_ov_0', offsetSec: 0, x: 0, y: 0, scale: 1, rotation: 0, easing: 'punch' },
        ],
        overlay: {
          kind: 'arrow',
          text: 'Key Horizon Shift',
          subtext: 'Speaker #1 · Commentary Note',
          color: '#cabeff',
          accentColor: '#ffe083',
          x: 24,
          y: 18,
          targetX: 52,
          targetY: 44,
          scale: 1,
          rotation: 0,
          shapeType: 'callout-box',
        },
      },

      // Track A1: Sound FX (3 blocks matching code_a5f5c0ca.html)
      {
        id: 'clip_sfx_1',
        trackId: 'sfx',
        name: 'Whoosh_02.wav',
        startTime: 2.2,
        duration: 2.2,
        baseDuration: 2.2,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: -3.5,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        licenseTag: 'CC0 1.0 Public Domain',
        waveformSeed: 401,
      },
      {
        id: 'clip_sfx_2',
        trackId: 'sfx',
        name: 'Impact_Boom.wav',
        startTime: 5.0,
        duration: 2.8,
        baseDuration: 2.8,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: -2.0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        licenseTag: 'CC0 1.0 Public Domain',
        waveformSeed: 402,
      },
      {
        id: 'clip_sfx_3',
        trackId: 'sfx',
        name: 'Sub_Drop.wav',
        startTime: 10.5,
        duration: 2.5,
        baseDuration: 2.5,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: -3.5,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        licenseTag: 'CC0 1.0 Public Domain',
        waveformSeed: 403,
      },

      // Track A2: Background Music Track (Phonk Beats)
      {
        id: 'clip_mus_master',
        trackId: 'music',
        name: 'Dark Phonk Beats — Horizon Drift (Auto Ducked under voice)',
        startTime: 0,
        duration: 15.0,
        baseDuration: 15.0,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: -16.0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        licenseTag: 'CC0 1.0 Public Domain',
        waveformSeed: 606,
      },

      // Track A3: Voiceover Track
      {
        id: 'clip_vo_master',
        trackId: 'voiceover',
        name: 'VO_Creator_Commentary_Take1.wav',
        startTime: 0.5,
        duration: 13.5,
        baseDuration: 13.5,
        sourceOffset: 0,
        speed: 1.0,
        preservePitch: true,
        gainDb: 2.0,
        muted: false,
        colorSettings: { brightness: 0, contrast: 0, saturation: 0, filter: 'none' },
        crop: { top: 0, right: 0, bottom: 0, left: 0 },
        keyframes: [],
        licenseTag: 'Original Studio Voiceover',
        waveformSeed: 303,
      },
    ],
  };
}
