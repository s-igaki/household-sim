import { describe, it, expect } from "vitest";
import { runSimulation } from "./simulation.js";

const defaultParams = {
  initialAssets: 500,
  grossIncomeHusband: 600,
  grossIncomeWife: 0,
  incomeGrowthRate: 2,
  livingExpenseRatio: 50,
  specialExpenseRatio: 10,
  retirementAge: 65,
  pensionMonthly: 15,
  inflationRate: 1,
  buyProperty: false,
  propertyPrice: 5000,
  downPayment: 500,
  loanRate: 0.8,
  loanYears: 35,
  finalPropertyRatio: 40,
  purchaseAge: 35,
  rentBeforePurchase: 10,
  rentPhases: [{ rent: 10, startAge: 30 }],
  numChildren: 0,
  children: [],
  investRate: 5,
  investRatio: 80,
  carOwnership: false,
  carAnnualCost: 50,
  insuranceAnnual: 24,
};

describe("runSimulation", () => {
  it("30歳から85歳まで56年分のデータを返す", () => {
    const data = runSimulation(defaultParams);
    expect(data).toHaveLength(56);
    expect(data[0].age).toBe(30);
    expect(data[55].age).toBe(85);
  });

  it("各年齢のデータに必要なキーが含まれる", () => {
    const data = runSimulation(defaultParams);
    const first = data[0];
    expect(first).toHaveProperty("age");
    expect(first).toHaveProperty("金融資産");
    expect(first).toHaveProperty("純資産");
    expect(first).toHaveProperty("年収手取り");
    expect(first).toHaveProperty("年間支出");
    expect(first).toHaveProperty("年間貯蓄");
  });

  it("初期資産が反映される", () => {
    const data = runSimulation({ ...defaultParams, initialAssets: 1000 });
    expect(data[0].金融資産).toBeGreaterThanOrEqual(900);
  });

  it("退職後は年金収入になる", () => {
    const data = runSimulation({
      ...defaultParams,
      retirementAge: 65,
      pensionMonthly: 20,
    });
    const age64 = data.find((d) => d.age === 64);
    const age65 = data.find((d) => d.age === 65);
    expect(age65.年収手取り).toBe(20 * 12); // 年金240万
  });

  it("賃貸の場合は住居費が賃料ベース", () => {
    const data = runSimulation({
      ...defaultParams,
      buyProperty: false,
      rentPhases: [{ rent: 15, startAge: 30 }],
    });
    const age35 = data.find((d) => d.age === 35);
    expect(age35.住居費).toBe(15 * 12); // 月15万×12
  });

  it("マンション購入前は設定した賃貸家賃が住居費になる", () => {
    const data = runSimulation({
      ...defaultParams,
      buyProperty: true,
      purchaseAge: 40,
      rentBeforePurchase: 12,
    });
    const age35 = data.find((d) => d.age === 35); // 購入前
    const age40 = data.find((d) => d.age === 40); // 購入年
    expect(age35.住居費).toBe(12 * 12); // 月12万×12
    expect(age40.住居費).toBeGreaterThan(12 * 12); // 購入後はローン返済等
  });

  it("年齢別の年収・支出割合が反映される", () => {
    const data = runSimulation({
      ...defaultParams,
      incomePhases: [
        { startAge: 30, grossIncomeHusband: 500, grossIncomeWife: 0, incomeGrowthRate: 0 },
        { startAge: 45, grossIncomeHusband: 800, grossIncomeWife: 100, incomeGrowthRate: 0 },
      ],
      livingExpensePhases: [
        { startAge: 30, ratio: 50 },
        { startAge: 60, ratio: 70 },
      ],
      specialExpensePhases: [
        { startAge: 30, ratio: 5 },
        { startAge: 50, ratio: 15 },
      ],
    });
    const age35 = data.find((d) => d.age === 35);
    const age50 = data.find((d) => d.age === 50);
    // 45歳以降は年収800+100=900万に
    expect(age50.額面年収).toBe(900);
    // 50歳以降は特別支出割合15%（35歳時は5%）
    expect(age50.特別支出).toBeGreaterThan(age35.特別支出);
  });

  it("年齢別インフレ率が反映される", () => {
    const data = runSimulation({
      ...defaultParams,
      inflationPhases: [
        { startAge: 30, rate: 0 },
        { startAge: 50, rate: 3 },
      ],
    });
    const age35 = data.find((d) => d.age === 35);
    const age55 = data.find((d) => d.age === 55);
    // 50歳以降は高インフレ（3%）が適用され、55歳時点の支出は35歳よりインフレ分増える
    expect(age55.年間支出).toBeGreaterThan(age35.年間支出);
  });

  it("startAgeを指定するとその年齢からシミュレーションが始まる", () => {
    const data = runSimulation({ ...defaultParams, startAge: 25 });
    expect(data).toHaveLength(61); // 25から85まで
    expect(data[0].age).toBe(25);
    expect(data[60].age).toBe(85);
  });

  it("年齢別投資設定（期待リターン・貯蓄→投資割合）が反映される", () => {
    const data = runSimulation({
      ...defaultParams,
      investPhases: [
        { startAge: 30, rate: 3, ratio: 50 },
        { startAge: 50, rate: 7, ratio: 100 },
      ],
    });
    const age35 = data.find((d) => d.age === 35);
    const age55 = data.find((d) => d.age === 55);
    // 50歳以降は100%投資・7%リターン、30-49歳は50%投資・3%リターン
    // 55歳時点の金融資産成長は50歳以降の方が大きいはず
    expect(age55.金融資産).toBeGreaterThanOrEqual(age35.金融資産);
  });

  it("マンション購入時、ローン金利を上げると返済額・支出が増え、最終純資産は減る", () => {
    const params = {
      ...defaultParams,
      buyProperty: true,
      propertyPrice: 6000,
      downPayment: 1500,
    };
    const lowRate = runSimulation({ ...params, loanRate: 0.5 });
    const highRate = runSimulation({ ...params, loanRate: 3.0 });
    const age35Low = lowRate.find((d) => d.age === 35);
    const age35High = highRate.find((d) => d.age === 35);
    expect(age35High.住居費).toBeGreaterThan(age35Low.住居費);
    expect(age35High.年間支出).toBeGreaterThan(age35Low.年間支出);
    const endLow = lowRate[lowRate.length - 1];
    const endHigh = highRate[highRate.length - 1];
    expect(endHigh.純資産).toBeLessThan(endLow.純資産);
  });
});
