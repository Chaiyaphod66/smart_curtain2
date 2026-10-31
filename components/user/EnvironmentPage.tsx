"use client";

import Link from "next/link";
import useSensorData from "@/hooks/useSensorData";
import AppIcon from "./AppIcon";
import styles from "./UserPages.module.css";

type ReadingKind = "temperature" | "humidity" | "light";

function getReadingDetail(kind: ReadingKind, value: number | null | undefined) {
  if (typeof value !== "number") {
    return "ยังไม่มีข้อมูลจากเซ็นเซอร์";
  }

  if (kind === "temperature") {
    if (value > 30) return "อากาศค่อนข้างร้อน";
    if (value < 22) return "อากาศค่อนข้างเย็น";
    return "อุณหภูมิกำลังสบาย";
  }

  if (kind === "humidity") {
    if (value > 70) return "ความชื้นค่อนข้างสูง";
    if (value < 40) return "อากาศค่อนข้างแห้ง";
    return "ความชื้นอยู่ในช่วงสบาย";
  }

  if (value > 900) return "แสงภายนอกค่อนข้างแรง";
  if (value < 600) return "แสงภายในค่อนข้างน้อย";
  return "ระดับแสงปานกลาง";
}

function valueText(value: number | null | undefined, unit: string) {
  return typeof value === "number" ? `${Math.round(value)} ${unit}` : "—";
}

export default function EnvironmentPage() {
  const sensors = useSensorData("random");
  const { readings } = sensors;

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntro}>
        <div>
          <p className={styles.eyebrow}>เซ็นเซอร์ภายในห้อง</p>
          <h1>สภาพแวดล้อม</h1>
          <p>ค่าปัจจุบันจะอัปเดตอัตโนมัติทุก 5 วินาที</p>
        </div>
        <button
          className={styles.refreshButton}
          type="button"
          onClick={sensors.refresh}
          disabled={sensors.isRefreshing}
        >
          <AppIcon name="refresh" size={18} />
          {sensors.isRefreshing ? "กำลังอัปเดต" : "อัปเดตตอนนี้"}
        </button>
      </section>

      {sensors.error && (
        <p className={styles.alert} role="alert">{sensors.error}</p>
      )}

      <section className={styles.readingGrid} aria-label="ค่าเซ็นเซอร์ปัจจุบัน">
        <article className={`${styles.readingCard} ${styles.temperatureCard}`}>
          <div className={styles.readingTop}>
            <span className={styles.sensorIcon}>
              <AppIcon name="temperature" size={20} />
            </span>
            <span className={styles.readingStatus}>อุณหภูมิ</span>
          </div>
          <strong>{valueText(readings?.temperatureCelsius, "°C")}</strong>
          <p>{getReadingDetail("temperature", readings?.temperatureCelsius)}</p>
        </article>

        <article className={`${styles.readingCard} ${styles.humidityCard}`}>
          <div className={styles.readingTop}>
            <span className={styles.sensorIcon}>
              <AppIcon name="humidity" size={20} />
            </span>
            <span className={styles.readingStatus}>ความชื้น</span>
          </div>
          <strong>{valueText(readings?.humidityPercent, "%")}</strong>
          <p>{getReadingDetail("humidity", readings?.humidityPercent)}</p>
        </article>

        <article className={`${styles.readingCard} ${styles.lightCard}`}>
          <div className={styles.readingTop}>
            <span className={styles.sensorIcon}>
              <AppIcon name="light" size={20} />
            </span>
            <span className={styles.readingStatus}>ความเข้มแสง</span>
          </div>
          <strong>{valueText(readings?.lightLux, "lux")}</strong>
          <p>{getReadingDetail("light", readings?.lightLux)}</p>
        </article>
      </section>

      <section className={styles.infoCard}>
        <div>
          <p className={styles.sectionLabel}>แหล่งข้อมูล</p>
          <h2>
            {sensors.source === "esp32"
              ? "กำลังอ่านค่าจากอุปกรณ์จริง"
              : sensors.source === "mock"
                ? "กำลังใช้ข้อมูลจำลอง"
                : "กำลังตรวจสอบการเชื่อมต่อ"}
          </h2>
        </div>
        <span className={`${styles.largeStatusDot} ${sensors.source === "esp32" ? styles.online : ""}`} />
      </section>

      <section className={styles.adviceCard}>
        <div className={styles.adviceHeading}>
          <div>
            <p className={styles.sectionLabel}>ระบบอัตโนมัติ (Smart Auto)</p>
            <h2>พร้อมทำงานร่วมกับ ESP32</h2>
          </div>
          <Link className={styles.adviceLink} href="/control">
            ไปตั้งค่าโหมด Auto <AppIcon name="arrow" size={16} />
          </Link>
        </div>
        <p>
          ข้อมูลเซ็นเซอร์ทั้งหมดจะถูกส่งไปประมวลผลบน ESP32 เพื่อปรับตำแหน่งม่านตามสภาวะแสงและความร้อนจริง
        </p>

        <div className={styles.adviceFeatures}>
          <div className={styles.adviceItem}>
            <div className={styles.adviceItemTop}>
              <AppIcon name="light" size={17} />
              <span>ปรับตามแสงสว่าง</span>
            </div>
            <p>เซ็นเซอร์ BH1750 ตรวจวัดแสงธรรมชาติเพื่อลดแสงจ้า และเปิดรับแสงเมื่อแดดร่ม</p>
          </div>

          <div className={styles.adviceItem}>
            <div className={styles.adviceItemTop}>
              <AppIcon name="temperature" size={17} />
              <span>ป้องกันความร้อน</span>
            </div>
            <p>เซ็นเซอร์ DHT22 ตรวจวัดอุณหภูมิห้องเพื่อปิดม่านช่วยลดความร้อนสะสม</p>
          </div>

          <div className={styles.adviceItem}>
            <div className={styles.adviceItemTop}>
              <AppIcon name="shield" size={17} />
              <span>ระบบความปลอดภัย</span>
            </div>
            <p>มีระบบ Cooldown และยืนยันหลายค่าก่อนขยับม่าน เพื่อไม่ให้มอเตอร์ทำงานบ่อยเกินไป</p>
          </div>
        </div>
      </section>
    </div>
  );
}
