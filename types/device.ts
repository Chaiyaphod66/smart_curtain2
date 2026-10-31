import type { AutoResponseStyle } from "./auto-preset";

export type LimitSensorStatus = {
  active: boolean;
  rawLevel: "HIGH" | "LOW";
  triggerCount: number;
  lastChangedMs: number;
};

export type LimitSensorGroup = {
  closed: LimitSensorStatus;
  open: LimitSensorStatus;
  conflict: boolean;
  closedStopEnabled?: boolean;
  openStopEnabled?: boolean;
  safetyEnabled: boolean;
};

export type DeviceAutoStatus = {
  configured: boolean;
  enabled: boolean;
  presetId: string | null;
  configRevision: number | null;
  responseStyle?: AutoResponseStyle;
  gentleStepPercent?: number | null;
  gentleLastDirection?: "open" | "close" | null;
  gentleResolutionLimited?: boolean;
  modelATemperatureBandIndex?: number | null;
  modelAHighLux?: number | null;
  phase:
    | "not-configured"
    | "disabled"
    | "dry-run"
    | "confirming"
    | "dry-run-ready"
    | "waiting"
    | "holding"
    | "moving"
    | "cooldown"
    | "blocked"
    | "resolution-limited"
    | "fault";
  reason: string;
  candidateTargetPercent: number | null;
  confirmationCount: number;
  confirmationRequired: number | null;
  cooldownRemainingSeconds: number;
  lastCommandTargetPercent: number | null;
  commandActive: boolean;
};

export type DeviceStatus = {
  status: "ok";
  device: string;
  firmwareVersion: string;
  network?: {
    mode: "station" | "access-point";
    ready: boolean;
    ipAddress: string;
    rssi: number | null;
    failSafeTriggered?: boolean;
    lastDisconnectMs?: number | null;
  };
  motor: {
    state: "running" | "stopped";
    speed: number;
    timeoutMs: number;
    positionTimeoutMs?: number;
    limitTestTimeoutMs?: number;
    positionControlAvailable?: boolean;
    controlMode?: "idle" | "jog" | "position" | "limit-test";
    targetPercent?: number | null;
    fault?: string | null;
    lastStopReason?: string;
  };
  limitStopDiagnostic?: {
    side: "closed" | "open";
    edgeCaptured: boolean;
    edgeToBrakeUs: number | null;
    edgeToBrakeEncoderAEdges: number | null;
    brakeEncoderAEdges: number;
    afterBrakeEncoderAEdges: number | null;
    settled: boolean;
    interrupted: boolean;
    maxSafetyPollGapUs: number;
    maxWebHandlerUs: number;
  } | null;
  sensors: {
    dht22: boolean;
    bh1750: boolean;
  };
  limits: LimitSensorGroup;
  encoder: {
    count: number | null;
    pulseDetected: boolean;
    aPulseCount: number;
    bPulseCount: number;
    positionPercent: number | null;
    calibrated: boolean;
  };
  calibration?: {
    stage: "not-started" | "closed-set" | "ready";
    closedSet: boolean;
    openSet: boolean;
    closedCount: number | null;
    openCount: number | null;
    travelPulses: number | null;
    persistentStored?: boolean;
    storedTravelPulses?: number | null;
    requiresHoming: boolean;
  };
  auto?: DeviceAutoStatus;
  uptimeMs: number;
};

export type DeviceStatusApiResponse =
  | {
      online: true;
      data: DeviceStatus;
    }
  | {
      online: false;
      error: string;
    };
