export type AutoRuntimePhase =
  | "waiting"
  | "confirming"
  | "ready"
  | "commanding"
  | "moving"
  | "cooldown"
  | "fault";

export type AutoRuntimeState = {
  phase: AutoRuntimePhase;
  candidateKey: string | null;
  confirmationCount: number;
  lastSampleId: string | null;
  targetPercent: number | null;
  commandStartedAtMs: number | null;
  commandTargetPercent: number | null;
  cooldownUntilMs: number | null;
  clockMs: number;
  faultMessage: string | null;
};
