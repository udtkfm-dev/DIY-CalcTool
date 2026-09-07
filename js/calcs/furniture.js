// furniture.js — 家具・木工の詳細（棚板のたわみ・ダボ位置・丁番位置・引き出し）
//
// 設計注記: furniture.shelf は struct.beamUdl と同じ理論式（両端支持・等分布荷重）だが、
// 入口・入力の与え方が違う。棚板は「断面二次モーメント」ではなく「板の幅と厚み」で
// 考えるほうが自然なので、内部で I = 幅 × 厚さ³ ÷ 12 を計算してから式に入れる。
// CALC_SPEC.md が別IDを予約している wood.diagonal / area.rect の関係と同じ考え方で、
// 意図的に重複する入口として持つ。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や強度に関わる判断は、必ず専門家にご確認ください。ここでは公式にもとづく数値の算出のみを行います。'
];

const E_NOTE =
  'ヤング係数の目安: スギ 7,000 / ヒノキ 9,000 / パイン集成材 8,000 / ラワン合板 6,000 / ' +
  'MDF 3,000 / ランバーコア 6,000（単位はいずれも N/mm²）';

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
const numField = (key, label, help) => ({
  key, label, quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help
});

/* ==================================================================== *
 * furniture.shelf 棚板のたわみ
 * ==================================================================== */

