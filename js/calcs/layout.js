// layout.js — CALC_SPEC.md「等分・配置」（Phase 4 第2グループ）
//
// 設計注記: CalcDef の outputs は固定キーの数値集合を前提にしており、
// 「各点の位置一覧」のような可変長リストをそのまま outputs として持てない。
// そこで一覧は steps（計算過程。自由形式の文字列）に列挙する方式を採る
// （steps は元々「代入→途中→結果」の文字列を並べる欄なので、点ごとの
// 位置を1行ずつ並べても違和感がない）。点数が多い場合は表示件数に上限を
// 設け、超過分は「…」で省略する（描画コスト・可読性のため）。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const MAX_LIST = 30;

const lenField = (key, label, help, extra) =>
  Object.assign({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help }, extra);
const numField = (key, label, help, extra) =>
  Object.assign({ key, label, quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help }, extra);

/** 位置一覧を steps に積む共通処理（0始まりの累積位置の配列を渡す） */
function pushPositionSteps(steps, ctx, positions, formulaLabel) {
  const n = positions.length;
  const shown = positions.slice(0, MAX_LIST);
  shown.forEach((p, i) => {
    steps.push({ formula: `${formulaLabel} ${i + 1}`, substituted: '', result: ctx.u(p, 'length') });
  });
  if (n > MAX_LIST) {
    steps.push({ formula: '…', substituted: '', result: `他 ${n - MAX_LIST} 点（残り${n - MAX_LIST}件は一覧を省略）` });
  }
}

/* ==================================================================== *
 * layout.divide 線分の等分
 * 全長 total・分割数 n（区間の数）→ 間隔 pitch・各点の累積位置
 * ==================================================================== */

