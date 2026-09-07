// triangle.js — 三角・角度の計算定義
// CALC_SPEC.md B群: B-1 tri.right（直角三角形・Phase 1実装）/ B-2 tri.any（任意三角形）/
// B-3 tri.trig（三角関数単体）。

import { calcError } from '../core/errors.js';
import { DEG_TO_RAD, RAD_TO_DEG } from '../core/units.js';

const ANGLE_RANGE_MSG = '角度は0°より大きく90°より小さい値にしてください';

/* ------------------------------------------------------------------ *
 * 計算過程の組み立て（表示単位・表示桁数は ctx が面倒を見る）
 * ------------------------------------------------------------------ */

/** 「C = 90° − A」「勾配」「面積」の共通ステップを足す */
function addTail(all, derived, steps, ctx, input) {
  if (input.angC === undefined) {
    all.angC = 90 - all.angA;
    derived.angC = all.angC;
    steps.push({
      formula: 'C = 90° − A',
      substituted: `90° − ${ctx.u(all.angA, 'angle')}`,
      result: ctx.u(all.angC, 'angle')
    });
  }
  all.slopePercent = (all.b / all.a) * 100;
  derived.slopePercent = all.slopePercent;
  steps.push({
    formula: '勾配 = b ÷ a × 100',
    substituted: `${ctx.n(all.b, 'length')} ÷ ${ctx.n(all.a, 'length')} × 100`,
    result: ctx.u(all.slopePercent, 'percent')
  });

  const au = ctx.areaUnits();
  all.area = (all.a * all.b) / 2;
  derived.area = all.area;
  steps.push({
    formula: '面積 = a × b ÷ 2',
    substituted: `${ctx.n(all.a, 'length', au.lengthUnit)} × ${ctx.n(all.b, 'length', au.lengthUnit)} ÷ 2`,
    result: ctx.u(all.area, 'area', au.areaUnit)
  });
}

/** 底辺と高さから斜辺・角Aを出す（三平方の定理） */
function stepHypFromLegs(all, derived, steps, ctx) {
  const lu = ctx.unitOf('length');
  const da = ctx.d(all.a, 'length', lu);
  const db = ctx.d(all.b, 'length', lu);
  all.c = Math.hypot(all.a, all.b);
  derived.c = all.c;
  steps.push({
    formula: 'c = √(a² + b²)',
    substituted: `√(${ctx.f(da)}² + ${ctx.f(db)}²)`,
    mid: `√${ctx.f(da * da + db * db)}`,
    result: ctx.u(all.c, 'length')
  });

  all.angA = Math.atan2(all.b, all.a) * RAD_TO_DEG;
  derived.angA = all.angA;
  steps.push({
    formula: 'A = atan(b ÷ a)',
    substituted: `atan(${ctx.n(all.b, 'length')} ÷ ${ctx.n(all.a, 'length')})`,
    result: ctx.u(all.angA, 'angle')
  });
}

/* ------------------------------------------------------------------ *
 * 解法（CALC_SPEC B-1 の #1〜#9。上から順に評価される）
 * ------------------------------------------------------------------ */

