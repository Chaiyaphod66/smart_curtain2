import type { AutoPreset } from "@/types/auto-preset";
import type { DeviceAutoStatus } from "@/types/device";

export type MotorCommand = "open" | "close" | "stop";
export type CalibrationCommand = "closed" | "open" | "reset";

export type MotorCommandResponse = {
  ok: boolean;
  command: MotorCommand;
};

export type CalibrationCommandResponse = {
  ok: boolean;
  action: "set-closed" | "set-open" | "reset";
  message: string;
  encoderCount: number;
  stage: "not-started" | "closed-set" | "ready";
};

export type PositionCommandResponse = {
  ok: boolean;
  command: "position";
  message: string;
  targetPercent: number | null;
};

export type CloseUntilLimitResponse = {
  ok: boolean;
  command: "close-until-limit";
  message?: string;
};

export type OpenUntilLimitResponse = {
  ok: boolean;
  command: "open-until-limit";
  message?: string;
};

export type AutoCommandResponse = {
  ok: boolean;
  message: string;
  auto: DeviceAutoStatus;
};

async function postDeviceCommand<T>(
  path: string,
  params: Record<string, string> = {},
  timeoutMs = 5_000,
): Promise<{ response: Response; result: T }> {
  const response = await fetch("/api/device-command", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = (await response.json()) as T;

  return { response, result };
}

export function getAutoPresetRevision(preset: AutoPreset): number {
  const canonical = JSON.stringify({
    id: preset.id,
    temperature: preset.temperature,
    light: preset.light,
    openTargetPercent: preset.openTargetPercent,
    closedTargetPercent: preset.closedTargetPercent,
    confirmationReadings: preset.confirmationReadings,
    cooldownSeconds: preset.cooldownSeconds,
    responseStyle: preset.responseStyle,
  });
  let hash = 2166136261;

  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) & 0x7fffffff;
}

function translateAutoError(message: string): string {
  const messages: Record<string, string> = {
    "Calibration required":
      "ต้องคาลิเบรต Encoder และตั้งตำแหน่ง 0–100% ก่อนเปิด Auto",
    "Limit sensor conflict":
      "ลิมิตเปิดสุดและปิดสุดทำงานพร้อมกัน กรุณาตรวจสายก่อน",
    "Required sensor data is unavailable":
      "เซ็นเซอร์ที่พรีเซ็ตต้องใช้ยังไม่มีข้อมูล",
    "Motor is currently running":
      "รอให้มอเตอร์หยุดก่อนเปิด Auto",
    "Clear motor fault before enabling Auto":
      "พบ Motor fault กรุณาแก้สาเหตุและทดสอบ Manual ก่อน",
    "Limit safety is disabled":
      "ระบบหยุดด้วยลิมิตยังไม่พร้อม จึงเปิด Auto ไม่ได้",
  };

  return messages[message] ?? message;
}

function translateMotorStartError(message: string): string {
  const messages: Record<string, string> = {
    "departure-direction-unverified":
      "ยังไม่ทราบทิศทาง Encoder ขณะออกจากลิมิต กรุณาอัปเดตเฟิร์มแวร์แล้วเริ่ม Homing ใหม่",
    "departure-wrong-direction":
      "Encoder เปลี่ยนค่าไปผิดทิศทางขณะออกจากลิมิต กรุณาตรวจสายมอเตอร์และ Encoder",
    "departure-limit-stuck":
      "ลิมิตต้นทางยังไม่คลายภายในระยะหรือเวลาที่กำหนด กรุณาตรวจตำแหน่งเซ็นเซอร์",
    "departure-encoder-unverified":
      "ระบบยืนยันการเคลื่อนที่ออกจากลิมิตไม่ได้ กรุณาตรวจ Encoder",
    "unexpected-source-limit":
      "ลิมิตต้นทางกลับมาทำงานระหว่างม่านเคลื่อน กรุณาตรวจเซ็นเซอร์",
    "limit-conflict":
      "ลิมิตเปิดสุดและปิดสุดทำงานพร้อมกัน กรุณาตรวจเซ็นเซอร์และสายสัญญาณ",
    "open-limit-active":
      "ม่านอยู่ที่ลิมิตเปิดสุดแล้ว จึงไม่สามารถเคลื่อนไปทางเปิดต่อได้",
    "closed-limit-active":
      "ม่านอยู่ที่ลิมิตปิดสุดแล้ว จึงไม่สามารถเคลื่อนไปทางปิดต่อได้",
    "motor-did-not-start":
      "มอเตอร์ไม่เริ่มทำงาน กรุณาตรวจสถานะอุปกรณ์แล้วลองใหม่",
  };

  return messages[message] ?? message;
}

