// roof.js — CALC_SPEC.md「屋根」（Phase 4 第4グループ）
//
// 設計注記(roof.area): CALC_SPEC.md は「片流れ／切妻／寄棟」を1つのIDに束ねているが、
// 3形状の正確な面積式はそれぞれ異なり（特に寄棟は平面形状に依存し一意に定まらない）、
// 本アプリの「1 CalcDef = 1つの固定フィールド集合」という制約（basic.unit と同型の
// 既知の制約。HANDOFF_MVP_TO_NEXT.md 4-5参照）の中で3種を無理に統合すると不正確になる。
// そこで「水平投影面積 × 勾配による割増係数」という3形状に共通する近似式のみを実装し、
// notes で概算である旨を明示した（寄棟は特に近似精度が落ちる）。

import { DEG_TO_RAD, RAD_TO_DEG } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '屋根の形状（片流れ・切妻・寄棟）による面積の違いは、水平投影面積に勾配の割増係数を掛けた概算値です。寄棟など複雑な形状は特に目安としてご利用ください。'
];

const lenField = (key, label, help) => ({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help });
const angleField = (key, label, help) => ({
  key, label, quantity: 'angle', defaultUnit: 'deg', min: 0, max: 90, exclusiveMin: true, optional: true,
  rangeMessage: '角度は0°より大きく90°より小さい値にしてください', help
});

/* ==================================================================== *
 * roof.slope 勾配寸⇄角度⇄屋根面積の割増係数
 * ==================================================================== */

function fromAngle(angleDeg) {
  const rad = angleDeg * DEG_TO_RAD;
  return { percent: Math.tan(rad) * 100, sun: Math.tan(rad) * 10, areaFactor: 1 / Math.cos(rad) };
}

