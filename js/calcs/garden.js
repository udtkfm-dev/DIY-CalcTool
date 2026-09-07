// garden.js — 庭・外構（土や砂利の量・ウッドデッキ・レンガ）

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
const numField = (key, label, help, allowZero) => ({
  key, label, quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: !allowZero, optional: true, help
});

/* ==================================================================== *
 * garden.material 土・砂利・芝の必要量
 * ==================================================================== */

const BULK_NOTE =
  '締固め係数の目安: 砂利・砕石を締め固める場合 1.2〜1.3 / 土の埋め戻し 1.1〜1.2 / ' +
  'そのまま敷くだけなら 1.0。袋の容量は製品表示（例: 培養土14L、砂利20kg≒約12L）をご確認ください。';

export const gardenMaterial = {
  id: 'garden.material',
  category: 'garden',
  title: '土・砂利・芝の必要量',
  subtitle: '面積と敷き厚さから、必要な体積と袋数を計算',
  keywords: ['土', '砂利', '砕石', '芝', '培養土', 'バークチップ', '敷く', '花壇', '袋'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'A' },

  fields: [
    lenField('w', '幅'),
    lenField('d', '奥行き'),
    lenField('h', '敷き厚さ', '砂利なら30〜50mm、芝の目土なら5〜10mm程度'),
    numField('bulk', '締固め係数', BULK_NOTE),
    { key: 'perBag', label: '1袋の容量', quantity: 'volume', defaultUnit: 'L', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'h', 'bulk', 'perBag'],
      provides: ['A', 'V_L', 'V_m3', 'bagsExact', 'bags'],
      validate(v) { if (v.perBag === 0) return calcError('ZERO', 'perBag'); return null; },
      run(v, ctx) {
        const A = v.w * v.d;
        const volMm3 = A * v.h * v.bulk;
        const exact = volMm3 / v.perBag;
        const bags = Math.ceil(exact);
        return {
          values: { A, V_L: volMm3, V_m3: volMm3, bagsExact: exact, bags },
          formulaName: '必要量',
          steps: [
            { formula: '面積 = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.u(A, 'area') },
            { formula: '体積 = 面積 × 厚さ × 締固め係数', substituted: `${ctx.n(A, 'area')} × ${ctx.n(v.h, 'length')} × ${ctx.f(v.bulk)}`, result: ctx.u(volMm3, 'volume', 'L') },
            { formula: '袋数 = 体積 ÷ 1袋の容量', substituted: `${ctx.u(volMm3, 'volume', 'L')} ÷ ${ctx.u(v.perBag, 'volume', 'L')}`, result: ctx.f(exact) + ' 袋' },
            { formula: '切り上げ', substituted: `${ctx.f(exact)} → 切り上げ`, result: bags + ' 袋' }
          ]
        };
      }
    },
    {
      requires: ['w', 'd', 'h', 'bulk'],
      provides: ['A', 'V_L', 'V_m3'],
      run(v, ctx) {
        const A = v.w * v.d;
        const volMm3 = A * v.h * v.bulk;
        return {
          values: { A, V_L: volMm3, V_m3: volMm3 },
          formulaName: '必要量',
          steps: [
            { formula: '面積 = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.u(A, 'area') },
            { formula: '体積 = 面積 × 厚さ × 締固め係数', substituted: `${ctx.n(A, 'area')} × ${ctx.n(v.h, 'length')} × ${ctx.f(v.bulk)}`, result: ctx.u(volMm3, 'volume', 'm3') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'A', label: '面積', quantity: 'area' },
    { key: 'V_m3', label: '必要な体積', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true, primary: true },
    { key: 'V_L', label: '必要な体積（L）', quantity: 'volume', defaultUnit: 'L', fixedUnit: true },
    { key: 'bagsExact', label: '袋数（計算値）', quantity: 'number' },
    { key: 'bags', label: '必要な袋数', quantity: 'number', primary: true }
  ],

  notes: NOTES.concat([BULK_NOTE])
};

/* ==================================================================== *
 * garden.deck ウッドデッキの根太・束
 * ==================================================================== */

export const gardenDeck = {
  id: 'garden.deck',
  category: 'garden',
  title: 'ウッドデッキの根太・束',
  subtitle: 'デッキの寸法と間隔から、根太・束の本数と床板の枚数を計算',
  keywords: ['ウッドデッキ', 'デッキ', '根太', 'ねだ', '束', '大引', '床板', 'ピッチ'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'A' },

  fields: [
    lenField('w', 'デッキの幅', '床板を張る方向の長さ'),
    lenField('d', 'デッキの奥行き'),
    lenField('joistPitch', '根太の間隔', 'ソフトウッドで450mm以下、ハードウッドで600mm程度が一般的な目安'),
    lenField('postPitch', '束の間隔', '根太に沿って立てる束柱の間隔'),
    lenField('boardW', '床板1枚の幅'),
    lenField('gap', '床板のすき間', '水はけと伸縮のための目地。3〜5mm程度')
  ],

  solvers: [
    {
      requires: ['w', 'd', 'joistPitch', 'postPitch', 'boardW', 'gap'],
      provides: ['A', 'joists', 'postsPerJoist', 'posts', 'boards'],
      validate(v) {
        if (v.joistPitch === 0 || v.postPitch === 0) return calcError('ZERO', 'joistPitch');
        if (v.boardW + v.gap === 0) return calcError('ZERO', 'boardW');
        return null;
      },
      run(v, ctx) {
        const A = v.w * v.d;
        const joists = Math.floor(v.w / v.joistPitch) + 1;
        const postsPerJoist = Math.floor(v.d / v.postPitch) + 1;
        const posts = joists * postsPerJoist;
        const boards = Math.ceil(v.d / (v.boardW + v.gap));
        return {
          values: { A, joists, postsPerJoist, posts, boards },
          formulaName: 'ウッドデッキの部材',
          steps: [
            { formula: '根太の本数 = デッキ幅 ÷ 根太間隔 + 1（切り捨て）', substituted: `${ctx.n(v.w, 'length')} ÷ ${ctx.n(v.joistPitch, 'length')} + 1`, result: joists + ' 本' },
            { formula: '根太1本あたりの束 = 奥行き ÷ 束間隔 + 1（切り捨て）', substituted: `${ctx.n(v.d, 'length')} ÷ ${ctx.n(v.postPitch, 'length')} + 1`, result: postsPerJoist + ' 本' },
            { formula: '束の合計 = 根太の本数 × 根太1本あたりの束', substituted: `${joists} × ${postsPerJoist}`, result: posts + ' 本' },
            { formula: '床板の枚数 = 奥行き ÷ (床板の幅 + すき間)（切り上げ）', substituted: `${ctx.n(v.d, 'length')} ÷ (${ctx.n(v.boardW, 'length')} + ${ctx.n(v.gap, 'length')})`, result: boards + ' 枚' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'A', label: 'デッキの面積', quantity: 'area' },
    { key: 'joists', label: '根太の本数', quantity: 'number', primary: true },
    { key: 'posts', label: '束の本数', quantity: 'number', primary: true },
    { key: 'postsPerJoist', label: '根太1本あたりの束', quantity: 'number' },
    { key: 'boards', label: '床板の枚数', quantity: 'number' }
  ],

  notes: NOTES.concat(['根太・束の間隔は樹種や床板の厚み、用途で変わります。材料の推奨仕様をご確認ください。'])
};

/* ==================================================================== *
 * garden.brick レンガ・ブロックの必要個数
 * ==================================================================== */

export const gardenBrick = {
  id: 'garden.brick',
  category: 'garden',
  title: 'レンガ・ブロックの必要個数',
  subtitle: '積む長さと段数、目地の厚みから必要な個数を計算',
  keywords: ['レンガ', 'れんが', 'ブロック', '花壇', '積む', '目地', '個数', '花壇レンガ'],
  shape: 'rectangle',
  shapeMap: { w: 'length', h: 'wallHeight' },

  fields: [
    lenField('length', '積む長さ'),
    lenField('brickL', 'レンガ1個の長さ', '普通レンガは210mm'),
    lenField('brickH', 'レンガ1個の高さ', '普通レンガは60mm'),
    lenField('joint', '目地の厚み', '10mm程度が一般的'),
    numField('rows', '段数'),
    lenField('wallHeight', '仕上がりの高さ', '段数の代わりに高さを入れると、必要な段数を計算します'),
    numField('waste', 'ロス率（%）', '割れ・切り欠きの分', true)
  ],

  solvers: [
    {
      requires: ['length', 'brickL', 'brickH', 'joint', 'rows', 'waste'],
      provides: ['perRow', 'wallHeight', 'countExact', 'count'],
      validate(v) { if (v.brickL + v.joint === 0) return calcError('ZERO', 'brickL'); return null; },
      run(v, ctx) {
        const rows = Math.round(v.rows);
        const perRow = Math.ceil(v.length / (v.brickL + v.joint));
        const wallHeight = rows * v.brickH + (rows - 1) * v.joint;
        const exact = perRow * rows * (1 + v.waste / 100);
        const count = Math.ceil(exact);
        return {
          values: { perRow, wallHeight, countExact: exact, count },
          formulaName: 'レンガの必要個数',
          steps: [
            { formula: '1段の個数 = 積む長さ ÷ (レンガの長さ + 目地)（切り上げ）', substituted: `${ctx.n(v.length, 'length')} ÷ (${ctx.n(v.brickL, 'length')} + ${ctx.n(v.joint, 'length')})`, result: perRow + ' 個' },
            { formula: '仕上がりの高さ = 段数 × レンガの高さ + 目地 × (段数 − 1)', substituted: `${rows} × ${ctx.n(v.brickH, 'length')} + ${ctx.n(v.joint, 'length')} × ${rows - 1}`, result: ctx.u(wallHeight, 'length') },
            { formula: '合計 = 1段の個数 × 段数 × (1 + ロス率)', substituted: `${perRow} × ${rows} × ${ctx.f(1 + v.waste / 100)}`, result: ctx.f(exact) + ' 個' },
            { formula: '切り上げ', substituted: `${ctx.f(exact)} → 切り上げ`, result: count + ' 個' }
          ]
        };
      }
    },
    {
      // 仕上がりの高さから必要な段数を逆算する（花壇を「高さ300mmにしたい」から入る使い方）
      requires: ['length', 'brickL', 'brickH', 'joint', 'wallHeight', 'waste'],
      provides: ['perRow', 'rows', 'countExact', 'count'],
      validate(v) {
        if (v.brickL + v.joint === 0) return calcError('ZERO', 'brickL');
        if (v.brickH + v.joint === 0) return calcError('ZERO', 'brickH');
        return null;
      },
      run(v, ctx) {
        const rowsExact = (v.wallHeight + v.joint) / (v.brickH + v.joint);
        const rows = Math.max(1, Math.round(rowsExact));
        const perRow = Math.ceil(v.length / (v.brickL + v.joint));
        const exact = perRow * rows * (1 + v.waste / 100);
        const count = Math.ceil(exact);
        return {
          values: { perRow, rows, countExact: exact, count },
          formulaName: '高さから段数を逆算',
          steps: [
            { formula: '段数 = (仕上がりの高さ + 目地) ÷ (レンガの高さ + 目地)', substituted: `(${ctx.n(v.wallHeight, 'length')} + ${ctx.n(v.joint, 'length')}) ÷ (${ctx.n(v.brickH, 'length')} + ${ctx.n(v.joint, 'length')})`, result: ctx.f(rowsExact) + ' 段' },
            { formula: '四捨五入', substituted: `${ctx.f(rowsExact)} → 四捨五入`, result: rows + ' 段' },
            { formula: '1段の個数 = 積む長さ ÷ (レンガの長さ + 目地)（切り上げ）', substituted: `${ctx.n(v.length, 'length')} ÷ (${ctx.n(v.brickL, 'length')} + ${ctx.n(v.joint, 'length')})`, result: perRow + ' 個' },
            { formula: '合計 = 1段の個数 × 段数 × (1 + ロス率)', substituted: `${perRow} × ${rows} × ${ctx.f(1 + v.waste / 100)}`, result: ctx.f(exact) + ' 個' },
            { formula: '切り上げ', substituted: `${ctx.f(exact)} → 切り上げ`, result: count + ' 個' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'perRow', label: '1段の個数', quantity: 'number' },
    { key: 'rows', label: '段数', quantity: 'number' },
    { key: 'wallHeight', label: '仕上がりの高さ', quantity: 'length', primary: true },
    { key: 'countExact', label: '必要個数（計算値）', quantity: 'number' },
    { key: 'count', label: '必要な個数', quantity: 'number', primary: true }
  ],

  notes: NOTES.concat(['積み方（長手・小口・馬目地など）によって必要な個数は変わります。'])
};

/* ==================================================================== *
 * garden.pond 池・水槽の水量と重さ
 * ==================================================================== */

export const gardenPond = {
  id: 'garden.pond',
  category: 'garden',
  title: '池・水槽の水量と重さ',
  subtitle: '寸法と水深から、水の量（L）と重さ、防水シートの大きさを計算',
  keywords: ['池', '水槽', 'ビオトープ', '水量', 'リットル', '重さ', '防水シート', 'プール', '水深'],
  shape: 'box3d',
  shapeMap: { w: 'w', d: 'd', h: 'depth' },

  fields: [
    lenField('w', '幅'),
    lenField('d', '奥行き'),
    lenField('depth', '水深'),
    Object.assign(lenField('margin', 'シートの余裕', '池のふちで折り返す長さ。200〜300mm程度'), { exclusiveMin: false })
  ],

  solvers: [
    {
      requires: ['w', 'd', 'depth', 'margin'],
      provides: ['V_L', 'V_m3', 'weight', 'sheetW', 'sheetD', 'sheetArea', 'bottomArea'],
      run(v, ctx) {
        const volMm3 = v.w * v.d * v.depth;
        const litre = volMm3 / 1e6;
        const weight = litre; // 水 1L ≒ 1kg
        // 防水シートは 底 + 立ち上がり2面分 + 余裕（ふちの折り返し）
        const sheetW = v.w + 2 * v.depth + 2 * v.margin;
        const sheetD = v.d + 2 * v.depth + 2 * v.margin;
        return {
          values: {
            V_L: volMm3, V_m3: volMm3, weight,
            sheetW, sheetD, sheetArea: sheetW * sheetD, bottomArea: v.w * v.d
          },
          formulaName: '池の水量',
          steps: [
            { formula: '水量 = 幅 × 奥行き × 水深', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.depth, 'length')}`, result: ctx.u(volMm3, 'volume', 'L') },
            { formula: '重さ ≒ 水量(L) × 1kg', substituted: `${ctx.f(litre)} L × 1`, result: ctx.f(weight) + ' kg' },
            { formula: 'シートの幅 = 幅 + 水深 × 2 + 余裕 × 2', substituted: `${ctx.n(v.w, 'length')} + ${ctx.n(v.depth, 'length')} × 2 + ${ctx.n(v.margin, 'length')} × 2`, result: ctx.u(sheetW, 'length') },
            { formula: 'シートの奥行き = 奥行き + 水深 × 2 + 余裕 × 2', substituted: `${ctx.n(v.d, 'length')} + ${ctx.n(v.depth, 'length')} × 2 + ${ctx.n(v.margin, 'length')} × 2`, result: ctx.u(sheetD, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'V_L', label: '水量(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true, primary: true },
    { key: 'weight', label: '水の重さ', quantity: 'weight', defaultUnit: 'kg', primary: true },
    { key: 'V_m3', label: '水量(m³)', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true },
    { key: 'sheetW', label: 'シートの幅', quantity: 'length' },
    { key: 'sheetD', label: 'シートの奥行き', quantity: 'length' },
    { key: 'sheetArea', label: 'シートの面積', quantity: 'area' },
    { key: 'bottomArea', label: '池の底面積', quantity: 'area' }
  ],

  notes: NOTES.concat([
    '水の重さは 1L ≒ 1kg として計算しています。水を入れると床や地面にこの重さがかかります。設置場所が支えられるかは専門家にご確認ください。',
    'シートの寸法は、底面＋立ち上がり＋ふちの折り返しを単純に足したものです。しわの取り方や施工方法によって必要量は変わります。'
  ])
};

export default [gardenMaterial, gardenDeck, gardenBrick, gardenPond];
