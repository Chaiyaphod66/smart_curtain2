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
};

export type OpenUntilLimitResponse = {
  ok: boolean;
  command: "open-until-limit";
};

const ESP32_BASE_URL =
  process.env.NEXT_PUBLIC_ESP32_BASE_URL ??
  "http://192.168.4.1";

export async function sendMotorCommand(
  command: MotorCommand,
): Promise<MotorCommandResponse> {
  try {
    const response = await fetch(
      `${ESP32_BASE_URL}/motor/${command}`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
      );
    }

    const result =
      (await response.json()) as MotorCommandResponse;

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
    const response = await fetch(
      `${ESP32_BASE_URL}/motor/close-until-limit`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
      );
    }

    const result =
      (await response.json()) as CloseUntilLimitResponse;

    if (!result.ok || result.command !== "close-until-limit") {
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
    const response = await fetch(
      `${ESP32_BASE_URL}/motor/open-until-limit`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ESP32 ตอบกลับด้วยสถานะ ${response.status}`,
      );
    }

    const result =
      (await response.json()) as OpenUntilLimitResponse;

    if (!result.ok || result.command !== "open-until-limit") {
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
    const response = await fetch(
      `${ESP32_BASE_URL}/calibration/${command}`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      },
    );

    const result =
      (await response.json()) as CalibrationCommandResponse;

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
    const response = await fetch(
      `${ESP32_BASE_URL}/motor/position?percent=${safeTarget}`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      },
    );

    const result =
      (await response.json()) as PositionCommandResponse;

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
