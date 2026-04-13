import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { QUAKE_MAX } from "./constants";

const createSnowflakeTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const cx = 32, cy = 32;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.15, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
};

export const Snow = ({ count = 10000, intensity }) => {
  const mesh = useRef();
  const snowTex = useMemo(createSnowflakeTexture, []);

  const { positions, drifts, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const dr = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      dr[i * 3] = (Math.random() - 0.5) * 0.015;
      dr[i * 3 + 1] = 0.02 + Math.random() * 0.04;
      dr[i * 3 + 2] = Math.random() * Math.PI * 2;
      sz[i] = 0.08 + Math.random() * 0.15;
    }
    return { positions: pos, drifts: dr, sizes: sz };
  }, [count]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const pos = mesh.current.geometry.attributes.position.array;

    const quake = intensity ? Math.min(intensity.current / QUAKE_MAX, 1) : 0;
    const windX = quake * (3.0 + Math.sin(t * 0.7) * 2.0);
    const windZ = quake * (1.5 + Math.cos(t * 0.5) * 1.0);
    const gust = quake * Math.max(0, Math.sin(t * 0.3)) * 4.0;

    for (let i = 0; i < count; i++) {
      const drift = drifts[i * 3];
      const fallSpeed = drifts[i * 3 + 1];
      const phase = drifts[i * 3 + 2];
      pos[i * 3] += (Math.sin(t * 0.5 + phase) * drift + (windX + gust) * delta);
      pos[i * 3 + 1] -= fallSpeed * (1 + quake * 0.5);
      pos[i * 3 + 2] += (Math.cos(t * 0.3 + phase) * drift + windZ * delta);
      if (pos[i * 3 + 1] < -3 || pos[i * 3] > 35) {
        pos[i * 3] = (quake > 0.1 ? -30 + Math.random() * 10 : (Math.random() - 0.5) * 60);
        pos[i * 3 + 1] = 25 + Math.random() * 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={snowTex}
        color="white"
        size={0.25}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  );
};

export const SnowStreaks = ({ count = 3000, intensity }) => {
  const mesh = useRef();
  const matRef = useRef();
  const snowTex = useMemo(createSnowflakeTexture, []);

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 25 - 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      spd[i] = 8 + Math.random() * 12;
    }
    return { positions: pos, speeds: spd };
  }, [count]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const quake = intensity ? Math.min(intensity.current / QUAKE_MAX, 1) : 0;
    const pos = mesh.current.geometry.attributes.position.array;
    const gust = Math.max(0, Math.sin(t * 0.3)) * 6;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += (speeds[i] + gust) * quake * delta;
      pos[i * 3 + 1] -= 0.5 * quake * delta;
      if (pos[i * 3] > 40) {
        pos[i * 3] = -40;
        pos[i * 3 + 1] = Math.random() * 25 - 3;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;

    matRef.current.opacity = quake * (0.3 + Math.sin(t * 0.4) * 0.1);
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={snowTex}
        color="#dde4ed"
        size={0.4}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};
