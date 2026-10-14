import React from 'react';
import { Heart, Activity, FileText, AlertTriangle, ShieldCheck, UserCheck, ChevronDown } from 'lucide-react';

export function Header({
  presets = [],
  currentPresetId,
  onSelectPreset,
  onOpenReportModal,
  metrics,
  isSimulatingCounterfactual
}) {
  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
      {/* Top Clinical Safety Disclaimer Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-cyan-500/15 border-b border-amber-500/25 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-200">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-300">CLINICAL SAFETY DISCLAIMER:</span>
          <span className="text-gray-300 hidden md:inline">
            This platform is an AI-powered investigational decision support & educational simulation tool. Grounded in multimodal ML; not a substitute for formal diagnostic coronary angiography or physician judgment.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px] border border-cyan-500/30">
            Track A: Cardiovascular Risk
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30 hidden sm:inline">
            Z-Alizadeh Sani Benchmark
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.45)]">
            <Heart size={22} className="text-white fill-white animate-heartbeat" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-extrabold text-white tracking-tight">
                CardioTwin<span className="text-rose-500">3D</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                v2.0 AI Digital Twin
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              Interactive 3D Hemodynamic Simulation & Actionable Interpretability
            </p>
          </div>
        </div>

        {/* Model CV Validation Stats Pill */}
        {metrics?.CAD && (
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-gray-400">Validated 5-Fold CV:</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-cyan-300">CAD AUC: <strong>{(metrics.CAD.roc_auc * 100).toFixed(1)}%</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-rose-300">LAD AUC: <strong>{(metrics.LAD.roc_auc * 100).toFixed(1)}%</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-amber-300">LCX: <strong>{(metrics.LCX.roc_auc * 100).toFixed(1)}%</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-purple-300">RCA: <strong>{(metrics.RCA.roc_auc * 100).toFixed(1)}%</strong></span>
            </div>
          </div>
        )}

        {/* Patient Preset Selector Carousel & Export Actions */}
        <div className="flex items-center gap-3">
          {/* Preset Selector */}
          <div className="relative">
            <select
              value={currentPresetId || ''}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="appearance-none bg-slate-900 border border-cyan-500/40 text-cyan-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-slate-900 text-gray-200">
                  {preset.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
          </div>

          {/* Export 3D Clinical PDF Button */}
          <button
            onClick={onOpenReportModal}
            className="btn-action text-xs font-medium flex items-center gap-1.5"
            title="Generate comprehensive diagnostic PDF report"
          >
            <FileText size={15} className="text-cyan-400" />
            <span className="hidden sm:inline">Export Clinical Report</span>
          </button>
        </div>
      </div>
    </header>
  );
}
