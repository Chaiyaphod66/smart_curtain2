import { getSensorSource } from "@/lib/sensors/get-sensor-source";
import {
  getDeviceTransport,
  readMqttSnapshot,
} from "@/lib/cloud/mqtt-device";
import type { SensorReading } from "@/types/sensor";

export const runtime = "nodejs";

type MqttSensorPayload = {
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  lightLux: number | null;
};

function normalizeSensorValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET (request: Request) {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario") ?? "random";

  if (
    scenario !== "random" &&
    scenario !== "dim" &&
    scenario !== "normal" &&
    scenario !== "bright" &&
    scenario !== "offline"
  ) {
    return Response.json (
      { error: "สถานการณ์ต้องเป็น random, dim, normal, bright หรือ offline" },
      { status: 400 }
    );
  }

  try {
    if (getDeviceTransport() === "mqtt") {
      const payload = await readMqttSnapshot<MqttSensorPayload>("sensors");
      const reading: SensorReading = {
        temperatureCelsius: normalizeSensorValue(payload.temperatureCelsius),
        humidityPercent: normalizeSensorValue(payload.humidityPercent),
        lightLux: normalizeSensorValue(payload.lightLux),
        recordedAt: new Date().toISOString(),
      };

      return Response.json(
        { source: "mqtt", data: reading },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const reading = await getSensorSource(scenario).read();

    return Response.json(
      {
        source: process.env.SENSOR_SOURCE ?? "mock",
        data: reading,
      },
      {
        headers: { "Cache-Control": "no-store"},
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read sensors";
    
      return Response.json(
        { error: message },
        { status: 503 }
      );
  }
}
