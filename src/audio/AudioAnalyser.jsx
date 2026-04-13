import { useRef, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

import { SECTION_COUNT, QUAKE_MAX } from "../scene/constants";

const FFT_SIZE = 2048;
const SMOOTHING = 0.72;

const buildBandRanges = (binCount, sampleRate) => {
  const nyquist = sampleRate / 2;
  const edges = [];
  const minBark = 0;
  const maxBark = 13 * Math.atan(0.00076 * nyquist) + 3.5 * Math.atan((nyquist / 7500) ** 2);
  for (let i = 0; i <= SECTION_COUNT; i++) {
    const bark = minBark + (maxBark - minBark) * (i / SECTION_COUNT);
    const freq = 600 * Math.sinh(bark / 6);
    const bin = Math.round((freq / nyquist) * binCount);
    edges.push(Math.min(bin, binCount - 1));
  }
  return edges;
};

const computeRMS = (dataArray) => {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / dataArray.length);
};

const computeSpectralCentroid = (freqData, binCount) => {
  let weightedSum = 0;
  let totalMag = 0;
  for (let i = 0; i < binCount; i++) {
    const mag = freqData[i];
    weightedSum += i * mag;
    totalMag += mag;
  }
  if (totalMag === 0) return 0.5;
  return (weightedSum / totalMag) / binCount;
};

export const useAudioAnalyser = ({
  quakeIntensity,
  freqBalance,
  sectionEnergies,
  palettePhase,
}) => {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const freqData = useRef(null);
  const timeData = useRef(null);
  const bandEdges = useRef(null);
  const prevRMS = useRef(0);
  const activeRef = useRef(false);

  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    freqData.current = new Uint8Array(analyser.frequencyBinCount);
    timeData.current = new Uint8Array(analyser.fftSize);
    bandEdges.current = buildBandRanges(analyser.frequencyBinCount, ctx.sampleRate);
    return ctx;
  }, []);

  const disconnectSource = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const stopCurrent = useCallback(() => {
    disconnectSource();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    activeRef.current = false;
  }, [disconnectSource]);

  const startMic = useCallback(async () => {
    disconnectSource();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    activeRef.current = false;

    const ctx = ensureContext();
    if (ctx.state === "suspended") await ctx.resume();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    sourceRef.current = source;
    activeRef.current = true;

    stream.getTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        activeRef.current = false;
      });
    });
  }, [ensureContext, disconnectSource]);

  const startFile = useCallback(
    async (file) => {
      stopCurrent();
      const ctx = ensureContext();
      if (ctx.state === "suspended") await ctx.resume();
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audioElRef.current = audio;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      source.connect(ctx.destination);
      sourceRef.current = source;
      activeRef.current = true;
      await audio.play();
    },
    [ensureContext, stopCurrent],
  );

  const stop = useCallback(() => {
    stopCurrent();
  }, [stopCurrent]);

  useEffect(() => {
    return () => {
      stopCurrent();
      if (ctxRef.current) ctxRef.current.close();
    };
  }, [stopCurrent]);

  useFrame(() => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (!activeRef.current || !analyserRef.current) return;
    const analyser = analyserRef.current;
    const freq = freqData.current;
    const time = timeData.current;
    const edges = bandEdges.current;

    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(time);

    const rms = computeRMS(time);
    const centroid = computeSpectralCentroid(freq, analyser.frequencyBinCount);

    const rmsGain = 26.0;
    const onsetDelta = Math.max(0, rms - prevRMS.current);
    const onset = onsetDelta > 0.01 ? onsetDelta * 45 : 0;
    const target = Math.min(rms * rmsGain + onset, QUAKE_MAX);
    if (target > quakeIntensity.current) {
      quakeIntensity.current += (target - quakeIntensity.current) * 0.6;
    } else {
      quakeIntensity.current *= 0.93;
    }
    prevRMS.current = rms;

    const balTarget = Math.max(-1, Math.min(1, (centroid - 0.5) * 4));
    freqBalance.current += (balTarget - freqBalance.current) * 0.2;

    for (let s = 0; s < SECTION_COUNT; s++) {
      const lo = edges[s];
      const hi = Math.max(edges[s + 1], lo + 1);
      let sum = 0;
      for (let b = lo; b < hi; b++) sum += freq[b];
      const avg = sum / (hi - lo) / 255;
      const scaled = Math.pow(avg, 0.6) * 1.4;
      const cur = sectionEnergies.current[s];
      if (scaled > cur) {
        sectionEnergies.current[s] += (scaled - cur) * 0.55;
      } else {
        sectionEnergies.current[s] *= 0.92;
      }
    }

    if (onsetDelta > 0.03) {
      palettePhase.current += onsetDelta * 3.0;
    } else {
      palettePhase.current += 0.002;
    }
  });

  return { startMic, startFile, stop, activeRef };
};
