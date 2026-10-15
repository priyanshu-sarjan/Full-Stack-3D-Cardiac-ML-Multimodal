import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Preload the realistic 3D human heart GLB model
useGLTF.preload('/models/heart.glb');

export function Heart3DModel({
  predictions,
  layerDepth = 2,
  heartRate = 72,
  selectedVessel = null,
  showVessels = true
}) {
  const groupRef = useRef();
  const heartMeshRef = useRef();

  // Load realistic human heart GLB model
  const { scene } = useGLTF('/models/heart.glb');

  // Clone scene to avoid shared state if remounted
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    
    // Normalize and enhance materials for realistic living cardiac tissue
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          // If material is standard, upgrade with biological gloss, wet clearcoat & subsurface depth
          const mat = child.material.clone();
          mat.roughness = 0.32;
          mat.metalness = 0.08;

          // Convert to MeshPhysicalMaterial for biological clearcoat if supported
          if (!mat.isMeshPhysicalMaterial) {
            const physMat = new THREE.MeshPhysicalMaterial({
              map: mat.map || null,
              normalMap: mat.normalMap || null,
              roughnessMap: mat.roughnessMap || null,
              roughness: 0.32,
              metalness: 0.08,
              clearcoat: 0.85,
              clearcoatRoughness: 0.2,
              transmission: 0.08,
              thickness: 0.8,
              ior: 1.45,
              color: mat.color ? mat.color.clone() : new THREE.Color('#d93856')
            });
            child.material = physMat;
          } else {
            mat.clearcoat = 0.85;
            mat.clearcoatRoughness = 0.2;
            child.material = mat;
          }
        }
      }
    });

    return clone;
  }, [scene]);

  // Extract wall motion scores from ML inference
  const wallMotion = predictions?.myocardial_wall_motion || {
    anterior_septal: { motion_score: 1.0, status: 'Normokinesia' },
    inferior: { motion_score: 1.0, status: 'Normokinesia' },
    lateral: { motion_score: 1.0, status: 'Normokinesia' }
  };

  const anteriorScore = wallMotion.anterior_septal?.motion_score ?? 1.0;
  const inferiorScore = wallMotion.inferior?.motion_score ?? 1.0;
  const lateralScore = wallMotion.lateral?.motion_score ?? 1.0;

  // Composite wall motion factor (1.0 = normal, <0.7 = hypokinesia, <0.3 = severe akinesia)
  const averageWallMotion = (anteriorScore + inferiorScore + lateralScore) / 3.0;

  // Ischemic tissue tinting when CAD probability is high
  useEffect(() => {
    const cadProb = predictions?.CAD?.probability || 0;
    const ladProb = predictions?.LAD?.probability || 0;

    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (cadProb > 0.75 || ladProb > 0.75) {
          // Subtle ischemic cyanotic/deep burgundy undertone
          child.material.color = new THREE.Color('#b82c47');
        } else if (cadProb > 0.5) {
          child.material.color = new THREE.Color('#c93250');
        } else {
          // Healthy vibrant pink-crimson cardiac muscle
          child.material.color = new THREE.Color('#dc3858');
        }
        child.material.needsUpdate = true;
      }
    });
  }, [clonedScene, predictions?.CAD?.probability, predictions?.LAD?.probability]);

  // Authentic Physiological Heart Pumping Animation
  // - Asymmetric cardiac cycle: rapid systole (ventricular ejection + torsional wringing), followed by elastic diastolic recoil
  useFrame(({ clock }) => {
    if (!heartMeshRef.current) return;

    const t = clock.getElapsedTime();
    const bpm = Math.max(40, Math.min(160, heartRate));
    const freq = (bpm / 60.0) * Math.PI * 2.0;

    const cycle = Math.sin(t * freq);
    
    // Systole: Sharp contraction peak
    const systole = Math.pow(Math.max(0, cycle), 2.2);
    // Diastole: Slower elastic recoil
    const diastole = Math.pow(Math.max(0, -cycle), 1.6) * 0.35;
    
    // Heart contraction amplitude modulated by ML wall motion score (ischemic myocardium contracts less!)
    const motionDampening = 0.4 + 0.6 * Math.max(0.2, averageWallMotion);
    const pumpMagnitude = (systole - diastole) * 0.085 * motionDampening;

    // Longitudinal shortening (Y) & short-axis ventricular compression (X & Z)
    const scaleX = 1.0 - pumpMagnitude * 0.75;
    const scaleY = 1.0 - pumpMagnitude * 1.1; // apex pulls toward base during systole
    const scaleZ = 1.0 - pumpMagnitude * 0.85;

    heartMeshRef.current.scale.set(scaleX, scaleY, scaleZ);

    // Physiological Ventricular Torsion:
    // Left ventricle twists like wringing a towel during systolic contraction
    const twist = Math.sin(t * freq) * 0.035 * motionDampening;
    heartMeshRef.current.rotation.y = twist;
    heartMeshRef.current.rotation.z = -twist * 0.5;
  });

  const isDimmed = layerDepth === 3 && selectedVessel;
  const meshOpacity = isDimmed ? 0.35 : 0.98;

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.opacity = meshOpacity;
      }
    });
  }, [clonedScene, meshOpacity]);

  return (
    <group ref={groupRef} position={[0, -0.15, 0]}>
      {/* Real Anatomical Human Heart Model */}
      <group ref={heartMeshRef} scale={[1.2, 1.2, 1.2]}>
        <primitive object={clonedScene} />
      </group>

      {/* Subtle organic pulsating illumination from within cardiac chambers */}
      <pointLight position={[0, -0.2, 0.3]} intensity={0.6} color="#ff3b68" distance={2.5} />
      <pointLight position={[0.2, 0.4, 0.1]} intensity={0.5} color="#38bdf8" distance={2.0} />
    </group>
  );
}

// Anatomically sculpted fallback geometry for zero-latency initial paint
export function AnatomicalSculptedFallback({ predictions, heartRate = 72 }) {
  const fallbackRef = useRef();

  useFrame(({ clock }) => {
    if (!fallbackRef.current) return;
    const t = clock.getElapsedTime();
    const freq = (heartRate / 60.0) * Math.PI * 2.0;
    const beat = Math.sin(t * freq) * 0.06;
    fallbackRef.current.scale.set(1.0 - beat * 0.8, 1.0 - beat * 1.0, 1.0 - beat * 0.8);
  });

  return (
    <group ref={fallbackRef} position={[0, -0.2, 0]}>
      {/* Ventricular Conical Body */}
      <mesh position={[0, -0.3, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshPhysicalMaterial
          color="#d93856"
          roughness={0.35}
          metalness={0.1}
          clearcoat={0.8}
        />
      </mesh>
      {/* Aortic Arch */}
      <mesh position={[0, 0.9, 0]} rotation={[0.4, 0.2, 1.2]}>
        <torusGeometry args={[0.45, 0.24, 16, 24, Math.PI * 0.9]} />
        <meshPhysicalMaterial color="#e11d48" roughness={0.3} clearcoat={0.8} />
      </mesh>
    </group>
  );
}
