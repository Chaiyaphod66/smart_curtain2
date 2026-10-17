"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  CurtainActionCommand,
  CurtainActionRecord,
  CurtainActionStatus,
} from "@/types/curtain-action";

const STORAGE_KEY = "smart-curtain.motion-history.v1";
const UPDATE_EVENT = "smart-curtain:motion-history";
const MAX_HISTORY_ITEMS = 50;
const ENCODER_SETTLE_MS = 600;
const MAX_SETTLE_WAIT_MS = 3000;
const EMPTY_HISTORY: CurtainActionRecord[] = [];

let cachedHistorySource: string | null | undefined;
let cachedHistory: CurtainActionRecord[] = EMPTY_HISTORY;

type MotionSnapshot = {
  positionPercent: number | null;
  encoderCount: number | null;
  isMotorRunning: boolean;
  motorFault: string | null;
  statusSampleId: number | null;
};

type ActiveAction = {
  id: string;
  startedAtMs: number;
  startPositionPercent: number | null;
  startEncoderCount: number | null;
  sawMotorRunning: boolean;
  stopDetectedAtMs: number | null;
  motorStoppedEncoderCount: number | null;
  lastObservedEncoderCount: number | null;
  encoderStableSinceMs: number | null;
  requestedFinalStatus: Exclude<
    CurtainActionStatus,
    "running"
  > | null;
  requestedFinalMessage: string | null;
};

