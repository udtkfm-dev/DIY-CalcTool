// slope.js — CALC_SPEC.md C群「勾配」

import { calcError } from '../core/errors.js';
import { DEG_TO_RAD, RAD_TO_DEG } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '用途ごとの推奨値は目安です。基準や施工条件は各仕様をご確認ください。'
];

/* ------------------------------------------------------------------ *
 * C-1. slope.convert 勾配の相互変換
 * ------------------------------------------------------------------ */

const ANGLE_RANGE_MSG = '角度は0°以上90°未満の値にしてください';

function fromAngle(angleDeg) {
  const rad = angleDeg * DEG_TO_RAD;
  return {
    percent: Math.tan(rad) * 100,
    ratio: 1 / Math.tan(rad),
    sun: Math.tan(rad) * 10
  };
}

const slopeSolvers = [
  {
    requires: ['angle'],
    provides: ['percent', 'ratio', 'sun'],
    run(v, ctx) {
      const { percent, ratio, sun } = fromAngle(v.angle);
      return {
        values: { percent, ratio, sun },
        formulaName: '勾配の相互変換',
        steps: [
          { formula: 'percent = tan(角度) × 100', substituted: `tan(${ctx.u(v.angle, 'angle')}) × 100`, result: ctx.u(percent, 'percent') },
          { formula: 'ratio = 1 ÷ tan(角度)（1:n の n）', substituted: `1 ÷ tan(${ctx.u(v.angle, 'angle')})`, result: '1 : ' + ctx.f(ratio) },
          { formula: 'sun = tan(角度) × 10（勾配の「寸」）', substituted: `tan(${ctx.u(v.angle, 'angle')}) × 10`, result: ctx.f(sun) + ' 寸' }
        ]
      };
    }
  },
  {
    requires: ['percent'],
    provides: ['angle', 'ratio', 'sun'],
    validate(v) {
      if (v.percent < 0) return calcError('ANGLE_RANGE', 'percent', ANGLE_RANGE_MSG);
      return null;
    },
    run(v, ctx) {
      const angle = Math.atan(v.percent / 100) * RAD_TO_DEG;
      const { percent, ratio, sun } = fromAngle(angle);
      return {
        values: { angle, ratio, sun },
        formulaName: '勾配の相互変換',
        steps: [
          { formula: '角度 = atan(percent ÷ 100)', substituted: `atan(${ctx.n(v.percent, 'percent')} ÷ 100)`, result: ctx.u(angle, 'angle') },
          { formula: 'ratio = 1 ÷ tan(角度)', substituted: `1 ÷ tan(${ctx.u(angle, 'angle')})`, result: '1 : ' + ctx.f(ratio) },
          { formula: 'sun = tan(角度) × 10', substituted: `tan(${ctx.u(angle, 'angle')}) × 10`, result: ctx.f(sun) + ' 寸' }
        ]
      };
    }
  },
  {
    requires: ['ratio'],
    provides: ['angle', 'percent', 'sun'],
    validate(v) {
      if (v.ratio === 0) return calcError('ZERO', 'ratio');
      if (v.ratio < 0) return calcError('ANGLE_RANGE', 'ratio', ANGLE_RANGE_MSG);
      return null;
    },
    run(v, ctx) {
      const angle = Math.atan(1 / v.ratio) * RAD_TO_DEG;
      const { percent, sun } = fromAngle(angle);
      return {
        values: { angle, percent, sun },
        formulaName: '勾配の相互変換',
        steps: [
          { formula: '角度 = atan(1 ÷ n)　(1:n)', substituted: `atan(1 ÷ ${ctx.f(v.ratio)})`, result: ctx.u(angle, 'angle') },
          { formula: 'percent = tan(角度) × 100', substituted: `tan(${ctx.u(angle, 'angle')}) × 100`, result: ctx.u(percent, 'percent') },
          { formula: 'sun = tan(角度) × 10', substituted: `tan(${ctx.u(angle, 'angle')}) × 10`, result: ctx.f(sun) + ' 寸' }
        ]
      };
    }
  },
  {
    requires: ['sun'],
    provides: ['angle', 'percent', 'ratio'],
    validate(v) {
      if (v.sun < 0) return calcError('ANGLE_RANGE', 'sun', ANGLE_RANGE_MSG);
      return null;
    },
    run(v, ctx) {
      const angle = Math.atan(v.sun / 10) * RAD_TO_DEG;
      const { percent, ratio } = fromAngle(angle);
      return {
        values: { angle, percent, ratio },
        formulaName: '勾配の相互変換',
        steps: [
          { formula: '角度 = atan(sun ÷ 10)', substituted: `atan(${ctx.f(v.sun)} ÷ 10)`, result: ctx.u(angle, 'angle') },
          { formula: 'percent = tan(角度) × 100', substituted: `tan(${ctx.u(angle, 'angle')}) × 100`, result: ctx.u(percent, 'percent') },
          { formula: 'ratio = 1 ÷ tan(角度)', substituted: `1 ÷ tan(${ctx.u(angle, 'angle')})`, result: '1 : ' + ctx.f(ratio) }
        ]
      };
    }
  }
];

