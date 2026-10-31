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

type AutoRuntimeStatusCardProps = {
  device: ReturnType<typeof useDeviceStatus>;
  onStop: () => void | Promise<void | boolean>;
};

export default function AutoRuntimeStatusCard({
  device,
  onStop,
}: AutoRuntimeStatusCardProps) {
  const { selectedOptionId } = useUserAutoPresetChoice();
  const { responseStyle } = useAutoResponseStyle();
  const [isDisabling, setIsDisabling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deviceAuto = device.status?.auto ?? null;
  const isAutoEnabled = device.isOnline && deviceAuto?.enabled === true;

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
      "ต้องการปิดระบบ Auto และสลับเป็นการควบคุม Manual ใช่หรือไม่?",
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

  if (!isAutoEnabled) {
    return (
      <div className={styles.autoStatusCardStandby}>
        <div className={styles.autoStatusStandbyHeader}>
          <div className={styles.autoStatusStandbyLeft}>
            <span className={styles.autoStatusStandbyIcon}>
              <AppIcon name="sparkles" size={20} />
            </span>
            <div>
              <strong>สถานะ Auto: ปิดอยู่ (Manual Mode)</strong>
              <p>เลือกพรีเซ็ตและวิธีขยับม่านด้านล่าง แล้วกด &quot;ใช้ชุดนี้&quot; เพื่อเปิดใช้งาน</p>
            </div>
          </div>
          <span className={styles.autoStandbyPill}>STANDBY</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.autoStatusCardActive} aria-live="polite">
      <div className={styles.autoStatusHeader}>
        <div className={styles.autoStatusHeaderLeft}>
          <span className={styles.autoLivePulseIcon}>
            <AppIcon name="sparkles" size={20} />
          </span>
          <div>
            <span className={styles.autoSectionMiniLabel}>สถานะการทำงานจริง (ESP32 Runtime)</span>
            <h3 className={styles.autoActivePresetTitle}>
              {presetName}
              <span className={styles.autoActiveStyleTag}>{styleLabel}</span>
            </h3>
          </div>
        </div>

        <span
          className={`${styles.homeAutoPhaseBadge} ${styles[`phase_${phaseDetails.tone}`]}`}
        >
          <span className={styles.phasePulseDot} />
          {phaseDetails.badgeLabel}
        </span>
      </div>

      <div className={styles.autoPhaseBanner}>
        <div className={styles.autoPhaseMain}>
          <div className={styles.autoPhaseText}>
            <h4>{phaseDetails.title}</h4>
            <p>{phaseDetails.description}</p>
          </div>

          {deviceAuto?.phase === "confirming" && (
            <div className={styles.autoConfirmProgress}>
              <div className={styles.autoConfirmTrack}>
                <div
                  className={styles.autoConfirmFill}
                  style={{
                    width: `${Math.min(
                      100,
                      ((deviceAuto.confirmationCount ?? 0) /
                        (deviceAuto.confirmationRequired || 3)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <small>
                {deviceAuto.confirmationCount ?? 0} /{" "}
                {deviceAuto.confirmationRequired ?? 3} ครั้ง
              </small>
            </div>
          )}

          {deviceAuto?.phase === "cooldown" && (
            <div className={styles.autoCooldownBox}>
              <span className={styles.cooldownSecNumber}>
                {deviceAuto.cooldownRemainingSeconds ?? 0}
              </span>
              <small>วินาที</small>
            </div>
          )}
        </div>
      </div>

      <div className={styles.autoMetricsGrid}>
        <div className={styles.autoMetricItem}>
          <span className={styles.autoMetricLabel}>เป้าหมายที่กำลังพิจารณา</span>
          <strong className={styles.autoMetricVal}>
            {targetPercent !== null ? `${Math.round(targetPercent)}%` : "—"}
          </strong>
        </div>

        <div className={styles.autoMetricItem}>
          <span className={styles.autoMetricLabel}>เหตุผลการตัดสินใจ</span>
          <strong className={styles.autoMetricReasonVal}>
            {reasonText || "—"}
          </strong>
        </div>

        <div className={styles.autoMetricItem}>
          <span className={styles.autoMetricLabel}>การควบคุมปัจจุบัน</span>
          <strong className={styles.autoMetricVal}>
            {deviceAuto?.commandActive ? "มอเตอร์กำลังหมุน" : "มอเตอร์หยุดนิ่ง"}
          </strong>
        </div>
      </div>

      {errorMsg && (
        <p className={styles.modeError} role="alert">
          {errorMsg}
        </p>
      )}

      <div className={styles.autoStatusActionsRow}>
        <button
          type="button"
          className={styles.autoStatusDisableBtn}
          onClick={handleDisableAuto}
          disabled={isDisabling}
        >
          {isDisabling ? "กำลังปิด..." : "ปิดระบบ Auto"}
        </button>

        <button
          type="button"
          className={styles.autoStatusStopBtn}
          onClick={() => onStop()}
        >
          <AppIcon name="stop" size={16} /> หยุดมอเตอร์ (STOP)
        </button>
      </div>
    </div>
  );
}
