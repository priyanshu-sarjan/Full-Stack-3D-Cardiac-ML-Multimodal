import React, { useMemo } from 'react';
import * as THREE from 'three';

export function ThoraxContext({ visible = true }) {
  if (!visible) return null;

  // Generate rib arches
  const ribs = useMemo(() => {
    const list = [];
    const ribCount = 8;
    for (let i = 0; i < ribCount; i++) {
      const y = 1.6 - i * 0.42;
      const radiusX = 1.7 + i * 0.12;
      const radiusZ = 1.35 + i * 0.08;
      
      // Left and right rib curve
      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.08, y, 1.2), // Sternum junction
        new THREE.Vector3(-radiusX * 0.6, y - 0.08, 1.0),
        new THREE.Vector3(-radiusX, y - 0.18, 0.2),
        new THREE.Vector3(-radiusX * 0.8, y - 0.28, -0.9),
        new THREE.Vector3(-0.25, y - 0.32, -1.25) // Vertebra
      ]);

      const rightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, y, 1.2),
        new THREE.Vector3(radiusX * 0.6, y - 0.08, 1.0),
        new THREE.Vector3(radiusX, y - 0.18, 0.2),
        new THREE.Vector3(radiusX * 0.8, y - 0.28, -0.9),
        new THREE.Vector3(0.25, y - 0.32, -1.25)
      ]);

      list.push(
        new THREE.TubeGeometry(leftCurve, 28, 0.045, 8, false),
        new THREE.TubeGeometry(rightCurve, 28, 0.045, 8, false)
      );
    }
    return list;
  }, []);

  return (
    <group position={[0, -0.1, 0]}>
      {/* Sternum (Breastbone) */}
      <mesh position={[0, 0.45, 1.22]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.32, 2.6, 0.08]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          roughness={0.2}
          transmission={0.7}
          transparent={true}
          opacity={0.22}
          wireframe={false}
        />
      </mesh>

      {/* Clavicles */}
      <mesh position={[-0.95, 1.85, 1.05]} rotation={[0, 0.2, 0.25]}>
        <cylinderGeometry args={[0.05, 0.06, 1.8, 12]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0.95, 1.85, 1.05]} rotation={[0, -0.2, -0.25]}>
        <cylinderGeometry args={[0.05, 0.06, 1.8, 12]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>

      {/* Rib Cage Arches */}
      {ribs.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshPhysicalMaterial
            color="#0ea5e9"
            roughness={0.3}
            metalness={0.2}
            clearcoat={0.6}
            transparent={true}
            opacity={0.16}
          />
        </mesh>
      ))}

      {/* Translucent Thoracic Outer Silhouette */}
      <mesh position={[0, 0.1, 0]}>
        <capsuleGeometry args={[2.0, 2.2, 16, 24]} />
        <meshPhysicalMaterial
          color="#0369a1"
          roughness={0.1}
          transmission={0.92}
          transparent={true}
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
