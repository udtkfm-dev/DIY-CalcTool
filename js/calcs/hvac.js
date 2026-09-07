// hvac.js — 空調・断熱（熱貫流率・熱損失・換気量・必要能力の目安）
//
// 設計注記: 熱の分野だけは面積の内部単位(mm²)と実務単位(m²)の差が大きい。
// U値・熱損失の式はすべて m² 基準のため、run() の中で内部値(mm²)を m² に直してから
// 計算する（1e6 で割る）。入力欄の既定単位を m² にしておくとユーザーの体感と一致する。

import { calcError } from '../core/errors.js';

const MM2_PER_M2 = 1e6;

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '断熱・空調の性能は建物の状態・気象条件・使い方で大きく変わります。設計や機器選定は必ず専門家にご確認ください。'
];

const areaField = (key, label, help) => ({
  key, label, quantity: 'area', defaultUnit: 'm2',
  min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help
});

/* ==================================================================== *
 * hvac.uvalue 熱貫流率 U値（層構成から）
 * ==================================================================== */

const LAMBDA_NOTE =
  '熱伝導率の目安: グラスウール16K 0.045 / 押出法ポリスチレン3種 0.028 / ' +
  '木材 0.12 / 石膏ボード 0.22 / コンクリート 1.6 / 合板 0.16（単位はいずれも W/(m·K)）';

function layerFields(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push({
      key: `t${i}`, label: `材料${i}の厚さ`, quantity: 'length', defaultUnit: 'mm',
      min: 0, exclusiveMin: true, optional: true
    });
    out.push({
      key: `k${i}`, label: `材料${i}の熱伝導率`, quantity: 'conductivity', defaultUnit: 'WmK',
      min: 0, exclusiveMin: true, optional: true, help: i === 1 ? LAMBDA_NOTE : undefined
    });
  }
  return out;
}

/** 層 i の熱抵抗 R = 厚さ(m) ÷ 熱伝導率 */
function layerR(v, i) {
  const t = v[`t${i}`];
  const k = v[`k${i}`];
  if (!Number.isFinite(t) || !Number.isFinite(k) || k === 0) return 0;
  return t / 1000 / k;
}

function uvalueSolver(layers) {
  const requires = [];
  for (let i = 1; i <= layers; i++) requires.push(`t${i}`, `k${i}`);
  requires.push('Rsurface');
  return {
    requires,
    provides: ['R', 'U'],
    validate(v) {
      for (let i = 1; i <= layers; i++) if (v[`k${i}`] === 0) return calcError('ZERO', `k${i}`);
      return null;
    },
    run(v, ctx) {
      let R = v.Rsurface;
      const parts = [ctx.f(v.Rsurface)];
      for (let i = 1; i <= layers; i++) {
        const ri = layerR(v, i);
        R += ri;
        parts.push(`${ctx.n(v[`t${i}`], 'length')}mm÷1000÷${ctx.f(v[`k${i}`])}`);
      }
      const U = 1 / R;
      return {
        values: { R, U },
        formulaName: '熱貫流率（U値）',
        steps: [
          { formula: 'R = 表面熱伝達抵抗 + Σ(厚さ[m] ÷ 熱伝導率)', substituted: parts.join(' + '), result: ctx.u(R, 'thermalRes') },
          { formula: 'U = 1 ÷ R', substituted: `1 ÷ ${ctx.f(R)}`, result: ctx.u(U, 'uvalue') }
        ]
      };
    }
  };
}

