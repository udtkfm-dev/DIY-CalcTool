// area.js — CALC_SPEC.md D群「面積」

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
const areaField = (key, label, help) => ({
  key, label, quantity: 'area', defaultUnit: 'mm2', min: 0, exclusiveMin: true, optional: true, help
});

/* ------------------------------------------------------------------ *
 * area.rect 長方形
 * ------------------------------------------------------------------ */

export const areaRect = {
  id: 'area.rect',
  category: 'area',
  title: '長方形の面積',
  subtitle: '幅・高さ・面積・対角線を相互計算',
  keywords: ['面積', '長方形', '四角形', '広さ', '部屋'],
  shape: 'rectangle',

  fields: [
    lenField('w', '幅', '横方向の長さ'),
    lenField('h', '高さ', '縦方向の長さ'),
    areaField('S', '面積'),
    lenField('d', '対角線')
  ],

  solvers: [
    {
      requires: ['w', 'h'],
      provides: ['S', 'd', 'perimeter'],
      run(v, ctx) {
        const S = v.w * v.h;
        const d = Math.hypot(v.w, v.h);
        const perimeter = 2 * (v.w + v.h);
        const au = ctx.areaUnits();
        return {
          values: { S, d, perimeter },
          formulaName: '長方形の面積',
          steps: [
            { formula: 'S = w × h', substituted: `${ctx.n(v.w, 'length', au.lengthUnit)} × ${ctx.n(v.h, 'length', au.lengthUnit)}`, result: ctx.u(S, 'area', au.areaUnit) },
            { formula: 'd = √(w² + h²)', substituted: `√(${ctx.n(v.w, 'length')}² + ${ctx.n(v.h, 'length')}²)`, result: ctx.u(d, 'length') },
            { formula: '周長 = 2×(w+h)', substituted: `2×(${ctx.n(v.w, 'length')}+${ctx.n(v.h, 'length')})`, result: ctx.u(perimeter, 'length') }
          ]
        };
      }
    },
    {
      requires: ['S', 'w'],
      provides: ['h', 'd', 'perimeter'],
      run(v, ctx) {
        const h = v.S / v.w;
        const d = Math.hypot(v.w, h);
        const perimeter = 2 * (v.w + h);
        const au = ctx.areaUnits();
        return {
          values: { h, d, perimeter },
          formulaName: '長方形の面積',
          steps: [{ formula: 'h = S ÷ w', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ ${ctx.n(v.w, 'length', au.lengthUnit)}`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['S', 'h'],
      provides: ['w', 'd', 'perimeter'],
      run(v, ctx) {
        const w = v.S / v.h;
        const d = Math.hypot(w, v.h);
        const perimeter = 2 * (w + v.h);
        const au = ctx.areaUnits();
        return {
          values: { w, d, perimeter },
          formulaName: '長方形の面積',
          steps: [{ formula: 'w = S ÷ h', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ ${ctx.n(v.h, 'length', au.lengthUnit)}`, result: ctx.u(w, 'length') }]
        };
      }
    },
    {
      requires: ['d', 'w'],
      provides: ['h', 'S', 'perimeter'],
      validate(v) {
        if (v.d <= v.w) return calcError('RIGHT_HYP', 'd', '対角線は幅・高さのどちらよりも長くなります。値を見直してください');
        return null;
      },
      run(v, ctx) {
        const h = Math.sqrt(v.d * v.d - v.w * v.w);
        const S = v.w * h;
        const perimeter = 2 * (v.w + h);
        const au = ctx.areaUnits();
        return {
          values: { h, S, perimeter },
          formulaName: '長方形の面積',
          steps: [
            { formula: 'h = √(d² − w²)', substituted: `√(${ctx.n(v.d, 'length')}² − ${ctx.n(v.w, 'length')}²)`, result: ctx.u(h, 'length') },
            { formula: 'S = w × h', substituted: `${ctx.n(v.w, 'length', au.lengthUnit)} × ${ctx.n(h, 'length', au.lengthUnit)}`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    },
    {
      requires: ['d', 'h'],
      provides: ['w', 'S', 'perimeter'],
      validate(v) {
        if (v.d <= v.h) return calcError('RIGHT_HYP', 'd', '対角線は幅・高さのどちらよりも長くなります。値を見直してください');
        return null;
      },
      run(v, ctx) {
        const w = Math.sqrt(v.d * v.d - v.h * v.h);
        const S = w * v.h;
        const perimeter = 2 * (w + v.h);
        const au = ctx.areaUnits();
        return {
          values: { w, S, perimeter },
          formulaName: '長方形の面積',
          steps: [
            { formula: 'w = √(d² − h²)', substituted: `√(${ctx.n(v.d, 'length')}² − ${ctx.n(v.h, 'length')}²)`, result: ctx.u(w, 'length') },
            { formula: 'S = w × h', substituted: `${ctx.n(w, 'length', au.lengthUnit)} × ${ctx.n(v.h, 'length', au.lengthUnit)}`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '幅', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' },
    { key: 'd', label: '対角線', quantity: 'length' },
    { key: 'perimeter', label: '外周', quantity: 'length' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.square 正方形（rectangle 図形を w=h=a で流用）
 * ------------------------------------------------------------------ */

export const areaSquare = {
  id: 'area.square',
  category: 'area',
  title: '正方形の面積',
  subtitle: '一辺・面積・対角線を相互計算',
  keywords: ['面積', '正方形', '広さ'],
  shape: 'rectangle',
  shapeMap: { w: 'a', h: 'a', d: 'd', S: 'S' },

  fields: [lenField('a', '一辺'), areaField('S', '面積'), lenField('d', '対角線')],

  solvers: [
    {
      requires: ['a'],
      provides: ['S', 'd', 'perimeter'],
      run(v, ctx) {
        const S = v.a * v.a;
        const d = v.a * Math.SQRT2;
        const perimeter = v.a * 4;
        const au = ctx.areaUnits();
        return {
          values: { S, d, perimeter },
          formulaName: '正方形の面積',
          steps: [
            { formula: 'S = a²', substituted: `${ctx.n(v.a, 'length', au.lengthUnit)}²`, result: ctx.u(S, 'area', au.areaUnit) },
            { formula: 'd = a × √2', substituted: `${ctx.n(v.a, 'length')} × √2`, result: ctx.u(d, 'length') }
          ]
        };
      }
    },
    {
      requires: ['S'],
      provides: ['a', 'd', 'perimeter'],
      run(v, ctx) {
        const a = Math.sqrt(v.S);
        const d = a * Math.SQRT2;
        const perimeter = a * 4;
        const au = ctx.areaUnits();
        return {
          values: { a, d, perimeter },
          formulaName: '正方形の面積',
          steps: [{ formula: 'a = √S', substituted: `√${ctx.n(v.S, 'area', au.areaUnit)}`, result: ctx.u(a, 'length') }]
        };
      }
    },
    {
      requires: ['d'],
      provides: ['a', 'S', 'perimeter'],
      run(v, ctx) {
        const a = v.d / Math.SQRT2;
        const S = a * a;
        const perimeter = a * 4;
        const au = ctx.areaUnits();
        return {
          values: { a, S, perimeter },
          formulaName: '正方形の面積',
          steps: [
            { formula: 'a = d ÷ √2', substituted: `${ctx.n(v.d, 'length')} ÷ √2`, result: ctx.u(a, 'length') },
            { formula: 'S = a²', substituted: `${ctx.n(a, 'length', au.lengthUnit)}²`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'a', label: '一辺', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' },
    { key: 'd', label: '対角線', quantity: 'length' },
    { key: 'perimeter', label: '外周', quantity: 'length' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.triangle 三角形（底辺・高さ）
 * ------------------------------------------------------------------ */

export const areaTriangle = {
  id: 'area.triangle',
  category: 'area',
  title: '三角形の面積（底辺・高さ）',
  subtitle: '底辺・高さ・面積を相互計算',
  keywords: ['面積', '三角形', '広さ'],
  shape: 'triangleBH',

  fields: [lenField('b', '底辺'), lenField('h', '高さ'), areaField('S', '面積')],

  solvers: [
    {
      requires: ['b', 'h'],
      provides: ['S'],
      run(v, ctx) {
        const S = (v.b * v.h) / 2;
        const au = ctx.areaUnits();
        return {
          values: { S },
          formulaName: '三角形の面積',
          steps: [{ formula: 'S = 底辺 × 高さ ÷ 2', substituted: `${ctx.n(v.b, 'length', au.lengthUnit)} × ${ctx.n(v.h, 'length', au.lengthUnit)} ÷ 2`, result: ctx.u(S, 'area', au.areaUnit) }]
        };
      }
    },
    {
      requires: ['S', 'b'],
      provides: ['h'],
      run(v, ctx) {
        const h = (v.S * 2) / v.b;
        const au = ctx.areaUnits();
        return {
          values: { h },
          formulaName: '三角形の面積',
          steps: [{ formula: '高さ = S × 2 ÷ 底辺', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} × 2 ÷ ${ctx.n(v.b, 'length', au.lengthUnit)}`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['S', 'h'],
      provides: ['b'],
      run(v, ctx) {
        const b = (v.S * 2) / v.h;
        const au = ctx.areaUnits();
        return {
          values: { b },
          formulaName: '三角形の面積',
          steps: [{ formula: '底辺 = S × 2 ÷ 高さ', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} × 2 ÷ ${ctx.n(v.h, 'length', au.lengthUnit)}`, result: ctx.u(b, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'b', label: '底辺', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.triangle3 三角形（3辺・ヘロンの公式。正算のみ）
 * ------------------------------------------------------------------ */

export const areaTriangle3 = {
  id: 'area.triangle3',
  category: 'area',
  title: '三角形の面積（3辺から）',
  subtitle: '3辺の長さから面積を計算（ヘロンの公式）',
  keywords: ['面積', '三角形', 'ヘロン', '3辺'],
  shape: 'triangle',

  fields: [lenField('a', '辺a'), lenField('b', '辺b'), lenField('c', '辺c')],

  solvers: [
    {
      requires: ['a', 'b', 'c'],
      provides: ['S', 'perimeter'],
      validate(v) {
        if (v.a + v.b <= v.c || v.b + v.c <= v.a || v.a + v.c <= v.b) return calcError('TRIANGLE_INEQ');
        return null;
      },
      run(v, ctx) {
        const s = (v.a + v.b + v.c) / 2;
        const S = Math.sqrt(Math.max(0, s * (s - v.a) * (s - v.b) * (s - v.c)));
        const perimeter = v.a + v.b + v.c;
        const au = ctx.areaUnits();
        return {
          values: { S, perimeter },
          formulaName: 'ヘロンの公式',
          steps: [
            { formula: 's = (a+b+c) ÷ 2', substituted: `(${ctx.n(v.a, 'length')}+${ctx.n(v.b, 'length')}+${ctx.n(v.c, 'length')}) ÷ 2`, result: ctx.n(s, 'length') + ' ' + au.lengthUnit },
            { formula: 'S = √(s(s−a)(s−b)(s−c))', substituted: '', result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'a', label: '辺a', quantity: 'length' },
    { key: 'b', label: '辺b', quantity: 'length' },
    { key: 'c', label: '辺c', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' },
    { key: 'perimeter', label: '周長', quantity: 'length' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.trapezoid 台形
 * ------------------------------------------------------------------ */

export const areaTrapezoid = {
  id: 'area.trapezoid',
  category: 'area',
  title: '台形の面積',
  subtitle: '上底・下底・高さ・面積を相互計算',
  keywords: ['面積', '台形', '広さ'],
  shape: 'trapezoid',

  fields: [lenField('a', '上底'), lenField('b', '下底'), lenField('h', '高さ'), areaField('S', '面積')],

  solvers: [
    {
      requires: ['a', 'b', 'h'],
      provides: ['S'],
      run(v, ctx) {
        const S = ((v.a + v.b) * v.h) / 2;
        const au = ctx.areaUnits();
        return {
          values: { S },
          formulaName: '台形の面積',
          steps: [{ formula: 'S = (上底+下底) × 高さ ÷ 2', substituted: `(${ctx.n(v.a, 'length')}+${ctx.n(v.b, 'length')}) × ${ctx.n(v.h, 'length', au.lengthUnit)} ÷ 2`, result: ctx.u(S, 'area', au.areaUnit) }]
        };
      }
    },
    {
      requires: ['S', 'a', 'b'],
      provides: ['h'],
      validate(v) {
        if (v.a + v.b === 0) return calcError('ZERO', 'b');
        return null;
      },
      run(v, ctx) {
        const h = (v.S * 2) / (v.a + v.b);
        const au = ctx.areaUnits();
        return {
          values: { h },
          formulaName: '台形の面積',
          steps: [{ formula: '高さ = S × 2 ÷ (上底+下底)', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} × 2 ÷ (${ctx.n(v.a, 'length')}+${ctx.n(v.b, 'length')})`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['S', 'a', 'h'],
      provides: ['b'],
      run(v, ctx) {
        const b = (v.S * 2) / v.h - v.a;
        const au = ctx.areaUnits();
        return {
          values: { b },
          formulaName: '台形の面積',
          steps: [{ formula: '下底 = S × 2 ÷ 高さ − 上底', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} × 2 ÷ ${ctx.n(v.h, 'length', au.lengthUnit)} − ${ctx.n(v.a, 'length')}`, result: ctx.u(b, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'a', label: '上底', quantity: 'length' },
    { key: 'b', label: '下底', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.parallelogram 平行四辺形
 * ------------------------------------------------------------------ */

export const areaParallelogram = {
  id: 'area.parallelogram',
  category: 'area',
  title: '平行四辺形の面積',
  subtitle: '底辺・高さ・面積を相互計算',
  keywords: ['面積', '平行四辺形', '広さ'],
  shape: 'parallelogram',

  fields: [lenField('b', '底辺'), lenField('h', '高さ'), areaField('S', '面積')],

  solvers: [
    {
      requires: ['b', 'h'],
      provides: ['S'],
      run(v, ctx) {
        const S = v.b * v.h;
        const au = ctx.areaUnits();
        return {
          values: { S },
          formulaName: '平行四辺形の面積',
          steps: [{ formula: 'S = 底辺 × 高さ', substituted: `${ctx.n(v.b, 'length', au.lengthUnit)} × ${ctx.n(v.h, 'length', au.lengthUnit)}`, result: ctx.u(S, 'area', au.areaUnit) }]
        };
      }
    },
    {
      requires: ['S', 'b'],
      provides: ['h'],
      run(v, ctx) {
        const h = v.S / v.b;
        const au = ctx.areaUnits();
        return {
          values: { h },
          formulaName: '平行四辺形の面積',
          steps: [{ formula: '高さ = S ÷ 底辺', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ ${ctx.n(v.b, 'length', au.lengthUnit)}`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['S', 'h'],
      provides: ['b'],
      run(v, ctx) {
        const b = v.S / v.h;
        const au = ctx.areaUnits();
        return {
          values: { b },
          formulaName: '平行四辺形の面積',
          steps: [{ formula: '底辺 = S ÷ 高さ', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ ${ctx.n(v.h, 'length', au.lengthUnit)}`, result: ctx.u(b, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'b', label: '底辺', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.circle 円
 * ------------------------------------------------------------------ */

export const areaCircle = {
  id: 'area.circle',
  category: 'area',
  title: '円の面積・円周',
  subtitle: '半径・直径・円周・面積のどれか1つから残りを計算',
  keywords: ['面積', '円', '丸', '半径', '直径', '円周'],
  shape: 'circle',

  fields: [lenField('r', '半径'), lenField('d', '直径'), lenField('L', '円周'), areaField('S', '面積')],

  solvers: [
    {
      requires: ['r'],
      provides: ['d', 'L', 'S'],
      run(v, ctx) {
        const d = 2 * v.r;
        const L = 2 * Math.PI * v.r;
        const S = Math.PI * v.r * v.r;
        const au = ctx.areaUnits();
        return {
          values: { d, L, S },
          formulaName: '円の面積・円周',
          steps: [
            { formula: 'd = 2r', substituted: `2 × ${ctx.n(v.r, 'length')}`, result: ctx.u(d, 'length') },
            { formula: 'L = 2πr', substituted: `2π × ${ctx.n(v.r, 'length')}`, result: ctx.u(L, 'length') },
            { formula: 'S = πr²', substituted: `π × ${ctx.n(v.r, 'length', au.lengthUnit)}²`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    },
    {
      requires: ['d'],
      provides: ['r', 'L', 'S'],
      run(v, ctx) {
        const r = v.d / 2;
        const L = Math.PI * v.d;
        const S = Math.PI * r * r;
        const au = ctx.areaUnits();
        return {
          values: { r, L, S },
          formulaName: '円の面積・円周',
          steps: [
            { formula: 'r = d ÷ 2', substituted: `${ctx.n(v.d, 'length')} ÷ 2`, result: ctx.u(r, 'length') },
            { formula: 'L = πd', substituted: `π × ${ctx.n(v.d, 'length')}`, result: ctx.u(L, 'length') },
            { formula: 'S = πr²', substituted: `π × ${ctx.n(r, 'length', au.lengthUnit)}²`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    },
    {
      requires: ['L'],
      provides: ['r', 'd', 'S'],
      run(v, ctx) {
        const r = v.L / (2 * Math.PI);
        const d = 2 * r;
        const S = Math.PI * r * r;
        const au = ctx.areaUnits();
        return {
          values: { r, d, S },
          formulaName: '円の面積・円周',
          steps: [
            { formula: 'r = L ÷ (2π)', substituted: `${ctx.n(v.L, 'length')} ÷ (2π)`, result: ctx.u(r, 'length') },
            { formula: 'S = πr²', substituted: `π × ${ctx.n(r, 'length', au.lengthUnit)}²`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    },
    {
      requires: ['S'],
      provides: ['r', 'd', 'L'],
      run(v, ctx) {
        const r = Math.sqrt(v.S / Math.PI);
        const d = 2 * r;
        const L = 2 * Math.PI * r;
        const au = ctx.areaUnits();
        return {
          values: { r, d, L },
          formulaName: '円の面積・円周',
          steps: [
            { formula: 'r = √(S ÷ π)', substituted: `√(${ctx.n(v.S, 'area', au.areaUnit)} ÷ π)`, result: ctx.u(r, 'length') },
            { formula: 'L = 2πr', substituted: `2π × ${ctx.n(r, 'length')}`, result: ctx.u(L, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'd', label: '直径', quantity: 'length' },
    { key: 'L', label: '円周', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.sector 扇形
 * ------------------------------------------------------------------ */

export const areaSector = {
  id: 'area.sector',
  category: 'area',
  title: '扇形の面積・弧長',
  subtitle: '半径・中心角・弧長・面積を相互計算',
  keywords: ['面積', '扇形', '弧', '中心角'],
  shape: 'sector',

  fields: [
    lenField('r', '半径'),
    { key: 'theta', label: '中心角', quantity: 'angle', defaultUnit: 'deg', min: 0, max: 360, exclusiveMin: true, exclusiveMax: false, optional: true, rangeMessage: '中心角は0°より大きく360°以下の値にしてください' },
    lenField('L', '弧長'),
    areaField('S', '面積')
  ],

  solvers: [
    {
      requires: ['r', 'theta'],
      provides: ['L', 'S'],
      run(v, ctx) {
        const L = 2 * Math.PI * v.r * (v.theta / 360);
        const S = Math.PI * v.r * v.r * (v.theta / 360);
        const au = ctx.areaUnits();
        return {
          values: { L, S },
          formulaName: '扇形の面積・弧長',
          steps: [
            { formula: 'L = 2πr × θ÷360', substituted: `2π × ${ctx.n(v.r, 'length')} × ${ctx.n(v.theta, 'angle')}÷360`, result: ctx.u(L, 'length') },
            { formula: 'S = πr² × θ÷360', substituted: `π × ${ctx.n(v.r, 'length', au.lengthUnit)}² × ${ctx.n(v.theta, 'angle')}÷360`, result: ctx.u(S, 'area', au.areaUnit) }
          ]
        };
      }
    },
    {
      requires: ['r', 'L'],
      provides: ['theta', 'S'],
      run(v, ctx) {
        const theta = ((v.L / (2 * Math.PI * v.r)) * 360);
        const S = Math.PI * v.r * v.r * (theta / 360);
        const au = ctx.areaUnits();
        return {
          values: { theta, S },
          formulaName: '扇形の面積・弧長',
          steps: [{ formula: 'θ = L ÷ (2πr) × 360', substituted: `${ctx.n(v.L, 'length')} ÷ (2π×${ctx.n(v.r, 'length')}) × 360`, result: ctx.u(theta, 'angle') }]
        };
      }
    },
    {
      requires: ['r', 'S'],
      provides: ['theta', 'L'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const theta = (v.S / (Math.PI * v.r * v.r)) * 360;
        const L = 2 * Math.PI * v.r * (theta / 360);
        return {
          values: { theta, L },
          formulaName: '扇形の面積・弧長',
          steps: [{ formula: 'θ = S ÷ (πr²) × 360', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ (π×${ctx.n(v.r, 'length', au.lengthUnit)}²) × 360`, result: ctx.u(theta, 'angle') }]
        };
      }
    },
    {
      requires: ['theta', 'S'],
      provides: ['r', 'L'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const r = Math.sqrt(v.S / (Math.PI * (v.theta / 360)));
        const L = 2 * Math.PI * r * (v.theta / 360);
        return {
          values: { r, L },
          formulaName: '扇形の面積・弧長',
          steps: [{ formula: 'r = √(S ÷ (π × θ÷360))', substituted: `√(${ctx.n(v.S, 'area', au.areaUnit)} ÷ (π×${ctx.n(v.theta, 'angle')}÷360))`, result: ctx.u(r, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'theta', label: '中心角', quantity: 'angle' },
    { key: 'L', label: '弧長', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.ellipse 楕円
 * ------------------------------------------------------------------ */

export const areaEllipse = {
  id: 'area.ellipse',
  category: 'area',
  title: '楕円の面積',
  subtitle: '長半径・短半径・面積を相互計算',
  keywords: ['面積', '楕円', '広さ'],
  shape: 'ellipse',

  fields: [lenField('a', '長半径'), lenField('b', '短半径'), areaField('S', '面積')],

  solvers: [
    {
      requires: ['a', 'b'],
      provides: ['S'],
      run(v, ctx) {
        const S = Math.PI * v.a * v.b;
        const au = ctx.areaUnits();
        return {
          values: { S },
          formulaName: '楕円の面積',
          steps: [{ formula: 'S = π × a × b', substituted: `π × ${ctx.n(v.a, 'length', au.lengthUnit)} × ${ctx.n(v.b, 'length', au.lengthUnit)}`, result: ctx.u(S, 'area', au.areaUnit) }]
        };
      }
    },
    {
      requires: ['S', 'a'],
      provides: ['b'],
      run(v, ctx) {
        const b = v.S / (Math.PI * v.a);
        const au = ctx.areaUnits();
        return {
          values: { b },
          formulaName: '楕円の面積',
          steps: [{ formula: 'b = S ÷ (π × a)', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ (π×${ctx.n(v.a, 'length', au.lengthUnit)})`, result: ctx.u(b, 'length') }]
        };
      }
    },
    {
      requires: ['S', 'b'],
      provides: ['a'],
      run(v, ctx) {
        const a = v.S / (Math.PI * v.b);
        const au = ctx.areaUnits();
        return {
          values: { a },
          formulaName: '楕円の面積',
          steps: [{ formula: 'a = S ÷ (π × b)', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ (π×${ctx.n(v.b, 'length', au.lengthUnit)})`, result: ctx.u(a, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'a', label: '長半径', quantity: 'length' },
    { key: 'b', label: '短半径', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * area.room 部屋の面積（建築系の入口）
 * ------------------------------------------------------------------ */

export const areaRoom = {
  id: 'area.room',
  category: 'area',
  title: '部屋の面積（m²・坪・畳）',
  subtitle: '幅・奥行きから面積をm²・坪・畳で同時表示',
  keywords: ['面積', '部屋', '坪', '畳', '平米', '広さ', 'リフォーム'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', d: 'diagonal', S: 'S_m2' },

  fields: [lenField('w', '幅'), lenField('d', '奥行き')],

  solvers: [
    {
      requires: ['w', 'd'],
      provides: ['S_m2', 'S_tsubo', 'S_jo', 'diagonal', 'perimeter'],
      run(v, ctx) {
        const area = v.w * v.d; // 内部値（mm²）。3つの出力キーへ同じ値を複製し、表示単位だけ固定で変える
        const diagonal = Math.hypot(v.w, v.d);
        const perimeter = 2 * (v.w + v.d);
        return {
          values: { S_m2: area, S_tsubo: area, S_jo: area, diagonal, perimeter },
          formulaName: '部屋の面積',
          steps: [
            { formula: 'S = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length', 'mm')} × ${ctx.n(v.d, 'length', 'mm')}`, result: ctx.u(area, 'area', 'm2') },
            { formula: '対角線 = √(幅² + 奥行き²)', substituted: `√(${ctx.n(v.w, 'length')}² + ${ctx.n(v.d, 'length')}²)`, result: ctx.u(diagonal, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'S_m2', label: '面積(m²)', quantity: 'area', defaultUnit: 'm2', fixedUnit: true },
    { key: 'S_tsubo', label: '面積(坪)', quantity: 'area', defaultUnit: 'tsubo', fixedUnit: true },
    { key: 'S_jo', label: '面積(畳)', quantity: 'area', defaultUnit: 'jo', fixedUnit: true },
    { key: 'diagonal', label: '対角線', quantity: 'length' },
    { key: 'perimeter', label: '外周', quantity: 'length' }
  ],

  notes: [
    '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
    '構造や法規に関わる判断は、必ず専門家にご確認ください。',
    '畳数は中京間（1畳=1.653m²）で計算しています。地域・物件により畳の大きさは異なります。'
  ]
};

export default [
  areaRect,
  areaSquare,
  areaTriangle,
  areaTriangle3,
  areaTrapezoid,
  areaParallelogram,
  areaCircle,
  areaSector,
  areaEllipse,
  areaRoom
];
