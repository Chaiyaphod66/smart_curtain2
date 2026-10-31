"use client";

import { useState } from "react";
import Link from "next/link";
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

type HomeAutoCardProps = {
  device: ReturnType<typeof useDeviceStatus>;
};

export default function HomeAutoCard({ device }: HomeAutoCardProps) {
  const { selectedOptionId } = useUserAutoPresetChoice();
  const { responseStyle } = useAutoResponseStyle();
  const [isDisabling, setIsDisabling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const deviceAuto = device.status?.auto ?? null;
  const isAutoEnabled = device.isOnline && deviceAuto?.enabled === true;

  async function handleDisableAuto() {
    if (isDisabling) return;
    const confirmed = window.confirm(
      "ต้องการปิดระบบ Auto และเปลี่ยนกลับเป็นควบคุมแบบ Manual ใช่หรือไม่?",
    );
    if (!confirmed) return;

    setIsDisabling(true);
    setActionError(null);
    try {
      await disableContinuousAuto();
      await device.refreshStatus();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "ปิดระบบ Auto ไม่สำเร็จ",
      );
    } finally {
      setIsDisabling(false);
    }
  }

  if (!isAutoEnabled) {
    return (
      <section className={styles.homeAutoInviteCard}>
        <div className={styles.homeAutoInviteBody}>
          <div className={styles.homeAutoInviteIcon}>
            <AppIcon name="sparkles" size={24} />
          </div>
          <div className={styles.homeAutoInviteCopy}>
            <div className={styles.homeAutoInviteBadge}>
              <span>โหมดแนะนำ</span>
            </div>
            <h3>ระบบม่านอัตโนมัติ (Auto)</h3>
            <p>
              ให้ ESP32 ปรับระดับม่านตามอุณหภูมิและความสว่างในห้องโดยอัตโนมัติ
              ช่วยลดความร้อนและประหยัดพลังงาน
            </p>
          </div>
        </div>
        <div className={styles.homeAutoInviteActions}>
          <Link href="/control#auto" className={styles.homeAutoPrimaryBtn}>
            ไปเปิดใช้งาน Auto <AppIcon name="arrow" size={16} />
          </Link>
        </div>
      </section>
    );
  }

  const phaseDetails = getAutoPhaseDetails(deviceAuto?.phase, deviceAuto);
  const presetName = getAutoPresetDisplayName(
    deviceAuto?.presetId,
    selectedOptionId,
  );
  const styleLabel = getAutoResponseStyleLabel(
    deviceAuto?.responseStyle ?? responseStyle,
  );
  const reasonText = translateAutoReason(deviceAuto?.reason);

  const targetPercent =
    typeof deviceAuto?.candidateTargetPercent === "number"
      ? deviceAuto.candidateTargetPercent
      : typeof deviceAuto?.lastCommandTargetPercent === "number"
        ? deviceAuto.lastCommandTargetPercent
        : null;

  return (
    <section className={styles.homeAutoStatusCard} aria-live="polite">
      <div className={styles.homeAutoHeader}>
        <div className={styles.homeAutoTitleGroup}>
          <span className={styles.homeAutoSparkle}>
            <AppIcon name="sparkles" size={18} />
          </span>
          <div>
            <p className={styles.homeAutoSubtitle}>ระบบม่านอัตโนมัติ</p>
            <h3 className={styles.homeAutoPresetTitle}>
              {presetName}
              <span className={styles.homeAutoStyleTag}>{styleLabel}</span>
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

      <div className={styles.homeAutoContent}>
        <div className={styles.homeAutoPhaseInfo}>
          <strong>{phaseDetails.title}</strong>
          <p>{phaseDetails.description}</p>
        </div>

        {targetPercent !== null && (
          <div className={styles.homeAutoTargetBox}>
            <span className={styles.homeAutoTargetLabel}>
              {typeof deviceAuto?.candidateTargetPercent === "number"
                ? "เป้าหมายที่กำลังพิจารณา"
                : "เป้าหมายล่าสุด"}
            </span>
            <strong className={styles.homeAutoTargetVal}>
              {Math.round(targetPercent)}%
            </strong>
          </div>
        )}
      </div>

      {reasonText && (
        <div className={styles.homeAutoReasonRow}>
          <span className={styles.homeAutoReasonLabel}>สถานะการตัดสินใจ:</span>
          <span className={styles.homeAutoReasonText}>{reasonText}</span>
        </div>
      )}

      {actionError && (
        <p className={styles.modeError} role="alert">
          {actionError}
        </p>
      )}

      <div className={styles.homeAutoFooterActions}>
        <button
          type="button"
          className={styles.homeAutoDisableBtn}
          onClick={handleDisableAuto}
          disabled={isDisabling}
        >
          {isDisabling ? "กำลังปิด Auto..." : "ปิด Auto"}
        </button>
        <Link href="/control#auto" className={styles.homeAutoConfigLink}>
          ไปตั้งค่า Auto <AppIcon name="arrow" size={16} />
        </Link>
      </div>
    </section>
  );
}
