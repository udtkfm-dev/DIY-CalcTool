// elec.js — CALC_SPEC.md「電気」（Phase 4 第10グループ）
//
// 設計注記: V(電圧)・A(電流)・Ω(抵抗)・W(電力) は units.js に新規追加した量種
// （voltage/current/resistance/power/energy/currency）を使う。長さ・面積等と違い
// 単位換算の需要が薄いため、単位ピッカーを持たない単一単位（または W/kW など
// 実用上必要な2単位のみ）で定義した（units.js への追加は既存の量種を変更しない
// 純粋な追加であり、既存コードの挙動には影響しない）。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '電気工事は資格が必要な作業を含みます。配線・分電盤に関わる作業は必ず専門家にご確認ください。'
];

const vField = { key: 'V', label: '電圧', quantity: 'voltage', defaultUnit: 'V', min: 0, exclusiveMin: true, optional: true };
const iField = { key: 'I', label: '電流', quantity: 'current', defaultUnit: 'A', min: 0, exclusiveMin: true, optional: true };
const rField = { key: 'R', label: '抵抗', quantity: 'resistance', defaultUnit: 'ohm', min: 0, exclusiveMin: true, optional: true };
const pField = { key: 'P', label: '電力', quantity: 'power', defaultUnit: 'W', min: 0, exclusiveMin: true, optional: true };

/* ==================================================================== *
 * elec.ohm オームの法則（V・I・R・P の相互計算）
 * ==================================================================== */