export const slopeConvert = {
  id: 'slope.convert',
  category: 'slope',
  title: '勾配の相互変換',
  subtitle: '角度・勾配%・勾配比・寸を相互計算',
  keywords: ['勾配', 'こうばい', '傾斜', 'スロープ', '水勾配', '寸勾配', '屋根', '角度', 'パーセント'],
  shape: null,

  fields: [
    { key: 'angle', label: '角度', quantity: 'angle', defaultUnit: 'deg', min: 0, max: 90, exclusiveMin: true, optional: true, rangeMessage: ANGLE_RANGE_MSG, help: '水平からの傾き' },
    { key: 'percent', label: '勾配 %', quantity: 'percent', defaultUnit: 'percent', optional: true, help: '高さ÷水平距離×100' },
    { key: 'ratio', label: '勾配比（1:n の n）', quantity: 'number', defaultUnit: 'number', optional: true, exclusiveMin: false, help: '数字が大きいほど緩い勾配' },
    { key: 'sun', label: '勾配「寸」', quantity: 'number', defaultUnit: 'number', optional: true }
  ],

  solvers: slopeSolvers,

  outputs: [
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'percent', label: '勾配 %', quantity: 'percent' },
    { key: 'ratio', label: '勾配比（1:n）', quantity: 'number' },
    { key: 'sun', label: '勾配「寸」', quantity: 'number' }
  ],

  presets: [
    { label: '1寸勾配', values: { sun: { v: 1, u: 'number' } } },
    { label: '2寸勾配', values: { sun: { v: 2, u: 'number' } } },
    { label: '3寸勾配', values: { sun: { v: 3, u: 'number' } } },
    { label: '4寸勾配', values: { sun: { v: 4, u: 'number' } } },
    { label: '5寸勾配', values: { sun: { v: 5, u: 'number' } } },
    { label: '1/50（水勾配）', values: { ratio: { v: 50, u: 'number' } } },
    { label: '1/100', values: { ratio: { v: 100, u: 'number' } } },
    { label: 'スロープ1/12（車いす目安）', values: { ratio: { v: 12, u: 'number' } } }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * C-2. slope.length 勾配と距離（高低差・水平距離・斜距離）
 * ------------------------------------------------------------------ */

const RUN_RISE_RANGE_MSG = '角度は0°以上90°未満の値にしてください';

/** 角度系の入力（angle/percent/ratio/sun のいずれか）を内部の角度(deg)へそろえる */
function angleFromAny(v) {
  if (v.angle !== undefined) return v.angle;
  if (v.percent !== undefined) return Math.atan(v.percent / 100) * RAD_TO_DEG;
  if (v.ratio !== undefined) return Math.atan(1 / v.ratio) * RAD_TO_DEG;
  if (v.sun !== undefined) return Math.atan(v.sun / 10) * RAD_TO_DEG;
  return undefined;
}

const lengthSolvers = [
  {
    requires: ['rise', 'run'],
    provides: ['slant', 'angle', 'percent'],
    run(v, ctx) {
      const slant = Math.hypot(v.rise, v.run);
      const angle = Math.atan2(v.rise, v.run) * RAD_TO_DEG;
      const percent = (v.rise / v.run) * 100;
      return {
        values: { slant, angle, percent },
        formulaName: '勾配と距離',
        steps: [
          { formula: 'slant = √(rise² + run²)', substituted: `√(${ctx.n(v.rise, 'length')}² + ${ctx.n(v.run, 'length')}²)`, result: ctx.u(slant, 'length') },
          { formula: '角度 = atan(rise ÷ run)', substituted: `atan(${ctx.n(v.rise, 'length')} ÷ ${ctx.n(v.run, 'length')})`, result: ctx.u(angle, 'angle') },
          { formula: '勾配% = rise ÷ run × 100', substituted: `${ctx.n(v.rise, 'length')} ÷ ${ctx.n(v.run, 'length')} × 100`, result: ctx.u(percent, 'percent') }
        ]
      };
    }
  },
  {
    requires: ['run', 'angle'],
    provides: ['rise', 'slant', 'percent'],
    run(v, ctx) {
      const rad = v.angle * DEG_TO_RAD;
      const rise = v.run * Math.tan(rad);
      const slant = v.run / Math.cos(rad);
      const percent = Math.tan(rad) * 100;
      return {
        values: { rise, slant, percent },
        formulaName: '勾配と距離',
        steps: [
          { formula: 'rise = run × tan(角度)', substituted: `${ctx.n(v.run, 'length')} × tan(${ctx.u(v.angle, 'angle')})`, result: ctx.u(rise, 'length') },
          { formula: 'slant = run ÷ cos(角度)', substituted: `${ctx.n(v.run, 'length')} ÷ cos(${ctx.u(v.angle, 'angle')})`, result: ctx.u(slant, 'length') }
        ]
      };
    }
  },
  {
    requires: ['rise', 'angle'],
    provides: ['run', 'slant', 'percent'],
    run(v, ctx) {
      const rad = v.angle * DEG_TO_RAD;
      const run = v.rise / Math.tan(rad);
      const slant = v.rise / Math.sin(rad);
      const percent = Math.tan(rad) * 100;
      return {
        values: { run, slant, percent },
        formulaName: '勾配と距離',
        steps: [
          { formula: 'run = rise ÷ tan(角度)', substituted: `${ctx.n(v.rise, 'length')} ÷ tan(${ctx.u(v.angle, 'angle')})`, result: ctx.u(run, 'length') },
          { formula: 'slant = rise ÷ sin(角度)', substituted: `${ctx.n(v.rise, 'length')} ÷ sin(${ctx.u(v.angle, 'angle')})`, result: ctx.u(slant, 'length') }
        ]
      };
    }
  },
  {
    requires: ['slant', 'angle'],
    provides: ['rise', 'run', 'percent'],
    run(v, ctx) {
      const rad = v.angle * DEG_TO_RAD;
      const rise = v.slant * Math.sin(rad);
      const run = v.slant * Math.cos(rad);
      const percent = Math.tan(rad) * 100;
      return {
        values: { rise, run, percent },
        formulaName: '勾配と距離',
        steps: [
          { formula: 'rise = slant × sin(角度)', substituted: `${ctx.n(v.slant, 'length')} × sin(${ctx.u(v.angle, 'angle')})`, result: ctx.u(rise, 'length') },
          { formula: 'run = slant × cos(角度)', substituted: `${ctx.n(v.slant, 'length')} × cos(${ctx.u(v.angle, 'angle')})`, result: ctx.u(run, 'length') }
        ]
      };
    }
  },
  {
    requires: ['rise', 'slant'],
    provides: ['run', 'angle', 'percent'],
    validate(v) {
      if (v.slant <= v.rise) return calcError('RIGHT_HYP', 'slant');
      return null;
    },
    run(v, ctx) {
      const run = Math.sqrt(v.slant * v.slant - v.rise * v.rise);
      const angle = Math.asin(v.rise / v.slant) * RAD_TO_DEG;
      const percent = (v.rise / run) * 100;
      return {
        values: { run, angle, percent },
        formulaName: '勾配と距離',
        steps: [
          { formula: 'run = √(slant² − rise²)', substituted: `√(${ctx.n(v.slant, 'length')}² − ${ctx.n(v.rise, 'length')}²)`, result: ctx.u(run, 'length') },
          { formula: '角度 = asin(rise ÷ slant)', substituted: `asin(${ctx.n(v.rise, 'length')} ÷ ${ctx.n(v.slant, 'length')})`, result: ctx.u(angle, 'angle') }
        ]
      };
    }
  },
  {
    requires: ['run', 'slant'],
    provides: ['rise', 'angle', 'percent'],
    validate(v) {
      if (v.slant <= v.run) return calcError('RIGHT_HYP', 'slant');
      return null;
    },
    run(v, ctx) {
      const rise = Math.sqrt(v.slant * v.slant - v.run * v.run);
      const angle = Math.acos(v.run / v.slant) * RAD_TO_DEG;
      const percent = (rise / v.run) * 100;
      return {
        values: { rise, angle, percent },
        formulaName: '勾配と距離',
        steps: [
          { formula: 'rise = √(slant² − run²)', substituted: `√(${ctx.n(v.slant, 'length')}² − ${ctx.n(v.run, 'length')}²)`, result: ctx.u(rise, 'length') },
          { formula: '角度 = acos(run ÷ slant)', substituted: `acos(${ctx.n(v.run, 'length')} ÷ ${ctx.n(v.slant, 'length')})`, result: ctx.u(angle, 'angle') }
        ]
      };
    }
  },
  // percent/ratio/sun を角度の代わりに入れた場合の解法（angleFromAny 経由で角度系へ正規化する）
  ...['percent', 'ratio', 'sun'].map((key) => ({
    requires: ['run', key],
    provides: ['rise', 'slant', 'angle'],
    validate(v) {
      const angle = angleFromAny(v);
      if (!(angle > 0 && angle < 90)) return calcError('ANGLE_RANGE', key, RUN_RISE_RANGE_MSG);
      return null;
    },
    run(v, ctx) {
      const angle = angleFromAny(v);
      const rad = angle * DEG_TO_RAD;
      const rise = v.run * Math.tan(rad);
      const slant = v.run / Math.cos(rad);
      return {
        values: { rise, slant, angle },
        formulaName: '勾配と距離',
        steps: [
          { formula: '角度に換算してから rise = run × tan(角度)', substituted: `${ctx.n(v.run, 'length')} × tan(${ctx.u(angle, 'angle')})`, result: ctx.u(rise, 'length') },
          { formula: 'slant = run ÷ cos(角度)', substituted: `${ctx.n(v.run, 'length')} ÷ cos(${ctx.u(angle, 'angle')})`, result: ctx.u(slant, 'length') }
        ]
      };
    }
  }))
];

export const slopeLength = {
  id: 'slope.length',
  category: 'slope',
  title: '勾配と距離',
  subtitle: '高低差・水平距離・斜距離・角度・勾配%を相互計算',
  keywords: ['勾配', '高低差', '水平距離', '斜距離', '屋根', 'スロープ', '階段', '排水', '水勾配', '配管', '道路', '外構'],
  shape: 'rightTriangle',
  shapeMap: { a: 'run', b: 'rise', c: 'slant', angA: 'angle' },

  fields: [
    { key: 'rise', label: '高低差', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help: '垂直方向の高さの差' },
    { key: 'run', label: '水平距離', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help: '水平方向の距離' },
    { key: 'slant', label: '斜距離', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help: '斜めの距離' },
    { key: 'angle', label: '角度', quantity: 'angle', defaultUnit: 'deg', min: 0, max: 90, exclusiveMin: true, optional: true, rangeMessage: RUN_RISE_RANGE_MSG, help: '水平からの傾き' },
    { key: 'percent', label: '勾配 %', quantity: 'percent', defaultUnit: 'percent', optional: true },
    { key: 'ratio', label: '勾配比（1:n の n）', quantity: 'number', defaultUnit: 'number', optional: true, exclusiveMin: false },
    { key: 'sun', label: '勾配「寸」', quantity: 'number', defaultUnit: 'number', optional: true }
  ],

  solvers: lengthSolvers,

  outputs: [
    { key: 'rise', label: '高低差', quantity: 'length' },
    { key: 'run', label: '水平距離', quantity: 'length' },
    { key: 'slant', label: '斜距離', quantity: 'length' },
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'percent', label: '勾配 %', quantity: 'percent' }
  ],

  presets: [
    { label: '屋根', values: {} },
    { label: 'スロープ', values: {} },
    { label: '階段', values: {} },
    { label: '排水・水勾配', values: {} },
    { label: '配管', values: {} },
    { label: '道路・外構', values: {} }
  ],

  notes: NOTES
};

export default [slopeConvert, slopeLength];
