import type { SensorReading } from "@/types/sensor";
import type { SensorSource } from "./sensor-source";

type Esp32SensorPayload = {
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  lightLux: number | null;
  sampledAtMs: number;
};

function normalizeSensorValue(
  value: number | null,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

export class Esp32SensorSource implements SensorSource {
  constructor(private readonly baseUrl: string) {}

  async read(): Promise<SensorReading> {
    const response = await fetch(`${this.baseUrl}/sensors`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(
        `ESP32 returned status ${response.status}`,
      );
    }

    const payload =
      (await response.json()) as Esp32SensorPayload;

    return {
      temperatureCelsius: normalizeSensorValue(
        payload.temperatureCelsius,
      ),
      humidityPercent: normalizeSensorValue(
        payload.humidityPercent,
      ),
      lightLux: normalizeSensorValue(payload.lightLux),
      recordedAt: new Date().toISOString(),
    };
  }
}