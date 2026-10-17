import type { SensorReading, SensorScenario } from "@/types/sensor";
import type { SensorSource } from "./sensor-source";

const scenarios = {
    dim: {
        temperatureCelsius: 26,
        humidityPercent: 70,
        lightLux: 300,
    },
    normal: {
        temperatureCelsius: 28.5,
        humidityPercent: 65,
        lightLux: 720,
    },
    bright: {
        temperatureCelsius: 33,
        humidityPercent: 55,
        lightLux: 1200,
    },
};

const samples = [
    scenarios.dim,
    scenarios.normal,
    scenarios.bright,
    { temperatureCelsius: 25, humidityPercent: 75, lightLux: 100 },
];

export class MockSensorSource implements SensorSource {
    constructor(
        private readonly scenario: SensorScenario = "random"
    ) {}
    
    async read(): Promise<SensorReading> {
        if (this.scenario === "offline") {
    throw new Error("จำลองเซ็นเซอร์ขัดข้อง");
}
        const sample =
            this.scenario === "random"
                ? samples[Math.floor(Math.random() * samples.length)]
                : scenarios[this.scenario];

        return {
            ...sample,
            recordedAt: new Date().toISOString(),
        };
    }
}