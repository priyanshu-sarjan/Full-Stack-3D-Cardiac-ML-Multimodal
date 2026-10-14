import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Heart3DModel } from './Heart3DModel';
import { CoronaryVessels } from './CoronaryVessels';
import { ThoraxContext } from './ThoraxContext';
import { LumenCrossSection } from './LumenCrossSection';
import { Eye, Layers, Camera, Heart, Zap, Sparkles, AlertCircle } from 'lucide-react';

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
  const [layerDepth, setLayerDepth] = useState(2); // 1 = Thorax, 2 = Epicardium/Vessels, 3 = Lumen
  const [cameraPreset, setCameraPreset] = useState('anterior');
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Camera presets
  const cameraConfigs = {
    anterior: { pos: [0, 0.2, 4.2], look: [0, -0.2, 0], label: "Anterior (LAD)" },
    lateral: { pos: [-3.8, 0.4, 1.8], look: [-0.4, -0.2, 0], label: "Lateral (LCX)" },
    inferior: { pos: [2.2, -3.2, 2.5], look: [0.2, -0.4, 0], label: "Inferior (RCA)" },
    overview: { pos: [2.5, 2.0, 3.8], look: [0, 0, 0], label: "Thoracic Overview" }
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

  const currentStenosis = selectedVessel && predictions?.[selectedVessel]?.probability
    ? predictions[selectedVessel].probability
    : 0.75;

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden glass-panel border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-[#070b14] to-black">
      {/* 3D WebGL Canvas */}
      <Canvas
        ref={canvasRef}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        className="w-full h-full"
      >
        <PerspectiveCamera makeDefault position={cameraConfigs[cameraPreset].pos} fov={45} />
        <CameraController
          targetPosition={cameraConfigs[cameraPreset].pos}
          targetLookAt={cameraConfigs[cameraPreset].look}
        />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} color="#ffffff" />
        <directionalLight position={[-6, -4, -4]} intensity={0.6} color="#0284c7" />
        <pointLight position={[0, 0, 3.5]} intensity={0.9} color="#ff2a5f" distance={6} />
        <pointLight position={[-2, 1, 2]} intensity={0.7} color="#38bdf8" distance={5} />

        {/* Layer 1: Thoracic Context */}
        <ThoraxContext visible={layerDepth === 1} />

        {/* Layer 2: Anatomical Heart & Segmented Wall Motion */}
        <Heart3DModel
          predictions={predictions}
          layerDepth={layerDepth}
          heartRate={heartRate}
          selectedVessel={selectedVessel}
        />

        {/* Dynamic Coronary Artery System with Flow Shaders */}
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

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={1.8}
          maxDistance={7.5}
        />
      </Canvas>

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

      {/* Top HUD Controls Overlay */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-20">
        {/* Layer Peeling Depth Selector */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setLayerDepth(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 1
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={14} /> 1. Thoracic Context
          </button>
          <button
            onClick={() => setLayerDepth(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 2
                ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Heart size={14} /> 2. Epicardial Flow
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
            <Eye size={14} /> 3. Lumen Plaque
          </button>
        </div>
      </div>

      {/* Camera View Angle Buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 bg-slate-900/80 p-1 rounded-xl border border-white/10 backdrop-blur-md">
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

      {/* Bottom HUD: Live Hemodynamic & Wall Motion Monitor */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 z-20 pointer-events-none">
        {/* Heart Rate & Hemodynamic Controls */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/85 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-rose-500 animate-heartbeat" />
            <span className="text-xs font-semibold text-gray-200">Rate:</span>
            <span className="font-mono text-rose-400 font-bold text-sm w-12">{heartRate} BPM</span>
          </div>
          <input
            type="range"
            min="45"
            max="140"
            value={heartRate}
            onChange={(e) => onHeartRateChange(Number(e.target.value))}
            className="w-24 accent-rose-500"
            title="Adjust Heart Rate"
          />
        </div>

        {/* Wall Motion Status Tags */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md text-xs">
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <Activity size={14} className="text-cyan-400" /> Echo Wall Motion:
          </span>
          <span className={`px-2 py-0.5 rounded font-medium ${
            predictions?.myocardial_wall_motion?.anterior_septal?.motion_score < 0.6 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            Anterior (LAD): {predictions?.myocardial_wall_motion?.anterior_septal?.status || 'Normal'}
          </span>
          <span className={`px-2 py-0.5 rounded font-medium ${
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
