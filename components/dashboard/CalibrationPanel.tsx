"use client";

import { useState } from "react";
import type useDeviceStatus from "@/hooks/useDeviceStatus";
import {
  sendCloseUntilLimitCommand,
  sendCalibrationCommand,
  type CalibrationCommand,
} from "@/lib/curtain/esp32-curtain-client";
import styles from "./CalibrationPanel.module.css";

type CalibrationPanelProps = {
  deviceStatus: ReturnType<typeof useDeviceStatus>;
};

const stageLabels = {
  "not-started": "ยังไม่ได้ตั้งจุดปิด",
  "closed-set": "ตั้งจุดปิดแล้ว — รอตั้งจุดเปิด",
  ready: "คาลิเบรตพร้อมใช้งาน",
} as const;

export default function CalibrationPanel({
  deviceStatus,
}: CalibrationPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const encoder = deviceStatus.status?.encoder;
  const calibration = deviceStatus.status?.calibration;
  const isMotorStopped =
    deviceStatus.status?.motor.state === "stopped";
  const firmwareReady = calibration !== undefined;
  const limits = deviceStatus.status?.limits;
  const canWrite =
    deviceStatus.isOnline &&
    firmwareReady &&
    isMotorStopped &&
    !isSaving;
  const canHome =
    canWrite &&
    limits?.closedStopEnabled === true &&
    !limits.conflict;

  async function homeToClosedLimit() {
    if (!canHome) {
      return;
    }

    const confirmed = window.confirm(
      "ม่านจะเคลื่อนไปทางปิดจน FC-33 ปิดสุดตรวจพบ ต้องการเริ่ม Homing หรือไม่?",
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await sendCloseUntilLimitCommand();
      setMessage(
        "กำลังหา FC-33 ปิดสุด เมื่อพบแล้ว Encoder จะถูกตั้งเป็น 0% อัตโนมัติ",
      );
      deviceStatus.refreshStatus();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "เริ่ม Homing ไม่สำเร็จ",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function runCalibrationCommand(
    command: CalibrationCommand,
  ) {
    if (!canWrite) {
      return;
    }

    if (command === "reset") {
      const confirmed = window.confirm(
        "ล้างจุดปิดและจุดเปิดที่ตั้งไว้หรือไม่?",
      );

      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await sendCalibrationCommand(command);

      setMessage(
        command === "closed"
          ? "ตั้งตำแหน่งปัจจุบันเป็นจุดปิด 0% แล้ว"
          : command === "open"
            ? "ตั้งตำแหน่งปัจจุบันเป็นจุดเปิด 100% แล้ว"
            : "ล้างค่าคาลิเบรตแล้ว",
      );
      deviceStatus.refreshStatus();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "บันทึกค่าคาลิเบรตไม่สำเร็จ",
      );
    } finally {
      setIsSaving(false);
    }
  }

  let statusLabel = "กำลังตรวจสอบ...";
  let statusClassName = styles.statusIdle;

  if (!deviceStatus.isOnline) {
    statusLabel = "ESP32 ออฟไลน์";
    statusClassName = styles.statusUnavailable;
  } else if (!firmwareReady) {
    statusLabel = "ต้องอัปโหลด Firmware 0.8.0";
    statusClassName = styles.statusUnavailable;
  } else if (calibration.stage === "ready") {
    statusLabel = stageLabels.ready;
    statusClassName = styles.statusReady;
  } else if (calibration.stage === "closed-set") {
    statusLabel = stageLabels["closed-set"];
    statusClassName = styles.statusProgress;
  } else if (calibration.persistentStored) {
    statusLabel = "พบค่าที่บันทึกไว้ — รอ Homing";
    statusClassName = styles.statusProgress;
  } else {
    statusLabel = stageLabels["not-started"];
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="calibration-title"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>CALIBRATION</p>
          <h2 id="calibration-title">ตั้งตำแหน่งอ้างอิงของม่าน</h2>
        </div>
        <span className={statusClassName} role="status">
          {statusLabel}
        </span>
      </div>

      <div className={styles.warning} role="note">
        <strong>
          {calibration?.persistentStored
            ? "บันทึกระยะเดินถาวรแล้ว"
            : "ยังไม่มีระยะเดินถาวร"}
        </strong>
        <span>
          {calibration?.persistentStored && calibration.requiresHoming
            ? "กด Homing เพื่อยืนยันจุดปิด 0% แล้วระบบจะนำระยะเดินที่บันทึกไว้กลับมาใช้ทันที"
            : "เริ่มด้วย Homing ไปยัง FC-33 ปิดสุด แล้วเปิดไปถึง FC-33 เปิดสุดหนึ่งครั้งเพื่อบันทึกระยะเดิน"}
        </span>
      </div>

      <div className={styles.readings}>
        <div>
          <span>ตำแหน่งปัจจุบัน</span>
          <strong>{encoder?.count ?? "—"}</strong>
          <small>encoder count</small>
        </div>
        <div>
          <span>จุดเปิด</span>
          <strong>{calibration?.openCount ?? "—"}</strong>
          <small>encoder count</small>
        </div>
        <div>
          <span>ระยะเดินทั้งหมด</span>
          <strong>
            {calibration?.travelPulses ??
              calibration?.storedTravelPulses ??
              "—"}
          </strong>
          <small>pulse</small>
        </div>
        <div>
          <span>ตำแหน่งจริง</span>
          <strong>
            {encoder?.positionPercent === null ||
            encoder?.positionPercent === undefined
              ? "—"
              : `${encoder.positionPercent.toFixed(1)}%`}
          </strong>
          <small>หลังตั้งครบสองจุด</small>
        </div>
      </div>

      <ol className={styles.steps}>
        <li>
          กด Homing ให้ม่านวิ่งไปหา FC-33 ปิดสุดและรีเซ็ตเป็น 0%
        </li>
        <li>
          จากนั้นใช้ “เปิดจนเจอสวิตช์” เพื่อให้ระบบเรียนรู้จุดเปิด 100%
        </li>
        <li>
          ตรวจว่าตำแหน่งจริงเปลี่ยนจาก 0% ไป 100%
          โดย Auto จะยังไม่เปิดใช้งาน
        </li>
      </ol>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={homeToClosedLimit}
          disabled={!canHome}
        >
          Homing — หาและรีเซ็ตจุดปิด 0%
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => runCalibrationCommand("closed")}
          disabled={!canWrite}
        >
          ตั้งตำแหน่งนี้เป็นจุดปิด 0%
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => runCalibrationCommand("open")}
          disabled={!canWrite || !calibration?.closedSet}
        >
          ตั้งตำแหน่งนี้เป็นจุดเปิด 100%
        </button>
        <button
          type="button"
          className={styles.resetButton}
          onClick={() => runCalibrationCommand("reset")}
          disabled={
            !canWrite ||
            (calibration?.stage === "not-started" &&
              !calibration?.persistentStored)
          }
        >
          ล้างค่าคาลิเบรต
        </button>
      </div>

      {!isMotorStopped && deviceStatus.isOnline && (
        <p className={styles.helpText}>
          รอให้มอเตอร์หยุดก่อน จึงจะบันทึกตำแหน่งได้
        </p>
      )}
      {limits?.closedStopEnabled !== true && (
        <p className={styles.helpText}>
          Homing ยังใช้ไม่ได้ เพราะ Firmware ปิดการทำงาน FC-33 อยู่
        </p>
      )}
      {message && (
        <p className={styles.successMessage} aria-live="polite">
          {message}
        </p>
      )}
      {error && (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
