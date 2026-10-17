import type { SensorReading } from "@/types/sensor";

export interface SensorSource {
  read(): Promise<SensorReading>;
}

export type SensorScenario = "random" | "dim" | "normal" | "bright";