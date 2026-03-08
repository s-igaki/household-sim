import { describe, it, expect } from "vitest";
import { fmt, fmtYen } from "./format.js";

describe("fmt", () => {
  it("1万未満は「○万」形式", () => {
    expect(fmt(500)).toBe("500万");
    expect(fmt(9999)).toBe("9999万");
  });

  it("1億以上は「○億」形式", () => {
    expect(fmt(10000)).toBe("1.0億");
    expect(fmt(25000)).toBe("2.5億");
  });

  it("マイナスも同様にフォーマット", () => {
    expect(fmt(-5000)).toBe("-5000万");
    expect(fmt(-15000)).toBe("-1.5億");
  });
});

describe("fmtYen", () => {
  it("数値を万円表示にフォーマット", () => {
    expect(fmtYen(500)).toContain("500");
    expect(fmtYen(1000)).toContain("1,000");
    expect(fmtYen(12345)).toContain("12,345");
  });

  it("「万円」が含まれる", () => {
    expect(fmtYen(500)).toMatch(/万円$/);
  });
});
