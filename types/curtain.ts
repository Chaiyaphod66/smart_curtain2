export type CurtainMode = "manual" | "automatic";

export type CurtainState = {
  positionPercent: number;
  mode: CurtainMode;
  isMoving: boolean;
};