export const elecOhm = {
  id: 'elec.ohm',
  category: 'elec',
  title: 'オームの法則（V・I・R・P）',
  subtitle: '電圧・電流・抵抗・電力のうち2つから残り2つを計算',
  keywords: ['オームの法則', '電圧', '電流', '抵抗', '電力', 'V', 'A', 'Ω', 'W'],
  shape: null,

  fields: [vField, iField, rField, pField],

  solvers: [
    {
      requires: ['V', 'I'],
      provides: ['R', 'P'],
      run(v, ctx) {
        const R = v.V / v.I;
        const P = v.V * v.I;
        return { values: { R, P }, formulaName: 'オームの法則', steps: [{ formula: 'R = V ÷ I', substituted: `${ctx.n(v.V, 'voltage')} ÷ ${ctx.n(v.I, 'current')}`, result: ctx.u(R, 'resistance') }, { formula: 'P = V × I', substituted: `${ctx.n(v.V, 'voltage')} × ${ctx.n(v.I, 'current')}`, result: ctx.u(P, 'power') }] };
      }
    },
    {
      requires: ['V', 'R'],
      provides: ['I', 'P'],
      validate(v) { if (v.R === 0) return calcError('ZERO', 'R'); return null; },
      run(v, ctx) {
        const I = v.V / v.R;
        const P = (v.V * v.V) / v.R;
        return { values: { I, P }, formulaName: 'オームの法則', steps: [{ formula: 'I = V ÷ R', substituted: `${ctx.n(v.V, 'voltage')} ÷ ${ctx.n(v.R, 'resistance')}`, result: ctx.u(I, 'current') }, { formula: 'P = V² ÷ R', substituted: `${ctx.n(v.V, 'voltage')}² ÷ ${ctx.n(v.R, 'resistance')}`, result: ctx.u(P, 'power') }] };
      }
    },
    {
      requires: ['V', 'P'],
      provides: ['I', 'R'],
      run(v, ctx) {
        const I = v.P / v.V;
        const R = (v.V * v.V) / v.P;
        return { values: { I, R }, formulaName: 'オームの法則', steps: [{ formula: 'I = P ÷ V', substituted: `${ctx.n(v.P, 'power')} ÷ ${ctx.n(v.V, 'voltage')}`, result: ctx.u(I, 'current') }, { formula: 'R = V² ÷ P', substituted: `${ctx.n(v.V, 'voltage')}² ÷ ${ctx.n(v.P, 'power')}`, result: ctx.u(R, 'resistance') }] };
      }
    },
    {
      requires: ['I', 'R'],
      provides: ['V', 'P'],
      run(v, ctx) {
        const V = v.I * v.R;
        const P = v.I * v.I * v.R;
        return { values: { V, P }, formulaName: 'オームの法則', steps: [{ formula: 'V = I × R', substituted: `${ctx.n(v.I, 'current')} × ${ctx.n(v.R, 'resistance')}`, result: ctx.u(V, 'voltage') }, { formula: 'P = I² × R', substituted: `${ctx.n(v.I, 'current')}² × ${ctx.n(v.R, 'resistance')}`, result: ctx.u(P, 'power') }] };
      }
    },
    {
      requires: ['I', 'P'],
      provides: ['V', 'R'],
      validate(v) { if (v.I === 0) return calcError('ZERO', 'I'); return null; },
      run(v, ctx) {
        const V = v.P / v.I;
        const R = v.P / (v.I * v.I);
        return { values: { V, R }, formulaName: 'オームの法則', steps: [{ formula: 'V = P ÷ I', substituted: `${ctx.n(v.P, 'power')} ÷ ${ctx.n(v.I, 'current')}`, result: ctx.u(V, 'voltage') }, { formula: 'R = P ÷ I²', substituted: `${ctx.n(v.P, 'power')} ÷ ${ctx.n(v.I, 'current')}²`, result: ctx.u(R, 'resistance') }] };
      }
    },
    {
      requires: ['R', 'P'],
      provides: ['V', 'I'],
      run(v, ctx) {
        const V = Math.sqrt(v.P * v.R);
        const I = Math.sqrt(v.P / v.R);
        return { values: { V, I }, formulaName: 'オームの法則', steps: [{ formula: 'V = √(P × R)', substituted: `√(${ctx.n(v.P, 'power')} × ${ctx.n(v.R, 'resistance')})`, result: ctx.u(V, 'voltage') }, { formula: 'I = √(P ÷ R)', substituted: `√(${ctx.n(v.P, 'power')} ÷ ${ctx.n(v.R, 'resistance')})`, result: ctx.u(I, 'current') }] };
      }
    }
  ],

  outputs: [
    { key: 'V', label: '電圧', quantity: 'voltage', primary: true },
    { key: 'I', label: '電流', quantity: 'current', primary: true },
    { key: 'R', label: '抵抗', quantity: 'resistance' },
    { key: 'P', label: '電力', quantity: 'power' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * elec.cost 電力量・電気料金概算
 * ==================================================================== */

export const elecCost = {
  id: 'elec.cost',
  category: 'elec',
  title: '電力量・電気料金の概算',
  subtitle: '消費電力・使用時間・電力量単価から、電力量と概算料金を計算',
  keywords: ['電気料金', '電力量', 'kWh', '電気代', '消費電力'],
  shape: null,

  fields: [
    pField,
    { key: 'hours', label: '使用時間', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は時間(h)' },
    { key: 'rate', label: '電力量単価', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '1kWhあたりの料金（円）' },
    { key: 'energy', label: '電力量', quantity: 'energy', defaultUnit: 'kWh', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'cost', label: '概算料金', quantity: 'currency', defaultUnit: 'yen', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['P', 'hours', 'rate'],
      provides: ['energy', 'cost'],
      run(v, ctx) {
        const energyKWh = (v.P / 1000) * v.hours;
        const energy = energyKWh * 1000; // 内部単位(Wh)
        const cost = energyKWh * v.rate;
        return {
          values: { energy, cost },
          formulaName: '電気料金の概算',
          steps: [
            { formula: '電力量(kWh) = 電力(W) ÷ 1000 × 使用時間', substituted: `${ctx.n(v.P, 'power')} ÷ 1000 × ${ctx.f(v.hours)}`, result: ctx.f(energyKWh) + ' kWh' },
            { formula: '料金 = 電力量(kWh) × 単価', substituted: `${ctx.f(energyKWh)} × ${ctx.f(v.rate)}`, result: ctx.u(cost, 'currency') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'P', label: '消費電力', quantity: 'power' },
    { key: 'hours', label: '使用時間', quantity: 'number' },
    { key: 'rate', label: '電力量単価', quantity: 'number' },
    { key: 'energy', label: '電力量', quantity: 'energy', defaultUnit: 'kWh', fixedUnit: true, primary: true },
    { key: 'cost', label: '概算料金', quantity: 'currency', primary: true }
  ],

  notes: NOTES.concat(['実際の電気料金は基本料金・燃料費調整額・再エネ賦課金などを含みます。ここでは電力量分の概算のみを計算しています。'])
};

/* ==================================================================== *
 * elec.series / elec.parallel 直列・並列合成抵抗
 * ==================================================================== */

function buildResistorField(key, n) {
  return { key, label: `抵抗${n}`, quantity: 'resistance', defaultUnit: 'ohm', min: 0, exclusiveMin: true, optional: true };
}

const RES_KEYS = ['R1', 'R2', 'R3', 'R4'];

function buildCombineSolvers(mode) {
  const solvers = [];
  for (let k = 4; k >= 2; k--) {
    const keys = RES_KEYS.slice(0, k);
    solvers.push({
      requires: keys,
      provides: ['Rtotal'],
      run(v, ctx) {
        let Rtotal;
        let formula;
        let substituted;
        if (mode === 'series') {
          Rtotal = keys.reduce((s, kk) => s + v[kk], 0);
          formula = '合成抵抗 = ' + keys.map((kk) => kk).join(' + ');
          substituted = keys.map((kk) => ctx.n(v[kk], 'resistance')).join(' + ');
        } else {
          const invSum = keys.reduce((s, kk) => s + 1 / v[kk], 0);
          Rtotal = 1 / invSum;
          formula = '1 ÷ 合成抵抗 = ' + keys.map((kk) => `1÷${kk}`).join(' + ');
          substituted = keys.map((kk) => `1÷${ctx.n(v[kk], 'resistance')}`).join(' + ');
        }
        return { values: { Rtotal }, formulaName: mode === 'series' ? '直列合成抵抗' : '並列合成抵抗', steps: [{ formula, substituted, result: ctx.u(Rtotal, 'resistance') }] };
      }
    });
  }
  return solvers;
}

export const elecSeries = {
  id: 'elec.series',
  category: 'elec',
  title: '直列合成抵抗',
  subtitle: '2〜4個の抵抗（直列）から合成抵抗を計算',
  keywords: ['直列', '合成抵抗', '抵抗', 'Ω'],
  shape: null,

  fields: [buildResistorField('R1', 1), buildResistorField('R2', 2), buildResistorField('R3', 3), buildResistorField('R4', 4)],

  solvers: buildCombineSolvers('series'),

  outputs: [
    { key: 'R1', label: '抵抗1', quantity: 'resistance' },
    { key: 'R2', label: '抵抗2', quantity: 'resistance' },
    { key: 'R3', label: '抵抗3', quantity: 'resistance' },
    { key: 'R4', label: '抵抗4', quantity: 'resistance' },
    { key: 'Rtotal', label: '合成抵抗', quantity: 'resistance', primary: true }
  ],

  notes: NOTES
};

export const elecParallel = {
  id: 'elec.parallel',
  category: 'elec',
  title: '並列合成抵抗',
  subtitle: '2〜4個の抵抗（並列）から合成抵抗を計算',
  keywords: ['並列', '合成抵抗', '抵抗', 'Ω'],
  shape: null,

  fields: [buildResistorField('R1', 1), buildResistorField('R2', 2), buildResistorField('R3', 3), buildResistorField('R4', 4)],

  solvers: buildCombineSolvers('parallel'),

  outputs: [
    { key: 'R1', label: '抵抗1', quantity: 'resistance' },
    { key: 'R2', label: '抵抗2', quantity: 'resistance' },
    { key: 'R3', label: '抵抗3', quantity: 'resistance' },
    { key: 'R4', label: '抵抗4', quantity: 'resistance' },
    { key: 'Rtotal', label: '合成抵抗', quantity: 'resistance', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * elec.voltDrop 電圧降下
 * ==================================================================== */

const K_NOTE = '配線方式の係数 K: 単相2線式 = 35.6 / 三相3線式 = 30.8 / 単相3線式（中性線と電圧線の間）= 17.8';

export const elecVoltDrop = {
  id: 'elec.voltDrop',
  category: 'elec',
  title: '電圧降下',
  subtitle: '電線の長さ・電流・断面積から電圧降下を計算（断面積の逆算もできます）',
  keywords: ['電圧降下', '電線', 'ケーブル', 'sq', '断面積', '幹線', '延長'],
  shape: 'lineSegment',
  shapeMap: { total: 'L' },
  fields: [
    { key: 'L', label: '電線のこう長', quantity: 'length', defaultUnit: 'm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help: '電源から負荷までの片道の長さ' },
    iField,
    { key: 'A', label: '電線の断面積', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は mm²（いわゆる「スケ」）。1.6mm=2.0sq / 2.0mm=3.5sq 相当' },
    { key: 'K', label: '方式の係数 K', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: K_NOTE },
    { key: 'e', label: '電圧降下', quantity: 'voltage', defaultUnit: 'V', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['L', 'I', 'A', 'K'],
      provides: ['e'],
      validate(v) { if (v.A === 0) return calcError('ZERO', 'A'); return null; },
      run(v, ctx) {
        const lm = v.L / 1000; // 内部単位mm → m
        const e = (v.K * lm * v.I) / (1000 * v.A);
        return {
          values: { e },
          formulaName: '電圧降下',
          steps: [{ formula: 'e = K × こう長[m] × 電流 ÷ (1000 × 断面積)', substituted: `${ctx.f(v.K)} × ${ctx.f(lm)} × ${ctx.n(v.I, 'current')} ÷ (1000 × ${ctx.f(v.A)})`, result: ctx.u(e, 'voltage') }]
        };
      }
    },
    {
      requires: ['L', 'I', 'e', 'K'],
      provides: ['A'],
      validate(v) { if (v.e === 0) return calcError('ZERO', 'e'); return null; },
      run(v, ctx) {
        const lm = v.L / 1000;
        const A = (v.K * lm * v.I) / (1000 * v.e);
        return {
          values: { A },
          formulaName: '必要な電線の断面積',
          steps: [{ formula: '断面積 = K × こう長[m] × 電流 ÷ (1000 × 電圧降下)', substituted: `${ctx.f(v.K)} × ${ctx.f(lm)} × ${ctx.n(v.I, 'current')} ÷ (1000 × ${ctx.n(v.e, 'voltage')})`, result: ctx.f(A) + ' mm²' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'L', label: 'こう長', quantity: 'length', defaultUnit: 'm', fixedUnit: true },
    { key: 'I', label: '電流', quantity: 'current' },
    { key: 'A', label: '電線の断面積', quantity: 'number', primary: true },
    { key: 'e', label: '電圧降下', quantity: 'voltage', primary: true }
  ],

  notes: NOTES.concat([
    K_NOTE,
    '電線の太さは電圧降下のほかに許容電流・施工条件・法令でも決まります。ここでは電圧降下の計算のみを行い、電線の適否は判定しません。'
  ])
};

/* ==================================================================== *
 * elec.threePhase 三相電力
 * ==================================================================== */

export const elecThreePhase = {
  id: 'elec.threePhase',
  category: 'elec',
  title: '三相電力（P = √3 × V × I × 力率）',
  subtitle: '三相交流の電力・電流・力率を相互に計算',
  keywords: ['三相', '動力', '力率', 'cosφ', '√3', '皮相電力', 'kVA'],
  shape: null,

  fields: [
    vField,
    iField,
    { key: 'pf', label: '力率', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, max: 1, optional: true, help: '0〜1の値。モーターで 0.8 前後が一般的' },
    pField
  ],

  solvers: [
    {
      requires: ['V', 'I', 'pf'],
      provides: ['P', 'S'],
      run(v, ctx) {
        const S = Math.sqrt(3) * v.V * v.I;
        const P = S * v.pf;
        return {
          values: { P, S },
          formulaName: '三相電力',
          steps: [
            { formula: '皮相電力 S = √3 × V × I', substituted: `√3 × ${ctx.n(v.V, 'voltage')} × ${ctx.n(v.I, 'current')}`, result: ctx.u(S, 'power') },
            { formula: '有効電力 P = S × 力率', substituted: `${ctx.n(S, 'power')} × ${ctx.f(v.pf)}`, result: ctx.u(P, 'power') }
          ]
        };
      }
    },
    {
      requires: ['P', 'V', 'pf'],
      provides: ['I', 'S'],
      validate(v) { if (v.V === 0 || v.pf === 0) return calcError('ZERO', 'V'); return null; },
      run(v, ctx) {
        const I = v.P / (Math.sqrt(3) * v.V * v.pf);
        const S = Math.sqrt(3) * v.V * I;
        return {
          values: { I, S },
          formulaName: '三相回路の電流',
          steps: [
            { formula: 'I = P ÷ (√3 × V × 力率)', substituted: `${ctx.n(v.P, 'power')} ÷ (√3 × ${ctx.n(v.V, 'voltage')} × ${ctx.f(v.pf)})`, result: ctx.u(I, 'current') },
            { formula: '皮相電力 S = √3 × V × I', substituted: `√3 × ${ctx.n(v.V, 'voltage')} × ${ctx.n(I, 'current')}`, result: ctx.u(S, 'power') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'V', label: '線間電圧', quantity: 'voltage' },
    { key: 'I', label: '線電流', quantity: 'current', primary: true },
    { key: 'pf', label: '力率', quantity: 'number' },
    { key: 'P', label: '有効電力', quantity: 'power', primary: true },
    { key: 'S', label: '皮相電力', quantity: 'power', help: '単位を kW と読み替えると kVA に相当します' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * elec.led LEDの電流制限抵抗
 * ==================================================================== */

export const elecLed = {
  id: 'elec.led',
  category: 'elec',
  title: 'LEDの電流制限抵抗',
  subtitle: '電源電圧・順電圧・電流から、直列に入れる抵抗と消費電力を計算',
  keywords: ['LED', '電流制限', '抵抗', '順電圧', 'Vf', 'If', 'electronics', '電子工作'],
  shape: null,

  fields: [
    { key: 'Vs', label: '電源電圧', quantity: 'voltage', defaultUnit: 'V', min: 0, exclusiveMin: true, optional: true },
    { key: 'Vf', label: 'LEDの順電圧 Vf', quantity: 'voltage', defaultUnit: 'V', min: 0, exclusiveMin: true, optional: true, help: '赤 1.8〜2.2V / 緑・青・白 3.0〜3.4V が目安。データシートの値を使ってください' },
    { key: 'If', label: 'LEDに流す電流', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は mA。標準的な砲弾型で 10〜20mA' },
    { key: 'R', label: '必要な抵抗', quantity: 'resistance', defaultUnit: 'ohm', min: 0, exclusiveMin: true, optional: true },
    { key: 'n', label: '直列にするLEDの数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['Vs', 'Vf', 'If', 'n'],
      provides: ['R', 'Pr', 'Vdrop'],
      validate(v) {
        if (v.Vf * v.n >= v.Vs) return calcError('DOMAIN', 'Vf');
        return null;
      },
      run(v, ctx) {
        const ifA = v.If / 1000;
        const Vdrop = v.Vs - v.Vf * v.n;
        const R = Vdrop / ifA;
        const Pr = Vdrop * ifA;
        return {
          values: { R, Pr, Vdrop },
          formulaName: 'LEDの電流制限抵抗',
          steps: [
            { formula: '抵抗にかかる電圧 = 電源電圧 − 順電圧 × 個数', substituted: `${ctx.n(v.Vs, 'voltage')} − ${ctx.n(v.Vf, 'voltage')} × ${ctx.f(v.n)}`, result: ctx.u(Vdrop, 'voltage') },
            { formula: '抵抗 = 抵抗にかかる電圧 ÷ 電流[A]', substituted: `${ctx.n(Vdrop, 'voltage')} ÷ ${ctx.f(ifA)}`, result: ctx.u(R, 'resistance') },
            { formula: '抵抗の消費電力 = 電圧 × 電流', substituted: `${ctx.n(Vdrop, 'voltage')} × ${ctx.f(ifA)}`, result: ctx.u(Pr, 'power') }
          ]
        };
      }
    },
    {
      requires: ['Vs', 'Vf', 'R', 'n'],
      provides: ['If', 'Pr', 'Vdrop'],
      validate(v) {
        if (v.Vf * v.n >= v.Vs) return calcError('DOMAIN', 'Vf');
        if (v.R === 0) return calcError('ZERO', 'R');
        return null;
      },
      run(v, ctx) {
        const Vdrop = v.Vs - v.Vf * v.n;
        const ifA = Vdrop / v.R;
        return {
          values: { If: ifA * 1000, Pr: Vdrop * ifA, Vdrop },
          formulaName: '流れる電流',
          steps: [
            { formula: '抵抗にかかる電圧 = 電源電圧 − 順電圧 × 個数', substituted: `${ctx.n(v.Vs, 'voltage')} − ${ctx.n(v.Vf, 'voltage')} × ${ctx.f(v.n)}`, result: ctx.u(Vdrop, 'voltage') },
            { formula: '電流[mA] = 電圧 ÷ 抵抗 × 1000', substituted: `${ctx.n(Vdrop, 'voltage')} ÷ ${ctx.n(v.R, 'resistance')} × 1000`, result: ctx.f(ifA * 1000) + ' mA' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'Vdrop', label: '抵抗にかかる電圧', quantity: 'voltage' },
    { key: 'If', label: '電流（mA）', quantity: 'number', primary: true },
    { key: 'R', label: '必要な抵抗', quantity: 'resistance', primary: true },
    { key: 'Pr', label: '抵抗の消費電力', quantity: 'power', help: 'この値より余裕のある定格の抵抗を選びます' }
  ],

  notes: NOTES.concat(['順電圧・許容電流はLEDごとに異なります。使用する製品のデータシートの値でご確認ください。'])
};

/* ==================================================================== *
 * elec.load 負荷電流の合計
 * ==================================================================== */

function buildLoadField(key, n) {
  return { key, label: `機器${n}の消費電力`, quantity: 'power', defaultUnit: 'W', min: 0, exclusiveMin: true, optional: true };
}

const LOAD_KEYS = ['P1', 'P2', 'P3', 'P4'];

function buildLoadSolvers() {
  const solvers = [];
  for (let k = 4; k >= 1; k--) {
    const keys = LOAD_KEYS.slice(0, k);
    solvers.push({
      requires: keys.concat(['V', 'margin']),
      provides: ['Ptotal', 'I', 'Imargin'],
      validate(v) { if (v.V === 0) return calcError('ZERO', 'V'); return null; },
      run(v, ctx) {
        const Ptotal = keys.reduce((s, kk) => s + v[kk], 0);
        const I = Ptotal / v.V;
        const Imargin = I * (1 + v.margin / 100);
        return {
          values: { Ptotal, I, Imargin },
          formulaName: '負荷電流の合計',
          steps: [
            { formula: '合計電力 = ' + keys.join(' + '), substituted: keys.map((kk) => ctx.n(v[kk], 'power')).join(' + '), result: ctx.u(Ptotal, 'power') },
            { formula: '電流 = 合計電力 ÷ 電圧', substituted: `${ctx.n(Ptotal, 'power')} ÷ ${ctx.n(v.V, 'voltage')}`, result: ctx.u(I, 'current') },
            { formula: '余裕を見た電流 = 電流 × (1 + 余裕率)', substituted: `${ctx.n(I, 'current')} × ${ctx.f(1 + v.margin / 100)}`, result: ctx.u(Imargin, 'current') }
          ]
        };
      }
    });
  }
  return solvers;
}

export const elecLoad = {
  id: 'elec.load',
  category: 'elec',
  title: '負荷電流の合計',
  subtitle: '機器の消費電力を合計して、流れる電流を計算',
  keywords: ['負荷', '電流', '合計', 'ブレーカー', '容量', 'アンペア', 'コンセント', '同時使用'],
  shape: null,

  fields: [
    buildLoadField('P1', 1),
    buildLoadField('P2', 2),
    buildLoadField('P3', 3),
    buildLoadField('P4', 4),
    { key: 'V', label: '電圧', quantity: 'voltage', defaultUnit: 'V', min: 0, exclusiveMin: true, optional: true, help: '一般的なコンセントは100V、エアコン等の専用回路は200V' },
    { key: 'margin', label: '余裕率（%）', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: '起動電流などを見込む割合' }
  ],

  solvers: buildLoadSolvers(),

  outputs: [
    { key: 'Ptotal', label: '合計の消費電力', quantity: 'power', primary: true },
    { key: 'I', label: '流れる電流', quantity: 'current', primary: true },
    { key: 'Imargin', label: '余裕を見た電流', quantity: 'current' }
  ],

  notes: NOTES.concat([
    'ブレーカーの選定や回路の分け方は、配線の太さ・法令・分電盤の構成で決まります。ここでは電流の計算のみを行い、適合の可否は判定しません。'
  ])
};

/* ==================================================================== *
 * elec.battery バッテリーの稼働時間
 *
 * ポータブル電源・モバイルバッテリー・電動工具で「何時間もつか」。
 * ==================================================================== */

export const elecBattery = {
  id: 'elec.battery',
  category: 'elec',
  title: 'バッテリーの稼働時間',
  subtitle: '容量と消費電力から、およその使用可能時間を計算',
  keywords: ['バッテリー', '電池', '稼働時間', 'ポータブル電源', 'Ah', 'Wh', '容量', 'もつ', '充電'],

  fields: [
    { key: 'cap', label: 'バッテリー容量', quantity: 'energy', defaultUnit: 'Wh', min: 0, exclusiveMin: true, optional: true, help: 'Wh 表示ならそのまま。Ah しか分からない場合は下の「電圧」と合わせて使います' },
    { key: 'V', label: 'バッテリーの電圧', quantity: 'voltage', defaultUnit: 'V', min: 0, exclusiveMin: true, optional: true, help: 'Ah から Wh を出すときに使います（Wh = Ah × V）' },
    { key: 'ah', label: '容量（Ah）', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: 'Ah 表示のバッテリーはこちら' },
    { key: 'load', label: '消費電力', quantity: 'power', defaultUnit: 'W', min: 0, exclusiveMin: true, optional: true },
    { key: 'eff', label: '変換効率', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: 'インバータ等の損失。0.8〜0.9 程度。損失を見ないなら 1' }
  ],

  solvers: [
    {
      requires: ['cap', 'load', 'eff'],
      provides: ['usableWh', 'hours', 'minutes'],
      validate(v) {
        if (v.load === 0) return calcError('ZERO', 'load');
        return null;
      },
      run(v, ctx) {
        return batteryResult(v.cap, v.load, v.eff, ctx, []);
      }
    },
    {
      requires: ['ah', 'V', 'load', 'eff'],
      provides: ['cap', 'usableWh', 'hours', 'minutes'],
      validate(v) {
        if (v.load === 0) return calcError('ZERO', 'load');
        return null;
      },
      run(v, ctx) {
        const cap = v.ah * v.V;
        const res = batteryResult(cap, v.load, v.eff, ctx, [
          { formula: '容量(Wh) = 容量(Ah) × 電圧(V)', substituted: `${ctx.f(v.ah)} × ${ctx.n(v.V, 'voltage')}`, result: ctx.u(cap, 'energy', 'Wh') }
        ]);
        res.values.cap = cap;
        return res;
      }
    }
  ],

  outputs: [
    { key: 'hours', label: '使用可能時間（時間）', quantity: 'number', primary: true },
    { key: 'minutes', label: '使用可能時間（分）', quantity: 'number', primary: true },
    { key: 'cap', label: '容量(Wh)', quantity: 'energy', defaultUnit: 'Wh' },
    { key: 'usableWh', label: '実際に使える電力量', quantity: 'energy', defaultUnit: 'Wh' }
  ],

  notes: NOTES.concat([
    '実際の稼働時間は温度・劣化・放電特性・機器の起動電力などで変わります。ここで出るのは目安の値です。',
    '計算上もつ時間であっても、バッテリーを空になるまで使い切る運用は製品の寿命に影響することがあります。取扱説明書をご確認ください。'
  ])
};

function batteryResult(cap, load, eff, ctx, headSteps) {
  const usableWh = cap * eff;
  const hours = usableWh / load;
  return {
    values: { usableWh, hours, minutes: hours * 60 },
    formulaName: 'バッテリーの稼働時間',
    steps: headSteps.concat([
      { formula: '使える電力量 = 容量 × 変換効率', substituted: `${ctx.u(cap, 'energy', 'Wh')} × ${ctx.f(eff)}`, result: ctx.u(usableWh, 'energy', 'Wh') },
      { formula: '時間 = 使える電力量 ÷ 消費電力', substituted: `${ctx.u(usableWh, 'energy', 'Wh')} ÷ ${ctx.n(load, 'power')}`, result: ctx.f(hours) + ' 時間' }
    ])
  };
}

export default [elecOhm, elecCost, elecSeries, elecParallel, elecVoltDrop, elecThreePhase, elecLed, elecLoad, elecBattery];
