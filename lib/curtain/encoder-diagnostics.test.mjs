import test from "node:test";
import assert from "node:assert/strict";
import { getEncoderSignalState } from "./encoder-diagnostics.ts";

test("พบ Pulse ทั้ง A และ B", () => {
  assert.equal(getEncoderSignalState(12, 11), "both");
});

test("พบเฉพาะ A ต้องสงสัยสาย B", () => {
  assert.equal(getEncoderSignalState(8, 0), "a-only");
});

test("พบเฉพาะ B ต้องสงสัยสาย A", () => {
  assert.equal(getEncoderSignalState(0, 9), "b-only");
});

test("ไม่มี Pulse จากทั้งสองช่อง", () => {
  assert.equal(getEncoderSignalState(0, 0), "none");
});
