import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Heart3DModel({ predictions, layerDepth = 2, heartRate = 72, selectedVessel = null }) {
  const heartGroupRef = useRef();
  const anteriorMeshRef = useRef();
  const inferiorMeshRef = useRef();
  const lateralMeshRef = useRef();
  const baseMeshRef = useRef();
  const aortaRef = useRef();
  const pulmonaryRef = useRef();

  // Extract wall motion scores from ML inference
  const wallMotion = predictions?.myocardial_wall_motion || {
    anterior_septal: { motion_score: 1.0, status: 'Normokinesia' },
    inferior: { motion_score: 1.0, status: 'Normokinesia' },
    lateral: { motion_score: 1.0, status: 'Normokinesia' }
  };

  const anteriorScore = wallMotion.anterior_septal.motion_score;
  const inferiorScore = wallMotion.inferior.motion_score;
  const lateralScore = wallMotion.lateral.motion_score;

  // Ischemic tissue discoloration colors
  const anteriorColor = useMemo(() => {
    const ladProb = predictions?.LAD?.probability || 0;
    if (ladProb > 0.75) return new THREE.Color('#50203e'); // ischemic cyanotic hue
    if (ladProb > 0.5) return new THREE.Color('#782245');
    return new THREE.Color('#9f1239'); // healthy cardiac muscle
  }, [predictions?.LAD?.probability]);

  const inferiorColor = useMemo(() => {
    const rcaProb = predictions?.RCA?.probability || 0;
    if (rcaProb > 0.75) return new THREE.Color('#50203e');
    if (rcaProb > 0.5) return new THREE.Color('#782245');
    return new THREE.Color('#9f1239');
  }, [predictions?.RCA?.probability]);

  const lateralColor = useMemo(() => {
    const lcxProb = predictions?.LCX?.probability || 0;
    if (lcxProb > 0.75) return new THREE.Color('#50203e');
    if (lcxProb > 0.5) return new THREE.Color('#782245');
    return new THREE.Color('#9f1239');
  }, [predictions?.LCX?.probability]);

  // Contraction heartbeat animation cycle
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const freq = (heartRate / 60.0) * Math.PI * 2.0;
    
    // Asymmetric cardiac cycle: rapid systole (contraction) followed by slower diastole (relaxation)
    const rawCycle = Math.sin(t * freq);
    const systole = Math.pow(Math.max(0, rawCycle), 2.5); // sharp ejection peak
    const diastole = Math.pow(Math.max(0, -rawCycle), 1.5) * 0.4;
    const globalBeat = (systole - diastole) * 0.08;

    // Modulate regional myocardial wall displacement by ML RWMA motion score!
    // If motion_score = 1.0 -> full normokinetic pump
    // If motion_score = 0.5 -> hypokinesia (diminished pump)
    // If motion_score = 0.0 -> akinesia (frozen wall motion)
    if (anteriorMeshRef.current) {
      const disp = globalBeat * Math.max(0.08, anteriorScore);
      anteriorMeshRef.current.scale.set(1.0 + disp * 0.7, 1.0 + disp * 0.6, 1.0 + disp * 0.9);
    }

    if (inferiorMeshRef.current) {
      const disp = globalBeat * Math.max(0.08, inferiorScore);
      inferiorMeshRef.current.scale.set(1.0 + disp * 0.8, 1.0 + disp * 0.5, 1.0 + disp * 0.7);
    }

    if (lateralMeshRef.current) {
      const disp = globalBeat * Math.max(0.08, lateralScore);
      lateralMeshRef.current.scale.set(1.0 + disp * 0.9, 1.0 + disp * 0.7, 1.0 + disp * 0.6);
    }

    // Great vessels (Aorta / Pulmonary) pulse with systolic ejection
    if (aortaRef.current) {
      const aortaPulse = Math.sin(t * freq - 0.25) * 0.025;
      aortaRef.current.scale.set(1.0 + aortaPulse, 1.0 + aortaPulse * 0.5, 1.0 + aortaPulse);
    }

    if (pulmonaryRef.current) {
      const pulmPulse = Math.sin(t * freq - 0.2) * 0.02;
      pulmonaryRef.current.scale.set(1.0 + pulmPulse, 1.0 + pulmPulse * 0.5, 1.0 + pulmPulse);
    }
  });

  const isDimmed = layerDepth === 3 && selectedVessel;
  const meshOpacity = isDimmed ? 0.35 : 0.94;

  return (
    <group ref={heartGroupRef} position={[0, -0.2, 0]}>
      {/* 1. Anterior Myocardial Territory & Apex (LAD Territory) */}
      <mesh ref={anteriorMeshRef} position={[-0.1, -0.2, 0.45]} rotation={[0.2, 0.1, -0.15]}>
        <sphereGeometry args={[1.05, 36, 36]} />
        <meshPhysicalMaterial
          color={anteriorColor}
          roughness={0.42}
          metalness={0.12}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
          transmission={0.05}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>

      {/* 2. Inferior & Posterior Myocardial Wall (RCA Territory) */}
      <mesh ref={inferiorMeshRef} position={[0.42, -0.35, -0.25]} rotation={[-0.15, 0.3, 0.1]}>
        <sphereGeometry args={[0.98, 32, 32]} />
        <meshPhysicalMaterial
          color={inferiorColor}
          roughness={0.45}
          metalness={0.12}
          clearcoat={0.5}
          clearcoatRoughness={0.3}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>

      {/* 3. Lateral Ventricular Free Wall (LCX Territory) */}
      <mesh ref={lateralMeshRef} position={[-0.55, -0.15, -0.15]} rotation={[0.1, -0.25, -0.2]}>
        <sphereGeometry args={[0.92, 32, 32]} />
        <meshPhysicalMaterial
          color={lateralColor}
          roughness={0.44}
          metalness={0.12}
          clearcoat={0.5}
          clearcoatRoughness={0.3}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>

      {/* 4. Cardiac Apex - Inferior Cone */}
      <mesh position={[-0.2, -1.2, 0.25]} rotation={[3.1, 0.2, 0.25]}>
        <coneGeometry args={[0.82, 1.25, 32]} />
        <meshPhysicalMaterial
          color={anteriorColor}
          roughness={0.45}
          metalness={0.1}
          clearcoat={0.5}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>

      {/* 5. Left & Right Atria (Atrial Base) */}
      <mesh position={[0.25, 0.7, -0.2]} rotation={[0, 0.2, 0]}>
        <sphereGeometry args={[0.72, 28, 28]} />
        <meshPhysicalMaterial
          color="#991b1b"
          roughness={0.55}
          metalness={0.08}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>
      
      <mesh position={[-0.45, 0.65, -0.15]} rotation={[0, -0.3, 0]}>
        <sphereGeometry args={[0.68, 28, 28]} />
        <meshPhysicalMaterial
          color="#881337"
          roughness={0.55}
          metalness={0.08}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>

      {/* 6. Ascending Aorta & Aortic Arch (Root of Coronary Circulation) */}
      <group ref={aortaRef} position={[0.08, 0.85, 0.15]}>
        <mesh position={[0, 0.45, 0]} rotation={[0.05, 0.1, -0.15]}>
          <cylinderGeometry args={[0.34, 0.38, 1.1, 24]} />
          <meshPhysicalMaterial
            color="#e11d48"
            roughness={0.3}
            metalness={0.15}
            clearcoat={0.7}
            transparent={true}
            opacity={meshOpacity}
          />
        </mesh>
        
        {/* Aortic Arch Curvature */}
        <mesh position={[-0.15, 1.1, -0.15]} rotation={[0.4, 0.3, 1.2]}>
          <torusGeometry args={[0.42, 0.26, 18, 28, Math.PI * 0.9]} />
          <meshPhysicalMaterial
            color="#e11d48"
            roughness={0.3}
            metalness={0.15}
            clearcoat={0.7}
            transparent={true}
            opacity={meshOpacity}
          />
        </mesh>

        {/* Brachiocephalic & Carotid branches */}
        <mesh position={[-0.28, 1.55, -0.12]} rotation={[0.1, 0, -0.2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.45, 16]} />
          <meshPhysicalMaterial color="#e11d48" roughness={0.3} transparent={true} opacity={meshOpacity} />
        </mesh>
        <mesh position={[-0.42, 1.5, -0.18]} rotation={[0.1, 0, -0.3]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 16]} />
          <meshPhysicalMaterial color="#e11d48" roughness={0.3} transparent={true} opacity={meshOpacity} />
        </mesh>
      </group>

      {/* 7. Pulmonary Trunk & Arteries */}
      <group ref={pulmonaryRef} position={[-0.25, 0.75, 0.4]}>
        <mesh position={[0, 0.25, 0]} rotation={[-0.3, -0.15, 0.3]}>
          <cylinderGeometry args={[0.29, 0.32, 0.85, 24]} />
          <meshPhysicalMaterial
            color="#0284c7" // deoxygenated pulmonary blood
            roughness={0.35}
            metalness={0.15}
            clearcoat={0.6}
            transparent={true}
            opacity={meshOpacity}
          />
        </mesh>
      </group>

      {/* 8. Superior Vena Cava */}
      <mesh position={[0.7, 0.95, -0.35]} rotation={[0.05, 0, 0.1]}>
        <cylinderGeometry args={[0.22, 0.22, 0.95, 20]} />
        <meshPhysicalMaterial
          color="#0369a1"
          roughness={0.4}
          metalness={0.15}
          clearcoat={0.5}
          transparent={true}
          opacity={meshOpacity}
        />
      </mesh>
    </group>
  );
}
