/**
 * 設定をJSONオブジェクトに集約
 */
export function getSettingsSnapshot(state) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    basic: {
      startAge: state.startAge,
      initialAssets: state.initialAssets,
      grossIncomeHusband: state.grossIncomeHusband,
      grossIncomeWife: state.grossIncomeWife,
      incomeGrowthRate: state.incomeGrowthRate,
      livingExpenseRatio: state.livingExpenseRatio,
      specialExpenseRatio: state.specialExpenseRatio,
      incomePhases: state.incomePhases,
      livingExpensePhases: state.livingExpensePhases,
      specialExpensePhases: state.specialExpensePhases,
      inflationPhases: state.inflationPhases,
    },
    retirement: {
      retirementAge: state.retirementAge,
      pensionMonthly: state.pensionMonthly,
    },
    housing: {
      buyProperty: state.buyProperty,
      propertyPrice: state.propertyPrice,
      downPayment: state.downPayment,
      loanRate: state.loanRate,
      loanYears: state.loanYears,
      finalPropertyRatio: state.finalPropertyRatio,
      purchaseAge: state.purchaseAge,
      rentBeforePurchase: state.rentBeforePurchase,
      rentPhases: state.rentPhases,
    },
    children: {
      numChildren: state.numChildren,
      children: state.children,
    },
    invest: {
      investPhases: state.investPhases,
    },
    extra: {
      carOwnership: state.carOwnership,
      carAnnualCost: state.carAnnualCost,
      insuranceAnnual: state.insuranceAnnual,
    },
  };
}

/**
 * 単一値からフェーズ配列を生成（後方互換用）
 */
function toPhases(legacy, defaults) {
  if (Array.isArray(legacy) && legacy.length > 0) return legacy;
  return defaults;
}

/**
 * インフレフェーズ配列を生成（後方互換: 旧inflationRate単一値から変換）
 */
function toInflationPhases(legacy, legacyRate, startAge = 30) {
  if (Array.isArray(legacy) && legacy.length > 0) return legacy;
  const rate = legacyRate ?? 1;
  return [{ startAge, rate }];
}

/**
 * 投資フェーズ配列を生成（後方互換: 旧investRate/investRatio単一値から変換）
 */
function toInvestPhases(legacy, legacyRate, legacyRatio, startAge = 30) {
  if (Array.isArray(legacy) && legacy.length > 0) return legacy;
  const rate = legacyRate ?? 5;
  const ratio = legacyRatio ?? 80;
  return [{ startAge, rate, ratio }];
}

/**
 * スナップショットから設定を適用（戻り値はsetState用のオブジェクト）
 */
export function applySnapshot(snap) {
  if (!snap?.basic) return null;
  const s = snap;
  const b = s.basic;
  return {
    startAge: b.startAge ?? 30,
    initialAssets: b.initialAssets,
    grossIncomeHusband: b.grossIncomeHusband,
    grossIncomeWife: b.grossIncomeWife,
    incomeGrowthRate: b.incomeGrowthRate,
    livingExpenseRatio: b.livingExpenseRatio,
    specialExpenseRatio: b.specialExpenseRatio,
    incomePhases: toPhases(b.incomePhases, [
      { startAge: b.startAge ?? 30, grossIncomeHusband: b.grossIncomeHusband, grossIncomeWife: b.grossIncomeWife, incomeGrowthRate: b.incomeGrowthRate },
    ]),
    livingExpensePhases: toPhases(b.livingExpensePhases, [{ startAge: b.startAge ?? 30, ratio: b.livingExpenseRatio }]),
    specialExpensePhases: toPhases(b.specialExpensePhases, [{ startAge: b.startAge ?? 30, ratio: b.specialExpenseRatio }]),
    inflationPhases: toInflationPhases(b.inflationPhases, b.inflationRate, b.startAge),
    retirementAge: s.retirement?.retirementAge ?? b.retirementAge ?? 65,
    pensionMonthly: s.retirement?.pensionMonthly ?? b.pensionMonthly ?? 15,
    buyProperty: s.housing?.buyProperty ?? false,
    propertyPrice: s.housing?.propertyPrice ?? 5000,
    downPayment: s.housing?.downPayment ?? 500,
    loanRate: s.housing?.loanRate ?? 0.8,
    loanYears: s.housing?.loanYears ?? 35,
    finalPropertyRatio: s.housing?.finalPropertyRatio ?? 40,
    purchaseAge: s.housing?.purchaseAge ?? 35,
    rentBeforePurchase: s.housing?.rentBeforePurchase ?? 10,
    rentPhases: s.housing?.rentPhases ?? [{ rent: 10, startAge: b.startAge ?? 30 }],
    numChildren: s.children?.numChildren ?? 1,
    children:
      s.children?.children ?? [{ parentAgeAtBirth: 32, privateSchool: false }],
    investPhases: toInvestPhases(s.invest?.investPhases, s.invest?.investRate, s.invest?.investRatio, b.startAge ?? 30),
    carOwnership: s.extra?.carOwnership ?? false,
    carAnnualCost: s.extra?.carAnnualCost ?? 50,
    insuranceAnnual: s.extra?.insuranceAnnual ?? 24,
  };
}
