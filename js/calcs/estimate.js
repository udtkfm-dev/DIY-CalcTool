// estimate.js — 材料の拾い・積算（材積・必要枚数・本数・袋数・概算費用）
//
// 設計注記: 「半端な枚数では買えない」という業務要求としての切り上げは
// solver 内の Math.ceil で行う（HANDOFF_MVP_TO_NEXT.md 9-5-5 の判断と同じ。
// 禁じられているのは表示精度のための丸めであって、数式の一部としての切り上げではない）。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '必要量は割付や施工方法で変わります。実際の購入前には、割付図や販売店の規格とあわせてご確認ください。'
];

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
const numField = (key, label, help, min0) => ({
  key, label, quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: !min0, optional: true, help
});

/* ==================================================================== *
 * estimate.lumber 木材の材積（㎥・石数）
 * ==================================================================== */

export const estimateLumber = {
  id: 'estimate.lumber',
  category: 'estimate',
  title: '木材の材積（㎥・石数）',
  subtitle: '断面寸法・長さ・本数から、体積と石数を計算',
  keywords: ['材積', '石数', '石', '木材', '製材', '立米', 'りゅうべい', '㎥'],
  shape: 'box3d',
  shapeMap: { w: 'w', h: 'h', d: 'L' },

  fields: [
    lenField('w', '幅'),
    lenField('h', '厚さ'),
    lenField('L', '長さ'),
    numField('n', '本数'),
    { key: 'V_m3', label: '材積', quantity: 'volume', defaultUnit: 'm3', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['w', 'h', 'L', 'n'],
      provides: ['V_m3', 'koku', 'unitV'],
      run(v, ctx) {
        const unitMm3 = v.w * v.h * v.L;
        const totalMm3 = unitMm3 * v.n;
        const m3 = totalMm3 / 1e9;
        const koku = m3 / 0.278; // 1石 ≒ 0.278 m³
        return {
          values: { V_m3: totalMm3, koku, unitV: unitMm3 },
          formulaName: '材積',
          steps: [
            { formula: '1本の体積 = 幅 × 厚さ × 長さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.h, 'length')} × ${ctx.n(v.L, 'length')}`, result: ctx.f(unitMm3 / 1e9) + ' m³' },
            { formula: '合計 = 1本の体積 × 本数', substituted: `${ctx.f(unitMm3 / 1e9)} × ${ctx.f(v.n)}`, result: ctx.f(m3) + ' m³' },
            { formula: '石数 = 材積[m³] ÷ 0.278', substituted: `${ctx.f(m3)} ÷ 0.278`, result: ctx.f(koku) + ' 石' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'unitV', label: '1本の体積', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true },
    { key: 'V_m3', label: '材積の合計', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true, primary: true },
    { key: 'koku', label: '石数', quantity: 'number', primary: true }
  ],

  notes: NOTES.concat(['石数は 1石 = 0.278 m³（10立方尺）で換算しています。取引の慣習により扱いが異なる場合があります。'])
};

/* ==================================================================== *
 * estimate.board ボード・合板の必要枚数
 * ==================================================================== */

export const estimateBoard = {
  id: 'estimate.board',
  category: 'estimate',
  title: 'ボード・合板の必要枚数',
  subtitle: '施工面積と1枚のサイズ・ロス率から、必要な枚数を計算',
  keywords: ['合板', 'ベニヤ', '石膏ボード', 'プラスターボード', '枚数', 'ロス', 'サブロク', '定尺'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'areaTotal' },

  fields: [
    lenField('w', '施工面の幅'),
    lenField('d', '施工面の高さ・奥行き'),
    lenField('bw', 'ボード1枚の幅', '定尺サブロク板なら 910'),
    lenField('bh', 'ボード1枚の長さ', '定尺サブロク板なら 1820'),
    numField('waste', 'ロス率（%）', '端材として捨てる分の割合。5〜10 が一般的', true)
  ],

  solvers: [
    {
      requires: ['w', 'd', 'bw', 'bh', 'waste'],
      provides: ['areaTotal', 'boardArea', 'sheets', 'sheetsExact'],
      validate(v) { if (v.bw === 0 || v.bh === 0) return calcError('ZERO', 'bw'); return null; },
      run(v, ctx) {
        const areaTotal = v.w * v.d;
        const boardArea = v.bw * v.bh;
        const exact = (areaTotal / boardArea) * (1 + v.waste / 100);
        const sheets = Math.ceil(exact);
        return {
          values: { areaTotal, boardArea, sheets, sheetsExact: exact },
          formulaName: '必要枚数',
          steps: [
            { formula: '施工面積 = 幅 × 高さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.u(areaTotal, 'area') },
            { formula: '1枚の面積 = 幅 × 長さ', substituted: `${ctx.n(v.bw, 'length')} × ${ctx.n(v.bh, 'length')}`, result: ctx.u(boardArea, 'area') },
            { formula: '枚数 = 施工面積 ÷ 1枚の面積 × (1 + ロス率)', substituted: `${ctx.n(areaTotal, 'area')} ÷ ${ctx.n(boardArea, 'area')} × ${ctx.f(1 + v.waste / 100)}`, result: ctx.f(exact) + ' 枚' },
            { formula: '切り上げ', substituted: `${ctx.f(exact)} → 切り上げ`, result: sheets + ' 枚' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'areaTotal', label: '施工面積', quantity: 'area' },
    { key: 'boardArea', label: '1枚の面積', quantity: 'area' },
    { key: 'sheetsExact', label: '必要枚数（計算値）', quantity: 'number' },
    { key: 'sheets', label: '必要枚数', quantity: 'number', primary: true }
  ],

  notes: NOTES.concat(['面積だけの計算です。実際は割付の都合で端材が増えることがあります。'])
};

/* ==================================================================== *
 * estimate.screws ビス・釘の本数
 * ==================================================================== */

export const estimateScrews = {
  id: 'estimate.screws',
  category: 'estimate',
  title: 'ビス・釘の本数',
  subtitle: '打つ長さと間隔から、必要な本数を計算',
  keywords: ['ビス', 'ネジ', '釘', '本数', 'ピッチ', '間隔', '留め付け'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'pitch', edge: 'edge' },

  fields: [
    lenField('total', '打つ範囲の長さ'),
    lenField('pitch', 'ビスの間隔', '外周部 150mm、中間部 200mm 程度が一般的な目安'),
    lenField('edge', '端からの距離', '端部のビスを入れる位置'),
    numField('lines', '列数', '同じ間隔で打つ列の数（1列なら1）')
  ],

  solvers: [
    {
      requires: ['total', 'pitch', 'edge', 'lines'],
      provides: ['perLine', 'count'],
      validate(v) { if (v.pitch === 0) return calcError('ZERO', 'pitch'); return null; },
      run(v, ctx) {
        const span = v.total - v.edge * 2;
        if (span < 0) return { values: {}, formulaName: '本数', steps: [] };
        const perLine = Math.floor(span / v.pitch) + 1;
        const count = perLine * Math.round(v.lines);
        return {
          values: { perLine, count },
          formulaName: 'ビスの本数',
          steps: [
            { formula: '端を除いた長さ = 全長 − 端からの距離 × 2', substituted: `${ctx.n(v.total, 'length')} − ${ctx.n(v.edge, 'length')} × 2`, result: ctx.u(span, 'length') },
            { formula: '1列の本数 = 端を除いた長さ ÷ 間隔 + 1（切り捨て）', substituted: `${ctx.n(span, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: perLine + ' 本' },
            { formula: '合計 = 1列の本数 × 列数', substituted: `${perLine} × ${ctx.f(v.lines)}`, result: count + ' 本' }
          ]
        };
      }
    },
    {
      requires: ['total', 'pitch'],
      provides: ['perLine', 'count'],
      validate(v) { if (v.pitch === 0) return calcError('ZERO', 'pitch'); return null; },
      run(v, ctx) {
        const perLine = Math.floor(v.total / v.pitch) + 1;
        return {
          values: { perLine, count: perLine },
          formulaName: 'ビスの本数',
          steps: [{ formula: '本数 = 全長 ÷ 間隔 + 1（切り捨て）', substituted: `${ctx.n(v.total, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: perLine + ' 本' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'perLine', label: '1列あたりの本数', quantity: 'number' },
    { key: 'count', label: '必要な本数', quantity: 'number', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * estimate.bag セメント・モルタルの袋数
 * ==================================================================== */

export const estimateBag = {
  id: 'estimate.bag',
  category: 'estimate',
  title: 'セメント・モルタルの袋数',
  subtitle: '必要な体積と1袋の出来高から、袋数を計算',
  keywords: ['セメント', 'モルタル', 'コンクリート', '袋', '出来高', 'インスタント', '左官'],
  shape: 'box3d',
  shapeMap: { w: 'w', d: 'd', h: 'h' },

  fields: [
    lenField('w', '幅'),
    lenField('d', '奥行き'),
    lenField('h', '厚さ'),
    { key: 'perBag', label: '1袋の出来高', quantity: 'volume', defaultUnit: 'L', min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help: '製品の表示（例: 25kg袋で約13L）' },
    numField('waste', 'ロス率（%）', 'こぼれ・付着の分。5〜10 が一般的', true)
  ],

  solvers: [
    {
      requires: ['w', 'd', 'h', 'perBag', 'waste'],
      provides: ['V_L', 'bagsExact', 'bags'],
      validate(v) { if (v.perBag === 0) return calcError('ZERO', 'perBag'); return null; },
      run(v, ctx) {
        const volMm3 = v.w * v.d * v.h;
        const withWaste = volMm3 * (1 + v.waste / 100);
        const exact = withWaste / v.perBag;
        const bags = Math.ceil(exact);
        return {
          values: { V_L: withWaste, bagsExact: exact, bags },
          formulaName: '必要な袋数',
          steps: [
            { formula: '体積 = 幅 × 奥行き × 厚さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(volMm3, 'volume', 'L') },
            { formula: 'ロスを見込んだ体積', substituted: `${ctx.u(volMm3, 'volume', 'L')} × ${ctx.f(1 + v.waste / 100)}`, result: ctx.u(withWaste, 'volume', 'L') },
            { formula: '袋数 = 体積 ÷ 1袋の出来高', substituted: `${ctx.u(withWaste, 'volume', 'L')} ÷ ${ctx.u(v.perBag, 'volume', 'L')}`, result: ctx.f(exact) + ' 袋' },
            { formula: '切り上げ', substituted: `${ctx.f(exact)} → 切り上げ`, result: bags + ' 袋' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'V_L', label: '必要な体積', quantity: 'volume', defaultUnit: 'L', fixedUnit: true },
    { key: 'bagsExact', label: '袋数（計算値）', quantity: 'number' },
    { key: 'bags', label: '必要な袋数', quantity: 'number', primary: true }
  ],

  notes: NOTES.concat(['1袋の出来高は製品によって異なります。袋の表示をご確認ください。'])
};

/* ==================================================================== *
 * estimate.cost 数量 × 単価の概算
 * ==================================================================== */

export const estimateCost = {
  id: 'estimate.cost',
  category: 'estimate',
  title: '材料費の概算',
  subtitle: '数量・単価・ロス率から、概算の金額を計算',
  keywords: ['見積', '積算', '単価', '費用', '金額', '材料費', '予算'],
  shape: null,

  fields: [
    numField('qty', '数量'),
    { key: 'unitPrice', label: '単価', quantity: 'currency', defaultUnit: 'yen', min: 0, exclusiveMin: true, optional: true },
    numField('waste', 'ロス率（%）', '端材・予備の分', true),
    { key: 'subtotal', label: '小計', quantity: 'currency', defaultUnit: 'yen', min: 0, exclusiveMin: true, optional: true },
    numField('taxRate', '消費税率（%）', '内税で計算しない場合の税率', true)
  ],

  solvers: [
    {
      requires: ['qty', 'unitPrice', 'waste', 'taxRate'],
      provides: ['qtyWithWaste', 'subtotal', 'tax', 'total'],
      run(v, ctx) {
        const qtyWithWaste = v.qty * (1 + v.waste / 100);
        const subtotal = qtyWithWaste * v.unitPrice;
        const tax = subtotal * (v.taxRate / 100);
        const total = subtotal + tax;
        return {
          values: { qtyWithWaste, subtotal, tax, total },
          formulaName: '材料費の概算',
          steps: [
            { formula: 'ロス込みの数量 = 数量 × (1 + ロス率)', substituted: `${ctx.f(v.qty)} × ${ctx.f(1 + v.waste / 100)}`, result: ctx.f(qtyWithWaste) },
            { formula: '小計 = ロス込みの数量 × 単価', substituted: `${ctx.f(qtyWithWaste)} × ${ctx.n(v.unitPrice, 'currency')}`, result: ctx.u(subtotal, 'currency') },
            { formula: '税 = 小計 × 税率', substituted: `${ctx.n(subtotal, 'currency')} × ${ctx.f(v.taxRate / 100)}`, result: ctx.u(tax, 'currency') },
            { formula: '合計 = 小計 + 税', substituted: `${ctx.n(subtotal, 'currency')} + ${ctx.n(tax, 'currency')}`, result: ctx.u(total, 'currency') }
          ]
        };
      }
    },
    {
      requires: ['qty', 'unitPrice', 'waste'],
      provides: ['qtyWithWaste', 'subtotal'],
      run(v, ctx) {
        const qtyWithWaste = v.qty * (1 + v.waste / 100);
        const subtotal = qtyWithWaste * v.unitPrice;
        return {
          values: { qtyWithWaste, subtotal },
          formulaName: '材料費の概算',
          steps: [
            { formula: 'ロス込みの数量 = 数量 × (1 + ロス率)', substituted: `${ctx.f(v.qty)} × ${ctx.f(1 + v.waste / 100)}`, result: ctx.f(qtyWithWaste) },
            { formula: '小計 = ロス込みの数量 × 単価', substituted: `${ctx.f(qtyWithWaste)} × ${ctx.n(v.unitPrice, 'currency')}`, result: ctx.u(subtotal, 'currency') }
          ]
        };
      }
    },
    {
      requires: ['subtotal', 'taxRate'],
      provides: ['tax', 'total'],
      run(v, ctx) {
        const tax = v.subtotal * (v.taxRate / 100);
        return {
          values: { tax, total: v.subtotal + tax },
          formulaName: '税込みの金額',
          steps: [
            { formula: '税 = 小計 × 税率', substituted: `${ctx.n(v.subtotal, 'currency')} × ${ctx.f(v.taxRate / 100)}`, result: ctx.u(tax, 'currency') },
            { formula: '合計 = 小計 + 税', substituted: `${ctx.n(v.subtotal, 'currency')} + ${ctx.n(tax, 'currency')}`, result: ctx.u(v.subtotal + tax, 'currency') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'qtyWithWaste', label: 'ロス込みの数量', quantity: 'number' },
    { key: 'subtotal', label: '小計', quantity: 'currency', primary: true },
    { key: 'tax', label: '消費税', quantity: 'currency' },
    { key: 'total', label: '合計', quantity: 'currency', primary: true }
  ],

  notes: NOTES.concat(['単価・税率は入力した値でそのまま計算します。実際の価格や税の扱いは販売店にご確認ください。'])
};

/* ==================================================================== *
 * estimate.trips 運搬回数（積める量から往復数を出す）
 * ==================================================================== */

export const estimateTrips = {
  id: 'estimate.trips',
  category: 'estimate',
  title: '運搬回数（積載量から往復数）',
  subtitle: '運ぶ総量と1回に積める量から、必要な往復回数と所要時間を計算',
  keywords: ['運搬', '往復', '積載', '回数', '軽トラ', '残土', '土のう', '運ぶ', '時間'],

  fields: [
    numField('total', '運ぶ総量', '重さ(kg)でも個数でも、単位をそろえれば同じように使えます'),
    numField('perTrip', '1回に積める量', '同じ単位で入れてください'),
    numField('minutes', '1往復にかかる時間（分）', '積み込み・移動・降ろしの合計', true)
  ],

  solvers: [
    {
      requires: ['total', 'perTrip', 'minutes'],
      provides: ['tripsExact', 'trips', 'lastLoad', 'totalMinutes', 'totalHours'],
      validate(v) {
        if (v.perTrip === 0) return calcError('ZERO', 'perTrip');
        return null;
      },
      run(v, ctx) {
        const tripsExact = v.total / v.perTrip;
        const trips = Math.ceil(tripsExact);
        const lastLoad = v.total - (trips - 1) * v.perTrip;
        const totalMinutes = trips * v.minutes;
        return {
          values: { tripsExact, trips, lastLoad, totalMinutes, totalHours: totalMinutes / 60 },
          formulaName: '運搬回数',
          steps: [
            { formula: '往復回数 = 総量 ÷ 1回の量', substituted: `${ctx.f(v.total)} ÷ ${ctx.f(v.perTrip)}`, result: ctx.f(tripsExact) + ' 回' },
            { formula: '切り上げ', substituted: `${ctx.f(tripsExact)} → 切り上げ`, result: trips + ' 回' },
            { formula: '最後の1回の量 = 総量 − (回数 − 1) × 1回の量', substituted: `${ctx.f(v.total)} − ${trips - 1} × ${ctx.f(v.perTrip)}`, result: ctx.f(lastLoad) },
            { formula: '所要時間 = 回数 × 1往復の時間', substituted: `${trips} × ${ctx.f(v.minutes)} 分`, result: ctx.f(totalMinutes) + ' 分' }
          ]
        };
      }
    },
    {
      requires: ['total', 'perTrip'],
      provides: ['tripsExact', 'trips', 'lastLoad'],
      validate(v) {
        if (v.perTrip === 0) return calcError('ZERO', 'perTrip');
        return null;
      },
      run(v, ctx) {
        const tripsExact = v.total / v.perTrip;
        const trips = Math.ceil(tripsExact);
        const lastLoad = v.total - (trips - 1) * v.perTrip;
        return {
          values: { tripsExact, trips, lastLoad },
          formulaName: '運搬回数',
          steps: [
            { formula: '往復回数 = 総量 ÷ 1回の量', substituted: `${ctx.f(v.total)} ÷ ${ctx.f(v.perTrip)}`, result: ctx.f(tripsExact) + ' 回' },
            { formula: '切り上げ', substituted: `${ctx.f(tripsExact)} → 切り上げ`, result: trips + ' 回' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'trips', label: '必要な往復回数', quantity: 'number', primary: true },
    { key: 'totalHours', label: '所要時間（時間）', quantity: 'number', primary: true },
    { key: 'tripsExact', label: '往復回数（計算値）', quantity: 'number' },
    { key: 'lastLoad', label: '最後の1回の量', quantity: 'number' },
    { key: 'totalMinutes', label: '所要時間（分）', quantity: 'number' }
  ],

  notes: NOTES.concat([
    '車の最大積載量は車検証に記載された値を必ず守ってください。本アプリは積載の可否を判断しません。'
  ])
};

export default [estimateLumber, estimateBoard, estimateScrews, estimateBag, estimateCost, estimateTrips];
