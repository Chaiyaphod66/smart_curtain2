import type { AutoResponseStyle } from "../../types/auto-preset.ts";

export const GENTLE_MAX_STEP_PERCENT = 15;
export const GENTLE_MIN_STEP_PERCENT = 5;

export type AutoResponseTarget = {
  targetPercent: number | null;
  desiredTargetPercent: number;
  stepPercent: number | null;
  limited: boolean;
};

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function getAutoResponseTarget(
  responseStyle: AutoResponseStyle,
  desiredTargetPercent: number,
  currentPositionPercent: number | null,
  stepPercent = GENTLE_MAX_STEP_PERCENT,
): AutoResponseTarget {
  const desired = clamp(Math.round(desiredTargetPercent));

  if (responseStyle === "standard") {
    return {
      targetPercent: desired,
      desiredTargetPercent: desired,
      stepPercent: null,
      limited: false,
    };
  }

  if (
    currentPositionPercent === null ||
    !Number.isFinite(currentPositionPercent)
  ) {
    return {
      targetPercent: null,
      desiredTargetPercent: desired,
      stepPercent: null,
      limited: true,
    };
  }

  const current = clamp(currentPositionPercent);
  const safeStep = Math.max(
    GENTLE_MIN_STEP_PERCENT,
    Math.min(GENTLE_MAX_STEP_PERCENT, Math.round(stepPercent)),
  );
  const difference = desired - current;
  const target =
    Math.abs(difference) <= safeStep
      ? desired
      : Math.round(current + Math.sign(difference) * safeStep);

  return {
    targetPercent: clamp(target),
    desiredTargetPercent: desired,
    stepPercent: safeStep,
    limited: Math.abs(difference) > safeStep,
  };
}
