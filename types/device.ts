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

export type DeviceStatus = {
  status: "ok";
  device: string;
  firmwareVersion: string;
  network?: {
    mode: "station" | "access-point";
    ready: boolean;
    ipAddress: string;
    rssi: number | null;
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
    fault?:
      | "encoder-no-pulse"
      | "position-timeout"
      | "closed-limit-timeout"
      | "open-limit-timeout"
      | null;
    lastStopReason?:
      | "manual"
      | "closed-limit"
      | "open-limit"
      | "closed-limit-timeout"
      | "open-limit-timeout"
      | "position-target"
      | "jog-timeout";
  };
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
