import React, { useState } from 'react';
import { BarChart3, HelpCircle, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

export function ShapWaterfall({
  predictions,
  selectedVessel,
  onSelectVessel
}) {
  const [activeTab, setActiveTab] = useState(selectedVessel || 'LAD');

  // Sync tab with external selectedVessel if set
  React.useEffect(() => {
    if (selectedVessel) {
      setActiveTab(selectedVessel);
    }
  }, [selectedVessel]);

  const attributions = predictions?.feature_attributions?.[activeTab] || [];

  const vesselTerritoryNames = {
    CAD: "Global Multivessel Coronary Artery Disease",
    LAD: "LAD (Left Anterior Descending) • Anterior Wall & Septum",
    LCX: "LCX (Left Circumflex) • Lateral Ventricular Wall",
    RCA: "RCA (Right Coronary Artery) • Inferior Wall & Base"
  };

  const vesselClinicalContext = {
    CAD: "Global CAD is heavily weighted by systemic metabolic syndrome, age, typical angina, and overall echocardiographic ejection fraction.",
    LAD: "LAD is specifically driven by localized Anterior ST Elevation, Anterior RWMA (echo score 1 or 4), hypertension, and peak cardiac enzyme markers.",
    LCX: "LCX is specifically flagged by Lateral leads ST changes, Lateral wall hypokinesia (echo score 3), dyslipidemia, and atypical functional class.",
    RCA: "RCA is heavily attributed to Inferior lead ECG changes (II, III, aVF), Inferior RWMA (echo score 2), conduction blocks (BBB), and systemic blood pressure."
  };

  return (
    <div className="glass-panel p-5 border border-cyan-500/20 shadow-xl">
      {/* Header & Vessel Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-cyan-400" />
            <h3 className="font-heading font-bold text-base text-white">
              Vessel-Specific Feature Attribution Mapping
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
              SHAP Interpretability
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Isolated multivariable risk factor decomposition explaining why each vessel was independently flagged.
          </p>
        </div>

        {/* Vessel Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10">
          {['CAD', 'LAD', 'LCX', 'RCA'].map((vessel) => (
            <button
              key={vessel}
              onClick={() => {
                setActiveTab(vessel);
                if (onSelectVessel) onSelectVessel(vessel === 'CAD' ? null : vessel);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === vessel
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {vessel}
            </button>
          ))}
        </div>
      </div>

      {/* Vessel Territory Subtitle */}
      <div className="my-3 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium">
          Active Attribution Target: <strong className="text-cyan-300">{vesselTerritoryNames[activeTab]}</strong>
        </span>
        <span className="text-gray-400 text-[11px] font-mono">
          Predicted Stenosis: <strong className="text-white">{predictions?.[activeTab]?.percentage || 0}%</strong>
        </span>
      </div>

      {/* Feature Attribution Horizontal Bars */}
      <div className="space-y-3 my-4">
        {attributions.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs italic">
            Patient features match population reference distribution or attributions are below marginal threshold.
          </div>
        ) : (
          attributions.map((item, idx) => {
            const isElevating = item.attribution > 0;
            const absAttribution = Math.abs(item.attribution);
            const barWidthPercent = Math.min(100, Math.max(10, Math.round(absAttribution * 400)));

            return (
              <div key={idx} className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {isElevating ? (
                      <ArrowUpRight size={14} className="text-rose-400 shrink-0" />
                    ) : (
                      <ArrowDownRight size={14} className="text-emerald-400 shrink-0" />
                    )}
                    <span className="font-semibold text-gray-200">{item.feature}</span>
                    <span className="text-gray-500 text-[11px]">({item.value})</span>
                  </div>

                  <span className={`font-mono font-bold text-xs ${isElevating ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isElevating ? `+${(absAttribution * 100).toFixed(1)}%` : `-${(absAttribution * 100).toFixed(1)}%`}
                  </span>
                </div>

                {/* Attribution Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  {!isElevating && (
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full ml-auto"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  )}
                  {isElevating && (
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 rounded-full"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  )}
                </div>

                {/* Description */}
                <div className="text-[11px] text-gray-400 leading-snug">
                  {item.description}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clinical Domain Context Callout */}
      <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-gray-300">
        <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-cyan-300">Anatomical Attribution Rationale: </span>
          <span>{vesselClinicalContext[activeTab]}</span>
        </div>
      </div>
    </div>
  );
}
