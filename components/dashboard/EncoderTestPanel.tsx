"use client";

import { useState, useSyncExternalStore } from "react";
import type useDeviceStatus from "@/hooks/useDeviceStatus";
import {
  getEncoderSignalState,
  type EncoderSignalState,
} from "@/lib/curtain/encoder-diagnostics";
import styles from "./EncoderTestPanel.module.css";

const HISTORY_STORAGE_KEY = "smart-curtain.encoder-tests.v1";
const HISTORY_UPDATE_EVENT = "smart-curtain:encoder-history";
const MAX_HISTORY_ITEMS = 20;

type EncoderTestPanelProps = {
  deviceStatus: ReturnType<typeof useDeviceStatus>;
};

type EncoderTestBaseline = {
  count: number;
  aPulseCount: number;
  bPulseCount: number;
};

type EncoderTestResult = {
  id: string;
  testedAt: string;
  startCount: number;
  endCount: number;
  countChange: number;
  aPulseChange: number;
  bPulseChange: number;
  signalState: EncoderSignalState;
};

const EMPTY_HISTORY: EncoderTestResult[] = [];
let cachedHistorySource: string | null | undefined;
let cachedHistory: EncoderTestResult[] = EMPTY_HISTORY;

function readHistorySnapshot() {
  const savedHistory = window.localStorage.getItem(
    HISTORY_STORAGE_KEY,
  );

  if (savedHistory === cachedHistorySource) {
    return cachedHistory;
  }

  cachedHistorySource = savedHistory;

  if (!savedHistory) {
    cachedHistory = EMPTY_HISTORY;
    return cachedHistory;
  }

  try {
    const parsedHistory: unknown = JSON.parse(savedHistory);

    cachedHistory = Array.isArray(parsedHistory)
      ? (parsedHistory as EncoderTestResult[]).slice(
          0,
          MAX_HISTORY_ITEMS,
        )
      : EMPTY_HISTORY;
  } catch {
    cachedHistory = EMPTY_HISTORY;
  }

  return cachedHistory;
}

function getServerHistorySnapshot() {
  return EMPTY_HISTORY;
}

function subscribeHistory(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(HISTORY_UPDATE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(HISTORY_UPDATE_EVENT, onStoreChange);
  };
}

function writeHistory(history: EncoderTestResult[]) {
  window.localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(history),
  );
  window.dispatchEvent(new Event(HISTORY_UPDATE_EVENT));
}

function getResultLabel(signalState: EncoderSignalState) {
  switch (signalState) {
    case "both":
      return "ผ่าน — A และ B มีสัญญาณ";
    case "a-only":
      return "พบเฉพาะ A — ตรวจสาย B";
    case "b-only":
      return "พบเฉพาะ B — ตรวจสาย A";
    default:
      return "ไม่พบสัญญาณ";
  }
}

