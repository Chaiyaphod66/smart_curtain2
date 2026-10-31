"use client";

import Link from "next/link";
import type useDeviceStatus from "@/hooks/useDeviceStatus";
import useCurtainCalibration from "@/hooks/useCurtainCalibration";
import AppIcon from "./AppIcon";
import styles from "./UserPages.module.css";

type UserCalibrationCardProps = {
  deviceStatus: ReturnType<typeof useDeviceStatus>;
  manualControlsLocked: boolean;
  onStop?: () => Promise<boolean>;
};

export default function UserCalibrationCard({
  deviceStatus,
  manualControlsLocked,
  onStop,
}: UserCalibrationCardProps) {
  const setup = useCurtainCalibration(deviceStatus, manualControlsLocked);
  const { calibration, isMotorStopped, message, error, canHome, canFindOpen } = setup;
  const isCalibrated =
    calibration?.stage === "ready" ||
    deviceStatus.status?.encoder.calibrated === true;

  if (isCalibrated) return null;

  return (
    <section className={styles.calibrationSetupCard} aria-labelledby="user-calibration-title">
      <div className={styles.calibrationSetupHeading}>
        <div>
          <p className={styles.sectionLabel}>ตั้งค่าครั้งแรก</p>
          <h2 id="user-calibration-title">ให้ม่านรู้จุดปิดและจุดเปิด</h2>
          <p>
            {calibration?.persistentStored && calibration.requiresHoming
              ? "มีระยะที่บันทึกไว้แล้ว เริ่มจาก Homing เพื่อยืนยันตำแหน่ง 0%"
              : "ทำสองขั้นตอนนี้ครั้งเดียว แล้วจึงใช้ตัวเลื่อนและ Auto ได้"}
          </p>
        </div>
        <span>{calibration?.closedSet ? "ตั้งจุดปิดแล้ว" : "รอตั้งจุดปิด"}</span>
      </div>

      <ol className={styles.calibrationSetupSteps}>
        <li>
          <div>
            <strong>1. หาจุดปิด 0%</strong>
            <small>ม่านจะวิ่งจน FC-33 ฝั่งปิดตรวจพบ แล้ว ESP32 ตั้งค่า 0% เอง</small>
          </div>
          <button type="button" onClick={() => void setup.run("home")} disabled={!canHome}>
            เริ่ม Homing
          </button>
        </li>
        <li>
          <div>
            <strong>2. หาจุดเปิด 100%</strong>
            <small>ทำหลัง Homing; เมื่อ FC-33 ฝั่งเปิดตรวจพบ ESP32 จะบันทึก 100% เอง</small>
          </div>
          <button type="button" onClick={() => void setup.run("find-open")} disabled={!canFindOpen}>
            หาจุดเปิด
          </button>
        </li>
      </ol>

      <div className={styles.calibrationSetupFooter}>
        <button type="button" onClick={onStop} disabled={!deviceStatus.isOnline || !onStop}>
          <AppIcon name="stop" size={15} /> หยุดมอเตอร์
        </button>
        <Link href="/dev#calibration-title">ตั้งค่าแบบละเอียดในหน้า Dev</Link>
      </div>

      {!isMotorStopped && deviceStatus.isOnline && (
        <p className={styles.calibrationSetupMessage} role="status">
          มอเตอร์กำลังทำงาน โปรดเฝ้าดูและเตรียมกดหยุด
        </p>
      )}
      {manualControlsLocked && isMotorStopped && deviceStatus.isOnline && (
        <p className={styles.calibrationSetupMessage}>
          ปิด Auto และเลือกแท็บ Manual ก่อนตั้งระยะม่าน
        </p>
      )}
      {message && <p className={styles.calibrationSetupMessage} role="status">{message}</p>}
      {error && <p className={styles.calibrationSetupError} role="alert">{error}</p>}
    </section>
  );
}