async function sendAutoRequest(
  path: "config" | "model-a" | "enable" | "disable",
  searchParams?: URLSearchParams,
): Promise<AutoCommandResponse> {
  try {
    const { response, result } = await postDeviceCommand<AutoCommandResponse>(
      `/auto/${path}`,
      searchParams ? Object.fromEntries(searchParams.entries()) : {},
      7_000,
    );

    if (!response.ok || !result.ok) {
      throw new Error(
        translateAutoError(
          result.message || `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
        ),
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error("ESP32 ไม่ตอบกลับภายใน 5 วินาที");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "เชื่อมต่อ ESP32 ไม่ได้ กรุณาตรวจสอบ Wi-Fi และ IP ของบอร์ด",
      );
    }

    throw error;
  }
}

export async function saveAutoConfiguration(
  preset: AutoPreset,
): Promise<AutoCommandResponse> {
  const params = new URLSearchParams({
    presetId: preset.id,
    revision: String(getAutoPresetRevision(preset)),
    temperatureEnabled: String(preset.temperature.enabled),
    closeAt: String(preset.temperature.closeAtOrAboveCelsius),
    reopenAt: String(preset.temperature.reopenAtOrBelowCelsius),
    lightEnabled: String(preset.light.enabled),
    rangeCount: String(preset.light.ranges.length),
    openTarget: String(preset.openTargetPercent),
    closedTarget: String(preset.closedTargetPercent),
    confirmation: String(preset.confirmationReadings),
    cooldown: String(preset.cooldownSeconds),
    responseStyle: preset.responseStyle,
  });

  preset.light.ranges.forEach((range, index) => {
    params.set(`range${index}Min`, String(range.minLux));
    params.set(
      `range${index}Max`,
      range.maxLux === null ? "null" : String(range.maxLux),
    );
    params.set(`range${index}Target`, String(range.targetPercent));
  });

  const result = await sendAutoRequest("config", params);

  if (result.auto.responseStyle !== preset.responseStyle) {
    throw new Error(
      "Firmware ESP32 ยังไม่รองรับรูปแบบมาตรฐาน/นุ่มนวล กรุณาอัปโหลด Firmware รุ่นล่าสุดก่อนเปิด Auto",
    );
  }

  return result;
}

export function enableContinuousAuto(): Promise<AutoCommandResponse> {
  return sendAutoRequest("enable");
}

export async function configureModelAOnDevice(): Promise<AutoCommandResponse> {
  const result = await sendAutoRequest("model-a");

  if (result.auto.presetId !== "model-a" || result.auto.enabled) {
    throw new Error("ESP32 ยังไม่รองรับ Model A แบบทำงานบนบอร์ด กรุณาอัปโหลด firmware รุ่นล่าสุด");
  }

  return result;
}

export function disableContinuousAuto(): Promise<AutoCommandResponse> {
  return sendAutoRequest("disable");
}

export async function sendMotorCommand(
  command: MotorCommand,
): Promise<MotorCommandResponse> {
  try {
    const { response, result } = await postDeviceCommand<MotorCommandResponse>(
      `/motor/${command}`,
      {},
      7_000,
    );

    if (!response.ok) {
      throw new Error(
        `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
      );
    }

    if (!result.ok || result.command !== command) {
      throw new Error("ESP32 ตอบกลับไม่ตรงกับคำสั่ง");
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error(
        "ESP32 ไม่ตอบกลับภายใน 3 วินาที",
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "เชื่อมต่อ ESP32 ไม่ได้ กรุณาตรวจสอบ Wi-Fi",
      );
    }

    throw error;
  }
}

export async function sendCloseUntilLimitCommand(): Promise<CloseUntilLimitResponse> {
  try {
    const { response, result } = await postDeviceCommand<CloseUntilLimitResponse>(
      "/motor/close-until-limit",
      {},
      7_000,
    );

    if (!response.ok || !result.ok) {
      throw new Error(
        translateMotorStartError(
          result.message || `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
        ),
      );
    }

    if (result.command !== "close-until-limit") {
      throw new Error("ESP32 ตอบกลับไม่ตรงกับคำสั่งทดสอบลิมิต");
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error("ESP32 ไม่ตอบกลับภายใน 3 วินาที");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "เชื่อมต่อ ESP32 ไม่ได้ กรุณาตรวจสอบ Wi-Fi",
      );
    }

    throw error;
  }
}

export async function sendOpenUntilLimitCommand(): Promise<OpenUntilLimitResponse> {
  try {
    const { response, result } = await postDeviceCommand<OpenUntilLimitResponse>(
      "/motor/open-until-limit",
      {},
      7_000,
    );

    if (!response.ok || !result.ok) {
      throw new Error(
        translateMotorStartError(
          result.message || `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
        ),
      );
    }

    if (result.command !== "open-until-limit") {
      throw new Error("ESP32 ตอบกลับไม่ตรงกับคำสั่งทดสอบลิมิต");
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error("ESP32 ไม่ตอบกลับภายใน 3 วินาที");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "เชื่อมต่อ ESP32 ไม่ได้ กรุณาตรวจสอบ Wi-Fi",
      );
    }

    throw error;
  }
}