const solvers = [
  // #1 底辺・高さ
  {
    requires: ['a', 'b'],
    provides: ['c', 'angA', 'angC', 'area', 'slopePercent'],
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      stepHypFromLegs(all, derived, steps, ctx);
      addTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三平方の定理', steps };
    }
  },

  // #2 底辺・斜辺
  {
    requires: ['a', 'c'],
    provides: ['b', 'angA', 'angC', 'area', 'slopePercent'],
    validate(v) {
      if (v.c <= v.a) return calcError('RIGHT_HYP', 'c');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const lu = ctx.unitOf('length');
      const dc = ctx.d(all.c, 'length', lu);
      const da = ctx.d(all.a, 'length', lu);

      all.b = Math.sqrt(all.c * all.c - all.a * all.a);
      derived.b = all.b;
      steps.push({
        formula: 'b = √(c² − a²)',
        substituted: `√(${ctx.f(dc)}² − ${ctx.f(da)}²)`,
        mid: `√${ctx.f(dc * dc - da * da)}`,
        result: ctx.u(all.b, 'length')
      });

      all.angA = Math.acos(all.a / all.c) * RAD_TO_DEG;
      derived.angA = all.angA;
      steps.push({
        formula: 'A = acos(a ÷ c)',
        substituted: `acos(${ctx.n(all.a, 'length')} ÷ ${ctx.n(all.c, 'length')})`,
        result: ctx.u(all.angA, 'angle')
      });

      addTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三平方の定理', steps };
    }
  },

  // #3 高さ・斜辺
  {
    requires: ['b', 'c'],
    provides: ['a', 'angA', 'angC', 'area', 'slopePercent'],
    validate(v) {
      if (v.c <= v.b) return calcError('RIGHT_HYP', 'c');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const lu = ctx.unitOf('length');
      const dc = ctx.d(all.c, 'length', lu);
      const db = ctx.d(all.b, 'length', lu);

      all.a = Math.sqrt(all.c * all.c - all.b * all.b);
      derived.a = all.a;
      steps.push({
        formula: 'a = √(c² − b²)',
        substituted: `√(${ctx.f(dc)}² − ${ctx.f(db)}²)`,
        mid: `√${ctx.f(dc * dc - db * db)}`,
        result: ctx.u(all.a, 'length')
      });

      all.angA = Math.asin(all.b / all.c) * RAD_TO_DEG;
      derived.angA = all.angA;
      steps.push({
        formula: 'A = asin(b ÷ c)',
        substituted: `asin(${ctx.n(all.b, 'length')} ÷ ${ctx.n(all.c, 'length')})`,
        result: ctx.u(all.angA, 'angle')
      });

      addTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三平方の定理', steps };
    }
  },

  // #4 底辺・角A
  {
    requires: ['a', 'angA'],
    provides: ['b', 'c', 'angC', 'area', 'slopePercent'],
    run: (v, ctx) => runFromBaseAndAngle(v, ctx, v.angA, null)
  },

  // #5 高さ・角A
  {
    requires: ['b', 'angA'],
    provides: ['a', 'c', 'angC', 'area', 'slopePercent'],
    run: (v, ctx) => runFromHeightAndAngle(v, ctx, v.angA, null)
  },

  // #6 斜辺・角A
  {
    requires: ['c', 'angA'],
    provides: ['a', 'b', 'angC', 'area', 'slopePercent'],
    run: (v, ctx) => runFromHypAndAngle(v, ctx, v.angA, null)
  },

  // #7 底辺・角C（angA = 90 − angC として #4 へ）
  {
    requires: ['a', 'angC'],
    provides: ['b', 'c', 'angA', 'area', 'slopePercent'],
    run: (v, ctx) => runFromBaseAndAngle(v, ctx, 90 - v.angC, v.angC)
  },

  // #8 高さ・角C
  {
    requires: ['b', 'angC'],
    provides: ['a', 'c', 'angA', 'area', 'slopePercent'],
    run: (v, ctx) => runFromHeightAndAngle(v, ctx, 90 - v.angC, v.angC)
  },

  // #9 斜辺・角C
  {
    requires: ['c', 'angC'],
    provides: ['a', 'b', 'angA', 'area', 'slopePercent'],
    run: (v, ctx) => runFromHypAndAngle(v, ctx, 90 - v.angC, v.angC)
  }
];

/** 角C入力のときに「A = 90° − C」のステップを先頭に置く */
function beginWithAngle(v, ctx, angA, angCInput) {
  const all = Object.assign({}, v);
  const derived = {};
  const steps = [];
  all.angA = angA;
  if (angCInput !== null) {
    derived.angA = angA;
    steps.push({
      formula: 'A = 90° − C',
      substituted: `90° − ${ctx.u(angCInput, 'angle')}`,
      result: ctx.u(angA, 'angle')
    });
  }
  return { all, derived, steps };
}

function runFromBaseAndAngle(v, ctx, angA, angCInput) {
  const { all, derived, steps } = beginWithAngle(v, ctx, angA, angCInput);
  const rad = angA * DEG_TO_RAD;

  all.b = all.a * Math.tan(rad);
  derived.b = all.b;
  steps.push({
    formula: 'b = a × tan(A)',
    substituted: `${ctx.n(all.a, 'length')} × tan(${ctx.u(angA, 'angle')})`,
    result: ctx.u(all.b, 'length')
  });

  all.c = all.a / Math.cos(rad);
  derived.c = all.c;
  steps.push({
    formula: 'c = a ÷ cos(A)',
    substituted: `${ctx.n(all.a, 'length')} ÷ cos(${ctx.u(angA, 'angle')})`,
    result: ctx.u(all.c, 'length')
  });

  addTail(all, derived, steps, ctx, v);
  return { values: derived, formulaName: '三角比', steps };
}