export const hvacUvalue = {
  id: 'hvac.uvalue',
  category: 'hvac',
  title: '熱貫流率（U値）',
  subtitle: '壁や屋根の層構成から、熱の伝わりやすさを計算',
  keywords: ['U値', '熱貫流率', '断熱', '熱抵抗', 'R値', '熱伝導率', '壁', '屋根'],
  shape: 'wallLayers',
  shapeMap: { t1: 't1', t2: 't2', t3: 't3' },
  fields: [
    ...layerFields(3),
    {
      key: 'Rsurface', label: '表面熱伝達抵抗の合計', quantity: 'thermalRes', defaultUnit: 'm2KW',
      min: 0, optional: true,
      help: '室内側と屋外側の合計。外壁の目安 0.15、屋根 0.14、床 0.19（m²·K/W）'
    },
    { key: 'R', label: '熱抵抗の合計 R', quantity: 'thermalRes', defaultUnit: 'm2KW', min: 0, exclusiveMin: true, optional: true },
    { key: 'U', label: '熱貫流率 U', quantity: 'uvalue', defaultUnit: 'Wm2K', min: 0, exclusiveMin: true, optional: true }
  ],

  // 層は3層 → 2層 → 1層 の順に、入力が揃ったものから計算する
  solvers: [
    uvalueSolver(3),
    uvalueSolver(2),
    uvalueSolver(1),
    {
      requires: ['R'],
      provides: ['U'],
      validate(v) { if (v.R === 0) return calcError('ZERO', 'R'); return null; },
      run(v, ctx) {
        const U = 1 / v.R;
        return { values: { U }, formulaName: '熱貫流率', steps: [{ formula: 'U = 1 ÷ R', substituted: `1 ÷ ${ctx.f(v.R)}`, result: ctx.u(U, 'uvalue') }] };
      }
    },
    {
      requires: ['U'],
      provides: ['R'],
      validate(v) { if (v.U === 0) return calcError('ZERO', 'U'); return null; },
      run(v, ctx) {
        const R = 1 / v.U;
        return { values: { R }, formulaName: '熱抵抗', steps: [{ formula: 'R = 1 ÷ U', substituted: `1 ÷ ${ctx.f(v.U)}`, result: ctx.u(R, 'thermalRes') }] };
      }
    }
  ],

  outputs: [
    { key: 'R', label: '熱抵抗の合計 R', quantity: 'thermalRes', primary: true },
    { key: 'U', label: '熱貫流率 U', quantity: 'uvalue', primary: true }
  ],

  notes: NOTES.concat([LAMBDA_NOTE, '数値が小さいU値ほど熱が伝わりにくいことを表します。基準への適合可否はここでは判定しません。'])
};

/* ==================================================================== *
 * hvac.heatLoss 熱損失（U × A × 温度差）
 * ==================================================================== */

