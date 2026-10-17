"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_AUTO_PRESETS,
  evaluateAutoPreset,
  getAutoPresetValidationErrors,
} from "@/lib/curtain/auto-preset";
import useAutoRuntime from "@/hooks/useAutoRuntime";
import type {
  AutoPreset,
  AutoPresetId,
} from "@/types/auto-preset";
import type { AutoRuntimePhase } from "@/types/auto-runtime";
import type { SensorReading } from "@/types/sensor";
import styles from "./AutoPresetPanel.module.css";

type AutoPresetPanelProps = {
  reading: SensorReading | null;
  source: "mock" | "esp32" | null;
  isDeviceOnline: boolean;
  currentPositionPercent: number | null;
  isPositionControlReady: boolean;
  isMotorRunning: boolean;
  isSendingCommand: boolean;
  motorFault: string | null;
  limitConflict: boolean;
  limitSafetyEnabled: boolean;
  commandError: string | null;
  onTestMove: (targetPercent: number) => Promise<boolean>;
  onEmergencyStop: () => void | Promise<void>;
};

const actionLabels = {
  open: "เสนอให้เปิดม่าน",
  close: "เสนอให้ปิดม่าน",
  adjust: "ปรับม่านตามช่วงแสง",
  hold: "คงตำแหน่งเดิม",
  waiting: "ยังไม่สร้างคำสั่ง",
} as const;

const runtimePhaseLabels: Record<AutoRuntimePhase, string> = {
  waiting: "รอผลตัดสิน",
  confirming: "กำลังยืนยัน",
  ready: "พร้อมทดสอบ",
  commanding: "กำลังส่งคำสั่ง",
  moving: "มอเตอร์กำลังทำงาน",
  cooldown: "กำลังพัก",
  fault: "หยุดเพราะผิดปกติ",
};

const MAX_SINGLE_TEST_TRAVEL_PERCENT = 10;

function clonePreset(preset: AutoPreset): AutoPreset {
  return {
    ...preset,
    temperature: { ...preset.temperature },
    light: {
      ...preset.light,
      ranges: preset.light.ranges.map((range) => ({ ...range })),
    },
  };
}

function createInitialPresets(): AutoPreset[] {
  return DEFAULT_AUTO_PRESETS.map(clonePreset);
}

