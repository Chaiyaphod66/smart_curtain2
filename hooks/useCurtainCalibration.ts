"use client";

import { useState } from "react";
import type useDeviceStatus from "@/hooks/useDeviceStatus";
import {
  sendCalibrationCommand,
  sendCloseUntilLimitCommand,
  sendOpenUntilLimitCommand,
  type CalibrationCommand,
} from "@/lib/curtain/esp32-curtain-client";

type CalibrationAction = CalibrationCommand | "home" | "find-open";

const successMessages: Record<CalibrationAction, string> = {
  home: "กำลังหา FC-33 ปิดสุด เมื่อพบแล้ว ESP32 จะตั้งตำแหน่ง 0% อัตโนมัติ",
  "find-open": "กำลังหา FC-33 เปิดสุด เมื่อพบแล้ว ESP32 จะบันทึกตำแหน่ง 100% อัตโนมัติ",
  closed: "ตั้งตำแหน่งปัจจุบันเป็นจุดปิด 0% แล้ว",
  open: "ตั้งตำแหน่งปัจจุบันเป็นจุดเปิด 100% แล้ว",
  reset: "ล้างค่าคาลิเบรตแล้ว",
};

export default function useCurtainCalibration(
  deviceStatus: ReturnType<typeof useDeviceStatus>,
  blocked = false,
) {
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calibration = deviceStatus.status?.calibration;
  const limits = deviceStatus.status?.limits;
  const isMotorStopped = deviceStatus.status?.motor.state === "stopped";
  const canWrite =
    deviceStatus.isOnline &&
    calibration !== undefined &&
    isMotorStopped &&
    !blocked &&
    !isBusy;
  const canHome =
    canWrite && limits?.closedStopEnabled === true && !limits.conflict;
  const canFindOpen =
    canWrite &&
    calibration?.closedSet === true &&
    limits?.openStopEnabled === true &&
    !limits.conflict;
  const canSetOpen = canWrite && calibration?.closedSet === true;
  const canReset =
    canWrite &&
    (calibration.stage !== "not-started" || calibration.persistentStored);

  async function run(action: CalibrationAction): Promise<boolean> {
    const allowed =
      action === "home"
        ? canHome
        : action === "find-open"
          ? canFindOpen
          : action === "open"
            ? canSetOpen
            : action === "reset"
              ? canReset
              : canWrite;

    if (!allowed) return false;

    if (action === "home" && !window.confirm(
      "ม่านจะวิ่งไปหาสวิตช์ปิดสุดเพื่อกำหนด 0% โปรดเฝ้าดูและเตรียมกด STOP ยืนยันหรือไม่?",
    )) return false;

    if (action === "find-open" && !window.confirm(
      "ม่านจะวิ่งไปหาสวิตช์เปิดสุดเพื่อกำหนด 100% โปรดเฝ้าดูและเตรียมกด STOP ยืนยันหรือไม่?",
    )) return false;

    if (action === "reset" && !window.confirm(
      "ล้างจุดปิด จุดเปิด และระยะม่านที่บันทึกไว้หรือไม่?",
    )) return false;

    setIsBusy(true);
    setMessage(null);
    setError(null);

    try {
      if (action === "home") {
        await sendCloseUntilLimitCommand();
      } else if (action === "find-open") {
        await sendOpenUntilLimitCommand();
      } else {
        await sendCalibrationCommand(action);
      }

      setMessage(successMessages[action]);
      deviceStatus.refreshStatus();
      return true;
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "ตั้งระยะม่านไม่สำเร็จ",
      );
      deviceStatus.refreshStatus();
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  return {
    calibration,
    limits,
    isMotorStopped,
    isBusy,
    message,
    error,
    canWrite,
    canHome,
    canFindOpen,
    canSetOpen,
    canReset,
    run,
  };
}
