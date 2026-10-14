import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, Info } from 'lucide-react';

export function VesselRiskCards({
  predictions,
  selectedVessel,
  onSelectVessel
}) {
  if (!predictions) return null;

  const cards = [
    {
      key: 'CAD',
      title: 'Overall CAD Status',
      subtitle: 'Global Coronary Artery Disease Risk',
      territory: 'Comprehensive Multi-Vessel Score',
      isGlobal: true
    },
    {
      key: 'LAD',
      title: 'LAD (Left Anterior Descending)',
      subtitle: 'Supplies front wall and apex',
      territory: 'Anterior Myocardium & Septum'
    },
    {
      key: 'LCX',
      title: 'LCX (Left Circumflex)',
      subtitle: 'Supplies side and back of left ventricle',
      territory: 'Lateral Myocardial Free Wall'
    },
    {
      key: 'RCA',
      title: 'RCA (Right Coronary Artery)',
      subtitle: 'Supplies right side and inferior wall',
      territory: 'Inferior & Diaphragmatic Wall'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const pred = predictions[card.key] || {
          percentage: 0,
          confidence_interval: [0, 0],
          uncertainty_margin: 5,
          ci_formatted: '0% ± 5%',
          badge: 'Analyzing',
          badge_color: '#06b6d4',
          is_uncertain: false,
          stenosis_predicted: false
        };

        const isSelected = selectedVessel === card.key;
        const isHighRisk = pred.percentage >= 70;
        const isModerate = pred.percentage >= 50 && pred.percentage < 70;

        return (
          <div
            key={card.key}
            onClick={() => onSelectVessel(isSelected ? null : card.key)}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
              isSelected
                ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                : isHighRisk
                ? 'bg-slate-900/70 border-rose-500/40 hover:border-rose-400 hover:bg-slate-900/85'
                : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/80'
            }`}
          >
            {/* Top row: Title and Badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-heading font-bold text-sm text-white flex items-center gap-1.5">
                  {card.title}
                  {card.isGlobal && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                      Joint
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400 leading-tight">{card.territory}</p>
              </div>
              <ChevronRight
                size={16}
                className={`transition-transform shrink-0 ${isSelected ? 'text-cyan-400 rotate-90' : 'text-gray-500'}`}
              />
            </div>

            {/* Probability & Calibrated Confidence Interval */}
            <div className="my-3 flex items-baseline justify-between">
              <div>
                <span className={`font-mono text-3xl font-extrabold tracking-tight ${
                  isHighRisk ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {pred.percentage}%
                </span>
                <span className="text-xs text-gray-400 ml-1">stenosis prob</span>
              </div>
              
              {/* Confidence margin pill */}
              <div className="text-right">
                <div className="text-[10px] text-gray-400">Calibrated CI:</div>
                <div className="font-mono text-xs text-cyan-300 font-medium">
                  ±{pred.uncertainty_margin}%
                </div>
              </div>
            </div>

            {/* Visual Risk Progress Bar with 50% Clinical Decision Threshold Marker */}
            <div className="space-y-1">
              <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                {/* 50% Threshold marker line */}
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-white/40 z-10"
                  title="50% Significant Stenosis Clinical Cutoff"
                />
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHighRisk
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600'
                      : isModerate
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(3, pred.percentage))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>0%</span>
                <span className="text-amber-400 font-semibold">50% Cutoff</span>
                <span>100%</span>
              </div>
            </div>

            {/* Warning or Status Badge */}
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
              {pred.is_uncertain ? (
                <span className="flex items-center gap-1 text-amber-300 font-medium text-[11px] bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                  <AlertTriangle size={12} className="text-amber-400" />
                  Borderline / High Uncertainty
                </span>
              ) : pred.stenosis_predicted ? (
                <span className="flex items-center gap-1 text-rose-300 font-medium text-[11px] bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                  <Activity size={12} className="text-rose-400" />
                  ≥50% Stenosis Predicted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-300 font-medium text-[11px] bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  Patent / Low Stenosis
                </span>
              )}

              <span className="text-[10px] text-cyan-400 hover:underline">
                {isSelected ? 'Selected' : 'Inspect 3D'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
