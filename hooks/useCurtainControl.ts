"use client";

import { useEffect, useState } from "react";
import {
  sendCloseUntilLimitCommand,
  sendMotorCommand,
  sendOpenUntilLimitCommand,
  sendPositionCommand,
  type MotorCommand,
} from "@/lib/curtain/esp32-curtain-client";
import useCurtainActionHistory from "@/hooks/useCurtainActionHistory";

const ESTIMATED_STEP_PERCENT = 20;
const MAX_HISTORY_ITEMS = 8;

export type CurtainCommand = MotorCommand | "position";

export type CommandHistoryItem = {
  id: string;
  command: CurtainCommand;
  successful: boolean;
  message: string;
  createdAt: string;
};

type CurtainControlOptions = {
  actualPositionPercent: number | null;
  encoderCount: number | null;
  isMotorRunning: boolean;
  motorFault: string | null;
  statusSampleId: number | null;
  refreshDeviceStatus: () => void;
};

export default function useCurtainControl({
  actualPositionPercent,
  encoderCount,
  isMotorRunning,
  motorFault,
  statusSampleId,
  refreshDeviceStatus,
}: CurtainControlOptions) {
  const [simulatedPositionPercent, setSimulatedPositionPercent] =
    useState(0);
  const [targetPercent, setTargetPercent] = useState(0);
  const [hasSelectedEncoderTarget, setHasSelectedEncoderTarget] =
    useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(
    null,
  );
  const [commandHistory, setCommandHistory] = useState<
    CommandHistoryItem[]
  >([]);

  const usesEncoderPosition = actualPositionPercent !== null;
  const positionPercent = usesEncoderPosition
    ? actualPositionPercent
    : simulatedPositionPercent;
  const displayedTargetPercent =
    usesEncoderPosition && !hasSelectedEncoderTarget
      ? actualPositionPercent
      : targetPercent;
  const isMoving = usesEncoderPosition
    ? isMotorRunning
    : simulatedPositionPercent !== targetPercent;
  const actionHistory = useCurtainActionHistory({
    positionPercent: actualPositionPercent,
    encoderCount,
    isMotorRunning,
    motorFault,
    statusSampleId,
  });

  useEffect(() => {
    if (
      usesEncoderPosition ||
      simulatedPositionPercent === targetPercent
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setSimulatedPositionPercent((current) => {
        if (current < targetPercent) {
          return Math.min(current + 2, targetPercent);
        }

        return Math.max(current - 2, targetPercent);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [
    simulatedPositionPercent,
    targetPercent,
    usesEncoderPosition,
  ]);

  function addHistory(
    command: CurtainCommand,
    successful: boolean,
    message: string,
  ) {
    const createdAt = new Date().toISOString();
    const item: CommandHistoryItem = {
      id: `${createdAt}-${command}`,
      command,
      successful,
      message,
      createdAt,
    };

    setCommandHistory((current) =>
      [item, ...current].slice(0, MAX_HISTORY_ITEMS),
    );
  }

  async function runMotorCommand(command: MotorCommand) {
    const startedAtMs = Date.now();
    setIsSendingCommand(true);
    setCommandError(null);

    try {
      await sendMotorCommand(command);
      addHistory(command, true, "ESP32 รับคำสั่งแล้ว");

      if (command === "stop") {
        actionHistory.recordStop(startedAtMs);
      } else {
        actionHistory.startAction(command, null, startedAtMs);
      }

      refreshDeviceStatus();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "ไม่สามารถเชื่อมต่อ ESP32 ได้";

      setCommandError(message);
      addHistory(command, false, message);
      actionHistory.recordFailedAction(
        command,
        null,
        startedAtMs,
        message,
      );
      return false;
    } finally {
      setIsSendingCommand(false);
    }
  }

  async function openCurtain() {
    const successful = await runMotorCommand("open");

    if (successful && !usesEncoderPosition) {
      setTargetPercent((current) =>
        Math.min(100, current + ESTIMATED_STEP_PERCENT),
      );
    } else if (successful) {
      setHasSelectedEncoderTarget(false);
    }
  }

  async function closeCurtain() {
    const successful = await runMotorCommand("close");

    if (successful && !usesEncoderPosition) {
      setTargetPercent((current) =>
        Math.max(0, current - ESTIMATED_STEP_PERCENT),
      );
    } else if (successful) {
      setHasSelectedEncoderTarget(false);
    }
  }

  async function closeUntilLimit() {
    const startedAtMs = Date.now();
    setIsSendingCommand(true);
    setCommandError(null);

    try {
      await sendCloseUntilLimitCommand();
      addHistory(
        "close",
        true,
        "กำลังปิดจนกว่าจะพบลิมิตปิดสุด",
      );
      actionHistory.startAction("close", 0, startedAtMs);

      if (!usesEncoderPosition) {
        setTargetPercent(0);
      } else {
        setHasSelectedEncoderTarget(false);
      }

      refreshDeviceStatus();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "สั่งทดสอบลิมิตปิดสุดไม่สำเร็จ";

      setCommandError(message);
      addHistory("close", false, message);
      actionHistory.recordFailedAction(
        "close",
        0,
        startedAtMs,
        message,
      );
      return false;
    } finally {
      setIsSendingCommand(false);
    }
  }

  async function openUntilLimit() {
    const startedAtMs = Date.now();
    setIsSendingCommand(true);
    setCommandError(null);

    try {
      await sendOpenUntilLimitCommand();
      addHistory(
        "open",
        true,
        "กำลังเปิดจนกว่าจะพบลิมิตเปิดสุด",
      );
      actionHistory.startAction("open", 100, startedAtMs);

      if (!usesEncoderPosition) {
        setTargetPercent(100);
      } else {
        setHasSelectedEncoderTarget(false);
      }

      refreshDeviceStatus();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "สั่งทดสอบลิมิตเปิดสุดไม่สำเร็จ";

      setCommandError(message);
      addHistory("open", false, message);
      actionHistory.recordFailedAction(
        "open",
        100,
        startedAtMs,
        message,
      );
      return false;
    } finally {
      setIsSendingCommand(false);
    }
  }

  function selectTargetPercent(value: number) {
    setTargetPercent(Math.min(100, Math.max(0, value)));
    setHasSelectedEncoderTarget(true);
  }

  async function moveCurtainToPosition(requestedPercent: number) {
    const safeTargetPercent = Math.round(
      Math.min(100, Math.max(0, requestedPercent)),
    );
    const startedAtMs = Date.now();
    setTargetPercent(safeTargetPercent);
    setHasSelectedEncoderTarget(true);
    setIsSendingCommand(true);
    setCommandError(null);

    try {
      await sendPositionCommand(safeTargetPercent);
      addHistory(
        "position",
        true,
        `สั่งไปที่ ${safeTargetPercent}%`,
      );
      actionHistory.startAction(
        "position",
        safeTargetPercent,
        startedAtMs,
      );
      refreshDeviceStatus();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "สั่งตำแหน่งม่านไม่สำเร็จ";

      setCommandError(message);
      addHistory("position", false, message);
      actionHistory.recordFailedAction(
        "position",
        safeTargetPercent,
        startedAtMs,
        message,
      );
      return false;
    } finally {
      setIsSendingCommand(false);
    }
  }

  async function moveCurtainToTarget() {
    return moveCurtainToPosition(displayedTargetPercent);
  }

  async function stopCurtain() {
    setTargetPercent(positionPercent);
    setHasSelectedEncoderTarget(false);
    await runMotorCommand("stop");
  }

  return {
    positionPercent,
    targetPercent: displayedTargetPercent,
    usesEncoderPosition,
    isMoving,
    isSendingCommand,
    commandError,
    commandHistory,
    actionHistory: actionHistory.history,
    clearActionHistory: actionHistory.clearHistory,
    openCurtain,
    openUntilLimit,
    closeCurtain,
    closeUntilLimit,
    selectTargetPercent,
    moveCurtainToPosition,
    moveCurtainToTarget,
    stopCurtain,
  };
}