export const hvacHeatLoss = {
  id: 'hvac.heatLoss',
  category: 'hvac',
  title: '熱損失（U × 面積 × 温度差）',
  subtitle: '壁や窓から逃げる熱量を計算',
  keywords: ['熱損失', '熱負荷', 'U値', '温度差', '暖房', '冷房', 'W'],
  shape: null,

  fields: [
    { key: 'U', label: '熱貫流率 U', quantity: 'uvalue', defaultUnit: 'Wm2K', min: 0, exclusiveMin: true, optional: true, help: '「熱貫流率（U値）」の計算で求められます' },
    areaField('A', '面積', '対象となる壁・窓などの面積'),
    { key: 'dT', label: '内外の温度差', quantity: 'tempDiff', defaultUnit: 'K', min: 0, exclusiveMin: true, optional: true, help: '室温と外気温の差' },
    { key: 'Q', label: '熱損失', quantity: 'power', defaultUnit: 'W', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['U', 'A', 'dT'],
      provides: ['Q'],
      run(v, ctx) {
        const aM2 = v.A / MM2_PER_M2;
        const Q = v.U * aM2 * v.dT;
        return {
          values: { Q },
          formulaName: '熱損失',
          steps: [{ formula: 'Q = U × 面積[m²] × 温度差', substituted: `${ctx.f(v.U)} × ${ctx.f(aM2)} × ${ctx.f(v.dT)}`, result: ctx.u(Q, 'power') }]
        };
      }
    },
    {
      requires: ['Q', 'A', 'dT'],
      provides: ['U'],
      validate(v) { if (v.A === 0 || v.dT === 0) return calcError('ZERO', 'A'); return null; },
      run(v, ctx) {
        const aM2 = v.A / MM2_PER_M2;
        const U = v.Q / (aM2 * v.dT);
        return {
          values: { U },
          formulaName: '必要な熱貫流率',
          steps: [{ formula: 'U = Q ÷ (面積[m²] × 温度差)', substituted: `${ctx.f(v.Q)} ÷ (${ctx.f(aM2)} × ${ctx.f(v.dT)})`, result: ctx.u(U, 'uvalue') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'U', label: '熱貫流率', quantity: 'uvalue' },
    { key: 'A', label: '面積', quantity: 'area', defaultUnit: 'm2', fixedUnit: true },
    { key: 'dT', label: '温度差', quantity: 'tempDiff' },
    { key: 'Q', label: '熱損失', quantity: 'power', defaultUnit: 'W', fixedUnit: true, primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * hvac.ventilation 必要換気量
 * ==================================================================== */

export const hvacVentilation = {
  id: 'hvac.ventilation',
  category: 'hvac',
  title: '必要換気量',
  subtitle: '部屋の容積と換気回数から、1時間あたりの換気量を計算',
  keywords: ['換気', '換気量', '換気回数', '24時間換気', 'm³/h', '給気', '排気'],
  shape: 'box3d',
  shapeMap: { w: 'w', d: 'd', h: 'h' },

  fields: [
    { key: 'w', label: '幅', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'd', label: '奥行き', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'h', label: '天井高', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'n', label: '換気回数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '1時間に室内の空気が入れ替わる回数。住宅の居室は0.5回/h以上が目安' },
    { key: 'Q', label: '必要換気量', quantity: 'flow', defaultUnit: 'm3h', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'h', 'n'],
      provides: ['V_m3', 'Q'],
      run(v, ctx) {
        const volMm3 = v.w * v.d * v.h;
        const volM3 = volMm3 / 1e9;
        const qM3h = volM3 * v.n;
        const Q = (qM3h * 1000) / 60; // 内部単位 L/min
        return {
          values: { V_m3: volMm3, Q },
          formulaName: '必要換気量',
          steps: [
            { formula: '容積 = 幅 × 奥行き × 天井高', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.f(volM3) + ' m³' },
            { formula: '換気量 = 容積 × 換気回数', substituted: `${ctx.f(volM3)} × ${ctx.f(v.n)}`, result: ctx.u(Q, 'flow') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'V_m3', label: '部屋の容積', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true },
    { key: 'Q', label: '必要換気量', quantity: 'flow', defaultUnit: 'm3h', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat(['換気回数の必要値は室の用途・法令・機器の仕様で異なります。ここでは入力した回数にもとづく計算のみを行います。'])
};

/* ==================================================================== *
 * hvac.aircon 冷暖房能力の目安
 * ==================================================================== */

export const hvacAircon = {
  id: 'hvac.aircon',
  category: 'hvac',
  title: '冷暖房能力の目安',
  subtitle: '部屋の面積と単位面積あたりの負荷から、必要な能力を概算',
  keywords: ['エアコン', '冷房', '暖房', '能力', 'kW', '畳数', '空調'],
  shape: null,

  fields: [
    areaField('A', '部屋の面積'),
    {
      key: 'load', label: '単位面積あたりの負荷', quantity: 'number', defaultUnit: 'number',
      min: 0, exclusiveMin: true, optional: true,
      help: '1m²あたりの必要能力(W)。木造洋室の冷房で 160〜200、暖房で 200〜250 が一般的な目安'
    },
    { key: 'P', label: '必要能力', quantity: 'power', defaultUnit: 'kW', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['A', 'load'],
      provides: ['P', 'jo'],
      run(v, ctx) {
        const aM2 = v.A / MM2_PER_M2;
        const P = aM2 * v.load;
        const jo = v.A / 1653000; // 中京間換算の畳数
        return {
          values: { P, jo },
          formulaName: '必要能力の概算',
          steps: [
            { formula: '必要能力 = 面積[m²] × 単位面積あたりの負荷', substituted: `${ctx.f(aM2)} × ${ctx.f(v.load)}`, result: ctx.u(P, 'power') },
            { formula: '畳数の目安 = 面積 ÷ 1.653', substituted: `${ctx.f(aM2)} ÷ 1.653`, result: ctx.f(jo) + ' 畳' }
          ]
        };
      }
    },
    {
      requires: ['P', 'load'],
      provides: ['A'],
      validate(v) { if (v.load === 0) return calcError('ZERO', 'load'); return null; },
      run(v, ctx) {
        const aM2 = v.P / v.load;
        const A = aM2 * MM2_PER_M2;
        return {
          values: { A },
          formulaName: '対応できる面積の概算',
          steps: [{ formula: '面積 = 必要能力 ÷ 単位面積あたりの負荷', substituted: `${ctx.f(v.P)} ÷ ${ctx.f(v.load)}`, result: ctx.u(A, 'area') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'A', label: '部屋の面積', quantity: 'area', defaultUnit: 'm2', fixedUnit: true },
    { key: 'jo', label: '畳数の目安', quantity: 'number' },
    { key: 'P', label: '必要能力', quantity: 'power', defaultUnit: 'kW', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat([
    '断熱性能・方位・窓の大きさ・階数・在室人数によって必要な能力は大きく変わります。機器の選定は必ず専門家・メーカーの資料でご確認ください。',
    '畳数は中京間（1畳 = 1.653 m²）で換算しています。'
  ])
};

/* ==================================================================== *
 * hvac.dew 露点温度（Magnusの式）
 * ==================================================================== *
 * α = ln(RH/100) + (17.62 × T) / (243.12 + T)
 * 露点 Td = 243.12 × α ÷ (17.62 − α)
 * 気温は氷点下もあり得るため、温度のフィールドには min を付けない
 * （min 未設定 = 独自テンキーに符号キーが出る。12-1の規約）。
 */

export const hvacDew = {
  id: 'hvac.dew',
  category: 'hvac',
  title: '露点温度（結露するかの目安）',
  subtitle: '気温と湿度から、結露が始まる温度を計算',
  keywords: ['露点', '結露', '湿度', '相対湿度', 'カビ', 'windows', '窓', 'Magnus'],
  shape: null,

  fields: [
    { key: 'T', label: '気温', quantity: 'temperature', defaultUnit: 'degC', optional: true, help: '室温。氷点下はマイナスで入力します' },
    { key: 'RH', label: '相対湿度（%）', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, max: 100, optional: true },
    { key: 'Td', label: '露点温度', quantity: 'temperature', defaultUnit: 'degC', optional: true }
  ],

  solvers: [
    {
      requires: ['T', 'RH'],
      provides: ['Td', 'diff', 'absHumid'],
      validate(v) {
        if (v.RH <= 0 || v.RH > 100) return calcError('DOMAIN', 'RH');
        return null;
      },
      run(v, ctx) {
        const alpha = Math.log(v.RH / 100) + (17.62 * v.T) / (243.12 + v.T);
        const Td = (243.12 * alpha) / (17.62 - alpha);
        // 飽和水蒸気圧(hPa)から容積絶対湿度(g/m³)を求める
        const es = 6.112 * Math.exp((17.62 * v.T) / (243.12 + v.T));
        const e = es * (v.RH / 100);
        const absHumid = (217 * e) / (v.T + 273.15);
        return {
          values: { Td, diff: v.T - Td, absHumid },
          formulaName: 'Magnusの式',
          steps: [
            { formula: 'α = ln(湿度 ÷ 100) + (17.62 × 気温) ÷ (243.12 + 気温)', substituted: `ln(${ctx.f(v.RH)} ÷ 100) + (17.62 × ${ctx.f(v.T)}) ÷ (243.12 + ${ctx.f(v.T)})`, result: ctx.f(alpha) },
            { formula: '露点 = 243.12 × α ÷ (17.62 − α)', substituted: `243.12 × ${ctx.f(alpha)} ÷ (17.62 − ${ctx.f(alpha)})`, result: ctx.u(Td, 'temperature') },
            { formula: '気温との差', substituted: `${ctx.f(v.T)} − ${ctx.f(Td)}`, result: ctx.f(v.T - Td) + ' ℃' },
            { formula: '容積絶対湿度 = 217 × 水蒸気圧 ÷ (気温 + 273.15)', substituted: `217 × ${ctx.f(e)} ÷ ${ctx.f(v.T + 273.15)}`, result: ctx.f(absHumid) + ' g/m³' }
          ]
        };
      }
    },
    {
      requires: ['T', 'Td'],
      provides: ['RH', 'diff'],
      run(v, ctx) {
        const esT = 6.112 * Math.exp((17.62 * v.T) / (243.12 + v.T));
        const esTd = 6.112 * Math.exp((17.62 * v.Td) / (243.12 + v.Td));
        const RH = (esTd / esT) * 100;
        return {
          values: { RH, diff: v.T - v.Td },
          formulaName: '露点から相対湿度を逆算',
          steps: [
            { formula: '相対湿度 = 露点の飽和水蒸気圧 ÷ 気温の飽和水蒸気圧 × 100', substituted: `${ctx.f(esTd)} ÷ ${ctx.f(esT)} × 100`, result: ctx.f(RH) + ' %' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'Td', label: '露点温度', quantity: 'temperature', primary: true },
    { key: 'RH', label: '相対湿度（%）', quantity: 'number' },
    { key: 'diff', label: '気温との差', quantity: 'number', primary: true, help: '表面温度がこの差より下がると結露が始まります' },
    { key: 'absHumid', label: '容積絶対湿度（g/m³）', quantity: 'number' }
  ],

  notes: NOTES.concat([
    '露点は「その空気が結露を始める温度」です。窓や壁の表面温度が露点を下回ると結露します。実際の結露は表面の状態や空気の動きにも左右されます。'
  ])
};

export default [hvacUvalue, hvacHeatLoss, hvacVentilation, hvacAircon, hvacDew];
