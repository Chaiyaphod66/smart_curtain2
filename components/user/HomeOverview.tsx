"use client";

import Link from "next/link";
import useDeviceStatus from "@/hooks/useDeviceStatus";
import useSensorData from "@/hooks/useSensorData";
import AppIcon from "./AppIcon";
import CurtainScene from "./CurtainScene";
import styles from "./UserPages.module.css";

function formatValue(value: number | null | undefined, suffix: string) {
  return typeof value === "number" ? `${Math.round(value)}${suffix}` : "—";
}

export default function HomeOverview() {
  const device = useDeviceStatus();
  const sensors = useSensorData("random");
  const position =
    device.isOnline &&
    device.status?.encoder.calibrated &&
    typeof device.status.encoder.positionPercent === "number"
      ? device.status.encoder.positionPercent
      : null;
  const isMoving = device.status?.motor.state === "running";

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntro}>
        <div>
          <p className={styles.eyebrow}>ภาพรวมภายในบ้าน</p>
          <h1>สวัสดีครับ</h1>
          <p>ดูสถานะม่านและสภาพแวดล้อมได้ในหน้าเดียว</p>
        </div>
        <div
          className={`${styles.connectionPill} ${device.isOnline ? styles.online : styles.offline}`}
          aria-live="polite"
        >
          <span />
          {device.isChecking && !device.status
            ? "กำลังเชื่อมต่อ"
            : device.isOnline
              ? "ESP32 ออนไลน์"
              : "ESP32 ออฟไลน์"}
        </div>
      </section>

      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <p className={styles.sectionLabel}>ม่านห้องหลัก</p>
          <h2>
            {isMoving
              ? "ม่านกำลังเคลื่อนที่"
              : position === null
                ? "พร้อมสำหรับการควบคุม"
                : `เปิดอยู่ ${Math.round(position)}%`}
          </h2>
          <p>
            {position === null
              ? "เชื่อมต่อและคาลิเบรต Encoder เพื่อแสดงตำแหน่งจริง"
              : "ตำแหน่งนี้อ่านจาก Encoder ของม่านโดยตรง"}
          </p>
          <Link className={styles.primaryLink} href="/control">
            ไปหน้าควบคุม
            <AppIcon name="arrow" size={18} />
          </Link>
        </div>
        <div className={styles.heroVisual}>
          <CurtainScene positionPercent={position} compact />
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionLabel}>สภาพแวดล้อม</p>
            <h2>บรรยากาศตอนนี้</h2>
          </div>
          <Link className={styles.textLink} href="/environment">
            ดูรายละเอียด <AppIcon name="arrow" size={16} />
          </Link>
        </div>

        <div className={styles.sensorGrid}>
          <article className={`${styles.sensorCard} ${styles.temperatureCard}`}>
            <span className={styles.sensorIcon}>°</span>
            <div>
              <p>อุณหภูมิ</p>
              <strong>{formatValue(sensors.readings?.temperatureCelsius, "°C")}</strong>
            </div>
          </article>
          <article className={`${styles.sensorCard} ${styles.humidityCard}`}>
            <span className={styles.sensorIcon}>%</span>
            <div>
              <p>ความชื้น</p>
              <strong>{formatValue(sensors.readings?.humidityPercent, "%")}</strong>
            </div>
          </article>
          <article className={`${styles.sensorCard} ${styles.lightCard}`}>
            <span className={styles.sensorIcon}>☼</span>
            <div>
              <p>ความเข้มแสง</p>
              <strong>{formatValue(sensors.readings?.lightLux, " lux")}</strong>
            </div>
          </article>
        </div>

        <p className={styles.sourceNote}>
          <span className={sensors.source === "esp32" ? styles.liveDot : styles.mockDot} />
          {sensors.error
            ? sensors.error
            : sensors.source === "esp32"
              ? "ข้อมูลจริงจาก ESP32 อัปเดตอัตโนมัติ"
              : sensors.source === "mock"
                ? "กำลังแสดงข้อมูลจำลอง"
                : "กำลังตรวจสอบแหล่งข้อมูล"}
        </p>
      </section>
    </div>
  );
}
