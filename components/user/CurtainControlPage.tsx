"use client";

import { useEffect, useState, type CSSProperties } from "react";
import useAutoResponseStyle from "@/hooks/useAutoResponseStyle";
import useCurtainControl from "@/hooks/useCurtainControl";
import useDeviceStatus from "@/hooks/useDeviceStatus";
import useUserAutoPresetChoice from "@/hooks/useUserAutoPresetChoice";
import useUserAutoPresetOverrides from "@/hooks/useUserAutoPresetOverrides";
import CurtainActionHistoryPanel from "@/components/dashboard/CurtainActionHistoryPanel";
import {
  configureModelAOnDevice,
  disableContinuousAuto,
  enableContinuousAuto,
  getAutoPresetRevision,
  saveAutoConfiguration,
} from "@/lib/curtain/esp32-curtain-client";
import {
  findUserAutoPresetOption,
  USER_AUTO_PRESET_FAMILIES,
  type UserAutoPresetOption,
} from "@/lib/curtain/user-auto-presets";
import type { VoiceCommand } from "@/lib/curtain/voice-command";
import AppIcon from "./AppIcon";
import AutoModePicker from "./AutoModePicker";
import AutoRuntimeStatusBar from "./AutoRuntimeStatusBar";
import AutoRuntimeStatusCard from "./AutoRuntimeStatusCard";
import CurtainScene from "./CurtainScene";
import UserCalibrationCard from "./UserCalibrationCard";
import VoiceCommandPanel from "./VoiceCommandPanel";
import styles from "./UserPages.module.css";

const presetPositions = [0, 25, 50, 75, 100];