function runFromHeightAndAngle(v, ctx, angA, angCInput) {
  const { all, derived, steps } = beginWithAngle(v, ctx, angA, angCInput);
  const rad = angA * DEG_TO_RAD;

  all.a = all.b / Math.tan(rad);
  derived.a = all.a;
  steps.push({
    formula: 'a = b ÷ tan(A)',
    substituted: `${ctx.n(all.b, 'length')} ÷ tan(${ctx.u(angA, 'angle')})`,
    result: ctx.u(all.a, 'length')
  });

  all.c = all.b / Math.sin(rad);
  derived.c = all.c;
  steps.push({
    formula: 'c = b ÷ sin(A)',
    substituted: `${ctx.n(all.b, 'length')} ÷ sin(${ctx.u(angA, 'angle')})`,
    result: ctx.u(all.c, 'length')
  });

  addTail(all, derived, steps, ctx, v);
  return { values: derived, formulaName: '三角比', steps };
}

function runFromHypAndAngle(v, ctx, angA, angCInput) {
  const { all, derived, steps } = beginWithAngle(v, ctx, angA, angCInput);
  const rad = angA * DEG_TO_RAD;

  all.a = all.c * Math.cos(rad);
  derived.a = all.a;
  steps.push({
    formula: 'a = c × cos(A)',
    substituted: `${ctx.n(all.c, 'length')} × cos(${ctx.u(angA, 'angle')})`,
    result: ctx.u(all.a, 'length')
  });

  all.b = all.c * Math.sin(rad);
  derived.b = all.b;
  steps.push({
    formula: 'b = c × sin(A)',
    substituted: `${ctx.n(all.c, 'length')} × sin(${ctx.u(angA, 'angle')})`,
    result: ctx.u(all.b, 'length')
  });

  addTail(all, derived, steps, ctx, v);
  return { values: derived, formulaName: '三角比', steps };
}

/* ------------------------------------------------------------------ *
 * CalcDef
 * ------------------------------------------------------------------ */

const angleField = (key, label, anchor, help) => ({
  key,
  label,
  quantity: 'angle',
  defaultUnit: 'deg',
  min: 0,
  max: 90,
  exclusiveMin: true,
  optional: true,
  shapeAnchor: anchor,
  rangeMessage: ANGLE_RANGE_MSG,
  help
});

const lengthField = (key, label, anchor, help) => ({
  key,
  label,
  quantity: 'length',
  defaultUnit: 'mm',
  min: 0,
  exclusiveMin: true,
  max: null,
  optional: true,
  shapeAnchor: anchor,
  help
});

export const triRight = {
  id: 'tri.right',
  category: 'triangle',
  title: '直角三角形',
  subtitle: '底辺・高さ・斜辺・角度を相互計算',
  keywords: ['斜め', '斜辺', '三平方', 'ピタゴラス', '直角', '角度', '屋根', '筋交い', 'ななめ', 'ブレース', '斜材'],
  shape: 'rightTriangle',

  fields: [
    lengthField('a', '底辺', 'a', '水平方向の長さ'),
    lengthField('b', '高さ', 'b', '垂直方向の長さ'),
    lengthField('c', '斜辺', 'c', '斜めの辺の長さ'),
    angleField('angA', '角A', 'angA', '底辺と斜辺がつくる角'),
    angleField('angC', '角C', 'angC', '高さと斜辺がつくる角')
  ],

  solvers,

  outputs: [
    { key: 'a', label: '底辺', quantity: 'length' },
    { key: 'b', label: '高さ', quantity: 'length' },
    { key: 'c', label: '斜辺', quantity: 'length' },
    { key: 'angA', label: '角A', quantity: 'angle' },
    { key: 'angC', label: '角C', quantity: 'angle' },
    { key: 'area', label: '面積', quantity: 'area', defaultUnit: 'mm2' },
    { key: 'slopePercent', label: '勾配', quantity: 'percent' }
  ],

  notes: [
    '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
    '構造や法規に関わる判断は、必ず専門家にご確認ください。'
  ],

  /** 角度だけでは大きさが決まらないことを案内する */
  notEnoughHint(enteredKeys, def) {
    if (enteredKeys.length < 2) return null;
    const allAngle = enteredKeys.every((k) => {
      const f = def.fields.find((x) => x.key === k);
      return f && f.quantity === 'angle';
    });
    if (allAngle) return '角度だけでは大きさが決まりません。辺の長さを1つ入れてください';
    return null;
  }
};

