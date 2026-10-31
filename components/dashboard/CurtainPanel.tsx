"use client";

import type useCurtainControl from "@/hooks/useCurtainControl";
import CurtainVisual from "./CurtainVisual";
import styles from "./CurtainPanel.module.css";

const commandLabels = {
    open: "ขยับเปิด",
    close: "ขยับปิด",
    stop: "หยุด",
    position: "ไปยังตำแหน่ง",
} as const;

type CurtainPanelProps = {
    control: ReturnType<typeof useCurtainControl>;
    isAutomatic: boolean;
    isDeviceOnline: boolean;
    encoderDetected: boolean;
    encoderCalibrated: boolean;
    positionControlSupported: boolean;
    isPositionControlReady: boolean;
    onStop: () => void;
};

export default function CurtainPanel({
    control,
    isAutomatic,
    isDeviceOnline,
    encoderDetected,
    encoderCalibrated,
    positionControlSupported,
    isPositionControlReady,
    onStop,
}: CurtainPanelProps) {
    const {
        positionPercent,
        targetPercent,
        isMoving,
        isSendingCommand,
        commandError,
        commandHistory,
        usesEncoderPosition,
        openCurtain,
        closeCurtain,
        selectTargetPercent,
        moveCurtainToTarget,
    } = control;
    const targetDifference = targetPercent - positionPercent;
    const targetDistance = Math.abs(targetDifference);
    const positionControlsDisabled =
        !isPositionControlReady ||
        isAutomatic ||
        isSendingCommand ||
        isMoving;

    function selectRelativeTarget(changePercent: number) {
        selectTargetPercent(positionPercent + changePercent);
    }

    function describeTargetMovement() {
        if (targetDistance < 0.5) {
            return "อยู่ที่เป้าหมายแล้ว";
        }

        return targetDifference > 0
            ? `เปิดเพิ่ม ${targetDistance.toFixed(1)}% ของระยะเต็ม`
            : `ปิดเพิ่ม ${targetDistance.toFixed(1)}% ของระยะเต็ม`;
    }

    return (
        <section className={styles.panel} aria-label="ควบคุมม่าน">
            <h2>ควบคุมม่าน</h2>
            <p>ควบคุมมอเตอร์ต้นแบบผ่าน ESP32</p>
            <CurtainVisual positionPercent={positionPercent} />
            <div className={styles.positionSummary}>
                <div>
                    <span>ตำแหน่งปัจจุบัน</span>
                    <strong>{positionPercent.toFixed(1)}%</strong>
                    <small>
                        {usesEncoderPosition
                            ? "ค่าจริงจาก Encoder"
                            : "ค่าจำลองโดยประมาณ"}
                    </small>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                    <span>เป้าหมายแบบตายตัว</span>
                    <strong>{targetPercent.toFixed(1)}%</strong>
                    <small>{describeTargetMovement()}</small>
                </div>
            </div>
            <p>
                สถานะ: {isMoving ? "กำลังเคลื่อนที่" : "หยุดนิ่ง"}
            </p>
            <p aria-live="polite">
                ESP32:{" "}
                {isSendingCommand
                    ? "กำลังส่งคำสั่ง..."
                    : commandError
                        ? "ส่งคำสั่งไม่สำเร็จ"
                        : isDeviceOnline
                            ? "ออนไลน์"
                            : "ออฟไลน์"}
            </p>

            {commandError && (
                <p role="alert">
                    {commandError}
                </p>
            )}

            <label>
                ตำแหน่งปลายทางแบบตายตัว: {targetPercent}%
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={targetPercent}
                    disabled={positionControlsDisabled}
                    onChange={(event) =>
                        selectTargetPercent(Number(event.target.value))
                    }
                />
                <small>
                    {isPositionControlReady
                        ? "ตัวอย่าง: จาก 100% ไป 20% หมายถึงม่านจะปิดลง 80% ของระยะเต็ม"
                        : encoderCalibrated && !positionControlSupported
                            ? "คาลิเบรตแล้ว กรุณาอัปโหลด Firmware 0.6.0 เพื่อใช้ตัวเลื่อน"
                            : encoderDetected
                            ? "ตรวจพบ Encoder แล้ว กรุณาตั้งจุดปิดและจุดเปิดให้ครบ"
                            : "ตัวเลื่อนจะเปิดหลังตรวจพบและคาลิเบรต Encoder"}
                </small>
            </label>

            <div className={styles.relativeControl}>
                <span>ตั้งเป้าจากตำแหน่งปัจจุบัน</span>
                <div>
                    <button
                        type="button"
                        disabled={
                            positionControlsDisabled ||
                            positionPercent <= 0
                        }
                        onClick={() => selectRelativeTarget(-10)}
                    >
                        ปิด −10%
                    </button>
                    <button
                        type="button"
                        disabled={
                            positionControlsDisabled ||
                            positionPercent <= 0
                        }
                        onClick={() => selectRelativeTarget(-5)}
                    >
                        ปิด −5%
                    </button>
                    <button
                        type="button"
                        disabled={
                            positionControlsDisabled ||
                            positionPercent >= 100
                        }
                        onClick={() => selectRelativeTarget(5)}
                    >
                        เปิด +5%
                    </button>
                    <button
                        type="button"
                        disabled={
                            positionControlsDisabled ||
                            positionPercent >= 100
                        }
                        onClick={() => selectRelativeTarget(10)}
                    >
                        เปิด +10%
                    </button>
                </div>
                <small>
                    ปุ่มเหล่านี้ตั้งเป้าหมายเท่านั้น ต้องกดปุ่มยืนยันด้านล่างอีกครั้ง
                </small>
            </div>

            {targetDistance > 10 && (
                <p className={styles.travelWarning} role="alert">
                    เป้าหมายนี้จะ{targetDifference > 0 ? "เปิด" : "ปิด"}ม่าน
                    {targetDistance.toFixed(1)}% ของระยะเต็ม — สำหรับการทดสอบควรไม่เกิน 10%
                </p>
            )}

            <button
                type="button"
                className={styles.targetButton}
                onClick={moveCurtainToTarget}
                disabled={
                    positionControlsDisabled ||
                    targetDistance < 0.5
                }
            >
                ไปที่ {targetPercent.toFixed(0)}% · {describeTargetMovement()}
            </button>

            <div className={styles.controls}>
                <button
                    type="button"
                    onClick={openCurtain}
                    disabled={
                        !isDeviceOnline ||
                        isAutomatic ||
                        isSendingCommand ||
                        isMoving ||
                        targetPercent === 100
                    }
                >
                    ขยับเปิด
                </button>

                <button
                    type="button"
                    onClick={closeCurtain}
                    disabled={
                        !isDeviceOnline ||
                        isAutomatic ||
                        isSendingCommand ||
                        isMoving ||
                        targetPercent === 0
                    }
                >
                    ขยับปิด
                </button>

                <button
                    type="button"
                    onClick={onStop}
                    disabled={
                        !isDeviceOnline ||
                        isSendingCommand
                    }
                >
                    หยุด
                </button>
            </div>

            <section
                className={styles.history}
                aria-label="ประวัติคำสั่งมอเตอร์"
            >
                <h3>ประวัติคำสั่งล่าสุด</h3>

                {commandHistory.length === 0 ? (
                    <p>ยังไม่มีการส่งคำสั่ง</p>
                ) : (
                    <ol>
                        {commandHistory.map((item) => (
                            <li key={item.id}>
                                <span>
                                    {item.successful ? "สำเร็จ" : "ไม่สำเร็จ"}
                                    {" — "}
                                    {commandLabels[item.command]}
                                    {item.command === "position"
                                        ? ` (${item.message})`
                                        : ""}
                                </span>
                                <time dateTime={item.createdAt}>
                                    {new Date(
                                        item.createdAt,
                                    ).toLocaleTimeString("th-TH")}
                                </time>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </section>
    );
}
