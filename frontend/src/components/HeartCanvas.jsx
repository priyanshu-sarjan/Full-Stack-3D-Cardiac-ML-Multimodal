import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Heart3DModel, AnatomicalSculptedFallback } from './Heart3DModel';
import { CoronaryVessels } from './CoronaryVessels';
import { ThoraxContext } from './ThoraxContext';
import { LumenCrossSection } from './LumenCrossSection';
import { Eye, Layers, Camera, Heart, Activity, AlertCircle, Sparkles, Sliders } from 'lucide-react';

// Camera controller helper
function CameraController({ targetPosition, targetLookAt }) {
  const { camera } = useThree();
  useEffect(() => {
    if (targetPosition) {
      camera.position.set(...targetPosition);
      if (targetLookAt) camera.lookAt(...targetLookAt);
    }
  }, [targetPosition, targetLookAt, camera]);
  return null;
}

export function HeartCanvas({
  predictions,
  selectedVessel,
  onSelectVessel,
  heartRate = 72,
  onHeartRateChange,
  canvasRef
}) {
  const [layerDepth, setLayerDepth] = useState(2); // 1 = Thorax, 2 = Realistic Heart, 3 = Lumen Plaque
  const [cameraPreset, setCameraPreset] = useState('anterior');
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showVesselFlow, setShowVesselFlow] = useState(true);
  const [showAnatomyLabels, setShowAnatomyLabels] = useState(true);

  // Camera presets
  const cameraConfigs = {
    anterior: { pos: [0, 0.1, 4.4], look: [0, -0.15, 0], label: "Anterior (LAD)" },
    lateral: { pos: [-3.8, 0.3, 2.0], look: [-0.3, -0.15, 0], label: "Lateral (LCX)" },
    inferior: { pos: [2.2, -2.8, 2.8], look: [0.1, -0.3, 0], label: "Inferior (RCA)" },
    overview: { pos: [2.2, 1.8, 4.0], look: [0, 0, 0], label: "Thoracic" }
  };

  const handleHoverVessel = (vesselName, event) => {
    if (!vesselName) {
      setHoveredData(null);
      return;
    }
    const vesselPred = predictions?.[vesselName] || {};
    setHoveredData({
      vessel: vesselName,
      prob: vesselPred.percentage || 50,
      ci: vesselPred.ci_formatted || '50% ± 8%',
      badge: vesselPred.badge || 'Analyzing',
      badgeColor: vesselPred.badge_color || '#06b6d4',
      isUncertain: vesselPred.is_uncertain || false,
      flowSpeed: (Math.max(12, 42 * (1.0 - (vesselPred.probability || 0.1) * 0.7))).toFixed(1)
    });
    if (event?.clientX) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[540px] rounded-2xl overflow-hidden glass-panel border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-[#080d1a] to-black select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        ref={canvasRef}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <PerspectiveCamera makeDefault position={cameraConfigs[cameraPreset].pos} fov={45} />
        <CameraController
          targetPosition={cameraConfigs[cameraPreset].pos}
          targetLookAt={cameraConfigs[cameraPreset].look}
        />

        {/* Ambient & Studio Biological Illumination */}
        <ambientLight intensity={0.9} color="#fff1f2" />
        <directionalLight position={[6, 9, 6]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-7, -3, -4]} intensity={0.9} color="#38bdf8" />
        <pointLight position={[0, 1.5, 3.8]} intensity={1.2} color="#ffe4e6" distance={7} />
        <pointLight position={[-2.5, -0.5, 2.2]} intensity={0.9} color="#f43f5e" distance={5} />
        <pointLight position={[2.5, 0.5, 2.2]} intensity={0.7} color="#fb7185" distance={5} />

        {/* Layer 1: Thoracic Context */}
        <ThoraxContext visible={layerDepth === 1} />

        {/* Layer 2: Real Anatomical Pumping Human Heart */}
        <Suspense fallback={<AnatomicalSculptedFallback predictions={predictions} heartRate={heartRate} />}>
          <Heart3DModel
            predictions={predictions}
            layerDepth={layerDepth}
            heartRate={heartRate}
            selectedVessel={selectedVessel}
          />
        </Suspense>

        {/* Dynamic Coronary Artery Flow Shaders */}
        {showVesselFlow && (
          <CoronaryVessels
            predictions={predictions}
            selectedVessel={selectedVessel}
            onSelectVessel={(vessel) => {
              onSelectVessel(vessel);
              if (vessel) setLayerDepth(3);
            }}
            onHoverVessel={handleHoverVessel}
            heartRate={heartRate}
          />
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={2.0}
          maxDistance={7.0}
        />
      </Canvas>

      {/* Clean Anatomical Guide Badges (Right Atrium & Right Ventricle) */}
      {showAnatomyLabels && (
        <div className="absolute top-16 right-4 flex flex-col gap-2 z-10 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-right pointer-events-auto shadow-lg">
            <div className="text-[11px] font-heading font-bold text-white flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Right Atrium
            </div>
            <div className="text-[10px] text-gray-300">Receives oxygen-poor blood from body</div>
          </div>
          <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-right pointer-events-auto shadow-lg">
            <div className="text-[11px] font-heading font-bold text-white flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Right Ventricle
            </div>
            <div className="text-[10px] text-gray-300">Pumps deoxygenated blood to lungs</div>
          </div>
        </div>
      )}

      {/* Floating 3D Hover Tooltip */}
      {hoveredData && (
        <div
          className="tooltip-hud"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-heading font-bold text-cyan-300 text-sm">
              Coronary Artery: {hoveredData.vessel}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono font-bold"
              style={{ background: `${hoveredData.badgeColor}22`, color: hoveredData.badgeColor }}
            >
              {hoveredData.prob}%
            </span>
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div>Calibrated CI: <span className="font-mono text-white font-medium">{hoveredData.ci}</span></div>
            <div>Hemodynamic Velocity: <span className="font-mono text-cyan-300">{hoveredData.flowSpeed} cm/s</span></div>
            <div className="text-[11px] text-gray-400 mt-1 italic">{hoveredData.badge}</div>
            {hoveredData.isUncertain && (
              <div className="flex items-center gap-1 text-amber-300 text-[10px] font-semibold mt-1">
                <AlertCircle size={12} /> Borderline / High Uncertainty
              </div>
            )}
            <div className="text-[10px] text-cyan-400 font-semibold pt-1">
              Click vessel for intravascular lumen cross-section
            </div>
          </div>
        </div>
      )}

      {/* Top HUD Controls: Layers & Flow Toggle */}
      <div className="absolute top-3 left-4 flex flex-wrap items-center gap-2 z-20">
        <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setLayerDepth(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 1
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={13} /> 1. Thoracic Context
          </button>
          <button
            onClick={() => setLayerDepth(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 2
                ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Heart size={13} /> 2. Real 3D Heart
          </button>
          <button
            onClick={() => {
              setLayerDepth(3);
              if (!selectedVessel) onSelectVessel('LAD');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 3
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye size={13} /> 3. Lumen Plaque
          </button>
        </div>

        {/* Toggle Anatomical Labels */}
        <button
          onClick={() => setShowAnatomyLabels(!showAnatomyLabels)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 backdrop-blur-md border transition-all ${
            showAnatomyLabels
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-900/80 text-gray-400 border-white/10 hover:text-white'
          }`}
          title="Toggle Anatomy Labels"
        >
          Anatomy Labels
        </button>
      </div>

      {/* Top Right: Camera Presets */}
      <div className="absolute top-3 right-4 flex items-center gap-1 z-20 bg-slate-900/80 p-1 rounded-xl border border-white/10 backdrop-blur-md">
        <span className="text-[11px] text-gray-400 font-medium px-2 flex items-center gap-1">
          <Camera size={12} /> View:
        </span>
        {Object.entries(cameraConfigs).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCameraPreset(key)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
              cameraPreset === key
                ? 'bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-400/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {config.label.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Bottom HUD: Live Rate Slider & Echo Wall Motion */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-3 z-20 pointer-events-none">
        {/* Heart Rate Slider */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/85 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Heart size={15} className="text-rose-500 animate-heartbeat" />
            <span className="text-xs font-semibold text-gray-200">Rate:</span>
            <span className="font-mono text-rose-400 font-bold text-xs w-14">{heartRate} BPM</span>
          </div>
          <input
            type="range"
            min="45"
            max="140"
            value={heartRate}
            onChange={(e) => onHeartRateChange(Number(e.target.value))}
            className="w-24 accent-rose-500 cursor-pointer"
            title="Adjust Physiological Pumping Rate"
          />
        </div>

        {/* Wall Motion Status Tags */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md text-xs">
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <Activity size={13} className="text-cyan-400" /> Echo Wall Motion:
          </span>
          <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${
            predictions?.myocardial_wall_motion?.anterior_septal?.motion_score < 0.6 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            Anterior (LAD): {predictions?.myocardial_wall_motion?.anterior_septal?.status || 'Normal'}
          </span>
          <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${
            predictions?.myocardial_wall_motion?.inferior?.motion_score < 0.6 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            Inferior (RCA): {predictions?.myocardial_wall_motion?.inferior?.status || 'Normal'}
          </span>
        </div>
      </div>

      {/* Layer 3: Intravascular Plaque Modal Overlay if a vessel is active */}
      {layerDepth === 3 && selectedVessel && (
        <LumenCrossSection
          vesselName={selectedVessel}
          stenosisProb={predictions?.[selectedVessel]?.probability || 0.5}
          onClose={() => {
            onSelectVessel(null);
            setLayerDepth(2);
          }}
        />
      )}
    </div>
  );
}
