"use client";

import { useState } from "react";
import type { CurtainActionRecord } from "@/types/curtain-action";
import styles from "./CurtainActionHistoryPanel.module.css";

type CurtainActionHistoryPanelProps = {
  history: CurtainActionRecord[];
  onClear: () => void;
};

const commandLabels = {
  open: "ขยับเปิด",
  close: "ขยับปิด",
  stop: "หยุด",
  position: "ไปยังตำแหน่ง",
} as const;

const statusLabels = {
  running: "กำลังทำงาน",
  completed: "เสร็จแล้ว",
  interrupted: "ถูกหยุด",
  failed: "ไม่สำเร็จ",
} as const;

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatCount(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("th-TH");
}

function formatDuration(value: number | null) {
  return value === null ? "—" : `${(value / 1000).toFixed(1)} วินาที`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function createAnalysisText(history: CurtainActionRecord[]) {
  const lines = [
    "SMART CURTAIN MOTION LOG",
    `สร้างเมื่อ: ${new Date().toLocaleString("th-TH")}`,
    `จำนวนรายการ: ${history.length}`,
    "",
  ];

  [...history].reverse().forEach((item, index) => {
    const error =
      item.positionErrorPercent === null
        ? "—"
        : `${item.positionErrorPercent > 0 ? "+" : ""}${item.positionErrorPercent.toFixed(1)}%`;

    lines.push(
      `#${index + 1} ${formatTime(item.startedAt)}`,
      `คำสั่ง: ${commandLabels[item.command]} | สถานะ: ${statusLabels[item.status]}`,
      `ตำแหน่ง: เริ่ม ${formatPercent(item.startPositionPercent)} → เป้าหมาย ${formatPercent(item.targetPositionPercent)} → หยุดจริง ${formatPercent(item.endPositionPercent)}`,
      `Encoder: ${formatCount(item.startEncoderCount)} → ${formatCount(item.endEncoderCount)} | เปลี่ยน ${formatCount(item.encoderCountChange)} pulse`,
      `Pulse ระหว่างรอนิ่ง: ${formatCount(item.coastPulseCount)} pulse`,
      `คลาดจากเป้าหมาย: ${error} | เวลา: ${formatDuration(item.durationMs)}`,
      `หมายเหตุ: ${item.message || "—"}`,
      "",
    );
  });

  return lines.join("\n");
}

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // ใช้วิธีสำรองด้านล่างเมื่อ Clipboard API ถูกบล็อก
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("copy failed");
  }
}

export default function CurtainActionHistoryPanel({
  history,
  onClear,
}: CurtainActionHistoryPanelProps) {
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");

  function clearHistory() {
    const confirmed = window.confirm(
      "ล้างประวัติการเคลื่อนที่ทั้งหมดหรือไม่?",
    );

    if (confirmed) {
      onClear();
    }
  }

  async function copyForAnalysis() {
    if (history.length === 0) {
      return;
    }

    try {
      await copyText(createAnalysisText(history));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="motion-history-title"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>MOTION LOG</p>
          <h2 id="motion-history-title">ผลการเคลื่อนที่ของม่าน</h2>
          <p>
            เก็บในเบราว์เซอร์นี้สูงสุด 50 รายการ
            โดยไม่ต้องใช้ฐานข้อมูล
          </p>
        </div>
        <div className={styles.headingActions}>
          <button
            type="button"
            className={styles.copyButton}
            onClick={copyForAnalysis}
            disabled={history.length === 0}
          >
            คัดลอกผลสำหรับวิเคราะห์
          </button>
          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            ล้างประวัติ
          </button>
        </div>
      </div>

      <p className={styles.copyStatus} aria-live="polite">
        {copyStatus === "copied"
          ? "คัดลอกแล้ว — นำมาวางในแชตได้เลย"
          : copyStatus === "error"
            ? "คัดลอกอัตโนมัติไม่ได้ กรุณาใช้เบราว์เซอร์ที่อนุญาต Clipboard"
            : ""}
      </p>

      {history.length === 0 ? (
        <p className={styles.empty}>
          ยังไม่มีข้อมูล ลองสั่งขยับม่านหรือเลือกตำแหน่งเป้าหมาย
        </p>
      ) : (
        <ol className={styles.list}>
          {history.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.itemHeading}>
                <div>
                  <strong>{commandLabels[item.command]}</strong>
                  <time dateTime={item.startedAt}>
                    {formatTime(item.startedAt)}
                  </time>
                </div>
                <span
                  className={styles[item.status]}
                  aria-label={`สถานะ ${statusLabels[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>

              <div className={styles.route}>
                <div>
                  <span>เริ่ม</span>
                  <strong>
                    {formatPercent(item.startPositionPercent)}
                  </strong>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                  <span>เป้าหมาย</span>
                  <strong>
                    {formatPercent(item.targetPositionPercent)}
                  </strong>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                  <span>หยุดจริง</span>
                  <strong>
                    {formatPercent(item.endPositionPercent)}
                  </strong>
                </div>
              </div>

              <dl className={styles.details}>
                <div>
                  <dt>Encoder</dt>
                  <dd>
                    {formatCount(item.startEncoderCount)} →{" "}
                    {formatCount(item.endEncoderCount)}
                  </dd>
                </div>
                <div>
                  <dt>Pulse ที่เปลี่ยน</dt>
                  <dd>{formatCount(item.encoderCountChange)}</dd>
                </div>
                <div>
                  <dt>Pulse ระหว่างรอนิ่ง</dt>
                  <dd>{formatCount(item.coastPulseCount)} pulse</dd>
                </div>
                <div>
                  <dt>คลาดจากเป้าหมาย</dt>
                  <dd>
                    {item.positionErrorPercent === null
                      ? "—"
                      : `${item.positionErrorPercent > 0 ? "+" : ""}${item.positionErrorPercent.toFixed(1)}%`}
                  </dd>
                </div>
                <div>
                  <dt>ระยะเวลา</dt>
                  <dd>{formatDuration(item.durationMs)}</dd>
                </div>
              </dl>

              {item.message && (
                <p className={styles.message}>{item.message}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
