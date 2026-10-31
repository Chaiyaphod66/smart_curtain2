"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useAutoRuntime from "@/hooks/useAutoRuntime";
import {
  configureModelAOnDevice,
  disableContinuousAuto,
  enableContinuousAuto,
} from "@/lib/curtain/esp32-curtain-client";
import {
  INITIAL_CLOSED_LOOP_AUTO_STATE,
  advanceClosedLoopAuto,
  resetClosedLoopAutoState,
  type ClosedLoopAutoResult,
  type ClosedLoopAutoState,
} from "@/lib/curtain/closed-loop-auto";
import {
  MODEL_A_CONFIRMATION_READINGS,
  MODEL_A_COOLDOWN_SECONDS,
  getModelAContinuousCandidateKey,
  getModelAContinuousSafetyBlockers,
  getModelAContinuousTargetPercent,
} from "@/lib/curtain/model-a-continuous";
import type { AutoRuntimePhase } from "@/types/auto-runtime";
import type { SensorReading } from "@/types/sensor";
import type { DeviceAutoStatus } from "@/types/device";
import styles from "./ClosedLoopAutoLab.module.css";

type ClosedLoopAutoLabProps = {
  reading: SensorReading | null;
  source: "mock" | "esp32" | null;
  currentPositionPercent: number | null;
  isAutoLabSelected: boolean;
  isDeviceOnline: boolean;
  isPositionControlReady: boolean;
  isMotorRunning: boolean;
  isSendingCommand: boolean;
  motorFault: string | null;
  limitConflict: boolean;
  limitSafetyEnabled: boolean;
  deviceAutoEnabled: boolean;
  deviceAutoStatus: DeviceAutoStatus | null;
  onDeviceStatusRefresh: () => void;
  onMoveToPosition: (targetPercent: number) => Promise<boolean>;
  onEmergencyStop: () => void | boolean | Promise<void | boolean>;
};

const actionLabels: Record<ClosedLoopAutoResult["action"], string> = {
  "open-step": "เสนอให้ขยับเปิด",
  "close-step": "เสนอให้ขยับปิด",
  hold: "คงตำแหน่งเดิม",
  waiting: "รอข้อมูลให้พร้อม",
};

const runtimeLabels: Record<AutoRuntimePhase, string> = {
  waiting: "รอผลจากเซ็นเซอร์",
  confirming: "กำลังยืนยันผล",
  ready: "พร้อมส่งคำสั่ง",
  commanding: "กำลังส่งคำสั่ง",
  moving: "มอเตอร์กำลังเคลื่อน",
  cooldown: "กำลังพักก่อนรอบใหม่",
  fault: "หยุดเพราะผิดปกติ",
};

const MODEL_A_COOLDOWN_STORAGE_KEY =
  "smart-curtain:model-a-cooldown-until";

function getInitialResult(): ClosedLoopAutoResult {
  return advanceClosedLoopAuto(INITIAL_CLOSED_LOOP_AUTO_STATE, {
    reading: null,
    currentPositionPercent: null,
  });
}

