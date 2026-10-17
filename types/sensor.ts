export type SensorReading = {
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  lightLux: number | null;
  recordedAt: string;
};

export type SensorScenario =
    | "random"
    | "dim"
    | "normal"
    | "bright"
    | "offline";