export default function AutoPresetPanel({
  reading,
  source,
  isDeviceOnline,
  currentPositionPercent,
  isPositionControlReady,
  isMotorRunning,
  isSendingCommand,
  motorFault,
  limitConflict,
  limitSafetyEnabled,
  commandError,
  onTestMove,
  onEmergencyStop,
}: AutoPresetPanelProps) {
  const [presets, setPresets] = useState(createInitialPresets);
  const [selectedId, setSelectedId] =
    useState<AutoPresetId>("balanced");
  const [armedDecisionKey, setArmedDecisionKey] = useState<
    string | null
  >(null);
  const [motorTestMessage, setMotorTestMessage] = useState<
    string | null
  >(null);

  const selectedPreset =
    presets.find((preset) => preset.id === selectedId) ?? presets[0];

  const decision = useMemo(
    () => evaluateAutoPreset(selectedPreset, reading),
    [reading, selectedPreset],
  );
  const validationErrors = useMemo(
    () => getAutoPresetValidationErrors(selectedPreset),
    [selectedPreset],
  );
  const decisionKey = `${selectedId}:${decision.action}:${decision.targetPercent ?? "none"}`;
  const safetyConfirmed = armedDecisionKey === decisionKey;
  const isActionableDecision =
    decision.targetPercent !== null &&
    (decision.action === "open" ||
      decision.action === "close" ||
      decision.action === "adjust");
  const runtimeCanObserve =
    source === "mock" || (source === "esp32" && isDeviceOnline);
  const autoRuntime = useAutoRuntime({
    sampleId: reading?.recordedAt ?? null,
    candidateKey:
      validationErrors.length === 0 &&
      isActionableDecision &&
      runtimeCanObserve
        ? decisionKey
        : null,
    targetPercent:
      validationErrors.length === 0 &&
      isActionableDecision &&
      runtimeCanObserve
        ? decision.targetPercent
        : null,
    confirmationReadings: selectedPreset.confirmationReadings,
    cooldownSeconds: selectedPreset.cooldownSeconds,
    isMotorRunning,
    currentPositionPercent,
  });
  const motorTestBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (source !== "esp32") {
      blockers.push("ต้องใช้ข้อมูลเซ็นเซอร์จริงจาก ESP32");
    }

    if (!isDeviceOnline) {
      blockers.push("ESP32 ยังออฟไลน์");
    }

    if (!limitSafetyEnabled) {
      blockers.push("ระบบหยุดด้วยลิมิตยังไม่พร้อม");
    }

    if (limitConflict) {
      blockers.push("ลิมิตเปิดสุดและปิดสุดทำงานพร้อมกัน");
    }

    if (!isPositionControlReady) {
      blockers.push("ต้องคาลิเบรต Encoder ก่อน");
    }

    if (motorFault) {
      blockers.push(`พบ Motor fault: ${motorFault}`);
    }

    if (isMotorRunning) {
      blockers.push("มอเตอร์กำลังเคลื่อนที่");
    }

    if (isSendingCommand) {
      blockers.push("กำลังส่งคำสั่งก่อนหน้า");
    }

    if (
      decision.action !== "open" &&
      decision.action !== "close" &&
      decision.action !== "adjust"
    ) {
      blockers.push("Auto ยังไม่มีตำแหน่งเป้าหมายให้ม่าน");
    }

    if (isActionableDecision && !autoRuntime.isReady) {
      if (autoRuntime.phase === "cooldown") {
        blockers.push(
          `Auto กำลังพักอีก ${autoRuntime.cooldownRemainingSeconds} วินาที`,
        );
      } else if (
        autoRuntime.phase === "commanding" ||
        autoRuntime.phase === "moving"
      ) {
        blockers.push("Auto กำลังติดตามคำสั่งก่อนหน้า");
      } else if (autoRuntime.phase === "fault") {
        blockers.push(
          autoRuntime.faultMessage ?? "Auto Runtime พบความผิดปกติ",
        );
      } else {
        blockers.push(
          `รอผลเดิมให้ครบ ${autoRuntime.confirmationCount}/${selectedPreset.confirmationReadings} ครั้ง`,
        );
      }
    }

    if (
      currentPositionPercent !== null &&
      decision.targetPercent !== null &&
      Math.abs(
        currentPositionPercent - decision.targetPercent,
      ) < 1
    ) {
      blockers.push("ม่านอยู่ที่ตำแหน่งเป้าหมายแล้ว");
    }

    if (
      currentPositionPercent !== null &&
      decision.targetPercent !== null &&
      Math.abs(
        currentPositionPercent - decision.targetPercent,
      ) > MAX_SINGLE_TEST_TRAVEL_PERCENT
    ) {
      blockers.push(
        `โหมดทดสอบอนุญาตให้ขยับไม่เกิน ${MAX_SINGLE_TEST_TRAVEL_PERCENT}% ต่อครั้ง`,
      );
    }

    return blockers;
  }, [
    source,
    isDeviceOnline,
    limitSafetyEnabled,
    limitConflict,
    isPositionControlReady,
    motorFault,
    isMotorRunning,
    isSendingCommand,
    decision.action,
    decision.targetPercent,
    currentPositionPercent,
    isActionableDecision,
    autoRuntime.isReady,
    autoRuntime.phase,
    autoRuntime.cooldownRemainingSeconds,
    autoRuntime.faultMessage,
    autoRuntime.confirmationCount,
    selectedPreset.confirmationReadings,
  ]);

  async function testDecisionWithMotor() {
    if (
      !safetyConfirmed ||
      motorTestBlockers.length > 0 ||
      decision.targetPercent === null
    ) {
      return;
    }

    const confirmed = window.confirm(
      `ทดสอบ Auto จริง: ให้ม่านไปที่ ${decision.targetPercent}% ใช่หรือไม่?\n\nโปรดเฝ้ามอเตอร์และเตรียมกด STOP`,
    );

    if (!confirmed) {
      return;
    }

    setMotorTestMessage(
      `กำลังส่งคำสั่งไปที่ ${decision.targetPercent}%...`,
    );
    autoRuntime.startCommand(decision.targetPercent);
    const successful = await onTestMove(decision.targetPercent);
    if (!successful) {
      autoRuntime.commandFailed("ส่งคำสั่งทดสอบไปยัง ESP32 ไม่สำเร็จ");
    }
    setMotorTestMessage(
      successful
        ? `ESP32 รับคำสั่ง ${decision.targetPercent}% แล้ว กำลังติดตามผล`
        : "ส่งคำสั่งทดสอบไม่สำเร็จ",
    );
    setArmedDecisionKey(null);
  }

  async function emergencyStop() {
    setMotorTestMessage("กำลังส่งคำสั่ง STOP...");
    await onEmergencyStop();
    autoRuntime.commandStopped();
    setMotorTestMessage("ส่งคำสั่ง STOP แล้ว");
    setArmedDecisionKey(null);
  }

  function updateSelectedPreset(
    update: (preset: AutoPreset) => AutoPreset,
  ) {
    setPresets((current) =>
      current.map((preset) =>
        preset.id === selectedId ? update(preset) : preset,
      ),
    );
  }

  function updateTemperatureThreshold(
    field:
      | "closeAtOrAboveCelsius"
      | "reopenAtOrBelowCelsius",
    value: number,
  ) {
    updateSelectedPreset((preset) => ({
      ...preset,
      temperature: {
        ...preset.temperature,
        [field]: value,
      },
    }));
  }

  function updateLightBoundary(index: number, value: number) {
    updateSelectedPreset((preset) => ({
      ...preset,
      light: {
        ...preset.light,
        ranges: preset.light.ranges.map((range, rangeIndex) => {
          if (rangeIndex === index) {
            return { ...range, maxLux: value };
          }

          if (rangeIndex === index + 1) {
            return { ...range, minLux: value };
          }

          return range;
        }),
      },
    }));
  }

  function updateLightTarget(index: number, value: number) {
    updateSelectedPreset((preset) => ({
      ...preset,
      light: {
        ...preset.light,
        ranges: preset.light.ranges.map((range, rangeIndex) =>
          rangeIndex === index
            ? { ...range, targetPercent: value }
            : range,
        ),
      },
    }));
  }

  function addLightRange() {
    updateSelectedPreset((preset) => {
      const ranges = preset.light.ranges.map((range) => ({
        ...range,
      }));

      if (ranges.length >= 5) {
        return preset;
      }

      const lastIndex = ranges.length - 1;
      const lastRange = ranges[lastIndex];
      const previousRange = ranges[lastIndex - 1];

      if (!lastRange) {
        return preset;
      }

      const previousWidth =
        previousRange?.maxLux === null || !previousRange
          ? 300
          : Math.max(
              50,
              previousRange.maxLux - previousRange.minLux,
            );
      const splitAt = Math.round(lastRange.minLux + previousWidth);
      const finalTarget = lastRange.targetPercent;
      const intermediateTarget = Math.round(
        ((previousRange?.targetPercent ?? finalTarget) +
          finalTarget) /
          2,
      );

      ranges[lastIndex] = {
        ...lastRange,
        maxLux: splitAt,
        targetPercent: intermediateTarget,
      };
      ranges.push({
        minLux: splitAt,
        maxLux: null,
        targetPercent: finalTarget,
      });

      return {
        ...preset,
        light: { ...preset.light, ranges },
      };
    });
  }

  function removeLightRange(index: number) {
    updateSelectedPreset((preset) => {
      const ranges = preset.light.ranges.map((range) => ({
        ...range,
      }));

      if (ranges.length <= 2 || !ranges[index]) {
        return preset;
      }

      if (index === 0) {
        ranges[1] = { ...ranges[1], minLux: 0 };
      } else if (index === ranges.length - 1) {
        ranges[index - 1] = {
          ...ranges[index - 1],
          maxLux: null,
        };
      } else {
        ranges[index + 1] = {
          ...ranges[index + 1],
          minLux: ranges[index].minLux,
        };
      }

      ranges.splice(index, 1);

      return {
        ...preset,
        light: { ...preset.light, ranges },
      };
    });
  }

  function resetSelectedPreset() {
    const original = DEFAULT_AUTO_PRESETS.find(
      (preset) => preset.id === selectedId,
    );

    if (!original) {
      return;
    }

    updateSelectedPreset(() => clonePreset(original));
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="auto-preset-title"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>AUTO PRESET LAB</p>
          <h2 id="auto-preset-title">ออกแบบโหมดอัตโนมัติ</h2>
          <p>
            เลือกแนวทางแล้วปรับเกณฑ์ให้ตรงกับผู้ใช้แต่ละคน
          </p>
        </div>
        <span className={styles.previewBadge}>Preview เท่านั้น</span>
      </div>

      <div className={styles.presetGrid} aria-label="เลือก Preset">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={
              preset.id === selectedId
                ? styles.presetActive
                : styles.presetButton
            }
            aria-pressed={preset.id === selectedId}
            onClick={() => setSelectedId(preset.id)}
          >
            <strong>{preset.name}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
      </div>

      <div className={styles.workspace}>
        <div className={styles.editor}>
          <div className={styles.editorHeading}>
            <div>
              <span>กำลังแก้ไข</span>
              <strong>{selectedPreset.name}</strong>
            </div>
            <button type="button" onClick={resetSelectedPreset}>
              คืนค่าเริ่มต้น
            </button>
          </div>

          <fieldset className={styles.ruleCard}>
            <legend>
              <label>
                <input
                  type="checkbox"
                  checked={selectedPreset.temperature.enabled}
                  onChange={(event) =>
                    updateSelectedPreset((preset) => ({
                      ...preset,
                      temperature: {
                        ...preset.temperature,
                        enabled: event.target.checked,
                      },
                    }))
                  }
                />
                ใช้อุณหภูมิ
              </label>
            </legend>

            <div className={styles.inputGrid}>
              <label>
                ปิดเมื่ออุณหภูมิตั้งแต่
                <span className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={
                      selectedPreset.temperature
                        .closeAtOrAboveCelsius
                    }
                    disabled={!selectedPreset.temperature.enabled}
                    onChange={(event) =>
                      updateTemperatureThreshold(
                        "closeAtOrAboveCelsius",
                        Number(event.target.value),
                      )
                    }
                  />
                  <span>°C</span>
                </span>
              </label>

              <label>
                เปิดกลับเมื่อไม่เกิน
                <span className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={
                      selectedPreset.temperature
                        .reopenAtOrBelowCelsius
                    }
                    disabled={!selectedPreset.temperature.enabled}
                    onChange={(event) =>
                      updateTemperatureThreshold(
                        "reopenAtOrBelowCelsius",
                        Number(event.target.value),
                      )
                    }
                  />
                  <span>°C</span>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.ruleCard}>
            <legend>
              <label>
                <input
                  type="checkbox"
                  checked={selectedPreset.light.enabled}
                  onChange={(event) =>
                    updateSelectedPreset((preset) => ({
                      ...preset,
                      light: {
                        ...preset.light,
                        enabled: event.target.checked,
                      },
                    }))
                  }
                />
                ใช้ความเข้มแสง
              </label>
            </legend>

            <div className={styles.rangeEditor}>
              <div className={styles.rangeEditorHeading}>
                <p>
                  แบ่งได้ 2–5 ช่วง · แสงมากขึ้นต้องไม่เปิดม่านเพิ่ม
                </p>
                <button
                  type="button"
                  disabled={
                    !selectedPreset.light.enabled ||
                    selectedPreset.light.ranges.length >= 5
                  }
                  onClick={addLightRange}
                >
                  + เพิ่มช่วง
                </button>
              </div>

              <div className={styles.rangeList}>
                {selectedPreset.light.ranges.map((range, index) => (
                  <div className={styles.rangeRow} key={index}>
                    <span className={styles.rangeNumber}>
                      {index + 1}
                    </span>

                    <div className={styles.rangeBody}>
                      <div className={styles.rangeFields}>
                        <label>
                          เริ่มที่
                          <span className={styles.inputWithUnit}>
                            <input
                              type="number"
                              value={range.minLux}
                              readOnly
                              disabled={!selectedPreset.light.enabled}
                              aria-label={`ค่าเริ่มต้นช่วงแสงที่ ${index + 1}`}
                            />
                            <span>lux</span>
                          </span>
                        </label>

                        {range.maxLux === null ? (
                          <div className={styles.openEndedRange}>
                            <span>สิ้นสุด</span>
                            <strong>ขึ้นไปทั้งหมด</strong>
                          </div>
                        ) : (
                          <label>
                            น้อยกว่า
                            <span className={styles.inputWithUnit}>
                              <input
                                type="number"
                                min={range.minLux + 1}
                                max="100000"
                                step="50"
                                value={range.maxLux}
                                disabled={!selectedPreset.light.enabled}
                                onChange={(event) =>
                                  updateLightBoundary(
                                    index,
                                    Number(event.target.value),
                                  )
                                }
                              />
                              <span>lux</span>
                            </span>
                          </label>
                        )}

                        <label>
                          ตำแหน่งม่าน
                          <span className={styles.inputWithUnit}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={range.targetPercent}
                              disabled={!selectedPreset.light.enabled}
                              onChange={(event) =>
                                updateLightTarget(
                                  index,
                                  Number(event.target.value),
                                )
                              }
                            />
                            <span>%</span>
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        className={styles.removeRangeButton}
                        disabled={
                          !selectedPreset.light.enabled ||
                          selectedPreset.light.ranges.length <= 2
                        }
                        onClick={() => removeLightRange(index)}
                      >
                        ลบช่วงนี้
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.ruleCard}>
            <legend>ตำแหน่งและการป้องกันการสั่งถี่</legend>
            <div className={styles.inputGrid}>
              <label>
                เป้าหมายตอนเปิด
                <span className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedPreset.openTargetPercent}
                    onChange={(event) =>
                      updateSelectedPreset((preset) => ({
                        ...preset,
                        openTargetPercent: Number(event.target.value),
                      }))
                    }
                  />
                  <span>%</span>
                </span>
              </label>

              <label>
                เป้าหมายตอนปิด
                <span className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedPreset.closedTargetPercent}
                    onChange={(event) =>
                      updateSelectedPreset((preset) => ({
                        ...preset,
                        closedTargetPercent: Number(event.target.value),
                      }))
                    }
                  />
                  <span>%</span>
                </span>
              </label>

              <label>
                ยืนยันค่าติดต่อกัน
                <span className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedPreset.confirmationReadings}
                    onChange={(event) =>
                      updateSelectedPreset((preset) => ({
                        ...preset,
                        confirmationReadings: Number(event.target.value),
                      }))
                    }
                  />
                  <span>ครั้ง</span>
                </span>
              </label>

              <label>
                พักหลังขยับ
                <span className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="3600"
                    step="30"
                    value={selectedPreset.cooldownSeconds}
                    onChange={(event) =>
                      updateSelectedPreset((preset) => ({
                        ...preset,
                        cooldownSeconds: Number(event.target.value),
                      }))
                    }
                  />
                  <span>วินาที</span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        <aside className={styles.preview} aria-live="polite">
          <div className={styles.liveReadings}>
            <div>
              <span>อุณหภูมิ</span>
              <strong>
                {reading?.temperatureCelsius === null || !reading
                  ? "—"
                  : `${reading.temperatureCelsius.toFixed(1)}°C`}
              </strong>
            </div>
            <div>
              <span>แสง</span>
              <strong>
                {reading?.lightLux === null || !reading
                  ? "—"
                  : `${Math.round(reading.lightLux)} lux`}
              </strong>
            </div>
          </div>

          <div
            className={`${styles.decision} ${styles[decision.action]}`}
          >
            <span>ผลจากค่าปัจจุบัน</span>
            <strong>{actionLabels[decision.action]}</strong>
            {decision.targetPercent !== null && (
              <b>เป้าหมาย {decision.targetPercent}%</b>
            )}
          </div>

          <ul className={styles.reasonList}>
            {decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>

          {validationErrors.length === 0 && (
            <p className={styles.guardSummary}>
              ก่อนสั่งจริงต้องพบผลเดิม {selectedPreset.confirmationReadings} ครั้ง
              และพัก {selectedPreset.cooldownSeconds} วินาทีหลังขยับ
            </p>
          )}

          <div
            className={styles.runtimeCard}
            data-phase={autoRuntime.phase}
            aria-live="polite"
          >
            <div className={styles.runtimeHeading}>
              <div>
                <span>AUTO RUNTIME · DRY RUN</span>
                <strong>{runtimePhaseLabels[autoRuntime.phase]}</strong>
              </div>
              <b>
                {autoRuntime.phase === "cooldown"
                  ? `${autoRuntime.cooldownRemainingSeconds}s`
                  : `${Math.min(
                      autoRuntime.confirmationCount,
                      selectedPreset.confirmationReadings,
                    )}/${selectedPreset.confirmationReadings}`}
              </b>
            </div>

            {(autoRuntime.phase === "waiting" ||
              autoRuntime.phase === "confirming" ||
              autoRuntime.phase === "ready") && (
              <>
                <progress
                  max={selectedPreset.confirmationReadings}
                  value={Math.min(
                    autoRuntime.confirmationCount,
                    selectedPreset.confirmationReadings,
                  )}
                >
                  {autoRuntime.confirmationCount}/
                  {selectedPreset.confirmationReadings}
                </progress>
                <p>
                  {autoRuntime.phase === "ready"
                    ? `ผลนิ่งแล้ว พร้อมทดสอบเป้าหมาย ${autoRuntime.targetPercent}%`
                    : isActionableDecision
                      ? "ระบบจะนับเฉพาะข้อมูลเซ็นเซอร์ชุดใหม่ที่ให้เป้าหมายเดิม"
                      : "กำลังรอผลเปิด ปิด หรือปรับตำแหน่งจากเซ็นเซอร์"}
                </p>
              </>
            )}

            {autoRuntime.phase === "commanding" && (
              <p>ESP32 รับคำสั่งแล้ว กำลังรอยืนยันว่ามอเตอร์เริ่มทำงาน</p>
            )}

            {autoRuntime.phase === "moving" && (
              <p>กำลังติดตามมอเตอร์และรอ Encoder หยุดนิ่ง</p>
            )}

            {autoRuntime.phase === "cooldown" && (
              <p>
                ยังอ่านเซ็นเซอร์อยู่ แต่จะไม่รับคำสั่งใหม่จนกว่าจะพักครบ
              </p>
            )}

            {autoRuntime.phase === "fault" && (
              <div className={styles.runtimeFault}>
                <p>{autoRuntime.faultMessage}</p>
                <button type="button" onClick={autoRuntime.reset}>
                  รับทราบและเริ่มตรวจใหม่
                </button>
              </div>
            )}

            <small>
              ยังไม่ใช่ Auto ต่อเนื่อง ระบบส่งคำสั่งได้จากปุ่มทดสอบด้านล่างเท่านั้น
            </small>
          </div>

          <p className={styles.previewNote}>
            ผลด้านบนเป็น Preview ระบบจะส่งคำสั่งเฉพาะเมื่อยืนยันในส่วนทดสอบจริงด้านล่าง
          </p>

          <section
            className={styles.motorTest}
            aria-labelledby="auto-motor-test-title"
          >
            <div className={styles.motorTestHeading}>
              <div>
                <span>REAL MOTOR · SINGLE STEP</span>
                <strong id="auto-motor-test-title">
                  ทดสอบกับมอเตอร์ 1 ครั้ง
                </strong>
              </div>
              <b>
                {currentPositionPercent === null
                  ? "ตำแหน่ง —"
                  : `ตำแหน่ง ${currentPositionPercent.toFixed(1)}%`}
              </b>
            </div>

            {currentPositionPercent !== null &&
              decision.targetPercent !== null && (
                <p className={styles.motorRoute}>
                  {currentPositionPercent.toFixed(1)}% → {decision.targetPercent}%
                  {" · "}
                  {decision.targetPercent > currentPositionPercent
                    ? "เปิดเพิ่ม"
                    : "ปิดเพิ่ม"}{" "}
                  {Math.abs(
                    decision.targetPercent - currentPositionPercent,
                  ).toFixed(1)}%
                </p>
              )}

            {motorTestBlockers.length > 0 ? (
              <ul className={styles.blockerList}>
                {motorTestBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.readyMessage}>
                ระบบพร้อมส่งเป้าหมาย {decision.targetPercent}% ไปยัง ESP32
              </p>
            )}

            <label className={styles.safetyCheck}>
              <input
                type="checkbox"
                checked={safetyConfirmed}
                disabled={motorTestBlockers.length > 0}
                onChange={(event) =>
                  setArmedDecisionKey(
                    event.target.checked ? decisionKey : null,
                  )
                }
              />
              ฉันเฝ้าดูม่านอยู่ และพร้อมกด STOP ทันที
            </label>

            <div className={styles.motorTestActions}>
              <button
                type="button"
                className={styles.runTestButton}
                disabled={
                  !safetyConfirmed ||
                  motorTestBlockers.length > 0 ||
                  decision.targetPercent === null
                }
                onClick={testDecisionWithMotor}
              >
                {isSendingCommand
                  ? "กำลังส่ง..."
                  : decision.targetPercent === null
                    ? "ยังไม่มีเป้าหมาย"
                    : `ทดสอบไปที่ ${decision.targetPercent}%`}
              </button>
              <button
                type="button"
                className={styles.stopButton}
                disabled={!isDeviceOnline}
                onClick={emergencyStop}
              >
                STOP
              </button>
            </div>

            {(motorTestMessage || commandError) && (
              <p
                className={commandError ? styles.testError : styles.testStatus}
                role={commandError ? "alert" : "status"}
              >
                {commandError ?? motorTestMessage}
              </p>
            )}

            <p className={styles.singleStepNote}>
              ปุ่มนี้ส่งคำสั่งเพียงครั้งเดียว ยังไม่เปิด Auto แบบทำงานต่อเนื่อง
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
