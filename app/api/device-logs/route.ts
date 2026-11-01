import {
  getDeviceTransport,
  MqttDeviceError,
  sendMqttDeviceCommand,
} from "@/lib/cloud/mqtt-device";

export const runtime = "nodejs";

type DeviceLogEntry = {
  recordedAtEpoch: number | null;
  uptimeMs: number;
  durationMs: number;
  direction: "open" | "close";
  targetPercent: number | null;
  startEncoderCount: number;
  stopEncoderCount: number;
  stopReason: string;
  fault: string | null;
};

function getLimit(request: Request) {
  const value = Number(new URL(request.url).searchParams.get("limit") ?? "20");
  return Number.isInteger(value) ? Math.min(20, Math.max(1, value)) : 20;
}

export async function GET(request: Request) {
  const limit = getLimit(request);

  if (getDeviceTransport() === "mqtt") {
    try {
      const result = await sendMqttDeviceCommand<{
        ok: boolean;
        logs: DeviceLogEntry[];
      }>("/system/logs", { limit: String(limit) });

      return Response.json(result.body.logs ?? [], {
        status: result.status,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      const status = error instanceof MqttDeviceError ? error.statusCode : 503;
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to read ESP32 logs through MQTT",
        },
        { status },
      );
    }
  }

  const baseUrl = process.env.ESP32_BASE_URL;
  if (!baseUrl) {
    return Response.json(
      { error: "ESP32_BASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/logs?limit=${limit}`,
      { cache: "no-store", signal: AbortSignal.timeout(5_000) },
    );
    const logs = (await response.json()) as DeviceLogEntry[];
    return Response.json(logs, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to read ESP32 logs",
      },
      { status: 503 },
    );
  }
}
