# Snowy Mountains

A small **audio-reactive 3D scene** built for a take-home challenge: a snowy mountain landscape that responds to your microphone in real time.

## Demo

**Live:** [Add your deployed URL here](https://example.com) (e.g. Vercel after you connect the repo)

Open the link in a **desktop browser** (Chrome or Safari work well). You will need to **allow microphone access** when the browser asks.

## How to try it

1. Open the demo (or run locally; see below).
2. **Click once on the mountain view** so the browser can show the mic permission prompt and start listening.
3. **Speak, hum, or play sound** near your mic. The terrain, sky, snow, and camera shake react to loudness and spectral content.

If motion stops after a long idle period, **click the scene again** so the audio engine can resume (browser autoplay rules).

## Tech stack

- [React](https://react.dev/) 18
- [Vite](https://vitejs.dev/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/introduction) + [Three.js](https://threejs.org/)
- [Drei](https://github.com/pmndrs/drei) (clouds, plane helpers)
- Web Audio API (`AnalyserNode`, microphone input)

## Run locally

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). Mic access requires **localhost** or **HTTPS** in production.

## Build

```bash
npm run build
npm run preview
```

`preview` serves the production build locally so you can sanity-check before deploy.

## Project layout

- `src/App.jsx` – canvas shell, mic click-to-start wiring
- `src/audio/AudioAnalyser.jsx` – Web Audio analyser, RMS / bands / centroid driving refs
- `src/scene/` – terrain, sky, snow, clouds, camera rig, shared constants

## Assets

Terrain uses bundled textures (`elevation.png`, `normals.png`, `colors.png` in `public/`). Ensure those files stay in `public` when you deploy.

---

Submitted as part of the [Avora audio visualization challenge](https://challenge.getavora.ai).
