// pipe.js — CALC_SPEC.md「配管・排水」（Phase 4 第9グループ）

import { calcError } from '../core/errors.js';
import { DEG_TO_RAD, RAD_TO_DEG } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '排水勾配などの推奨値は目安です。基準や施工条件は各仕様をご確認ください。'
];

const lenField = (key, label, help) => ({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help });

/* ==================================================================== *
 * pipe.slope 配管勾配・高低差・管長
 * ==================================================================== */

export const pipeSlope = {
  id: 'pipe.slope',
  category: 'pipe',
  title: '配管の勾配・高低差・管長',
  subtitle: '高低差・水平距離・管長・勾配%を相互計算',
  keywords: ['配管', '排水勾配', '高低差', '管長', '水勾配'],
  shape: 'rightTriangle',
  shapeMap: { a: 'run', b: 'rise', c: 'length' },

  fields: [
    lenField('rise', '高低差'),
    lenField('run', '水平距離'),
    lenField('length', '管長', '配管の実長（斜距離）'),
    { key: 'percent', label: '勾配 %', quantity: 'percent', defaultUnit: 'percent', optional: true, help: '例: 1/50勾配は2%' }
  ],

  solvers: [
    {
      requires: ['rise', 'run'],
      provides: ['length', 'percent'],
      run(v, ctx) {
        const length = Math.hypot(v.rise, v.run);
        const percent = (v.rise / v.run) * 100;
        return {
          values: { length, percent },
          formulaName: '配管勾配',
          steps: [
            { formula: '管長 = √(高低差² + 水平距離²)', substituted: `√(${ctx.n(v.rise, 'length')}² + ${ctx.n(v.run, 'length')}²)`, result: ctx.u(length, 'length') },
            { formula: '勾配% = 高低差 ÷ 水平距離 × 100', substituted: `${ctx.n(v.rise, 'length')} ÷ ${ctx.n(v.run, 'length')} × 100`, result: ctx.u(percent, 'percent') }
          ]
        };
      }
    },
    {
      requires: ['run', 'percent'],
      provides: ['rise', 'length'],
      run(v, ctx) {
        const rise = (v.run * v.percent) / 100;
        const length = Math.hypot(rise, v.run);
        return {
          values: { rise, length },
          formulaName: '配管勾配',
          steps: [
            { formula: '高低差 = 水平距離 × 勾配% ÷ 100', substituted: `${ctx.n(v.run, 'length')} × ${ctx.n(v.percent, 'percent')} ÷ 100`, result: ctx.u(rise, 'length') },
            { formula: '管長 = √(高低差² + 水平距離²)', substituted: `√(${ctx.n(rise, 'length')}² + ${ctx.n(v.run, 'length')}²)`, result: ctx.u(length, 'length') }
          ]
        };
      }
    },
    {
      requires: ['rise', 'percent'],
      provides: ['run', 'length'],
      validate(v) {
        if (v.percent === 0) return calcError('ZERO', 'percent');
        return null;
      },
      run(v, ctx) {
        const run = (v.rise * 100) / v.percent;
        const length = Math.hypot(v.rise, run);
        return {
          values: { run, length },
          formulaName: '配管勾配',
          steps: [
            { formula: '水平距離 = 高低差 × 100 ÷ 勾配%', substituted: `${ctx.n(v.rise, 'length')} × 100 ÷ ${ctx.n(v.percent, 'percent')}`, result: ctx.u(run, 'length') },
            { formula: '管長 = √(高低差² + 水平距離²)', substituted: `√(${ctx.n(v.rise, 'length')}² + ${ctx.n(run, 'length')}²)`, result: ctx.u(length, 'length') }
          ]
        };
      }
    },
    {
      requires: ['length', 'rise'],
      provides: ['run', 'percent'],
      validate(v) {
        if (v.length <= v.rise) return calcError('RIGHT_HYP', 'length');
        return null;
      },
      run(v, ctx) {
        const run = Math.sqrt(v.length * v.length - v.rise * v.rise);
        const percent = (v.rise / run) * 100;
        return {
          values: { run, percent },
          formulaName: '配管勾配',
          steps: [{ formula: '水平距離 = √(管長² − 高低差²)', substituted: `√(${ctx.n(v.length, 'length')}² − ${ctx.n(v.rise, 'length')}²)`, result: ctx.u(run, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'rise', label: '高低差', quantity: 'length' },
    { key: 'run', label: '水平距離', quantity: 'length' },
    { key: 'length', label: '管長', quantity: 'length', primary: true },
    { key: 'percent', label: '勾配 %', quantity: 'percent', primary: true }
  ],

  presets: [
    { label: '1/50（一般的な排水勾配）', values: { percent: 2 } },
    { label: '1/100（緩勾配）', values: { percent: 1 } }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * pipe.volume 管内体積・水量
 * ==================================================================== */

const VOLUME_OUTPUTS = [
  { key: 'V_mm3', label: '体積(mm³)', quantity: 'volume', defaultUnit: 'mm3', fixedUnit: true },
  { key: 'V_L', label: '体積(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true }
];
function volumeDouble(v) {
  return { V_mm3: v, V_L: v };
}

export const pipeVolume = {
  id: 'pipe.volume',
  category: 'pipe',
  title: '管内体積・水量',
  subtitle: '内径・管長から、管の中に入る水の量を計算',
  keywords: ['配管', '管内体積', '水量', '内径'],
  shape: 'pipe3d',
  shapeMap: { d: 'diameter', L: 'length' },
  fields: [lenField('diameter', '内径'), lenField('length', '管長'), { key: 'V', label: '水量', quantity: 'volume', defaultUnit: 'L', min: 0, exclusiveMin: true, optional: true }],

  solvers: [
    {
      requires: ['diameter', 'length'],
      provides: ['V_mm3', 'V_L'],
      run(v, ctx) {
        const r = v.diameter / 2;
        const V = Math.PI * r * r * v.length;
        return {
          values: volumeDouble(V),
          formulaName: '管内体積',
          steps: [{ formula: 'V = π × (内径÷2)² × 管長', substituted: `π × (${ctx.n(v.diameter, 'length')}÷2)² × ${ctx.n(v.length, 'length')}`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V', 'length'],
      provides: ['diameter'],
      run(v, ctx) {
        const r = Math.sqrt(v.V / (Math.PI * v.length));
        const diameter = r * 2;
        return { values: { diameter }, formulaName: '管内体積', steps: [{ formula: '内径 = 2 × √(水量 ÷ (π×管長))', substituted: `2 × √(${ctx.n(v.V, 'volume', 'mm3')} ÷ (π×${ctx.n(v.length, 'length')}))`, result: ctx.u(diameter, 'length') }] };
      }
    },
    {
      requires: ['V', 'diameter'],
      provides: ['length'],
      run(v, ctx) {
        const r = v.diameter / 2;
        const length = v.V / (Math.PI * r * r);
        return { values: { length }, formulaName: '管内体積', steps: [{ formula: '管長 = 水量 ÷ (π×(内径÷2)²)', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ (π×(${ctx.n(v.diameter, 'length')}÷2)²)`, result: ctx.u(length, 'length') }] };
      }
    }
  ],

  outputs: [{ key: 'diameter', label: '内径', quantity: 'length' }, { key: 'length', label: '管長', quantity: 'length' }, ...VOLUME_OUTPUTS],

  notes: NOTES
};

/* ==================================================================== *
 * pipe.flow 流量・流速・管径
 * ==================================================================== *
 * 内部単位: 流量 L/min、流速 m/s、管径 mm。
 * Q[L/min] = 断面積[m²] × 流速[m/s] × 60 × 1000
 */

export const pipeFlow = {
  id: 'pipe.flow',
  category: 'pipe',
  title: '流量・流速・管径',
  subtitle: '管の内径と流速から流量を計算（必要な管径の逆算もできます）',
  keywords: ['流量', '流速', '管径', '内径', 'L/min', '給水', '通水'],
  shape: 'circle',
  // circle.js は r と d を必ず描くため、r を出力専用キーに割り当てて空ラベルを残さない
  shapeMap: { d: 'dInner', r: 'rInner', S: 'areaInner' },

  fields: [
    lenField('dInner', '管の内径'),
    { key: 'vel', label: '流速', quantity: 'velocity', defaultUnit: 'ms', min: 0, exclusiveMin: true, optional: true, help: '給水管で 0.6〜2.0 m/s 程度が一般的な範囲' },
    { key: 'Q', label: '流量', quantity: 'flow', defaultUnit: 'Lmin', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['dInner', 'vel'],
      provides: ['Q', 'areaInner'],
      run(v, ctx) {
        const rM = v.dInner / 2 / 1000;
        const aM2 = Math.PI * rM * rM;
        const Q = aM2 * v.vel * 60 * 1000; // L/min
        return {
          values: { Q, areaInner: aM2 * 1e6, rInner: v.dInner / 2 },
          formulaName: '流量',
          steps: [
            { formula: '断面積 = π × (内径 ÷ 2)²', substituted: `π × (${ctx.n(v.dInner, 'length')} ÷ 2)²`, result: ctx.f(aM2 * 1e6) + ' mm²' },
            { formula: '流量 = 断面積[m²] × 流速 × 60 × 1000', substituted: `${ctx.f(aM2)} × ${ctx.f(v.vel)} × 60000`, result: ctx.u(Q, 'flow') }
          ]
        };
      }
    },
    {
      requires: ['Q', 'vel'],
      provides: ['dInner', 'areaInner'],
      validate(v) { if (v.vel === 0) return calcError('ZERO', 'vel'); return null; },
      run(v, ctx) {
        const aM2 = v.Q / (v.vel * 60 * 1000);
        const dInner = 2 * Math.sqrt(aM2 / Math.PI) * 1000;
        return {
          values: { dInner, areaInner: aM2 * 1e6, rInner: dInner / 2 },
          formulaName: '必要な管の内径',
          steps: [
            { formula: '断面積 = 流量 ÷ (流速 × 60 × 1000)', substituted: `${ctx.n(v.Q, 'flow')} ÷ (${ctx.f(v.vel)} × 60000)`, result: ctx.f(aM2 * 1e6) + ' mm²' },
            { formula: '内径 = 2 × √(断面積 ÷ π)', substituted: `2 × √(${ctx.f(aM2)} ÷ π)`, result: ctx.u(dInner, 'length') }
          ]
        };
      }
    },
    {
      requires: ['Q', 'dInner'],
      provides: ['vel', 'areaInner'],
      run(v, ctx) {
        const rM = v.dInner / 2 / 1000;
        const aM2 = Math.PI * rM * rM;
        const vel = v.Q / (aM2 * 60 * 1000);
        return {
          values: { vel, areaInner: aM2 * 1e6, rInner: v.dInner / 2 },
          formulaName: '流速',
          steps: [{ formula: '流速 = 流量 ÷ (断面積[m²] × 60 × 1000)', substituted: `${ctx.n(v.Q, 'flow')} ÷ (${ctx.f(aM2)} × 60000)`, result: ctx.u(vel, 'velocity') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'dInner', label: '管の内径', quantity: 'length', primary: true },
    { key: 'rInner', label: '管の内半径', quantity: 'length' },
    { key: 'areaInner', label: '管の断面積', quantity: 'area' },
    { key: 'vel', label: '流速', quantity: 'velocity' },
    { key: 'Q', label: '流量', quantity: 'flow', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * pipe.pressureLoss 圧力損失（ヘーゼン・ウィリアムスの式）
 * ==================================================================== */

const C_NOTE = '流速係数 C の目安: 塩ビ管・銅管 130〜150 / 新しい鋼管 120 / 古い鋼管 90〜100';

export const pipePressureLoss = {
  id: 'pipe.pressureLoss',
  category: 'pipe',
  title: '配管の圧力損失',
  subtitle: 'ヘーゼン・ウィリアムスの式で、直管の摩擦損失水頭を計算',
  keywords: ['圧力損失', '摩擦損失', 'ヘーゼン', 'ウィリアムス', '損失水頭', '揚程'],
  shape: 'pipe3d',
  shapeMap: { d: 'dInner', L: 'L' },
  fields: [
    lenField('dInner', '管の内径'),
    { key: 'L', label: '管の長さ', quantity: 'length', defaultUnit: 'm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'Q', label: '流量', quantity: 'flow', defaultUnit: 'Lmin', min: 0, exclusiveMin: true, optional: true },
    { key: 'C', label: '流速係数 C', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: C_NOTE },
    { key: 'hLoss', label: '損失水頭', quantity: 'length', defaultUnit: 'm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['dInner', 'L', 'Q', 'C'],
      provides: ['hLoss'],
      validate(v) {
        if (v.C === 0) return calcError('ZERO', 'C');
        if (v.dInner === 0) return calcError('ZERO', 'dInner');
        return null;
      },
      run(v, ctx) {
        const qM3s = v.Q / 1000 / 60;   // L/min → m³/s
        const dM = v.dInner / 1000;     // mm → m
        const lM = v.L / 1000;          // 内部mm → m
        // h = 10.666 × C^-1.85 × D^-4.87 × Q^1.85 × L
        const perM = 10.666 * Math.pow(v.C, -1.85) * Math.pow(dM, -4.87) * Math.pow(qM3s, 1.85);
        const hM = perM * lM;
        return {
          values: { hLoss: hM * 1000 },
          formulaName: 'ヘーゼン・ウィリアムスの式',
          steps: [
            { formula: '流量を m³/s に換算', substituted: `${ctx.n(v.Q, 'flow')} ÷ 60000`, result: ctx.f(qM3s) + ' m³/s' },
            {
              formula: 'h = 10.666 × C⁻¹·⁸⁵ × D⁻⁴·⁸⁷ × Q¹·⁸⁵ × L',
              substituted: `10.666 × ${ctx.f(v.C)}⁻¹·⁸⁵ × ${ctx.f(dM)}⁻⁴·⁸⁷ × ${ctx.f(qM3s)}¹·⁸⁵ × ${ctx.f(lM)}`,
              result: ctx.f(hM) + ' m'
            },
            { formula: '1mあたりの損失', substituted: `${ctx.f(hM)} ÷ ${ctx.f(lM)}`, result: ctx.f(perM) + ' m/m' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'dInner', label: '管の内径', quantity: 'length' },
    { key: 'L', label: '管の長さ', quantity: 'length', defaultUnit: 'm', fixedUnit: true },
    { key: 'Q', label: '流量', quantity: 'flow' },
    { key: 'hLoss', label: '損失水頭', quantity: 'length', defaultUnit: 'm', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat([C_NOTE, '直管部分のみの計算です。継手・弁による損失は含みません。'])
};

/* ==================================================================== *
 * pipe.pumpHead ポンプの全揚程
 * ==================================================================== */

export const pipePumpHead = {
  id: 'pipe.pumpHead',
  category: 'pipe',
  title: 'ポンプの全揚程',
  subtitle: '実揚程・損失水頭・速度水頭から全揚程を計算',
  keywords: ['ポンプ', '揚程', '全揚程', '実揚程', '損失水頭', '井戸', '散水'],
  shape: 'pumpHead',
  shapeMap: { staticHead: 'actual', lossHead: 'loss', totalHead: 'total' },
  fields: [
    { key: 'actual', label: '実揚程', quantity: 'length', defaultUnit: 'm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help: '吸い上げる水面から吐出し位置までの高さ' },
    { key: 'loss', label: '損失水頭', quantity: 'length', defaultUnit: 'm', min: 0, optional: true, fixedUnit: true, help: '「配管の圧力損失」で求めた値' },
    { key: 'vel', label: '吐出しの流速', quantity: 'velocity', defaultUnit: 'ms', min: 0, optional: true },
    { key: 'total', label: '全揚程', quantity: 'length', defaultUnit: 'm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['actual', 'loss', 'vel'],
      provides: ['total', 'velHead'],
      run(v, ctx) {
        const velHeadM = (v.vel * v.vel) / (2 * 9.80665);
        const totalM = v.actual / 1000 + v.loss / 1000 + velHeadM;
        return {
          values: { total: totalM * 1000, velHead: velHeadM * 1000 },
          formulaName: 'ポンプの全揚程',
          steps: [
            { formula: '速度水頭 = 流速² ÷ (2 × 9.80665)', substituted: `${ctx.f(v.vel)}² ÷ 19.6133`, result: ctx.f(velHeadM) + ' m' },
            { formula: '全揚程 = 実揚程 + 損失水頭 + 速度水頭', substituted: `${ctx.f(v.actual / 1000)} + ${ctx.f(v.loss / 1000)} + ${ctx.f(velHeadM)}`, result: ctx.f(totalM) + ' m' }
          ]
        };
      }
    },
    {
      requires: ['actual', 'loss'],
      provides: ['total'],
      run(v, ctx) {
        const totalM = v.actual / 1000 + v.loss / 1000;
        return {
          values: { total: totalM * 1000 },
          formulaName: 'ポンプの全揚程（速度水頭を除く）',
          steps: [{ formula: '全揚程 = 実揚程 + 損失水頭', substituted: `${ctx.f(v.actual / 1000)} + ${ctx.f(v.loss / 1000)}`, result: ctx.f(totalM) + ' m' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'actual', label: '実揚程', quantity: 'length', defaultUnit: 'm', fixedUnit: true },
    { key: 'loss', label: '損失水頭', quantity: 'length', defaultUnit: 'm', fixedUnit: true },
    { key: 'velHead', label: '速度水頭', quantity: 'length', defaultUnit: 'm', fixedUnit: true },
    { key: 'total', label: '全揚程', quantity: 'length', defaultUnit: 'm', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat(['ポンプの機種選定は流量と全揚程の両方で決まります。製品の性能曲線とあわせてご確認ください。'])
};

/* ==================================================================== *
 * pipe.rainwater 雨水排水量（合理式）
 * ==================================================================== */

export const pipeRainwater = {
  id: 'pipe.rainwater',
  category: 'pipe',
  title: '雨水の排水量（合理式）',
  subtitle: '屋根や敷地の面積と降雨強度から、流出量を計算',
  keywords: ['雨水', '排水', '合理式', '降雨強度', '流出係数', '雨どい', '側溝'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'A' },

  fields: [
    { key: 'w', label: '幅', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'd', label: '奥行き', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'C', label: '流出係数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, max: 1, optional: true, help: '屋根・舗装 0.9 / 砂利地 0.5 / 芝・庭 0.2 程度' },
    { key: 'I', label: '降雨強度', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は mm/h。地域の設計用降雨強度（例: 100〜150）' },
    { key: 'Q', label: '排水量', quantity: 'flow', defaultUnit: 'm3h', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'C', 'I'],
      provides: ['A', 'Q'],
      run(v, ctx) {
        const A = v.w * v.d;
        const aM2 = A / 1e6;
        // 合理式 Q[m³/s] = 1/3600000 × C × I[mm/h] × A[m²]
        const qM3h = (v.C * v.I * aM2) / 1000;
        const Q = (qM3h * 1000) / 60; // 内部単位 L/min
        return {
          values: { A, Q },
          formulaName: '合理式',
          steps: [
            { formula: '面積 = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.f(aM2) + ' m²' },
            { formula: '排水量[m³/h] = 流出係数 × 降雨強度[mm/h] × 面積[m²] ÷ 1000', substituted: `${ctx.f(v.C)} × ${ctx.f(v.I)} × ${ctx.f(aM2)} ÷ 1000`, result: ctx.u(Q, 'flow') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'A', label: '集水面積', quantity: 'area', defaultUnit: 'm2', fixedUnit: true },
    { key: 'Q', label: '排水量', quantity: 'flow', defaultUnit: 'm3h', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat(['降雨強度は地域と設計基準によって異なります。採用する数値は各自治体の基準等をご確認ください。'])
};

/* ==================================================================== *
 * pipe.tank タンクの満水時間
 * ==================================================================== */

export const pipeTank = {
  id: 'pipe.tank',
  category: 'pipe',
  title: 'タンクの容量と満水時間',
  subtitle: '容量と流量から、満水までにかかる時間を計算',
  keywords: ['タンク', '貯水', '満水', '時間', '容量', '給水'],
  shape: null,

  fields: [
    { key: 'V', label: '容量', quantity: 'volume', defaultUnit: 'L', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'Q', label: '流量', quantity: 'flow', defaultUnit: 'Lmin', min: 0, exclusiveMin: true, optional: true },
    { key: 'minutes', label: 'かかる時間', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は分' }
  ],

  solvers: [
    {
      requires: ['V', 'Q'],
      provides: ['minutes', 'hours'],
      validate(v) { if (v.Q === 0) return calcError('ZERO', 'Q'); return null; },
      run(v, ctx) {
        const liters = v.V / 1e6;
        const minutes = liters / v.Q;
        return {
          values: { minutes, hours: minutes / 60 },
          formulaName: '満水までの時間',
          steps: [
            { formula: '時間[分] = 容量[L] ÷ 流量[L/min]', substituted: `${ctx.f(liters)} ÷ ${ctx.n(v.Q, 'flow', 'Lmin')}`, result: ctx.f(minutes) + ' 分' },
            { formula: '時間[時] = 分 ÷ 60', substituted: `${ctx.f(minutes)} ÷ 60`, result: ctx.f(minutes / 60) + ' 時間' }
          ]
        };
      }
    },
    {
      requires: ['Q', 'minutes'],
      provides: ['V', 'hours'],
      run(v, ctx) {
        const liters = v.Q * v.minutes;
        return {
          values: { V: liters * 1e6, hours: v.minutes / 60 },
          formulaName: '溜まる量',
          steps: [{ formula: '容量[L] = 流量[L/min] × 時間[分]', substituted: `${ctx.n(v.Q, 'flow', 'Lmin')} × ${ctx.f(v.minutes)}`, result: ctx.f(liters) + ' L' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'V', label: '容量', quantity: 'volume', defaultUnit: 'L', fixedUnit: true, primary: true },
    { key: 'Q', label: '流量', quantity: 'flow' },
    { key: 'minutes', label: 'かかる時間（分）', quantity: 'number', primary: true },
    { key: 'hours', label: 'かかる時間（時間）', quantity: 'number' }
  ],

  notes: NOTES
};

export default [pipeSlope, pipeVolume, pipeFlow, pipePressureLoss, pipePumpHead, pipeRainwater, pipeTank];