export default function ClosedLoopAutoLab({
  reading,
  source,
  currentPositionPercent,
  isAutoLabSelected,
  isDeviceOnline,
  isPositionControlReady,
  isMotorRunning,
  isSendingCommand,
  motorFault,
  limitConflict,
  limitSafetyEnabled,
  deviceAutoEnabled,
  deviceAutoStatus,
  onDeviceStatusRefresh,
  onMoveToPosition,
  onEmergencyStop,
}: ClosedLoopAutoLabProps) {
  const controllerState = useRef<ClosedLoopAutoState>(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
  );
  const proposedState = useRef<ClosedLoopAutoState>(
    INITIAL_CLOSED_LOOP_AUTO_STATE,
  );
  const lastSampleId = useRef<string | null>(null);
  const commandDispatching = useRef(false);
  const continuousActive = useRef(false);
  const deactivating = useRef(false);
  const emergencyStopRef = useRef(onEmergencyStop);
  const deviceOnlineRef = useRef(isDeviceOnline);
  const [result, setResult] = useState(getInitialResult);
  const [isContinuousEnabled, setIsContinuousEnabled] =
    useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [deviceSafetyConfirmed, setDeviceSafetyConfirmed] = useState(false);
  const [deviceAutoPending, setDeviceAutoPending] = useState(false);
  const [deviceAutoMessage, setDeviceAutoMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Model A กำลังคำนวณแบบ Preview",
  );

  useEffect(() => {
    emergencyStopRef.current = onEmergencyStop;
  }, [onEmergencyStop]);

  useEffect(() => {
    deviceOnlineRef.current = isDeviceOnline;
  }, [isDeviceOnline]);

  const baseSafetyBlockers = useMemo(
    () =>
      getModelAContinuousSafetyBlockers({
        isAutoLabSelected,
        source,
        isDeviceOnline,
        isPositionControlReady,
        limitSafetyEnabled,
        limitConflict,
        motorFault,
        deviceAutoEnabled,
      }),
    [
      isAutoLabSelected,
      source,
      isDeviceOnline,
      isPositionControlReady,
      limitSafetyEnabled,
      limitConflict,
      motorFault,
      deviceAutoEnabled,
    ],
  );
  const safetyBlockers = useMemo(
    () =>
      result.state.resolutionLimited
        ? [
            ...baseSafetyBlockers,
            "Model A ถึงขีดจำกัดความละเอียด ต้องตรวจตำแหน่งและรีเซ็ตก่อน",
          ]
        : baseSafetyBlockers,
    [baseSafetyBlockers, result.state.resolutionLimited],
  );
  const startBlockers = useMemo(() => {
    const blockers = [...safetyBlockers];

    if (isMotorRunning) {
      blockers.push("รอให้มอเตอร์หยุดก่อนเริ่ม");
    }

    if (isSendingCommand) {
      blockers.push("รอให้คำสั่งก่อนหน้าสิ้นสุด");
    }

    return blockers;
  }, [safetyBlockers, isMotorRunning, isSendingCommand]);
  const deviceStartBlockers = useMemo(() => {
    const blockers = [...baseSafetyBlockers];
    if (isMotorRunning) blockers.push("รอให้มอเตอร์หยุดก่อนเริ่ม");
    if (isSendingCommand) blockers.push("รอให้คำสั่งก่อนหน้าสิ้นสุด");
    return blockers;
  }, [baseSafetyBlockers, isMotorRunning, isSendingCommand]);
  const targetPercent = getModelAContinuousTargetPercent(result);
  const candidateKey = getModelAContinuousCandidateKey(result);
  const runtime = useAutoRuntime({
    sampleId:
      isContinuousEnabled && safetyBlockers.length === 0
        ? reading?.recordedAt ?? null
        : null,
    candidateKey:
      isContinuousEnabled && safetyBlockers.length === 0
        ? candidateKey
        : null,
    targetPercent:
      isContinuousEnabled && safetyBlockers.length === 0
        ? targetPercent
        : null,
    confirmationReadings: MODEL_A_CONFIRMATION_READINGS,
    cooldownSeconds: MODEL_A_COOLDOWN_SECONDS,
    isMotorRunning,
    currentPositionPercent,
    cooldownStorageKey: MODEL_A_COOLDOWN_STORAGE_KEY,
  });
  const stopRuntimeCommand = runtime.commandStopped;

  const deactivateContinuous = useCallback(
    (message: string, sendStop: boolean) => {
      if (!continuousActive.current || deactivating.current) {
        return;
      }

      deactivating.current = true;
      continuousActive.current = false;
      setIsContinuousEnabled(false);
      setSafetyConfirmed(false);
      stopRuntimeCommand();
      setStatusMessage(message);

      if (sendStop) {
        void Promise.resolve(emergencyStopRef.current())
          .then((stopped) => {
            if (stopped === false) {
              throw new Error("ESP32 ไม่รับคำสั่ง STOP");
            }
          })
          .catch(() => {
            setStatusMessage(
              `${message} แต่ส่ง STOP ไม่สำเร็จ กรุณาตัดไฟหากมอเตอร์ยังหมุน`,
            );
          })
          .finally(() => {
            deactivating.current = false;
          });
      } else {
        deactivating.current = false;
      }
    },
    [stopRuntimeCommand],
  );

  useEffect(() => {
    const sampleId = reading?.recordedAt ?? null;

    if (sampleId === lastSampleId.current) {
      return;
    }

    if (
      isContinuousEnabled &&
      (runtime.phase === "commanding" ||
        runtime.phase === "moving" ||
        runtime.phase === "cooldown" ||
        runtime.phase === "fault")
    ) {
      return;
    }

    lastSampleId.current = sampleId;
    const nextResult = advanceClosedLoopAuto(
      controllerState.current,
      { reading, currentPositionPercent },
    );
    proposedState.current = nextResult.state;

    if (
      nextResult.action === "hold" ||
      nextResult.action === "waiting"
    ) {
      controllerState.current = nextResult.state;
    }

    setResult(nextResult);
  }, [
    reading,
    currentPositionPercent,
    isContinuousEnabled,
    runtime.phase,
  ]);

  useEffect(() => {
    if (
      !isContinuousEnabled ||
      runtime.phase !== "ready" ||
      targetPercent === null ||
      safetyBlockers.length > 0 ||
      isMotorRunning ||
      isSendingCommand ||
      commandDispatching.current
    ) {
      return;
    }

    commandDispatching.current = true;
    const nextControllerState = proposedState.current;
    runtime.startCommand(targetPercent);
    setStatusMessage(`กำลังส่ง Model A ไปที่ ${targetPercent}%...`);

    void (async () => {
      try {
        const successful = await onMoveToPosition(targetPercent);

        if (!continuousActive.current) {
          return;
        }

        if (successful) {
          controllerState.current = nextControllerState;
          setStatusMessage(
            `ESP32 รับเป้าหมาย ${targetPercent}% แล้ว กำลังติดตาม Encoder`,
          );
        } else {
          runtime.commandFailed("ส่งคำสั่ง Model A ไปยัง ESP32 ไม่สำเร็จ");
        }
      } catch (error) {
        if (continuousActive.current) {
          runtime.commandFailed(
            error instanceof Error
              ? error.message
              : "ส่งคำสั่ง Model A ไม่สำเร็จ",
          );
        }
      } finally {
        commandDispatching.current = false;
      }
    })();
  }, [
    isContinuousEnabled,
    runtime,
    targetPercent,
    safetyBlockers,
    isMotorRunning,
    isSendingCommand,
    onMoveToPosition,
  ]);

  useEffect(() => {
    if (!isContinuousEnabled || safetyBlockers.length === 0) {
      return;
    }

    deactivateContinuous(
      `หยุด Model A: ${safetyBlockers[0]}`,
      isDeviceOnline && isAutoLabSelected,
    );
  }, [
    isContinuousEnabled,
    safetyBlockers,
    isDeviceOnline,
    isAutoLabSelected,
    deactivateContinuous,
  ]);

  useEffect(() => {
    if (!isContinuousEnabled || runtime.phase !== "fault") {
      return;
    }

    deactivateContinuous(
      `หยุด Model A: ${runtime.faultMessage ?? "Runtime ผิดปกติ"}`,
      isDeviceOnline,
    );
  }, [
    isContinuousEnabled,
    runtime.phase,
    runtime.faultMessage,
    isDeviceOnline,
    deactivateContinuous,
  ]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && continuousActive.current) {
        deactivateContinuous(
          "หยุด Model A เพราะหน้า Dev ถูกซ่อน",
          deviceOnlineRef.current,
        );
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [deactivateContinuous]);

  useEffect(
    () => () => {
      if (continuousActive.current && deviceOnlineRef.current) {
        void Promise.resolve(emergencyStopRef.current());
      }
    },
    [],
  );

  function calculateFreshResult() {
    const resetState = resetClosedLoopAutoState();
    const nextResult = advanceClosedLoopAuto(resetState, {
      reading,
      currentPositionPercent,
    });
    controllerState.current =
      nextResult.action === "hold" ||
      nextResult.action === "waiting"
        ? nextResult.state
        : resetState;
    proposedState.current = nextResult.state;
    lastSampleId.current = reading?.recordedAt ?? null;
    setResult(nextResult);
  }

  function resetLab() {
    if (continuousActive.current) {
      return;
    }

    calculateFreshResult();
    runtime.reset();
    setStatusMessage("รีเซ็ต Model A แล้ว กำลังคำนวณแบบ Preview");
  }

  function startContinuous() {
    if (
      !safetyConfirmed ||
      startBlockers.length > 0 ||
      runtime.phase === "fault" ||
      continuousActive.current
    ) {
      return;
    }

    const confirmed = window.confirm(
      `เริ่ม Model A แบบต่อเนื่องใช่หรือไม่?\n\nระบบจะยืนยันผล ${MODEL_A_CONFIRMATION_READINGS} รอบ ขยับทีละ Step รอให้มอเตอร์หยุด และพัก ${MODEL_A_COOLDOWN_SECONDS} วินาทีก่อนประเมินใหม่ โปรดเปิดหน้า Dev ไว้และเตรียมกด STOP`,
    );

    if (!confirmed) {
      return;
    }

    if (document.hidden) {
      setStatusMessage("เปิดหน้า Dev ให้มองเห็นก่อนเริ่ม Model A");
      return;
    }

    calculateFreshResult();
    deactivating.current = false;
    continuousActive.current = true;
    setIsContinuousEnabled(true);
    setStatusMessage("เปิด Model A ต่อเนื่องแล้ว กำลังยืนยันข้อมูลรอบแรก");
  }

  async function emergencyStop() {
    continuousActive.current = false;
    setIsContinuousEnabled(false);
    setSafetyConfirmed(false);
    runtime.commandStopped();
    setStatusMessage("กำลังส่ง STOP...");

    try {
      const stopped = await onEmergencyStop();

      setStatusMessage(
        stopped === false
          ? "ส่ง STOP ไม่สำเร็จ กรุณาตัดไฟหากมอเตอร์ยังหมุน"
          : "ส่ง STOP แล้ว Model A ต่อเนื่องถูกปิด",
      );
    } catch {
      setStatusMessage(
        "ส่ง STOP ไม่สำเร็จ กรุณาตัดไฟหากมอเตอร์ยังหมุน",
      );
    }
  }

  async function startDeviceModelA() {
    if (
      !deviceSafetyConfirmed ||
      deviceAutoPending ||
      isContinuousEnabled ||
      deviceStartBlockers.length > 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      "เปิด Model A ฉบับเต็มบน ESP32 ใช่หรือไม่?\n\nบอร์ดจะควบคุมม่านต่อแม้ปิดหน้าเว็บ โปรดทดสอบลิมิต, Encoder และ STOP ภายใต้การเฝ้าดูก่อนปล่อยทำงานต่อเนื่อง",
    );
    if (!confirmed) return;

    setDeviceAutoPending(true);
    setDeviceAutoMessage("กำลังบันทึก Model A ลง ESP32...");
    try {
      await configureModelAOnDevice();
      await enableContinuousAuto();
      setDeviceSafetyConfirmed(false);
      setDeviceAutoMessage("Model A ทำงานบน ESP32 แล้ว ปิดหน้าเว็บได้เมื่อทดสอบความปลอดภัยผ่าน");
    } catch (error) {
      setDeviceAutoMessage(
        error instanceof Error ? error.message : "เปิด Model A บน ESP32 ไม่สำเร็จ",
      );
    } finally {
      setDeviceAutoPending(false);
      onDeviceStatusRefresh();
    }
  }

  async function stopDeviceModelA() {
    if (deviceAutoPending || !deviceAutoEnabled || deviceAutoStatus?.presetId !== "model-a") {
      return;
    }

    setDeviceAutoPending(true);
    try {
      await disableContinuousAuto();
      setDeviceAutoMessage("ปิด Model A บน ESP32 แล้ว");
    } catch (error) {
      setDeviceAutoMessage(
        error instanceof Error ? error.message : "ปิด Model A บน ESP32 ไม่สำเร็จ",
      );
    } finally {
      setDeviceAutoPending(false);
      onDeviceStatusRefresh();
    }
  }

  const displayedBlockers = isContinuousEnabled
    ? safetyBlockers
    : startBlockers;

  return (
    <section
      className={styles.lab}
      data-action={result.action}
      data-continuous={isContinuousEnabled ? "true" : "false"}
      aria-labelledby="closed-loop-auto-title"
    >
      <header className={styles.heading}>
        <div>
          <span>MODEL A · CLOSED-LOOP TEST</span>
          <h3 id="closed-loop-auto-title">ทดลอง Auto แบบต่อเนื่อง</h3>
          <p>
            อุณหภูมิกำหนดงบแสง แล้วขยับม่านครั้งละ Step จากตำแหน่งจริง
            · ทดลองบนหน้า Dev ได้ หรือบันทึก Model A ฉบับเต็มลง ESP32 เพื่อให้ทำงานต่อเมื่อปิดเว็บ
          </p>
        </div>
        <b>
          {isContinuousEnabled ? "กำลังควบคุมจริง" : "Preview เท่านั้น"}
        </b>
      </header>

      <div className={styles.metrics}>
        <div>
          <span>ช่วงอุณหภูมิ</span>
          <strong>{result.bandLabel ?? "—"}</strong>
        </div>
        <div>
          <span>ช่วงแสงที่ยอมรับ</span>
          <strong>
            {result.highLux === null
              ? "—"
              : `${result.lowLux}–${result.highLux} lux`}
          </strong>
        </div>
        <div>
          <span>Step ปัจจุบัน</span>
          <strong>{result.stepPercent}%</strong>
        </div>
      </div>

      <div className={styles.decision}>
        <span>ผลจากข้อมูลชุดล่าสุด</span>
        <strong>{actionLabels[result.action]}</strong>
        {targetPercent !== null && (
          <b>
            {currentPositionPercent === null
              ? ""
              : `${currentPositionPercent.toFixed(1)}% → `}
            {targetPercent}%
          </b>
        )}
      </div>

      <ul className={styles.reasons}>
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <section
        className={styles.continuousControl}
        aria-labelledby="model-a-continuous-title"
      >
        <div className={styles.runtimeHeading}>
          <div>
            <span>REAL MOTOR · CONTINUOUS</span>
            <strong id="model-a-continuous-title">
              Model A Runtime
            </strong>
          </div>
          <b>
            {runtime.phase === "cooldown"
              ? `${runtime.cooldownRemainingSeconds}s`
              : `${Math.min(
                  runtime.confirmationCount,
                  MODEL_A_CONFIRMATION_READINGS,
                )}/${MODEL_A_CONFIRMATION_READINGS}`}
          </b>
        </div>

        <p className={styles.runtimeStatus} aria-live="polite">
          {runtimeLabels[runtime.phase]} · {statusMessage}
        </p>

        {displayedBlockers.length > 0 ? (
          <ul className={styles.blockers}>
            {displayedBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.readyMessage}>
            ระบบความปลอดภัยพร้อม Model A จะรอผลเดิมครบสองรอบก่อนขยับ
          </p>
        )}

        <label className={styles.safetyCheck}>
          <input
            type="checkbox"
            checked={safetyConfirmed}
            disabled={
              isContinuousEnabled ||
              startBlockers.length > 0 ||
              runtime.phase === "fault"
            }
            onChange={(event) =>
              setSafetyConfirmed(event.target.checked)
            }
          />
          ฉันตรวจ Encoder, FC-33, STOP และจะเปิดหน้า Dev เฝ้าระหว่างทดสอบ
        </label>

        <div className={styles.continuousActions}>
          <button
            type="button"
            className={styles.startButton}
            disabled={
              isContinuousEnabled ||
              !safetyConfirmed ||
              runtime.phase === "fault" ||
              startBlockers.length > 0
            }
            onClick={startContinuous}
          >
            {isContinuousEnabled
              ? "Model A กำลังทำงาน"
              : "เริ่มทำงานต่อเนื่อง"}
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

        <small>
          ต้องเปิดและมองเห็นหน้า Dev ไว้ หากซ่อนแท็บ เปลี่ยนเป็น Manual
          หรือพบความผิดปกติ ระบบจะยกเลิกการทำงานและส่ง STOP
        </small>
      </section>

      <section className={styles.continuousControl} aria-label="Model A บน ESP32">
        <div className={styles.runtimeHeading}>
          <div>
            <span>ESP32 · ALWAYS-ON</span>
            <strong>Model A บนบอร์ด</strong>
          </div>
          <b>
            {deviceAutoEnabled && deviceAutoStatus?.presetId === "model-a"
              ? "กำลังทำงาน"
              : "ยังไม่เปิด"}
          </b>
        </div>
        <p className={styles.runtimeStatus} aria-live="polite">
          {deviceAutoMessage ??
            (deviceAutoStatus?.presetId === "model-a"
              ? `สถานะ ESP32: ${deviceAutoStatus.phase} · ${deviceAutoStatus.reason}`
              : "ใช้กฎอุณหภูมิกำหนดงบแสง ยืนยัน 2 รอบ ขยับทีละ Step และพัก 15 วินาที")}
        </p>
        <label className={styles.safetyCheck}>
          <input
            type="checkbox"
            checked={deviceSafetyConfirmed}
            disabled={deviceAutoPending || deviceAutoEnabled || deviceStartBlockers.length > 0}
            onChange={(event) => setDeviceSafetyConfirmed(event.target.checked)}
          />
          ฉันตรวจ Encoder, FC-33 และ STOP แล้ว และจะเฝ้าทดสอบก่อนปิดเว็บ
        </label>
        <div className={styles.continuousActions}>
          <button
            type="button"
            className={styles.startButton}
            disabled={deviceAutoPending || !deviceSafetyConfirmed || isContinuousEnabled || deviceStartBlockers.length > 0}
            onClick={startDeviceModelA}
          >
            บันทึกและเปิดบน ESP32
          </button>
          <button
            type="button"
            className={styles.stopButton}
            disabled={deviceAutoPending || !deviceAutoEnabled || deviceAutoStatus?.presetId !== "model-a"}
            onClick={stopDeviceModelA}
          >
            ปิด Model A บน ESP32
          </button>
        </div>
        <small>เมื่อเปิดบน ESP32 แล้ว การซ่อนหรือปิดหน้า Dev จะไม่หยุด Auto ใช้ STOP เมื่อต้องหยุดม่านทันที</small>
      </section>

      {result.state.resolutionLimited && (
        <div className={styles.limitWarning} role="alert">
          <p>
            ระบบล็อกไว้เพื่อไม่ให้ม่านสลับทิศซ้ำใกล้เส้นแบ่ง
          </p>
          <button
            type="button"
            disabled={isContinuousEnabled}
            onClick={resetLab}
          >
            ตรวจตำแหน่งแล้ว เริ่มคำนวณใหม่
          </button>
        </div>
      )}

      <footer>
        <span>
          สถานะ: {isContinuousEnabled ? "ควบคุมจริง" : "คำนวณอย่างเดียว"}
        </span>
        <button
          type="button"
          disabled={isContinuousEnabled}
          onClick={resetLab}
        >
          รีเซ็ตสถานะ Model A
        </button>
      </footer>

      <small>
        Runtime นี้อยู่ในเบราว์เซอร์ ยังไม่ใช่ Always-on Auto ใน ESP32
        เมื่อปิดหน้าเว็บ Model A จะไม่เริ่มคำสั่งรอบใหม่
      </small>
    </section>
  );
}
