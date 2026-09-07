// earth.js — CALC_SPEC.md「土木・外構」（Phase 4 第11グループ）

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const lenField = (key, label, help, extra) =>
  Object.assign({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help }, extra);
const VOLUME_OUTPUTS = [
  { key: 'V_mm3', label: '体積(mm³)', quantity: 'volume', defaultUnit: 'mm3', fixedUnit: true },
  { key: 'V_m3', label: '体積(m³)', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true }
];
function volumeDouble(v) {
  return { V_mm3: v, V_m3: v };
}

/* ==================================================================== *
 * earth.excavation 掘削・埋戻し・盛土体積
 * ==================================================================== */

export const earthExcavation = {
  id: 'earth.excavation',
  category: 'earth',
  title: '掘削・盛土の体積',
  subtitle: '幅・奥行き・深さ（高さ）から、掘削や盛土の体積を計算',
  keywords: ['掘削', '盛土', '埋戻し', '土量', '外構', '基礎'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd' },

  fields: [lenField('w', '幅'), lenField('d', '奥行き'), lenField('h', '深さ（高さ）')],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['V_mm3', 'V_m3'],
      run(v, ctx) {
        const V = v.w * v.d * v.h;
        return { values: volumeDouble(V), formulaName: '土量', steps: [{ formula: 'V = 幅 × 奥行き × 深さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'm3') }] };
      }
    }
  ],

  outputs: [{ key: 'w', label: '幅', quantity: 'length' }, { key: 'd', label: '奥行き', quantity: 'length' }, { key: 'h', label: '深さ（高さ）', quantity: 'length' }, ...VOLUME_OUTPUTS],

  notes: NOTES.concat(['土は掘削・運搬・締固めで体積が変化します（ほぐし率・締固め率）。ここでは計画上の幾何体積のみを計算しています。'])
};

/* ==================================================================== *
 * earth.gravel 砕石量
 * ==================================================================== */

export const earthGravel = {
  id: 'earth.gravel',
  category: 'earth',
  title: '砕石量の計算',
  subtitle: '面積と敷き厚さから、必要な砕石の体積を計算',
  keywords: ['砕石', '割栗石', '外構', '駐車場', '土間下地'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd' },

  fields: [lenField('w', '幅'), lenField('d', '奥行き'), lenField('h', '敷き厚さ')],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['V_mm3', 'V_m3'],
      run(v, ctx) {
        const V = v.w * v.d * v.h;
        return { values: volumeDouble(V), formulaName: '砕石量', steps: [{ formula: 'V = 幅 × 奥行き × 敷き厚さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'm3') }] };
      }
    }
  ],

  outputs: [{ key: 'w', label: '幅', quantity: 'length' }, { key: 'd', label: '奥行き', quantity: 'length' }, { key: 'h', label: '敷き厚さ', quantity: 'length' }, ...VOLUME_OUTPUTS],

  notes: NOTES
};

/* ==================================================================== *
 * fence.posts フェンス支柱間隔・本数・位置一覧
 * ==================================================================== */

const MAX_LIST = 30;

export const fencePosts = {
  id: 'fence.posts',
  category: 'earth',
  title: 'フェンス支柱の間隔・本数',
  subtitle: '全長と支柱間隔（または本数）から、支柱の本数と位置を計算',
  keywords: ['フェンス', '支柱', '間隔', '本数', '外構'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'pitch' },

  fields: [lenField('total', '全長'), lenField('pitch', '支柱間隔'), { key: 'count', label: '本数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true }],

  solvers: [
    {
      requires: ['total', 'pitch'],
      provides: ['count'],
      run(v, ctx) {
        const count = v.total / v.pitch + 1;
        const nInt = Math.max(1, Math.round(count));
        const steps = [{ formula: '本数 = 全長 ÷ 支柱間隔 + 1', substituted: `${ctx.n(v.total, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: ctx.f(count) }];
        const positions = Array.from({ length: Math.min(nInt, MAX_LIST) }, (_, i) => i * v.pitch);
        positions.forEach((p, i) => steps.push({ formula: `支柱${i + 1}の位置`, substituted: '', result: ctx.u(p, 'length') }));
        if (nInt > MAX_LIST) steps.push({ formula: '…', substituted: '', result: `他 ${nInt - MAX_LIST} 本（残りは省略）` });
        return { values: { count }, formulaName: 'フェンス支柱', steps };
      }
    },
    {
      requires: ['total', 'count'],
      provides: ['pitch'],
      validate(v) {
        if (v.count <= 1) return calcError('ZERO', 'count', '本数は2以上にしてください');
        return null;
      },
      run(v, ctx) {
        const pitch = v.total / (v.count - 1);
        return { values: { pitch }, formulaName: 'フェンス支柱', steps: [{ formula: '間隔 = 全長 ÷ (本数 − 1)', substituted: `${ctx.n(v.total, 'length')} ÷ (${ctx.f(v.count)} − 1)`, result: ctx.u(pitch, 'length') }] };
      }
    },
    {
      requires: ['pitch', 'count'],
      provides: ['total'],
      run(v, ctx) {
        const total = v.pitch * (v.count - 1);
        return { values: { total }, formulaName: 'フェンス支柱', steps: [{ formula: '全長 = 支柱間隔 × (本数 − 1)', substituted: `${ctx.n(v.pitch, 'length')} × (${ctx.f(v.count)} − 1)`, result: ctx.u(total, 'length') }] };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全長', quantity: 'length' },
    { key: 'pitch', label: '支柱間隔', quantity: 'length' },
    { key: 'count', label: '本数', quantity: 'number', primary: true }
  ],

  notes: NOTES
};

export default [earthExcavation, earthGravel, fencePosts];
