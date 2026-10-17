import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_AUTO_RUNTIME_STATE,
  advanceAutoRuntime,
  beginAutoCommand,
  failAutoCommand,
  getCooldownRemainingSeconds,
  observeAutoMotor,
  restoreAutoCooldown,
  tickAutoRuntime,
} from "./auto-runtime.ts";

function sample(
  state,
  sampleId,
  candidateKey = "balanced:adjust:65",
  targetPercent = 65,
  confirmationReadings = 3,
) {
  return advanceAutoRuntime(state, {
    sampleId,
    candidateKey,
    targetPercent,
    confirmationReadings,
    nowMs: Number(sampleId.replace(/\D/g, "")) || 1,
  });
}

test("ต้องพบผลเดิมครบ 3 ตัวอย่างก่อนเข้าสถานะพร้อม", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1");
  assert.equal(state.phase, "confirming");
  assert.equal(state.confirmationCount, 1);

  state = sample(state, "sample-2");
  assert.equal(state.confirmationCount, 2);

  state = sample(state, "sample-3");
  assert.equal(state.phase, "ready");
  assert.equal(state.confirmationCount, 3);
});

test("ตัวอย่างเดิมห้ามถูกนับซ้ำจากการ render", () => {
  const first = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1");
  const duplicate = sample(first, "sample-1");

  assert.equal(duplicate.confirmationCount, 1);
});

test("เพิ่มจำนวนครั้งที่ต้องยืนยันต้องยกเลิกสถานะพร้อม", () => {
  let state = sample(
    INITIAL_AUTO_RUNTIME_STATE,
    "sample-1",
    "x",
    65,
    1,
  );
  assert.equal(state.phase, "ready");

  state = sample(state, "sample-1", "x", 65, 2);
  assert.equal(state.phase, "confirming");
  assert.equal(state.confirmationCount, 1);
});

test("เป้าหมายเปลี่ยนต้องเริ่มยืนยันใหม่", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1");
  state = sample(state, "sample-2");
  state = sample(state, "sample-3", "balanced:adjust:40", 40);

  assert.equal(state.phase, "confirming");
  assert.equal(state.confirmationCount, 1);
  assert.equal(state.targetPercent, 40);
});

test("ผล hold หรือ waiting ต้องล้างจำนวนการยืนยัน", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1");
  state = advanceAutoRuntime(state, {
    sampleId: "sample-2",
    candidateKey: null,
    targetPercent: null,
    confirmationReadings: 3,
    nowMs: 2,
  });

  assert.equal(state.phase, "waiting");
  assert.equal(state.confirmationCount, 0);
});

test("เริ่มคำสั่งได้เฉพาะเมื่อยืนยันครบและเป้าหมายตรงกัน", () => {
  const confirming = sample(
    INITIAL_AUTO_RUNTIME_STATE,
    "sample-1",
  );
  const blocked = beginAutoCommand(confirming, 65, 1000);
  assert.equal(blocked.phase, "confirming");

  let ready = sample(confirming, "sample-2");
  ready = sample(ready, "sample-3");
  const wrongTarget = beginAutoCommand(ready, 40, 1000);
  assert.equal(wrongTarget.phase, "ready");

  const command = beginAutoCommand(ready, 65, 1000);
  assert.equal(command.phase, "commanding");
});

test("Cooldown เริ่มหลังเห็นมอเตอร์ทำงานแล้วหยุด", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1", "x", 65, 1);
  state = beginAutoCommand(state, 65, 1000);
  state = observeAutoMotor(state, {
    isMotorRunning: true,
    currentPositionPercent: 55,
    cooldownSeconds: 120,
    nowMs: 1500,
  });
  assert.equal(state.phase, "moving");

  state = observeAutoMotor(state, {
    isMotorRunning: false,
    currentPositionPercent: 64,
    cooldownSeconds: 120,
    nowMs: 2500,
  });
  assert.equal(state.phase, "cooldown");
  assert.equal(getCooldownRemainingSeconds(state), 120);
});

test("การขยับสั้นที่ polling ไม่เห็น running ใช้ตำแหน่ง Encoder ยืนยันได้", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1", "x", 65, 1);
  state = beginAutoCommand(state, 65, 1000);
  state = observeAutoMotor(state, {
    isMotorRunning: false,
    currentPositionPercent: 65.8,
    cooldownSeconds: 30,
    nowMs: 1800,
  });

  assert.equal(state.phase, "cooldown");
  assert.equal(getCooldownRemainingSeconds(state), 30);
});

test("ระหว่าง Cooldown ห้ามนับข้อมูลใหม่ และหมดเวลาแล้วจึงรอชุดถัดไป", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1", "x", 65, 1);
  state = beginAutoCommand(state, 65, 1000);
  state = observeAutoMotor(state, {
    isMotorRunning: false,
    currentPositionPercent: 65,
    cooldownSeconds: 10,
    nowMs: 2000,
  });

  const duringCooldown = sample(state, "sample-2", "x", 65, 1);
  assert.equal(duringCooldown.phase, "cooldown");
  assert.equal(duringCooldown.confirmationCount, 0);

  const finished = tickAutoRuntime(duringCooldown, 12000);
  assert.equal(finished.phase, "waiting");
  assert.equal(getCooldownRemainingSeconds(finished), 0);
});

test("กู้ Cooldown หลังรีเฟรชได้โดยไม่กู้จำนวนการยืนยันเก่า", () => {
  const restored = restoreAutoCooldown(
    INITIAL_AUTO_RUNTIME_STATE,
    62000,
    2000,
  );

  assert.equal(restored.phase, "cooldown");
  assert.equal(restored.confirmationCount, 0);
  assert.equal(getCooldownRemainingSeconds(restored), 60);
});

test("คำสั่งล้มเหลวต้องเข้าสถานะ fault และไม่พร้อมส่งซ้ำ", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1", "x", 65, 1);
  state = beginAutoCommand(state, 65, 1000);
  state = failAutoCommand(state, "ส่งคำสั่งไม่สำเร็จ", 1200);

  assert.equal(state.phase, "fault");
  assert.equal(state.confirmationCount, 0);
  assert.match(state.faultMessage, /ไม่สำเร็จ/);
});

test("ถ้า ESP32 ไม่ยืนยันการเริ่มมอเตอร์ภายใน 15 วินาทีให้ fault", () => {
  let state = sample(INITIAL_AUTO_RUNTIME_STATE, "sample-1", "x", 65, 1);
  state = beginAutoCommand(state, 65, 1000);
  state = observeAutoMotor(state, {
    isMotorRunning: false,
    currentPositionPercent: 20,
    cooldownSeconds: 30,
    nowMs: 16000,
  });

  assert.equal(state.phase, "fault");
  assert.match(state.faultMessage, /15 วินาที/);
});
