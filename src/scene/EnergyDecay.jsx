import { useFrame } from "@react-three/fiber";

export const EnergyDecay = ({ freqBalance }) => {
  useFrame(() => {
    freqBalance.current *= 0.993;
  });
  return null;
};
