"use client";

import { useEffect, useState } from "react";
import type {
  DeviceStatus,
  DeviceStatusApiResponse,
} from "@/types/device";

const ACTIVE_STATUS_INTERVAL_MS = 350;
const SETTLING_STATUS_INTERVAL_MS = 250;
const SETTLING_DURATION_MS = 1200;
const IDLE_STATUS_INTERVAL_MS = 1200;
const OFFLINE_STATUS_INTERVAL_MS = 3000;

export default function useDeviceStatus() {
  const [status, setStatus] =
    useState<DeviceStatus | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastConnectedAt, setLastConnectedAt] =
    useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previousMotorRunning = false;
    let settlingUntilMs = 0;

    async function loadStatus() {
      setIsChecking(true);
      let nextIntervalMs = OFFLINE_STATUS_INTERVAL_MS;

      try {
        const response = await fetch("/api/device-status", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result =
          (await response.json()) as DeviceStatusApiResponse;

        if (!response.ok || !result.online) {
          throw new Error(
            result.online
              ? "อ่านสถานะ ESP32 ไม่สำเร็จ"
              : result.error,
          );
        }

        if (!controller.signal.aborted) {
          setStatus(result.data);
          setIsOnline(true);
          setError(null);
          setLastConnectedAt(new Date().toISOString());
          const motorRunning =
            result.data.motor.state === "running";

          if (motorRunning) {
            previousMotorRunning = true;
            settlingUntilMs = 0;
            nextIntervalMs = ACTIVE_STATUS_INTERVAL_MS;
          } else if (previousMotorRunning) {
            previousMotorRunning = false;
            settlingUntilMs = Date.now() + SETTLING_DURATION_MS;
            nextIntervalMs = SETTLING_STATUS_INTERVAL_MS;
          } else if (Date.now() < settlingUntilMs) {
            nextIntervalMs = SETTLING_STATUS_INTERVAL_MS;
          } else {
            nextIntervalMs = IDLE_STATUS_INTERVAL_MS;
          }
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setIsOnline(false);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "เชื่อมต่อ ESP32 ไม่สำเร็จ",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsChecking(false);
          timer = setTimeout(loadStatus, nextIntervalMs);
        }
      }
    }

    loadStatus();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [refreshToken]);

  function refreshStatus() {
    setRefreshToken((current) => current + 1);
  }

  return {
    status,
    isOnline,
    isChecking,
    error,
    lastConnectedAt,
    refreshStatus,
  };
}
