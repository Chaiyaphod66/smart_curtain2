"use client";

import type useDeviceStatus from "@/hooks/useDeviceStatus";
import styles from "./DeviceStatusPanel.module.css";

type DeviceStatusPanelProps = {
  deviceStatus: ReturnType<typeof useDeviceStatus>;
};

function formatUptime(uptimeMs: number) {
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} ชม. ${minutes} นาที`;
  }

  return `${minutes} นาที`;
}

export default function DeviceStatusPanel({
  deviceStatus,
}: DeviceStatusPanelProps) {
  const {
    status,
    isOnline,
    isChecking,
    error,
    lastConnectedAt,
  } = deviceStatus;

  return (
    <section
      className={styles.panel}
      aria-label="สถานะอุปกรณ์"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>DEVICE STATUS</p>
          <h2>สถานะ ESP32</h2>
        </div>

        <span
          className={
            isOnline ? styles.online : styles.offline
          }
          role="status"
        >
          {isChecking && !status
            ? "กำลังตรวจสอบ"
            : isOnline
              ? "ออนไลน์"
              : "ออฟไลน์"}
        </span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {status && !isOnline && (
        <p className={styles.error}>
          ข้อมูลอุปกรณ์ด้านล่างเป็นค่าครั้งล่าสุด ไม่ใช่สถานะปัจจุบัน
        </p>
      )}

      {status && (
        <dl className={styles.grid}>
          <div>
            <dt>Firmware</dt>
            <dd>{status.firmwareVersion}</dd>
          </div>
          <div>
            <dt>เครือข่าย</dt>
            <dd>
              {status.network?.mode === "station"
                ? "Wi-Fi บ้าน"
                : status.network?.mode === "access-point"
                  ? "AP สำรอง"
                  : "รอ Firmware 0.9.0"}
            </dd>
          </div>
          <div>
            <dt>IP Address</dt>
            <dd>
              <code>{status.network?.ipAddress ?? "—"}</code>
            </dd>
          </div>
          <div>
            <dt>สัญญาณ Wi-Fi</dt>
            <dd>
              {typeof status.network?.rssi === "number"
                ? `${status.network.rssi} dBm`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>มอเตอร์</dt>
            <dd>
              {status.motor.state === "running"
                ? "กำลังทำงาน"
                : "หยุด"}
            </dd>
          </div>
          <div>
            <dt>DHT22</dt>
            <dd>
              {status.sensors.dht22
                ? "พร้อม"
                : "ไม่มีข้อมูล"}
            </dd>
          </div>
          <div>
            <dt>BH1750</dt>
            <dd>
              {status.sensors.bh1750
                ? "พร้อม"
                : "ไม่มีข้อมูล"}
            </dd>
          </div>
          <div>
            <dt>Encoder</dt>
            <dd>
              {status.encoder.calibrated &&
              status.encoder.positionPercent !== null
                ? `${status.encoder.positionPercent}%`
                : status.encoder.count === null
                  ? "รอ Firmware"
                  : status.encoder.pulseDetected
                    ? `พบ Pulse · ${status.encoder.count}`
                    : `รอสัญญาณ · ${status.encoder.count}`}
            </dd>
          </div>
          <div>
            <dt>เปิดเครื่องมาแล้ว</dt>
            <dd>{formatUptime(status.uptimeMs)}</dd>
          </div>
        </dl>
      )}

      {lastConnectedAt && (
        <p className={styles.timestamp}>
          ติดต่อสำเร็จล่าสุด: {" "}
          {new Date(lastConnectedAt).toLocaleTimeString(
            "th-TH",
          )}
        </p>
      )}
    </section>
  );
}
