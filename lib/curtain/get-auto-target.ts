export const CLOSE_THRESHOLD_LUX = 900;
export const OPEN_THRESHOLD_LUX = 600;

export function getAutoTarget(
  lightLux: number | null,
): 0 | 100 | null {
  if (
    lightLux === null ||
    !Number.isFinite(lightLux) ||
    lightLux < 0
  ) {
    return null;
  }

  if (lightLux > CLOSE_THRESHOLD_LUX) {
    return 0;
  }

  if (lightLux < OPEN_THRESHOLD_LUX) {
    return 100;
  }

  return null;
}
