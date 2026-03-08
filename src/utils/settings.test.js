import { describe, it, expect } from "vitest";
import { getSettingsSnapshot, applySnapshot } from "./settings.js";

describe("getSettingsSnapshot", () => {
  it("stateをスナップショット形式に変換する", () => {
    const state = {
      startAge: 30,
      initialAssets: 500,
      grossIncomeHusband: 600,
      grossIncomeWife: 200,
      incomeGrowthRate: 2,
      livingExpenseRatio: 50,
      specialExpenseRatio: 10,
      retirementAge: 65,
      pensionMonthly: 15,
      inflationPhases: [{ startAge: 30, rate: 1 }],
      buyProperty: true,
      propertyPrice: 5000,
      downPayment: 500,
      loanRate: 0.8,
      loanYears: 35,
      finalPropertyRatio: 40,
      purchaseAge: 35,
      rentBeforePurchase: 10,
      rentPhases: [{ rent: 10, startAge: 30 }],
      numChildren: 1,
      children: [{ parentAgeAtBirth: 32, privateSchool: false }],
      investPhases: [{ startAge: 30, rate: 5, ratio: 80 }],
      carOwnership: false,
      carAnnualCost: 50,
      insuranceAnnual: 24,
    };
    const snap = getSettingsSnapshot(state);
    expect(snap.version).toBe(1);
    expect(snap.savedAt).toBeDefined();
    expect(snap.basic.initialAssets).toBe(500);
    expect(snap.basic.grossIncomeHusband).toBe(600);
    expect(snap.housing.buyProperty).toBe(true);
    expect(snap.children.numChildren).toBe(1);
  });
});

describe("applySnapshot", () => {
  it("basic がない場合は null", () => {
    expect(applySnapshot(null)).toBeNull();
    expect(applySnapshot({})).toBeNull();
  });

  it("スナップショットから設定オブジェクトを復元", () => {
    const snap = {
      basic: {
        startAge: 25,
        initialAssets: 300,
        grossIncomeHusband: 500,
        grossIncomeWife: 0,
        incomeGrowthRate: 2,
        livingExpenseRatio: 45,
        specialExpenseRatio: 10,
        retirementAge: 65,
        pensionMonthly: 12,
        inflationRate: 1,
      },
      housing: {
        buyProperty: false,
        propertyPrice: 4000,
        downPayment: 400,
        loanRate: 0.5,
        loanYears: 30,
        finalPropertyRatio: 50,
        purchaseAge: 38,
        rentPhases: [{ rent: 12, startAge: 30 }],
      },
      children: {
        numChildren: 2,
        children: [
          { parentAgeAtBirth: 30, privateSchool: false },
          { parentAgeAtBirth: 32, privateSchool: true },
        ],
      },
      invest: { investRate: 6, investRatio: 90 },
      extra: {
        carOwnership: true,
        carAnnualCost: 60,
        insuranceAnnual: 30,
      },
    };
    const applied = applySnapshot(snap);
    expect(applied.startAge).toBe(25);
    expect(applied.initialAssets).toBe(300);
    expect(applied.grossIncomeHusband).toBe(500);
    expect(applied.numChildren).toBe(2);
    expect(applied.children).toHaveLength(2);
    // 旧形式（investRate/investRatio）から investPhases に変換される
    expect(applied.investPhases).toEqual([{ startAge: 25, rate: 6, ratio: 90 }]);
  });

  it("省略されたセクションはデフォルト値を使用", () => {
    const snap = {
      basic: {
        initialAssets: 100,
        grossIncomeHusband: 400,
        grossIncomeWife: 0,
        incomeGrowthRate: 1,
        livingExpenseRatio: 50,
        specialExpenseRatio: 5,
        retirementAge: 65,
        pensionMonthly: 10,
        inflationRate: 1,
      },
    };
    const applied = applySnapshot(snap);
    expect(applied.buyProperty).toBe(false);
    expect(applied.propertyPrice).toBe(5000);
    expect(applied.numChildren).toBe(1);
  });
});
