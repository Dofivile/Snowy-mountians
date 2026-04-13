import React, { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import "./styles.css";
import { SECTION_COUNT } from "./scene/constants";
import { Terrain, TerrainSubstrate } from "./scene/Terrain";
import { SceneClouds } from "./scene/Clouds";
import { Snow, SnowStreaks } from "./scene/Snow";
import { DynamicSky } from "./scene/Sky";
import { CameraSetup, Earthquake } from "./scene/CameraRig";
import { EnergyDecay } from "./scene/EnergyDecay";
import { useAudioAnalyser } from "./audio/AudioAnalyser";

const AMBIENT_COLORS = [
  "#ffffff",
  "#e8daf5",
  "#d8eaf5",
  "#f5e0d0",
  "#f0d0d0",
];

const CyclingAmbient = () => {
  const lightRef = useRef();
  const current = useMemo(() => new THREE.Color("#ffffff"), []);
  const target = useMemo(() => new THREE.Color("#ffffff"), []);
  const idx = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const newIdx = Math.floor(t / 5) % AMBIENT_COLORS.length;
    if (newIdx !== idx.current) {
      idx.current = newIdx;
      target.set(AMBIENT_COLORS[newIdx]);
    }
    current.lerp(target, 0.03);
    lightRef.current.color.copy(current);
  });

  return <ambientLight ref={lightRef} intensity={0.8} />;
};

const AudioBridge = ({ quakeIntensity, freqBalance, sectionEnergies, palettePhase }) => {
  useAudioAnalyser({ quakeIntensity, freqBalance, sectionEnergies, palettePhase });
  return null;
};

export default function App() {
  const quakeIntensity = useRef(0);
  const freqBalance = useRef(0);
  const sectionEnergies = useRef(new Float32Array(SECTION_COUNT));
  const palettePhase = useRef(0);

  return (
    <div className="vis-shell">
      <div className="vis-box">
        <div className="vis-screen">
          <Canvas
            camera={{
              position: [40, 10, 18],
              fov: 43,
            }}
          >
            <AudioBridge
              quakeIntensity={quakeIntensity}
              freqBalance={freqBalance}
              sectionEnergies={sectionEnergies}
              palettePhase={palettePhase}
            />
            <DynamicSky intensity={quakeIntensity} />
            <CameraSetup />
            <EnergyDecay freqBalance={freqBalance} />
            <Earthquake intensity={quakeIntensity} />
            <CyclingAmbient />
            <pointLight intensity={2} position={[7, 5, 1]} />
            <SceneClouds />
            <Snow intensity={quakeIntensity} />
            <SnowStreaks intensity={quakeIntensity} />
            <TerrainSubstrate />
            <Suspense fallback={null}>
              <Terrain freqBalance={freqBalance} sectionEnergies={sectionEnergies} palettePhase={palettePhase} />
            </Suspense>
          </Canvas>
        </div>

        <div className="audio-controls">
          <span className="vis-tagline">speak to disturb mother nature</span>
        </div>
      </div>
    </div>
  );
}
