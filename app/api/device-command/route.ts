import {
  getDeviceTransport,
  isDeviceCommandPath,
  MqttDeviceError,
  sendMqttDeviceCommand,
  type DeviceCommandParams,
} from "@/lib/cloud/mqtt-device";

export const runtime = "nodejs";

type DeviceCommandRequest = {
  path?: unknown;
  params?: unknown;
};

function normalizeParams(value: unknown): DeviceCommandParams | null {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const result: DeviceCommandParams = {};

  for (const [key, item] of Object.entries(value)) {
    if (
      !/^[A-Za-z0-9_-]{1,32}$/.test(key) ||
      typeof item !== "string" ||
      item.length > 64
    ) {
      return null;
    }

    result[key] = item;
  }

  return result;
}

export async function POST(request: Request) {
  let payload: DeviceCommandRequest;

  try {
    payload = (await request.json()) as DeviceCommandRequest;
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!isDeviceCommandPath(payload.path)) {
    return Response.json({ ok: false, message: "Unsupported device command" }, { status: 400 });
  }

  const params = normalizeParams(payload.params);
  if (!params) {
    return Response.json({ ok: false, message: "Invalid command parameters" }, { status: 400 });
  }

  if (getDeviceTransport() === "mqtt") {
    try {
      const result = await sendMqttDeviceCommand<Record<string, unknown>>(
        payload.path,
        params,
      );
      return Response.json(result.body, {
        status: result.status,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      const status = error instanceof MqttDeviceError ? error.statusCode : 503;
      const message =
        error instanceof Error ? error.message : "Unable to contact ESP32 through MQTT";
      return Response.json({ ok: false, message }, { status });
    }
  }

  const baseUrl = process.env.ESP32_BASE_URL;
  if (!baseUrl) {
    return Response.json(
      { ok: false, message: "ESP32_BASE_URL is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(payload.path, `${baseUrl.replace(/\/$/, "")}/`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  try {
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unable to contact ESP32",
      },
      { status: 503 },
    );
  }
}
