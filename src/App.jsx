import { useState, useMemo, useCallback } from "react";
import "./App.css";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, ComposedChart, Line } from "recharts";

import { childCostPerYear } from "./calc/childCost.js";
import { propertyValue } from "./calc/property.js";
import { monthlyPayment, loanBalance } from "./calc/loan.js";
import { fmt, fmtYen } from "./utils/format.js";
import { getSettingsSnapshot, applySnapshot } from "./utils/settings.js";
import { loadSavedList, addToSavedList, removeFromSavedList } from "./utils/storage.js";
import { downloadJson } from "./utils/download.js";
import { runSimulation } from "./simulation.js";

// === Slider Component ===
function Slider({ label, value, onChange, min, max, step = 1, unit = "", formatter }) {
  const displayVal = formatter ? formatter(value) : `${value}${unit}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="slider-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
        <span style={{ color: "#8a8f98", fontFamily: "'Noto Sans JP', sans-serif" }}>{label}</span>
        <span style={{ color: "#e8eaed", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, flexShrink: 0 }}>{displayVal}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#4ecdc4", cursor: "pointer", height: 6 }}
      />
    </div>
  );
}

// === Toggle ===
function Toggle({ label, value, onChange }) {
  return (
    <div className="slider-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
      <span style={{ color: "#8a8f98", fontFamily: "'Noto Sans JP', sans-serif" }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
          background: value ? "#4ecdc4" : "#3a3f4b", transition: "all 0.3s",
          position: "relative", flexShrink: 0
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: "#fff",
          position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.3s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
        }} />
      </div>
    </div>
  );
}

// === Section ===
function Section({ title, icon, children, collapsed, onToggle }) {
  return (
    <div className="section-block" style={{
      background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px",
      marginBottom: 12, border: "1px solid rgba(255,255,255,0.06)"
    }}>
      <div
        onClick={onToggle}
        className="section-header"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", userSelect: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
          <span className="section-title" style={{ color: "#e8eaed", fontWeight: 600, fontSize: 14, fontFamily: "'Noto Sans JP', sans-serif" }}>{title}</span>
        </div>
        <span style={{ color: "#8a8f98", fontSize: 12, transition: "transform 0.3s", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}>▼</span>
      </div>
      {!collapsed && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

// === Child Config ===
function ChildConfig({ index, config, onChange }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: "#4ecdc4", marginBottom: 8, fontWeight: 600 }}>👶 子供{index + 1}</div>
      <Slider label="誕生時の親の年齢" value={config.parentAgeAtBirth} onChange={v => onChange({ ...config, parentAgeAtBirth: v })} min={25} max={50} unit="歳" />
      <Toggle label="私立進学" value={config.privateSchool} onChange={v => onChange({ ...config, privateSchool: v })} />
    </div>
  );
}

// === Rent Phase ===
function RentPhase({ index, config, onChange, onRemove, canRemove, minStartAge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#ff6b6b", fontWeight: 600 }}>🏠 住居{index + 1}</span>
        {canRemove && (
          <span onClick={onRemove} style={{ color: "#ff6b6b", cursor: "pointer", fontSize: 12 }}>✕ 削除</span>
        )}
      </div>
      <Slider label="月額家賃" value={config.rent} onChange={v => onChange({ ...config, rent: v })} min={3} max={40} unit="万円" />
      <Slider label="開始年齢" value={config.startAge} onChange={v => onChange({ ...config, startAge: v })} min={minStartAge ?? 20} max={70} unit="歳" />
    </div>
  );
}

// === Income Phase（年齢別年収） ===
function IncomePhase({ index, config, onChange, onRemove, canRemove, minStartAge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#4ecdc4", fontWeight: 600 }}>💰 年収{index + 1}</span>
        {canRemove && (
          <span onClick={onRemove} style={{ color: "#4ecdc4", cursor: "pointer", fontSize: 12 }}>✕ 削除</span>
        )}
      </div>
      <Slider label="開始年齢" value={config.startAge} onChange={v => onChange({ ...config, startAge: v })} min={minStartAge ?? 20} max={64} unit="歳" />
      <Slider label="夫の年収（税込）" value={config.grossIncomeHusband} onChange={v => onChange({ ...config, grossIncomeHusband: v })} min={0} max={3000} step={10} unit="万円" />
      <Slider label="妻の年収（税込）" value={config.grossIncomeWife} onChange={v => onChange({ ...config, grossIncomeWife: v })} min={0} max={3000} step={10} unit="万円" />
      <Slider label="昇給率" value={config.incomeGrowthRate} onChange={v => onChange({ ...config, incomeGrowthRate: v })} min={0} max={8} step={0.5} unit="%" />
    </div>
  );
}

// === Ratio Phase（年齢別割合） ===
function RatioPhase({ label, color, index, config, onChange, onRemove, canRemove, ratioMin = 20, ratioMax = 80, minStartAge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color, fontWeight: 600 }}>{label}{index + 1}</span>
        {canRemove && (
          <span onClick={onRemove} style={{ color, cursor: "pointer", fontSize: 12 }}>✕ 削除</span>
        )}
      </div>
      <Slider label="開始年齢" value={config.startAge} onChange={v => onChange({ ...config, startAge: v })} min={minStartAge ?? 20} max={84} unit="歳" />
      <Slider label="割合" value={config.ratio} onChange={v => onChange({ ...config, ratio: v })} min={ratioMin} max={ratioMax} unit="%" />
    </div>
  );
}

// === Invest Phase（年齢別投資設定） ===
function InvestPhase({ index, config, onChange, onRemove, canRemove, minStartAge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#45b7aa", fontWeight: 600 }}>📈 投資フェーズ{index + 1}</span>
        {canRemove && (
          <span onClick={onRemove} style={{ color: "#45b7aa", cursor: "pointer", fontSize: 12 }}>✕ 削除</span>
        )}
      </div>
      <Slider label="開始年齢" value={config.startAge} onChange={v => onChange({ ...config, startAge: v })} min={minStartAge ?? 20} max={84} unit="歳" />
      <Slider label="期待リターン" value={config.rate} onChange={v => onChange({ ...config, rate: v })} min={0} max={12} step={0.5} unit="%" />
      <Slider label="貯蓄→投資の割合" value={config.ratio} onChange={v => onChange({ ...config, ratio: v })} min={0} max={100} step={5} unit="%" />
    </div>
  );
}

// === Inflation Phase（年齢別インフレ率） ===
function InflationPhase({ index, config, onChange, onRemove, canRemove, minStartAge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#45b7aa", fontWeight: 600 }}>📈 フェーズ{index + 1}</span>
        {canRemove && (
          <span onClick={onRemove} style={{ color: "#45b7aa", cursor: "pointer", fontSize: 12 }}>✕ 削除</span>
        )}
      </div>
      <Slider label="開始年齢" value={config.startAge} onChange={v => onChange({ ...config, startAge: v })} min={minStartAge ?? 20} max={84} unit="歳" />
      <Slider label="インフレ率" value={config.rate} onChange={v => onChange({ ...config, rate: v })} min={0} max={5} step={0.5} unit="%" />
    </div>
  );
}

// === Tooltip ===
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(26,29,36,0.95)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "12px 16px", backdropFilter: "blur(10px)",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12
    }}>
      <div style={{ color: "#e8eaed", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{label}歳</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
          <span style={{ color: "#8a8f98" }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 600 }}>{fmtYen(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// === Main App ===
export default function App() {
  const [sections, setSections] = useState({ initial: false, incomeSettings: false, expenseSettings: false, retirement: false, housing: false, children: false, invest: false, extra: false, settings: false });
  const [savedList, setSavedList] = useState(() => loadSavedList());
  const [saveName, setSaveName] = useState("");
  const toggleSection = (k) => setSections(s => ({ ...s, [k]: !s[k] }));

  // 基本設定
  const [startAge, setStartAge] = useState(30);
  const [initialAssets, setInitialAssets] = useState(500);
  const [retirementAge, setRetirementAge] = useState(65);
  const [pensionMonthly, setPensionMonthly] = useState(15); // 年金月額万円
  // 年齢別設定（フェーズ形式）
  const [incomePhases, setIncomePhases] = useState([
    { startAge: 30, grossIncomeHusband: 600, grossIncomeWife: 0, incomeGrowthRate: 2.0 },
  ]);
  const [livingExpensePhases, setLivingExpensePhases] = useState([{ startAge: 30, ratio: 50 }]);
  const [specialExpensePhases, setSpecialExpensePhases] = useState([{ startAge: 30, ratio: 10 }]);
  const [inflationPhases, setInflationPhases] = useState([{ startAge: 30, rate: 1.0 }]);

  // 住宅
  const [buyProperty, setBuyProperty] = useState(false);
  const [propertyPrice, setPropertyPrice] = useState(5000);
  const [downPayment, setDownPayment] = useState(500);
  const [loanRate, setLoanRate] = useState(0.8);
  const [loanYears, setLoanYears] = useState(35);
  const [finalPropertyRatio, setFinalPropertyRatio] = useState(40);
  const [purchaseAge, setPurchaseAge] = useState(35);
  const [rentBeforePurchase, setRentBeforePurchase] = useState(10); // マンション購入前の賃貸家賃（月額・万円）
  const [rentPhases, setRentPhases] = useState([{ rent: 10, startAge: 30 }]);

  // 子供
  const [children, setChildren] = useState([{ parentAgeAtBirth: 32, privateSchool: false }]);
  const [numChildren, setNumChildren] = useState(1);

  // 投資（年齢別フェーズ）
  const [investPhases, setInvestPhases] = useState([{ startAge: 30, rate: 5.0, ratio: 80 }]);

  // Extra
  const [carOwnership, setCarOwnership] = useState(false);
  const [carAnnualCost, setCarAnnualCost] = useState(50);
  const [insuranceAnnual, setInsuranceAnnual] = useState(24);

  // 子供設定の同期
  const handleNumChildren = useCallback((n) => {
    setNumChildren(n);
    setChildren(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push({ parentAgeAtBirth: 32 + arr.length * 2, privateSchool: false });
      return arr.slice(0, n);
    });
  }, []);

  // 現在の設定をスナップショット取得
  const getCurrentSnapshot = useCallback(() => {
    return getSettingsSnapshot({
      startAge,
      initialAssets,
      grossIncomeHusband: incomePhases[0]?.grossIncomeHusband ?? 600,
      grossIncomeWife: incomePhases[0]?.grossIncomeWife ?? 0,
      incomeGrowthRate: incomePhases[0]?.incomeGrowthRate ?? 2,
      livingExpenseRatio: livingExpensePhases[0]?.ratio ?? 50,
      specialExpenseRatio: specialExpensePhases[0]?.ratio ?? 10,
      incomePhases, livingExpensePhases, specialExpensePhases, inflationPhases,
      retirementAge, pensionMonthly,
      buyProperty, propertyPrice, downPayment, loanRate, loanYears,
      finalPropertyRatio, purchaseAge, rentBeforePurchase, rentPhases,
      numChildren, children,
      investPhases,
      carOwnership, carAnnualCost, insuranceAnnual,
    });
  }, [startAge, initialAssets, incomePhases, livingExpensePhases, specialExpensePhases, inflationPhases, retirementAge, pensionMonthly, buyProperty, propertyPrice, downPayment, loanRate, loanYears, finalPropertyRatio, purchaseAge, rentBeforePurchase, rentPhases, numChildren, children, investPhases, carOwnership, carAnnualCost, insuranceAnnual]);

  const handleSave = useCallback(() => {
    const name = (saveName || `設定_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`).trim();
    const snap = { ...getCurrentSnapshot(), name };
    const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const item = { id, name, savedAt: snap.savedAt, data: snap };
    addToSavedList(item);
    setSavedList(loadSavedList());
    downloadJson(snap, `household-sim_${name}.json`);
    setSaveName("");
  }, [getCurrentSnapshot, saveName]);

  const handleLoad = useCallback((item) => {
    const applied = applySnapshot(item.data);
    if (!applied) return;
    if (applied.startAge != null) setStartAge(applied.startAge);
    setInitialAssets(applied.initialAssets);
    setIncomePhases(applied.incomePhases ?? [{ startAge: 30, grossIncomeHusband: applied.grossIncomeHusband, grossIncomeWife: applied.grossIncomeWife, incomeGrowthRate: applied.incomeGrowthRate }]);
    setLivingExpensePhases(applied.livingExpensePhases ?? [{ startAge: 30, ratio: applied.livingExpenseRatio }]);
    setSpecialExpensePhases(applied.specialExpensePhases ?? [{ startAge: 30, ratio: applied.specialExpenseRatio }]);
    setInflationPhases(applied.inflationPhases ?? [{ startAge: 30, rate: applied.inflationRate ?? 1 }]);
    setRetirementAge(applied.retirementAge);
    setPensionMonthly(applied.pensionMonthly);
    setBuyProperty(applied.buyProperty);
    setPropertyPrice(applied.propertyPrice);
    setDownPayment(applied.downPayment);
    setLoanRate(applied.loanRate);
    setLoanYears(applied.loanYears);
    setFinalPropertyRatio(applied.finalPropertyRatio);
    setPurchaseAge(applied.purchaseAge);
    setRentBeforePurchase(applied.rentBeforePurchase ?? 10);
    setRentPhases(applied.rentPhases);
    handleNumChildren(applied.numChildren);
    setChildren(applied.children);
    setInvestPhases(applied.investPhases ?? [{ startAge: applied.startAge ?? 30, rate: applied.investRate ?? 5, ratio: applied.investRatio ?? 80 }]);
    setCarOwnership(applied.carOwnership);
    setCarAnnualCost(applied.carAnnualCost);
    setInsuranceAnnual(applied.insuranceAnnual);
  }, [handleNumChildren]);

  const handleDeleteSaved = useCallback((id) => {
    removeFromSavedList(id);
    setSavedList(loadSavedList());
  }, []);

  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const applied = applySnapshot(parsed.data || parsed);
        if (applied) handleLoad({ data: parsed.data || parsed });
      } catch (err) {
        alert("JSONの読み込みに失敗しました: " + (err?.message || err));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [handleLoad]);

  // === シミュレーション ===
  const data = useMemo(
    () =>
      runSimulation({
        startAge,
        initialAssets,
        grossIncomeHusband: incomePhases[0]?.grossIncomeHusband ?? 600,
        grossIncomeWife: incomePhases[0]?.grossIncomeWife ?? 0,
        incomeGrowthRate: incomePhases[0]?.incomeGrowthRate ?? 2,
        livingExpenseRatio: livingExpensePhases[0]?.ratio ?? 50,
        specialExpenseRatio: specialExpensePhases[0]?.ratio ?? 10,
        incomePhases,
        livingExpensePhases,
        specialExpensePhases,
        inflationPhases,
        retirementAge,
        pensionMonthly,
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
        investPhases,
        carOwnership,
        carAnnualCost,
        insuranceAnnual,
      }),
    [
      startAge,
      initialAssets,
      incomePhases,
      livingExpensePhases,
      specialExpensePhases,
      inflationPhases,
      retirementAge,
      pensionMonthly,
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
      investPhases,
      carOwnership,
      carAnnualCost,
      insuranceAnnual,
    ]
  );

  // 開始年齢時点の年収で手取り・税率を表示
  const startData = data[0];
  const netIncome = startData ? Math.round(startData.年収手取り) : 0;
  const taxRate = startData && startData.額面年収 > 0 ? Math.round((1 - startData.年収手取り / startData.額面年収) * 100) : 0;

  // Key milestones
  const fireAge = data.find(d => d.金融資産 >= d.年間支出 * 25);
  const peakDebt = buyProperty ? data.reduce((max, d) => d.負債 > (max?.負債 || 0) ? d : max, null) : null;
  const retireData = data.find(d => d.age === retirementAge);
  const endData = data[data.length - 1];

  // 生涯年収（30〜85歳の合計、万円単位）
  const lifetimeGross = data.reduce((s, d) => s + d.額面年収, 0);
  const lifetimeNet = data.reduce((s, d) => s + d.年収手取り, 0);

  return (
    <div style={{
      minHeight: "100vh", background: "#12141a",
      fontFamily: "'Noto Sans JP', 'JetBrains Mono', sans-serif",
      color: "#e8eaed"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        input[type=range] { -webkit-appearance: none; appearance: none; background: #2a2d35; border-radius: 3px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #4ecdc4; cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3a3f4b; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
      `}</style>

      <div style={{ width: "100%", margin: 0, padding: "20px 16px", boxSizing: "border-box" }} className="app-container">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }} className="fade-in app-header">
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "#e8eaed", margin: 0,
            letterSpacing: 1, fontFamily: "'Noto Sans JP', sans-serif"
          }}>
            <span style={{ color: "#4ecdc4" }}>◆</span> 家計シミュレーター <span style={{ color: "#ff6b6b" }}>◆</span>
          </h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{startAge}歳〜85歳 ライフプラン資産推移</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }} className="fade-in kpi-grid">
          {[
            { label: "生涯年収（額面）", value: fmtYen(lifetimeGross), sub: `${startAge}〜85歳の合計`, color: "#8a8f98" },
            { label: "生涯年収（手取り）", value: fmtYen(lifetimeNet), sub: `${startAge}〜85歳の合計`, color: "#4ecdc4" },
            { label: "現在手取り", value: `${netIncome}万`, sub: `税率${taxRate}%`, color: "#4ecdc4" },
            { label: "退職時資産", value: retireData ? fmtYen(retireData.金融資産) : "-", sub: `${retirementAge}歳時点`, color: "#7c83ff" },
            { label: "85歳時純資産", value: endData ? fmtYen(endData.純資産) : "-", sub: endData?.純資産 >= 0 ? "余裕あり" : "⚠ 資産不足", color: endData?.純資産 >= 0 ? "#45b7aa" : "#ff6b6b" },
            { label: fireAge ? "FIRE可能" : "FIRE", value: fireAge ? `${fireAge.age}歳` : "到達困難", sub: "支出25年分", color: fireAge ? "#ffd93d" : "#6b7280" },
          ].map((kpi, i) => (
            <div key={i} className="kpi-card" style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 14px",
              border: `1px solid ${kpi.color}22`, position: "relative", overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: kpi.color, opacity: 0.6 }} />
              <div className="kpi-label" style={{ fontSize: 11, color: "#8a8f98", marginBottom: 4 }}>{kpi.label}</div>
              <div className="kpi-value" style={{ fontSize: 18, fontWeight: 700, color: kpi.color, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }} className="main-layout">
          {/* Control Panel */}
          <div style={{ maxHeight: "calc(100vh - 160px)", overflowY: "auto", paddingRight: 4 }} className="control-panel">
            <Section title="初期設定" icon="⏱️" collapsed={sections.initial} onToggle={() => toggleSection("initial")}>
              <Slider label="開始年齢" value={startAge} onChange={setStartAge} min={20} max={70} unit="歳" />
              <Slider label="初期遺産" value={initialAssets} onChange={setInitialAssets} min={0} max={5000} step={50} unit="万円" />
            </Section>

            <Section title="年収設定" icon="💰" collapsed={sections.incomeSettings} onToggle={() => toggleSection("incomeSettings")}>
              <div style={{ fontSize: 11, color: "#4ecdc4", marginBottom: 8 }}>
                （{startAge}歳時点）合計手取り: {netIncome}万円（実質税率 {taxRate}%）
              </div>
              <div style={{ fontSize: 12, color: "#8a8f98", marginBottom: 8, fontWeight: 600 }}>年収（年齢別）</div>
              {incomePhases.map((phase, i) => (
                <IncomePhase
                  key={i}
                  index={i}
                  config={phase}
                  onChange={c => setIncomePhases(p => p.map((x, j) => j === i ? c : x))}
                  onRemove={() => setIncomePhases(p => p.filter((_, j) => j !== i))}
                  canRemove={incomePhases.length > 1}
                  minStartAge={startAge}
                />
              ))}
              {incomePhases.length < 5 && (
                <div
                  onClick={() => setIncomePhases(p => [...p, { startAge: Math.min(64, (p[p.length - 1]?.startAge ?? startAge) + 10), grossIncomeHusband: 600, grossIncomeWife: 0, incomeGrowthRate: 2 }])}
                  style={{ textAlign: "center", padding: 8, borderRadius: 8, cursor: "pointer", border: "1px dashed rgba(255,255,255,0.15)", color: "#8a8f98", fontSize: 12, marginBottom: 12 }}
                >
                  + 年収フェーズ追加
                </div>
              )}
            </Section>

            <Section title="支出設定" icon="📤" collapsed={sections.expenseSettings} onToggle={() => toggleSection("expenseSettings")}>
              <div style={{ fontSize: 12, color: "#8a8f98", marginBottom: 8, fontWeight: 600 }}>生活費の割合（年齢別）</div>
              {livingExpensePhases.map((phase, i) => (
                <RatioPhase
                  key={i}
                  label="フェーズ"
                  color="#ff6b6b"
                  index={i}
                  config={phase}
                  ratioMin={20}
                  ratioMax={80}
                  onChange={c => setLivingExpensePhases(p => p.map((x, j) => j === i ? c : x))}
                  onRemove={() => setLivingExpensePhases(p => p.filter((_, j) => j !== i))}
                  canRemove={livingExpensePhases.length > 1}
                  minStartAge={startAge}
                />
              ))}
              {livingExpensePhases.length < 5 && (
                <div
                  onClick={() => setLivingExpensePhases(p => [...p, { startAge: Math.min(84, (p[p.length - 1]?.startAge ?? startAge) + 10), ratio: 50 }])}
                  style={{ textAlign: "center", padding: 8, borderRadius: 8, cursor: "pointer", border: "1px dashed rgba(255,255,255,0.15)", color: "#8a8f98", fontSize: 12, marginBottom: 12 }}
                >
                  + フェーズ追加
                </div>
              )}
              <div style={{ fontSize: 12, color: "#8a8f98", marginBottom: 8, marginTop: 8, fontWeight: 600 }}>特別出費の割合（年齢別）</div>
              {specialExpensePhases.map((phase, i) => (
                <RatioPhase
                  key={i}
                  label="フェーズ"
                  color="#c77dff"
                  index={i}
                  config={phase}
                  ratioMin={0}
                  ratioMax={30}
                  minStartAge={startAge}
                  onChange={c => setSpecialExpensePhases(p => p.map((x, j) => j === i ? c : x))}
                  onRemove={() => setSpecialExpensePhases(p => p.filter((_, j) => j !== i))}
                  canRemove={specialExpensePhases.length > 1}
                />
              ))}
              {specialExpensePhases.length < 5 && (
                <div
                  onClick={() => setSpecialExpensePhases(p => [...p, { startAge: Math.min(84, (p[p.length - 1]?.startAge ?? startAge) + 10), ratio: 10 }])}
                  style={{ textAlign: "center", padding: 8, borderRadius: 8, cursor: "pointer", border: "1px dashed rgba(255,255,255,0.15)", color: "#8a8f98", fontSize: 12, marginBottom: 12 }}
                >
                  + フェーズ追加
                </div>
              )}
              <div style={{ fontSize: 12, color: "#8a8f98", marginBottom: 8, marginTop: 8, fontWeight: 600 }}>インフレ率（年齢別）</div>
              {inflationPhases.map((phase, i) => (
                <InflationPhase
                  key={i}
                  index={i}
                  config={phase}
                  onChange={c => setInflationPhases(p => p.map((x, j) => j === i ? c : x))}
                  onRemove={() => setInflationPhases(p => p.filter((_, j) => j !== i))}
                  canRemove={inflationPhases.length > 1}
                  minStartAge={startAge}
                />
              ))}
              {inflationPhases.length < 5 && (
                <div
                  onClick={() => setInflationPhases(p => [...p, { startAge: Math.min(84, (p[p.length - 1]?.startAge ?? startAge) + 10), rate: 1 }])}
                  style={{ textAlign: "center", padding: 8, borderRadius: 8, cursor: "pointer", border: "1px dashed rgba(255,255,255,0.15)", color: "#8a8f98", fontSize: 12, marginBottom: 12 }}
                >
                  + フェーズ追加
                </div>
              )}
            </Section>

            <Section title="退職設定" icon="🎂" collapsed={sections.retirement} onToggle={() => toggleSection("retirement")}>
              <Slider label="退職年齢" value={retirementAge} onChange={setRetirementAge} min={55} max={75} unit="歳" />
              <Slider label="年金（月額）" value={pensionMonthly} onChange={setPensionMonthly} min={5} max={30} unit="万円" />
            </Section>

            <Section title="住宅" icon="🏠" collapsed={sections.housing} onToggle={() => toggleSection("housing")}>
              <Toggle label="マンション購入" value={buyProperty} onChange={setBuyProperty} />
              {buyProperty ? (
                <>
                  <Slider label="購入年齢" value={purchaseAge} onChange={setPurchaseAge} min={startAge} max={50} unit="歳" />
                  <Slider label="購入前の賃貸家賃（月額）" value={rentBeforePurchase} onChange={setRentBeforePurchase} min={3} max={40} unit="万円" />
                  <Slider label="物件価格" value={propertyPrice} onChange={setPropertyPrice} min={1000} max={15000} step={100} unit="万円" />
                  <Slider label="頭金" value={downPayment} onChange={setDownPayment} min={0} max={3000} step={50} unit="万円" />
                  <Slider label="ローン金利" value={loanRate} onChange={setLoanRate} min={0.1} max={3.0} step={0.1} unit="%" />
                  <Slider label="ローン年数" value={loanYears} onChange={setLoanYears} min={10} max={35} unit="年" />
                  <Slider label="最終資産価値" value={finalPropertyRatio} onChange={setFinalPropertyRatio} min={10} max={100} unit="%" />
                  <div style={{ fontSize: 11, color: "#8a8f98", marginTop: -4 }}>
                    月額返済: {Math.round(monthlyPayment((propertyPrice - downPayment) * 10000, loanRate / 100, loanYears) / 10000 * 10) / 10}万円
                  </div>
                </>
              ) : (
                <>
                  {rentPhases.map((phase, i) => (
                    <RentPhase
                      key={i} index={i} config={phase}
                      onChange={c => setRentPhases(p => p.map((x, j) => j === i ? c : x))}
                      onRemove={() => setRentPhases(p => p.filter((_, j) => j !== i))}
                      canRemove={rentPhases.length > 1}
                      minStartAge={startAge}
                    />
                  ))}
                  {rentPhases.length < 4 && (
                    <div
                      onClick={() => setRentPhases(p => [...p, { rent: 12, startAge: Math.min(70, (p[p.length - 1]?.startAge || startAge) + 5) }])}
                      style={{
                        textAlign: "center", padding: 8, borderRadius: 8, cursor: "pointer",
                        border: "1px dashed rgba(255,255,255,0.15)", color: "#8a8f98", fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      + 住み替え追加
                    </div>
                  )}
                </>
              )}
            </Section>

            <Section title="子供" icon="👶" collapsed={sections.children} onToggle={() => toggleSection("children")}>
              <Slider label="子供の人数" value={numChildren} onChange={handleNumChildren} min={0} max={4} unit="人" />
              {children.map((c, i) => (
                <ChildConfig key={i} index={i} config={c} onChange={v => setChildren(prev => prev.map((x, j) => j === i ? v : x))} />
              ))}
            </Section>

            <Section title="投資" icon="📈" collapsed={sections.invest} onToggle={() => toggleSection("invest")}>
              <div style={{ fontSize: 12, color: "#8a8f98", marginBottom: 8, fontWeight: 600 }}>投資設定（年齢別）</div>
              {investPhases.map((phase, i) => (
                <InvestPhase
                  key={i}
                  index={i}
                  config={phase}
                  onChange={c => setInvestPhases(p => p.map((x, j) => j === i ? c : x))}
                  onRemove={() => setInvestPhases(p => p.filter((_, j) => j !== i))}
                  canRemove={investPhases.length > 1}
                  minStartAge={startAge}
                />
              ))}
              {investPhases.length < 5 && (
                <div
                  onClick={() => setInvestPhases(p => [...p, { startAge: Math.min(84, (p[p.length - 1]?.startAge ?? startAge) + 10), rate: 5, ratio: 80 }])}
                  style={{ textAlign: "center", padding: 8, borderRadius: 8, cursor: "pointer", border: "1px dashed rgba(255,255,255,0.15)", color: "#8a8f98", fontSize: 12, marginBottom: 12 }}
                >
                  + 投資フェーズ追加
                </div>
              )}
            </Section>

            <Section title="その他" icon="🚗" collapsed={sections.extra} onToggle={() => toggleSection("extra")}>
              <Toggle label="車所有" value={carOwnership} onChange={setCarOwnership} />
              {carOwnership && <Slider label="車の年間維持費" value={carAnnualCost} onChange={setCarAnnualCost} min={20} max={120} step={5} unit="万円" />}
              <Slider label="保険料（年間）" value={insuranceAnnual} onChange={setInsuranceAnnual} min={0} max={60} step={2} unit="万円" />
            </Section>

            <Section title="保存・読み込み" icon="💾" collapsed={sections.settings} onToggle={() => toggleSection("settings")}>
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="設定名（省略可）"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.2)", color: "#e8eaed", fontSize: 12, boxSizing: "border-box"
                  }}
                />
              </div>
              <button
                onClick={handleSave}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)", color: "#12141a",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 12
                }}
              >
                💾 保存（JSONファイル + 一覧へ追加）
              </button>
              <label style={{
                display: "block", width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px dashed rgba(255,255,255,0.3)", color: "#8a8f98", fontSize: 12,
                textAlign: "center", cursor: "pointer", marginBottom: 12,
                background: "rgba(255,255,255,0.03)"
              }}>
                📂 ファイルから読み込み
                <input type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: "none" }} />
              </label>

              <div style={{ fontSize: 12, color: "#8a8f98", marginBottom: 8 }}>保存済み設定一覧</div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                {savedList.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#6b7280", padding: 8 }}>まだ保存されていません</div>
                ) : (
                  savedList.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 10px", borderRadius: 8, marginBottom: 6,
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#e8eaed", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.name || "無題"}
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>
                          {item.savedAt ? new Date(item.savedAt).toLocaleString("ja-JP") : "-"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => downloadJson(item.data, `household-sim_${item.name || "export"}.json`)}
                          title="JSONファイルをダウンロード"
                          style={{ padding: "4px 8px", fontSize: 10, borderRadius: 6, border: "none", background: "#3a3f4b", color: "#8a8f98", cursor: "pointer" }}
                        >
                          ⬇
                        </button>
                        <button
                          onClick={() => handleLoad(item)}
                          style={{ padding: "4px 10px", fontSize: 10, borderRadius: 6, border: "none", background: "#4ecdc4", color: "#12141a", fontWeight: 600, cursor: "pointer" }}
                        >
                          読み込み
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(item.id)}
                          title="削除"
                          style={{ padding: "4px 8px", fontSize: 10, borderRadius: 6, border: "none", background: "#ff6b6b33", color: "#ff6b6b", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>

          {/* Charts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="dashboard-area">
            {/* 純資産推移 */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "18px 14px",
              border: "1px solid rgba(255,255,255,0.06)"
            }} className="fade-in chart-container">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px 4px", color: "#e8eaed" }}>資産・負債推移</h3>
              <div className="chart-wrapper-large" style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gAsset" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ecdc4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#4ecdc4" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gProp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffd93d" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ffd93d" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} unit="歳" />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <ReferenceLine x={retirementAge} stroke="#ff6b6b44" strokeDasharray="4 4" label={{ value: "退職", fill: "#ff6b6b", fontSize: 10 }} />
                  <Area type="monotone" dataKey="金融資産" stroke="#4ecdc4" fill="url(#gAsset)" strokeWidth={2} />
                  {buyProperty && <Area type="monotone" dataKey="不動産価値" stroke="#ffd93d" fill="url(#gProp)" strokeWidth={1.5} />}
                  {buyProperty && <Area type="monotone" dataKey="負債" stroke="#ff6b6b" fill="rgba(255,107,107,0.08)" strokeWidth={1.5} />}
                  <Line type="monotone" dataKey="純資産" stroke="#7c83ff" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* 収支推移 */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "18px 14px",
              border: "1px solid rgba(255,255,255,0.06)"
            }} className="fade-in chart-container">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px 4px", color: "#e8eaed" }}>年間収支内訳</h3>
              <div className="chart-wrapper" style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} unit="歳" />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <ReferenceLine x={retirementAge} stroke="#ff6b6b44" strokeDasharray="4 4" />
                  <Bar dataKey="生活費" stackId="exp" fill="#ff6b6b" radius={[0, 0, 0, 0]} opacity={0.7} />
                  <Bar dataKey="住居費" stackId="exp" fill="#ffa07a" radius={[0, 0, 0, 0]} opacity={0.7} />
                  <Bar dataKey="教育費" stackId="exp" fill="#ffd93d" radius={[0, 0, 0, 0]} opacity={0.7} />
                  <Bar dataKey="その他" stackId="exp" fill="#b8860b" radius={[0, 0, 0, 0]} opacity={0.7} />
                  <Bar dataKey="特別支出" stackId="exp" fill="#c77dff" radius={[2, 2, 0, 0]} opacity={0.7} />
                  <Line type="monotone" dataKey="額面年収" stroke="#8a8f98" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="年収手取り" stroke="#4ecdc4" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Detail Table */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "18px 14px",
              border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto"
            }} className="fade-in detail-table-wrapper">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px 4px", color: "#e8eaed" }}>年齢別詳細（5年刻み）</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} className="detail-table">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["年齢", "手取り", "生活費", "特別支出", "支出計", "貯蓄", "5年間投資額", "金融資産", buyProperty && "不動産", buyProperty && "負債", "純資産"].filter(Boolean).map((h, i) => (
                      <th key={i} style={{ padding: "8px 6px", textAlign: "right", color: "#8a8f98", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.filter(d => d.age % 5 === 0 || d.age === 85).map(d => (
                    <tr key={d.age} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "6px", color: "#e8eaed", fontWeight: 600 }}>{d.age}歳</td>
                      <td style={{ padding: "6px", textAlign: "right", color: "#4ecdc4" }}>{d.年収手取り}万</td>
                      <td style={{ padding: "6px", textAlign: "right", color: "#ff6b6b" }}>{d.生活費計}万</td>
                      <td style={{ padding: "6px", textAlign: "right", color: "#ffa07a" }}>{d.特別支出}万</td>
                      <td style={{ padding: "6px", textAlign: "right", color: "#ff6b6b" }}>{d.年間支出}万</td>
                      <td style={{ padding: "6px", textAlign: "right", color: d.年間貯蓄 >= 0 ? "#45b7aa" : "#ff6b6b" }}>{d.年間貯蓄}万</td>
                      <td style={{ padding: "6px", textAlign: "right", color: "#4ecdc4" }}>
                        {fmtYen(data.filter(x => x.age >= Math.max(startAge, d.age - 4) && x.age <= d.age).reduce((s, x) => s + (x.年間投資額 || 0), 0))}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right", color: "#7c83ff" }}>{fmtYen(d.金融資産)}</td>
                      {buyProperty && <td style={{ padding: "6px", textAlign: "right", color: "#ffd93d" }}>{fmtYen(d.不動産価値)}</td>}
                      {buyProperty && <td style={{ padding: "6px", textAlign: "right", color: "#ff6b6b" }}>{fmtYen(d.負債)}</td>}
                      <td style={{ padding: "6px", textAlign: "right", color: d.純資産 >= 0 ? "#e8eaed" : "#ff6b6b", fontWeight: 600 }}>{fmtYen(d.純資産)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