/* ================================================================== *
 * B-2. tri.any 任意三角形（正弦定理・余弦定理・ヘロン）
 * ================================================================== */

const ANGLE180_MSG = '角度は0°より大きく180°より小さい値にしてください';

const any_lengthField = (key, label, help) => ({
  key,
  label,
  quantity: 'length',
  defaultUnit: 'mm',
  min: 0,
  exclusiveMin: true,
  optional: true,
  help
});

const any_angleField = (key, label, help) => ({
  key,
  label,
  quantity: 'angle',
  defaultUnit: 'deg',
  min: 0,
  max: 180,
  exclusiveMin: true,
  exclusiveMax: true,
  optional: true,
  rangeMessage: ANGLE180_MSG,
  help
});

/** 面積(ヘロン)・周長・底辺aからの高さ、の共通出力を追加する */
function any_addCommon(all, derived, steps, ctx) {
  const au = ctx.areaUnits();
  const s = (all.a + all.b + all.c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - all.a) * (s - all.b) * (s - all.c)));
  all.area = area;
  derived.area = area;
  steps.push({
    formula: 'S = √(s(s−a)(s−b)(s−c))　s=(a+b+c)/2',
    substituted: `s=${ctx.n(s, 'length', au.lengthUnit)}`,
    result: ctx.u(area, 'area', au.areaUnit)
  });

  const perimeter = all.a + all.b + all.c;
  all.perimeter = perimeter;
  derived.perimeter = perimeter;
  steps.push({
    formula: '周長 = a + b + c',
    substituted: `${ctx.n(all.a, 'length')} + ${ctx.n(all.b, 'length')} + ${ctx.n(all.c, 'length')}`,
    result: ctx.u(perimeter, 'length')
  });

  const heightA = (2 * area) / all.a;
  all.height_a = heightA;
  derived.height_a = heightA;
  const au2 = ctx.areaUnits();
  steps.push({
    formula: 'height_a = 2 × 面積 ÷ a',
    substituted: `2 × ${ctx.n(area, 'area', au2.areaUnit)} ÷ ${ctx.n(all.a, 'length')}`,
    result: ctx.u(heightA, 'length')
  });
}

