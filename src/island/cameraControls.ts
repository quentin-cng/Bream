export const CAMERA_FOCUS_BOUNDS = {
  centerX: 0.7,
  centerZ: 0.2,
  radiusX: 1.8,
  radiusZ: 1.6,
  panWorldUnitsPerPoint: 0.0085,
} as const;

export type CameraFocus = {
  focusX: number;
  focusZ: number;
};

export type CameraPanState = CameraFocus & {
  azimuth: number;
  elevation: number;
  zoom: number;
};

export function clampCameraFocus(focusX: number, focusZ: number): CameraFocus {
  const normalizedX = (focusX - CAMERA_FOCUS_BOUNDS.centerX)
    / CAMERA_FOCUS_BOUNDS.radiusX;
  const normalizedZ = (focusZ - CAMERA_FOCUS_BOUNDS.centerZ)
    / CAMERA_FOCUS_BOUNDS.radiusZ;
  const distance = Math.hypot(normalizedX, normalizedZ);
  if (distance <= 1) return { focusX, focusZ };

  return {
    focusX: CAMERA_FOCUS_BOUNDS.centerX
      + normalizedX / distance * CAMERA_FOCUS_BOUNDS.radiusX,
    focusZ: CAMERA_FOCUS_BOUNDS.centerZ
      + normalizedZ / distance * CAMERA_FOCUS_BOUNDS.radiusZ,
  };
}

export function panCameraFocus(
  state: CameraPanState,
  screenDeltaX: number,
  screenDeltaY: number,
): CameraFocus {
  const scale = CAMERA_FOCUS_BOUNDS.panWorldUnitsPerPoint * state.zoom;
  // These axes are the camera's right vector and its screen-up vector
  // projected onto the horizontal island plane. The limited elevation
  // compensation keeps vertical pans consistent without becoming unstable
  // at the lowest viewing angle.
  const rightX = Math.cos(state.azimuth);
  const rightZ = -Math.sin(state.azimuth);
  const radialX = Math.sin(state.azimuth);
  const radialZ = Math.cos(state.azimuth);
  const verticalScale = scale * Math.min(
    1.35,
    1 / Math.max(0.75, Math.sin(state.elevation) + 0.25),
  );

  return clampCameraFocus(
    state.focusX - screenDeltaX * scale * rightX - screenDeltaY * verticalScale * radialX,
    state.focusZ - screenDeltaX * scale * rightZ - screenDeltaY * verticalScale * radialZ,
  );
}
