import { calcNetIncome } from "./calc/netIncome.js";
import { childCostPerYear } from "./calc/childCost.js";
import { propertyValue } from "./calc/property.js";
import { monthlyPayment, loanBalance } from "./calc/loan.js";

const END_AGE = 85;
const DEFAULT_START_AGE = 30;

/**
 * 年齢に応じたフェーズを取得（startAge降順で最大のものを返す）
 */
function getPhaseAtAge(phases, age) {
  if (!phases?.length) return null;
  const sorted = [...phases].sort((a, b) => (b.startAge ?? 0) - (a.startAge ?? 0));
  return sorted.find((p) => age >= (p.startAge ?? 0)) ?? sorted[sorted.length - 1];
}

/**
 * ライフプランシミュレーション実行
 * @param {Object} params - シミュレーション параметры
 * @returns {Array} 年齢別の結果配列
 */
export function runSimulation(params) {
  const {
    startAge = DEFAULT_START_AGE,
    initialAssets,
    grossIncomeHusband,
    grossIncomeWife,
    incomeGrowthRate,
    livingExpenseRatio,
    specialExpenseRatio,
    incomePhases,
    livingExpensePhases,
    specialExpensePhases,
    retirementAge,
    pensionMonthly,
    inflationRate,
    inflationPhases,
    buyProperty,
    propertyPrice,
    downPayment,
    loanRate,
    loanYears,
    finalPropertyRatio,
    purchaseAge,
    rentBeforePurchase,
    rentPhases,
    numChildren,
    children,
    investRate,
    investRatio,
    investPhases,
    carOwnership,
    carAnnualCost,
    insuranceAnnual,
  } = params;

  const results = [];
  let totalInvested = 0;
  let investmentAssets = 0;
  let cashAssets = initialAssets;
  let cumulativeIncome = 0;
  let cumulativeExpense = 0;

  let inflationFactor = 1;
  for (let age = startAge; age <= END_AGE; age++) {
    const infPhase = getPhaseAtAge(inflationPhases, age);
    const currentInflationRate = infPhase?.rate ?? inflationRate ?? 1;

    // 収入（夫婦別に税計算）- 年齢別フェーズに対応
    let netIncome = 0;
    let grossIncome = 0;
    if (age < retirementAge) {
      const incPhase = getPhaseAtAge(incomePhases, age) ?? {
        startAge,
        grossIncomeHusband,
        grossIncomeWife,
        incomeGrowthRate,
      };
      const phaseYear = age - (incPhase.startAge ?? startAge);
      const growth = (incPhase.incomeGrowthRate ?? incomeGrowthRate) / 100;
      const husbandIncome =
        (incPhase.grossIncomeHusband ?? grossIncomeHusband) *
        Math.pow(1 + growth, phaseYear);
      const wifeIncome =
        (incPhase.grossIncomeWife ?? grossIncomeWife) *
        Math.pow(1 + growth, phaseYear);
      grossIncome = husbandIncome + wifeIncome;
      netIncome =
        calcNetIncome(husbandIncome * 10000) / 10000 +
        calcNetIncome(wifeIncome * 10000) / 10000;
    } else {
      grossIncome = 0; // 退職後は額面なし（年金は手取り）
      netIncome = pensionMonthly * 12;
    }
    cumulativeIncome += netIncome;

    // 生活費・特別支出 - 年齢別フェーズに対応
    const livePhase = getPhaseAtAge(livingExpensePhases, age);
    const specPhase = getPhaseAtAge(specialExpensePhases, age);
    const liveRatio = livePhase?.ratio ?? livingExpenseRatio;
    const specRatio = specPhase?.ratio ?? specialExpenseRatio;
    const livingExp = netIncome * (liveRatio / 100) * inflationFactor;
    const specialExp = netIncome * (specRatio / 100) * inflationFactor;

    // 子供の教育費
    let childCost = 0;
    for (let i = 0; i < numChildren; i++) {
      if (i < children.length) {
        const childAge = age - children[i].parentAgeAtBirth;
        childCost += childCostPerYear(
          childAge,
          children[i].privateSchool ? "private" : "public"
        );
      }
    }

    // 住居費
    let housingCost = 0;
    let loanRemainder = 0;
    let propValue = 0;
    if (buyProperty) {
      if (age >= purchaseAge) {
        const elapsed = age - purchaseAge;
        const principal = propertyPrice - downPayment;
        const annualPayment =
          (monthlyPayment(principal * 10000, loanRate / 100, loanYears) *
            12) /
          10000;
        housingCost = elapsed < loanYears ? annualPayment : 20; // ローン完済後も管理費等20万
        housingCost += (24 * inflationFactor) / inflationFactor; // 年24万固定（修繕積立金・管理費）
        loanRemainder = Math.round(
          loanBalance(
            principal * 10000,
            loanRate / 100,
            loanYears,
            elapsed
          ) / 10000
        );
        propValue = propertyValue(
          propertyPrice,
          elapsed,
          (propertyPrice * finalPropertyRatio) / 100,
          50
        );
      } else {
        // 購入前は賃貸：設定された家賃を使用
        housingCost = (rentBeforePurchase ?? 10) * 12;
      }
      if (age === purchaseAge) {
        cashAssets -= downPayment;
      }
    } else {
      const phase = [...rentPhases]
        .sort((a, b) => a.startAge - b.startAge)
        .reverse()
        .find((p) => age >= p.startAge);
      housingCost = phase ? phase.rent * 12 : 10 * 12;
    }

    // 車
    const carCost = carOwnership ? carAnnualCost * inflationFactor : 0;

    // 保険
    const insurance = insuranceAnnual * inflationFactor;

    // 総支出
    const totalExpense =
      livingExp + specialExp + childCost + housingCost + carCost + insurance;
    cumulativeExpense += totalExpense;

    // 貯蓄
    const savings = netIncome - totalExpense;

    // 投資運用 - 年齢別フェーズ
    const invPhase = getPhaseAtAge(investPhases, age);
    const currentInvestRate = invPhase?.rate ?? investRate ?? 5;
    const currentInvestRatio = invPhase?.ratio ?? investRatio ?? 80;

    investmentAssets = investmentAssets * (1 + currentInvestRate / 100);

    let annualInvested = 0;
    if (savings > 0) {
      const toInvest = savings * (currentInvestRatio / 100);
      const toCash = savings - toInvest;
      investmentAssets += toInvest;
      totalInvested += toInvest;
      annualInvested = toInvest;
      cashAssets += toCash;
    } else {
      let deficit = -savings;
      if (cashAssets >= deficit) {
        cashAssets -= deficit;
      } else {
        deficit -= cashAssets;
        cashAssets = 0;
        investmentAssets -= deficit;
      }
    }

    const totalFinancialAssets = Math.round(cashAssets + investmentAssets);
    const totalDebt = loanRemainder;
    const netWorth = totalFinancialAssets + propValue - totalDebt;

    const livingTotal = livingExp + housingCost + childCost + carCost + insurance;
    results.push({
      age,
      額面年収: Math.round(grossIncome),
      金融資産: Math.round(totalFinancialAssets),
      現金: Math.round(cashAssets),
      投資資産: Math.round(investmentAssets),
      不動産価値: propValue,
      負債: totalDebt,
      純資産: Math.round(netWorth),
      年収手取り: Math.round(netIncome),
      年間支出: Math.round(totalExpense),
      年間貯蓄: Math.round(savings),
      生活費: Math.round(livingExp),
      住居費: Math.round(housingCost),
      教育費: Math.round(childCost),
      その他: Math.round(carCost + insurance),
      生活費計: Math.round(livingTotal),
      特別支出: Math.round(specialExp),
      年間投資額: Math.round(annualInvested),
      累積投資額: Math.round(totalInvested),
    });

    inflationFactor *= 1 + currentInflationRate / 100;
  }

  return results;
}
