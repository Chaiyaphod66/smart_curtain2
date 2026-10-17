export type EncoderSignalState =
  | "both"
  | "a-only"
  | "b-only"
  | "none";

export function getEncoderSignalState(
  aPulseChange: number,
  bPulseChange: number,
): EncoderSignalState {
  const hasA = Number.isFinite(aPulseChange) && aPulseChange > 0;
  const hasB = Number.isFinite(bPulseChange) && bPulseChange > 0;

  if (hasA && hasB) {
    return "both";
  }

  if (hasA) {
    return "a-only";
  }

  if (hasB) {
    return "b-only";
  }

  return "none";
}