const anySolvers = [
  // #1 SSS
  {
    requires: ['a', 'b', 'c'],
    provides: ['angA', 'angB', 'angC', 'area', 'perimeter', 'height_a'],
    validate(v) {
      if (v.a + v.b <= v.c || v.b + v.c <= v.a || v.a + v.c <= v.b) return calcError('TRIANGLE_INEQ');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];

      let cosA = (v.b * v.b + v.c * v.c - v.a * v.a) / (2 * v.b * v.c);
      cosA = Math.max(-1, Math.min(1, cosA));
      all.angA = Math.acos(cosA) * RAD_TO_DEG;
      derived.angA = all.angA;
      steps.push({
        formula: 'A = acos((b²+c²−a²)/(2bc))',
        substituted: `acos((${ctx.n(v.b, 'length')}² + ${ctx.n(v.c, 'length')}² − ${ctx.n(v.a, 'length')}²) ÷ (2×${ctx.n(v.b, 'length')}×${ctx.n(v.c, 'length')}))`,
        result: ctx.u(all.angA, 'angle')
      });

      let cosB = (v.a * v.a + v.c * v.c - v.b * v.b) / (2 * v.a * v.c);
      cosB = Math.max(-1, Math.min(1, cosB));
      all.angB = Math.acos(cosB) * RAD_TO_DEG;
      derived.angB = all.angB;
      steps.push({
        formula: 'B = acos((a²+c²−b²)/(2ac))',
        substituted: `acos((${ctx.n(v.a, 'length')}² + ${ctx.n(v.c, 'length')}² − ${ctx.n(v.b, 'length')}²) ÷ (2×${ctx.n(v.a, 'length')}×${ctx.n(v.c, 'length')}))`,
        result: ctx.u(all.angB, 'angle')
      });

      all.angC = 180 - all.angA - all.angB;
      derived.angC = all.angC;
      steps.push({
        formula: 'C = 180° − A − B',
        substituted: `180° − ${ctx.u(all.angA, 'angle')} − ${ctx.u(all.angB, 'angle')}`,
        result: ctx.u(all.angC, 'angle')
      });

      any_addCommon(all, derived, steps, ctx);
      return { values: derived, formulaName: '3辺（SSS・余弦定理）', steps };
    }
  },

  // #2 SAS
  {
    requires: ['a', 'b', 'angC'],
    provides: ['c', 'angA', 'angB', 'area', 'perimeter', 'height_a'],
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const rad = v.angC * DEG_TO_RAD;

      all.c = Math.sqrt(v.a * v.a + v.b * v.b - 2 * v.a * v.b * Math.cos(rad));
      derived.c = all.c;
      steps.push({
        formula: 'c = √(a² + b² − 2ab・cosC)',
        substituted: `√(${ctx.n(v.a, 'length')}² + ${ctx.n(v.b, 'length')}² − 2×${ctx.n(v.a, 'length')}×${ctx.n(v.b, 'length')}×cos${ctx.u(v.angC, 'angle')})`,
        result: ctx.u(all.c, 'length')
      });

      let cosA = (v.b * v.b + all.c * all.c - v.a * v.a) / (2 * v.b * all.c);
      cosA = Math.max(-1, Math.min(1, cosA));
      all.angA = Math.acos(cosA) * RAD_TO_DEG;
      derived.angA = all.angA;
      steps.push({
        formula: 'A = acos((b²+c²−a²)/(2bc))',
        substituted: `acos(...)`,
        result: ctx.u(all.angA, 'angle')
      });

      all.angB = 180 - v.angC - all.angA;
      derived.angB = all.angB;
      steps.push({
        formula: 'B = 180° − C − A',
        substituted: `180° − ${ctx.u(v.angC, 'angle')} − ${ctx.u(all.angA, 'angle')}`,
        result: ctx.u(all.angB, 'angle')
      });

      any_addCommon(all, derived, steps, ctx);
      return { values: derived, formulaName: '2辺挟角（SAS・余弦定理）', steps };
    }
  },

  // #3 ASA
  {
    requires: ['a', 'angB', 'angC'],
    provides: ['b', 'c', 'angA', 'area', 'perimeter', 'height_a'],
    validate(v) {
      if (v.angB + v.angC >= 180) return calcError('ANGLE_SUM');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];

      all.angA = 180 - v.angB - v.angC;
      derived.angA = all.angA;
      steps.push({
        formula: 'A = 180° − B − C',
        substituted: `180° − ${ctx.u(v.angB, 'angle')} − ${ctx.u(v.angC, 'angle')}`,
        result: ctx.u(all.angA, 'angle')
      });

      const radA = all.angA * DEG_TO_RAD;
      const radB = v.angB * DEG_TO_RAD;
      const radC = v.angC * DEG_TO_RAD;

      all.b = (v.a * Math.sin(radB)) / Math.sin(radA);
      derived.b = all.b;
      steps.push({
        formula: 'b = a × sinB ÷ sinA',
        substituted: `${ctx.n(v.a, 'length')} × sin${ctx.u(v.angB, 'angle')} ÷ sin${ctx.u(all.angA, 'angle')}`,
        result: ctx.u(all.b, 'length')
      });

      all.c = (v.a * Math.sin(radC)) / Math.sin(radA);
      derived.c = all.c;
      steps.push({
        formula: 'c = a × sinC ÷ sinA',
        substituted: `${ctx.n(v.a, 'length')} × sin${ctx.u(v.angC, 'angle')} ÷ sin${ctx.u(all.angA, 'angle')}`,
        result: ctx.u(all.c, 'length')
      });

      any_addCommon(all, derived, steps, ctx);
      return { values: derived, formulaName: '1辺2角（ASA・正弦定理）', steps };
    }
  },

  // #4 SSA（解が2通りある場合は鋭角側の解を採用する。Phase 2の既知の簡略化）
  {
    requires: ['a', 'b', 'angA'],
    provides: ['c', 'angB', 'angC', 'area', 'perimeter', 'height_a'],
    validate(v) {
      const radA = v.angA * DEG_TO_RAD;
      const sinB = (v.b * Math.sin(radA)) / v.a;
      if (sinB > 1) return calcError('DOMAIN', null, 'この長さでは三角形になりません');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const radA = v.angA * DEG_TO_RAD;

      const sinB = (v.b * Math.sin(radA)) / v.a;
      all.angB = Math.asin(Math.min(1, sinB)) * RAD_TO_DEG;
      derived.angB = all.angB;
      steps.push({
        formula: 'sinB = b × sinA ÷ a',
        substituted: `${ctx.n(v.b, 'length')} × sin${ctx.u(v.angA, 'angle')} ÷ ${ctx.n(v.a, 'length')}`,
        result: ctx.u(all.angB, 'angle')
      });

      all.angC = 180 - v.angA - all.angB;
      derived.angC = all.angC;
      steps.push({
        formula: 'C = 180° − A − B',
        substituted: `180° − ${ctx.u(v.angA, 'angle')} − ${ctx.u(all.angB, 'angle')}`,
        result: ctx.u(all.angC, 'angle')
      });

      const radA2 = v.angA * DEG_TO_RAD;
      const radC = all.angC * DEG_TO_RAD;
      all.c = (v.a * Math.sin(radC)) / Math.sin(radA2);
      derived.c = all.c;
      steps.push({
        formula: 'c = a × sinC ÷ sinA',
        substituted: `${ctx.n(v.a, 'length')} × sin${ctx.u(all.angC, 'angle')} ÷ sin${ctx.u(v.angA, 'angle')}`,
        result: ctx.u(all.c, 'length')
      });

      any_addCommon(all, derived, steps, ctx);
      return { values: derived, formulaName: '2辺1角（SSA・正弦定理）', steps };
    }
  }
];

