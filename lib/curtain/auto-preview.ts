import { getAutoTarget } from "./get-auto-target.ts";

export const REQUIRED_CONSECUTIVE_READINGS = 3;

export type LightLevel =
  | "unavailable"
  | "dim"
  | "normal"
  | "bright";

export type AutoSuggestion =
  | "waiting"
  | "open"
  | "hold"
  | "close";

export type AutoPreviewState = {
  stableLevel: LightLevel;
  candidateLevel: LightLevel;
  candidateCount: number;
};

export const INITIAL_AUTO_PREVIEW_STATE: AutoPreviewState = {
  stableLevel: "unavailable",
  candidateLevel: "unavailable",
  candidateCount: 0,
};

export function getLightLevel(
  lightLux: number | null,
): LightLevel {
  if (
    lightLux === null ||
    !Number.isFinite(lightLux) ||
    lightLux < 0
  ) {
    return "unavailable";
  }

  const target = getAutoTarget(lightLux);

  if (target === 100) {
    return "dim";
  }

  if (target === 0) {
    return "bright";
  }

  return "normal";
}

export function advanceAutoPreview(
  current: AutoPreviewState,
  lightLux: number | null,
): AutoPreviewState {
  const nextLevel = getLightLevel(lightLux);

  if (nextLevel === "unavailable") {
    return INITIAL_AUTO_PREVIEW_STATE;
  }

  if (nextLevel === current.stableLevel) {
    return {
      stableLevel: nextLevel,
      candidateLevel: nextLevel,
      candidateCount: REQUIRED_CONSECUTIVE_READINGS,
    };
  }

  const candidateCount =
    nextLevel === current.candidateLevel
      ? Math.min(
          current.candidateCount + 1,
          REQUIRED_CONSECUTIVE_READINGS,
        )
      : 1;

  return {
    stableLevel:
      candidateCount >= REQUIRED_CONSECUTIVE_READINGS
        ? nextLevel
        : current.stableLevel,
    candidateLevel: nextLevel,
    candidateCount,
  };
}

export function getAutoSuggestion(
  level: LightLevel,
): AutoSuggestion {
  if (level === "dim") {
    return "open";
  }

  if (level === "bright") {
    return "close";
  }

  if (level === "normal") {
    return "hold";
  }

  return "waiting";
}
