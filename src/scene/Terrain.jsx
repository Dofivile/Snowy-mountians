import React, { useLayoutEffect, useRef, useMemo } from "react";
import { useLoader, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Plane } from "@react-three/drei";

import {
  neutralColor,
  BASS_ACCENTS,
  TREBLE_ACCENTS,
  samplePalette,
  SECTION_COUNT,
  GRID_COLS,
  GRID_ROWS,
  TERRAIN_BURST_HEIGHT,
  SECTION_INERTIA,
  SECTION_WEIGHT_SHARPNESS,
} from "./constants";

export const Terrain = ({ freqBalance, sectionEnergies, palettePhase }) => {
  const elevation = useLoader(THREE.TextureLoader, "elevation.png");
  const normals = useLoader(THREE.TextureLoader, "normals.png");
  const colors = useLoader(THREE.TextureLoader, "colors.png");
  const gl = useThree((s) => s.gl);
  const meshRef = useRef();
  const matRef = useRef();
  const tintTarget = useMemo(() => new THREE.Color(), []);
  const currentTint = useMemo(() => new THREE.Color("#ffffff"), []);
  const currentEnergies = useRef(new Float32Array(SECTION_COUNT));

  useLayoutEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy();
    for (const tex of [elevation, normals, colors]) {
      tex.anisotropy = max;
      tex.needsUpdate = true;
    }
  }, [gl, elevation, normals, colors]);

  useFrame(() => {
    if (!matRef.current || !meshRef.current) return;

    if (freqBalance) {
      const b = freqBalance.current;
      const phase = palettePhase ? palettePhase.current : 0;
      if (b < 0) {
        const accent = samplePalette(BASS_ACCENTS, phase);
        tintTarget.copy(neutralColor).lerp(accent, Math.abs(b));
      } else if (b > 0) {
        const accent = samplePalette(TREBLE_ACCENTS, phase);
        tintTarget.copy(neutralColor).lerp(accent, b);
      } else {
        tintTarget.copy(neutralColor);
      }
      currentTint.lerp(tintTarget, 0.15);
      matRef.current.color.copy(currentTint);
    }

    if (sectionEnergies) {
      const geo = meshRef.current.geometry;
      const posAttr = geo.attributes.position;
      const uvAttr = geo.attributes.uv;

      if (!geo.userData.baseY) {
        geo.userData.baseY = new Float32Array(posAttr.count);
        for (let i = 0; i < posAttr.count; i++) {
          geo.userData.baseY[i] = posAttr.getZ(i);
        }
      }

      const baseY = geo.userData.baseY;
      const cur = currentEnergies.current;

      for (let s = 0; s < SECTION_COUNT; s++) {
        cur[s] += (sectionEnergies.current[s] - cur[s]) * SECTION_INERTIA;
      }

      for (let i = 0; i < posAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);

        let totalEnergy = 0;
        let totalWeight = 0;
        for (let s = 0; s < SECTION_COUNT; s++) {
          const sc = s % GRID_COLS;
          const sr = Math.floor(s / GRID_COLS);
          const centerU = (sc + 0.5) / GRID_COLS;
          const centerV = (sr + 0.5) / GRID_ROWS;
          const du = (u - centerU) * GRID_COLS;
          const dv = (v - centerV) * GRID_ROWS;
          const dist = Math.sqrt(du * du + dv * dv);
          const w = Math.max(0, 1 - dist * SECTION_WEIGHT_SHARPNESS);
          const weight = w * w;
          totalEnergy += cur[s] * weight;
          totalWeight += weight;
        }

        const blended = totalWeight > 0 ? totalEnergy / totalWeight : 0;
        const boost = blended * TERRAIN_BURST_HEIGHT;
        posAttr.setZ(i, baseY[i] + boost);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <Plane
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3, 0]}
      args={[64, 64, 1024, 1024]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        ref={matRef}
        attach="material"
        color="white"
        map={colors}
        metalness={0.08}
        roughness={0.88}
        displacementMap={elevation}
        displacementScale={2}
        normalMap={normals}
        side={THREE.DoubleSide}
      />
    </Plane>
  );
};

export const TerrainSubstrate = () => (
  <mesh position={[0, -4.12, 0]} frustumCulled={false}>
    <boxGeometry args={[70, 1.85, 70]} />
    <meshStandardMaterial color="#5c636b" roughness={1} metalness={0} />
  </mesh>
);
