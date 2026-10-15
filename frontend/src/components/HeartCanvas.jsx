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
  canvasRef,
  showAnnotations = true
}) {
  const [layerDepth, setLayerDepth] = useState(2); // 1 = Thorax, 2 = Realistic Heart, 3 = Lumen Plaque
  const [cameraPreset, setCameraPreset] = useState('anterior');
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showVesselFlow, setShowVesselFlow] = useState(false);

  // Camera presets
  const cameraConfigs = {
    anterior: { pos: [0, 0.1, 4.4], look: [0, -0.15, 0], label: "Anterior (LAD)" },
    lateral: { pos: [-3.8, 0.3, 2.0], look: [-0.3, -0.15, 0], label: "Lateral (LCX)" },
    inferior: { pos: [2.2, -2.8, 2.8], look: [0.1, -0.3, 0], label: "Inferior (RCA)" },
    overview: { pos: [2.2, 1.8, 4.0], look: [0, 0, 0], label: "Overview" }
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
    <div className="relative w-full h-full min-h-[580px] rounded-[32px] overflow-hidden select-none">
      {/* 3D WebGL Canvas with transparent background to blend into the rich wine gradient */}
      <Canvas
        ref={canvasRef}
        gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <PerspectiveCamera makeDefault position={cameraConfigs[cameraPreset].pos} fov={45} />
        <CameraController
          targetPosition={cameraConfigs[cameraPreset].pos}
          targetLookAt={cameraConfigs[cameraPreset].look}
        />

        {/* Ambient & Studio Biological Illumination */}
        <ambientLight intensity={0.85} color="#fff1f2" />
        <directionalLight position={[6, 9, 6]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-7, -3, -4]} intensity={0.9} color="#fda4af" />
        <pointLight position={[0, 1.5, 3.8]} intensity={1.2} color="#ffe4e6" distance={7} />
        <pointLight position={[-2.5, -0.5, 2.2]} intensity={0.9} color="#f43f5e" distance={5} />
        <pointLight position={[2.5, 0.5, 2.2]} intensity={0.7} color="#fb7185" distance={5} />

        {/* Layer 1: Thoracic Context */}
        <ThoraxContext visible={layerDepth === 1} />

        {/* Layer 2: Anatomically Realistic Pumping Human Heart */}
        <Suspense fallback={<AnatomicalSculptedFallback predictions={predictions} heartRate={heartRate} />}>
          <Heart3DModel
            predictions={predictions}
            layerDepth={layerDepth}
            heartRate={heartRate}
            selectedVessel={selectedVessel}
          />
        </Suspense>

        {/* Optional Coronary Artery Hemodynamic Shader overlay */}
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

      {/* Anatomical Annotations & Leader Lines matching the reference mockup */}
      {showAnnotations && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Top-Left Floating Glass Card: "Stay Active" */}
          <div className="absolute top-12 left-6 pointer-events-auto transform transition-all hover:scale-105 duration-300">
            <div className="frosted-glass-badge p-3.5 rounded-2xl max-w-[170px] shadow-lg backdrop-blur-xl border border-white/20 bg-white/10 text-white">
              <h4 className="font-heading font-bold text-xs text-white tracking-wide">Stay Active</h4>
              <p className="text-[10px] text-rose-100/80 leading-snug mt-1">
                30 minutes of daily exercise strengthens your heart.
              </p>
            </div>
          </div>

          {/* Center-Bottom Floating Glass Card: "Eat Smart" */}
          <div className="absolute bottom-20 left-1/3 pointer-events-auto transform transition-all hover:scale-105 duration-300">
            <div className="frosted-glass-badge p-3 rounded-2xl max-w-[150px] shadow-lg backdrop-blur-xl border border-white/20 bg-white/10 text-white">
              <h4 className="font-heading font-bold text-xs text-white tracking-wide">Eat Smart</h4>
              <p className="text-[10px] text-rose-100/80 leading-snug mt-1">
                A balanced diet is the key to heart health.
              </p>
            </div>
          </div>

          {/* Right Floating Glass Card: "Check Regularly" */}
          <div className="absolute bottom-28 right-8 pointer-events-auto transform transition-all hover:scale-105 duration-300">
            <div className="frosted-glass-badge p-4 rounded-2xl max-w-[190px] shadow-xl backdrop-blur-xl border border-white/25 bg-white/15 text-white">
              <h4 className="font-heading font-bold text-sm text-white tracking-wide">Check Regularly</h4>
              <p className="text-[11px] text-rose-100/85 leading-snug mt-1">
                Routine check-ups prevent heart diseases.
              </p>
            </div>
          </div>

          {/* Leader Line 1: Right Atrium (SVG Callout) */}
          <div className="absolute top-[32%] right-6 flex items-center pointer-events-auto group">
            <div className="relative text-left pr-4">
              <h4 className="font-heading font-bold text-xs text-white tracking-wide">Right Atrium</h4>
              <p className="text-[10px] text-rose-200/80 max-w-[160px] leading-tight">
                Receives oxygen-poor blood from the body.
              </p>
            </div>
            {/* Fine white leader line extending leftward towards heart */}
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
              <path
                d="M 100 15 L 30 15 L 0 5"
                stroke="rgba(255, 255, 255, 0.75)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="0" cy="5" r="2.5" fill="white" />
            </svg>
          </div>

          {/* Leader Line 2: Right Ventricle (SVG Callout) */}
          <div className="absolute top-[48%] right-6 flex items-center pointer-events-auto group">
            <div className="relative text-left pr-4">
              <h4 className="font-heading font-bold text-xs text-white tracking-wide">Right Ventricle</h4>
              <p className="text-[10px] text-rose-200/80 max-w-[160px] leading-tight">
                Pumps oxygen-poor blood to the lungs.
              </p>
            </div>
            {/* Fine white leader line extending leftward towards ventricle */}
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
              <path
                d="M 100 15 L 35 15 L 0 25"
                stroke="rgba(255, 255, 255, 0.75)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="0" cy="25" r="2.5" fill="white" />
            </svg>
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
            <span className="font-heading font-bold text-rose-200 text-sm">
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
          </div>
        </div>
      )}

      {/* Modern HUD Controls Overlay (Top) */}
      <div className="absolute top-3 left-4 flex flex-wrap items-center gap-2 z-20">
        <div className="flex items-center p-1 rounded-2xl bg-black/25 border border-white/15 backdrop-blur-xl">
          <button
            onClick={() => setLayerDepth(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 1
                ? 'bg-white/25 text-white font-semibold shadow-sm'
                : 'text-rose-200/70 hover:text-white'
            }`}
          >
            <Layers size={13} /> Thorax
          </button>
          <button
            onClick={() => setLayerDepth(2)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 2
                ? 'bg-rose-500/40 text-white font-semibold shadow-sm'
                : 'text-rose-200/70 hover:text-white'
            }`}
          >
            <Heart size={13} /> 3D Heart
          </button>
          <button
            onClick={() => {
              setLayerDepth(3);
              if (!selectedVessel) onSelectVessel('LAD');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              layerDepth === 3
                ? 'bg-amber-500/40 text-white font-semibold shadow-sm'
                : 'text-rose-200/70 hover:text-white'
            }`}
          >
            <Eye size={13} /> Lumen Plaque
          </button>
        </div>

        {/* Toggle Coronary Artery Flow Shaders */}
        <button
          onClick={() => setShowVesselFlow(!showVesselFlow)}
          className={`px-3 py-1.5 rounded-2xl text-xs font-medium flex items-center gap-1.5 backdrop-blur-xl border transition-all ${
            showVesselFlow
              ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40 shadow-sm'
              : 'bg-black/25 text-rose-200/80 border-white/15 hover:text-white'
          }`}
          title="Toggle Coronary Artery GLSL Hemodynamic Flow"
        >
          <Sparkles size={13} /> {showVesselFlow ? 'Coronaries: On' : 'Coronaries: Off'}
        </button>
      </div>

      {/* Camera View Angle Buttons (Top Right) */}
      <div className="absolute top-3 right-4 flex items-center gap-1 z-20 bg-black/25 p-1 rounded-2xl border border-white/15 backdrop-blur-xl">
        <span className="text-[11px] text-rose-200/70 font-medium px-2 flex items-center gap-1">
          <Camera size={12} /> View:
        </span>
        {Object.entries(cameraConfigs).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCameraPreset(key)}
            className={`px-2.5 py-1 text-xs rounded-xl transition-all ${
              cameraPreset === key
                ? 'bg-white/25 text-white font-semibold'
                : 'text-rose-200/70 hover:text-white'
            }`}
          >
            {config.label.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Bottom HUD: Live Hemodynamic & Wall Motion Monitor */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-3 z-20 pointer-events-none">
        {/* Heart Rate Slider */}
        <div className="pointer-events-auto flex items-center gap-3 bg-black/35 px-4 py-2 rounded-2xl border border-white/15 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Heart size={15} className="text-rose-400 animate-pulse" />
            <span className="text-xs font-semibold text-rose-100">Rate:</span>
            <span className="font-mono text-white font-bold text-xs w-14">{heartRate} BPM</span>
          </div>
          <input
            type="range"
            min="45"
            max="140"
            value={heartRate}
            onChange={(e) => onHeartRateChange(Number(e.target.value))}
            className="w-24 accent-rose-400 cursor-pointer"
            title="Adjust Heart Rate"
          />
        </div>

        {/* Wall Motion Status Tags */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black/35 px-4 py-2 rounded-2xl border border-white/15 backdrop-blur-xl text-xs">
          <span className="text-rose-200/80 font-medium flex items-center gap-1">
            <Activity size={13} className="text-rose-300" /> Wall Motion:
          </span>
          <span className={`px-2 py-0.5 rounded-lg font-medium text-[11px] ${
            predictions?.myocardial_wall_motion?.anterior_septal?.motion_score < 0.6 ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'
          }`}>
            Anterior: {predictions?.myocardial_wall_motion?.anterior_septal?.status || 'Normal'}
          </span>
          <span className={`px-2 py-0.5 rounded-lg font-medium text-[11px] ${
            predictions?.myocardial_wall_motion?.inferior?.motion_score < 0.6 ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'
          }`}>
            Inferior: {predictions?.myocardial_wall_motion?.inferior?.status || 'Normal'}
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
