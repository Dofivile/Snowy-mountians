import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";

import { CAMERA_POS, EARTHQUAKE_SHAKE_XY, EARTHQUAKE_SHAKE_Y } from "./constants";

export const CameraSetup = () => {
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

export const Earthquake = ({ intensity }) => {
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
      camera.position.x = basePos.current.x + Math.sin(t * 1.1) * s * EARTHQUAKE_SHAKE_XY;
      camera.position.z = basePos.current.z + Math.cos(t * 0.9) * s * EARTHQUAKE_SHAKE_XY;
      camera.position.y = basePos.current.y + Math.sin(t * 1.7) * s * EARTHQUAKE_SHAKE_Y;
    } else {
      camera.position.copy(basePos.current);
    }
  });

  return null;
};
