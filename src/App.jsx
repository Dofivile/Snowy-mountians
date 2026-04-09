import React, { Suspense, useLayoutEffect, useRef, useMemo, useCallback, useEffect } from "react";
import { Canvas, useLoader, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { Plane, OrbitControls, Cloud, useGLTF } from "@react-three/drei";
import "./styles.css";

const bassColor = new THREE.Color("#c8856a");
const trebleColor = new THREE.Color("#6a8fc8");
const neutralColor = new THREE.Color("#ffffff");

const BASE_DISPLACEMENT = 2;
const MAX_DISPLACEMENT = 4.5;
const SECTION_COUNT = 10;
const GRID_COLS = 5;
const GRID_ROWS = 2;

const Terrain = ({ freqBalance, sectionEnergies }) => {
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
      if (b < 0) {
        tintTarget.copy(neutralColor).lerp(bassColor, Math.abs(b));
      } else if (b > 0) {
        tintTarget.copy(neutralColor).lerp(trebleColor, b);
      } else {
        tintTarget.copy(neutralColor);
      }
      currentTint.lerp(tintTarget, 0.05);
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
        cur[s] += (sectionEnergies.current[s] - cur[s]) * 0.15;
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
          const weight = Math.max(0, 1 - dist * 0.7);
          totalEnergy += cur[s] * weight;
          totalWeight += weight;
        }

        const blended = totalWeight > 0 ? totalEnergy / totalWeight : 0;
        const boost = blended * 4.0;
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
    >
      <meshStandardMaterial
        ref={matRef}
        attach="material"
        color="white"
        map={colors}
        metalness={0.2}
        displacementMap={elevation}
        displacementScale={2}
        normalMap={normals}
      />
    </Plane>
  );
};

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

