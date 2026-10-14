import React, { useState, useEffect } from 'react';
import { Bot, FileText, Copy, Check, Sparkles, AlertTriangle, ShieldCheck, Stethoscope } from 'lucide-react';

export function ClinicalCopilot({
  predictions,
  features,
  patientId,
  copilotData,
  onGenerateCopilot,
  isLoading
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (predictions && features && onGenerateCopilot && !copilotData) {
      onGenerateCopilot();
    }
  }, [predictions, features, onGenerateCopilot, copilotData]);

  const handleCopy = () => {
    if (copilotData?.report_markdown) {
      navigator.clipboard.writeText(copilotData.report_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-panel p-5 border border-cyan-500/20 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-white">
                Clinician Diagnostic Copilot
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                AI Diagnostic Summary
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Automated synthesis of multivariable SHAP attributions, echo wall motion, and clinical vitals.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            title="Copy structured narrative to clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={onGenerateCopilot}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/40 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:opacity-50"
          >
            <Sparkles size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Synthesizing...' : 'Re-Analyze'}</span>
          </button>
        </div>
      </div>

      {/* Structured Diagnostic Cards */}
      {copilotData && (
        <div className="my-4 space-y-3">
          {/* Diagnostic Urgency Pill */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between text-xs font-semibold"
            style={{
              background: `${copilotData.urgency_color}18`,
              borderColor: `${copilotData.urgency_color}40`,
              color: copilotData.urgency_color
            }}
          >
            <div className="flex items-center gap-2">
              <Stethoscope size={16} />
              <span>Diagnostic Stratification: {copilotData.urgency}</span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40">
              Primary Culprit: {copilotData.culprit_vessel} ({copilotData.culprit_score}%)
            </span>
          </div>

          {/* Formatted Markdown / Structured Content */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/5 font-mono text-xs text-gray-300 space-y-3 leading-relaxed max-h-96 overflow-y-auto">
            {copilotData.report_markdown.split('\n\n').map((para, i) => {
              if (para.startsWith('###')) {
                return <h4 key={i} className="font-heading text-sm font-bold text-cyan-300 border-b border-white/10 pb-1">{para.replace('###', '').trim()}</h4>;
              }
              if (para.startsWith('**') && para.includes(':**')) {
                const parts = para.split(':**');
                const title = parts[0].replace(/\*\*/g, '').trim();
                const content = parts.slice(1).join(':**').trim();
                return (
                  <div key={i} className="space-y-1">
                    <span className="text-cyan-400 font-semibold text-xs tracking-wide uppercase font-sans block">{title}:</span>
                    <span className="text-gray-300 font-mono text-xs block whitespace-pre-line">{content}</span>
                  </div>
                );
              }
              return <p key={i} className="whitespace-pre-line">{para}</p>;
            })}
          </div>

          {/* Recommended Imaging & Action Callout */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/20 via-slate-900 to-cyan-950/20 border border-rose-500/25 flex items-start gap-3 text-xs">
            <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-300">Actionable Next Step Recommendation:</div>
              <div className="text-gray-200 mt-0.5">
                {copilotData.imaging_recommendation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
