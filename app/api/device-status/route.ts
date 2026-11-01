import type {
  DeviceStatus,
  DeviceStatusApiResponse,
} from "@/types/device";
import {
  getDeviceTransport,
  readMqttSnapshot,
} from "@/lib/cloud/mqtt-device";

export const runtime = "nodejs";

export async function GET() {
  if (getDeviceTransport() === "mqtt") {
    try {
      const data = await readMqttSnapshot<DeviceStatus>("status");
      const body: DeviceStatusApiResponse = { online: true, data };

      return Response.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      const body: DeviceStatusApiResponse = {
        online: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to contact ESP32 through MQTT",
      };

      return Response.json(body, { status: 503 });
    }
  }

  const baseUrl = process.env.ESP32_BASE_URL;

  if (!baseUrl) {
    const body: DeviceStatusApiResponse = {
      online: false,
      error: "ESP32_BASE_URL is not configured",
    };

    return Response.json(body, { status: 500 });
  }

  try {
    const response = await fetch(`${baseUrl}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      throw new Error(
        `ESP32 returned status ${response.status}`,
      );
    }

    const data = (await response.json()) as DeviceStatus;
    const body: DeviceStatusApiResponse = {
      online: true,
      data,
    };

    return Response.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const body: DeviceStatusApiResponse = {
      online: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to contact ESP32",
    };

    return Response.json(body, { status: 503 });
  }
}
