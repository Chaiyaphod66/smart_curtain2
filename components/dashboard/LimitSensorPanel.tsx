"use client";

import { useState } from "react";
import type useCurtainControl from "@/hooks/useCurtainControl";
import type useDeviceStatus from "@/hooks/useDeviceStatus";
import styles from "./LimitSensorPanel.module.css";

type LimitSensorPanelProps = {
  deviceStatus: ReturnType<typeof useDeviceStatus>;
  control: ReturnType<typeof useCurtainControl>;
};

type TestBaseline = {
  closedCount: number;
  openCount: number;
};

export default function LimitSensorPanel({
  deviceStatus,
  control,
}: LimitSensorPanelProps) {
  const [baseline, setBaseline] =
    useState<TestBaseline | null>(null);

  const limits = deviceStatus.status?.limits;
  const diagnostic = deviceStatus.status?.limitStopDiagnostic;
  const motorFault = deviceStatus.status?.motor.fault ?? null;
  const lastStopReason =
    deviceStatus.status?.motor.lastStopReason ?? null;
  const controlsBusy =
    control.isSendingCommand || control.isMoving;

  const closedChange =
    baseline !== null && limits
      ? Math.max(
          0,
          limits.closed.triggerCount -
            baseline.closedCount,
        )
      : null;

  const openChange =
    baseline !== null && limits
      ? Math.max(
          0,
          limits.open.triggerCount -
            baseline.openCount,
        )
      : null;

  const testPassed =
    closedChange !== null &&
    openChange !== null &&
    closedChange > 0 &&
    openChange > 0;

  function startTest() {
    if (!limits || limits.conflict) {
      return;
    }

    setBaseline({
      closedCount: limits.closed.triggerCount,
      openCount: limits.open.triggerCount,
    });
  }

  function stopTest() {
    setBaseline(null);
  }

  let statusText = "พร้อมทดสอบ";
  let statusClassName = styles.ready;

  if (!deviceStatus.isOnline) {
    statusText = "ESP32 ออฟไลน์";
    statusClassName = styles.unavailable;
  } else if (!limits) {
    statusText = "รอ Firmware 0.7.0";
    statusClassName = styles.unavailable;
  } else if (limits.conflict) {
    statusText = "ผิดปกติ — ทำงานพร้อมกัน";
    statusClassName = styles.danger;
  } else if (motorFault === "closed-limit-timeout") {
    statusText = "ไม่ผ่าน — ไม่พบสวิตช์ปิดสุด";
    statusClassName = styles.danger;
  } else if (motorFault === "open-limit-timeout") {
    statusText = "ไม่ผ่าน — ไม่พบสวิตช์เปิดสุด";
    statusClassName = styles.danger;
  } else if (
    lastStopReason === "closed-limit" &&
    limits.closed.active
  ) {
    statusText = "ผ่านฝั่งปิด — หยุดที่สวิตช์แล้ว";
    statusClassName = styles.passed;
  } else if (
    lastStopReason === "open-limit" &&
    limits.open.active
  ) {
    statusText = "ผ่านฝั่งเปิด — หยุดที่สวิตช์แล้ว";
    statusClassName = styles.passed;
  } else if (testPassed) {
    statusText = "ผ่าน — ตรวจพบทั้งสองฝั่ง";
    statusClassName = styles.passed;
  } else if (baseline !== null) {
    statusText = "กำลังทดสอบ";
    statusClassName = styles.testing;
  } else if (limits.closed.active) {
    statusText = "ตรวจพบตำแหน่งปิดสุด";
    statusClassName = styles.detected;
  } else if (limits.open.active) {
    statusText = "ตรวจพบตำแหน่งเปิดสุด";
    statusClassName = styles.detected;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="limit-sensor-title"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            LIMIT SENSOR TEST
          </p>
          <h2 id="limit-sensor-title">
            ทดสอบ FC-33
          </h2>
          <p>
            ขยับมอเตอร์ความเร็วต่ำเพื่อตรวจตำแหน่งปิดสุดและเปิดสุด
          </p>
        </div>

        <span
          className={statusClassName}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </span>
      </div>

      {!limits ? (
        <p className={styles.empty}>
          {deviceStatus.isOnline
            ? "ESP32 ออนไลน์ แต่ยังไม่พบข้อมูล limits กรุณาตรวจว่าอัปโหลด Firmware 0.7.0 แล้ว"
            : "เชื่อมต่อ Wi-Fi ของ ESP32 แล้วลองใหม่"}
        </p>
      ) : (
        <>
          {limits.conflict && (
            <p className={styles.conflict} role="alert">
              FC-33 ทั้งสองตัวทำงานพร้อมกัน
              กรุณาตรวจตำแหน่งติดตั้งและสายสัญญาณ
            </p>
          )}

          <div className={styles.sensorGrid}>
            <article
              className={
                limits.closed.active
                  ? styles.sensorActive
                  : styles.sensorIdle
              }
            >
              <div className={styles.sensorHeading}>
                <div>
                  <span>FC-33 ปิดสุด</span>
                  <small>OUT → GPIO27</small>
                </div>

                <span
                  className={styles.indicator}
                  aria-hidden="true"
                />
              </div>

              <strong>
                {limits.closed.active
                  ? "ตรวจพบ"
                  : "ยังไม่ตรวจพบ"}
              </strong>

              <dl>
                <div>
                  <dt>Raw</dt>
                  <dd>{limits.closed.rawLevel}</dd>
                </div>
                <div>
                  <dt>ทั้งหมด</dt>
                  <dd>
                    {limits.closed.triggerCount} ครั้ง
                  </dd>
                </div>
                <div>
                  <dt>รอบนี้</dt>
                  <dd>
                    {closedChange === null
                      ? "—"
                      : `+${closedChange}`}
                  </dd>
                </div>
              </dl>
            </article>

            <article
              className={
                limits.open.active
                  ? styles.sensorActive
                  : styles.sensorIdle
              }
            >
              <div className={styles.sensorHeading}>
                <div>
                  <span>FC-33 เปิดสุด</span>
                  <small>OUT → GPIO26</small>
                </div>

                <span
                  className={styles.indicator}
                  aria-hidden="true"
                />
              </div>

              <strong>
                {limits.open.active
                  ? "ตรวจพบ"
                  : "ยังไม่ตรวจพบ"}
              </strong>

              <dl>
                <div>
                  <dt>Raw</dt>
                  <dd>{limits.open.rawLevel}</dd>
                </div>
                <div>
                  <dt>ทั้งหมด</dt>
                  <dd>
                    {limits.open.triggerCount} ครั้ง
                  </dd>
                </div>
                <div>
                  <dt>รอบนี้</dt>
                  <dd>
                    {openChange === null
                      ? "—"
                      : `+${openChange}`}
                  </dd>
                </div>
              </dl>
            </article>
          </div>

          <div className={styles.motorTest}>
            <h3>ผลการหยุดที่ลิมิตครั้งล่าสุด</h3>
            {!diagnostic ? (
              <p>
                {diagnostic === undefined
                  ? "ต้องอัปโหลด Firmware 0.11.2 ก่อนจึงจะวัดเวลาหยุดได้"
                  : "ยังไม่มีข้อมูลการหยุดที่ลิมิตในรอบเปิดเครื่องนี้"}
              </p>
            ) : (
              <>
                {!deviceStatus.isOnline && (
                  <p>ESP32 ออฟไลน์ — ผลนี้เป็นข้อมูลครั้งล่าสุด</p>
                )}
                <p>
                  ฝั่ง{diagnostic.side === "closed" ? "ปิด" : "เปิด"} ·
                  สัญญาณถึงเริ่มเบรก: {diagnostic.edgeToBrakeUs === null
                    ? "วัดไม่ได้"
                    : `${(diagnostic.edgeToBrakeUs / 1000).toFixed(1)} ms`}
                </p>
                <p>
                  Encoder A หลังเซ็นเซอร์ตรวจพบจนเริ่มเบรก: {diagnostic.edgeToBrakeEncoderAEdges ?? "—"} edge ·
                  ระหว่างเบรก: {diagnostic.brakeEncoderAEdges} edge ·
                  หลังเบรก: {diagnostic.afterBrakeEncoderAEdges ?? "รอให้นิ่ง"} edge
                </p>
                <p>
                  ช่องว่างรอบตรวจสูงสุด: {(diagnostic.maxSafetyPollGapUs / 1000).toFixed(1)} ms ·
                  งานเว็บนานสุด: {(diagnostic.maxWebHandlerUs / 1000).toFixed(1)} ms
                </p>
                {diagnostic.interrupted && (
                  <p>มีคำสั่งใหม่ก่อนวัดช่วงหลังเบรกครบ</p>
                )}
                <small>
                  ค่านี้วัดใน ESP32 โดยตรง ไม่ขึ้นกับเวลารีเฟรชหน้าเว็บ;
                  หายเมื่อบอร์ดรีสตาร์ต และ Encoder A edge ไม่ใช่เปอร์เซ็นต์ตำแหน่ง
                </small>
              </>
            )}
          </div>

          <ol className={styles.steps}>
            <li>กดเริ่มทดสอบเพื่อจำค่าปัจจุบัน</li>
            <li>กดขยับปิดทีละครั้งจน FC-33 ปิดสุดตรวจพบ</li>
            <li>กดขยับเปิดทีละครั้งจน FC-33 เปิดสุดตรวจพบ</li>
            <li>ผลทดสอบจะผ่านเมื่อพบทั้งสองฝั่งอย่างน้อยหนึ่งครั้ง</li>
          </ol>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.startButton}
              onClick={startTest}
              disabled={
                !deviceStatus.isOnline ||
                limits.conflict
              }
            >
              {baseline === null
                ? "เริ่มทดสอบ"
                : "เริ่มใหม่จากค่าปัจจุบัน"}
            </button>

            <button
              type="button"
              className={styles.cancelButton}
              onClick={stopTest}
              disabled={baseline === null}
            >
              จบการทดสอบ
            </button>
          </div>

          <div className={styles.motorTest}>
            <div className={styles.motorHeading}>
              <div>
                <h3>ควบคุมระหว่างทดสอบ</h3>
                <p>
                  คำสั่งขยับสั้น {deviceStatus.status?.motor.timeoutMs ?? 250} ms ·
                  PWM {deviceStatus.status?.motor.speed ?? "—"}/255
                </p>
              </div>
              <span>
                {control.isMoving
                  ? "มอเตอร์กำลังทำงาน"
                  : "มอเตอร์หยุด"}
              </span>
            </div>

            <div className={styles.motorActions}>
              <button
                type="button"
                className={styles.directionButton}
                onClick={() => void control.closeUntilLimit()}
                disabled={
                  baseline === null ||
                  !deviceStatus.isOnline ||
                  controlsBusy ||
                  limits.closedStopEnabled !== true ||
                  limits.closed.active ||
                  limits.conflict
                }
              >
                ปิดจนเจอสวิตช์
              </button>

              <button
                type="button"
                className={styles.stopButton}
                onClick={() => void control.stopCurtain()}
                disabled={
                  !deviceStatus.isOnline ||
                  control.isSendingCommand
                }
              >
                หยุด
              </button>

              <button
                type="button"
                className={styles.directionButton}
                onClick={() => void control.openUntilLimit()}
                disabled={
                  baseline === null ||
                  !deviceStatus.isOnline ||
                  controlsBusy ||
                  limits.openStopEnabled !== true ||
                  limits.open.active ||
                  limits.conflict
                }
              >
                เปิดจนเจอสวิตช์
              </button>
            </div>

            <p className={styles.motorNote}>
              ทั้งสองทิศทางจะหยุดจาก Firmware ทันทีเมื่อ FC-33
              ฝั่งนั้นตรวจพบ และจะตัดเองภายใน 10 วินาทีหากไม่พบสวิตช์
            </p>
          </div>

          <p className={styles.safety}>
            ระบบหยุดปิดสุดและเปิดสุด:{" "}
            <strong>
              {limits.closedStopEnabled && limits.openStopEnabled
                ? "เปิดใช้งานแล้ว"
                : "ยังไม่ครบ — กรุณาอัปโหลด Firmware 0.7.3"}
            </strong>
          </p>

          <p className={styles.note}>
            ค่า “ยังไม่ตรวจพบ” ไม่ได้ยืนยันว่าสายสมบูรณ์
            เพราะ FC-33 แบบสามสายไม่สามารถตรวจสายขาดได้โดยตรง
          </p>
        </>
      )}
    </section>
  );
}
