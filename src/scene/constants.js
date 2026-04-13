import * as THREE from "three";

export const neutralColor = new THREE.Color("#ffffff");

export const BASS_ACCENTS = [
  "#c8856a",
  "#d4a07c",
  "#c99b8a",
  "#b8957a",
  "#d4a574",
].map((h) => new THREE.Color(h));

export const TREBLE_ACCENTS = [
  "#6a8fc8",
  "#8b7fd6",
  "#5ec4d4",
  "#b8a0e8",
  "#7a9fd4",
].map((h) => new THREE.Color(h));

export const samplePalette = (palette, phase) => {
  const n = palette.length;
  const i = Math.floor(phase);
  const f = phase - i;
  const a = palette[((i % n) + n) % n];
  const b = palette[((i + 1) % n + n) % n];
  return a.clone().lerp(b, f);
};

export const BASE_DISPLACEMENT = 2;
export const MAX_DISPLACEMENT = 4.5;
export const QUAKE_MAX = 4.5;
export const GRID_COLS = 7;
export const GRID_ROWS = 2;
export const SECTION_COUNT = GRID_COLS * GRID_ROWS;
export const TERRAIN_BURST_HEIGHT = 4.5;
export const SECTION_INERTIA = 0.095;
export const SECTION_WEIGHT_SHARPNESS = 1.05;

export const calmColor = new THREE.Color("#B0B8C1");
export const quakeColor = new THREE.Color("#4A5568");

export const CAMERA_POS = new THREE.Vector3(40, 10, 18);
export const EARTHQUAKE_SHAKE_XY = 0.018;
export const EARTHQUAKE_SHAKE_Y = 0.006;
