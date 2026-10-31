"use client";

import { useState } from "react";
import useAutoResponseStyle from "@/hooks/useAutoResponseStyle";
import useUserAutoPresetChoice from "@/hooks/useUserAutoPresetChoice";
import type useDeviceStatus from "@/hooks/useDeviceStatus";
import { disableContinuousAuto } from "@/lib/curtain/esp32-curtain-client";
import {
  getAutoPhaseDetails,
  getAutoPresetDisplayName,
  getAutoResponseStyleLabel,
  translateAutoReason,
} from "@/lib/curtain/auto-user-helper";
import AppIcon from "./AppIcon";
import styles from "./UserPages.module.css";

type AutoRuntimeStatusBarProps = {
  device: ReturnType<typeof useDeviceStatus>;
  onSwitchToAutoTab: () => void;
};

export default function AutoRuntimeStatusBar({
  device,
  onSwitchToAutoTab,
}: AutoRuntimeStatusBarProps) {
  const { selectedOptionId } = useUserAutoPresetChoice();
  const { responseStyle } = useAutoResponseStyle();
  const [isDisabling, setIsDisabling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deviceAuto = device.status?.auto ?? null;
  const isAutoEnabled = device.isOnline && deviceAuto?.enabled === true;

  if (!isAutoEnabled) {
    return (
      <div className={styles.autoBarOffline}>
        <div className={styles.autoBarOfflineInfo}>
          <AppIcon name="sparkles" size={16} />
          <span>Auto ปิดอยู่ — สามารถเปิดใช้งานเพื่อให้ม่านปรับเองตามเซ็นเซอร์</span>
        </div>
        <button
          type="button"
          className={styles.autoBarLinkBtn}
          onClick={onSwitchToAutoTab}
        >
          ตั้งค่า Auto →
        </button>
      </div>
    );
  }

  const phaseDetails = getAutoPhaseDetails(deviceAuto?.phase, deviceAuto);
  const presetName = getAutoPresetDisplayName(
    deviceAuto?.presetId,
    selectedOptionId,
  );
  const styleLabel = deviceAuto?.presetId === "model-a"
    ? "บน ESP32"
    : getAutoResponseStyleLabel(deviceAuto?.responseStyle ?? responseStyle);
  const reasonText = translateAutoReason(deviceAuto?.reason);

  const targetPercent =
    typeof deviceAuto?.candidateTargetPercent === "number"
      ? deviceAuto.candidateTargetPercent
      : typeof deviceAuto?.lastCommandTargetPercent === "number"
        ? deviceAuto.lastCommandTargetPercent
        : null;

  async function handleDisableAuto() {
    if (isDisabling) return;
    const confirmed = window.confirm(
      "ต้องการปิดระบบ Auto เพื่อควบคุมม่านแบบ Manual ใช่หรือไม่?",
    );
    if (!confirmed) return;

    setIsDisabling(true);
    setErrorMsg(null);
    try {
      await disableContinuousAuto();
      await device.refreshStatus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "ปิด Auto ไม่สำเร็จ");
    } finally {
      setIsDisabling(false);
    }
  }

  return (
    <div className={styles.autoStatusBarCompact} role="region" aria-label="สถานะ Auto แบบย่อ">
      <div className={styles.autoStatusBarMain}>
        <div className={styles.autoStatusBarLeft}>
          <span className={styles.autoBarLiveDot} />
          <div className={styles.autoStatusBarText}>
            <div className={styles.autoBarHeadline}>
              <strong>Auto กำลังทำงาน:</strong>
              <span className={styles.autoBarPresetName}>{presetName}</span>
              <span className={styles.autoBarStyleBadge}>{styleLabel}</span>
            </div>
            <p className={styles.autoBarSubtext}>
              <span className={`${styles.autoBarPhasePill} ${styles[`phase_${phaseDetails.tone}`]}`}>
                {phaseDetails.badgeLabel}
              </span>
              {targetPercent !== null && (
                <span className={styles.autoBarTargetPill}>
                  เป้าหมาย: {Math.round(targetPercent)}%
                </span>
              )}
              {reasonText && <span className={styles.autoBarReason}>{reasonText}</span>}
            </p>
          </div>
        </div>

        <div className={styles.autoStatusBarActions}>
          <button
            type="button"
            className={styles.autoBarDisableBtn}
            onClick={handleDisableAuto}
            disabled={isDisabling}
          >
            {isDisabling ? "กำลังปิด..." : "ปิด Auto เพื่อควบคุมเอง"}
          </button>
          <button
            type="button"
            className={styles.autoBarDetailBtn}
            onClick={onSwitchToAutoTab}
          >
            ดูการตั้งค่า Auto →
          </button>
        </div>
      </div>

      {errorMsg && (
        <p className={styles.modeError} role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
