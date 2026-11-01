import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const firmwareRoot = path.resolve(webRoot, "..", "smart_curtain_esp32");

function readDotEnv(filePath) {
  const values = {};

  for (const sourceLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }

  return values;
}

function readCppString(source, name) {
  const match = source.match(
    new RegExp(`constexpr\\s+char\\s+${name}\\[\\]\\s*=\\s*"([^"]*)";`),
  );

  if (!match) throw new Error(`Missing ${name} in firmware secrets.h`);
  return JSON.parse(`"${match[1]}"`);
}

async function connectOnce(label, url, username, password) {
  if (!username || !password || password.startsWith("YOUR_")) {
    throw new Error(`${label}: credential is incomplete`);
  }

  const client = mqtt.connect(url, {
    username,
    password,
    clean: true,
    connectTimeout: 8_000,
    reconnectPeriod: 0,
    rejectUnauthorized: true,
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label}: connection timed out`)),
        9_000,
      );

      client.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      client.once("error", (error) => {
        clearTimeout(timer);
        reject(new Error(`${label}: ${error.message}`));
      });
    });

    console.log(`${label}: connected`);
  } finally {
    client.end(true);
  }
}

const webEnvironment = readDotEnv(path.join(webRoot, ".env.local"));
const firmwareSecrets = fs.readFileSync(
  path.join(firmwareRoot, "include", "secrets.h"),
  "utf8",
);
const deviceHost = readCppString(firmwareSecrets, "MQTT_HOST");
const deviceUsername = readCppString(firmwareSecrets, "MQTT_USERNAME");
const devicePassword = readCppString(firmwareSecrets, "MQTT_PASSWORD");

await connectOnce(
  "Web credential",
  webEnvironment.MQTT_URL,
  webEnvironment.MQTT_USERNAME,
  webEnvironment.MQTT_PASSWORD,
);
await connectOnce(
  "ESP32 credential",
  `mqtts://${deviceHost}:8883`,
  deviceUsername,
  devicePassword,
);