export async function sendCalibrationCommand(
  command: CalibrationCommand,
): Promise<CalibrationCommandResponse> {
  try {
    const { response, result } = await postDeviceCommand<CalibrationCommandResponse>(
      `/calibration/${command}`,
      {},
      7_000,
    );

    if (!response.ok || !result.ok) {
      if (result.message === "Set closed position first") {
        throw new Error("ต้องตั้งจุดปิดก่อนตั้งจุดเปิด");
      }

      if (result.message === "Travel is too short") {
        throw new Error(
          "ระยะสั้นเกินไป ให้ขยับม่านออกจากจุดปิดแล้วลองใหม่",
        );
      }

      throw new Error(
        `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error("ESP32 ไม่ตอบกลับภายใน 3 วินาที");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "เชื่อมต่อ ESP32 ไม่ได้ กรุณาตรวจสอบ Wi-Fi",
      );
    }

    throw error;
  }
}

export async function sendPositionCommand(
  targetPercent: number,
): Promise<PositionCommandResponse> {
  const safeTarget = Math.round(
    Math.min(100, Math.max(0, targetPercent)),
  );

  try {
    const { response, result } = await postDeviceCommand<PositionCommandResponse>(
      "/motor/position",
      { percent: String(safeTarget) },
      7_000,
    );

    if (!response.ok || !result.ok) {
      if (result.message === "Calibration required") {
        throw new Error(
          "ต้องตั้งจุดปิดและจุดเปิดก่อนใช้ตัวเลื่อน",
        );
      }

      throw new Error(
        `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error("ESP32 ไม่ตอบกลับภายใน 3 วินาที");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "เชื่อมต่อ ESP32 ไม่ได้ กรุณาตรวจสอบ Wi-Fi",
      );
    }

    throw error;
  }
}
