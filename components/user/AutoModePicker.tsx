"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import useAutoResponseStyle from "@/hooks/useAutoResponseStyle";
import useUserAutoPresetChoice from "@/hooks/useUserAutoPresetChoice";
import useUserAutoPresetOverrides from "@/hooks/useUserAutoPresetOverrides";
import {
  findUserAutoPresetFamilyByOption,
  findUserAutoPresetOption,
  USER_AUTO_PRESET_FAMILIES,
  type UserAutoPresetOption,
} from "@/lib/curtain/user-auto-presets";
import AppIcon from "./AppIcon";
import UserAutoCriteriaEditor from "./UserAutoCriteriaEditor";
import styles from "./UserPages.module.css";

type AutoModePickerProps = {
  isAutoEnabled: boolean;
  activePresetId: string | null;
  isPresetSynced: boolean;
  isBusy: boolean;
  canActivate: boolean;
  modelASensorsReady: boolean;
  onActivate: (
    option: UserAutoPresetOption,
  ) => void | Promise<void | boolean>;
  onActivateModelA: () => void | Promise<void | boolean>;
};

export default function AutoModePicker({
  isAutoEnabled,
  activePresetId,
  isPresetSynced,
  isBusy,
  canActivate,
  modelASensorsReady,
  onActivate,
  onActivateModelA,
}: AutoModePickerProps) {
  const { selectedOptionId, selectOption } = useUserAutoPresetChoice();
  const { presetOverrides, savePresetOverride, resetPresetOverride } =
    useUserAutoPresetOverrides();
  const { responseStyle, selectResponseStyle } = useAutoResponseStyle();
  const [selectionOverride, setSelectionOverride] = useState<"preset" | "model-a" | null>(null);
  const selectedOption =
    findUserAutoPresetOption(selectedOptionId) ??
    USER_AUTO_PRESET_FAMILIES[2].options[1];
  const selectedFamily = findUserAutoPresetFamilyByOption(selectedOption.id);
  const presetOverride = presetOverrides[selectedOption.id];
  const effectiveOption: UserAutoPresetOption = presetOverride
    ? { ...selectedOption, preset: presetOverride }
    : selectedOption;
  const hasPresetOverride = presetOverride !== undefined;
  const selectedOptionIndex = selectedFamily.options.findIndex(
    (option) => option.id === selectedOption.id,
  );
  const isModelASelected =
    selectionOverride === "model-a" ||
    (selectionOverride === null && isAutoEnabled && activePresetId === "model-a");
  const isSelectedRunning = isModelASelected
    ? isAutoEnabled && activePresetId === "model-a"
    : isAutoEnabled && isPresetSynced;
  const canStartSelected = canActivate && (!isModelASelected || modelASensorsReady);
  const leftIcon = selectedFamily.id === "heat-protection" ? "temperature" : "light";
  const rightIcon = selectedFamily.id === "natural-light" ? "shield" : "temperature";

  function selectFamily(familyId: typeof selectedFamily.id) {
    const family = USER_AUTO_PRESET_FAMILIES.find(
      (candidate) => candidate.id === familyId,
    );
    const standardOption = family?.options[1] ?? family?.options[0];

    if (standardOption) {
      selectOption(standardOption.id);
      setSelectionOverride("preset");
    }
  }

  function activateCurrentSelection() {
    if (isModelASelected) {
      void onActivateModelA();
    } else {
      void onActivate(effectiveOption);
    }
  }

  function renderQuickActionBar(position: "top" | "bottom") {
    return (
      <div
        className={`${styles.autoQuickActionBar} ${
          position === "top"
            ? styles.autoQuickActionTop
            : styles.autoQuickActionBottom
        }`}
        aria-label="สรุปและเริ่มใช้งาน Auto"
      >
        <div className={styles.autoQuickActionInfo}>
          <span className={styles.autoQuickActionLabel}>แนวทางที่เลือก:</span>
          <div className={styles.autoQuickActionNameGroup}>
            <strong>
              {isModelASelected ? "Model A ฉบับเต็ม" : effectiveOption.preset.name}
            </strong>
            <span className={styles.autoQuickActionStyle}>
              {isModelASelected
                ? "ทำงานบน ESP32"
                : hasPresetOverride
                  ? "ใช้เกณฑ์ที่แก้เอง"
                  : responseStyle === "gentle"
                    ? "ขยับค่อยเป็นค่อยไป"
                    : "ขยับแบบมาตรฐาน"}
            </span>
          </div>
          <small className={styles.autoQuickActionDesc}>
            {isModelASelected
              ? "ดูแสงร่วมกับอุณหภูมิ ยืนยัน 2 รอบ ขยับทีละ Step และพัก 15 วินาที"
              : hasPresetOverride
                ? "บันทึกเกณฑ์เฉพาะชุดนี้แล้ว"
                : selectedOption.detail} ·{" "}
            {isSelectedRunning
              ? "กำลังทำงานใน ESP32"
              : "กดเริ่มใช้งานเมื่อพร้อม"}
          </small>
        </div>

        <button
          type="button"
          className={styles.autoQuickActionBtn}
          disabled={isBusy || !canStartSelected || isSelectedRunning}
          onClick={activateCurrentSelection}
        >
          {isBusy
            ? "กำลังติดต่อ ESP32..."
            : isSelectedRunning
              ? "กำลังใช้แนวทางนี้"
              : isModelASelected
                ? "เปิด Model A บน ESP32"
                : "ใช้ชุดนี้ทันที"}
        </button>
      </div>
    );
  }

  return (
    <section
      className={styles.autoModeSection}
      aria-labelledby="easy-auto-mode-title"
    >
      <div className={styles.autoModeHeading}>
        <div>
          <p className={styles.sectionLabel}>โหมดอัตโนมัติ</p>
          <h2 id="easy-auto-mode-title">Auto แบบไหนเหมาะกับคุณ?</h2>
          <p>
            เลือกแนวทางแล้วปรับระดับด้วยตัวเลื่อน หรือให้ Model A ฉบับเต็ม
            ตัดสินใจจากแสงและอุณหภูมิบน ESP32
          </p>
        </div>
        <span
          className={
            isAutoEnabled
              ? styles.autoRunningPill
              : styles.autoPreviewPill
          }
        >
          {isAutoEnabled ? "Auto กำลังทำงาน" : "พร้อมเลือกชุด"}
        </span>
      </div>

      {renderQuickActionBar("top")}

      <div className={styles.autoStepHeading}>
        <span>1</span>
        <div>
          <strong>อยากให้ Auto ดูแลแบบไหน?</strong>
          <small>เลือกพรีเซ็ตที่ปรับระดับเองได้ หรือ Model A ฉบับเต็ม</small>
        </div>
      </div>

      <div className={styles.autoFamilyGrid} aria-label="เลือกแนวทาง Auto">
        {USER_AUTO_PRESET_FAMILIES.map((family) => {
          const active = !isModelASelected && family.id === selectedFamily.id;

          return (
            <button
              key={family.id}
              type="button"
              className={
                active ? styles.autoFamilyActive : styles.autoFamilyOption
              }
              data-tone={family.tone}
              aria-pressed={active}
              disabled={isBusy}
              onClick={() => selectFamily(family.id)}
            >
              <span>{family.badge}</span>
              <strong>{family.name}</strong>
              <small>{family.description}</small>
            </button>
          );
        })}
        <button
          type="button"
          className={isModelASelected ? styles.autoFamilyActive : styles.autoFamilyOption}
          data-tone="model-a"
          aria-pressed={isModelASelected}
          disabled={isBusy}
          onClick={() => setSelectionOverride("model-a")}
        >
          <span>กฎแบบปรับตัว</span>
          <strong>Model A ฉบับเต็ม</strong>
          <small>ใช้งบแสงตามอุณหภูมิ ขยับทีละ Step และทำงานต่อแม้ปิดเว็บ</small>
        </button>
      </div>

      {isModelASelected ? (
        <div className={styles.autoModelAExplanation}>
          <div className={styles.autoVariantHeading}>
            <span className={styles.autoStepNumber}>2</span>
            <div>
              <strong>Model A ทำงานอย่างไร?</strong>
              <span>เป็นกฎเต็มบน ESP32 ไม่ใช่ Preview ในหน้า Dev</span>
            </div>
          </div>
          <p>
            ระบบดูทั้งแสงและอุณหภูมิ: แสงมากเกินช่วงจะปิดทีละ Step,
            แสงต่ำจะเปิดทีละ Step และถ้าร้อนแต่มืดจะคงตำแหน่งเดิม
          </p>
          <small>ต้องมี DHT22, BH1750, Encoder และลิมิตพร้อมใช้งาน ก่อนเปิดโหมดนี้</small>
          {!modelASensorsReady && (
            <p className={styles.autoModelAWarn} role="status">
              ยังเปิด Model A ไม่ได้ เพราะข้อมูลอุณหภูมิหรือแสงจาก ESP32 ไม่พร้อม
            </p>
          )}
        </div>
      ) : (
        <>
        <div className={styles.autoChoiceColumns}>
          <div className={`${styles.autoVariantBlock} ${styles.autoChoiceBlock}`}>
            <div className={styles.autoVariantHeading}>
              <span className={styles.autoStepNumber}>2</span>
              <div>
                <strong>เลื่อนเพื่อเลือกแนวทางที่เหมาะกับห้อง</strong>
                <span>ตัวเลือกของ {selectedFamily.name}</span>
              </div>
            </div>
            <div className={styles.autoPresetSlider}>
              <div className={styles.autoPresetSliderEnds} aria-hidden="true">
                <span><AppIcon name={leftIcon} size={20} />{selectedFamily.options[0].name}</span>
                <span><AppIcon name={rightIcon} size={20} />{selectedFamily.options[2].name}</span>
              </div>
              <label className={styles.srOnly} htmlFor="user-auto-preset-range">
                ระดับของ {selectedFamily.name}
              </label>
              <input
                id="user-auto-preset-range"
                className={styles.autoPresetRange}
                type="range"
                min={0}
                max={2}
                step={1}
                value={selectedOptionIndex}
                aria-valuetext={selectedOption.name}
                disabled={isBusy}
                onChange={(event) => {
                  selectOption(selectedFamily.options[Number(event.target.value)].id);
                }}
                style={{ "--auto-slider-progress": `${selectedOptionIndex * 50}%` } as CSSProperties}
              />
              <div className={styles.autoPresetSliderTicks} aria-hidden="true">
                {selectedFamily.options.map((option) => (
                  <span key={option.id}>{option.name}</span>
                ))}
              </div>
              <div className={styles.autoPresetSliderSelection} aria-live="polite">
                <strong>{selectedOption.name}</strong>
                <p>{selectedOption.description}</p>
                <small>{selectedOption.detail}</small>
              </div>
            </div>
          </div>

          <div className={`${styles.autoVariantBlock} ${styles.autoChoiceBlock}`}>
            <div className={styles.autoVariantHeading}>
              <span className={styles.autoStepNumber}>3</span>
              <div>
                <strong>อยากให้ม่านขยับแบบไหน?</strong>
                <span>รูปแบบนี้ใช้กับพรีเซ็ตที่เลือกเท่านั้น</span>
              </div>
            </div>
            <div className={`${styles.autoVariantGrid} ${styles.autoChoiceGrid}`}>
              <button
                type="button"
                className={`${responseStyle === "standard" ? styles.autoVariantActive : styles.autoVariantOption} ${styles.autoChoiceCard}`}
                aria-pressed={responseStyle === "standard"}
                disabled={isBusy}
                onClick={() => selectResponseStyle("standard")}
              >
                <span className={styles.autoVariantTitle}><strong>มาตรฐาน</strong><em>ตอบสนองไว</em></span>
                {responseStyle === "standard" && <p>ไปยังตำแหน่งที่พรีเซ็ตคำนวณได้ในคำสั่งเดียว</p>}
              </button>
              <button
                type="button"
                className={`${responseStyle === "gentle" ? styles.autoVariantActive : styles.autoVariantOption} ${styles.autoChoiceCard}`}
                aria-pressed={responseStyle === "gentle"}
                disabled={isBusy}
                onClick={() => selectResponseStyle("gentle")}
              >
                <span className={styles.autoVariantTitle}><strong>ค่อยเป็นค่อยไป</strong><em>Step ไม่เกิน 15%</em></span>
                {responseStyle === "gentle" && <p>ขยับทีละไม่เกิน 15% แล้วพักเพื่อประเมินข้อมูลใหม่</p>}
              </button>
            </div>
          </div>
        </div>
        <UserAutoCriteriaEditor
          key={`${selectedOption.id}:${hasPresetOverride ? "custom" : "default"}`}
          basePreset={selectedOption.preset}
          preset={effectiveOption.preset}
          hasOverride={hasPresetOverride}
          isBusy={isBusy}
          onSave={(preset) => savePresetOverride(selectedOption.id, preset)}
          onReset={() => resetPresetOverride(selectedOption.id)}
        />
        </>
      )}
      {!canActivate && (
        <p className={styles.autoPresetNotice} role="status">
          ยังเปิดหรือเปลี่ยน Auto ไม่ได้: ตรวจการเชื่อมต่อ Encoder การตั้งระยะม่าน
          สถานะลิมิต และ Motor Fault ก่อน
        </p>
      )}
      {renderQuickActionBar("bottom")}
      <p className={styles.autoCompactFooter} aria-live="polite">
        {isSelectedRunning
          ? "ESP32 ใช้แนวทางนี้ต่อเนื่อง แม้ปิดหน้าเว็บ"
          : "เมื่อกดเริ่ม ESP32 จะทำงานต่อเนื่อง แม้ปิดหน้าเว็บ"}
        {" · "}<Link href={isModelASelected ? "/dev#closed-loop-auto-title" : "/dev#auto-preset-title"}>
          ดูรายละเอียดในหน้า Dev
        </Link>
      </p>
    </section>
  );
}
