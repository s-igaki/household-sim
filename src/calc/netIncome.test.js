import { describe, it, expect } from "vitest";
import { calcNetIncome } from "./netIncome.js";

describe("calcNetIncome", () => {
  it("年収0円の場合は0を返す", () => {
    expect(calcNetIncome(0)).toBe(0);
    expect(calcNetIncome(-1000)).toBe(0);
  });

  it("年収300万円の場合、手取りが正しく計算される", () => {
    const result = calcNetIncome(3_000_000);
    expect(result).toBeGreaterThan(2_000_000);
    expect(result).toBeLessThan(3_000_000);
    // 概算: 社会保険15%、給与所得控除、所得税・住民税を差し引いた額
  });

  it("年収500万円の場合、手取りが正しく計算される", () => {
    const result = calcNetIncome(5_000_000);
    expect(result).toBeGreaterThan(3_500_000);
    expect(result).toBeLessThan(5_000_000);
  });

  it("年収600万円（600万）の場合、手取りが概ね400万前後になる", () => {
    const result = calcNetIncome(6_000_000);
    expect(result).toBeGreaterThan(4_000_000);
    expect(result).toBeLessThan(5_000_000);
  });

  it("年収が高くなるほど手取りの割合が下がる（累進課税）", () => {
    const low = calcNetIncome(3_000_000) / 3_000_000;
    const high = calcNetIncome(10_000_000) / 10_000_000;
    expect(high).toBeLessThan(low);
  });

  it("戻り値は整数である", () => {
    expect(Number.isInteger(calcNetIncome(5_500_000))).toBe(true);
  });
});