function formatTestedAt(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function EncoderTestPanel({
  deviceStatus,
}: EncoderTestPanelProps) {
  const [baseline, setBaseline] =
    useState<EncoderTestBaseline | null>(null);
  const history = useSyncExternalStore(
    subscribeHistory,
    readHistorySnapshot,
    getServerHistorySnapshot,
  );

  const encoder = deviceStatus.status?.encoder;
  const currentCount =
    typeof encoder?.count === "number" ? encoder.count : null;
  const currentAPulseCount =
    typeof encoder?.aPulseCount === "number"
      ? encoder.aPulseCount
      : null;
  const currentBPulseCount =
    typeof encoder?.bPulseCount === "number"
      ? encoder.bPulseCount
      : null;
  const pulseDetected = encoder?.pulseDetected ?? false;

  const firmwareReady =
    currentCount !== null &&
    currentAPulseCount !== null &&
    currentBPulseCount !== null;
  const canStart = deviceStatus.isOnline && firmwareReady;

  const countChange =
    baseline !== null && currentCount !== null
      ? currentCount - baseline.count
      : null;
  const aPulseChange =
    baseline !== null && currentAPulseCount !== null
      ? Math.max(0, currentAPulseCount - baseline.aPulseCount)
      : null;
  const bPulseChange =
    baseline !== null && currentBPulseCount !== null
      ? Math.max(0, currentBPulseCount - baseline.bPulseCount)
      : null;
  const signalState =
    aPulseChange !== null && bPulseChange !== null
      ? getEncoderSignalState(aPulseChange, bPulseChange)
      : "none";

  function startTest() {
    if (
      !canStart ||
      currentCount === null ||
      currentAPulseCount === null ||
      currentBPulseCount === null
    ) {
      return;
    }

    setBaseline({
      count: currentCount,
      aPulseCount: currentAPulseCount,
      bPulseCount: currentBPulseCount,
    });
  }

  function resetTest() {
    setBaseline(null);
  }

  function saveTestResult() {
    if (
      baseline === null ||
      currentCount === null ||
      aPulseChange === null ||
      bPulseChange === null
    ) {
      return;
    }

    const result: EncoderTestResult = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      testedAt: new Date().toISOString(),
      startCount: baseline.count,
      endCount: currentCount,
      countChange: currentCount - baseline.count,
      aPulseChange,
      bPulseChange,
      signalState,
    };
    const nextHistory = [result, ...history].slice(
      0,
      MAX_HISTORY_ITEMS,
    );

    writeHistory(nextHistory);
    setBaseline(null);
  }

  function clearHistory() {
    const confirmed = window.confirm(
      "ล้างประวัติการทดสอบ Encoder ทั้งหมดหรือไม่?",
    );

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    window.dispatchEvent(new Event(HISTORY_UPDATE_EVENT));
  }

  let resultLabel = "พร้อมเริ่มทดสอบ";
  let resultClassName = styles.ready;

  if (!deviceStatus.isOnline) {
    resultLabel = "ESP32 ออฟไลน์";
    resultClassName = styles.unavailable;
  } else if (!firmwareReady) {
    resultLabel = "Firmware ยังไม่รองรับการตรวจสาย A/B";
    resultClassName = styles.unavailable;
  } else if (baseline !== null && signalState === "both") {
    resultLabel = "ผ่าน — ตรวจพบทั้ง A และ B";
    resultClassName = styles.passed;
  } else if (baseline !== null && signalState === "a-only") {
    resultLabel = "พบเฉพาะ A — ตรวจสาย B";
    resultClassName = styles.warning;
  } else if (baseline !== null && signalState === "b-only") {
    resultLabel = "พบเฉพาะ B — ตรวจสาย A";
    resultClassName = styles.warning;
  } else if (baseline !== null) {
    resultLabel = "กำลังรอสัญญาณ A และ B";
    resultClassName = styles.testing;
  } else if (pulseDetected) {
    resultLabel = "เคยตรวจพบ Pulse หลังเปิดเครื่อง";
    resultClassName = styles.passed;
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="encoder-test-title"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>ENCODER TEST</p>
          <h2 id="encoder-test-title">ทดสอบสัญญาณ Encoder</h2>
        </div>

        <span className={resultClassName} role="status">
          {resultLabel}
        </span>
      </div>

      <div className={styles.readings}>
        <div>
          <span>ค่าปัจจุบัน</span>
          <strong>{currentCount ?? "—"}</strong>
          <small>count</small>
        </div>
        <div>
          <span>ค่าตอนเริ่ม</span>
          <strong>{baseline?.count ?? "—"}</strong>
          <small>count</small>
        </div>
        <div>
          <span>ค่าที่เปลี่ยน</span>
          <strong>
            {countChange === null
              ? "—"
              : countChange > 0
                ? `+${countChange}`
                : countChange}
          </strong>
          <small>pulse</small>
        </div>
      </div>

      <div className={styles.channels}>
        <div
          className={
            aPulseChange !== null && aPulseChange > 0
              ? styles.channelGood
              : styles.channelIdle
          }
        >
          <span>ช่อง A · GPIO32</span>
          <strong>{currentAPulseCount ?? "—"}</strong>
          <small>เปลี่ยน {aPulseChange ?? "—"} pulse</small>
        </div>
        <div
          className={
            bPulseChange !== null && bPulseChange > 0
              ? styles.channelGood
              : styles.channelIdle
          }
        >
          <span>ช่อง B · GPIO33</span>
          <strong>{currentBPulseCount ?? "—"}</strong>
          <small>เปลี่ยน {bPulseChange ?? "—"} pulse</small>
        </div>
      </div>

      <ol className={styles.steps}>
        <li>กดเริ่มทดสอบเพื่อบันทึกค่าตั้งต้น</li>
        <li>ใช้ปุ่ม Manual หมุนมอเตอร์ช่วงสั้น ๆ</li>
        <li>รอไม่เกิน 3 วินาที แล้วกดบันทึกผลทดสอบ</li>
      </ol>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.startButton}
          onClick={startTest}
          disabled={!canStart}
        >
          {baseline === null
            ? "เริ่มทดสอบ"
            : "เริ่มใหม่จากค่าปัจจุบัน"}
        </button>
        <button
          type="button"
          className={styles.saveButton}
          onClick={saveTestResult}
          disabled={baseline === null}
        >
          บันทึกผลปัจจุบัน
        </button>
        <button
          type="button"
          className={styles.resetButton}
          onClick={resetTest}
          disabled={baseline === null}
        >
          ยกเลิกการทดสอบ
        </button>
      </div>

      <p className={styles.note}>
        การระบุสายเป็นการวิเคราะห์จาก Pulse ไม่สามารถแยกปัญหาไฟ
        3.3V, GND และขั้วต่อได้แน่นอน
      </p>

      <div className={styles.historyHeading}>
        <div>
          <h3>ประวัติการทดสอบ</h3>
          <p>เก็บในเบราว์เซอร์นี้ สูงสุด {MAX_HISTORY_ITEMS} ครั้ง</p>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={history.length === 0}
        >
          ล้างประวัติ
        </button>
      </div>

      {history.length === 0 ? (
        <p className={styles.emptyHistory}>ยังไม่มีผลการทดสอบ</p>
      ) : (
        <ul className={styles.historyList}>
          {history.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{getResultLabel(item.signalState)}</strong>
                <time dateTime={item.testedAt}>
                  {formatTestedAt(item.testedAt)}
                </time>
              </div>
              <span>
                count {item.startCount} → {item.endCount}
              </span>
              <span>
                Δ {item.countChange} · A {item.aPulseChange} · B{" "}
                {item.bPulseChange}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
