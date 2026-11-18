import React, { useState } from 'react';
import {
  DASHBOARD_PROJECT_CARDS,
  type DashboardProjectCard,
} from '../editor/defaultProject';

export const ClipForgeLogoMark: React.FC = () => (
  <div className="flex items-center gap-space-xs select-none">
    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_rgba(124,92,255,0.4)]">
      <span className="material-symbols-outlined text-on-primary text-[20px]">
        auto_videocam
      </span>
    </div>
    <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
      Clip<span className="text-primary">Forge</span>
    </span>
  </div>
);

interface DashboardViewProps {
  onOpenInEditor: (card?: DashboardProjectCard) => void;
  onTriggerExport: (card?: DashboardProjectCard) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenInEditor,
  onTriggerExport,
}) => {
  const [ingestSourceMode, setIngestSourceMode] = useState<'url' | 'upload' | 'live'>(
    'live'
  );
  const [streamUrl, setStreamUrl] = useState(
    'https://youtube.com/live/stream?v=agi-summit-horizon-2025-mainstage'
  );
  const [viralityFilter, setViralityFilter] = useState<'all' | 'high' | 'moderate'>('all');
  const [scanningToast, setScanningToast] = useState<string | null>(null);

  const filteredCards = DASHBOARD_PROJECT_CARDS.filter((c) => {
    if (viralityFilter === 'high') return c.viralityScore >= 90;
    if (viralityFilter === 'moderate') return c.viralityScore < 90;
    return true;
  });

  const handleFindMoments = () => {
    setScanningToast('Dual Whisper-Large V3 + Vision Saliency synced 8 viral hooks');
    setTimeout(() => setScanningToast(null), 3000);
  };

  return (
    <div className="flex flex-col w-full pb-space-xl bg-surface text-on-surface select-none">
      {/* Top Session Bar / Live Sync Header (Exact match to code_1c2fef5e.html) */}
      <section className="w-full px-space-md md:px-margin-desktop py-space-md bg-surface-container-low flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md min-w-0">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-secondary -ml-3.5" />
            <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase font-semibold">
              Live Sync Active
            </span>
          </div>
          <div className="h-4 w-px bg-outline-variant/40" />
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="font-headline-md text-headline-md text-on-surface tracking-tight truncate">
              Stream Session #984 — AGI Horizon Summit
            </span>
            <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono">
              03:42:15
            </span>
          </div>
        </div>

        {/* Quick Session Actions */}
        <div className="flex items-center gap-space-sm flex-shrink-0">
          <button
            type="button"
            onClick={handleFindMoments}
            className="px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-body-md font-title-md transition-all flex items-center gap-space-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              sync
            </span>
            <span>Re-Index Audio</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenInEditor(DASHBOARD_PROJECT_CARDS[0])}
            className="px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-body-md font-title-md transition-all flex items-center gap-space-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              tune
            </span>
            <span>Auto-Framing: 9:16</span>
          </button>
          <button
            type="button"
            onClick={() => onTriggerExport(DASHBOARD_PROJECT_CARDS[0])}
            className="px-space-md py-space-xs rounded bg-primary text-on-primary text-body-md font-title-md hover:bg-primary-container transition-all flex items-center gap-space-xs shadow-[0_0_16px_rgba(124,92,255,0.35)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">publish</span>
            <span>Batch Export (8)</span>
          </button>
        </div>
      </section>

      {/* Ingestion Source Rail */}
      <section className="w-full px-space-md md:px-margin-desktop pt-space-lg">
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-lg flex flex-col gap-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            {/* Ingestion Tabs */}
            <div className="flex items-center gap-space-xs p-1 bg-surface-container-lowest rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setIngestSourceMode('url')}
                className={`px-space-md py-space-xs rounded text-body-sm font-title-md flex items-center gap-space-xs transition-colors cursor-pointer ${
                  ingestSourceMode === 'url'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>URL Source</span>
              </button>
              <button
                type="button"
                onClick={() => setIngestSourceMode('upload')}
                className={`px-space-md py-space-xs rounded text-body-sm font-title-md flex items-center gap-space-xs transition-colors cursor-pointer ${
                  ingestSourceMode === 'upload'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setIngestSourceMode('live')}
                className={`px-space-md py-space-xs rounded text-body-sm font-title-md flex items-center gap-space-xs transition-colors cursor-pointer ${
                  ingestSourceMode === 'live'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  sensors
                </span>
                <span>Live Stream (Active)</span>
              </button>
            </div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-secondary text-[16px]">
                bolt
              </span>
              <span>
                {scanningToast ||
                  'Dual Whisper-Large V3 + Computer Vision Saliency Active'}
              </span>
            </div>
          </div>

          {/* Input Bar */}
          <div className="flex flex-col md:flex-row items-stretch gap-space-sm">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-space-md flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px] text-error">
                  play_circle
                </span>
              </div>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-label-md text-label-md pl-11 pr-28 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-space-md flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono">
                  1080p60
                </span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono">
                  RTMP
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFindMoments}
              className="px-space-xl py-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md transition-all flex items-center justify-center gap-space-xs shadow-[0_0_24px_rgba(124,92,255,0.45)] flex-shrink-0 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:rotate-45 transition-transform duration-300">
                auto_awesome
              </span>
              <span>Find Viral Moments</span>
            </button>
          </div>
        </div>
      </section>

      {/* Live Stream Timeline Analysis Scrubber */}
      <section className="w-full px-space-md md:px-margin-desktop pt-space-lg">
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-lg flex flex-col gap-space-sm relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="font-title-md text-title-md text-on-surface">
                Stream Audio/Visual Energy Spectrum
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-mono">
                00:00:00 — 03:42:15
              </span>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm">
              <span className="flex items-center gap-1 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Viral Peak (&gt;90)
              </span>
              <span className="flex items-center gap-1 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary" /> Moderate Peak (80-89)
              </span>
              <span className="flex items-center gap-1 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-tint" /> Retained Speech
              </span>
            </div>
          </div>

          {/* Waveform & Pin Canvas Container */}
          <div className="relative w-full h-32 bg-surface-container-lowest rounded-lg p-3 flex flex-col justify-end overflow-hidden group select-none">
            <svg
              className="w-full h-20 text-outline-variant/35"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 1000 100"
            >
              <defs>
                <linearGradient id="waveformGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#cabeff" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#947dff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#192029" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="peakHighlight" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffe083" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#d7791f" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path
                d="M0,85 Q20,80 40,75 T80,82 T120,40 T160,88 T200,60 T240,85 T280,30 T320,78 T360,55 T400,20 T440,82 T480,70 T520,15 T560,75 T600,60 T640,85 T680,25 T720,70 T760,10 T800,80 T840,65 T880,85 T920,45 T960,75 T1000,85 L1000,100 L0,100 Z"
                fill="url(#waveformGradient)"
              />
              <path
                d="M440,82 T480,70 T520,15 T560,75 L560,100 L440,100 Z"
                fill="url(#peakHighlight)"
              />
              <path
                d="M720,70 T760,10 T800,80 L800,100 L720,100 Z"
                fill="url(#peakHighlight)"
              />
              <path
                d="M260,75 T280,30 T320,78 L320,100 L260,100 Z"
                fill="url(#peakHighlight)"
                opacity="0.6"
              />
              <g opacity="0.4" stroke="currentColor" strokeWidth="1.2">
                <line x1="10" x2="10" y1="90" y2="70" />
                <line x1="40" x2="40" y1="90" y2="60" />
                <line x1="70" x2="70" y1="90" y2="50" />
                <line stroke="#cabeff" strokeWidth="2" x1="120" x2="120" y1="90" y2="35" />
                <line stroke="#ffe083" strokeWidth="2" x1="280" x2="280" y1="90" y2="25" />
                <line stroke="#cabeff" strokeWidth="2" x1="490" x2="490" y1="90" y2="20" />
                <line stroke="#ffe083" strokeWidth="2.5" x1="510" x2="510" y1="90" y2="10" />
                <line stroke="#ffe083" strokeWidth="2.5" x1="750" x2="750" y1="90" y2="12" />
              </g>
            </svg>

            <div className="w-full flex justify-between pt-1 font-label-sm text-[10px] sm:text-label-sm text-outline font-mono">
              <span>00:00:00</span>
              <span className="hidden sm:inline">00:45:00</span>
              <span>01:30:00</span>
              <span className="hidden sm:inline">02:15:00</span>
              <span className="hidden md:inline">03:00:00</span>
              <span>03:42:15</span>
            </div>

            {/* Pin 1 */}
            <div
              onClick={() => onOpenInEditor(DASHBOARD_PROJECT_CARDS[1])}
              className="absolute top-2 left-[12%] sm:left-[7%] -translate-x-1/2 flex flex-col items-center cursor-pointer z-20"
            >
              <div className="px-1.5 sm:px-2 py-0.5 rounded bg-surface-container-high text-secondary font-label-sm text-[10px] sm:text-label-sm font-mono flex items-center gap-1 shadow-md whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>Score 92</span>
              </div>
              <div className="w-0.5 h-12 bg-secondary" />
              <div className="w-2 h-2 rounded-full bg-secondary -mt-1" />
            </div>

            {/* Pin 2 */}
            <div
              onClick={() => onOpenInEditor(DASHBOARD_PROJECT_CARDS[0])}
              className="absolute top-2 left-[46%] -translate-x-1/2 flex flex-col items-center cursor-pointer z-30"
            >
              <div className="px-1.5 sm:px-2 py-0.5 rounded bg-secondary text-on-secondary font-label-sm text-[10px] sm:text-label-sm font-mono font-bold flex items-center gap-1 shadow-lg whitespace-nowrap">
                <span className="material-symbols-outlined text-[12px]">
                  local_fire_department
                </span>
                <span>Score 99 Viral</span>
              </div>
              <div className="w-0.5 h-12 bg-secondary" />
              <div className="w-2.5 h-2.5 rounded-full bg-secondary -mt-1" />
            </div>

            {/* Pin 3 */}
            <div
              onClick={() => onOpenInEditor(DASHBOARD_PROJECT_CARDS[2])}
              className="hidden sm:flex absolute top-2 left-[58%] -translate-x-1/2 flex-col items-center cursor-pointer z-20"
            >
              <div className="px-2 py-0.5 rounded bg-surface-container-high text-tertiary font-label-sm text-label-sm font-mono flex items-center gap-1 shadow-md whitespace-nowrap">
                <span>Score 88</span>
              </div>
              <div className="w-0.5 h-12 bg-tertiary/80" />
              <div className="w-2 h-2 rounded-full bg-tertiary -mt-1" />
            </div>

            {/* Pin 4 */}
            <div
              onClick={() => onOpenInEditor(DASHBOARD_PROJECT_CARDS[3])}
              className="absolute top-2 left-[80%] sm:left-[74%] -translate-x-1/2 flex flex-col items-center cursor-pointer z-20"
            >
              <div className="px-1.5 sm:px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-[10px] sm:text-label-sm font-mono font-bold flex items-center gap-1 shadow-md whitespace-nowrap">
                <span className="material-symbols-outlined text-[12px]">bolt</span>
                <span>Score 95</span>
              </div>
              <div className="w-0.5 h-12 bg-primary" />
              <div className="w-2 h-2 rounded-full bg-primary -mt-1" />
            </div>

            <div className="absolute inset-y-0 left-[46%] w-px bg-secondary pointer-events-none z-40 flex flex-col items-center">
              <div className="w-3 h-3 bg-secondary rotate-45 -mt-1.5 shadow-[0_0_10px_#ffe083]" />
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Sorting Tooling Bar */}
      <section className="w-full px-space-md md:px-margin-desktop pt-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Generated AI Shorts
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-label-md text-label-md font-semibold">
              8 ready to publish
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-lg">
            <button
              type="button"
              onClick={() => setViralityFilter('all')}
              className={`px-space-md py-1 rounded text-body-sm font-title-md cursor-pointer ${
                viralityFilter === 'all'
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All (8)
            </button>
            <button
              type="button"
              onClick={() => setViralityFilter('high')}
              className={`px-space-md py-1 rounded text-body-sm font-title-md flex items-center gap-1 cursor-pointer ${
                viralityFilter === 'high'
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>High Virality &gt;90 (5)</span>
            </button>
            <button
              type="button"
              onClick={() => setViralityFilter('moderate')}
              className={`px-space-md py-1 rounded text-body-sm font-title-md flex items-center gap-1 cursor-pointer ${
                viralityFilter === 'moderate'
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span>Moderate 80–89 (3)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-space-sm self-end md:self-auto">
          <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm font-title-md">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              swap_vert
            </span>
            <span>
              Sort by: <strong className="text-primary font-semibold">Highest Virality</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 9:16 Vertical Video Cards Grid */}
      <section className="w-full px-space-md md:px-margin-desktop pt-space-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {filteredCards.map((card) => {
            const badgeClass =
              card.scoreBadgeType === 'gold'
                ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary'
                : card.scoreBadgeType === 'primary'
                ? 'bg-primary-container text-on-primary-container'
                : card.scoreBadgeType === 'tertiary'
                ? 'bg-surface-container text-tertiary'
                : 'bg-secondary-container text-on-secondary-container';

            return (
              <div
                key={card.id}
                className="bg-surface-container-low rounded-xl overflow-hidden shadow-xl flex flex-col group transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(124,92,255,0.25)]"
              >
                <div
                  onClick={() => onOpenInEditor(card)}
                  className="relative w-full aspect-[9/16] bg-surface-container-lowest overflow-hidden cursor-pointer"
                >
                  <img
                    src={card.thumbnailUrl}
                    alt={card.title}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== card.fallbackUrl) {
                        img.src = card.fallbackUrl;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute top-space-sm inset-x-space-sm flex items-center justify-between pointer-events-none z-10">
                    <span
                      className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 shadow-md ${badgeClass}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {card.scoreIcon}
                      </span>
                      <span>Score {card.viralityScore}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-mono">
                      {card.durationFormatted}
                    </span>
                  </div>

                  <div className="absolute inset-x-space-md bottom-12 text-center pointer-events-none z-10">
                    <span
                      className={`inline-block px-2.5 py-1 rounded font-display text-[15px] leading-tight font-extrabold tracking-tight uppercase shadow-xl ${card.captionStyleClass}`}
                    >
                      {card.captionText}
                    </span>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 h-1 bg-surface-container-high">
                    <div
                      className={`h-full ${card.progressColorClass} ${card.progressWidth}`}
                    />
                  </div>
                </div>

                <div className="p-space-md flex flex-col gap-space-sm flex-1 justify-between">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between text-outline font-label-sm text-label-sm font-mono">
                      <span>{card.timeRange}</span>
                      <span className={`${card.tagColorClass} font-semibold`}>
                        {card.tagLabel}
                      </span>
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-space-xs pt-space-xs">
                    <button
                      type="button"
                      onClick={() => onOpenInEditor(card)}
                      className="px-space-sm py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-title-md text-body-sm flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-outline">
                        tune
                      </span>
                      <span>Edit Cut</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerExport(card)}
                      className="px-space-sm py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-title-md text-body-sm flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        file_download
                      </span>
                      <span>Download MP4</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Ingestion Statistics & Telemetry Drawer */}
      <section className="w-full px-space-md md:px-margin-desktop pt-space-lg">
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-space-md">
          <div className="flex items-center gap-space-md p-space-sm bg-surface-container-lowest rounded-lg">
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Speech Saliency
              </span>
              <span className="font-title-md text-title-md text-on-surface">
                99.4% Confidence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-md p-space-sm bg-surface-container-lowest rounded-lg">
            <div className="w-10 h-10 rounded bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">face</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Speaker Tracking
              </span>
              <span className="font-title-md text-title-md text-on-surface">
                3 Speakers Identified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-md p-space-sm bg-surface-container-lowest rounded-lg">
            <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-on-surface-variant flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">subtitles</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Captions Generated
              </span>
              <span className="font-title-md text-title-md text-on-surface">
                1,420 Words Sync&apos;d
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-md p-space-sm bg-surface-container-lowest rounded-lg">
            <div className="w-10 h-10 rounded bg-secondary-container/10 flex items-center justify-center text-secondary-container flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">speed</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Render Speed
              </span>
              <span className="font-title-md text-title-md text-secondary">
                4.2x Realtime (H100)
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

interface MobileCompanionViewProps {
  onOpenEditor: () => void;
  onTriggerExport: () => void;
}

export const MobileCompanionView: React.FC<MobileCompanionViewProps> = ({
  onOpenEditor,
  onTriggerExport,
}) => {
  const [tiktokSync, setTiktokSync] = useState(true);
  const [ytSync, setYtSync] = useState(true);
  const [igSync, setIgSync] = useState(true);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'done'>('idle');

  const handleBroadcastClick = () => {
    setPublishStatus('publishing');
    setTimeout(() => {
      setPublishStatus('done');
      setTimeout(() => setPublishStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="relative w-full overflow-hidden px-space-md md:px-margin-desktop py-space-xl flex flex-col gap-space-xl bg-surface text-on-surface select-none">
      {/* Ambient Background Depth Flares */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Screen Narrative Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md z-10">
        <div className="flex flex-col gap-space-xs max-w-2xl">
          <div className="flex items-center gap-space-xs">
            <span className="px-space-sm py-space-xs rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              Pocket Deck Mode
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              iOS • v2.4.1 Production Core
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Mobile Companion Suite
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Autonomously mine raw stream footage on the fly and dispatch 4K rendered hooks
            directly to major social platforms before your live feed ends.
          </p>
        </div>

        {/* Quick Telemetry Bar */}
        <div className="flex items-center gap-space-sm bg-surface-container-low p-space-sm rounded-xl">
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded-lg">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              bolt
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                PULSE LATENCY
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                140ms Native Sync
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded-lg">
            <span className="material-symbols-outlined text-primary text-[18px]">
              verified
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                AUTH TOKENS
              </span>
              <span className="font-label-md text-label-md text-secondary">
                3 Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual Phone Showcase Deck (Exact match to code_e5a2a686.html) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-xl items-start justify-center max-w-7xl mx-auto w-full z-10">
        {/* LEFT PHONE: STREAM & MOMENTS */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[390px] mb-space-sm flex items-center justify-between px-space-xs">
            <span className="font-label-sm text-label-sm text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">sensors</span> VIEW 01:
              MOMENTS DISCOVERY
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              STREAM HARVESTER
            </span>
          </div>

          <div className="w-full max-w-[390px] bg-surface-container-lowest rounded-[44px] p-3 shadow-2xl relative">
            <div className="w-full bg-surface-container-low rounded-[36px] overflow-hidden flex flex-col h-[760px] relative">
              {/* iOS Status Bar */}
              <div className="pt-3 px-6 pb-2 flex items-center justify-between text-on-surface">
                <span className="font-label-sm text-label-sm font-semibold">09:41</span>
                <div className="w-24 h-5 bg-surface-container-lowest rounded-full flex items-center justify-end px-2 gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-primary/40" />
                </div>
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-[14px]">
                    signal_cellular_alt
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold">5G</span>
                  <span className="material-symbols-outlined text-[16px]">
                    battery_full
                  </span>
                </div>
              </div>

              {/* In-App Header */}
              <div className="px-space-md py-space-xs flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-[16px]">
                      auto_videocam
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-[15px] leading-tight text-on-surface">
                      Clip<span className="text-primary">Forge</span>
                    </span>
                    <span className="font-label-sm text-[9px] text-secondary uppercase">
                      Live Scout v2
                    </span>
                  </div>
                </div>
                <div className="px-space-xs py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />8 Moments Found
                </div>
              </div>

              {/* Feed Content */}
              <div className="flex-1 overflow-y-auto px-space-md py-space-xs flex flex-col gap-space-md">
                <div className="bg-surface-container p-space-sm rounded-xl">
                  <div className="flex items-center justify-between mb-space-xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                      <span className="font-label-sm text-[10px] text-error font-semibold uppercase">
                        Processing Stream
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      01:42:19
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <img
                      src="/src/assets/images/commentary_creator_cam_1794941711189.jpg"
                      alt="Lex Fridman Podcast"
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-title-md text-body-md text-on-surface truncate">
                        Lex Fridman #421 • Sam Altman
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        AI Stream Session • Whisper Sync 100%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Featured Hero Moment */}
                <div className="bg-surface-container rounded-xl overflow-hidden shadow-lg flex flex-col">
                  <div className="relative w-full aspect-[9/12] bg-surface-container-lowest overflow-hidden">
                    <img
                      src="/src/assets/images/commentary_creator_cam_1794941711189.jpg"
                      alt="Active Speaker Track"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/30 to-transparent" />
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">
                        local_fire_department
                      </span>
                      SCORE 99
                    </div>
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-32 h-36 border-2 border-primary/60 rounded-xl flex flex-col justify-between p-1">
                      <span className="font-label-sm text-[8px] text-primary uppercase bg-surface-container-lowest/80 px-1 rounded w-max">
                        Active Speaker Track
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 inset-x-2.5 text-center">
                      <span className="inline-block bg-primary text-on-primary font-headline-md text-body-md uppercase px-2 py-0.5 rounded shadow-lg">
                        “THE BIGGEST SHIFT IN TECH”
                      </span>
                    </div>
                  </div>

                  <div className="p-space-sm flex flex-col gap-space-xs">
                    <div className="grid grid-cols-2 gap-space-xs">
                      <button
                        type="button"
                        onClick={onOpenEditor}
                        className="py-2 px-space-xs rounded-lg bg-surface-container-high text-on-surface font-title-md text-body-sm hover:bg-surface-bright flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        Quick Edit
                      </button>
                      <button
                        type="button"
                        onClick={onTriggerExport}
                        className="py-2 px-space-xs rounded-lg bg-primary text-on-primary font-title-md text-body-sm hover:bg-primary-container flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Share Socials
                      </button>
                    </div>
                  </div>
                </div>

                {/* Queue Highlights */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                      Queue Highlights
                    </span>
                    <span className="font-label-sm text-label-sm text-primary">
                      Sort: Virality
                    </span>
                  </div>
                  <div
                    onClick={onOpenEditor}
                    className="p-space-xs bg-surface-container rounded-xl flex items-center justify-between cursor-pointer hover:bg-surface-container-high"
                  >
                    <div className="flex items-center gap-space-xs">
                      <img
                        src="/src/assets/images/clip_synth_studio_1794941709891.jpg"
                        alt=""
                        className="w-11 h-12 rounded-lg object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="font-title-md text-body-sm text-on-surface">
                          Neural Net Consciousness
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          00:32 • Hook: 3.2s drop
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary font-label-sm text-[10px] font-bold">
                      SCORE 94
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PHONE: MULTI-CHANNEL PUBLISHER */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[390px] mb-space-sm flex items-center justify-between px-space-xs">
            <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">bolt</span> VIEW 02:
              1-CLICK PUBLISHER
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              MULTI-BROADCAST
            </span>
          </div>

          <div className="w-full max-w-[390px] bg-surface-container-lowest rounded-[44px] p-3 shadow-2xl relative">
            <div className="w-full bg-surface-container-low rounded-[36px] overflow-hidden flex flex-col h-[760px] relative">
              <div className="pt-3 px-6 pb-2 flex items-center justify-between text-on-surface">
                <span className="font-label-sm text-label-sm font-semibold">09:41</span>
                <div className="w-24 h-5 bg-surface-container-lowest rounded-full flex items-center justify-end px-2 gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-[14px]">
                    signal_cellular_alt
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold">5G</span>
                  <span className="material-symbols-outlined text-[16px]">
                    battery_full
                  </span>
                </div>
              </div>

              <div className="px-space-md py-space-xs flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={onOpenEditor}
                    className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_back
                    </span>
                  </button>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-[15px] leading-tight text-on-surface">
                      Publish Short
                    </span>
                    <span className="font-label-sm text-[9px] text-primary uppercase">
                      Ready in 4K 60fps • HDR
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-space-md py-space-xs flex flex-col gap-space-md">
                <div className="bg-surface-container p-space-sm rounded-xl flex items-center justify-between gap-space-xs">
                  <div className="flex items-center gap-space-xs truncate">
                    <img
                      src="/src/assets/images/commentary_creator_cam_1794941711189.jpg"
                      alt=""
                      className="w-8 h-10 rounded object-cover shrink-0"
                    />
                    <div className="flex flex-col truncate">
                      <span className="font-title-md text-body-sm text-on-surface truncate">
                        Sam Altman on AGI Horizon
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Duration: 48s • 1080x1920
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold shrink-0">
                    virality_score: 99
                  </div>
                </div>

                {/* Broadcast Targets */}
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                    Active Broadcast Targets
                  </span>
                  {[
                    {
                      label: 'TikTok',
                      sub: '@lexclips_ai • Auto-sync sound',
                      icon: 'audiotrack',
                      active: tiktokSync,
                      toggle: () => setTiktokSync((v) => !v),
                    },
                    {
                      label: 'YouTube Shorts',
                      sub: 'Fridman Highlights • Auto-tags',
                      icon: 'play_arrow',
                      active: ytSync,
                      toggle: () => setYtSync((v) => !v),
                    },
                    {
                      label: 'Instagram Reels',
                      sub: '@clipforge_media • Auto-cover select',
                      icon: 'photo_camera',
                      active: igSync,
                      toggle: () => setIgSync((v) => !v),
                    },
                  ].map((ch) => (
                    <div
                      key={ch.label}
                      className="p-space-xs bg-surface-container rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-space-xs">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[18px]">
                            {ch.icon}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-title-md text-body-sm text-on-surface">
                            {ch.label}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {ch.sub}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={ch.toggle}
                        aria-label={`Toggle ${ch.label}`}
                        className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                          ch.active
                            ? 'bg-primary justify-end'
                            : 'bg-surface-container-high justify-start'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-on-primary shadow-sm" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* AI Generated Metadata */}
                <div className="bg-surface-container p-space-sm rounded-xl flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      psychology
                    </span>{' '}
                    AI Generated Metadata
                  </span>
                  <div className="p-2 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface">
                    The moment everything changed forever... 🤯
                  </div>
                  <div className="p-2 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface leading-relaxed">
                    Sam Altman breaks down the tipping point of compute scaling.
                    <span className="text-primary font-label-sm text-body-sm block pt-1">
                      #agi #tech #podcast #future #shorts #clipforge
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-space-xs">
                  <button
                    type="button"
                    onClick={handleBroadcastClick}
                    className="w-full py-2.5 px-space-md rounded-xl bg-secondary-container text-on-secondary-container font-title-md text-title-md font-bold flex items-center justify-center gap-space-xs shadow-lg hover:bg-secondary transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {publishStatus === 'done' ? 'task_alt' : 'rocket_launch'}
                    </span>
                    <span>
                      {publishStatus === 'publishing'
                        ? 'Broadcasting 4K Render...'
                        : publishStatus === 'done'
                        ? 'Published to 3 Networks!'
                        : 'Publish to All 3 Channels (1-Click)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onTriggerExport}
                    className="w-full py-2 px-space-md rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-body-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px] text-primary">
                      download
                    </span>
                    <span>Download Short (.MP4)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Feature Specification Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-lg">
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-xs">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">stream</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Live Ingest Agent
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Connect your OBS, RTMP source, or live podcast link. ClipForge listens
            synchronously in memory, indexing cadence, volume, and viewer sentiment.
          </p>
        </div>
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-xs">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[22px]">trending_up</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            AI Virality Scoring
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Trained on 400M+ TikTok &amp; YouTube Shorts views. Evaluates early 3-second
            hook retention, speaker velocity, and punchline coherence.
          </p>
        </div>
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-xs">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-fixed">
            <span className="material-symbols-outlined text-[22px]">share</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Zero-Friction Multi-Post
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Automatic vertical safe-zone checks, automated hashtag selection,
            platform-specific audio alignment, and zero desktop rendering delays.
          </p>
        </div>
      </div>
    </div>
  );
};

interface ViralHeroViewProps {
  onStartEditing: () => void;
  onOpenDashboard: () => void;
}

export const ViralHeroView: React.FC<ViralHeroViewProps> = ({
  onStartEditing,
  onOpenDashboard,
}) => {
  const [heroUrl, setHeroUrl] = useState('https://youtube.com/watch?v=viral-podcast-ep42');

  return (
    <div className="flex flex-col w-full relative overflow-hidden bg-surface text-on-surface select-none">
      {/* Dynamic Ambient Glow Backdrops (Exact match to code_39440f16.html) */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-primary/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[680px] -right-48 w-[500px] h-[500px] bg-tertiary-container/10 blur-[130px] pointer-events-none rounded-full" />

      {/* HERO SECTION */}
      <section className="relative w-full px-margin md:px-margin-desktop pt-space-lg pb-space-xl flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high shadow-sm mb-space-md">
          <span
            className="material-symbols-outlined text-[16px] text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">
            Powered by Gemini 1.5 &amp; Whisper AI
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping ml-space-xs" />
          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
            Engine v3.4 Active
          </span>
        </div>

        <h1 className="font-display text-display max-w-4xl tracking-tight leading-[1.08] text-on-surface mb-space-md">
          Turn long videos into{' '}
          <span className="bg-gradient-to-r from-primary-fixed via-primary to-secondary bg-clip-text text-transparent">
            viral shorts in seconds.
          </span>
        </h1>

        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed mb-space-lg">
          Drop any YouTube link, podcast, or live stream. Our AI detects hook-worthy
          moments, re-centers active speakers in 9:16 vertical, and animates kinetic
          captions automatically.
        </p>

        {/* Smart URL Ingestion Interactive Bar */}
        <div className="w-full max-w-3xl bg-surface-container-low p-space-xs rounded-xl shadow-xl flex flex-col sm:flex-row items-center gap-space-xs">
          <div className="flex items-center gap-space-xs pl-space-md flex-1 w-full py-space-xs">
            <span className="material-symbols-outlined text-outline text-[22px]">
              link
            </span>
            <input
              type="text"
              value={heroUrl}
              onChange={(e) => setHeroUrl(e.target.value)}
              placeholder="Paste YouTube, Vimeo, or Loom video link..."
              className="w-full bg-transparent text-on-surface placeholder-outline font-body-md text-body-md focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onStartEditing}
            className="w-full sm:w-auto px-space-lg py-space-sm bg-primary text-on-primary font-title-md text-title-md rounded-lg flex items-center justify-center gap-space-xs shadow-lg hover:shadow-[0_0_24px_rgba(202,190,255,0.45)] cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <span>Generate Shorts →</span>
          </button>
        </div>

        {/* Trust Signals Ticks */}
        <div className="flex flex-wrap items-center justify-center gap-x-space-lg gap-y-space-xs mt-space-md text-on-surface-variant font-label-md text-label-md">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[16px]">
              verified
            </span>
            <span>1-Click Viral Detection</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[16px]">
              verified
            </span>
            <span>Auto 9:16 Face Reframe</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[16px]">
              verified
            </span>
            <span>Free 50-minute trial, no credit card required</span>
          </div>
        </div>
      </section>

      {/* SHOWCASE PREVIEW GALLERY (3 VERTICAL SHORTS) */}
      <section className="w-full px-margin md:px-margin-desktop py-space-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-space-md">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
                Live Processing Pipeline
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Auto-Extracted Viral Hooks
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>GPU Render Pool 04: Real-time</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pt-space-xs pb-space-lg">
            {[
              {
                title: 'Hook #1: The Reality Check',
                dur: '00:42',
                desc: 'Extracted from 2h 14m Joe Rogan styled tech interview.',
                score: '98% Viral Score',
                views: '1.4M views',
                likes: '82K',
                caption: 'NEVER QUIT YOUR 9-5',
                img: '/src/assets/images/commentary_creator_cam_1794941711189.jpg',
                elevated: false,
              },
              {
                title: 'Hook #2: The 5-Minute Rule',
                dur: '00:18',
                desc: 'Analyzed highest retention spike based on NLP tone shift.',
                score: '99% Viral Score',
                views: '3.2M views',
                likes: '241K',
                caption: 'THIS 1 HABIT 🚀',
                img: '/src/assets/images/clip_synth_studio_1794941709891.jpg',
                elevated: true,
              },
              {
                title: 'Hook #3: Reaction Spike',
                dur: '00:35',
                desc: 'Audio decibel burst + face expression analysis trigger.',
                score: '94% Viral Score',
                views: '890K views',
                likes: '64K',
                caption: 'WAIT UNTIL THE END!',
                img: '/src/assets/images/clip_skate_aerial_1794941709829.jpg',
                elevated: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                onClick={onStartEditing}
                className={`relative group rounded-xl overflow-hidden bg-surface-container-low shadow-xl cursor-pointer transition-transform duration-300 ${
                  item.elevated ? 'md:-translate-y-3 ring-1 ring-primary/40' : ''
                }`}
              >
                <div className="relative aspect-[9/16] w-full bg-surface-container-lowest overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/60" />
                  <div className="absolute top-3 right-3 px-space-sm py-space-xs rounded-full bg-secondary/25 backdrop-blur-md flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[14px]">
                      local_fire_department
                    </span>
                    <span className="font-label-md text-label-md text-secondary font-bold">
                      {item.score}
                    </span>
                  </div>
                  <div className="absolute top-3 left-3 px-space-xs py-0.5 rounded bg-surface-container-highest/80 text-on-surface-variant font-label-sm text-label-sm">
                    {item.elevated ? 'TOP PICK' : '9:16 Reframe'}
                  </div>
                  <div className="absolute bottom-20 inset-x-3 text-center">
                    <span className="px-space-sm py-1 rounded bg-surface-container-lowest text-secondary font-headline-md text-headline-md font-bold uppercase shadow-xl inline-block">
                      {item.caption}
                    </span>
                  </div>
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between bg-surface-container-high/90 backdrop-blur-sm px-space-sm py-space-xs rounded-lg">
                    <div className="flex items-center gap-space-xs text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        visibility
                      </span>
                      <span className="font-label-md text-label-md font-bold">
                        {item.views}
                      </span>
                    </div>
                    <div className="flex items-center gap-space-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px] text-error">
                        favorite
                      </span>
                      <span className="font-label-md text-label-md">{item.likes}</span>
                    </div>
                  </div>
                </div>
                <div className="p-space-md bg-surface-container">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-title-md text-title-md text-on-surface">
                      {item.title}
                    </span>
                    <span className="font-label-sm text-label-sm text-outline font-mono">
                      {item.dur}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mb-2.5">
                    {item.desc}
                  </p>
                  <a
                    href={`/api/export/quick-mp4?title=${encodeURIComponent(
                      item.title
                    )}&aspect=9:16&image=${encodeURIComponent(item.img)}`}
                    download={`clipforge_${item.title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '_')}.mp4`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full py-1.5 px-space-sm rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-primary font-title-md text-body-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download Short (.MP4)</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / METRICS ROW */}
      <section className="w-full px-margin md:px-margin-desktop py-space-lg bg-surface-container-lowest shadow-sm my-space-lg">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-space-lg text-center">
          <div className="flex flex-col items-center p-space-sm">
            <span className="font-display text-display text-primary font-bold tracking-tight">
              10M+
            </span>
            <span className="font-title-md text-title-md text-on-surface mt-1">
              Shorts Generated
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Across YouTube, TikTok &amp; IG Reels
            </span>
          </div>
          <div className="flex flex-col items-center p-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="font-display text-display text-secondary font-bold tracking-tight">
                4.2x
              </span>
              <span className="material-symbols-outlined text-secondary text-[32px]">
                trending_up
              </span>
            </div>
            <span className="font-title-md text-title-md text-on-surface mt-1">
              Avg. Viewership Boost
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Measured across 2,400+ channels
            </span>
          </div>
          <div className="flex flex-col items-center p-space-sm">
            <span className="font-display text-display text-on-surface font-bold tracking-tight">
              50,000+
            </span>
            <span className="font-title-md text-title-md text-on-surface mt-1">
              Active Creators
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Solo podcasters to top studio networks
            </span>
          </div>
        </div>
      </section>

      {/* SECONDARY CONVERSION CTA BANNER */}
      <section className="w-full px-margin md:px-margin-desktop py-space-xl">
        <div className="max-w-5xl mx-auto relative rounded-xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest p-space-lg md:p-space-xl overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-space-lg text-center md:text-left">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-secondary-container/20 text-secondary font-label-sm text-label-sm font-bold uppercase mb-space-xs">
                <span className="material-symbols-outlined text-[14px]">
                  rocket_launch
                </span>
                Instant Setup
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                Stop editing for 8 hours. <br className="hidden sm:block" />
                <span className="text-primary">Publish 10 viral shorts today.</span>
              </h2>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={onStartEditing}
                className="px-space-lg py-space-md bg-secondary text-on-secondary font-title-md text-title-md rounded-lg font-bold shadow-xl hover:bg-secondary-fixed-dim flex items-center gap-space-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                <span>Start Clipping Free</span>
              </button>
              <button
                type="button"
                onClick={onOpenDashboard}
                className="px-space-lg py-space-md bg-surface-container-high text-on-surface font-title-md text-title-md rounded-lg cursor-pointer"
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
