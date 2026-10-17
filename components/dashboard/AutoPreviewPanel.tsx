"use client";

import {
  CLOSE_THRESHOLD_LUX,
  OPEN_THRESHOLD_LUX,
} from "@/lib/curtain/get-auto-target";
import {
  getAutoSuggestion,
  type AutoPreviewState,
} from "@/lib/curtain/auto-preview";
import type { SensorReading } from "@/types/sensor";
import styles from "./AutoPreviewPanel.module.css";

type AutoPreviewPanelProps = {
  reading: SensorReading | null;
  preview: AutoPreviewState;
};

const levelLabels = {
  unavailable: "ไม่มีข้อมูล",
  dim: "แสงน้อย",
  normal: "แสงปกติ",
  bright: "แสงมาก",
} as const;

const suggestionLabels = {
  waiting: "กำลังรอข้อมูลที่เสถียร",
  open: "แนะนำให้เปิดม่าน",
  hold: "แนะนำให้คงตำแหน่งเดิม",
  close: "แนะนำให้ปิดม่าน",
} as const;

export default function AutoPreviewPanel({
  reading,
  preview,
}: AutoPreviewPanelProps) {
  const suggestion = getAutoSuggestion(
    preview.stableLevel,
  );
  const isStabilizing =
    preview.candidateLevel !== preview.stableLevel;

  return (
    <section
      className={styles.panel}
      aria-label="ตัวอย่างการทำงานอัตโนมัติ"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>AUTO PREVIEW</p>
          <h2>คำแนะนำจากค่าแสง</h2>
        </div>

        <span className={styles.previewBadge}>
          ไม่สั่งมอเตอร์
        </span>
      </div>

      <div className={styles.reading}>
        <span>ค่าแสงล่าสุด</span>
        <strong>
          {reading?.lightLux ?? "—"}
          {reading?.lightLux !== null && reading
            ? " lux"
            : ""}
        </strong>
      </div>

      <div className={styles.result} aria-live="polite">
        <p>
          ระดับที่กำลังตรวจ: {" "}
          <strong>
            {levelLabels[preview.candidateLevel]}
          </strong>
        </p>

        {isStabilizing && (
          <p>
            กำลังยืนยันค่า {preview.candidateCount}/3 ครั้ง
          </p>
        )}

        <p className={styles.suggestion}>
          {suggestionLabels[suggestion]}
        </p>
      </div>

      <p className={styles.thresholds}>
        ต่ำกว่า {OPEN_THRESHOLD_LUX} lux แนะนำให้เปิด ·
        มากกว่า {CLOSE_THRESHOLD_LUX} lux แนะนำให้ปิด
      </p>
    </section>
  );
}
