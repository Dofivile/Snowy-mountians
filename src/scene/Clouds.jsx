import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Cloud } from "@react-three/drei";

const DriftingCloud = ({ startPosition, driftSpeed = 0.3, opacity = 0.7 }) => {
  const groupRef = useRef();
  const range = 40;

  useFrame((_, delta) => {
    groupRef.current.position.x += driftSpeed * delta;
    if (groupRef.current.position.x > range) {
      groupRef.current.position.x = -range;
    }
  });

  return (
    <group ref={groupRef} position={startPosition}>
      <Cloud speed={0.1} opacity={opacity} />
    </group>
  );
};

export const SceneClouds = () => (
  <group>
    <pointLight position={[0, 20, 0]} intensity={3} distance={25} decay={2} />
    <DriftingCloud startPosition={[-10, 9, -10]} driftSpeed={1.8} opacity={0.85} />
    <DriftingCloud startPosition={[10, 8, -15]} driftSpeed={1.5} opacity={0.8} />
    <DriftingCloud startPosition={[0, 10, -20]} driftSpeed={1.6} opacity={0.9} />
    <DriftingCloud startPosition={[-15, 8, 5]} driftSpeed={2.2} opacity={0.8} />
    <DriftingCloud startPosition={[15, 9, 0]} driftSpeed={1.5} opacity={0.85} />
    <DriftingCloud startPosition={[5, 10, 10]} driftSpeed={1.3} opacity={0.75} />
    <DriftingCloud startPosition={[-20, 9, -5]} driftSpeed={2.0} opacity={0.85} />
  </group>
);