export default function CurtainControlPage() {
  const device = useDeviceStatus();
  const { selectedOptionId, selectOption } = useUserAutoPresetChoice();
  const { presetOverrides } = useUserAutoPresetOverrides();
  const { responseStyle } = useAutoResponseStyle();
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "automatic">("manual");
  const [modeMessage, setModeMessage] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        window.location.hash === "#auto" ||
        window.location.search.includes("mode=auto")
      ) {
        setActiveTab("automatic");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selectedOption =
    findUserAutoPresetOption(selectedOptionId) ??
    USER_AUTO_PRESET_FAMILIES[2].options[1];
  const selectedPresetOverride = presetOverrides[selectedOption.id];
  const selectedPreset = {
    ...(selectedPresetOverride ?? selectedOption.preset),
    responseStyle,
  };
  const deviceAuto = device.status?.auto ?? null;
  const isAutoEnabled = deviceAuto?.enabled === true;
  const lastStopReason = device.status?.motor.lastStopReason ?? null;

  useEffect(() => {
    if (
      isAutoEnabled ||
      (lastStopReason !== "network-lost" &&
        lastStopReason !== "restart-manual")
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveTab("manual");
      setModeError(null);
      setModeMessage(
        lastStopReason === "network-lost"
          ? "ESP32 เคยหลุด Wi-Fi ระบบหยุดมอเตอร์และกลับ Manual แล้ว กรุณาตรวจสอบก่อนเปิด Auto ใหม่"
          : "ESP32 เริ่มทำงานใหม่ในโหมด Manual เพื่อความปลอดภัย",
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAutoEnabled, lastStopReason]);

  const isPresetSynced =
    deviceAuto?.configured === true &&
    deviceAuto.presetId === selectedPreset.id &&
    deviceAuto.configRevision === getAutoPresetRevision(selectedPreset);
  const encoderPosition =
    device.isOnline &&
    device.status?.encoder.calibrated &&
    typeof device.status.encoder.positionPercent === "number"
      ? device.status.encoder.positionPercent
      : null;
  const control = useCurtainControl({
    actualPositionPercent: encoderPosition,
    encoderCount:
      typeof device.status?.encoder.count === "number"
        ? device.status.encoder.count
        : null,
    isMotorRunning: device.status?.motor.state === "running",
    motorFault: device.status?.motor.fault ?? null,
    statusSampleId: device.status?.uptimeMs ?? null,
    refreshDeviceStatus: device.refreshStatus,
  });
  const encoderDetected = device.status?.encoder.pulseDetected ?? false;
  const encoderCalibrated = device.status?.encoder.calibrated ?? false;
  const positionSupported = device.status?.motor.positionControlAvailable === true;
  const positionReady =
    device.isOnline && encoderPosition !== null && positionSupported;
  const modelASensorsReady =
    device.status?.sensors.dht22 === true &&
    device.status?.sensors.bh1750 === true;
  const hasKnownPosition = encoderPosition !== null;
  const controlsBusy =
    control.isSendingCommand || control.isMoving || isChangingMode;
  const isAutomaticModeSelected = activeTab === "automatic";
  const limits = device.status?.limits;
  const limitSafetyBlocked =
    limits?.safetyEnabled !== true || limits.conflict;
  const hardwareSafetyBlocked =
    limitSafetyBlocked || device.status?.motor.fault != null;
  const manualControlsLocked =
    controlsBusy || isAutoEnabled || isAutomaticModeSelected || limitSafetyBlocked;
  const closeJogLocked =
    manualControlsLocked ||
    limits?.closed.active === true ||
    (positionReady && control.positionPercent <= 0);
  const openJogLocked =
    manualControlsLocked ||
    limits?.open.active === true ||
    (positionReady && control.positionPercent >= 100);

  const helperText = isAutoEnabled
    ? "Auto กำลังทำงาน ระบบจึงล็อกการควบคุม Manual เพื่อความปลอดภัย (กด 'ปิด Auto' เพื่อควบคุมเอง)"
    : isAutomaticModeSelected
      ? "อยู่ในแท็บ Auto กรุณาสลับไปแท็บ Manual ก่อนเลื่อนม่านเอง"
      : positionReady
        ? "เลือกตำแหน่งที่ต้องการ แล้วกดปุ่มยืนยัน"
        : encoderCalibrated && !positionSupported
          ? "Firmware ปัจจุบันยังไม่รองรับการสั่งตำแหน่ง"
          : encoderDetected
            ? "ตรวจพบ Encoder แล้ว กรุณาตั้งจุดปิดและจุดเปิดในส่วนการตั้งระยะม่านด้านบน"
            : "ยังไม่พบ Encoder จึงใช้ได้เฉพาะปุ่มขยับทีละครั้ง";

  async function handleVoiceCommand(command: VoiceCommand): Promise<string> {
    switch (command.type) {
      case "stop":
        await control.stopCurtain();
        return "ส่งคำสั่ง STOP แล้ว";

      case "manual-mode": {
        const ok = await selectManualMode();
        return ok
          ? "เปลี่ยนเป็น Manual แล้ว"
          : "เปลี่ยนเป็น Manual ไม่สำเร็จ";
      }

      case "position": {
        const requestedDirection = Math.sign(
          command.percent - control.positionPercent,
        );
        const movingTowardActiveLimit =
          (requestedDirection < 0 && limits?.closed.active === true) ||
          (requestedDirection > 0 && limits?.open.active === true);

        if (
          !positionReady ||
          manualControlsLocked ||
          hardwareSafetyBlocked ||
          movingTowardActiveLimit
        ) {
          throw new Error("ยังสั่งตำแหน่งไม่ได้ กรุณาตรวจสอบโหมดและสถานะความปลอดภัย");
        }
        const ok = await control.moveCurtainToPosition(command.percent);
        return ok
          ? `สั่งม่านไปที่ ${command.percent}% แล้ว`
          : "สั่งตำแหน่งม่านไม่สำเร็จ";
      }

      case "auto-preset": {
        const option = findUserAutoPresetOption(command.optionId);

        if (!option) {
          throw new Error("ไม่พบพรีเซ็ตที่ต้องการ");
        }

        const optionOverride = presetOverrides[option.id];
        const effectiveOption = optionOverride
          ? { ...option, preset: optionOverride }
          : option;
        const ok = await activateSelectedAutoPreset(effectiveOption, false);
        return ok
          ? `เปิด Auto ด้วย "${option.name}" แล้ว`
          : "เปิด Auto ไม่สำเร็จหรือระบบยังไม่พร้อม";
      }

      case "model-a": {
        const ok = await activateModelA(false);
        return ok
          ? "เปิด Auto แบบ Model A แล้ว"
          : "เปิด Model A ไม่สำเร็จหรือระบบยังไม่พร้อม";
      }
    }
  }

  async function selectManualMode(): Promise<boolean> {
    setActiveTab("manual");
    setModeError(null);

    if (!isAutoEnabled) {
      setModeMessage("อยู่ในโหมด Manual");
      return true;
    }

    setIsChangingMode(true);
    setModeMessage("กำลังปิด Auto เพื่อเปลี่ยนเป็น Manual...");

    try {
      await disableContinuousAuto();
      setModeMessage("ปิด Auto และเปลี่ยนเป็น Manual แล้ว");
      return true;
    } catch (error) {
      setModeMessage(null);
      setModeError(
        error instanceof Error
          ? error.message
          : "เปลี่ยนเป็น Manual ไม่สำเร็จ",
      );
      return false;
    } finally {
      setIsChangingMode(false);
      device.refreshStatus();
    }
  }

  function handleSelectManualTab() {
    setActiveTab("manual");
    setModeError(null);
    if (isAutoEnabled) {
      setModeMessage("ดูโหมด Manual (Auto กำลังทำงานในพื้นหลัง)");
    } else {
      setModeMessage("อยู่ในโหมด Manual");
    }
  }

  function handleSelectAutomaticTab() {
    setActiveTab("automatic");
    setModeError(null);
    setModeMessage(
      isAutoEnabled
        ? "Auto กำลังทำงาน ตรวจสอบสถานะจริงหรือเปลี่ยนพรีเซ็ตได้"
        : "เลือกพรีเซ็ตหรือ Model A แล้วกดเริ่มใช้งาน Auto",
    );
  }

  async function activateSelectedAutoPreset(
    option: UserAutoPresetOption = selectedOption,
    requireConfirmation = true,
  ): Promise<boolean> {
    const preset = {
      ...option.preset,
      responseStyle,
    };
    const optionIsSynced =
      deviceAuto?.configured === true &&
      deviceAuto.presetId === preset.id &&
      deviceAuto.configRevision === getAutoPresetRevision(preset);

    if (
      isChangingMode ||
      controlsBusy ||
      hardwareSafetyBlocked ||
      !positionReady ||
      (isAutoEnabled && optionIsSynced)
    ) {
      return false;
    }

    if (requireConfirmation) {
      const confirmed = window.confirm(
        `ใช้ Auto ด้วยชุด “${preset.name}” แบบ${responseStyle === "gentle" ? "นุ่มนวล" : "มาตรฐาน"} ใช่หรือไม่?\n\nESP32 จะควบคุมม่านต่อเองแม้ปิดหน้าเว็บ โปรดเฝ้าดูการทำงานครั้งแรกและเตรียมกด STOP`,
      );

      if (!confirmed) return false;
    }

    setIsChangingMode(true);
    setModeError(null);
    setModeMessage(
      optionIsSynced
        ? "กำลังเปิด Auto..."
        : "กำลังซิงก์ชุดที่เลือกและเปิด Auto...",
    );

    try {
      if (!optionIsSynced) {
        await saveAutoConfiguration(preset);
      }
      await enableContinuousAuto();
      selectOption(option.id);
      setActiveTab("automatic");
      setModeMessage(
        `เปิด Auto ด้วยชุด “${preset.name}” แบบ${responseStyle === "gentle" ? "นุ่มนวล" : "มาตรฐาน"}แล้ว`,
      );
      return true;
    } catch (error) {
      setModeMessage(null);
      setModeError(
        error instanceof Error
          ? error.message
          : "เปิด Auto ไม่สำเร็จ",
      );
      return false;
    } finally {
      setIsChangingMode(false);
      device.refreshStatus();
    }
  }

  async function activateModelA(requireConfirmation = true): Promise<boolean> {
    if (
      isChangingMode ||
      controlsBusy ||
      hardwareSafetyBlocked ||
      !positionReady ||
      !modelASensorsReady ||
      (isAutoEnabled && deviceAuto?.presetId === "model-a")
    ) {
      return false;
    }

    if (requireConfirmation) {
      const confirmed = window.confirm(
        "เปิด Model A ฉบับเต็มบน ESP32 ใช่หรือไม่?\n\nระบบจะใช้แสงและอุณหภูมิ ยืนยัน 2 รอบ ขยับทีละ Step และทำงานต่อแม้ปิดเว็บ หากมี Auto เดิมอยู่ ระบบจะเปลี่ยนมาใช้ Model A โปรดเฝ้าการทำงานครั้งแรกและเตรียม STOP",
      );
      if (!confirmed) return false;
    }

    setIsChangingMode(true);
    setModeError(null);
    setModeMessage("กำลังบันทึก Model A ลง ESP32...");
    let modelAConfigured = false;

    try {
      await configureModelAOnDevice();
      modelAConfigured = true;
      setModeMessage("กำลังเปิด Model A บน ESP32...");
      await enableContinuousAuto();
      setActiveTab("automatic");
      setModeMessage("Model A ฉบับเต็มทำงานบน ESP32 แล้ว แม้ปิดหน้าเว็บ");
      return true;
    } catch (error) {
      setModeMessage(null);
      const message = error instanceof Error ? error.message : "เปิด Model A ไม่สำเร็จ";
      setModeError(
        modelAConfigured
          ? `บันทึก Model A แล้ว แต่ยังเปิด Auto ไม่สำเร็จ: ${message} (Auto เดิมถูกปิด)`
          : message,
      );
      return false;
    } finally {
      setIsChangingMode(false);
      device.refreshStatus();
    }
  }

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntro}>
        <div>
          <p className={styles.eyebrow}>ม่านห้องหลัก</p>
          <h1>ควบคุมม่าน</h1>
          <p>เลือกตำแหน่งหรือขยับม่านทีละช่วงได้จากหน้านี้</p>
        </div>
        <div className={`${styles.connectionPill} ${device.isOnline ? styles.online : styles.offline}`}>
          <span />
          {device.isOnline ? "พร้อมควบคุม" : "ยังไม่เชื่อมต่อ"}
        </div>
      </section>

      <UserCalibrationCard
        deviceStatus={device}
        manualControlsLocked={manualControlsLocked}
        onStop={control.stopCurtain}
      />

      <section
        className={styles.operatingModeCard}
        aria-labelledby="operating-mode-title"
      >
        <div className={styles.operatingModeHeading}>
          <div>
            <p className={styles.sectionLabel}>โหมดการทำงาน</p>
            <h2 id="operating-mode-title">เลือก Manual หรือ Auto</h2>
          </div>
          <span
            className={
              isAutoEnabled
                ? styles.modeStatusAuto
                : styles.modeStatusManual
            }
          >
            {isAutoEnabled ? "AUTO" : "MANUAL"}
          </span>
        </div>

        <div className={styles.modeSwitch} role="group" aria-label="โหมดการทำงาน">
          <button
            type="button"
            className={
              activeTab === "manual"
                ? styles.modeActive
                : undefined
            }
            aria-pressed={activeTab === "manual"}
            disabled={!device.isOnline || isChangingMode}
            onClick={handleSelectManualTab}
          >
            <strong>Manual</strong>
            <span>ควบคุมม่านด้วยตัวเอง</span>
          </button>

          <button
            type="button"
            className={
              activeTab === "automatic"
                ? styles.modeActive
                : undefined
            }
            aria-pressed={activeTab === "automatic"}
            disabled={!device.isOnline || isChangingMode}
            onClick={handleSelectAutomaticTab}
          >
            <strong>Auto</strong>
            <span>ให้ ESP32 ดูแลตามเซ็นเซอร์</span>
          </button>
        </div>

        <p className={styles.modeSafetyNote}>
          {isChangingMode
            ? "กำลังติดต่อ ESP32..."
            : isAutoEnabled
              ? "Auto กำลังทำงานใน ESP32 ปุ่ม Manual ด้านล่างถูกล็อก แต่ STOP ยังใช้งานได้"
              : activeTab === "automatic"
                ? "เลือกพรีเซ็ตด้านล่าง แล้วกดใช้ชุดนี้เพื่อเริ่มทำงานอัตโนมัติ"
                : "Manual ทำงานอยู่ คุณสามารถเลื่อนม่านหรือสลับไปดู Auto ได้ตลอดเวลา"}
        </p>

        {(modeMessage || modeError) && (
          <p
            className={modeError ? styles.modeError : styles.modeMessage}
            role={modeError ? "alert" : "status"}
          >
            {modeError ?? modeMessage}
          </p>
        )}
      </section>

      {activeTab === "manual" && (
        <>
          <AutoRuntimeStatusBar
            device={device}
            onSwitchToAutoTab={() => {
              setActiveTab("automatic");
              if (typeof window !== "undefined") {
                window.location.hash = "auto";
              }
            }}
          />

          <VoiceCommandPanel
            isOnline={device.isOnline}
            isBusy={controlsBusy}
            onExecute={handleVoiceCommand}
          />
        </>
      )}

      {activeTab === "automatic" && (
        <>
          <AutoRuntimeStatusCard
            device={device}
            onStop={control.stopCurtain}
          />

          <AutoModePicker
            isAutoEnabled={isAutoEnabled}
            activePresetId={deviceAuto?.presetId ?? null}
            isPresetSynced={isPresetSynced}
            isBusy={isChangingMode}
            modelASensorsReady={modelASensorsReady}
            canActivate={
              device.isOnline &&
              positionReady &&
              !controlsBusy &&
              !hardwareSafetyBlocked
            }
            onActivate={activateSelectedAutoPreset}
            onActivateModelA={activateModelA}
          />
        </>
      )}

      <section className={styles.controlLayout}>
        <div className={styles.controlVisualCard}>
          <div className={styles.positionHeading}>
            <div>
              <p>ตำแหน่งปัจจุบัน</p>
              <strong>
                {hasKnownPosition
                  ? `${Math.round(control.positionPercent)}%`
                  : "—"}
              </strong>
            </div>
            <span className={control.isMoving ? styles.movingBadge : styles.stillBadge}>
              {control.isMoving ? "กำลังเคลื่อนที่" : "หยุดนิ่ง"}
            </span>
          </div>
          <CurtainScene
            positionPercent={
              hasKnownPosition ? control.positionPercent : null
            }
          />
        </div>

        <div className={styles.controlCard}>
          <div className={styles.controlHeading}>
            <p className={styles.sectionLabel}>ตำแหน่งเป้าหมาย</p>
            <strong>{Math.round(control.targetPercent)}%</strong>
          </div>

          <label className={styles.sliderLabel}>
            <span className={styles.srOnly}>เลือกตำแหน่งม่าน</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={control.targetPercent}
              disabled={!positionReady || manualControlsLocked}
              onChange={(event) => control.selectTargetPercent(Number(event.target.value))}
              style={{ "--range-progress": `${control.targetPercent}%` } as CSSProperties}
            />
            <span className={styles.rangeLabels}><span>ปิด</span><span>เปิด</span></span>
          </label>

          <div className={styles.presets} aria-label="ตำแหน่งแนะนำ">
            {presetPositions.map((position) => (
              <button
                type="button"
                key={position}
                className={Math.round(control.targetPercent) === position ? styles.selectedPreset : undefined}
                disabled={!positionReady || manualControlsLocked}
                onClick={() => control.selectTargetPercent(position)}
              >
                {position}%
              </button>
            ))}
          </div>

          <p className={styles.helperText}>{helperText}</p>

          <button
            className={styles.primaryButton}
            type="button"
            onClick={control.moveCurtainToTarget}
            disabled={
              !positionReady ||
              manualControlsLocked ||
              Math.abs(control.targetPercent - control.positionPercent) < 0.5
            }
          >
            {control.isSendingCommand ? "กำลังส่งคำสั่ง..." : "เลื่อนไปตำแหน่งนี้"}
          </button>

          <div className={styles.jogSection}>
            <div>
              <h2>ขยับทีละครั้ง</h2>
              <p>ใช้เมื่อต้องการปรับม่านเล็กน้อย</p>
            </div>
            <div className={styles.jogButtons}>
              <button
                type="button"
                onClick={control.closeCurtain}
                disabled={!device.isOnline || closeJogLocked}
              >
                ขยับปิด
              </button>
              <button
                type="button"
                onClick={control.openCurtain}
                disabled={!device.isOnline || openJogLocked}
              >
                ขยับเปิด
              </button>
            </div>
          </div>

          <button
            className={styles.stopButton}
            type="button"
            onClick={control.stopCurtain}
            disabled={!device.isOnline}
          >
            <AppIcon name="stop" size={16} /> หยุดมอเตอร์
          </button>

          {control.commandError && (
            <p className={styles.alert} role="alert">
              {control.commandError}
            </p>
          )}
        </div>
      </section>

      <details className={styles.historyDetails}>
        <summary>ดูประวัติการเคลื่อนที่</summary>
        <CurtainActionHistoryPanel
          history={control.actionHistory}
          onClear={control.clearActionHistory}
        />
      </details>
    </div>
  );
}