const SceneClouds = () => (
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

const Snow = ({ count = 10000, intensity }) => {
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

    const quake = intensity ? Math.min(intensity.current / 3, 1) : 0;
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

const SnowStreaks = ({ count = 3000, intensity }) => {
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
    const quake = intensity ? Math.min(intensity.current / 3, 1) : 0;
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

const getTerrainBoost = (worldX, worldZ, energies) => {
  const u = (worldX + 32) / 64;
  const v = (worldZ + 32) / 64;
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
    const weight = Math.max(0, 1 - dist * 0.7);
    totalEnergy += energies[s] * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? (totalEnergy / totalWeight) * 5.0 : 0;
};

const Tree = ({ position, scale = 1, rotation = 0, windPhase = 0, sectionEnergies }) => {
  const { scene } = useGLTF("tree.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef();
  const baseY = position[1];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const sway = Math.sin(t * 1.2 + windPhase) * 0.1;
    const gust = Math.sin(t * 0.4 + windPhase * 0.5) * 0.05;
    groupRef.current.rotation.x = sway + gust;
    groupRef.current.rotation.z = Math.cos(t * 0.9 + windPhase) * 0.07;

    if (sectionEnergies) {
      const boost = getTerrainBoost(position[0], position[2], sectionEnergies.current);
      groupRef.current.position.y = baseY + boost;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive
        object={clone}
        scale={[scale, scale, scale]}
        rotation={[0, rotation, 0]}
      />
    </group>
  );
};

const SceneTrees = ({ sectionEnergies }) => {
  const trees = useMemo(
    () => [
      { position: [24.5, -2, 14.5], scale: 0.035, rotation: 0, windPhase: 0 },
      { position: [24, -2, 14.2], scale: 0.028, rotation: 1.2, windPhase: 0.5 },
      { position: [25, -2, 14.2], scale: 0.042, rotation: 2.5, windPhase: 1.0 },
      { position: [24.2, -2, 15], scale: 0.032, rotation: 0.8, windPhase: 1.5 },
      { position: [24.8, -2, 15], scale: 0.038, rotation: 3.1, windPhase: 2.0 },
      { position: [24, -2, 14.8], scale: 0.035, rotation: 1.9, windPhase: 0.3 },
      { position: [25, -2, 14], scale: 0.028, rotation: 4.0, windPhase: 2.5 },
      { position: [24.2, -2, 14], scale: 0.038, rotation: 0.5, windPhase: 1.2 },
      { position: [27, -1, 6], scale: 0.035, rotation: 2.0, windPhase: 0.8 },
    ],
    []
  );

  return (
    <group>
      {trees.map((t, i) => (
        <Tree key={i} position={t.position} scale={t.scale} rotation={t.rotation} windPhase={t.windPhase} sectionEnergies={sectionEnergies} />
      ))}
    </group>
  );
};

const Rock = ({ position, scale = 0.03, rotation = 0, sectionEnergies }) => {
  const { scene } = useGLTF("rock.glb");
  const clone = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef();
  const baseY = position[1];

  useFrame(() => {
    if (sectionEnergies && groupRef.current) {
      const boost = getTerrainBoost(position[0], position[2], sectionEnergies.current);
      groupRef.current.position.y = baseY + boost;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive
        object={clone}
        scale={[scale, scale, scale]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
};

useGLTF.preload("tree.glb");
useGLTF.preload("rock.glb");

const calmColor = new THREE.Color("#B0B8C1");
const quakeColor = new THREE.Color("#4A5568");

const DynamicSky = ({ intensity }) => {
  const { scene } = useThree();
  const blended = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color("#c8ced6"), []);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(fogColor, 0.012);
    return () => { scene.fog = null; };
  }, [scene, fogColor]);

  useFrame(() => {
    const t = Math.min(intensity.current / 3, 1);
    blended.copy(calmColor).lerp(quakeColor, t);
    scene.background = blended;
  });

  return null;
};

const CAMERA_POS = new THREE.Vector3(40, 10, 18);

const CameraSetup = () => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(40, 10, 18);
    camera.lookAt(0, -3, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  useFrame(() => {
    camera.lookAt(0, -3, 0);
  });
  return null;
};

const Earthquake = ({ intensity }) => {
  const { camera } = useThree();
  const basePos = useRef(CAMERA_POS.clone());

  useEffect(() => {
    camera.position.copy(CAMERA_POS);
    camera.lookAt(0, -3, 0);
  }, [camera]);

  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (intensity.current > 0.01) {
      const s = intensity.current;
      const t = time.current * 25;
      camera.position.x = basePos.current.x + Math.sin(t * 1.1) * s * 0.4;
      camera.position.z = basePos.current.z + Math.cos(t * 0.9) * s * 0.4;
      camera.position.y = basePos.current.y + Math.sin(t * 1.7) * s * 0.1;
      intensity.current *= 0.97;
    } else {
      camera.position.copy(basePos.current);
      intensity.current = 0;
    }
  });

  return null;
};

const EnergyDecay = ({ sectionEnergies, freqBalance }) => {
  useFrame(() => {
    const arr = sectionEnergies.current;
    for (let i = 0; i < SECTION_COUNT; i++) {
      arr[i] *= 0.94;
    }
    freqBalance.current *= 0.995;
  });
  return null;
};

export default function App() {
  const quakeIntensity = useRef(0);
  const freqBalance = useRef(0);
  const sectionEnergies = useRef(new Float32Array(SECTION_COUNT));
  const lastClickTime = useRef(0);
  const nextSection = useRef(0);

  const handleClick = useCallback(() => {
    const now = Date.now();
    const dt = now - lastClickTime.current;
    lastClickTime.current = now;

    const boost = dt < 300 ? 0.8 : dt < 600 ? 0.5 : 0.3;
    quakeIntensity.current = Math.min(quakeIntensity.current + boost, 3);

    const energy = dt < 200 ? 0.3 : dt < 400 ? 0.5 : 0.8;

    const primary = nextSection.current % SECTION_COUNT;
    const neighbor = (primary + 1) % SECTION_COUNT;
    sectionEnergies.current[primary] = Math.min(sectionEnergies.current[primary] + energy, 1);
    sectionEnergies.current[neighbor] = Math.min(sectionEnergies.current[neighbor] + energy * 0.5, 1);
    nextSection.current++;

    if (dt < 200) {
      freqBalance.current = Math.min(freqBalance.current + 0.4, 1);
    } else if (dt < 400) {
      freqBalance.current = Math.max(Math.min(freqBalance.current + 0.1, 1), -1);
    } else {
      freqBalance.current = Math.max(freqBalance.current - 0.4, -1);
    }
  }, []);

  return (
    <Canvas
      camera={{
        position: [40, 10, 18],
        fov: 50,
      }}
      onClick={handleClick}
    >
      <DynamicSky intensity={quakeIntensity} />
      <CameraSetup />
      <EnergyDecay sectionEnergies={sectionEnergies} freqBalance={freqBalance} />
      {/* <Earthquake intensity={quakeIntensity} /> */}
      <ambientLight intensity={0.8} />
      <pointLight intensity={2} position={[7, 5, 1]} />
      <SceneClouds />
      <Snow intensity={quakeIntensity} />
      <SnowStreaks intensity={quakeIntensity} />
      <Suspense fallback={null}>
        <Terrain freqBalance={freqBalance} sectionEnergies={sectionEnergies} />
        <SceneTrees sectionEnergies={sectionEnergies} />
        <Rock position={[25.1, -2, 15.1]} scale={0.2} sectionEnergies={sectionEnergies} />
      </Suspense>
    </Canvas>
  );
}
