import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_AUTO_PREVIEW_STATE,
  advanceAutoPreview,
  getAutoSuggestion,
  getLightLevel,
} from "./auto-preview.ts";

test("จำแนกระดับแสงตาม threshold", () => {
  assert.equal(getLightLevel(300), "dim");
  assert.equal(getLightLevel(720), "normal");
  assert.equal(getLightLevel(1200), "bright");
  assert.equal(getLightLevel(null), "unavailable");
});

test("ต้องได้ระดับเดิมครบ 3 ครั้งก่อนยืนยัน", () => {
  const first = advanceAutoPreview(
    INITIAL_AUTO_PREVIEW_STATE,
    300,
  );
  const second = advanceAutoPreview(first, 320);
  const third = advanceAutoPreview(second, 350);

  assert.equal(first.stableLevel, "unavailable");
  assert.equal(first.candidateCount, 1);
  assert.equal(second.candidateCount, 2);
  assert.equal(third.stableLevel, "dim");
  assert.equal(getAutoSuggestion(third.stableLevel), "open");
});

test("ค่าที่แกว่งข้ามระดับต้องเริ่มนับใหม่", () => {
  const first = advanceAutoPreview(
    INITIAL_AUTO_PREVIEW_STATE,
    300,
  );
  const changed = advanceAutoPreview(first, 1200);

  assert.equal(changed.candidateLevel, "bright");
  assert.equal(changed.candidateCount, 1);
  assert.equal(changed.stableLevel, "unavailable");
});

test("ไม่มีค่าแสงต้องล้างสถานะ preview", () => {
  const first = advanceAutoPreview(
    INITIAL_AUTO_PREVIEW_STATE,
    300,
  );
  const reset = advanceAutoPreview(first, null);

  assert.deepEqual(reset, INITIAL_AUTO_PREVIEW_STATE);
});