export const triAny = {
  id: 'tri.any',
  category: 'triangle',
  title: '任意三角形',
  subtitle: '3辺・3角のうち3つから残りを計算',
  keywords: ['三角形', '正弦定理', '余弦定理', 'ヘロン', '面積', '辺', '角度'],
  shape: 'triangle',

  fields: [
    any_lengthField('a', '辺a', '辺BCの長さ'),
    any_lengthField('b', '辺b', '辺CAの長さ'),
    any_lengthField('c', '辺c', '辺ABの長さ'),
    any_angleField('angA', '角A', '頂点Aの角度'),
    any_angleField('angB', '角B', '頂点Bの角度'),
    any_angleField('angC', '角C', '頂点Cの角度')
  ],

  solvers: anySolvers,

  outputs: [
    { key: 'a', label: '辺a', quantity: 'length' },
    { key: 'b', label: '辺b', quantity: 'length' },
    { key: 'c', label: '辺c', quantity: 'length' },
    { key: 'angA', label: '角A', quantity: 'angle' },
    { key: 'angB', label: '角B', quantity: 'angle' },
    { key: 'angC', label: '角C', quantity: 'angle' },
    { key: 'area', label: '面積', quantity: 'area', defaultUnit: 'mm2' },
    { key: 'perimeter', label: '周長', quantity: 'length' },
    { key: 'height_a', label: '高さ(aから)', quantity: 'length' }
  ],

  notes: [
    '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
    '構造や法規に関わる判断は、必ず専門家にご確認ください。',
    '2辺1角（SSA）の入力で解が2通りある場合、本アプリは一方の解（鋭角側）のみを表示します。'
  ]
};

/* ================================================================== *
 * B-3. tri.trig 三角関数（単体）
 * ================================================================== */