function readHistorySnapshot() {
  const savedHistory = window.localStorage.getItem(STORAGE_KEY);

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
      ? (parsedHistory as CurtainActionRecord[]).slice(
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
  window.addEventListener(UPDATE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(UPDATE_EVENT, onStoreChange);
  };
}

function writeHistory(history: CurtainActionRecord[]) {
  const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(limitedHistory),
  );
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function prependRecord(record: CurtainActionRecord) {
  writeHistory([record, ...readHistorySnapshot()]);
}

function updateRecord(
  id: string,
  updates: Partial<CurtainActionRecord>,
) {
  writeHistory(
    readHistorySnapshot().map((record) =>
      record.id === id ? { ...record, ...updates } : record,
    ),
  );
}

function getCountChange(
  startCount: number | null,
  endCount: number | null,
) {
  return startCount === null || endCount === null
    ? null
    : endCount - startCount;
}

function getPositionError(
  targetPercent: number | null,
  endPercent: number | null,
) {
  return targetPercent === null || endPercent === null
    ? null
    : Number((endPercent - targetPercent).toFixed(1));
}

export default function useCurtainActionHistory({
  positionPercent,
  encoderCount,
  isMotorRunning,
  motorFault,
  statusSampleId,
}: MotionSnapshot) {
  const history = useSyncExternalStore(
    subscribeHistory,
    readHistorySnapshot,
    getServerHistorySnapshot,
  );
  const activeActionRef = useRef<ActiveAction | null>(null);

  const finishActiveAction = useCallback(
    (
      status: Exclude<CurtainActionStatus, "running">,
      message?: string,
    ) => {
      const activeAction = activeActionRef.current;

      if (!activeAction) {
        return;
      }

      const completedAtMs = Date.now();
      const record = readHistorySnapshot().find(
        (item) => item.id === activeAction.id,
      );

      updateRecord(activeAction.id, {
        status,
        completedAt: new Date(completedAtMs).toISOString(),
        durationMs: completedAtMs - activeAction.startedAtMs,
        endPositionPercent: positionPercent,
        positionErrorPercent: getPositionError(
          record?.targetPositionPercent ?? null,
          positionPercent,
        ),
        endEncoderCount: encoderCount,
        encoderCountChange: getCountChange(
          activeAction.startEncoderCount,
          encoderCount,
        ),
        motorStoppedEncoderCount:
          activeAction.motorStoppedEncoderCount,
        coastPulseCount: getCountChange(
          activeAction.motorStoppedEncoderCount,
          encoderCount,
        ),
        message:
          message ??
          (status === "completed"
            ? "บันทึกผลหลัง Encoder หยุดนิ่งแล้ว"
            : record?.message ?? ""),
      });

      activeActionRef.current = null;
    },
    [encoderCount, positionPercent],
  );

  useEffect(() => {
    const activeAction = activeActionRef.current;

    if (!activeAction) {
      return;
    }

    if (isMotorRunning) {
      activeAction.sawMotorRunning = true;
      activeAction.stopDetectedAtMs = null;
      activeAction.motorStoppedEncoderCount = null;
      activeAction.lastObservedEncoderCount = null;
      activeAction.encoderStableSinceMs = null;
      return;
    }

    const encoderMoved =
      activeAction.startEncoderCount !== null &&
      encoderCount !== null &&
      encoderCount !== activeAction.startEncoderCount;
    const enoughTimePassed =
      Date.now() - activeAction.startedAtMs >= 900;

    if (
      !activeAction.sawMotorRunning &&
      !encoderMoved &&
      motorFault === null &&
      !enoughTimePassed
    ) {
      return;
    }

    const currentTime = Date.now();

    if (activeAction.stopDetectedAtMs === null) {
      activeAction.stopDetectedAtMs = currentTime;
      activeAction.motorStoppedEncoderCount = encoderCount;
      activeAction.lastObservedEncoderCount = encoderCount;
      activeAction.encoderStableSinceMs = currentTime;
      return;
    }

    if (encoderCount !== activeAction.lastObservedEncoderCount) {
      activeAction.lastObservedEncoderCount = encoderCount;
      activeAction.encoderStableSinceMs = currentTime;
      return;
    }

    const stableForMs =
      currentTime -
      (activeAction.encoderStableSinceMs ?? currentTime);
    const settlingForMs =
      currentTime - activeAction.stopDetectedAtMs;

    if (
      stableForMs >= ENCODER_SETTLE_MS ||
      settlingForMs >= MAX_SETTLE_WAIT_MS
    ) {
      const finalStatus =
        activeAction.requestedFinalStatus ??
        (motorFault ? "failed" : "completed");
      const finalMessage =
        activeAction.requestedFinalMessage ??
        (motorFault === "encoder-no-pulse"
          ? "หยุดเพราะไม่พบ Pulse จาก Encoder"
          : motorFault === "position-timeout"
            ? "หยุดเพราะใช้เวลาเกินกำหนด"
            : motorFault === "closed-limit-timeout"
              ? "หยุดเพราะไม่พบสวิตช์ปิดสุดภายใน 10 วินาที"
              : motorFault === "open-limit-timeout"
                ? "หยุดเพราะไม่พบสวิตช์เปิดสุดภายใน 10 วินาที"
              : "บันทึกผลหลัง Encoder หยุดนิ่งแล้ว");

      finishActiveAction(finalStatus, finalMessage);
    }
  }, [
    encoderCount,
    finishActiveAction,
    isMotorRunning,
    motorFault,
    statusSampleId,
  ]);

  function startAction(
    command: Exclude<CurtainActionCommand, "stop">,
    targetPositionPercent: number | null,
    startedAtMs: number,
  ) {
    finishActiveAction(
      "interrupted",
      "มีคำสั่งใหม่ก่อนรายการเดิมเสร็จ",
    );

    const id = `${startedAtMs}-${command}-${Math.random()
      .toString(16)
      .slice(2)}`;
    const record: CurtainActionRecord = {
      id,
      command,
      status: "running",
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: null,
      durationMs: null,
      startPositionPercent: positionPercent,
      targetPositionPercent,
      endPositionPercent: null,
      positionErrorPercent: null,
      startEncoderCount: encoderCount,
      endEncoderCount: null,
      encoderCountChange: null,
      motorStoppedEncoderCount: null,
      coastPulseCount: null,
      message: "กำลังรอผลจาก ESP32",
    };

    prependRecord(record);
    activeActionRef.current = {
      id,
      startedAtMs,
      startPositionPercent: positionPercent,
      startEncoderCount: encoderCount,
      sawMotorRunning: isMotorRunning,
      stopDetectedAtMs: null,
      motorStoppedEncoderCount: null,
      lastObservedEncoderCount: null,
      encoderStableSinceMs: null,
      requestedFinalStatus: null,
      requestedFinalMessage: null,
    };
  }

  function recordFailedAction(
    command: CurtainActionCommand,
    targetPositionPercent: number | null,
    startedAtMs: number,
    message: string,
  ) {
    prependRecord({
      id: `${startedAtMs}-${command}-failed`,
      command,
      status: "failed",
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      startPositionPercent: positionPercent,
      targetPositionPercent,
      endPositionPercent: positionPercent,
      positionErrorPercent: null,
      startEncoderCount: encoderCount,
      endEncoderCount: encoderCount,
      encoderCountChange: 0,
      motorStoppedEncoderCount: encoderCount,
      coastPulseCount: 0,
      message,
    });
  }

  function recordStop(startedAtMs: number) {
    const activeAction = activeActionRef.current;

    if (activeAction) {
      activeAction.requestedFinalStatus = "interrupted";
      activeAction.requestedFinalMessage =
        "ผู้ใช้กดหยุด และบันทึกผลหลัง Encoder นิ่งแล้ว";
    }

    prependRecord({
      id: `${startedAtMs}-stop`,
      command: "stop",
      status: "completed",
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      startPositionPercent: positionPercent,
      targetPositionPercent: positionPercent,
      endPositionPercent: positionPercent,
      positionErrorPercent: 0,
      startEncoderCount: encoderCount,
      endEncoderCount: encoderCount,
      encoderCountChange: 0,
      motorStoppedEncoderCount: encoderCount,
      coastPulseCount: 0,
      message: activeAction
        ? "ส่งคำสั่งหยุด ผลสุดท้ายอยู่ในรายการเคลื่อนที่ก่อนหน้า"
        : "ผู้ใช้สั่งหยุดมอเตอร์",
    });
  }

  function clearHistory() {
    activeActionRef.current = null;
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }

  return {
    history,
    startAction,
    recordFailedAction,
    recordStop,
    clearHistory,
  };
}
