// solid.js — 立体・3D（3次元の寸法・表面積・展開）
//
// 「体積」カテゴリが容量を求めるのに対し、こちらは3次元の長さ（空間対角線・3次元の
// 2点間距離）と、面（表面積）・展開図を扱う。
// 例: 箱に入る最長の材／塗る面積／円錐を板から作るときの扇形。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const DEG = 180 / Math.PI;

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
// 座標は負の値を取りうるので min を付けない（9-5-4 の規約）
const coordField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', optional: true, help
});
const areaOut = (key, label) => ({ key, label, quantity: 'area' });

/* ==================================================================== *
 * solid.diagonal 直方体の対角線（3次元の三平方）
 * ==================================================================== */

export const solidDiagonal = {
  id: 'solid.diagonal',
  category: 'solid',
  title: '直方体の対角線（3次元）',
  subtitle: '箱の内寸から、中に入る最長の直線（角から角）を計算',
  keywords: ['対角線', '3次元', '三平方', '箱', '入るか', '積載', '最長', '斜め', '立体'],
  shape: 'box3d',

  fields: [lenField('w', '幅'), lenField('d', '奥行'), lenField('h', '高さ'), lenField('diag', '空間対角線')],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['diag', 'faceWD', 'faceWH', 'faceDH'],
      run(v, ctx) {
        const faceWD = Math.hypot(v.w, v.d);
        const faceWH = Math.hypot(v.w, v.h);
        const faceDH = Math.hypot(v.d, v.h);
        const diag = Math.hypot(faceWD, v.h);
        return {
          values: { diag, faceWD, faceWH, faceDH },
          formulaName: '3次元の三平方の定理',
          steps: [
            { formula: '底面の対角線 = √(幅² + 奥行²)', substituted: `√(${ctx.n(v.w, 'length')}² + ${ctx.n(v.d, 'length')}²)`, result: ctx.u(faceWD, 'length') },
            { formula: '空間対角線 = √(幅² + 奥行² + 高さ²)', substituted: `√(${ctx.n(v.w, 'length')}² + ${ctx.n(v.d, 'length')}² + ${ctx.n(v.h, 'length')}²)`, result: ctx.u(diag, 'length') }
          ]
        };
      }
    },
    {
      requires: ['diag', 'w', 'd'],
      provides: ['h', 'faceWD'],
      validate(v) {
        const base = v.w * v.w + v.d * v.d;
        if (v.diag * v.diag <= base) return calcError('RIGHT_HYP', 'diag');
        return null;
      },
      run(v, ctx) {
        const faceWD = Math.hypot(v.w, v.d);
        const h = Math.sqrt(v.diag * v.diag - faceWD * faceWD);
        return {
          values: { h, faceWD },
          formulaName: '3次元の三平方の定理',
          steps: [{ formula: '高さ = √(対角線² − 幅² − 奥行²)', substituted: `√(${ctx.n(v.diag, 'length')}² − ${ctx.n(v.w, 'length')}² − ${ctx.n(v.d, 'length')}²)`, result: ctx.u(h, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'diag', label: '空間対角線', quantity: 'length', primary: true },
    { key: 'faceWD', label: '底面の対角線', quantity: 'length' },
    { key: 'faceWH', label: '正面の対角線', quantity: 'length' },
    { key: 'faceDH', label: '側面の対角線', quantity: 'length' }
  ],

  notes: NOTES.concat([
    '空間対角線は「角から角までまっすぐ通したとき」の長さです。実際に入れられるかは、材の太さや開口部の大きさでも変わります。'
  ])
};

/* ==================================================================== *
 * solid.distance3d 3次元の2点間距離
 * ==================================================================== */

export const solidDistance3d = {
  id: 'solid.distance3d',
  category: 'solid',
  title: '2点間の距離（3次元）',
  subtitle: 'X・Y・Z の座標2点から、直線距離・水平距離・高低差・仰角を計算',
  keywords: ['2点間', '距離', '3次元', '座標', 'xyz', '立体', '高低差', '仰角', '斜め'],

  shape: 'twoPoints',
  shapeMap: { x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2' },
  fields: [
    coordField('x1', '点1 の X'),
    coordField('y1', '点1 の Y'),
    coordField('z1', '点1 の Z', '高さ方向'),
    coordField('x2', '点2 の X'),
    coordField('y2', '点2 の Y'),
    coordField('z2', '点2 の Z', '高さ方向')
  ],

  solvers: [
    {
      requires: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'],
      provides: ['dx', 'dy', 'dz', 'planar', 'dist', 'elev'],
      run(v, ctx) {
        const dx = v.x2 - v.x1;
        const dy = v.y2 - v.y1;
        const dz = v.z2 - v.z1;
        const planar = Math.hypot(dx, dy);
        const dist = Math.hypot(planar, dz);
        const elev = planar === 0 ? (dz === 0 ? 0 : 90) : Math.atan2(dz, planar) * DEG;
        return {
          values: { dx, dy, dz, planar, dist, elev },
          formulaName: '3次元の2点間距離',
          steps: [
            { formula: '水平距離 = √(ΔX² + ΔY²)', substituted: `√(${ctx.n(dx, 'length')}² + ${ctx.n(dy, 'length')}²)`, result: ctx.u(planar, 'length') },
            { formula: '直線距離 = √(ΔX² + ΔY² + ΔZ²)', substituted: `√(${ctx.n(planar, 'length')}² + ${ctx.n(dz, 'length')}²)`, result: ctx.u(dist, 'length') },
            { formula: '仰角 = atan(ΔZ ÷ 水平距離)', substituted: `atan(${ctx.n(dz, 'length')} ÷ ${ctx.n(planar, 'length')})`, result: ctx.u(elev, 'angle') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'dist', label: '直線距離', quantity: 'length', primary: true },
    { key: 'planar', label: '水平距離', quantity: 'length', primary: true },
    { key: 'dz', label: '高低差（ΔZ）', quantity: 'length' },
    { key: 'dx', label: 'ΔX', quantity: 'length' },
    { key: 'dy', label: 'ΔY', quantity: 'length' },
    { key: 'elev', label: '仰角', quantity: 'angle' }
  ],

  notes: NOTES.concat(['座標にはマイナスの値も入れられます（テンキーの ± キー）。'])
};

/* ==================================================================== *
 * solid.surfaceBox 直方体の表面積
 * ==================================================================== */

export const solidSurfaceBox = {
  id: 'solid.surfaceBox',
  category: 'solid',
  title: '直方体の表面積',
  subtitle: '箱の寸法から、全表面積・側面積・上面積を計算（塗装や板取りの目安に）',
  keywords: ['表面積', '直方体', '箱', '塗装', '面積', '側面積', '立体', 'ラッピング'],
  shape: 'box3d',

  fields: [lenField('w', '幅'), lenField('d', '奥行'), lenField('h', '高さ')],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['total', 'side', 'top', 'perimeter', 'V_m3'],
      run(v, ctx) {
        const top = v.w * v.d;
        const perimeter = 2 * (v.w + v.d);
        const side = perimeter * v.h;
        const total = 2 * top + side;
        const V = v.w * v.d * v.h;
        return {
          values: { total, side, top, perimeter, V_m3: V },
          formulaName: '直方体の表面積',
          steps: [
            { formula: '上面（＝底面）= 幅 × 奥行', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.u(top, 'area') },
            { formula: '側面積 = 周長 × 高さ', substituted: `${ctx.n(perimeter, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(side, 'area') },
            { formula: '全表面積 = 上面 × 2 + 側面積', substituted: `${ctx.n(top, 'area')} × 2 + ${ctx.n(side, 'area')}`, result: ctx.u(total, 'area') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'total', label: '全表面積', quantity: 'area', primary: true },
    { key: 'side', label: '側面積（4面）', quantity: 'area', primary: true },
    { key: 'top', label: '上面（＝底面）', quantity: 'area' },
    { key: 'perimeter', label: '底面の周長', quantity: 'length' },
    { key: 'V_m3', label: '体積(m³)', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true }
  ],

  notes: NOTES.concat(['ふたの無い箱を塗る場合などは、結果から不要な面の分を引いてください。'])
};

/* ==================================================================== *
 * solid.surfaceCyl 円柱の表面積
 * ==================================================================== */

export const solidSurfaceCyl = {
  id: 'solid.surfaceCyl',
  category: 'solid',
  title: '円柱の表面積',
  subtitle: '半径（または直径）と高さから、側面積・全表面積を計算',
  keywords: ['表面積', '円柱', 'パイプ', '塗装', '側面積', '筒', '缶', '立体'],
  shape: 'cylinder3d',

  fields: [lenField('r', '半径'), lenField('d', '直径'), lenField('h', '高さ')],

  solvers: [
    {
      requires: ['r', 'h'],
      provides: ['d', 'side', 'base', 'total', 'circumference', 'V_L'],
      run(v, ctx) {
        return cylinderResult(v.r, v.h, ctx);
      }
    },
    {
      requires: ['d', 'h'],
      provides: ['r', 'side', 'base', 'total', 'circumference', 'V_L'],
      run(v, ctx) {
        const res = cylinderResult(v.d / 2, v.h, ctx);
        res.values.r = v.d / 2;
        delete res.values.d;
        return res;
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'd', label: '直径', quantity: 'length' },
    { key: 'total', label: '全表面積', quantity: 'area', primary: true },
    { key: 'side', label: '側面積', quantity: 'area', primary: true },
    { key: 'base', label: '底面（1面）', quantity: 'area' },
    { key: 'circumference', label: '円周', quantity: 'length' },
    { key: 'V_L', label: '体積(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true }
  ],

  notes: NOTES
};

function cylinderResult(r, h, ctx) {
  const circumference = 2 * Math.PI * r;
  const side = circumference * h;
  const base = Math.PI * r * r;
  const total = side + 2 * base;
  const V = base * h;
  return {
    values: { d: r * 2, side, base, total, circumference, V_L: V },
    formulaName: '円柱の表面積',
    steps: [
      { formula: '円周 = 2πr', substituted: `2 × π × ${ctx.n(r, 'length')}`, result: ctx.u(circumference, 'length') },
      { formula: '側面積 = 円周 × 高さ', substituted: `${ctx.n(circumference, 'length')} × ${ctx.n(h, 'length')}`, result: ctx.u(side, 'area') },
      { formula: '全表面積 = 側面積 + πr² × 2', substituted: `${ctx.n(side, 'area')} + ${ctx.n(base, 'area')} × 2`, result: ctx.u(total, 'area') }
    ]
  };
}

/* ==================================================================== *
 * solid.coneDev 円錐の展開図
 *
 * 板から円錐（コーン）を作るときの扇形。母線 = √(r² + h²)、中心角 = 360° × r ÷ 母線。
 * ==================================================================== */

export const solidConeDev = {
  id: 'solid.coneDev',
  category: 'solid',
  title: '円錐の展開図（扇形）',
  subtitle: '底面の半径と高さから、板を切り抜く扇形の半径と中心角を計算',
  keywords: ['展開図', '円錐', 'コーン', '扇形', '板金', '型紙', '三角コーン', '立体'],
  shape: 'cone3d',

  fields: [lenField('r', '底面の半径'), lenField('h', '高さ'), lenField('slant', '母線（斜辺）')],

  solvers: [
    {
      requires: ['r', 'h'],
      provides: ['slant', 'theta', 'arcLen', 'devArea', 'sideArea'],
      run(v, ctx) {
        const slant = Math.hypot(v.r, v.h);
        return coneDevResult(v.r, slant, ctx, [
          { formula: '母線 = √(半径² + 高さ²)', substituted: `√(${ctx.n(v.r, 'length')}² + ${ctx.n(v.h, 'length')}²)`, result: ctx.u(slant, 'length') }
        ]);
      }
    },
    {
      requires: ['r', 'slant'],
      provides: ['h', 'theta', 'arcLen', 'devArea', 'sideArea'],
      validate(v) {
        if (v.slant <= v.r) return calcError('RIGHT_HYP', 'slant');
        return null;
      },
      run(v, ctx) {
        const h = Math.sqrt(v.slant * v.slant - v.r * v.r);
        const res = coneDevResult(v.r, v.slant, ctx, [
          { formula: '高さ = √(母線² − 半径²)', substituted: `√(${ctx.n(v.slant, 'length')}² − ${ctx.n(v.r, 'length')}²)`, result: ctx.u(h, 'length') }
        ]);
        res.values.h = h;
        delete res.values.slant;
        return res;
      }
    }
  ],

  outputs: [
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'slant', label: '扇形の半径（＝母線）', quantity: 'length', primary: true },
    { key: 'theta', label: '扇形の中心角', quantity: 'angle', primary: true },
    { key: 'arcLen', label: '扇形の弧長（＝底面の円周）', quantity: 'length' },
    { key: 'sideArea', label: '側面積', quantity: 'area' },
    { key: 'devArea', label: '展開図の面積', quantity: 'area' }
  ],

  notes: NOTES.concat(['のりしろ・重ね代は含みません。板を丸めて作る場合は板厚のぶんも見込んでください。'])
};

function coneDevResult(r, slant, ctx, headSteps) {
  const theta = slant > 0 ? (360 * r) / slant : 0;
  const arcLen = 2 * Math.PI * r;
  const sideArea = Math.PI * r * slant;
  return {
    values: { slant, theta, arcLen, devArea: sideArea, sideArea },
    formulaName: '円錐の展開',
    steps: headSteps.concat([
      { formula: '中心角 = 360° × 半径 ÷ 母線', substituted: `360 × ${ctx.n(r, 'length')} ÷ ${ctx.n(slant, 'length')}`, result: ctx.u(theta, 'angle') },
      { formula: '弧長 = 2πr（底面の円周と同じ）', substituted: `2 × π × ${ctx.n(r, 'length')}`, result: ctx.u(arcLen, 'length') },
      { formula: '側面積 = π × 半径 × 母線', substituted: `π × ${ctx.n(r, 'length')} × ${ctx.n(slant, 'length')}`, result: ctx.u(sideArea, 'area') }
    ])
  };
}

/* ==================================================================== *
 * solid.sphere 球の表面積・直径
 * ==================================================================== */

export const solidSphere = {
  id: 'solid.sphere',
  category: 'solid',
  title: '球の表面積・直径',
  subtitle: '半径・直径・表面積・体積を相互計算',
  keywords: ['球', 'ボール', '表面積', '直径', '半径', '立体', 'ドーム'],
  shape: 'sphere3d',

  fields: [lenField('r', '半径'), lenField('d', '直径'), { key: 'S', label: '表面積', quantity: 'area', defaultUnit: 'mm2', min: 0, exclusiveMin: true, optional: true }],

  solvers: [
    { requires: ['r'], provides: ['d', 'S', 'circumference', 'V_L'], run: (v, ctx) => sphereResult(v.r, ctx) },
    {
      requires: ['d'],
      provides: ['r', 'S', 'circumference', 'V_L'],
      run(v, ctx) {
        const res = sphereResult(v.d / 2, ctx);
        res.values.r = v.d / 2;
        delete res.values.d;
        return res;
      }
    },
    {
      requires: ['S'],
      provides: ['r', 'd', 'circumference', 'V_L'],
      run(v, ctx) {
        const r = Math.sqrt(v.S / (4 * Math.PI));
        const res = sphereResult(r, ctx);
        res.values.r = r;
        delete res.values.S;
        res.steps.unshift({ formula: '半径 = √(表面積 ÷ 4π)', substituted: `√(${ctx.n(v.S, 'area')} ÷ (4π))`, result: ctx.u(r, 'length') });
        return res;
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'd', label: '直径', quantity: 'length' },
    areaOut('S', '表面積'),
    { key: 'circumference', label: '大円の円周', quantity: 'length' },
    { key: 'V_L', label: '体積(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true }
  ],

  notes: NOTES
};

function sphereResult(r, ctx) {
  const S = 4 * Math.PI * r * r;
  const V = (4 * Math.PI * r * r * r) / 3;
  const circumference = 2 * Math.PI * r;
  return {
    values: { d: r * 2, S, circumference, V_L: V },
    formulaName: '球',
    steps: [
      { formula: '表面積 = 4πr²', substituted: `4 × π × ${ctx.n(r, 'length')}²`, result: ctx.u(S, 'area') },
      { formula: '体積 = 4πr³ ÷ 3', substituted: `4 × π × ${ctx.n(r, 'length')}³ ÷ 3`, result: ctx.u(V, 'volume', 'L') }
    ]
  };
}

export default [
  solidDiagonal,
  solidDistance3d,
  solidSurfaceBox,
  solidSurfaceCyl,
  solidConeDev,
  solidSphere
];
