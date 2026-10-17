import type { SensorSource } from "./sensor-source";
import { Esp32SensorSource } from "./esp32-sensor-source";
import { MockSensorSource } from "./mock-sensor-source";
import type { SensorScenario } from "@/types/sensor";

export function getSensorSource(
    scenario: SensorScenario = "random"
): SensorSource { 
  if (process.env.SENSOR_SOURCE === "esp32") {
    const baseUrl = process.env.ESP32_BASE_URL;

    if (!baseUrl) {
      throw new Error("ESP32_BASE_URL is required when SENSOR_SOURCE=esp32");
    }

    return new Esp32SensorSource(baseUrl);
  }

  return new MockSensorSource(scenario);
}