const trigSolvers = [
  {
    requires: ['angle'],
    provides: ['sinVal', 'cosVal', 'tanVal'],
    validate(v) {
      if (Math.abs(v.angle - 90) < 1e-9) return calcError('ZERO', 'angle', '90°では計算できません');
      return null;
    },
    run(v, ctx) {
      const rad = v.angle * DEG_TO_RAD;
      const sinVal = Math.sin(rad);
      const cosVal = Math.cos(rad);
      const tanVal = Math.tan(rad);
      return {
        values: { sinVal, cosVal, tanVal },
        formulaName: '三角比',
        steps: [
          { formula: 'sin(角度)', substituted: `sin(${ctx.u(v.angle, 'angle')})`, result: ctx.f(sinVal) },
          { formula: 'cos(角度)', substituted: `cos(${ctx.u(v.angle, 'angle')})`, result: ctx.f(cosVal) },
          { formula: 'tan(角度)', substituted: `tan(${ctx.u(v.angle, 'angle')})`, result: ctx.f(tanVal) }
        ]
      };
    }
  },
  {
    requires: ['sinVal'],
    provides: ['angle', 'cosVal', 'tanVal'],
    validate(v) {
      if (Math.abs(v.sinVal) > 1) return calcError('DOMAIN');
      return null;
    },
    run(v, ctx) {
      const rad = Math.asin(v.sinVal);
      const angle = rad * RAD_TO_DEG;
      const cosVal = Math.cos(rad);
      const tanVal = Math.tan(rad);
      return {
        values: { angle, cosVal, tanVal },
        formulaName: '三角比（逆関数）',
        steps: [{ formula: '角度 = asin(sin値)', substituted: `asin(${ctx.f(v.sinVal)})`, result: ctx.u(angle, 'angle') }]
      };
    }
  },
  {
    requires: ['cosVal'],
    provides: ['angle', 'sinVal', 'tanVal'],
    validate(v) {
      if (Math.abs(v.cosVal) > 1) return calcError('DOMAIN');
      return null;
    },
    run(v, ctx) {
      const rad = Math.acos(v.cosVal);
      const angle = rad * RAD_TO_DEG;
      const sinVal = Math.sin(rad);
      const tanVal = Math.tan(rad);
      return {
        values: { angle, sinVal, tanVal },
        formulaName: '三角比（逆関数）',
        steps: [{ formula: '角度 = acos(cos値)', substituted: `acos(${ctx.f(v.cosVal)})`, result: ctx.u(angle, 'angle') }]
      };
    }
  },
  {
    requires: ['tanVal'],
    provides: ['angle', 'sinVal', 'cosVal'],
    run(v, ctx) {
      const rad = Math.atan(v.tanVal);
      const angle = rad * RAD_TO_DEG;
      const sinVal = Math.sin(rad);
      const cosVal = Math.cos(rad);
      return {
        values: { angle, sinVal, cosVal },
        formulaName: '三角比（逆関数）',
        steps: [{ formula: '角度 = atan(tan値)', substituted: `atan(${ctx.f(v.tanVal)})`, result: ctx.u(angle, 'angle') }]
      };
    }
  }
];

export const triTrig = {
  id: 'tri.trig',
  category: 'triangle',
  title: '三角関数（sin・cos・tan）',
  subtitle: '角度とsin・cos・tanの値を相互計算',
  keywords: ['三角関数', 'サイン', 'コサイン', 'タンジェント', 'sin', 'cos', 'tan', '角度'],
  shape: 'rightTriangle',
  shapeMap: { a: 'cosVal', b: 'sinVal', angA: 'angle' },

  fields: [
    { key: 'angle', label: '角度', quantity: 'angle', defaultUnit: 'deg', min: 0, max: 180, exclusiveMin: true, exclusiveMax: true, optional: true, rangeMessage: ANGLE180_MSG, help: '0°〜180°の範囲（90°は計算できません）' },
    { key: 'sinVal', label: 'sinの値', quantity: 'number', defaultUnit: 'number', optional: true },
    { key: 'cosVal', label: 'cosの値', quantity: 'number', defaultUnit: 'number', optional: true },
    { key: 'tanVal', label: 'tanの値', quantity: 'number', defaultUnit: 'number', optional: true }
  ],

  solvers: trigSolvers,

  outputs: [
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'sinVal', label: 'sinの値', quantity: 'number' },
    { key: 'cosVal', label: 'cosの値', quantity: 'number' },
    { key: 'tanVal', label: 'tanの値', quantity: 'number' }
  ],

  notes: [
    '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
    '構造や法規に関わる判断は、必ず専門家にご確認ください。'
  ]
};

export default [triRight, triAny, triTrig];