export const furnitureShelf = {
  id: 'furniture.shelf',
  category: 'furniture',
  title: '棚板のたわみ',
  subtitle: '板の寸法と載せる重さから、中央のたわみ量を計算',
  keywords: ['棚', '棚板', 'たわみ', 'しなり', '本棚', '耐荷重', '集成材', '板厚'],
  shape: 'beamUdl',
  shapeMap: { L: 'span', W: 'load' },

  fields: [
    lenField('span', '棚の支点間距離', '棚受けから棚受けまでの距離'),
    lenField('width', '板の幅', '棚板の奥行き寸法'),
    lenField('thick', '板の厚さ'),
    { key: 'load', label: '載せる重さ', quantity: 'weight', defaultUnit: 'kg', min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help: '棚全体に均等に載る重さ' },
    { key: 'E', label: 'ヤング係数', quantity: 'stress', defaultUnit: 'Nmm2', min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help: E_NOTE },
    lenField('defl', 'たわみ量')
  ],

  solvers: [
    {
      requires: ['span', 'width', 'thick', 'load', 'E'],
      provides: ['I', 'defl', 'ratio'],
      validate(v) {
        if (v.E === 0) return calcError('ZERO', 'E');
        if (v.thick === 0) return calcError('ZERO', 'thick');
        return null;
      },
      run(v, ctx) {
        const I = (v.width * Math.pow(v.thick, 3)) / 12;
        const W = v.load * 9.80665; // kg → N
        const defl = (5 * W * Math.pow(v.span, 3)) / (384 * v.E * I);
        const ratio = v.span / defl;
        return {
          values: { I, defl, ratio },
          formulaName: '棚板のたわみ（両端支持・等分布荷重）',
          steps: [
            { formula: '断面二次モーメント I = 幅 × 厚さ³ ÷ 12', substituted: `${ctx.n(v.width, 'length')} × ${ctx.n(v.thick, 'length')}³ ÷ 12`, result: ctx.u(I, 'inertia') },
            { formula: '荷重[N] = 重さ[kg] × 9.80665', substituted: `${ctx.f(v.load)} × 9.80665`, result: ctx.f(W) + ' N' },
            { formula: 'たわみ δ = 5 × W × L³ ÷ (384 × E × I)', substituted: `5 × ${ctx.f(W)} × ${ctx.n(v.span, 'length')}³ ÷ (384 × ${ctx.f(v.E)} × ${ctx.n(I, 'inertia')})`, result: ctx.u(defl, 'length') },
            { formula: 'スパン ÷ たわみ', substituted: `${ctx.n(v.span, 'length')} ÷ ${ctx.n(defl, 'length')}`, result: '1/' + ctx.f(ratio) }
          ]
        };
      }
    },
    {
      // 許容したわみから必要な板厚を求める
      requires: ['span', 'width', 'load', 'E', 'defl'],
      provides: ['thick', 'I', 'ratio'],
      validate(v) {
        if (v.E === 0) return calcError('ZERO', 'E');
        if (v.defl === 0) return calcError('ZERO', 'defl');
        return null;
      },
      run(v, ctx) {
        const W = v.load * 9.80665;
        const I = (5 * W * Math.pow(v.span, 3)) / (384 * v.E * v.defl);
        const thick = Math.cbrt((12 * I) / v.width);
        return {
          values: { thick, I, ratio: v.span / v.defl },
          formulaName: '必要な板厚',
          steps: [
            { formula: '必要な I = 5 × W × L³ ÷ (384 × E × δ)', substituted: `5 × ${ctx.f(W)} × ${ctx.n(v.span, 'length')}³ ÷ (384 × ${ctx.f(v.E)} × ${ctx.n(v.defl, 'length')})`, result: ctx.u(I, 'inertia') },
            { formula: '厚さ = ∛(12 × I ÷ 幅)', substituted: `∛(12 × ${ctx.n(I, 'inertia')} ÷ ${ctx.n(v.width, 'length')})`, result: ctx.u(thick, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'thick', label: '板の厚さ', quantity: 'length', primary: true },
    { key: 'I', label: '断面二次モーメント', quantity: 'inertia' },
    { key: 'defl', label: 'たわみ量', quantity: 'length', primary: true },
    { key: 'ratio', label: 'スパン÷たわみ', quantity: 'number', help: 'たわみがスパンの何分の1かを表す値。家具では 1/300 程度を目安にすることが多い' }
  ],

  notes: NOTES.concat([
    E_NOTE,
    '計算値は理論上のたわみです。木材は時間が経つとたわみが増える（クリープ）ため、長期間ものを載せる棚では余裕をみることが一般的です。'
  ])
};

/* ==================================================================== *
 * furniture.dowel ダボ・ほぞの位置
 * ==================================================================== */

export const furnitureDowel = {
  id: 'furniture.dowel',
  category: 'furniture',
  title: 'ダボ・ほぞの位置',
  subtitle: '板幅と本数から、端部余白と等間隔の位置を計算',
  keywords: ['ダボ', 'だぼ', 'ほぞ', '接合', '位置', '割付', '木工', 'ビスケット'],
  shape: 'lineSegment',
  shapeMap: { total: 'width', pitch: 'pitch', edge: 'edge' },

  fields: [
    lenField('width', '板の幅'),
    numField('n', 'ダボの本数'),
    lenField('edge', '端からの距離', '一般には板幅の1/6〜1/8、または板厚の2倍程度'),
    lenField('pitch', 'ダボどうしの間隔')
  ],

  solvers: [
    {
      requires: ['width', 'n', 'edge'],
      provides: ['pitch'],
      validate(v) {
        if (v.n < 2) return calcError('ZERO', 'n');
        if (v.width - v.edge * 2 <= 0) return calcError('NEGATIVE', 'edge');
        return null;
      },
      run(v, ctx) {
        const n = Math.round(v.n);
        const span = v.width - v.edge * 2;
        const pitch = span / (n - 1);
        const steps = [
          { formula: '端を除いた長さ = 板幅 − 端からの距離 × 2', substituted: `${ctx.n(v.width, 'length')} − ${ctx.n(v.edge, 'length')} × 2`, result: ctx.u(span, 'length') },
          { formula: '間隔 = 端を除いた長さ ÷ (本数 − 1)', substituted: `${ctx.n(span, 'length')} ÷ ${n - 1}`, result: ctx.u(pitch, 'length') }
        ];
        const limit = Math.min(n, 30);
        for (let i = 0; i < limit; i++) {
          steps.push({ formula: `${i + 1}本目の位置`, substituted: `${ctx.n(v.edge, 'length')} + ${ctx.n(pitch, 'length')} × ${i}`, result: ctx.u(v.edge + pitch * i, 'length') });
        }
        if (n > limit) steps.push({ formula: '…', substituted: `残り ${n - limit} 本は省略`, result: '' });
        return { values: { pitch }, formulaName: 'ダボの割付', steps };
      }
    },
    {
      requires: ['width', 'pitch', 'edge'],
      provides: ['n'],
      validate(v) { if (v.pitch === 0) return calcError('ZERO', 'pitch'); return null; },
      run(v, ctx) {
        const span = v.width - v.edge * 2;
        const n = Math.floor(span / v.pitch) + 1;
        return {
          values: { n },
          formulaName: '本数',
          steps: [{ formula: '本数 = (板幅 − 端 × 2) ÷ 間隔 + 1（切り捨て）', substituted: `${ctx.n(span, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: n + ' 本' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'width', label: '板の幅', quantity: 'length' },
    { key: 'n', label: 'ダボの本数', quantity: 'number', primary: true },
    { key: 'pitch', label: 'ダボどうしの間隔', quantity: 'length', primary: true },
    { key: 'edge', label: '端からの距離', quantity: 'length' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * furniture.hinge 丁番の取付位置
 * ==================================================================== */

export const furnitureHinge = {
  id: 'furniture.hinge',
  category: 'furniture',
  title: '丁番の取付位置',
  subtitle: '扉の高さと丁番の数から、取り付ける位置を計算',
  keywords: ['丁番', 'ちょうばん', 'ヒンジ', '扉', 'とびら', '位置', 'キャビネット'],
  shape: 'lineSegment',
  shapeMap: { total: 'height', pitch: 'pitch', edge: 'edge' },

  fields: [
    lenField('height', '扉の高さ'),
    numField('n', '丁番の数', '高さ900mmまで2個、1600mmまで3個が一般的な目安'),
    lenField('edge', '上下端からの距離', '扉の端から丁番の中心まで。100mm前後が一般的'),
    lenField('pitch', '丁番どうしの間隔')
  ],

  solvers: [
    {
      requires: ['height', 'n', 'edge'],
      provides: ['pitch'],
      validate(v) {
        if (v.n < 2) return calcError('ZERO', 'n');
        if (v.height - v.edge * 2 <= 0) return calcError('NEGATIVE', 'edge');
        return null;
      },
      run(v, ctx) {
        const n = Math.round(v.n);
        const span = v.height - v.edge * 2;
        const pitch = span / (n - 1);
        const steps = [
          { formula: '上下端を除いた長さ = 扉の高さ − 端からの距離 × 2', substituted: `${ctx.n(v.height, 'length')} − ${ctx.n(v.edge, 'length')} × 2`, result: ctx.u(span, 'length') },
          { formula: '間隔 = 上下端を除いた長さ ÷ (個数 − 1)', substituted: `${ctx.n(span, 'length')} ÷ ${n - 1}`, result: ctx.u(pitch, 'length') }
        ];
        for (let i = 0; i < Math.min(n, 20); i++) {
          steps.push({ formula: `${i + 1}個目の位置（上端から）`, substituted: `${ctx.n(v.edge, 'length')} + ${ctx.n(pitch, 'length')} × ${i}`, result: ctx.u(v.edge + pitch * i, 'length') });
        }
        return { values: { pitch }, formulaName: '丁番の割付', steps };
      }
    }
  ],

  outputs: [
    { key: 'height', label: '扉の高さ', quantity: 'length' },
    { key: 'n', label: '丁番の数', quantity: 'number' },
    { key: 'pitch', label: '丁番どうしの間隔', quantity: 'length', primary: true },
    { key: 'edge', label: '端からの距離', quantity: 'length' }
  ],

  notes: NOTES.concat(['扉の重さや材質によって必要な丁番の数は変わります。製品の推奨仕様をご確認ください。'])
};

/* ==================================================================== *
 * furniture.drawer 引き出しの寸法
 * ==================================================================== */

export const furnitureDrawer = {
  id: 'furniture.drawer',
  category: 'furniture',
  title: '引き出しの寸法',
  subtitle: '開口とスライドレールの厚みから、引き出し箱の寸法を計算',
  keywords: ['引き出し', 'ひきだし', 'スライドレール', 'クリアランス', '内寸', '箱'],
  shape: 'rectangle',
  // 図は「測って入力する側」＝開口を描く。箱の外寸は結果カードに出す
  // （箱の外寸を図に描くと、すべてのラベルが入力できない結果ラベルになってしまう）
  shapeMap: { w: 'openW', h: 'openH' },

  fields: [
    lenField('openW', '開口の内寸（幅）'),
    lenField('openH', '開口の内寸（高さ）'),
    lenField('rail', 'レール1本分の厚み', '一般的なスライドレールは片側 12.5mm'),
    lenField('gapH', '上下のすき間の合計', '引き出しが当たらないための余裕。10〜13mm程度'),
    lenField('depth', '開口の奥行き'),
    lenField('backGap', '奥のすき間', 'レールの取り付け代。0〜10mm程度')
  ],

  solvers: [
    {
      requires: ['openW', 'openH', 'rail', 'gapH', 'depth', 'backGap'],
      provides: ['boxW', 'boxH', 'boxD'],
      run(v, ctx) {
        const boxW = v.openW - v.rail * 2;
        const boxH = v.openH - v.gapH;
        const boxD = v.depth - v.backGap;
        return {
          values: { boxW, boxH, boxD },
          formulaName: '引き出し箱の外寸',
          steps: [
            { formula: '箱の幅 = 開口の幅 − レール厚 × 2', substituted: `${ctx.n(v.openW, 'length')} − ${ctx.n(v.rail, 'length')} × 2`, result: ctx.u(boxW, 'length') },
            { formula: '箱の高さ = 開口の高さ − 上下のすき間', substituted: `${ctx.n(v.openH, 'length')} − ${ctx.n(v.gapH, 'length')}`, result: ctx.u(boxH, 'length') },
            { formula: '箱の奥行き = 開口の奥行き − 奥のすき間', substituted: `${ctx.n(v.depth, 'length')} − ${ctx.n(v.backGap, 'length')}`, result: ctx.u(boxD, 'length') }
          ]
        };
      }
    },
    {
      requires: ['openW', 'rail'],
      provides: ['boxW'],
      run(v, ctx) {
        const boxW = v.openW - v.rail * 2;
        return {
          values: { boxW },
          formulaName: '引き出し箱の幅',
          steps: [{ formula: '箱の幅 = 開口の幅 − レール厚 × 2', substituted: `${ctx.n(v.openW, 'length')} − ${ctx.n(v.rail, 'length')} × 2`, result: ctx.u(boxW, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'boxW', label: '箱の幅', quantity: 'length', primary: true },
    { key: 'boxH', label: '箱の高さ', quantity: 'length', primary: true },
    { key: 'boxD', label: '箱の奥行き', quantity: 'length' }
  ],

  notes: NOTES.concat(['必要なすき間はレールの製品ごとに決まっています。取扱説明書の指定寸法をご確認ください。'])
};

export default [furnitureShelf, furnitureDowel, furnitureHinge, furnitureDrawer];
