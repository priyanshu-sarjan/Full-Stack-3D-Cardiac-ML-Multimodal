import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, RefreshCw, Zap, TrendingDown, Check, Sparkles, AlertCircle } from 'lucide-react';

export function CounterfactualSimulator({
  baselineFeatures,
  onSimulate,
  simulatedPredictions,
  riskDeltas,
  isLiveApplied,
  onToggleLiveApply
}) {
  // Modifiable clinical factors
  const [interventions, setInterventions] = useState({
    BP: baselineFeatures?.BP || 135,
    LDL: baselineFeatures?.LDL || 140,
    HDL: baselineFeatures?.HDL || 40,
    TG: baselineFeatures?.TG || 180,
    FBS: baselineFeatures?.FBS || 110,
    'Current Smoker': baselineFeatures?.['Current Smoker'] || 0,
    PR: baselineFeatures?.PR || 75,
    Weight: baselineFeatures?.Weight || 80
  });

  // Keep interventions synced when baseline patient changes
  useEffect(() => {
    if (baselineFeatures) {
      setInterventions({
        BP: Number(baselineFeatures.BP) || 135,
        LDL: Number(baselineFeatures.LDL) || 140,
        HDL: Number(baselineFeatures.HDL) || 40,
        TG: Number(baselineFeatures.TG) || 180,
        FBS: Number(baselineFeatures.FBS) || 110,
        'Current Smoker': Number(baselineFeatures['Current Smoker']) || 0,
        PR: Number(baselineFeatures.PR) || 75,
        Weight: Number(baselineFeatures.Weight) || 80
      });
    }
  }, [baselineFeatures]);

  // Debounced API call to /api/counterfactual
  useEffect(() => {
    const timer = setTimeout(() => {
      if (baselineFeatures && onSimulate) {
        onSimulate(interventions);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [interventions, baselineFeatures, onSimulate]);

  const handleChange = (field, val) => {
    setInterventions((prev) => ({
      ...prev,
      [field]: val
    }));
  };

  // 1-Click Guideline-Directed Optimization Preset (AHA/ACC GDMT targets)
  const applyGDMT = () => {
    setInterventions((prev) => ({
      ...prev,
      BP: 118,       // Target SBP < 120 mmHg
      LDL: 55,       // Target LDL < 55 mg/dL on high-intensity statin
      HDL: 48,       // Improved HDL
      TG: 125,       // Target TG < 150 mg/dL
      FBS: 92,       // Glycemic optimization
      'Current Smoker': 0, // Complete smoking cessation
      PR: 68
    }));
  };

  const resetToBaseline = () => {
    if (baselineFeatures) {
      setInterventions({
        BP: Number(baselineFeatures.BP) || 135,
        LDL: Number(baselineFeatures.LDL) || 140,
        HDL: Number(baselineFeatures.HDL) || 40,
        TG: Number(baselineFeatures.TG) || 180,
        FBS: Number(baselineFeatures.FBS) || 110,
        'Current Smoker': Number(baselineFeatures['Current Smoker']) || 0,
        PR: Number(baselineFeatures.PR) || 75,
        Weight: Number(baselineFeatures.Weight) || 80
      });
    }
  };

  const cadDelta = riskDeltas?.CAD || 0;
  const isBenefit = cadDelta < 0;

  return (
    <div className="glass-panel p-5 border border-cyan-500/20 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" />
            <h3 className="font-heading font-bold text-base text-white">
              Actionable "What-If" Counterfactual Engine
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
              Digital Twin Mode
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Interactively modulate patient risk factors in real-time to simulate clinical therapeutic response.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={applyGDMT}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/40 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            title="Apply AHA/ACC Guideline-Directed Medical Therapy targets"
          >
            <Sparkles size={14} className="text-emerald-400" /> 1-Click GDMT Target
          </button>
          <button
            onClick={resetToBaseline}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs flex items-center gap-1 transition-all"
            title="Reset to patient baseline values"
          >
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Simulated Delta Risk Banner */}
      <div className="my-4 p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
            isBenefit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}>
            <TrendingDown size={22} className={!isBenefit ? 'rotate-180' : ''} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Therapeutic Risk Reduction Delta:</div>
            <div className={`font-mono text-xl font-extrabold ${isBenefit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isBenefit ? `${cadDelta}%` : `+${cadDelta}%`} CAD Risk
            </div>
          </div>
        </div>

        {/* Vessel by vessel deltas */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-2 py-1 rounded bg-black/40 border border-white/5">
            <span className="text-gray-400">LAD: </span>
            <span className={riskDeltas?.LAD < 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {riskDeltas?.LAD > 0 ? `+${riskDeltas?.LAD}%` : `${riskDeltas?.LAD || 0}%`}
            </span>
          </div>
          <div className="px-2 py-1 rounded bg-black/40 border border-white/5">
            <span className="text-gray-400">LCX: </span>
            <span className={riskDeltas?.LCX < 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {riskDeltas?.LCX > 0 ? `+${riskDeltas?.LCX}%` : `${riskDeltas?.LCX || 0}%`}
            </span>
          </div>
          <div className="px-2 py-1 rounded bg-black/40 border border-white/5">
            <span className="text-gray-400">RCA: </span>
            <span className={riskDeltas?.RCA < 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {riskDeltas?.RCA > 0 ? `+${riskDeltas?.RCA}%` : `${riskDeltas?.RCA || 0}%`}
            </span>
          </div>
        </div>

        {/* Live 3D Sync Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-cyan-200">
            <input
              type="checkbox"
              checked={isLiveApplied}
              onChange={(e) => onToggleLiveApply(e.target.checked)}
              className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
            />
            <span>Apply Live to 3D Heart</span>
          </label>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Systolic BP */}
        <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Systolic Blood Pressure (BP):</span>
            <span className="font-mono text-cyan-300 font-bold">{interventions.BP} mmHg</span>
          </div>
          <input
            type="range"
            min="90"
            max="190"
            value={interventions.BP}
            onChange={(e) => handleChange('BP', Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Optimal (&lt;120)</span>
            <span>Hypertensive (&gt;140)</span>
          </div>
        </div>

        {/* LDL Cholesterol */}
        <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">LDL Cholesterol:</span>
            <span className="font-mono text-cyan-300 font-bold">{interventions.LDL} mg/dL</span>
          </div>
          <input
            type="range"
            min="40"
            max="230"
            value={interventions.LDL}
            onChange={(e) => handleChange('LDL', Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Statin Target (&lt;55)</span>
            <span>Elevated (&gt;160)</span>
          </div>
        </div>

        {/* Fasting Blood Sugar (FBS) */}
        <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Fasting Blood Sugar (FBS):</span>
            <span className="font-mono text-cyan-300 font-bold">{interventions.FBS} mg/dL</span>
          </div>
          <input
            type="range"
            min="70"
            max="240"
            value={interventions.FBS}
            onChange={(e) => handleChange('FBS', Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Normal (&lt;100)</span>
            <span>Diabetic (&gt;126)</span>
          </div>
        </div>

        {/* Triglycerides (TG) */}
        <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Triglycerides (TG):</span>
            <span className="font-mono text-cyan-300 font-bold">{interventions.TG} mg/dL</span>
          </div>
          <input
            type="range"
            min="50"
            max="400"
            step="5"
            value={interventions.TG}
            onChange={(e) => handleChange('TG', Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Normal (&lt;150)</span>
            <span>High (&gt;200)</span>
          </div>
        </div>

        {/* HDL Cholesterol */}
        <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">HDL ("Good") Cholesterol:</span>
            <span className="font-mono text-cyan-300 font-bold">{interventions.HDL} mg/dL</span>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            value={interventions.HDL}
            onChange={(e) => handleChange('HDL', Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Low / At Risk (&lt;40)</span>
            <span>Protective (&gt;50)</span>
          </div>
        </div>

        {/* Smoking Status */}
        <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Current Smoker Status:</span>
            <span className={`font-semibold ${interventions['Current Smoker'] ? 'text-rose-400' : 'text-emerald-400'}`}>
              {interventions['Current Smoker'] ? 'Active Smoker' : 'Non-Smoker / Cessation'}
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleChange('Current Smoker', 0)}
              className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all ${
                !interventions['Current Smoker']
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              Non-Smoker
            </button>
            <button
              onClick={() => handleChange('Current Smoker', 1)}
              className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-all ${
                interventions['Current Smoker']
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              Active Smoker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
