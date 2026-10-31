"use client";

import { useMemo, useState } from "react";
import { getAutoPresetValidationErrors } from "@/lib/curtain/auto-preset";
import type { AutoPreset } from "@/types/auto-preset";
import styles from "./UserPages.module.css";

type UserAutoCriteriaEditorProps = {
  basePreset: AutoPreset;
  preset: AutoPreset;
  hasOverride: boolean;
  isBusy: boolean;
  onSave: (preset: AutoPreset) => boolean;
  onReset: () => void;
};

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

export default function UserAutoCriteriaEditor({
  basePreset,
  preset,
  hasOverride,
  isBusy,
  onSave,
  onReset,
}: UserAutoCriteriaEditorProps) {
  const [draft, setDraft] = useState(() => clonePreset(preset));
  const [message, setMessage] = useState<string | null>(null);

  const validationErrors = useMemo(
    () => getAutoPresetValidationErrors(draft),
    [draft],
  );
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(preset);

  function updateTemperature(
    field: "closeAtOrAboveCelsius" | "reopenAtOrBelowCelsius",
    value: number,
  ) {
    setDraft((current) => ({
      ...current,
      temperature: { ...current.temperature, [field]: value },
    }));
    setMessage(null);
  }

  function updateLightBoundary(index: number, value: number) {
    setDraft((current) => ({
      ...current,
      light: {
        ...current.light,
        ranges: current.light.ranges.map((range, rangeIndex) => {
          if (rangeIndex === index) return { ...range, maxLux: value };
          if (rangeIndex === index + 1) return { ...range, minLux: value };
          return range;
        }),
      },
    }));
    setMessage(null);
  }

  function updateLightTarget(index: number, value: number) {
    setDraft((current) => ({
      ...current,
      light: {
        ...current.light,
        ranges: current.light.ranges.map((range, rangeIndex) =>
          rangeIndex === index ? { ...range, targetPercent: value } : range,
        ),
      },
    }));
    setMessage(null);
  }

  function updateNumber(
    field:
      | "openTargetPercent"
      | "closedTargetPercent"
      | "confirmationReadings"
      | "cooldownSeconds",
    value: number,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  function saveCriteria() {
    if (validationErrors.length > 0) return;
    setMessage(
      onSave(draft)
        ? "บันทึกเกณฑ์ของชุดนี้แล้ว พร้อมส่งไป ESP32 เมื่อกดเริ่มใช้งาน"
        : "บันทึกเกณฑ์ไม่ได้ กรุณาตรวจค่าที่กรอก",
    );
  }

  function resetCriteria() {
    onReset();
    setDraft(clonePreset(basePreset));
    setMessage("คืนค่าแนะนำของชุดนี้แล้ว");
  }

  return (
    <details className={styles.userCriteriaEditor}>
      <summary>
        <span>
          <strong>ปรับเกณฑ์ Auto</strong>
          <small>อุณหภูมิ แสง ตำแหน่ง และช่วงพัก</small>
        </span>
        <em>{hasOverride ? "ใช้ค่าที่แก้เอง" : "ใช้ค่าแนะนำ"}</em>
      </summary>

      <div className={styles.userCriteriaBody}>
        <p className={styles.userCriteriaIntro}>
          ค่าที่บันทึกจะใช้เฉพาะชุดนี้และเก็บใน browser เครื่องนี้
          เมื่อกดเริ่ม ระบบจะตรวจความถูกต้องอีกครั้งก่อนส่งไป ESP32
        </p>

        {draft.temperature.enabled && (
          <fieldset className={styles.userCriteriaGroup}>
            <legend>เกณฑ์อุณหภูมิ</legend>
            <div className={styles.userCriteriaGrid}>
              <label>
                <span>ปิดเมื่อถึง</span>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={0.5}
                    value={draft.temperature.closeAtOrAboveCelsius}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateTemperature(
                        "closeAtOrAboveCelsius",
                        Number(event.target.value),
                      )
                    }
                  />
                  <span>°C</span>
                </div>
              </label>
              <label>
                <span>เปิดกลับเมื่อไม่เกิน</span>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={0.5}
                    value={draft.temperature.reopenAtOrBelowCelsius}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateTemperature(
                        "reopenAtOrBelowCelsius",
                        Number(event.target.value),
                      )
                    }
                  />
                  <span>°C</span>
                </div>
              </label>
              <label>
                <span>ตำแหน่งเมื่อเย็น</span>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.openTargetPercent}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateNumber("openTargetPercent", Number(event.target.value))
                    }
                  />
                  <span>%</span>
                </div>
              </label>
              <label>
                <span>ตำแหน่งเมื่อร้อน</span>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.closedTargetPercent}
                    disabled={isBusy}
                    onChange={(event) =>
                      updateNumber("closedTargetPercent", Number(event.target.value))
                    }
                  />
                  <span>%</span>
                </div>
              </label>
            </div>
          </fieldset>
        )}

        {draft.light.enabled && (
          <fieldset className={styles.userCriteriaGroup}>
            <legend>ช่วงแสงและตำแหน่งม่าน</legend>
            <p className={styles.userCriteriaHint}>
              แสงมากขึ้นควรกำหนดให้ม่านเปิดน้อยลงหรือเท่าเดิม
            </p>
            <div className={styles.userLightRanges}>
              {draft.light.ranges.map((range, index) => (
                <div className={styles.userLightRangeRow} key={index}>
                  <strong>ช่วง {index + 1}</strong>
                  <label>
                    <span>เริ่ม</span>
                    <div>
                      <input type="number" value={range.minLux} readOnly />
                      <span>lux</span>
                    </div>
                  </label>
                  {range.maxLux === null ? (
                    <div className={styles.userOpenEndedRange}>
                      <span>สิ้นสุด</span>
                      <strong>ขึ้นไป</strong>
                    </div>
                  ) : (
                    <label>
                      <span>น้อยกว่า</span>
                      <div>
                        <input
                          type="number"
                          min={range.minLux + 1}
                          max={100000}
                          step={50}
                          value={range.maxLux}
                          disabled={isBusy}
                          onChange={(event) =>
                            updateLightBoundary(index, Number(event.target.value))
                          }
                        />
                        <span>lux</span>
                      </div>
                    </label>
                  )}
                  <label>
                    <span>ให้ม่านอยู่ที่</span>
                    <div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={range.targetPercent}
                        disabled={isBusy}
                        onChange={(event) =>
                          updateLightTarget(index, Number(event.target.value))
                        }
                      />
                      <span>%</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className={styles.userCriteriaGroup}>
          <legend>ป้องกันการสั่งถี่</legend>
          <div className={styles.userCriteriaGrid}>
            <label>
              <span>ยืนยันค่าติดต่อกัน</span>
              <div>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={draft.confirmationReadings}
                  disabled={isBusy}
                  onChange={(event) =>
                    updateNumber("confirmationReadings", Number(event.target.value))
                  }
                />
                <span>ครั้ง</span>
              </div>
            </label>
            <label>
              <span>พักหลังขยับ</span>
              <div>
                <input
                  type="number"
                  min={0}
                  max={3600}
                  step={15}
                  value={draft.cooldownSeconds}
                  disabled={isBusy}
                  onChange={(event) =>
                    updateNumber("cooldownSeconds", Number(event.target.value))
                  }
                />
                <span>วินาที</span>
              </div>
            </label>
          </div>
        </fieldset>

        {validationErrors.length > 0 && (
          <ul className={styles.userCriteriaErrors} role="alert">
            {validationErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}

        {message && (
          <p className={styles.userCriteriaMessage} role="status">{message}</p>
        )}

        <div className={styles.userCriteriaActions}>
          <button
            type="button"
            disabled={isBusy || !hasUnsavedChanges || validationErrors.length > 0}
            onClick={saveCriteria}
          >
            บันทึกเกณฑ์นี้
          </button>
          <button
            type="button"
            className={styles.userCriteriaReset}
            disabled={isBusy || (!hasOverride && !hasUnsavedChanges)}
            onClick={resetCriteria}
          >
            คืนค่าแนะนำ
          </button>
        </div>
      </div>
    </details>
  );
}
