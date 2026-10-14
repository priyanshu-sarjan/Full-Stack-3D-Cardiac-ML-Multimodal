import React, { useMemo } from 'react';
import * as THREE from 'three';
import { X, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export function LumenCrossSection({ vesselName, stenosisProb = 0.5, onClose }) {
  const stenosisPercent = Math.round(stenosisProb * 100);
  const isSevere = stenosisPercent >= 70;
  const isModerate = stenosisPercent >= 50 && stenosisPercent < 70;

  // Normal reference vessel diameter: ~3.5 mm
  const referenceDiameter = 3.5;
  // Minimum lumen diameter
  const mld = (referenceDiameter * Math.sqrt(Math.max(0.05, 1.0 - stenosisProb))).toFixed(2);
  // Plaque burden percentage
  const plaqueBurden = Math.min(95, Math.round(stenosisProb * 90 + 5));

  // Determine histology vulnerability
  const plaqueType = isSevere 
    ? "Thin-Cap Fibroatheroma (TCFA) with Necrotic Core"
    : isModerate
    ? "Fibroatheroma with Intermediate Lipid Pool"
    : "Intimal Thickening / Stable Fibrous Plaque";

  return (
    <div className="absolute top-6 right-6 w-96 glass-panel-glow p-5 z-40 animate-fade-in text-white shadow-2xl border border-cyan-500/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
          <h3 className="font-heading text-lg font-bold text-cyan-300">
            {vesselName} Intravascular Lumen
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
          title="Close cross-section"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2D/3D Diagrammatic Vessel Cross Section */}
      <div className="my-4 flex flex-col items-center justify-center p-3 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
        <svg viewBox="0 0 200 200" className="w-48 h-48">
          {/* Outer Adventitia */}
          <circle cx="100" cy="100" r="92" fill="#1e293b" stroke="#475569" strokeWidth="4" />
          
          {/* Tunica Media (Smooth Muscle) */}
          <circle cx="100" cy="100" r="82" fill="#334155" stroke="#64748b" strokeWidth="3" />

          {/* Intimal Base */}
          <circle cx="100" cy="100" r="74" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />

          {/* Atherosclerotic Plaque (Lipid Core + Fibrous Cap) */}
          {stenosisProb > 0.15 && (
            <path
              d={`M 26 100 A 74 74 0 0 1 174 100 Q 150 ${100 - stenosisProb * 80} 100 ${100 - stenosisProb * 65} Q 50 ${100 - stenosisProb * 80} 26 100 Z`}
              fill="#d97706"
              stroke="#fbbf24"
              strokeWidth="2"
              opacity="0.88"
            />
          )}

          {/* Calcium Nodules inside Plaque */}
          {stenosisProb > 0.5 && (
            <>
              <ellipse cx="85" cy="65" rx="12" ry="7" fill="#fef08a" stroke="#ffffff" strokeWidth="1.5" />
              <ellipse cx="120" cy="72" rx="10" ry="6" fill="#fef08a" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}

          {/* Residual Patent Flow Lumen */}
          <circle
            cx="100"
            cy={100 + stenosisProb * 24}
            r={Math.max(12, 74 * Math.sqrt(Math.max(0.06, 1.0 - stenosisProb)))}
            fill={isSevere ? '#b91c1c' : '#ef4444'}
            stroke="#ff2a5f"
            strokeWidth="3"
            className="animate-pulse"
          />

          {/* Blood flow center marker */}
          <circle cx="100" cy={100 + stenosisProb * 24} r="3" fill="#ffffff" />
        </svg>

        {/* Legend Overlay */}
        <div className="flex items-center gap-3 text-xs mt-2 text-gray-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            Patent Lumen ({100 - stenosisPercent}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            Atheroma Plaque ({stenosisPercent}%)
          </span>
          {stenosisProb > 0.5 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-200 inline-block"></span>
              Calcification
            </span>
          )}
        </div>
      </div>

      {/* Morphometric Metrics */}
      <div className="space-y-2 text-sm bg-slate-900/60 p-3 rounded-lg border border-white/5">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Predicted Stenosis:</span>
          <span className={`font-mono font-bold ${isSevere ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stenosisPercent}% {isSevere ? '(Critical)' : isModerate ? '(Significant)' : '(Mild)'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Min Lumen Diameter (MLD):</span>
          <span className="font-mono text-cyan-300">{mld} mm <span className="text-gray-500 text-xs">/ 3.5mm ref</span></span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Plaque Burden:</span>
          <span className="font-mono text-amber-300">{plaqueBurden}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Hemodynamic State:</span>
          <span className={`font-medium ${isSevere ? 'text-rose-400' : 'text-emerald-300'}`}>
            {isSevere ? 'Turbulent / Flow Limiting' : 'Laminar Perfusion'}
          </span>
        </div>
      </div>

      {/* Plaque Pathology Note */}
      <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-200">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-amber-300">{plaqueType}</div>
          <div className="text-gray-300 mt-0.5">
            {isSevere 
              ? "High necrotic lipid ratio and thin fibrous cap indicate high vulnerability for plaque fissure and acute coronary thrombosis."
              : "Stable fibrotic plaque architecture with preserved luminal cross-sectional reserve."}
          </div>
        </div>
      </div>
    </div>
  );
}
