import type { ClosedLoopAutoResult } from "./closed-loop-auto.ts";

export const MODEL_A_CONFIRMATION_READINGS = 2;
export const MODEL_A_COOLDOWN_SECONDS = 15;

export type ModelAContinuousSafetyInput = {
  isAutoLabSelected: boolean;
  source: "mock" | "esp32" | null;
  isDeviceOnline: boolean;
  isPositionControlReady: boolean;
  limitSafetyEnabled: boolean;
  limitConflict: boolean;
  motorFault: string | null;
  deviceAutoEnabled: boolean;
};

export function getModelAContinuousSafetyBlockers(
  input: ModelAContinuousSafetyInput,
): string[] {
  const blockers: string[] = [];

  if (!input.isAutoLabSelected) {
    blockers.push("เลือก Auto Lab ที่แถบด้านบนก่อน");
  }

  if (input.source !== "esp32") {
    blockers.push("ต้องใช้ข้อมูลเซ็นเซอร์จริงจาก ESP32");
  }

  if (!input.isDeviceOnline) {
    blockers.push("ESP32 ยังออฟไลน์");
  }

  if (!input.limitSafetyEnabled) {
    blockers.push("ระบบหยุดด้วยลิมิตยังไม่พร้อม");
  }

  if (input.limitConflict) {
    blockers.push("ลิมิตเปิดสุดและปิดสุดทำงานพร้อมกัน");
  }

  if (!input.isPositionControlReady) {
    blockers.push("ต้องคาลิเบรต Encoder และเปิด Position control ก่อน");
  }

  if (input.motorFault) {
    blockers.push(`พบ Motor fault: ${input.motorFault}`);
  }

  if (input.deviceAutoEnabled) {
    blockers.push("ปิด Always-on Auto ใน ESP32 ก่อนเริ่ม Model A");
  }

  return blockers;
}

export function getModelAContinuousTargetPercent(
  result: ClosedLoopAutoResult,
): number | null {
  if (
    result.targetPercent === null ||
    (result.action !== "open-step" &&
      result.action !== "close-step")
  ) {
    return null;
  }

  return Math.round(
    Math.min(100, Math.max(0, result.targetPercent)),
  );
}

export function getModelAContinuousCandidateKey(
  result: ClosedLoopAutoResult,
): string | null {
  const targetPercent = getModelAContinuousTargetPercent(result);

  return targetPercent === null
    ? null
    : `model-a:${result.action}:${targetPercent}`;
}
