import React, { useEffect, useState, useCallback } from 'react';
import {
  type ProjectState,
  buildFfmpegRenderSpec,
  buildSrtFromProject,
  computeProjectRightsState,
} from '../editor/engine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
}

export interface ServerRenderResponse {
  status: string;
  jobId: string;
  completedAt: string;
  outputFilename: string;
  srtFilename: string;
  fileSizeBytes: number;
  downloadUrl: string;
  streamUrl: string;
  subtitlesUrl: string;
  totalFrames: number;
  stages: Array<{ step: number; name: string; detail: string }>;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, project }) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<ServerRenderResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [downloadTriggeredToast, setDownloadTriggeredToast] = useState<string | null>(null);

  const handleRunServerRender = useCallback(async () => {
    setIsRendering(true);
    setRenderError(null);
    try {
      const response = await fetch('/api/export/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      if (!response.ok) {
        throw new Error(`Render request failed (${response.status})`);
      }
      const data = (await response.json()) as ServerRenderResponse;
      setRenderResult(data);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Server render failed');
    } finally {
      setIsRendering(false);
    }
  }, [project]);

  // Automatically render the short when the modal opens at the end of clipping
  useEffect(() => {
    if (isOpen) {
      handleRunServerRender();
    } else {
      setDownloadTriggeredToast(null);
    }
  }, [isOpen, handleRunServerRender]);

  if (!isOpen) return null;

  const spec = buildFfmpegRenderSpec(project);
  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);
  const primaryClip = project.clips.find((c) => c.trackId === 'video');
  const quickMp4Href = `/api/export/quick-mp4?title=${encodeURIComponent(
    project.title
  )}&aspect=${encodeURIComponent(project.aspectRatio)}&image=${encodeURIComponent(
    primaryClip?.thumbnailUrl || '/src/assets/images/commentary_creator_cam_1794941711189.jpg'
  )}`;

  const handleDownloadMp4 = () => {
    const targetUrl = renderResult?.downloadUrl || quickMp4Href;
    const filename =
      renderResult?.outputFilename ||
      `clipforge_${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_crf16.mp4`;
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadTriggeredToast(`Downloading ${filename}...`);
    setTimeout(() => setDownloadTriggeredToast(null), 3500);
  };

  const handleDownloadSrt = () => {
    const srtText = buildSrtFromProject(project);
    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const filename =
      renderResult?.srtFilename ||
      `clipforge_${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_captions.srt`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadTriggeredToast(`Downloaded ${filename}`);
    setTimeout(() => setDownloadTriggeredToast(null), 3500);
  };

  const handleDownloadRenderPackage = () => {
    const payload = {
      renderJob: renderResult,
      ffmpegSpec: spec,
      descriptionWithAttribution: rightsState.fullDescription,
      projectSnapshot: project,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename =
      renderResult?.outputFilename.replace('.mp4', '_master_manifest.json') ||
      'clipforge_render.json';
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadTriggeredToast(`Downloaded ${filename}`);
    setTimeout(() => setDownloadTriggeredToast(null), 3500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
    >
      <div className="w-full max-w-3xl bg-surface-container-low border border-outline-variant/40 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">movie_edit</span>
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="font-headline-md text-title-md text-on-surface"
              >
                Render &amp; Download Viral Short (.MP4)
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Server-Side FFmpeg Master Encode • CRF 16 • AAC 256k • {project.aspectRatio}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Top Rendered Short Preview + Direct Download Card */}
          <div className="p-4 bg-surface-container-lowest border border-primary/30 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Inline Video Player Preview */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-full max-w-[175px] aspect-[9/16] rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/40 relative shadow-lg flex items-center justify-center">
                {renderResult?.streamUrl ? (
                  <video
                    key={renderResult.jobId}
                    src={renderResult.streamUrl}
                    controls
                    playsInline
                    loop
                    className="w-full h-full object-cover"
                    data-testid="rendered-mp4-video-preview"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <span className="material-symbols-outlined text-primary text-[32px] animate-spin">
                      progress_activity
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Encoding MP4 Short...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Download Controls & File Metadata */}
            <div className="md:col-span-8 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-label-sm text-[10px] font-bold uppercase mb-1">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    {renderResult ? 'MP4 Short Ready to Download' : 'Encoding Timeline...'}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    {project.title}
                  </h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
                    {renderResult
                      ? `${renderResult.outputFilename} • ${(
                          renderResult.fileSizeBytes / 1024
                        ).toFixed(1)} KB • ${spec.resolution} @ ${spec.fps}fps`
                      : `Target: ${spec.resolution} @ ${spec.fps}fps • libx264 CRF 16`}
                  </p>
                </div>
              </div>

              {/* Primary Download Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  data-testid="download-mp4-button"
                  onClick={handleDownloadMp4}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary font-title-md text-title-md font-bold flex items-center gap-2 shadow-[0_0_24px_rgba(255,224,131,0.35)] cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span>Download Short (.MP4)</span>
                </button>

                <button
                  type="button"
                  data-testid="download-srt-button"
                  onClick={handleDownloadSrt}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-body-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    subtitles
                  </span>
                  <span>Download Captions (.SRT)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRenderPackage}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-title-md text-body-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">data_object</span>
                  <span>Manifest (.JSON)</span>
                </button>
              </div>

              {downloadTriggeredToast && (
                <div
                  data-testid="download-toast-banner"
                  className="px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/40 text-primary font-label-sm text-label-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>{downloadTriggeredToast}</span>
                </div>
              )}

              {/* Locked Master Encoding Parameters */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 bg-surface-container rounded-lg">
                  <div className="font-label-sm text-[10px] text-on-surface-variant">
                    Video Codec
                  </div>
                  <div className="font-label-md text-label-md text-on-surface font-mono font-semibold">
                    libx264 · CRF 16
                  </div>
                </div>
                <div className="p-2 bg-surface-container rounded-lg">
                  <div className="font-label-sm text-[10px] text-on-surface-variant">
                    Audio Master
                  </div>
                  <div className="font-label-md text-label-md text-on-surface font-mono font-semibold">
                    AAC 256k · 48kHz
                  </div>
                </div>
                <div className="p-2 bg-surface-container rounded-lg">
                  <div className="font-label-sm text-[10px] text-on-surface-variant">
                    Frame Geometry
                  </div>
                  <div className="font-label-md text-label-md text-secondary font-mono font-semibold">
                    {spec.resolution}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rights & Attribution Pre-Flight Status */}
          <div className="p-3.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-title-md text-body-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>
                Rights &amp; Attribution Pre-Flight Check
              </span>
              <span className="font-label-sm text-label-sm font-mono text-secondary">
                {spec.attributionAppended ? 'MANIFEST EMBEDDED' : 'READY'}
              </span>
            </div>
            {spec.warnings.length > 0 ? (
              <div className="space-y-1">
                {spec.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-secondary">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Source URL ({project.rights.sourceUrl}), creator credit ({project.rights.creatorCredit}), and CC0 audio licenses are verified and embedded into the output MP4 metadata.
              </p>
            )}
          </div>

          {/* Generated FFmpeg Command Pipeline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-title-md text-body-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  terminal
                </span>
                <span>Server-Side FFmpeg Filtergraph &amp; Command</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(spec.command);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 2000);
                }}
                className="px-2.5 py-1 font-label-sm text-label-sm bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedCmd ? 'check' : 'content_copy'}
                </span>
                <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <pre
              data-testid="ffmpeg-command-preview"
              className="p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl font-label-sm text-[11px] font-mono text-on-surface overflow-x-auto leading-relaxed"
            >
              {spec.command}
            </pre>
          </div>

          {renderError && (
            <div className="p-3 bg-error/15 border border-error rounded-xl text-xs text-error">
              {renderError}
            </div>
          )}

          {renderResult && (
            <div
              data-testid="server-render-complete"
              className="p-3.5 bg-surface-container border border-primary/30 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-title-md text-body-sm text-primary">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span>
                    Server-Side Timeline Render Complete ({renderResult.jobId})
                  </span>
                </div>
                <span className="font-mono font-label-sm text-label-sm text-secondary">
                  {renderResult.totalFrames} frames @ CRF 16
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {renderResult.stages.map((st) => (
                  <div key={st.step} className="text-[11px] flex items-start gap-1.5">
                    <span className="font-mono text-secondary font-bold">0{st.step}.</span>
                    <div>
                      <span className="font-medium text-on-surface">{st.name}: </span>
                      <span className="text-on-surface-variant">{st.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-surface-container border-t border-outline-variant/30 flex items-center justify-between gap-4">
          <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap shrink-0">
            Master Output:{' '}
            <code className="text-on-surface font-mono">CRF 16 · libx264 · AAC 256k</code>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRunServerRender}
              disabled={isRendering}
              className="px-3.5 py-2 font-title-md text-body-sm bg-surface-container-high hover:bg-surface-bright disabled:opacity-50 text-on-surface rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isRendering ? 'animate-spin' : ''
                }`}
              >
                {isRendering ? 'progress_activity' : 'refresh'}
              </span>
              <span>
                {isRendering ? 'Rendering Timeline...' : 'Render Timeline Server-Side'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMp4}
              className="px-4 py-2 font-title-md text-body-sm bg-primary hover:bg-primary-fixed-dim text-on-primary rounded-xl flex items-center gap-1.5 shadow-[0_0_20px_rgba(202,190,255,0.35)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">download</span>
              <span>Download Short (.MP4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
