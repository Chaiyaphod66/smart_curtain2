export type CurtainActionCommand =
  | "open"
  | "close"
  | "stop"
  | "position";

export type CurtainActionStatus =
  | "running"
  | "completed"
  | "interrupted"
  | "failed";

export type CurtainActionRecord = {
  id: string;
  command: CurtainActionCommand;
  status: CurtainActionStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  startPositionPercent: number | null;
  targetPositionPercent: number | null;
  endPositionPercent: number | null;
  positionErrorPercent: number | null;
  startEncoderCount: number | null;
  endEncoderCount: number | null;
  encoderCountChange: number | null;
  motorStoppedEncoderCount?: number | null;
  coastPulseCount?: number | null;
  message: string;
};
