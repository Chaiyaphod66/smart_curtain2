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
    const [mode, setMode] = useState<"manual" | "automatic">("manual");
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
                            onChange={() => setMode("manual")}
                        />
                        Manual
                    </label>
                    <label title="กำลังทดสอบ Auto Preset จึงยังไม่สั่งมอเตอร์">
                        <input
                            type="radio"
                            name="curtain-mode"
                            value="automatic"
                            checked={mode === "automatic"}
                            onChange={() => setMode("automatic")}
                            disabled
                        />
                        Auto Preview
                    </label>
                </fieldset>
            </section>

            <div className={styles.consoleGrid}>
                <div className={styles.window}>
                    <EncoderTestPanel deviceStatus={deviceStatus} />
                </div>

                <div className={styles.window}>
                    <DeviceStatusPanel deviceStatus={deviceStatus} />
                </div>

                <div className={styles.window}>
                    <SensorPanel sensorData={sensorData} />
                </div>

                <div className={styles.window}>
                    <CurtainPanel
                        control={curtainControl}
                        isAutomatic={mode === "automatic"}
                        isDeviceOnline={isDeviceOnline}
                        encoderDetected={encoderDetected}
                        encoderCalibrated={encoderCalibrated}
                        positionControlSupported={positionControlSupported}
                        isPositionControlReady={isPositionControlReady}
                        motorFault={deviceStatus.status?.motor.fault ?? null}
                        onStop={() => {
                            setMode("manual");
                            curtainControl.stopCurtain();
                        }}
                    />
                </div>

                <div className={styles.window}>
                    <LimitSensorPanel
                        deviceStatus={deviceStatus}
                        control={curtainControl}
                    />
                </div>

                <div className={styles.window}>
                    <AutoPresetPanel
                        reading={readings}
                        source={source}
                        isDeviceOnline={isDeviceOnline}
                        currentPositionPercent={encoderPosition}
                        isPositionControlReady={isPositionControlReady}
                        isMotorRunning={curtainControl.isMoving}
                        isSendingCommand={curtainControl.isSendingCommand}
                        motorFault={deviceStatus.status?.motor.fault ?? null}
                        limitConflict={
                            deviceStatus.status?.limits.conflict ?? false
                        }
                        limitSafetyEnabled={
                            deviceStatus.status?.limits.safetyEnabled ?? false
                        }
                        commandError={curtainControl.commandError}
                        onTestMove={curtainControl.moveCurtainToPosition}
                        onEmergencyStop={curtainControl.stopCurtain}
                    />
                </div>

                <div className={styles.window}>
                    <CalibrationPanel deviceStatus={deviceStatus} />
                </div>

                <div className={styles.window}>
                    <CurtainActionHistoryPanel
                        history={curtainControl.actionHistory}
                        onClear={curtainControl.clearActionHistory}
                    />
                </div>
            </div>
        </div>
    );
}
