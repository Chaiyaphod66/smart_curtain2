"use client";

import { useEffect, useState } from "react";
import type useSensorData from "@/hooks/useSensorData";
import SensorCard from "./SensorCard";
import styles from "./SensorPanel.module.css";

type SensorPanelProps = {
    sensorData: ReturnType<typeof useSensorData>;
};

export default function SensorPanel({
    sensorData,
}: SensorPanelProps) {
    const { readings, error, isRefreshing, refresh } = sensorData;
    const [currentTime, setCurrentTime] =
        useState<number | null>(null);

    useEffect(() => {
        function updateCurrentTime() {
            setCurrentTime(Date.now());
        }

        updateCurrentTime();

        const timer = setInterval(updateCurrentTime, 1000);

        return () => clearInterval(timer);
    }, []);

    const recordedTimestamp = readings
        ? new Date(readings.recordedAt).getTime()
        : null;

    const ageSeconds =
        currentTime !== null &&
            recordedTimestamp !== null &&
            Number.isFinite(recordedTimestamp)
            ? Math.max(
                0,
                Math.floor(
                    (currentTime - recordedTimestamp) / 1000,
                ),
            )
            : null;

    const isStale =
        ageSeconds !== null && ageSeconds > 10;

    if (error && !readings) {
        return <p role="alert">{error}</p>;
    }

    if (!readings) {
        return <p role="status">กำลังโหลดข้อมูลเซ็นเซอร์...</p>;
    }

    return (
        <div className={styles.panel}>
            <button
                className={styles.refreshButton}
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
            >
                {isRefreshing ? "กำลังอัปเดต…" : "อัปเดตตอนนี้"}
            </button>
            <p aria-live="polite">
                DHT22:{" "}
                {readings.temperatureCelsius !== null &&
                    readings.humidityPercent !== null
                    ? "เชื่อมต่อ"
                    : "ไม่มีข้อมูล"}

                {" · "}

                BH1750:{" "}
                {readings.lightLux !== null
                    ? "เชื่อมต่อ"
                    : "ไม่มีข้อมูล"}
            </p>
            {error && (
                <p role="alert">
                    {error} ค่าที่แสดงเป็นข้อมูลล่าสุดที่อ่านสำเร็จ
                </p>
            )}
            <section className={styles.sensorGrid} aria-label="ข้อมูลเซ็นเซอร์">
                <SensorCard
                    label="อุณหภูมิ"
                    value={readings.temperatureCelsius}
                    unit="°C"
                />

                <SensorCard
                    label="ความชื้น"
                    value={readings.humidityPercent}
                    unit="%"
                />

                <SensorCard
                    label="ความเข้มแสง"
                    value={readings.lightLux}
                    unit="Lux"
                />
            </section>

            <p
                className={styles.updatedAt}
                role={isStale ? "alert" : undefined}
            >
                อัปเดตล่าสุด:{" "}
                {new Date(
                    readings.recordedAt,
                ).toLocaleTimeString("th-TH")}

                {ageSeconds !== null && (
                    <>
                        {" · "}
                        {isStale
                            ? `ข้อมูลเก่า ${ageSeconds} วินาที`
                            : `${ageSeconds} วินาทีที่แล้ว`}
                    </>
                )}
            </p>
        </div>
    );

}