import React, { useState } from 'react';
import {
  X,
  Film,
  CheckCircle2,
  ShieldAlert,
  Terminal,
  Download,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import {
  type ProjectState,
  buildFfmpegRenderSpec,
  computeProjectRightsState,
} from '../editor/engine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
}

interface ServerRenderResponse {
  status: string;
  jobId: string;
  completedAt: string;
  outputFilename: string;
  totalFrames: number;
  stages: Array<{ step: number; name: string; detail: string }>;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, project }) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<ServerRenderResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const spec = buildFfmpegRenderSpec(project);
  const rightsState = computeProjectRightsState(project.baseDescription, project.rights);

  const handleRunServerRender = async () => {
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
    const a = document.createElement('a');
    a.href = url;
    a.download = renderResult?.outputFilename.replace('.mp4', '_master_manifest.json') || 'clipforge_render.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-[#14161A] border border-[#23262F] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#23262F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 text-[#E56B38]" />
            <h2 id="export-modal-title" className="text-sm font-display font-bold text-[#F1F3F5]">
              Server-Side FFmpeg Master Export (CRF 16 · AAC 256k)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1 text-[#8E95A5] hover:text-[#F1F3F5] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Locked Master Encoding Parameters */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded">
              <div className="text-[11px] text-[#8E95A5]">Video Codec / Quality</div>
              <div className="text-xs font-mono font-semibold text-[#F1F3F5] mt-0.5">
                libx264 · CRF 16
              </div>
            </div>
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded">
              <div className="text-[11px] text-[#8E95A5]">Audio Master</div>
              <div className="text-xs font-mono font-semibold text-[#F1F3F5] mt-0.5">
                AAC 256k · 48kHz
              </div>
            </div>
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded">
              <div className="text-[11px] text-[#8E95A5]">Frame Geometry</div>
              <div className="text-xs font-mono font-semibold text-[#F1F3F5] mt-0.5">
                {spec.resolution} @ {spec.fps}fps
              </div>
            </div>
            <div className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded">
              <div className="text-[11px] text-[#8E95A5]">Estimated Master Size</div>
              <div className="text-xs font-mono font-semibold text-[#F59E0B] mt-0.5">
                ~{spec.estimatedSizeMb} MB
              </div>
            </div>
          </div>

          {/* Rights & Attribution Pre-Flight Status */}
          <div className="p-3.5 bg-[#0B0C0E] border border-[#23262F] rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-semibold text-[#F1F3F5]">
                Rights & Attribution Pre-Flight Check
              </span>
              <span className="text-[11px] font-mono text-[#10B981]">
                {spec.attributionAppended ? 'MANIFEST EMBEDDED' : 'READY'}
              </span>
            </div>
            {spec.warnings.length > 0 ? (
              <div className="space-y-1">
                {spec.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8E95A5]">
                Source URL, creator credit, and CC0 audio licenses are verified and embedded into the output description metadata.
              </p>
            )}
          </div>

          {/* Generated FFmpeg Command Pipeline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-semibold text-[#F1F3F5] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#E56B38]" />
                <span>Server-Side FFmpeg Filtergraph & Command</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(spec.command);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 2000);
                }}
                className="px-2 py-1 text-[11px] bg-[#0B0C0E] hover:bg-[#1C1F26] text-[#8E95A5] hover:text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <pre
              data-testid="ffmpeg-command-preview"
              className="p-3 bg-[#0B0C0E] border border-[#23262F] rounded text-[11px] font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed"
            >
              {spec.command}
            </pre>
          </div>

          {/* Server Render Pipeline Progress / Result */}
          {renderError && (
            <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444] rounded text-xs text-[#EF4444]">
              {renderError}
            </div>
          )}

          {renderResult && (
            <div
              data-testid="server-render-complete"
              className="p-4 bg-[#10B981]/10 border border-[#10B981]/40 rounded space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#10B981]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Server-Side Timeline Render Complete ({renderResult.jobId})</span>
                </div>
                <span className="font-mono text-[11px] text-[#F1F3F5]">
                  {renderResult.totalFrames} frames @ CRF 16
                </span>
              </div>

              <div className="space-y-1.5">
                {renderResult.stages.map((st) => (
                  <div key={st.step} className="text-[11px] flex items-start gap-2">
                    <span className="font-mono text-[#10B981]">0{st.step}.</span>
                    <div>
                      <span className="font-medium text-[#F1F3F5]">{st.name}: </span>
                      <span className="text-[#8E95A5]">{st.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#0E1014] border-t border-[#23262F] flex items-center justify-between gap-4">
          <span className="text-xs text-[#8E95A5] whitespace-nowrap shrink-0">
            Target Output: <code className="text-[#F1F3F5]">CRF 16 · libx264 · AAC 256k</code>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {renderResult && (
              <button
                type="button"
                onClick={handleDownloadRenderPackage}
                className="px-3.5 py-2 text-xs font-medium bg-[#1C1F26] hover:bg-[#272B36] text-[#F1F3F5] border border-[#23262F] rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Download Master Manifest</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRunServerRender}
              disabled={isRendering}
              className="px-4 py-2 text-xs font-semibold bg-[#E56B38] hover:bg-[#d45d2c] disabled:opacity-50 text-white rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering Timeline...</span>
                </>
              ) : (
                <>
                  <Film className="w-3.5 h-3.5" />
                  <span>Render Timeline Server-Side</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
