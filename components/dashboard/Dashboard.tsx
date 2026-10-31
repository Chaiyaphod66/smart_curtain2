"use client"

import { useState } from "react";
import useSensorData from "@/hooks/useSensorData"
import useCurtainControl from "@/hooks/useCurtainControl"
import useDeviceStatus from "@/hooks/useDeviceStatus"
import SensorPanel from "./SensorPanel"
import CurtainPanel from "./CurtainPanel"
import DeviceStatusPanel from "./DeviceStatusPanel"
import EncoderTestPanel from "./EncoderTestPanel"
import LimitSensorPanel from "./LimitSensorPanel";
import AutoPresetPanel from "./AutoPresetPanel"
import CalibrationPanel from "./CalibrationPanel"
import CurtainActionHistoryPanel from "./CurtainActionHistoryPanel"
import type { SensorScenario } from "@/types/sensor";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
    const [scenario, setScenario] = useState<SensorScenario>("random");
    const sensorData = useSensorData(scenario);
    const deviceStatus = useDeviceStatus();
    const encoderPosition =
        deviceStatus.isOnline &&
        deviceStatus.status?.encoder.calibrated &&
        typeof deviceStatus.status.encoder.positionPercent === "number"
            ? deviceStatus.status.encoder.positionPercent
            : null;
    const curtainControl = useCurtainControl({
        actualPositionPercent: encoderPosition,
        encoderCount:
            typeof deviceStatus.status?.encoder.count === "number"
                ? deviceStatus.status.encoder.count
                : null,
        isMotorRunning:
            deviceStatus.status?.motor.state === "running",
        motorFault: deviceStatus.status?.motor.fault ?? null,
        statusSampleId: deviceStatus.status?.uptimeMs ?? null,
        refreshDeviceStatus: deviceStatus.refreshStatus,
    });
    const [mode, setMode] = useState<"manual" | "auto-lab">("manual");
    const { readings, source } = sensorData;

    const isDeviceOnline = deviceStatus.isOnline;
    const encoderDetected =
        deviceStatus.status?.encoder.pulseDetected ?? false;
    const encoderCalibrated =
        deviceStatus.status?.encoder.calibrated ?? false;
    const positionControlSupported =
        deviceStatus.status?.motor.positionControlAvailable === true;
    const isPositionControlReady =
        isDeviceOnline &&
        encoderPosition !== null &&
        positionControlSupported;
    const motorIsRunning = deviceStatus.status?.motor.state === "running";
    const limitConflict = deviceStatus.status?.limits.conflict ?? false;
    const limitSafetyEnabled =
        deviceStatus.status?.limits.safetyEnabled ?? false;
    const encoderSummary = encoderCalibrated
        ? encoderPosition === null
            ? "พร้อมใช้งาน"
            : `${Math.round(encoderPosition)}%`
        : encoderDetected
            ? "พบสัญญาณ"
            : "รอตรวจสอบ";
    const networkDetail = deviceStatus.status?.network?.ipAddress
        ? `IP ${deviceStatus.status.network.ipAddress}`
        : isDeviceOnline
            ? "เชื่อมต่อผ่าน API"
            : "ยังไม่พบอุปกรณ์";
    function changeScenario(value: string) {
        if (
            value === "random" ||
            value === "dim" ||
            value === "normal" ||
            value === "bright" ||
            value === "offline"
        ) {
            setScenario(value);
        }
    }
    return (
        <div className={styles.dashboard}>
            <section
                className={styles.toolbar}
                aria-label="การตั้งค่าหน้า Dev"
            >
                <div className={styles.dataTools}>
                    <p className={styles.source} aria-live="polite">
                        <span
                            className={
                                source === "esp32"
                                    ? styles.sourceOnline
                                    : styles.sourceMock
                            }
                            aria-hidden="true"
                        />
                        {source === "esp32"
                            ? "ESP32 · ข้อมูลจริง"
                            : source === "mock"
                                ? "Mock · ข้อมูลจำลอง"
                                : "กำลังตรวจสอบแหล่งข้อมูล"}
                    </p>

                    {source === "mock" && (
                        <label className={styles.scenarioControl}>
                            สถานการณ์
                            <select
                                value={scenario}
                                onChange={(event) =>
                                    changeScenario(event.target.value)
                                }
                            >
                                <option value="random">สุ่มข้อมูล</option>
                                <option value="dim">แสงน้อย · 300 lux</option>
                                <option value="normal">แสงปานกลาง · 720 lux</option>
                                <option value="bright">แสงมาก · 1200 lux</option>
                                <option value="offline">เซ็นเซอร์ขัดข้อง</option>
                            </select>
                        </label>
                    )}
                </div>

                <fieldset className={styles.modeControl}>
                    <legend>โหมด</legend>
                    <label>
                        <input
                            type="radio"
                            name="curtain-mode"
                            value="manual"
                            checked={mode === "manual"}
                            onChange={() => {
                                setMode("manual");
                                void curtainControl.stopCurtain();
                            }}
                        />
                        Manual
                    </label>
                    <label title="กำลังทดสอบ Auto Preset จึงยังไม่สั่งมอเตอร์">
                        <input
                            type="radio"
                            name="curtain-mode"
                            value="auto-lab"
                            checked={mode === "auto-lab"}
                            onChange={() => setMode("auto-lab")}
                        />
                        Auto Lab
                    </label>
                </fieldset>
            </section>

            <section className={styles.statusRail} aria-label="ภาพรวมสถานะระบบ">
                <article
                    className={`${styles.statusCard} ${
                        isDeviceOnline ? styles.statusGood : styles.statusDanger
                    }`}
                >
                    <span>ESP32</span>
                    <strong>{isDeviceOnline ? "ออนไลน์" : "ออฟไลน์"}</strong>
                    <small>{networkDetail}</small>
                </article>

                <article
                    className={`${styles.statusCard} ${
                        motorIsRunning ? styles.statusActive : styles.statusNeutral
                    }`}
                >
                    <span>มอเตอร์</span>
                    <strong>{motorIsRunning ? "กำลังเคลื่อนที่" : "หยุดนิ่ง"}</strong>
                    <small>
                        {deviceStatus.status?.motor.fault
                            ? `Fault: ${deviceStatus.status.motor.fault}`
                            : `ความเร็ว ${deviceStatus.status?.motor.speed ?? "—"}`}
                    </small>
                </article>

                <article
                    className={`${styles.statusCard} ${
                        encoderCalibrated ? styles.statusGood : styles.statusWarning
                    }`}
                >
                    <span>Encoder</span>
                    <strong>{encoderSummary}</strong>
                    <small>{encoderCalibrated ? "คาลิเบรตแล้ว" : "ยังไม่คาลิเบรต"}</small>
                </article>

                <article
                    className={`${styles.statusCard} ${
                        limitConflict
                            ? styles.statusDanger
                            : limitSafetyEnabled
                                ? styles.statusGood
                                : styles.statusWarning
                    }`}
                >
                    <span>Safety limits</span>
                    <strong>
                        {limitConflict
                            ? "สัญญาณขัดแย้ง"
                            : limitSafetyEnabled
                                ? "พร้อมป้องกัน"
                                : "ยังไม่เปิด"}
                    </strong>
                    <small>ตรวจจุดปิดสุดและเปิดสุด</small>
                </article>
            </section>

            <section className={styles.workspaceSection}>
                <div className={styles.sectionHeading}>
                    <div>
                        <span>01 · OPERATE</span>
                        <h2>ควบคุมและดูสถานะอุปกรณ์</h2>
                    </div>
                    <p>เริ่มทดสอบจากส่วนนี้ และเตรียมปุ่ม STOP ให้พร้อมเสมอ</p>
                </div>
                <div className={styles.primaryGrid}>
                    <div className={`${styles.window} ${styles.featuredWindow}`}>
                        <CurtainPanel
                            control={curtainControl}
                            isAutomatic={mode === "auto-lab"}
                            isDeviceOnline={isDeviceOnline}
                            encoderDetected={encoderDetected}
                            encoderCalibrated={encoderCalibrated}
                            positionControlSupported={positionControlSupported}
                            isPositionControlReady={isPositionControlReady}
                            onStop={() => {
                                setMode("manual");
                                curtainControl.stopCurtain();
                            }}
                        />
                    </div>
                    <div className={styles.window}>
                        <DeviceStatusPanel deviceStatus={deviceStatus} />
                    </div>
                </div>
            </section>

            <section className={styles.workspaceSection}>
                <div className={styles.sectionHeading}>
                    <div>
                        <span>02 · AUTOMATION</span>
                        <h2>Auto Preset Lab</h2>
                    </div>
                    <p>จำลองเงื่อนไข ตรวจผลตัดสินใจ และทดสอบการทำงานต่อเนื่อง</p>
                </div>
                <div className={`${styles.window} ${styles.autoWindow}`}>
                    <AutoPresetPanel
                        reading={readings}
                        source={source}
                        isAutoLabSelected={mode === "auto-lab"}
                        isDeviceOnline={isDeviceOnline}
                        currentPositionPercent={encoderPosition}
                        isPositionControlReady={isPositionControlReady}
                        isMotorRunning={curtainControl.isMoving}
                        isSendingCommand={curtainControl.isSendingCommand}
                        motorFault={deviceStatus.status?.motor.fault ?? null}
                        limitConflict={limitConflict}
                        limitSafetyEnabled={limitSafetyEnabled}
                        commandError={curtainControl.commandError}
                        deviceAutoStatus={deviceStatus.status?.auto ?? null}
                        onDeviceStatusRefresh={deviceStatus.refreshStatus}
                        onTestMove={curtainControl.moveCurtainToPosition}
                        onEmergencyStop={curtainControl.stopCurtain}
                    />
                </div>
            </section>

            <section className={styles.workspaceSection}>
                <div className={styles.sectionHeading}>
                    <div>
                        <span>03 · SENSE & PROTECT</span>
                        <h2>เซ็นเซอร์และระบบหยุดปลายทาง</h2>
                    </div>
                    <p>เปรียบเทียบข้อมูลสภาพแวดล้อมกับสถานะลิมิตก่อนเดินมอเตอร์</p>
                </div>
                <div className={styles.splitGrid}>
                    <div className={styles.window}>
                        <SensorPanel sensorData={sensorData} />
                    </div>
                    <div className={`${styles.window} ${styles.safetyWindow}`}>
                        <LimitSensorPanel
                            deviceStatus={deviceStatus}
                            control={curtainControl}
                        />
                    </div>
                </div>
            </section>

            <section className={styles.workspaceSection}>
                <div className={styles.sectionHeading}>
                    <div>
                        <span>04 · POSITION</span>
                        <h2>Encoder และ Calibration</h2>
                    </div>
                    <p>ตรวจ pulse แล้วกำหนดระยะเดินจริงให้เปอร์เซ็นต์ตรงกับม่าน</p>
                </div>
                <div className={styles.splitGrid}>
                    <div className={styles.window}>
                        <EncoderTestPanel deviceStatus={deviceStatus} />
                    </div>
                    <div className={styles.window}>
                        <CalibrationPanel deviceStatus={deviceStatus} />
                    </div>
                </div>
            </section>

            <section className={styles.workspaceSection}>
                <div className={styles.sectionHeading}>
                    <div>
                        <span>05 · REVIEW</span>
                        <h2>ประวัติการเคลื่อนไหว</h2>
                    </div>
                    <p>ใช้ผลการเคลื่อนที่จริงวิเคราะห์ความคลาดเคลื่อนและการหยุดนิ่ง</p>
                </div>
                <div className={styles.window}>
                    <CurtainActionHistoryPanel
                        history={curtainControl.actionHistory}
                        onClear={curtainControl.clearActionHistory}
                    />
                </div>
            </section>
        </div>
    );
}