export const roofSlope = {
  id: 'roof.slope',
  category: 'roof',
  title: '屋根勾配と面積の割増係数',
  subtitle: '勾配（角度・%・寸）から、屋根面積の割増係数を計算',
  keywords: ['屋根', '勾配寸', '割増係数', '野地板', '屋根面積'],
  shape: null,

  fields: [
    angleField('angle', '角度', '水平からの傾き'),
    { key: 'percent', label: '勾配 %', quantity: 'percent', defaultUnit: 'percent', optional: true },
    { key: 'sun', label: '勾配「寸」', quantity: 'number', defaultUnit: 'number', optional: true },
    { key: 'areaFactor', label: '面積の割増係数', quantity: 'number', defaultUnit: 'number', optional: true, help: '水平投影面積に掛けると屋根の実面積になる' }
  ],

  solvers: [
    {
      requires: ['angle'],
      provides: ['percent', 'sun', 'areaFactor'],
      run(v, ctx) {
        const r = fromAngle(v.angle);
        return {
          values: r,
          formulaName: '屋根勾配',
          steps: [{ formula: '割増係数 = 1 ÷ cos(角度)', substituted: `1 ÷ cos(${ctx.u(v.angle, 'angle')})`, result: ctx.f(r.areaFactor) }]
        };
      }
    },
    {
      requires: ['sun'],
      provides: ['angle', 'percent', 'areaFactor'],
      run(v, ctx) {
        const angle = Math.atan(v.sun / 10) * RAD_TO_DEG;
        const r = fromAngle(angle);
        return {
          values: { angle, percent: r.percent, areaFactor: r.areaFactor },
          formulaName: '屋根勾配',
          steps: [
            { formula: '角度 = atan(寸 ÷ 10)', substituted: `atan(${ctx.f(v.sun)} ÷ 10)`, result: ctx.u(angle, 'angle') },
            { formula: '割増係数 = 1 ÷ cos(角度)', substituted: `1 ÷ cos(${ctx.u(angle, 'angle')})`, result: ctx.f(r.areaFactor) }
          ]
        };
      }
    },
    {
      requires: ['percent'],
      provides: ['angle', 'sun', 'areaFactor'],
      run(v, ctx) {
        const angle = Math.atan(v.percent / 100) * RAD_TO_DEG;
        const r = fromAngle(angle);
        return {
          values: { angle, sun: r.sun, areaFactor: r.areaFactor },
          formulaName: '屋根勾配',
          steps: [{ formula: '角度 = atan(勾配% ÷ 100)', substituted: `atan(${ctx.n(v.percent, 'percent')} ÷ 100)`, result: ctx.u(angle, 'angle') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'percent', label: '勾配 %', quantity: 'percent' },
    { key: 'sun', label: '勾配「寸」', quantity: 'number' },
    { key: 'areaFactor', label: '面積の割増係数', quantity: 'number', primary: true }
  ],

  presets: [
    { label: '3寸勾配', values: { sun: 3 } },
    { label: '4寸勾配', values: { sun: 4 } },
    { label: '5寸勾配', values: { sun: 5 } }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * roof.rafter 垂木長・棟高・軒の出
 * ==================================================================== */

export const roofRafter = {
  id: 'roof.rafter',
  category: 'roof',
  title: '垂木の長さ・棟高',
  subtitle: '軒までの水平距離・軒の出・角度から垂木の長さと棟高を計算',
  keywords: ['垂木', '棟高', '軒の出', '屋根', 'たるき'],
  shape: 'rightTriangle',
  shapeMap: { a: 'totalRun', b: 'ridgeHeight', c: 'rafterLength', angA: 'angle' },

  fields: [
    lenField('halfSpan', '軒までの水平距離', '壁の中心から軒までの水平距離（半間口）'),
    Object.assign(lenField('eave', '軒の出', '壁面から軒先までの張り出し'), { exclusiveMin: false }),
    angleField('angle', '角度', '屋根勾配の角度'),
    lenField('ridgeHeight', '棟高', '壁の高さから棟までの高さ'),
    lenField('rafterLength', '垂木の長さ', '軒先から棟までの垂木の実長（軒の出を含む）')
  ],

  solvers: [
    {
      requires: ['halfSpan', 'eave', 'angle'],
      provides: ['ridgeHeight', 'rafterLength', 'totalRun'],
      run(v, ctx) {
        const rad = v.angle * DEG_TO_RAD;
        const ridgeHeight = v.halfSpan * Math.tan(rad);
        const totalRun = v.halfSpan + v.eave;
        const rafterLength = totalRun / Math.cos(rad);
        return {
          values: { ridgeHeight, rafterLength, totalRun },
          formulaName: '垂木・棟高',
          steps: [
            { formula: '棟高 = 軒までの水平距離 × tan(角度)', substituted: `${ctx.n(v.halfSpan, 'length')} × tan(${ctx.u(v.angle, 'angle')})`, result: ctx.u(ridgeHeight, 'length') },
            { formula: '垂木長 = (軒までの水平距離 + 軒の出) ÷ cos(角度)', substituted: `(${ctx.n(v.halfSpan, 'length')} + ${ctx.n(v.eave, 'length')}) ÷ cos(${ctx.u(v.angle, 'angle')})`, result: ctx.u(rafterLength, 'length') }
          ]
        };
      }
    },
    {
      requires: ['halfSpan', 'angle'],
      provides: ['ridgeHeight'],
      run(v, ctx) {
        const ridgeHeight = v.halfSpan * Math.tan(v.angle * DEG_TO_RAD);
        return { values: { ridgeHeight }, formulaName: '垂木・棟高', steps: [{ formula: '棟高 = 軒までの水平距離 × tan(角度)', substituted: `${ctx.n(v.halfSpan, 'length')} × tan(${ctx.u(v.angle, 'angle')})`, result: ctx.u(ridgeHeight, 'length') }] };
      }
    },
    {
      requires: ['halfSpan', 'ridgeHeight'],
      provides: ['angle'],
      run(v, ctx) {
        const angle = Math.atan2(v.ridgeHeight, v.halfSpan) * RAD_TO_DEG;
        return { values: { angle }, formulaName: '垂木・棟高', steps: [{ formula: '角度 = atan(棟高 ÷ 軒までの水平距離)', substituted: `atan(${ctx.n(v.ridgeHeight, 'length')} ÷ ${ctx.n(v.halfSpan, 'length')})`, result: ctx.u(angle, 'angle') }] };
      }
    }
  ],

  outputs: [
    { key: 'halfSpan', label: '軒までの水平距離', quantity: 'length' },
    { key: 'eave', label: '軒の出', quantity: 'length' },
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'ridgeHeight', label: '棟高', quantity: 'length', primary: true },
    { key: 'rafterLength', label: '垂木の長さ', quantity: 'length', primary: true },
    { key: 'totalRun', label: '軒先までの水平距離（軒の出を含む）', quantity: 'length' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * roof.area 屋根面積（片流れ・切妻・寄棟 共通の概算式）
 * ==================================================================== */

export const roofArea = {
  id: 'roof.area',
  category: 'roof',
  title: '屋根面積（概算）',
  subtitle: '水平投影面積と勾配から、屋根の実面積を概算（片流れ・切妻・寄棟共通）',
  keywords: ['屋根面積', '片流れ', '切妻', '寄棟', '屋根', '野地板', 'ルーフィング'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'area' },

  fields: [
    lenField('w', '幅（水平投影）'),
    lenField('d', '奥行き（水平投影）'),
    angleField('angle', '角度', '屋根勾配の角度'),
    { key: 'area', label: '屋根の実面積', quantity: 'area', defaultUnit: 'mm2', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'angle'],
      provides: ['area'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const projected = v.w * v.d;
        const area = projected / Math.cos(v.angle * DEG_TO_RAD);
        return {
          values: { area },
          formulaName: '屋根面積（概算）',
          steps: [
            { formula: '水平投影面積 = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length', au.lengthUnit)} × ${ctx.n(v.d, 'length', au.lengthUnit)}`, result: ctx.u(projected, 'area', au.areaUnit) },
            { formula: '実面積 = 水平投影面積 ÷ cos(角度)', substituted: `${ctx.n(projected, 'area', au.areaUnit)} ÷ cos(${ctx.u(v.angle, 'angle')})`, result: ctx.u(area, 'area', au.areaUnit) }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '幅（水平投影）', quantity: 'length' },
    { key: 'd', label: '奥行き（水平投影）', quantity: 'length' },
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'area', label: '屋根の実面積', quantity: 'area', defaultUnit: 'mm2', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * roof.hip 隅木・谷木の長さ（寄棟・入隅）
 * ==================================================================== *
 * 隅木は平面図では対角線方向に走る。水平投影長は2方向の水平距離の対角線
 * √(runX² + runY²) になり、実長はそれと高さの直角三角形の斜辺で求まる。
 * 隅木の勾配は、屋根面の勾配より必ず緩くなる（水平距離が伸びるため）。
 */

export const roofHip = {
  id: 'roof.hip',
  category: 'roof',
  title: '隅木・谷木の長さ',
  subtitle: '2方向の水平距離と高さから、隅木の実長と勾配を計算',
  keywords: ['隅木', 'すみぎ', '谷木', '寄棟', '入隅', '対角', '登り', '屋根'],
  shape: 'rightTriangle',
  shapeMap: { a: 'diagRun', b: 'rise', c: 'hipLength', angA: 'hipAngle' },

  fields: [
    lenField('runX', '水平距離（X方向）', '軒から棟までの水平距離'),
    lenField('runY', '水平距離（Y方向）', 'もう一方の面の水平距離'),
    lenField('rise', '高さ', '軒から棟までの垂直方向の高さ')
  ],

  solvers: [
    {
      requires: ['runX', 'runY', 'rise'],
      provides: ['diagRun', 'hipLength', 'hipAngle', 'faceAngleX', 'faceAngleY'],
      run(v, ctx) {
        const diagRun = Math.hypot(v.runX, v.runY);
        const hipLength = Math.hypot(diagRun, v.rise);
        const hipAngle = Math.atan2(v.rise, diagRun) * RAD_TO_DEG;
        const faceAngleX = Math.atan2(v.rise, v.runX) * RAD_TO_DEG;
        const faceAngleY = Math.atan2(v.rise, v.runY) * RAD_TO_DEG;
        return {
          values: { diagRun, hipLength, hipAngle, faceAngleX, faceAngleY },
          formulaName: '隅木の実長',
          steps: [
            { formula: '隅木の水平投影長 = √(X方向² + Y方向²)', substituted: `√(${ctx.n(v.runX, 'length')}² + ${ctx.n(v.runY, 'length')}²)`, result: ctx.u(diagRun, 'length') },
            { formula: '隅木の実長 = √(水平投影長² + 高さ²)', substituted: `√(${ctx.n(diagRun, 'length')}² + ${ctx.n(v.rise, 'length')}²)`, result: ctx.u(hipLength, 'length') },
            { formula: '隅木の勾配 = atan(高さ ÷ 水平投影長)', substituted: `atan(${ctx.n(v.rise, 'length')} ÷ ${ctx.n(diagRun, 'length')})`, result: ctx.u(hipAngle, 'angle') },
            { formula: '屋根面の勾配（X方向） = atan(高さ ÷ X方向)', substituted: `atan(${ctx.n(v.rise, 'length')} ÷ ${ctx.n(v.runX, 'length')})`, result: ctx.u(faceAngleX, 'angle') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'diagRun', label: '隅木の水平投影長', quantity: 'length' },
    { key: 'rise', label: '高さ', quantity: 'length' },
    { key: 'hipLength', label: '隅木の実長', quantity: 'length', primary: true },
    { key: 'hipAngle', label: '隅木の勾配', quantity: 'angle', primary: true },
    { key: 'faceAngleX', label: '屋根面の勾配（X方向）', quantity: 'angle' },
    { key: 'faceAngleY', label: '屋根面の勾配（Y方向）', quantity: 'angle' }
  ],

  notes: NOTES.concat(['木口の切り欠き・仕口の分は含まない、芯から芯までの長さです。'])
};

export default [roofSlope, roofRafter, roofArea, roofHip];
