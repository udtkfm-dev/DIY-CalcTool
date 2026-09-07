// paint.js — CALC_SPEC.md「塗装・壁紙」（Phase 4 第8グループ）
//
// 設計注記(paint.area): 「塗料1Lで塗れる面積」（塗布量の逆数）は業界で m²/L という
// 複合単位で表記されるが、units.js には複合単位（面積÷体積）の量種がない。
// 本アプリの内部単位（mm²）に依存しない値として扱うため、coverage は
// 「m²/L」の数値（無次元の number quantity）として固定的に扱い、計算内で
// 面積をm²へ変換してから使う（他の量種と同じ「内部単位に統一」の考え方を、
// 面積についてのみ計算の中でm²に固定する形で踏襲した）。

import { fromBase } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '塗料・壁紙の必要量は目安です。製品ごとの塗布量・ロス率は商品表示をご確認ください。'
];

/* ==================================================================== *
 * paint.area 塗装面積＋塗布回数＋必要量
 * ==================================================================== */

export const paintArea = {
  id: 'paint.area',
  category: 'paint',
  title: '塗料の必要量',
  subtitle: '塗装面積・塗布回数・塗料の塗布量から、必要な塗料の量を計算',
  keywords: ['塗装', 'ペンキ', '塗料', '必要量', '塗布回数', 'DIY'],
  shape: null,

  fields: [
    { key: 'area', label: '塗装面積', quantity: 'area', defaultUnit: 'm2', min: 0, exclusiveMin: true, optional: true },
    { key: 'coats', label: '塗布回数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '重ね塗りの回数（通常2回）' },
    { key: 'coverage', label: '塗料の塗布量（m²/L）', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '塗料1Lで塗れる面積。商品表示を確認' },
    { key: 'needed', label: '必要な塗料の量', quantity: 'volume', defaultUnit: 'L', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['area', 'coats', 'coverage'],
      provides: ['needed'],
      run(v, ctx) {
        const areaM2 = fromBase(v.area, 'area', 'm2');
        const neededL = (areaM2 * v.coats) / v.coverage;
        const needed = neededL * 1e6; // L -> mm3(内部単位)
        return {
          values: { needed },
          formulaName: '塗料の必要量',
          steps: [
            { formula: '必要量(L) = 塗装面積(m²) × 塗布回数 ÷ 塗布量(m²/L)', substituted: `${ctx.f(areaM2)} × ${ctx.f(v.coats)} ÷ ${ctx.f(v.coverage)}`, result: ctx.f(neededL) + ' L' }
          ]
        };
      }
    },
    {
      requires: ['needed', 'coats', 'coverage'],
      provides: ['area'],
      run(v, ctx) {
        const neededL = fromBase(v.needed, 'volume', 'L');
        const areaM2 = (neededL * v.coverage) / v.coats;
        const area = areaM2 * 1e6; // m2 -> mm2(内部単位)
        return {
          values: { area },
          formulaName: '塗料の必要量',
          steps: [{ formula: '塗装面積(m²) = 必要量(L) × 塗布量(m²/L) ÷ 塗布回数', substituted: `${ctx.f(neededL)} × ${ctx.f(v.coverage)} ÷ ${ctx.f(v.coats)}`, result: ctx.f(areaM2) + ' m²' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'area', label: '塗装面積', quantity: 'area', defaultUnit: 'm2' },
    { key: 'coats', label: '塗布回数', quantity: 'number' },
    { key: 'coverage', label: '塗料の塗布量（m²/L）', quantity: 'number' },
    { key: 'needed', label: '必要な塗料の量', quantity: 'volume', defaultUnit: 'L', fixedUnit: true, primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * wallpaper.length 必要長・継ぎ目・柄合わせ余裕
 * ==================================================================== */

export const wallpaperLength = {
  id: 'wallpaper.length',
  category: 'paint',
  title: '壁紙の必要長',
  subtitle: '周長・天井高・壁紙幅・柄合わせ余裕から、必要な壁紙の長さを計算',
  keywords: ['壁紙', 'クロス', '必要長', '柄合わせ', 'リフォーム'],
  shape: 'wallStrip',
  shapeMap: { perimeter: 'perimeter', height: 'height' },
  fields: [
    { key: 'perimeter', label: '周長', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'height', label: '天井高', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'rollWidth', label: '壁紙の幅', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help: '一般的なクロスは920mm前後' },
    { key: 'patternMargin', label: '柄合わせ余裕（1枚あたり・任意）', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: false, optional: true },
    { key: 'drops', label: '継ぎ目の枚数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true },
    { key: 'total', label: '必要な壁紙の長さ', quantity: 'length', defaultUnit: 'm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['perimeter', 'height', 'rollWidth', 'patternMargin'],
      provides: ['drops', 'total'],
      run(v, ctx) {
        const drops = Math.ceil(v.perimeter / v.rollWidth);
        const dropLength = v.height + v.patternMargin;
        const total = drops * dropLength;
        return {
          values: { drops, total },
          formulaName: '壁紙の必要長',
          steps: [
            { formula: '継ぎ目の枚数 = ⌈周長 ÷ 壁紙の幅⌉', substituted: `⌈${ctx.n(v.perimeter, 'length')} ÷ ${ctx.n(v.rollWidth, 'length')}⌉`, result: ctx.f(drops) + ' 枚' },
            { formula: '1枚の長さ = 天井高 + 柄合わせ余裕', substituted: `${ctx.n(v.height, 'length')} + ${ctx.n(v.patternMargin, 'length')}`, result: ctx.u(dropLength, 'length') },
            { formula: '必要な長さ = 枚数 × 1枚の長さ', substituted: `${ctx.f(drops)} × ${ctx.n(dropLength, 'length')}`, result: ctx.u(total, 'length', 'm') }
          ]
        };
      }
    },
    {
      requires: ['perimeter', 'height', 'rollWidth'],
      provides: ['drops', 'total'],
      run(v, ctx) {
        const drops = Math.ceil(v.perimeter / v.rollWidth);
        const total = drops * v.height;
        return {
          values: { drops, total },
          formulaName: '壁紙の必要長',
          steps: [
            { formula: '継ぎ目の枚数 = ⌈周長 ÷ 壁紙の幅⌉', substituted: `⌈${ctx.n(v.perimeter, 'length')} ÷ ${ctx.n(v.rollWidth, 'length')}⌉`, result: ctx.f(drops) + ' 枚' },
            { formula: '必要な長さ = 枚数 × 天井高', substituted: `${ctx.f(drops)} × ${ctx.n(v.height, 'length')}`, result: ctx.u(total, 'length', 'm') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'perimeter', label: '周長', quantity: 'length' },
    { key: 'height', label: '天井高', quantity: 'length' },
    { key: 'rollWidth', label: '壁紙の幅', quantity: 'length' },
    { key: 'patternMargin', label: '柄合わせ余裕', quantity: 'length' },
    { key: 'drops', label: '継ぎ目の枚数', quantity: 'number', primary: true },
    { key: 'total', label: '必要な壁紙の長さ', quantity: 'length', defaultUnit: 'm', fixedUnit: true, primary: true }
  ],

  notEnoughHint(enteredKeys) {
    if (enteredKeys.length > 0 && enteredKeys.every((k) => k === 'patternMargin')) return '周長・天井高・壁紙の幅を入力してください（柄合わせ余裕は任意項目です）';
    return null;
  },

  notes: NOTES
};

/* ==================================================================== *
 * paint.thinner 塗料の希釈
 * ==================================================================== */

export const paintThinner = {
  id: 'paint.thinner',
  category: 'paint',
  title: '塗料の希釈',
  subtitle: '希釈率から、混ぜるうすめ液の量と合計量を計算',
  keywords: ['希釈', 'うすめ液', 'シンナー', '塗料', '配合', '割合', 'スプレー', '吹き付け'],
  shape: null,

  fields: [
    { key: 'paint', label: '塗料の量', quantity: 'volume', defaultUnit: 'mL', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'rate', label: '希釈率（%）', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: '塗料に対するうすめ液の割合。刷毛塗りで5〜10%、スプレーで30〜50%が目安' },
    { key: 'thinner', label: 'うすめ液の量', quantity: 'volume', defaultUnit: 'mL', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'total', label: '希釈後の合計', quantity: 'volume', defaultUnit: 'mL', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['paint', 'rate'],
      provides: ['thinner', 'total'],
      run(v, ctx) {
        const thinner = v.paint * (v.rate / 100);
        return {
          values: { thinner, total: v.paint + thinner },
          formulaName: '塗料の希釈',
          steps: [
            { formula: 'うすめ液 = 塗料 × 希釈率 ÷ 100', substituted: `${ctx.n(v.paint, 'volume', 'mL')} × ${ctx.f(v.rate)} ÷ 100`, result: ctx.u(thinner, 'volume', 'mL') },
            { formula: '合計 = 塗料 + うすめ液', substituted: `${ctx.n(v.paint, 'volume', 'mL')} + ${ctx.n(thinner, 'volume', 'mL')}`, result: ctx.u(v.paint + thinner, 'volume', 'mL') }
          ]
        };
      }
    },
    {
      requires: ['total', 'rate'],
      provides: ['paint', 'thinner'],
      run(v, ctx) {
        const paint = v.total / (1 + v.rate / 100);
        return {
          values: { paint, thinner: v.total - paint },
          formulaName: '合計量から逆算',
          steps: [
            { formula: '塗料 = 合計 ÷ (1 + 希釈率 ÷ 100)', substituted: `${ctx.n(v.total, 'volume', 'mL')} ÷ ${ctx.f(1 + v.rate / 100)}`, result: ctx.u(paint, 'volume', 'mL') },
            { formula: 'うすめ液 = 合計 − 塗料', substituted: `${ctx.n(v.total, 'volume', 'mL')} − ${ctx.n(paint, 'volume', 'mL')}`, result: ctx.u(v.total - paint, 'volume', 'mL') }
          ]
        };
      }
    },
    {
      requires: ['paint', 'thinner'],
      provides: ['rate', 'total'],
      run(v, ctx) {
        const rate = (v.thinner / v.paint) * 100;
        return {
          values: { rate, total: v.paint + v.thinner },
          formulaName: '希釈率の逆算',
          steps: [{ formula: '希釈率 = うすめ液 ÷ 塗料 × 100', substituted: `${ctx.n(v.thinner, 'volume', 'mL')} ÷ ${ctx.n(v.paint, 'volume', 'mL')} × 100`, result: ctx.f(rate) + ' %' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'paint', label: '塗料の量', quantity: 'volume', defaultUnit: 'mL', fixedUnit: true, primary: true },
    { key: 'thinner', label: 'うすめ液の量', quantity: 'volume', defaultUnit: 'mL', fixedUnit: true, primary: true },
    { key: 'rate', label: '希釈率（%）', quantity: 'number' },
    { key: 'total', label: '希釈後の合計', quantity: 'volume', defaultUnit: 'mL', fixedUnit: true }
  ],

  notes: NOTES.concat(['適した希釈率は塗料の種類・気温・塗る道具で変わります。製品の表示をご確認ください。'])
};

export default [paintArea, wallpaperLength, paintThinner];