export const layoutDivide = {
  id: 'layout.divide',
  category: 'layout',
  title: '線分の等分',
  subtitle: '全長と分割数から、等間隔の各点の位置を計算',
  keywords: ['等分', '分割', '割付', '目盛り', '木工', 'DIY'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'pitch' },

  fields: [lenField('total', '全長'), numField('n', '分割数', '区間の数（例: 3分割なら3）', { min: 1 }), lenField('pitch', '間隔')],

  solvers: [
    {
      requires: ['total', 'n'],
      provides: ['pitch'],
      run(v, ctx) {
        const nInt = Math.max(1, Math.round(v.n));
        const pitch = v.total / v.n;
        const steps = [{ formula: '間隔 = 全長 ÷ 分割数', substituted: `${ctx.n(v.total, 'length')} ÷ ${ctx.f(v.n)}`, result: ctx.u(pitch, 'length') }];
        const positions = Array.from({ length: nInt + 1 }, (_, i) => i * pitch);
        pushPositionSteps(steps, ctx, positions, '位置');
        return { values: { pitch }, formulaName: '等分', steps };
      }
    },
    {
      requires: ['total', 'pitch'],
      provides: ['n'],
      validate(v) {
        if (v.pitch >= v.total) return calcError('TOO_LARGE', 'pitch', '間隔が全長より大きいため分割できません');
        return null;
      },
      run(v, ctx) {
        const n = v.total / v.pitch;
        return {
          values: { n },
          formulaName: '等分',
          steps: [{ formula: '分割数 = 全長 ÷ 間隔', substituted: `${ctx.n(v.total, 'length')} ÷ ${ctx.n(v.pitch, 'length')}`, result: ctx.f(n) }]
        };
      }
    },
    {
      requires: ['n', 'pitch'],
      provides: ['total'],
      run(v, ctx) {
        const total = v.n * v.pitch;
        return {
          values: { total },
          formulaName: '等分',
          steps: [{ formula: '全長 = 分割数 × 間隔', substituted: `${ctx.f(v.n)} × ${ctx.n(v.pitch, 'length')}`, result: ctx.u(total, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全長', quantity: 'length' },
    { key: 'n', label: '分割数', quantity: 'number' },
    { key: 'pitch', label: '間隔', quantity: 'length', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * layout.pitch 指定間隔→個数／指定個数→間隔
 * ==================================================================== */

export const layoutPitch = {
  id: 'layout.pitch',
  category: 'layout',
  title: 'ピッチ配置（間隔・個数）',
  subtitle: '全長・間隔・個数のうち2つから残り1つを計算',
  keywords: ['ピッチ', '間隔', '個数', '配置', '木工', 'DIY', '穴', 'ビス'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'pitch' },

  fields: [lenField('total', '全長'), lenField('pitch', '間隔'), numField('count', '個数', '配置する点の数（両端含む）', { min: 1 })],

  solvers: [
    {
      requires: ['total', 'pitch'],
      provides: ['count'],
      run(v, ctx) {
        const count = v.total / v.pitch + 1;
        return {
          values: { count },
          formulaName: 'ピッチ配置',
          steps: [{ formula: '個数 = 全長 ÷ 間隔 + 1', substituted: `${ctx.n(v.total, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: ctx.f(count) }]
        };
      }
    },
    {
      requires: ['total', 'count'],
      provides: ['pitch'],
      validate(v) {
        if (v.count <= 1) return calcError('ZERO', 'count', '個数は2以上にしてください');
        return null;
      },
      run(v, ctx) {
        const pitch = v.total / (v.count - 1);
        return {
          values: { pitch },
          formulaName: 'ピッチ配置',
          steps: [{ formula: '間隔 = 全長 ÷ (個数 − 1)', substituted: `${ctx.n(v.total, 'length')} ÷ (${ctx.f(v.count)} − 1)`, result: ctx.u(pitch, 'length') }]
        };
      }
    },
    {
      requires: ['pitch', 'count'],
      provides: ['total'],
      run(v, ctx) {
        const total = v.pitch * (v.count - 1);
        return {
          values: { total },
          formulaName: 'ピッチ配置',
          steps: [{ formula: '全長 = 間隔 × (個数 − 1)', substituted: `${ctx.n(v.pitch, 'length')} × (${ctx.f(v.count)} − 1)`, result: ctx.u(total, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全長', quantity: 'length' },
    { key: 'pitch', label: '間隔', quantity: 'length' },
    { key: 'count', label: '個数', quantity: 'number', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * layout.center 中央配置・左右均等
 * ==================================================================== */

export const layoutCenter = {
  id: 'layout.center',
  category: 'layout',
  title: '中央配置・左右均等',
  subtitle: '全幅と対象の幅から、左右の余白を計算',
  keywords: ['中央配置', '芯出し', '左右均等', '木工', 'DIY', '棚', '飾り'],
  shape: 'centerLine',

  fields: [lenField('total', '全幅'), lenField('obj', '対象の幅'), lenField('margin', '左右の余白')],

  solvers: [
    {
      requires: ['total', 'obj'],
      provides: ['margin'],
      validate(v) {
        if (v.obj > v.total) return calcError('TOO_LARGE', 'obj', '対象の幅が全体より大きいため中央配置できません');
        return null;
      },
      run(v, ctx) {
        const margin = (v.total - v.obj) / 2;
        return {
          values: { margin },
          formulaName: '中央配置',
          steps: [{ formula: '余白 = (全幅 − 対象幅) ÷ 2', substituted: `(${ctx.n(v.total, 'length')} − ${ctx.n(v.obj, 'length')}) ÷ 2`, result: ctx.u(margin, 'length') }]
        };
      }
    },
    {
      requires: ['total', 'margin'],
      provides: ['obj'],
      run(v, ctx) {
        const obj = v.total - v.margin * 2;
        return {
          values: { obj },
          formulaName: '中央配置',
          steps: [{ formula: '対象幅 = 全幅 − 余白×2', substituted: `${ctx.n(v.total, 'length')} − ${ctx.n(v.margin, 'length')}×2`, result: ctx.u(obj, 'length') }]
        };
      }
    },
    {
      requires: ['obj', 'margin'],
      provides: ['total'],
      run(v, ctx) {
        const total = v.obj + v.margin * 2;
        return {
          values: { total },
          formulaName: '中央配置',
          steps: [{ formula: '全幅 = 対象幅 + 余白×2', substituted: `${ctx.n(v.obj, 'length')} + ${ctx.n(v.margin, 'length')}×2`, result: ctx.u(total, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全幅', quantity: 'length' },
    { key: 'obj', label: '対象の幅', quantity: 'length' },
    { key: 'margin', label: '左右の余白', quantity: 'length', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * layout.holes 穴の等間隔配置（端部余白あり／なし両対応）
 * ==================================================================== */

export const layoutHoles = {
  id: 'layout.holes',
  category: 'layout',
  title: '穴の等間隔配置',
  subtitle: '全長・穴数（・端部余白）から、各穴の位置を計算',
  keywords: ['穴あけ', '等間隔', 'ビス', '棚受け', '木工', 'DIY'],
  shape: 'lineSegment',
  shapeMap: { total: 'total', pitch: 'pitch', edge: 'edge' },

  fields: [lenField('total', '全長'), numField('n', '穴数', '空ける穴の数', { min: 2 }), lenField('edge', '端部の余白（任意）', '端に余白を残す場合の余白幅。空欄なら端から端まで等間隔')],

  solvers: [
    {
      // 端部余白あり: 最初と最後の穴が edge の位置にくる
      requires: ['total', 'n', 'edge'],
      provides: ['pitch'],
      validate(v) {
        if (v.edge * 2 >= v.total) return calcError('TOO_LARGE', 'edge', '端部の余白が大きすぎます');
        return null;
      },
      run(v, ctx) {
        const nInt = Math.max(2, Math.round(v.n));
        const pitch = (v.total - v.edge * 2) / (nInt - 1);
        const steps = [{ formula: '間隔 = (全長 − 端部余白×2) ÷ (穴数 − 1)', substituted: `(${ctx.n(v.total, 'length')} − ${ctx.n(v.edge, 'length')}×2) ÷ (${nInt} − 1)`, result: ctx.u(pitch, 'length') }];
        const positions = Array.from({ length: nInt }, (_, i) => v.edge + i * pitch);
        pushPositionSteps(steps, ctx, positions, '穴');
        return { values: { pitch }, formulaName: '穴の等間隔配置（端部余白あり）', steps };
      }
    },
    {
      // 端部余白なし: 最初と最後の穴が端そのものにくる
      requires: ['total', 'n'],
      provides: ['pitch'],
      run(v, ctx) {
        const nInt = Math.max(2, Math.round(v.n));
        const pitch = v.total / (nInt - 1);
        const steps = [{ formula: '間隔 = 全長 ÷ (穴数 − 1)', substituted: `${ctx.n(v.total, 'length')} ÷ (${nInt} − 1)`, result: ctx.u(pitch, 'length') }];
        const positions = Array.from({ length: nInt }, (_, i) => i * pitch);
        pushPositionSteps(steps, ctx, positions, '穴');
        return { values: { pitch }, formulaName: '穴の等間隔配置（端部余白なし）', steps };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全長', quantity: 'length' },
    { key: 'n', label: '穴数', quantity: 'number' },
    { key: 'edge', label: '端部の余白', quantity: 'length' },
    { key: 'pitch', label: '穴の間隔', quantity: 'length', primary: true }
  ],

  notes: NOTES,

  notEnoughHint(enteredKeys) {
    if (enteredKeys.length === 1 && enteredKeys[0] === 'edge') return '全長と穴数を入力してください（端部余白は任意項目です）';
    return null;
  }
};

/* ==================================================================== *
 * layout.circleDivide 円周の等分
 * ==================================================================== */

export const layoutCircleDivide = {
  id: 'layout.circleDivide',
  category: 'layout',
  title: '円周の等分',
  subtitle: '半径と分割数から、弦の長さ・中心角・各点の座標を計算',
  keywords: ['円周', '等分割', '円形', '木工', 'DIY', 'ボルト', '穴配置'],
  shape: 'circle',
  shapeMap: { r: 'r' },

  fields: [lenField('r', '半径'), numField('n', '分割数', '円周を何等分するか', { min: 2 })],

  solvers: [
    {
      requires: ['r', 'n'],
      provides: ['chord', 'centralAngle'],
      run(v, ctx) {
        const nInt = Math.max(2, Math.round(v.n));
        const centralAngle = 360 / nInt;
        const chord = 2 * v.r * Math.sin((Math.PI * centralAngle) / 360);
        const steps = [
          { formula: '中心角 = 360° ÷ 分割数', substituted: `360° ÷ ${nInt}`, result: ctx.u(centralAngle, 'angle') },
          { formula: '弦の長さ = 2 × 半径 × sin(中心角 ÷ 2)', substituted: `2 × ${ctx.n(v.r, 'length')} × sin(${ctx.f(centralAngle / 2)}°)`, result: ctx.u(chord, 'length') }
        ];
        const shown = Math.min(nInt, MAX_LIST);
        for (let i = 0; i < shown; i++) {
          const rad = (i * centralAngle * Math.PI) / 180;
          const x = v.r * Math.cos(rad);
          const y = v.r * Math.sin(rad);
          steps.push({ formula: `点${i + 1}（中心角${ctx.f(i * centralAngle)}°）`, substituted: '', result: `x=${ctx.u(x, 'length')}, y=${ctx.u(y, 'length')}` });
        }
        if (nInt > MAX_LIST) steps.push({ formula: '…', substituted: '', result: `他 ${nInt - MAX_LIST} 点（残りは省略）` });
        return { values: { chord, centralAngle }, formulaName: '円周の等分', steps };
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'n', label: '分割数', quantity: 'number' },
    { key: 'chord', label: '弦の長さ', quantity: 'length', primary: true },
    { key: 'centralAngle', label: '中心角', quantity: 'angle', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * layout.grid 格子状の割付（縦横のピッチから本数と交点）
 * ==================================================================== */

export const layoutGrid = {
  id: 'layout.grid',
  category: 'layout',
  title: '格子状の割付',
  subtitle: '縦横のピッチから、通り芯の本数と交点の数を計算',
  keywords: ['格子', 'グリッド', '通り芯', '割付', '束石', '基礎', 'ピッチ', '交点'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'area' },

  fields: [
    lenField('w', '範囲の幅'),
    lenField('d', '範囲の奥行き'),
    lenField('pitchX', '横方向のピッチ'),
    lenField('pitchY', '縦方向のピッチ')
  ],

  solvers: [
    {
      requires: ['w', 'd', 'pitchX', 'pitchY'],
      provides: ['area', 'nx', 'ny', 'points', 'restX', 'restY'],
      validate(v) {
        if (v.pitchX === 0) return calcError('ZERO', 'pitchX');
        if (v.pitchY === 0) return calcError('ZERO', 'pitchY');
        return null;
      },
      run(v, ctx) {
        const nx = Math.floor(v.w / v.pitchX) + 1;
        const ny = Math.floor(v.d / v.pitchY) + 1;
        const restX = v.w - v.pitchX * (nx - 1);
        const restY = v.d - v.pitchY * (ny - 1);
        const steps = [
          { formula: '横方向の本数 = 幅 ÷ 横ピッチ + 1（切り捨て）', substituted: `${ctx.n(v.w, 'length')} ÷ ${ctx.n(v.pitchX, 'length')} + 1`, result: nx + ' 本' },
          { formula: '縦方向の本数 = 奥行き ÷ 縦ピッチ + 1（切り捨て）', substituted: `${ctx.n(v.d, 'length')} ÷ ${ctx.n(v.pitchY, 'length')} + 1`, result: ny + ' 本' },
          { formula: '交点の数 = 横 × 縦', substituted: `${nx} × ${ny}`, result: nx * ny + ' 点' },
          { formula: '横の余り', substituted: `${ctx.n(v.w, 'length')} − ${ctx.n(v.pitchX, 'length')} × ${nx - 1}`, result: ctx.u(restX, 'length') },
          { formula: '縦の余り', substituted: `${ctx.n(v.d, 'length')} − ${ctx.n(v.pitchY, 'length')} × ${ny - 1}`, result: ctx.u(restY, 'length') }
        ];
        // 交点の座標一覧（多い場合は上限で省略する。layout.js 冒頭の設計注記と同じ方針）
        const limit = 30;
        let count = 0;
        for (let iy = 0; iy < ny && count < limit; iy++) {
          for (let ix = 0; ix < nx && count < limit; ix++) {
            steps.push({
              formula: `交点 (${ix + 1}, ${iy + 1})`,
              substituted: `X = ${ctx.n(v.pitchX, 'length')} × ${ix} / Y = ${ctx.n(v.pitchY, 'length')} × ${iy}`,
              result: `(${ctx.n(v.pitchX * ix, 'length')}, ${ctx.n(v.pitchY * iy, 'length')})`
            });
            count++;
          }
        }
        if (nx * ny > limit) steps.push({ formula: '…', substituted: `残り ${nx * ny - limit} 点は省略`, result: '' });
        return { values: { area: v.w * v.d, nx, ny, points: nx * ny, restX, restY }, formulaName: '格子の割付', steps };
      }
    }
  ],

  outputs: [
    { key: 'area', label: '範囲の面積', quantity: 'area' },
    { key: 'nx', label: '横方向の本数', quantity: 'number', primary: true },
    { key: 'ny', label: '縦方向の本数', quantity: 'number', primary: true },
    { key: 'points', label: '交点の数', quantity: 'number' },
    { key: 'restX', label: '横の余り', quantity: 'length' },
    { key: 'restY', label: '縦の余り', quantity: 'length' }
  ],

  notes: NOTES
};

export default [layoutDivide, layoutPitch, layoutCenter, layoutHoles, layoutCircleDivide, layoutGrid];
