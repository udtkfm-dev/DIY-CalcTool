// tile.js — CALC_SPEC.md「タイル・床材」（Phase 4 第7グループ）
//
// 設計注記: 「必要枚数」は購入判断に使う値のため、他の計算とは異なり
// 意図的に切り上げ（Math.ceil）を式の一部として使う（表示桁数の丸めとは別物。
// 半端な枚数では施工できないという実務上の要求のため。ロス率も同様に切り上げ後に適用する）。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '必要枚数は目地幅を含めた概算です。端部のカット・割付の実際の納まりは現地で確認してください。'
];

const lenField = (key, label, help, extra) =>
  Object.assign({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help }, extra);

export const tileLayout = {
  id: 'tile.layout',
  category: 'tile',
  title: 'タイル・床材の割付',
  subtitle: '全長・タイル寸法・目地幅・ロス率から必要枚数と端部寸法を計算',
  keywords: ['タイル', '割付', '目地幅', '床材', 'フローリング', 'ロス率', '必要枚数'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'tileSize' },

  fields: [
    lenField('total', '全長（張る範囲）'),
    lenField('tileSize', 'タイル1枚の寸法'),
    Object.assign(lenField('joint', '目地幅（任意）'), { exclusiveMin: false }),
    { key: 'waste', label: 'ロス率（任意）', quantity: 'percent', defaultUnit: 'percent', optional: true, help: '端部カットなどの余分を見込む割合' },
    { key: 'count', label: '必要枚数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true },
    lenField('lastPiece', '端部の寸法', '割付の端に残る半端な寸法')
  ],

  solvers: [
    {
      requires: ['total', 'tileSize', 'joint', 'waste'],
      provides: ['count', 'lastPiece'],
      run(v, ctx) {
        const pitch = v.tileSize + v.joint;
        const fullCount = Math.floor(v.total / pitch);
        const lastPiece = v.total - fullCount * pitch;
        const rawCount = lastPiece > 1e-9 ? fullCount + 1 : fullCount;
        const count = Math.ceil(rawCount * (1 + v.waste / 100));
        return {
          values: { count, lastPiece },
          formulaName: 'タイル割付',
          steps: [
            { formula: '1枚分のピッチ = タイル寸法 + 目地幅', substituted: `${ctx.n(v.tileSize, 'length')} + ${ctx.n(v.joint, 'length')}`, result: ctx.u(pitch, 'length') },
            { formula: '端部の寸法 = 全長 − 完全な枚数 × ピッチ', substituted: `${ctx.n(v.total, 'length')} − ${fullCount} × ${ctx.n(pitch, 'length')}`, result: ctx.u(lastPiece, 'length') },
            { formula: '必要枚数 = ⌈基本枚数 × (1 + ロス率 ÷ 100)⌉', substituted: `⌈${ctx.f(rawCount)} × (1 + ${ctx.n(v.waste, 'percent')} ÷ 100)⌉`, result: ctx.f(count) + ' 枚' }
          ]
        };
      }
    },
    {
      requires: ['total', 'tileSize', 'joint'],
      provides: ['count', 'lastPiece'],
      run(v, ctx) {
        const pitch = v.tileSize + v.joint;
        const fullCount = Math.floor(v.total / pitch);
        const lastPiece = v.total - fullCount * pitch;
        const count = lastPiece > 1e-9 ? fullCount + 1 : fullCount;
        return {
          values: { count, lastPiece },
          formulaName: 'タイル割付',
          steps: [
            { formula: '1枚分のピッチ = タイル寸法 + 目地幅', substituted: `${ctx.n(v.tileSize, 'length')} + ${ctx.n(v.joint, 'length')}`, result: ctx.u(pitch, 'length') },
            { formula: '端部の寸法 = 全長 − 完全な枚数 × ピッチ', substituted: `${ctx.n(v.total, 'length')} − ${fullCount} × ${ctx.n(pitch, 'length')}`, result: ctx.u(lastPiece, 'length') },
            { formula: '必要枚数 = 完全な枚数 + 端部の1枚（あれば）', substituted: '', result: ctx.f(count) + ' 枚' }
          ]
        };
      }
    },
    {
      requires: ['total', 'tileSize'],
      provides: ['count', 'lastPiece'],
      run(v, ctx) {
        const fullCount = Math.floor(v.total / v.tileSize);
        const lastPiece = v.total - fullCount * v.tileSize;
        const count = lastPiece > 1e-9 ? fullCount + 1 : fullCount;
        return {
          values: { count, lastPiece },
          formulaName: 'タイル割付',
          steps: [
            { formula: '端部の寸法 = 全長 − 完全な枚数 × タイル寸法', substituted: `${ctx.n(v.total, 'length')} − ${fullCount} × ${ctx.n(v.tileSize, 'length')}`, result: ctx.u(lastPiece, 'length') },
            { formula: '必要枚数 = 完全な枚数 + 端部の1枚（あれば）', substituted: '', result: ctx.f(count) + ' 枚' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全長', quantity: 'length' },
    { key: 'tileSize', label: 'タイル1枚の寸法', quantity: 'length' },
    { key: 'joint', label: '目地幅', quantity: 'length' },
    { key: 'waste', label: 'ロス率', quantity: 'percent' },
    { key: 'count', label: '必要枚数', quantity: 'number', primary: true },
    { key: 'lastPiece', label: '端部の寸法', quantity: 'length', primary: true }
  ],

  notEnoughHint(enteredKeys) {
    const optionalOnly = enteredKeys.every((k) => k === 'joint' || k === 'waste');
    if (enteredKeys.length > 0 && optionalOnly) return '全長とタイル寸法を入力してください（目地幅・ロス率は任意項目です）';
    return null;
  },

  notes: NOTES
};

/* ==================================================================== *
 * tile.grout 目地材の必要量
 * ==================================================================== *
 * 1m²あたりの使用量[kg] = (タイル長 + タイル幅) ÷ (タイル長 × タイル幅)
 *                         × 目地幅 × 目地深さ × 比重
 * （長さの単位はmm。式全体としてmm⁻¹×mm×mm = mm となり、
 *   比重[g/cm³]をかけると kg/m² になる）
 */

export const tileGrout = {
  id: 'tile.grout',
  category: 'tile',
  title: '目地材の必要量',
  subtitle: 'タイルの寸法と目地の幅・深さから、必要な目地材の量を計算',
  keywords: ['目地', '目地材', 'グラウト', 'タイル', '充填', '必要量', 'kg'],
  shape: 'lineSegment',
  shapeMap: { total: 'tileL', pitch: 'jointW' },

  fields: [
    lenField('tileL', 'タイルの長さ'),
    lenField('tileW', 'タイルの幅'),
    lenField('jointW', '目地の幅'),
    lenField('jointD', '目地の深さ', '一般にはタイルの厚さと同じ'),
    { key: 'density', label: '目地材の比重', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '一般的な目地材で 1.6〜1.8 程度' },
    { key: 'area', label: '施工面積', quantity: 'area', defaultUnit: 'm2', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['tileL', 'tileW', 'jointW', 'jointD', 'density', 'area'],
      provides: ['perM2', 'totalKg'],
      validate(v) {
        if (v.tileL === 0 || v.tileW === 0) return calcError('ZERO', 'tileL');
        return null;
      },
      run(v, ctx) {
        const perM2 = ((v.tileL + v.tileW) / (v.tileL * v.tileW)) * v.jointW * v.jointD * v.density;
        const areaM2 = v.area / 1e6;
        const totalKg = perM2 * areaM2;
        return {
          values: { perM2, totalKg },
          formulaName: '目地材の使用量',
          steps: [
            {
              formula: '1m²あたり = (長さ + 幅) ÷ (長さ × 幅) × 目地幅 × 目地深さ × 比重',
              substituted: `(${ctx.n(v.tileL, 'length')} + ${ctx.n(v.tileW, 'length')}) ÷ (${ctx.n(v.tileL, 'length')} × ${ctx.n(v.tileW, 'length')}) × ${ctx.n(v.jointW, 'length')} × ${ctx.n(v.jointD, 'length')} × ${ctx.f(v.density)}`,
              result: ctx.f(perM2) + ' kg/m²'
            },
            { formula: '合計 = 1m²あたり × 施工面積', substituted: `${ctx.f(perM2)} × ${ctx.f(areaM2)}`, result: ctx.u(totalKg, 'weight') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'perM2', label: '1m²あたりの使用量（kg/m²）', quantity: 'number', primary: true },
    { key: 'totalKg', label: '必要な目地材', quantity: 'weight', defaultUnit: 'kg', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat(['施工時のロスや、目地の押さえ具合によって実際の使用量は変わります。製品の表示もあわせてご確認ください。'])
};

/* ==================================================================== *
 * tile.diagonal 45度貼り（斜め貼り）のタイル枚数
 *
 * 斜めに貼ると、四辺すべてに三角形の切り欠きが出る。ロスが増える分を
 * 見込んだ枚数を出す。
 * ==================================================================== */

export const tileDiagonal = {
  id: 'tile.diagonal',
  category: 'tile',
  title: '45度貼り（斜め貼り）の枚数',
  subtitle: '部屋の寸法とタイル寸法から、斜め貼りに必要な枚数とカット数を計算',
  keywords: ['45度貼り', '斜め貼り', 'ダイヤ貼り', 'タイル', '枚数', 'ロス', 'カット', '床'],
  shape: 'rectangle',
  shapeMap: { w: 'roomW', h: 'roomD', S: 'roomArea' },

  fields: [
    lenField('roomW', '部屋の幅'),
    lenField('roomD', '部屋の奥行き'),
    lenField('tileSize', 'タイル1辺の寸法'),
    lenField('joint', '目地幅', '突き付けなら 0', { exclusiveMin: false }),
    { key: 'waste', label: 'ロス率（%）', quantity: 'percent', defaultUnit: 'percent', min: 0, exclusiveMin: false, optional: true, help: '斜め貼りは切り欠きが多いため 15〜20% 程度みておくのが一般的' }
  ],

  solvers: [
    {
      requires: ['roomW', 'roomD', 'tileSize', 'joint', 'waste'],
      provides: ['roomArea', 'tileArea', 'pitch', 'diagPitch', 'baseCount', 'edgeCuts', 'count'],
      validate(v) {
        if (v.tileSize + v.joint === 0) return calcError('ZERO', 'tileSize');
        return null;
      },
      run(v, ctx) {
        const roomArea = v.roomW * v.roomD;
        const pitch = v.tileSize + v.joint;
        const tileArea = pitch * pitch;
        // 斜めでも1枚が覆う面積は変わらないので、面積比で必要枚数を出す
        const baseCount = roomArea / tileArea;
        // 45°では四辺すべてに三角形のカットが出る。対角ピッチで並ぶ列数から見積もる
        const diagPitch = pitch * Math.SQRT2;
        const edgeCuts = Math.ceil((2 * (v.roomW + v.roomD)) / diagPitch);
        const count = Math.ceil(baseCount * (1 + v.waste / 100));
        return {
          values: { roomArea, tileArea, pitch, diagPitch, baseCount, edgeCuts, count },
          formulaName: '45度貼りの枚数',
          steps: [
            { formula: '部屋の面積 = 幅 × 奥行き', substituted: `${ctx.n(v.roomW, 'length')} × ${ctx.n(v.roomD, 'length')}`, result: ctx.u(roomArea, 'area') },
            { formula: '1枚が占める面積 = (タイル + 目地)²', substituted: `(${ctx.n(v.tileSize, 'length')} + ${ctx.n(v.joint, 'length')})²`, result: ctx.u(tileArea, 'area') },
            { formula: '必要枚数 = 部屋の面積 ÷ 1枚の面積', substituted: `${ctx.n(roomArea, 'area')} ÷ ${ctx.n(tileArea, 'area')}`, result: ctx.f(baseCount) + ' 枚' },
            { formula: '対角のピッチ = ピッチ × √2', substituted: `${ctx.n(pitch, 'length')} × 1.414`, result: ctx.u(diagPitch, 'length') },
            { formula: '周囲のカット枚数 ≒ 周長 ÷ 対角ピッチ', substituted: `${ctx.n(2 * (v.roomW + v.roomD), 'length')} ÷ ${ctx.n(diagPitch, 'length')}`, result: edgeCuts + ' 枚' },
            { formula: 'ロス込みの枚数 = 必要枚数 × (1 + ロス率)（切り上げ）', substituted: `${ctx.f(baseCount)} × ${ctx.f(1 + v.waste / 100)}`, result: count + ' 枚' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'count', label: '必要な枚数（ロス込み）', quantity: 'number', primary: true },
    { key: 'edgeCuts', label: '周囲のカット枚数（目安）', quantity: 'number', primary: true },
    { key: 'baseCount', label: 'ロスなしの枚数', quantity: 'number' },
    { key: 'roomArea', label: '部屋の面積', quantity: 'area' },
    { key: 'tileArea', label: 'タイル1枚が占める面積', quantity: 'area' },
    { key: 'pitch', label: 'ピッチ（タイル＋目地）', quantity: 'length' },
    { key: 'diagPitch', label: '対角のピッチ', quantity: 'length' }
  ],

  notes: NOTES.concat([
    '周囲のカット枚数は周長から求めた概算です。基準線をどこに置くかで実際のカット数と端部の寸法は変わります。',
    '斜め貼りは切り欠きが多く出るため、ロス率は通常の貼り方より大きめにみてください。'
  ])
};

export default [tileLayout, tileGrout, tileDiagonal];
