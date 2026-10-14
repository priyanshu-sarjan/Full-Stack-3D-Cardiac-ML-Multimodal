import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CoronaryPulseShader } from './CoronaryPulseShader';

export function CoronaryVessels({
  predictions,
  selectedVessel,
  onSelectVessel,
  onHoverVessel,
  heartRate = 72
}) {
  const ladMatRef = useRef();
  const lcxMatRef = useRef();
  const rcaMatRef = useRef();

  const [hoveredVessel, setHoveredVessel] = useState(null);

  // 1. Vessel Curves modeled according to human coronary anatomy
  // LAD: Left anterior descending path descending down anterior sulcus
  const ladCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 0.65, 0.42), // Ostium / Left Main
      new THREE.Vector3(-0.25, 0.45, 0.65), // Proximal LAD (common stenosis site)
      new THREE.Vector3(-0.35, 0.15, 0.82), // Mid LAD
      new THREE.Vector3(-0.32, -0.25, 0.88), // Distal LAD
      new THREE.Vector3(-0.28, -0.75, 0.72), // Apical LAD wrap
      new THREE.Vector3(-0.22, -1.25, 0.45)  // True Apex
    ]);
  }, []);

  // Diagonal 1 Branch of LAD
  const ladDiagCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.28, 0.35, 0.72),
      new THREE.Vector3(-0.48, 0.1, 0.75),
      new THREE.Vector3(-0.62, -0.2, 0.65)
    ]);
  }, []);

  // LCX: Left Circumflex path curving along left AV groove
  const lcxCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 0.65, 0.42), // Left Main Bifurcation
      new THREE.Vector3(-0.45, 0.55, 0.25), // Proximal LCX
      new THREE.Vector3(-0.72, 0.35, -0.05), // Mid LCX (obtuse margin)
      new THREE.Vector3(-0.82, -0.05, -0.32), // Distal LCX
      new THREE.Vector3(-0.65, -0.45, -0.48), // Posterior Left Ventricular Branch
      new THREE.Vector3(-0.35, -0.75, -0.42)
    ]);
  }, []);

  // Obtuse Marginal 1 Branch of LCX
  const lcxOmCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.68, 0.38, 0.05),
      new THREE.Vector3(-0.78, 0.05, 0.18),
      new THREE.Vector3(-0.75, -0.35, 0.22)
    ]);
  }, []);

  // RCA: Right Coronary Artery path in right AV groove to diaphragmatic floor
  const rcaCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.28, 0.68, 0.32),  // Right Coronary Ostium
      new THREE.Vector3(0.52, 0.45, 0.38),  // Proximal RCA
      new THREE.Vector3(0.68, 0.15, 0.25),  // Mid RCA (acute margin)
      new THREE.Vector3(0.72, -0.25, 0.05),  // Distal RCA
      new THREE.Vector3(0.62, -0.65, -0.22), // Crux of heart
      new THREE.Vector3(0.25, -0.95, -0.35)  // Posterior Descending Artery (PDA)
    ]);
  }, []);

  // Acute Marginal Branch of RCA
  const rcaAmCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.65, 0.22, 0.28),
      new THREE.Vector3(0.68, -0.05, 0.42),
      new THREE.Vector3(0.55, -0.38, 0.52)
    ]);
  }, []);

  // Tube Geometries
  const ladGeo = useMemo(() => new THREE.TubeGeometry(ladCurve, 72, 0.055, 14, false), [ladCurve]);
  const ladDiagGeo = useMemo(() => new THREE.TubeGeometry(ladDiagCurve, 36, 0.038, 12, false), [ladDiagCurve]);
  const lcxGeo = useMemo(() => new THREE.TubeGeometry(lcxCurve, 72, 0.052, 14, false), [lcxCurve]);
  const lcxOmGeo = useMemo(() => new THREE.TubeGeometry(lcxOmCurve, 36, 0.036, 12, false), [lcxOmCurve]);
  const rcaGeo = useMemo(() => new THREE.TubeGeometry(rcaCurve, 72, 0.056, 14, false), [rcaCurve]);
  const rcaAmGeo = useMemo(() => new THREE.TubeGeometry(rcaAmCurve, 36, 0.038, 12, false), [rcaAmCurve]);

  // Create Shader Materials
  const ladShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CoronaryPulseShader.uniforms),
      vertexShader: CoronaryPulseShader.vertexShader,
      fragmentShader: CoronaryPulseShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, []);

  const lcxShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CoronaryPulseShader.uniforms),
      vertexShader: CoronaryPulseShader.vertexShader,
      fragmentShader: CoronaryPulseShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, []);

  const rcaShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CoronaryPulseShader.uniforms),
      vertexShader: CoronaryPulseShader.vertexShader,
      fragmentShader: CoronaryPulseShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, []);

  // Update dynamic uniform values each frame
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulseFreq = heartRate / 60.0;

    const ladProb = predictions?.LAD?.probability || 0.1;
    const lcxProb = predictions?.LCX?.probability || 0.1;
    const rcaProb = predictions?.RCA?.probability || 0.1;

    // LAD uniforms
    if (ladShaderMat) {
      ladShaderMat.uniforms.uTime.value = t;
      ladShaderMat.uniforms.uStenosis.value = ladProb;
      // High stenosis causes sluggish velocity (from 4.2 down to 1.1)
      ladShaderMat.uniforms.uFlowSpeed.value = Math.max(1.0, 4.2 * (1.0 - ladProb * 0.72));
      ladShaderMat.uniforms.uPulseFrequency.value = pulseFreq;
      ladShaderMat.uniforms.uHovered.value = hoveredVessel === 'LAD' ? 1.0 : 0.0;
      ladShaderMat.uniforms.uSelected.value = selectedVessel === 'LAD' ? 1.0 : 0.0;
    }

    // LCX uniforms
    if (lcxShaderMat) {
      lcxShaderMat.uniforms.uTime.value = t;
      lcxShaderMat.uniforms.uStenosis.value = lcxProb;
      lcxShaderMat.uniforms.uFlowSpeed.value = Math.max(1.0, 4.0 * (1.0 - lcxProb * 0.72));
      lcxShaderMat.uniforms.uPulseFrequency.value = pulseFreq;
      lcxShaderMat.uniforms.uHovered.value = hoveredVessel === 'LCX' ? 1.0 : 0.0;
      lcxShaderMat.uniforms.uSelected.value = selectedVessel === 'LCX' ? 1.0 : 0.0;
    }

    // RCA uniforms
    if (rcaShaderMat) {
      rcaShaderMat.uniforms.uTime.value = t;
      rcaShaderMat.uniforms.uStenosis.value = rcaProb;
      rcaShaderMat.uniforms.uFlowSpeed.value = Math.max(1.0, 4.4 * (1.0 - rcaProb * 0.72));
      rcaShaderMat.uniforms.uPulseFrequency.value = pulseFreq;
      rcaShaderMat.uniforms.uHovered.value = hoveredVessel === 'RCA' ? 1.0 : 0.0;
      rcaShaderMat.uniforms.uSelected.value = selectedVessel === 'RCA' ? 1.0 : 0.0;
    }
  });

  const handlePointerOver = (vesselName, e) => {
    e.stopPropagation();
    setHoveredVessel(vesselName);
    if (onHoverVessel) onHoverVessel(vesselName, e);
  };

  const handlePointerOut = (e) => {
    setHoveredVessel(null);
    if (onHoverVessel) onHoverVessel(null, e);
  };

  const handleClick = (vesselName, e) => {
    e.stopPropagation();
    if (onSelectVessel) {
      onSelectVessel(selectedVessel === vesselName ? null : vesselName);
    }
  };

  return (
    <group position={[0, -0.2, 0]}>
      {/* --- LAD System --- */}
      <group
        onPointerOver={(e) => handlePointerOver('LAD', e)}
        onPointerOut={handlePointerOut}
        onClick={(e) => handleClick('LAD', e)}
        cursor="pointer"
      >
        <mesh geometry={ladGeo} material={ladShaderMat} />
        <mesh geometry={ladDiagGeo} material={ladShaderMat} />
      </group>

      {/* --- LCX System --- */}
      <group
        onPointerOver={(e) => handlePointerOver('LCX', e)}
        onPointerOut={handlePointerOut}
        onClick={(e) => handleClick('LCX', e)}
        cursor="pointer"
      >
        <mesh geometry={lcxGeo} material={lcxShaderMat} />
        <mesh geometry={lcxOmGeo} material={lcxShaderMat} />
      </group>

      {/* --- RCA System --- */}
      <group
        onPointerOver={(e) => handlePointerOver('RCA', e)}
        onPointerOut={handlePointerOut}
        onClick={(e) => handleClick('RCA', e)}
        cursor="pointer"
      >
        <mesh geometry={rcaGeo} material={rcaShaderMat} />
        <mesh geometry={rcaAmGeo} material={rcaShaderMat} />
      </group>
    </group>
  );
}
