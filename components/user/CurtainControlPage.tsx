"use client";

import type { CSSProperties } from "react";
import useCurtainControl from "@/hooks/useCurtainControl";
import useDeviceStatus from "@/hooks/useDeviceStatus";
import CurtainActionHistoryPanel from "@/components/dashboard/CurtainActionHistoryPanel";
import AppIcon from "./AppIcon";
import CurtainScene from "./CurtainScene";
import styles from "./UserPages.module.css";

const presetPositions = [0, 25, 50, 75, 100];

export default function CurtainControlPage() {
  const device = useDeviceStatus();
  const encoderPosition =
    device.isOnline &&
    device.status?.encoder.calibrated &&
    typeof device.status.encoder.positionPercent === "number"
      ? device.status.encoder.positionPercent
      : null;
  const control = useCurtainControl({
    actualPositionPercent: encoderPosition,
    encoderCount:
      typeof device.status?.encoder.count === "number"
        ? device.status.encoder.count
        : null,
    isMotorRunning: device.status?.motor.state === "running",
    motorFault: device.status?.motor.fault ?? null,
    statusSampleId: device.status?.uptimeMs ?? null,
    refreshDeviceStatus: device.refreshStatus,
  });
  const encoderDetected = device.status?.encoder.pulseDetected ?? false;
  const encoderCalibrated = device.status?.encoder.calibrated ?? false;
  const positionSupported = device.status?.motor.positionControlAvailable === true;
  const positionReady =
    device.isOnline && encoderPosition !== null && positionSupported;
  const hasKnownPosition = encoderPosition !== null;
  const controlsBusy = control.isSendingCommand || control.isMoving;

  const helperText = positionReady
    ? "เลือกตำแหน่งที่ต้องการ แล้วกดปุ่มยืนยัน"
    : encoderCalibrated && !positionSupported
      ? "Firmware ปัจจุบันยังไม่รองรับการสั่งตำแหน่ง"
      : encoderDetected
        ? "ตรวจพบ Encoder แล้ว กรุณาคาลิเบรตจุดปิดและจุดเปิดในหน้า Developer"
        : "ยังไม่พบ Encoder จึงใช้ได้เฉพาะปุ่มขยับทีละครั้ง";

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntro}>
        <div>
          <p className={styles.eyebrow}>ม่านห้องหลัก</p>
          <h1>ควบคุมม่าน</h1>
          <p>เลือกตำแหน่งหรือขยับม่านทีละช่วงได้จากหน้านี้</p>
        </div>
        <div className={`${styles.connectionPill} ${device.isOnline ? styles.online : styles.offline}`}>
          <span />
          {device.isOnline ? "พร้อมควบคุม" : "ยังไม่เชื่อมต่อ"}
        </div>
      </section>

      <section className={styles.controlLayout}>
        <div className={styles.controlVisualCard}>
          <div className={styles.positionHeading}>
            <div>
              <p>ตำแหน่งปัจจุบัน</p>
              <strong>
                {hasKnownPosition
                  ? `${Math.round(control.positionPercent)}%`
                  : "—"}
              </strong>
            </div>
            <span className={control.isMoving ? styles.movingBadge : styles.stillBadge}>
              {control.isMoving ? "กำลังเคลื่อนที่" : "หยุดนิ่ง"}
            </span>
          </div>
          <CurtainScene
            positionPercent={
              hasKnownPosition ? control.positionPercent : null
            }
          />
        </div>

        <div className={styles.controlCard}>
          <div className={styles.controlHeading}>
            <p className={styles.sectionLabel}>ตำแหน่งเป้าหมาย</p>
            <strong>{Math.round(control.targetPercent)}%</strong>
          </div>

          <label className={styles.sliderLabel}>
            <span className={styles.srOnly}>เลือกตำแหน่งม่าน</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={control.targetPercent}
              disabled={!positionReady || controlsBusy}
              onChange={(event) => control.selectTargetPercent(Number(event.target.value))}
              style={{ "--range-progress": `${control.targetPercent}%` } as CSSProperties}
            />
            <span className={styles.rangeLabels}><span>ปิด</span><span>เปิด</span></span>
          </label>

          <div className={styles.presets} aria-label="ตำแหน่งแนะนำ">
            {presetPositions.map((position) => (
              <button
                type="button"
                key={position}
                className={Math.round(control.targetPercent) === position ? styles.selectedPreset : undefined}
                disabled={!positionReady || controlsBusy}
                onClick={() => control.selectTargetPercent(position)}
              >
                {position}%
              </button>
            ))}
          </div>

          <p className={styles.helperText}>{helperText}</p>

          <button
            className={styles.primaryButton}
            type="button"
            onClick={control.moveCurtainToTarget}
            disabled={
              !positionReady ||
              controlsBusy ||
              Math.abs(control.targetPercent - control.positionPercent) < 0.5
            }
          >
            {control.isSendingCommand ? "กำลังส่งคำสั่ง..." : "เลื่อนไปตำแหน่งนี้"}
          </button>

          <div className={styles.jogSection}>
            <div>
              <h2>ขยับทีละครั้ง</h2>
              <p>ใช้เมื่อต้องการปรับม่านเล็กน้อย</p>
            </div>
            <div className={styles.jogButtons}>
              <button
                type="button"
                onClick={control.closeCurtain}
                disabled={!device.isOnline || controlsBusy}
              >
                ขยับปิด
              </button>
              <button
                type="button"
                onClick={control.openCurtain}
                disabled={!device.isOnline || controlsBusy}
              >
                ขยับเปิด
              </button>
            </div>
          </div>

          <button
            className={styles.stopButton}
            type="button"
            onClick={control.stopCurtain}
            disabled={!device.isOnline || control.isSendingCommand}
          >
            <AppIcon name="stop" size={16} /> หยุดฉุกเฉิน
          </button>

          {(control.commandError || device.status?.motor.fault) && (
            <p className={styles.alert} role="alert">
              {control.commandError ??
                (device.status?.motor.fault === "encoder-no-pulse"
                  ? "ระบบหยุดมอเตอร์เพราะไม่พบ Pulse จาก Encoder"
                  : device.status?.motor.fault === "closed-limit-timeout"
                    ? "ระบบหยุดมอเตอร์เพราะไม่พบสวิตช์ปิดสุดภายใน 10 วินาที"
                    : device.status?.motor.fault === "open-limit-timeout"
                      ? "ระบบหยุดมอเตอร์เพราะไม่พบสวิตช์เปิดสุดภายใน 10 วินาที"
                    : "ระบบหยุดมอเตอร์เพราะใช้เวลาเกินกำหนด")}
            </p>
          )}
        </div>
      </section>

      <details className={styles.historyDetails}>
        <summary>ดูประวัติการเคลื่อนที่</summary>
        <CurtainActionHistoryPanel
          history={control.actionHistory}
          onClear={control.clearActionHistory}
        />
      </details>
    </div>
  );
}
