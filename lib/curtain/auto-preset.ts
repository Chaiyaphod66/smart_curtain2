import type { SensorReading } from "../../types/sensor.ts";
import type {
  AutoDecisionAction,
  AutoPreset,
  AutoPresetDecision,
  LightAutoRange,
} from "../../types/auto-preset.ts";

const MIN_LIGHT_RANGES = 2;
const MAX_LIGHT_RANGES = 5;

export const DEFAULT_AUTO_PRESETS: readonly AutoPreset[] = [
  {
    id: "heat-protection",
    name: "กันความร้อน",
    description: "ให้อุณหภูมิเป็นตัวตัดสินหลัก",
    temperature: {
      enabled: true,
      closeAtOrAboveCelsius: 30,
      reopenAtOrBelowCelsius: 28,
    },
    light: {
      enabled: false,
      ranges: [
        { minLux: 0, maxLux: 600, targetPercent: 100 },
        { minLux: 600, maxLux: 900, targetPercent: 70 },
        { minLux: 900, maxLux: 1200, targetPercent: 40 },
        { minLux: 1200, maxLux: null, targetPercent: 10 },
      ],
    },
    openTargetPercent: 100,
    closedTargetPercent: 10,
    confirmationReadings: 3,
    cooldownSeconds: 120,
  },
  {
    id: "natural-light",
    name: "รับแสงธรรมชาติ",
    description: "ปรับตำแหน่งม่านตามหลายช่วงแสง",
    temperature: {
      enabled: false,
      closeAtOrAboveCelsius: 30,
      reopenAtOrBelowCelsius: 28,
    },
    light: {
      enabled: true,
      ranges: [
        { minLux: 0, maxLux: 500, targetPercent: 100 },
        { minLux: 500, maxLux: 800, targetPercent: 75 },
        { minLux: 800, maxLux: 1000, targetPercent: 50 },
        { minLux: 1000, maxLux: null, targetPercent: 20 },
      ],
    },
    openTargetPercent: 100,
    closedTargetPercent: 20,
    confirmationReadings: 3,
    cooldownSeconds: 120,
  },
  {
    id: "balanced",
    name: "สมดุล",
    description: "ใช้อุณหภูมิคุมความร้อนและแบ่งหลายช่วงแสง",
    temperature: {
      enabled: true,
      closeAtOrAboveCelsius: 30,
      reopenAtOrBelowCelsius: 28,
    },
    light: {
      enabled: true,
      ranges: [
        { minLux: 0, maxLux: 600, targetPercent: 90 },
        { minLux: 600, maxLux: 800, targetPercent: 65 },
        { minLux: 800, maxLux: 1000, targetPercent: 40 },
        { minLux: 1000, maxLux: null, targetPercent: 15 },
      ],
    },
    openTargetPercent: 90,
    closedTargetPercent: 15,
    confirmationReadings: 3,
    cooldownSeconds: 120,
  },
  {
    id: "custom",
    name: "กำหนดเอง",
    description: "เลือกเซ็นเซอร์ ช่วงแสง และตำแหน่งเอง",
    temperature: {
      enabled: true,
      closeAtOrAboveCelsius: 31,
      reopenAtOrBelowCelsius: 27,
    },
    light: {
      enabled: true,
      ranges: [
        { minLux: 0, maxLux: 450, targetPercent: 80 },
        { minLux: 450, maxLux: 800, targetPercent: 60 },
        { minLux: 800, maxLux: 1200, targetPercent: 40 },
        { minLux: 1200, maxLux: null, targetPercent: 25 },
      ],
    },
    openTargetPercent: 80,
    closedTargetPercent: 25,
    confirmationReadings: 3,
    cooldownSeconds: 120,
  },
];

