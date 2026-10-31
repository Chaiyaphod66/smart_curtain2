"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  getCustomVoicePhraseError,
  normalizeVoiceTranscript,
  parseVoiceCommand,
  VOICE_COMMAND_DEFINITIONS,
  type CustomVoiceCommandAlias,
  type VoiceCommand,
} from "@/lib/curtain/voice-command";
import AppIcon from "./AppIcon";
import styles from "./UserPages.module.css";

const CUSTOM_VOICE_STORAGE_KEY = "smart-curtain.voice-aliases.v1";
const MAX_CUSTOM_ALIASES = 20;

const VOICE_COMMAND_HELP_GROUPS = [
  {
    title: "ควบคุมม่าน",
    commands: [
      "เปิดม่าน / เปิดม่านสุด",
      "ปิดม่าน / ปิดม่านสุด",
      "หยุด / หยุดม่าน / หยุดฉุกเฉิน / พอแล้ว",
    ],
  },
  {
    title: "ระบุตำแหน่ง 0–100%",
    commands: [
      "เปิดม่าน 75%",
      "เลื่อนม่านไปที่ 40%",
      "ตั้งม่าน 50%",
      "ปรับม่านไว้ที่ 25%",
    ],
  },
  {
    title: "เปลี่ยนโหมด",
    commands: ["โหมดแมนนวล / แมนนวล / manual"],
  },
  {
    title: "Auto พรีเซ็ต",
    commands: [
      "ออโต้ตามอุณหภูมิ / ออโต้กันร้อน",
      "ออโต้ตามแสง",
      "ออโต้สมดุล / เปิดออโต้",
    ],
  },
  {
    title: "Model A",
    commands: ["เปิดโมเดลเอ / ใช้โมเดลเอ / ออโต้โมเดลเอ / model a"],
  },
] as const;

type SpeechRecognitionResultLike = {
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceCommandPanelProps = {
  isOnline: boolean;
  isBusy: boolean;
  onExecute: (command: VoiceCommand) => Promise<string>;
};

type CustomAction =
  | "position"
  | "stop"
  | "manual"
  | "heat-auto"
  | "light-auto"
  | "balanced-auto"
  | "model-a";

function subscribeToSpeechSupport() {
  return () => undefined;
}

function getSpeechSupportSnapshot() {
  const speechWindow = window as SpeechWindow;

  return Boolean(
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition,
  );
}

function isVoiceCommand(value: unknown): value is VoiceCommand {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VoiceCommand> & {
    percent?: unknown;
    optionId?: unknown;
  };
  if (typeof candidate.label !== "string") return false;

  if (candidate.type === "stop" || candidate.type === "manual-mode" || candidate.type === "model-a") {
    return true;
  }
  if (candidate.type === "position") {
    return (
      typeof candidate.percent === "number" &&
      Number.isInteger(candidate.percent) &&
      candidate.percent >= 0 &&
      candidate.percent <= 100
    );
  }
  if (candidate.type === "auto-preset") {
    return ["heat-standard", "light-standard", "balanced-standard"].includes(
      String(candidate.optionId),
    );
  }
  return false;
}

function readStoredAliases(): CustomVoiceCommandAlias[] {
  try {
    const rawValue = window.localStorage.getItem(CUSTOM_VOICE_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    const normalizedPhrases = new Set<string>();
    const aliases: CustomVoiceCommandAlias[] = [];

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<CustomVoiceCommandAlias>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.phrase !== "string" ||
        !isVoiceCommand(candidate.command)
      ) {
        continue;
      }

      const normalized = normalizeVoiceTranscript(candidate.phrase);
      if (!normalized || normalizedPhrases.has(normalized)) continue;
      normalizedPhrases.add(normalized);
      aliases.push({
        id: candidate.id,
        phrase: candidate.phrase,
        command: candidate.command,
      });
      if (aliases.length >= MAX_CUSTOM_ALIASES) break;
    }

    return aliases;
  } catch {
    return [];
  }
}

