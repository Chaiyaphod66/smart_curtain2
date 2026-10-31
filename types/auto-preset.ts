export type AutoPresetId =
  | "heat-protection"
  | "natural-light"
  | "balanced"
  | "custom";

export type AutoResponseStyle = "standard" | "gentle";

export type TemperatureAutoRule = {
  enabled: boolean;
  closeAtOrAboveCelsius: number;
  reopenAtOrBelowCelsius: number;
};

export type LightAutoRule = {
  enabled: boolean;
  ranges: LightAutoRange[];
};

export type LightAutoRange = {
  minLux: number;
  maxLux: number | null;
  targetPercent: number;
};

export type AutoPreset = {
  id: AutoPresetId;
  name: string;
  description: string;
  temperature: TemperatureAutoRule;
  light: LightAutoRule;
  openTargetPercent: number;
  closedTargetPercent: number;
  confirmationReadings: number;
  cooldownSeconds: number;
  responseStyle: AutoResponseStyle;
};

export type AutoDecisionAction =
  | "open"
  | "close"
  | "adjust"
  | "hold"
  | "waiting";

export type AutoPresetDecision = {
  action: AutoDecisionAction;
  targetPercent: number | null;
  reasons: string[];
};
