import "server-only";

import { randomUUID } from "node:crypto";
import { connect, type IClientOptions, type MqttClient } from "mqtt";

const DEFAULT_TIMEOUT_MS = 5_000;
const COMMAND_TIMEOUT_MS = 7_000;

export type DeviceTransport = "local" | "mqtt";

export type DeviceCommandPath =
  | "/motor/open"
  | "/motor/close"
  | "/motor/stop"
  | "/motor/open-until-limit"
  | "/motor/close-until-limit"
  | "/motor/position"
  | "/calibration/closed"
  | "/calibration/open"
  | "/calibration/reset"
  | "/auto/config"
  | "/auto/model-a"
  | "/auto/enable"
  | "/auto/disable"
  | "/system/logs";

export type DeviceCommandParams = Record<string, string>;

type CloudCommandResult<T> = {
  id: string;
  status: number;
  body: T;
  uptimeMs: number;
};

export class MqttDeviceError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 503,
  ) {
    super(message);
    this.name = "MqttDeviceError";
  }
}

export function getDeviceTransport(): DeviceTransport {
  return process.env.DEVICE_TRANSPORT === "mqtt" ? "mqtt" : "local";
}

export function isDeviceCommandPath(value: unknown): value is DeviceCommandPath {
  return typeof value === "string" && COMMAND_PATHS.has(value);
}

const COMMAND_PATHS = new Set<string>([
  "/motor/open",
  "/motor/close",
  "/motor/stop",
  "/motor/open-until-limit",
  "/motor/close-until-limit",
  "/motor/position",
  "/calibration/closed",
  "/calibration/open",
  "/calibration/reset",
  "/auto/config",
  "/auto/model-a",
  "/auto/enable",
  "/auto/disable",
  "/system/logs",
]);

function getMqttConfiguration() {
  const url = process.env.MQTT_URL;
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;
  const deviceId = process.env.MQTT_DEVICE_ID ?? "smart-curtain-esp32";
  const prefix = (process.env.MQTT_TOPIC_PREFIX ?? "smart-curtain")
    .replace(/^\/+|\/+$/g, "");

  if (!url || !username || !password) {
    throw new MqttDeviceError(
      "MQTT cloud is not configured on the web server",
      500,
    );
  }

  const baseTopic = `${prefix}/${deviceId}`;

  return {
    url,
    username,
    password,
    baseTopic,
    commandTopic: `${baseTopic}/command`,
    resultTopic: `${baseTopic}/command-result`,
    availabilityTopic: `${baseTopic}/availability`,
    statusTopic: `${baseTopic}/status`,
    sensorsTopic: `${baseTopic}/sensors`,
  };
}

function createMqttClient(): MqttClient {
  const configuration = getMqttConfiguration();
  const options: IClientOptions = {
    clientId: `smart-curtain-web-${randomUUID()}`,
    username: configuration.username,
    password: configuration.password,
    clean: true,
    connectTimeout: DEFAULT_TIMEOUT_MS,
    reconnectPeriod: 0,
    rejectUnauthorized: true,
  };

  if (process.env.MQTT_CA_PEM) {
    options.ca = process.env.MQTT_CA_PEM.replace(/\\n/g, "\n");
  }

  return connect(configuration.url, options);
}

function closeClient(client: MqttClient) {
  client.end(true);
}

function waitForConnection(client: MqttClient): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new MqttDeviceError("MQTT broker connection timed out"));
    }, DEFAULT_TIMEOUT_MS);

    client.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    client.once("error", (error) => {
      clearTimeout(timer);
      reject(new MqttDeviceError(`MQTT connection failed: ${error.message}`));
    });
  });
}

function subscribe(client: MqttClient, topics: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    client.subscribe(topics, { qos: 1 }, (error) => {
      if (error) {
        reject(new MqttDeviceError(`MQTT subscribe failed: ${error.message}`));
        return;
      }

      resolve();
    });
  });
}

function publish(
  client: MqttClient,
  topic: string,
  payload: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1, retain: false }, (error) => {
      if (error) {
        reject(new MqttDeviceError(`MQTT publish failed: ${error.message}`));
        return;
      }

      resolve();
    });
  });
}

export async function readMqttSnapshot<T>(
  kind: "status" | "sensors",
): Promise<T> {
  const configuration = getMqttConfiguration();
  const dataTopic =
    kind === "status" ? configuration.statusTopic : configuration.sensorsTopic;
  const client = createMqttClient();

  try {
    await waitForConnection(client);

    return await new Promise<T>((resolve, reject) => {
      let availability: string | null = null;
      let data: T | null = null;
      const timer = setTimeout(() => {
        reject(new MqttDeviceError("ESP32 cloud status timed out"));
      }, DEFAULT_TIMEOUT_MS);

      const finishIfReady = () => {
        if (availability === "offline") {
          clearTimeout(timer);
          reject(new MqttDeviceError("ESP32 is offline"));
          return;
        }

        if (availability === "online" && data !== null) {
          clearTimeout(timer);
          resolve(data);
        }
      };

      client.on("message", (topic, payload) => {
        if (topic === configuration.availabilityTopic) {
          availability = payload.toString("utf8").trim();
          finishIfReady();
          return;
        }

        if (topic === dataTopic) {
          try {
            data = JSON.parse(payload.toString("utf8")) as T;
            finishIfReady();
          } catch {
            clearTimeout(timer);
            reject(new MqttDeviceError("ESP32 published invalid JSON"));
          }
        }
      });

      subscribe(client, [configuration.availabilityTopic, dataTopic]).catch(
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  } finally {
    closeClient(client);
  }
}

export async function sendMqttDeviceCommand<T>(
  path: DeviceCommandPath,
  params: DeviceCommandParams,
): Promise<{ status: number; body: T }> {
  const configuration = getMqttConfiguration();
  const client = createMqttClient();
  const id = randomUUID();
  const issuedAt = Date.now();
  const command = JSON.stringify({
    version: 1,
    id,
    path,
    params,
    issuedAt,
    expiresAt: issuedAt + 10_000,
  });

  try {
    await waitForConnection(client);

    const resultPromise = new Promise<CloudCommandResult<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new MqttDeviceError("ESP32 did not acknowledge the cloud command"));
      }, COMMAND_TIMEOUT_MS);

      client.on("message", (topic, payload) => {
        if (topic !== configuration.resultTopic) return;

        try {
          const result = JSON.parse(
            payload.toString("utf8"),
          ) as CloudCommandResult<T>;

          if (result.id !== id) return;

          clearTimeout(timer);
          resolve(result);
        } catch {
          // Another client result or malformed payload must not complete this command.
        }
      });
    });

    await subscribe(client, [configuration.resultTopic]);
    await publish(client, configuration.commandTopic, command);
    const result = await resultPromise;

    return { status: result.status, body: result.body };
  } finally {
    closeClient(client);
  }
}