function isUsableReading(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function getLightRangeErrors(ranges: LightAutoRange[]): string[] {
  const errors: string[] = [];

  if (
    ranges.length < MIN_LIGHT_RANGES ||
    ranges.length > MAX_LIGHT_RANGES
  ) {
    errors.push(
      `ช่วงแสงต้องมี ${MIN_LIGHT_RANGES}–${MAX_LIGHT_RANGES} ช่วง`,
    );
    return errors;
  }

  if (ranges[0]?.minLux !== 0) {
    errors.push("ช่วงแสงแรกต้องเริ่มที่ 0 lux");
  }

  ranges.forEach((range, index) => {
    const number = index + 1;
    const isLast = index === ranges.length - 1;

    if (!Number.isFinite(range.minLux) || range.minLux < 0) {
      errors.push(`ช่วงแสงที่ ${number} มีค่าเริ่มต้นไม่ถูกต้อง`);
    }

    if (
      !Number.isFinite(range.targetPercent) ||
      range.targetPercent < 0 ||
      range.targetPercent > 100
    ) {
      errors.push(`เป้าหมายช่วงแสงที่ ${number} ต้องอยู่ระหว่าง 0–100%`);
    }

    if (isLast) {
      if (range.maxLux !== null) {
        errors.push("ช่วงแสงสุดท้ายต้องครอบคลุมค่าที่สูงกว่าทั้งหมด");
      }
    } else {
      if (
        range.maxLux === null ||
        !Number.isFinite(range.maxLux) ||
        range.maxLux <= range.minLux
      ) {
        errors.push(`ขอบเขตช่วงแสงที่ ${number} ไม่ถูกต้อง`);
      }

      const nextRange = ranges[index + 1];
      if (range.maxLux !== nextRange?.minLux) {
        errors.push(`ช่วงแสงที่ ${number} และ ${number + 1} ต้องต่อกันพอดี`);
      }

      if (
        nextRange &&
        nextRange.targetPercent > range.targetPercent
      ) {
        errors.push("เมื่อแสงมากขึ้น ตำแหน่งม่านต้องไม่เปิดเพิ่ม");
      }
    }
  });

  return [...new Set(errors)];
}

export function getAutoPresetValidationErrors(
  preset: AutoPreset,
): string[] {
  const errors: string[] = [];

  if (!preset.temperature.enabled && !preset.light.enabled) {
    errors.push("ต้องเปิดใช้เซ็นเซอร์อย่างน้อยหนึ่งชนิด");
  }

  if (
    preset.temperature.enabled &&
    preset.temperature.reopenAtOrBelowCelsius >=
      preset.temperature.closeAtOrAboveCelsius
  ) {
    errors.push("อุณหภูมิเปิดกลับต้องต่ำกว่าอุณหภูมิปิด");
  }

  if (preset.light.enabled) {
    errors.push(...getLightRangeErrors(preset.light.ranges));
  }

  if (
    preset.openTargetPercent < 0 ||
    preset.openTargetPercent > 100 ||
    preset.closedTargetPercent < 0 ||
    preset.closedTargetPercent > 100
  ) {
    errors.push("ตำแหน่งเป้าหมายต้องอยู่ระหว่าง 0–100%");
  }

  if (preset.openTargetPercent <= preset.closedTargetPercent) {
    errors.push("ตำแหน่งเปิดต้องมากกว่าตำแหน่งปิด");
  }

  if (
    !Number.isInteger(preset.confirmationReadings) ||
    preset.confirmationReadings < 1 ||
    preset.confirmationReadings > 10
  ) {
    errors.push("จำนวนครั้งยืนยันต้องเป็นจำนวนเต็มระหว่าง 1–10");
  }

  if (
    !Number.isFinite(preset.cooldownSeconds) ||
    preset.cooldownSeconds < 0 ||
    preset.cooldownSeconds > 3600
  ) {
    errors.push("เวลาพักต้องอยู่ระหว่าง 0–3600 วินาที");
  }

  return errors;
}

function findLightRange(
  ranges: LightAutoRange[],
  lightLux: number,
): LightAutoRange | null {
  return (
    ranges.find(
      (range) =>
        lightLux >= range.minLux &&
        (range.maxLux === null || lightLux < range.maxLux),
    ) ?? null
  );
}

function getTargetAction(
  preset: AutoPreset,
  targetPercent: number,
): AutoDecisionAction {
  if (targetPercent >= preset.openTargetPercent) {
    return "open";
  }

  if (targetPercent <= preset.closedTargetPercent) {
    return "close";
  }

  return "adjust";
}

function describeLightRange(range: LightAutoRange): string {
  if (range.maxLux === null) {
    return `ตั้งแต่ ${range.minLux} lux ขึ้นไป`;
  }

  return `${range.minLux}–น้อยกว่า ${range.maxLux} lux`;
}

export function evaluateAutoPreset(
  preset: AutoPreset,
  reading: SensorReading | null,
): AutoPresetDecision {
  const validationErrors = getAutoPresetValidationErrors(preset);

  if (validationErrors.length > 0) {
    return {
      action: "waiting",
      targetPercent: null,
      reasons: validationErrors,
    };
  }

  if (!reading) {
    return {
      action: "waiting",
      targetPercent: null,
      reasons: ["กำลังรอข้อมูลเซ็นเซอร์"],
    };
  }

  const missingSensors: string[] = [];

  if (
    preset.temperature.enabled &&
    !isUsableReading(reading.temperatureCelsius)
  ) {
    missingSensors.push("อุณหภูมิ");
  }

  if (
    preset.light.enabled &&
    !isUsableReading(reading.lightLux)
  ) {
    missingSensors.push("แสง");
  }

  if (missingSensors.length > 0) {
    return {
      action: "waiting",
      targetPercent: null,
      reasons: [`ไม่มีข้อมูล${missingSensors.join("และ")}`],
    };
  }

  const temperatureHigh =
    preset.temperature.enabled &&
    reading.temperatureCelsius !== null &&
    reading.temperatureCelsius >=
      preset.temperature.closeAtOrAboveCelsius;

  if (temperatureHigh && reading.temperatureCelsius !== null) {
    return {
      action: "close",
      targetPercent: preset.closedTargetPercent,
      reasons: [
        `อุณหภูมิ ${reading.temperatureCelsius.toFixed(1)}°C ถึงเกณฑ์ปิด ${preset.temperature.closeAtOrAboveCelsius}°C`,
        "อุณหภูมิสูงมีสิทธิ์ปิดม่านเหนือกฎช่วงแสง",
      ],
    };
  }

  if (preset.light.enabled && reading.lightLux !== null) {
    const range = findLightRange(
      preset.light.ranges,
      reading.lightLux,
    );

    if (!range) {
      return {
        action: "waiting",
        targetPercent: null,
        reasons: ["ไม่พบช่วงแสงที่ตรงกับค่าปัจจุบัน"],
      };
    }

    const reasons = [
      `แสง ${Math.round(reading.lightLux)} lux อยู่ในช่วง ${describeLightRange(range)}`,
      `ช่วงนี้กำหนดเป้าหมายม่านไว้ที่ ${range.targetPercent}%`,
    ];

    if (
      preset.temperature.enabled &&
      reading.temperatureCelsius !== null
    ) {
      reasons.push(
        reading.temperatureCelsius <=
          preset.temperature.reopenAtOrBelowCelsius
          ? `อุณหภูมิ ${reading.temperatureCelsius.toFixed(1)}°C อยู่ในช่วงเปิดได้`
          : `อุณหภูมิ ${reading.temperatureCelsius.toFixed(1)}°C ยังไม่ถึงเกณฑ์ปิด`,
      );
    }

    return {
      action: getTargetAction(preset, range.targetPercent),
      targetPercent: range.targetPercent,
      reasons,
    };
  }

  if (
    preset.temperature.enabled &&
    reading.temperatureCelsius !== null &&
    reading.temperatureCelsius <=
      preset.temperature.reopenAtOrBelowCelsius
  ) {
    return {
      action: "open",
      targetPercent: preset.openTargetPercent,
      reasons: [
        `อุณหภูมิลดถึง ${reading.temperatureCelsius.toFixed(1)}°C`,
      ],
    };
  }

  return {
    action: "hold",
    targetPercent: null,
    reasons: [
      `รออุณหภูมิลดถึง ${preset.temperature.reopenAtOrBelowCelsius}°C`,
    ],
  };
}