function createCommand(action: CustomAction, percent: number): VoiceCommand {
  switch (action) {
    case "stop":
      return { type: "stop", label: "หยุดม่านทันที" };
    case "manual":
      return { type: "manual-mode", label: "เปลี่ยนเป็นโหมด Manual" };
    case "heat-auto":
      return {
        type: "auto-preset",
        optionId: "heat-standard",
        label: "ใช้ Auto ตามอุณหภูมิแบบมาตรฐาน",
      };
    case "light-auto":
      return {
        type: "auto-preset",
        optionId: "light-standard",
        label: "ใช้ Auto ตามแสงแบบมาตรฐาน",
      };
    case "balanced-auto":
      return {
        type: "auto-preset",
        optionId: "balanced-standard",
        label: "ใช้ Auto สมดุลแบบมาตรฐาน",
      };
    case "model-a":
      return { type: "model-a", label: "ใช้ Auto แบบ Model A" };
    case "position":
      return {
        type: "position",
        percent,
        label: `เลื่อนม่านไปที่ ${percent}%`,
      };
  }
}

export default function VoiceCommandPanel({
  isOnline,
  isBusy,
  onExecute,
}: VoiceCommandPanelProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    () => false,
  );
  const [isListening, setIsListening] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customAliases, setCustomAliases] = useState<CustomVoiceCommandAlias[]>([]);
  const [customPhrase, setCustomPhrase] = useState("");
  const [customAction, setCustomAction] = useState<CustomAction>("position");
  const [customPercent, setCustomPercent] = useState(50);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      setCustomAliases(readStoredAliases());
    }, 0);

    return () => {
      window.clearTimeout(storageTimer);
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  function persistAliases(nextAliases: CustomVoiceCommandAlias[]): boolean {
    try {
      window.localStorage.setItem(
        CUSTOM_VOICE_STORAGE_KEY,
        JSON.stringify(nextAliases),
      );
      setCustomAliases(nextAliases);
      return true;
    } catch {
      setCustomError("บันทึกคำพูดไม่ได้ พื้นที่จัดเก็บของ browser อาจไม่พร้อม");
      return false;
    }
  }

  async function execute(command: VoiceCommand) {
    if (!isOnline) {
      setMessage(null);
      setError("ESP32 ออฟไลน์ จึงไม่ส่งคำสั่ง");
      return;
    }

    if (command.type !== "stop" && (isExecuting || isBusy)) {
      setMessage(null);
      setError("ม่านหรือระบบกำลังทำงาน จึงไม่ส่งคำสั่งใหม่");
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const result = await onExecute(command);
      setMessage(result);
    } catch (executionError) {
      setMessage(null);
      setError(
        executionError instanceof Error
          ? executionError.message
          : "ทำตามคำสั่งเสียงไม่สำเร็จ",
      );
    } finally {
      setIsExecuting(false);
    }
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition || isListening) return;

    setError(null);
    setMessage(null);
    setTranscript("");

    const recognition = new Recognition();
    recognition.lang = "th-TH";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (errorEvent) => {
      setIsListening(false);

      const code = errorEvent.error;

      if (code === "no-speech") {
        setError("ไม่ได้ยินเสียงพูด ลองกดไมค์แล้วพูดใหม่อีกครั้ง");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setError("ไม่มีสิทธิ์ใช้ไมโครโฟน กรุณาอนุญาตให้เว็บไซต์เข้าถึงไมค์");
      } else if (code === "network") {
        setError("เชื่อมต่อบริการแปลเสียงไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต");
      } else if (code === "aborted") {
        setError(null);
      } else {
        setError("รับเสียงไม่สำเร็จ ลองกดไมค์แล้วพูดใหม่อีกครั้ง");
      }
    };
    recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      const heardText = latestResult?.[0]?.transcript?.trim() ?? "";
      const command = parseVoiceCommand(heardText, customAliases);

      setTranscript(heardText);

      if (!command) {
        setError("ไม่พบคำสั่งที่ตรงกัน หรือเป็นประโยคกำกวม ระบบจะไม่เดาและจะไม่ขยับม่าน");
        return;
      }

      setMessage(
        command.type === "stop"
          ? "ได้ยินคำสั่ง STOP กำลังส่งทันที..."
          : `ตรวจพบ “${command.label}” กำลังตรวจความปลอดภัยและส่งคำสั่ง...`,
      );
      void execute(command);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("เปิดไมโครโฟนไม่ได้ กรุณาตรวจสิทธิ์ไมโครโฟนของเว็บไซต์");
    }
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    startListening();
  }

  function handleAddAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomError(null);
    setCustomMessage(null);

    if (customAliases.length >= MAX_CUSTOM_ALIASES) {
      setCustomError(`เพิ่มได้สูงสุด ${MAX_CUSTOM_ALIASES} วลี`);
      return;
    }

    const phrase = customPhrase.trim();
    const phraseError = getCustomVoicePhraseError(phrase, customAliases);
    if (phraseError) {
      setCustomError(phraseError);
      return;
    }

    const alias: CustomVoiceCommandAlias = {
      id:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `voice-${Date.now()}`,
      phrase,
      command: createCommand(customAction, customPercent),
    };

    if (persistAliases([...customAliases, alias])) {
      setCustomPhrase("");
      setCustomMessage(`เพิ่ม “${phrase}” แล้ว`);
    }
  }

  function removeAlias(id: string) {
    const alias = customAliases.find((candidate) => candidate.id === id);
    if (!alias) return;
    if (persistAliases(customAliases.filter((candidate) => candidate.id !== id))) {
      setCustomError(null);
      setCustomMessage(`ลบ “${alias.phrase}” แล้ว`);
    }
  }

  const examples = VOICE_COMMAND_DEFINITIONS.slice(0, 7).map(
    (definition) => definition.phrases[0],
  );

  return (
    <section className={styles.voicePanel} aria-labelledby="voice-command-title">
      <div className={styles.voiceHeading}>
        <div>
          <p className={styles.sectionLabel}>คำสั่งเสียง</p>
          <h2 id="voice-command-title">พูดเป็นประโยคธรรมชาติได้มากขึ้น</h2>
          <p>
            ระบบเข้าใจคำสุภาพ ตัวเลข 0–100 และเลขภาษาไทย แต่จะไม่เดาคำสั่งกำกวม
            เมื่อรู้จำสำเร็จจะส่งคำสั่งทันที โดยยังตรวจโหมด ลิมิต Encoder และ fault ก่อนทำงาน
          </p>
          <p>ตัวอย่าง “ช่วยเปิดม่าน 75% หน่อยครับ”</p>
        </div>
        <button
          type="button"
          className={isListening ? styles.voiceListening : styles.voiceButton}
          disabled={!isSupported || !isOnline || isExecuting}
          aria-pressed={isListening}
          onClick={toggleListening}
        >
          <AppIcon name="microphone" size={17} />
          {isListening ? "กดเพื่อจบการพูด" : "กดแล้วพูด"}
        </button>
      </div>

      {!isSupported && (
        <p className={styles.voiceWarning} role="alert">
          Browser นี้ไม่รองรับการรับเสียง แนะนำ Chrome หรือ Edge รุ่นปัจจุบัน
        </p>
      )}

      <div className={styles.voiceExamples} aria-label="ตัวอย่างคำสั่งเสียง">
        {examples.map((example) => (
          <span key={example}>“{example}”</span>
        ))}
      </div>

      <details className={styles.voiceCommandGuide}>
        <summary>
          <span>ดูคำสั่งที่พูดได้</span>
          <small>คำสั่งมาตรฐานและคำพูดของฉัน</small>
        </summary>
        <div className={styles.voiceCommandGuideBody}>
          <p>
            พูดคำสุภาพเพิ่มได้ เช่น “ช่วย…หน่อยครับ” และเปลี่ยนตัวเลขตำแหน่งเป็นค่าใดก็ได้ตั้งแต่ 0–100%
          </p>
          <div className={styles.voiceCommandGuideGrid}>
            {VOICE_COMMAND_HELP_GROUPS.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.commands.map((command) => (
                    <li key={command}>“{command}”</li>
                  ))}
                </ul>
              </section>
            ))}
            <section>
              <h3>คำพูดที่เพิ่มเอง</h3>
              {customAliases.length > 0 ? (
                <ul>
                  {customAliases.map((alias) => (
                    <li key={alias.id}>
                      “{alias.phrase}” <small>→ {alias.command.label}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>ยังไม่มีคำพูดที่เพิ่มเอง</p>
              )}
            </section>
          </div>
        </div>
      </details>

      <details className={styles.voiceCustomManager}>
        <summary>
          <span>เพิ่มคำพูดของฉัน</span>
          <small>{customAliases.length}/{MAX_CUSTOM_ALIASES} วลี</small>
        </summary>
        <form className={styles.voiceCustomForm} onSubmit={handleAddAlias}>
          <label>
            <span>เมื่อพูดว่า</span>
            <input
              type="text"
              maxLength={80}
              value={customPhrase}
              onChange={(event) => setCustomPhrase(event.target.value)}
              placeholder="เช่น รับแสงอ่านหนังสือ"
            />
          </label>
          <label>
            <span>ให้ระบบทำ</span>
            <select
              value={customAction}
              onChange={(event) => setCustomAction(event.target.value as CustomAction)}
            >
              <option value="position">ไปยังตำแหน่ง</option>
              <option value="stop">หยุดม่านทันที</option>
              <option value="manual">เปลี่ยนเป็น Manual</option>
              <option value="heat-auto">Auto ตามอุณหภูมิ</option>
              <option value="light-auto">Auto ตามแสง</option>
              <option value="balanced-auto">Auto สมดุล</option>
              <option value="model-a">Auto แบบ Model A</option>
            </select>
          </label>
          {customAction === "position" && (
            <label className={styles.voicePercentField}>
              <span>ตำแหน่ง</span>
              <div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={customPercent}
                  onChange={(event) =>
                    setCustomPercent(
                      Math.min(100, Math.max(0, Number(event.target.value))),
                    )
                  }
                />
                <span>%</span>
              </div>
            </label>
          )}
          <button type="submit">เพิ่มวลี</button>
        </form>

        {(customMessage || customError) && (
          <p
            className={customError ? styles.voiceCustomError : styles.voiceCustomMessage}
            role={customError ? "alert" : "status"}
          >
            {customError ?? customMessage}
          </p>
        )}

        {customAliases.length > 0 ? (
          <ul className={styles.voiceAliasList}>
            {customAliases.map((alias) => (
              <li key={alias.id}>
                <div>
                  <strong>“{alias.phrase}”</strong>
                  <span>{alias.command.label}</span>
                </div>
                <button type="button" onClick={() => removeAlias(alias.id)}>
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.voiceAliasEmpty}>ยังไม่มีคำพูดที่เพิ่มเอง</p>
        )}
        <p className={styles.voiceStorageNote}>
          คำพูดที่เพิ่มจะเก็บเฉพาะใน browser เครื่องนี้ ไม่ต้องใช้ฐานข้อมูล
        </p>
      </details>

      <p className={styles.helperText}>
        การรับเสียงขึ้นอยู่กับ browser และอาจส่งเสียงไปประมวลผลออนไลน์
        ใช้ปุ่ม STOP บนหน้าจอเมื่อต้องหยุดโดยไม่รอการแปลเสียง
      </p>

      {(transcript || message || error) && (
        <div className={styles.voiceResult} aria-live="polite">
          {transcript && <p>ได้ยิน: “{transcript}”</p>}
          {(message || error) && (
            <small className={error ? styles.voiceError : undefined}>
              {error ?? message}
            </small>
          )}
        </div>
      )}
    </section>
  );
}
