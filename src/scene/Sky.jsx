import React, { useMemo, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { QUAKE_MAX, calmColor, quakeColor } from "./constants";

export const DynamicSky = ({ intensity }) => {
  const { scene } = useThree();
  const blended = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color("#c8ced6"), []);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(fogColor, 0.012);
    return () => { scene.fog = null; };
  }, [scene, fogColor]);

  useFrame(() => {
    const t = Math.min(intensity.current / QUAKE_MAX, 1);
    blended.copy(calmColor).lerp(quakeColor, t);
    scene.background = blended;
  });

  return null;
};
