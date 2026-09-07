// struct.js — 構造・強度（梁のたわみ・断面性能・曲げ応力・座屈）
//
// 設計注記:
// 1. 支持条件と荷重条件（単純梁+等分布 / 単純梁+中央集中 / 片持ち+先端集中）は
//    式そのものが別物なので、1つのCalcDefに条件セレクタを持たせるのではなく
//    別IDのCalcDefに分けた（basic.unit を4分割したのと同じ理由。calcView.js は
//    「1 CalcDef = 1つの固定フィールド集合」を前提にしている）。
// 2. 単位系は建築・木工の実務にならい N・mm 系で統一する。ヤング係数Eも応力も
//    N/mm²（= MPa）。等分布荷重 w は「1mmあたりのN」を内部値とし、実務で使う
//    N/m での入力を help に添える……のではなく、入力は「全長にかかる合計荷重」
//    ではなく単位長さあたりにするとDIY利用者が混乱するため、
//    **等分布荷重は「合計荷重W(N)」で入力**させ、内部で w = W/L に直す。
// 3. 「この寸法で足りる/安全」という判定は一切しない（REQUIREMENTS 11章）。
//    算出するのは たわみ量・応力度・座屈荷重という数値のみ。

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず建築士・構造設計者などの専門家にご確認ください。ここでは公式にもとづく数値の算出のみを行います。'
];

const E_NOTE =
  'ヤング係数の目安: スギ 7,000 / ヒノキ 9,000 / マツ類 8,000 / 集成材 10,000 / 合板 6,000 / ' +
  'アルミ 70,000 / 鋼材 205,000（単位はいずれも N/mm²）。樹種・等級・含水率で変わります。';

function lenField(key, label, help) {
  return { key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help };
}
function forceField(key, label, help) {
  return { key, label, quantity: 'force', defaultUnit: 'N', min: 0, exclusiveMin: true, optional: true, help };
}
const eField = {
  key: 'E', label: 'ヤング係数', quantity: 'stress', defaultUnit: 'Nmm2',
  min: 0, exclusiveMin: true, optional: true, fixedUnit: true, help: E_NOTE
};
const iField = {
  key: 'I', label: '断面二次モーメント', quantity: 'inertia', defaultUnit: 'mm4',
  min: 0, exclusiveMin: true, optional: true, help: '長方形断面なら「断面性能」の計算で求められます'
};
const deflField = {
  key: 'defl', label: 'たわみ量', quantity: 'length', defaultUnit: 'mm',
  min: 0, exclusiveMin: true, optional: true
};

/* ==================================================================== *
 * struct.section 長方形断面の断面性能（A・I・Z）
 * ==================================================================== */

export const structSection = {
  id: 'struct.section',
  category: 'struct',
  title: '断面性能（長方形断面）',
  subtitle: '幅と成から断面積・断面二次モーメント・断面係数を計算',
  keywords: ['断面二次モーメント', '断面係数', '断面性能', 'I', 'Z', '梁せい', '成', '木材', '角材'],
  shape: 'rectangle',
  shapeMap: { w: 'b', h: 'h', S: 'A' },

  fields: [
    lenField('b', '幅 b', '断面の水平方向の寸法'),
    lenField('h', '成 h', '断面の鉛直方向の寸法。たわみに最も効く'),
    { key: 'A', label: '断面積', quantity: 'area', defaultUnit: 'mm2', min: 0, exclusiveMin: true, optional: true },
    { key: 'I', label: '断面二次モーメント', quantity: 'inertia', defaultUnit: 'mm4', min: 0, exclusiveMin: true, optional: true },
    { key: 'Z', label: '断面係数', quantity: 'sectionMod', defaultUnit: 'mm3s', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['b', 'h'],
      provides: ['A', 'I', 'Z'],
      run(v, ctx) {
        const A = v.b * v.h;
        const I = (v.b * Math.pow(v.h, 3)) / 12;
        const Z = (v.b * v.h * v.h) / 6;
        return {
          values: { A, I, Z },
          formulaName: '長方形断面の断面性能',
          steps: [
            { formula: 'A = b × h', substituted: `${ctx.n(v.b, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(A, 'area') },
            { formula: 'I = b × h³ ÷ 12', substituted: `${ctx.n(v.b, 'length')} × ${ctx.n(v.h, 'length')}³ ÷ 12`, result: ctx.u(I, 'inertia') },
            { formula: 'Z = b × h² ÷ 6', substituted: `${ctx.n(v.b, 'length')} × ${ctx.n(v.h, 'length')}² ÷ 6`, result: ctx.u(Z, 'sectionMod') }
          ]
        };
      }
    },
    {
      requires: ['I', 'b'],
      provides: ['h', 'A', 'Z'],
      run(v, ctx) {
        const h = Math.cbrt((12 * v.I) / v.b);
        const A = v.b * h;
        const Z = (v.b * h * h) / 6;
        return {
          values: { h, A, Z },
          formulaName: '断面二次モーメントから成を逆算',
          steps: [
            { formula: 'h = ∛(12 × I ÷ b)', substituted: `∛(12 × ${ctx.n(v.I, 'inertia')} ÷ ${ctx.n(v.b, 'length')})`, result: ctx.u(h, 'length') },
            { formula: 'Z = b × h² ÷ 6', substituted: `${ctx.n(v.b, 'length')} × ${ctx.n(h, 'length')}² ÷ 6`, result: ctx.u(Z, 'sectionMod') }
          ]
        };
      }
    },
    {
      requires: ['Z', 'b'],
      provides: ['h', 'A', 'I'],
      run(v, ctx) {
        const h = Math.sqrt((6 * v.Z) / v.b);
        const A = v.b * h;
        const I = (v.b * Math.pow(h, 3)) / 12;
        return {
          values: { h, A, I },
          formulaName: '断面係数から成を逆算',
          steps: [
            { formula: 'h = √(6 × Z ÷ b)', substituted: `√(6 × ${ctx.n(v.Z, 'sectionMod')} ÷ ${ctx.n(v.b, 'length')})`, result: ctx.u(h, 'length') },
            { formula: 'I = b × h³ ÷ 12', substituted: `${ctx.n(v.b, 'length')} × ${ctx.n(h, 'length')}³ ÷ 12`, result: ctx.u(I, 'inertia') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'b', label: '幅 b', quantity: 'length' },
    { key: 'h', label: '成 h', quantity: 'length' },
    { key: 'A', label: '断面積', quantity: 'area' },
    { key: 'I', label: '断面二次モーメント', quantity: 'inertia', primary: true },
    { key: 'Z', label: '断面係数', quantity: 'sectionMod', primary: true }
  ],

  notes: NOTES.concat(['成（h）を2倍にすると断面二次モーメントは8倍になります。たわみを抑えたいときは幅より成が効きます。'])
};

/* ==================================================================== *
 * たわみ（3条件）
 * ==================================================================== */

/**
 * 梁のたわみのCalcDefを組み立てる。
 * coef: たわみ係数（δ = 荷重 × L³ or L⁴ / (coef × E × I)）
 * momentCoef: 最大曲げモーメントの係数
 */
function buildBeam({ id, title, subtitle, keywords, shape, loadLabel, loadHelp, deflFormula, deflCalc, deflSteps, momentFormula, momentCalc }) {
  return {
    id,
    category: 'struct',
    title,
    subtitle,
    keywords,
    shape,

    fields: [
      lenField('L', 'スパン L', '支点間の距離（片持ちの場合は突き出し長さ）'),
      forceField('W', loadLabel, loadHelp),
      eField,
      iField,
      deflField
    ],

    solvers: [
      {
        requires: ['L', 'W', 'E', 'I'],
        provides: ['defl', 'M', 'ratio'],
        validate(v) {
          if (v.E === 0) return calcError('ZERO', 'E');
          if (v.I === 0) return calcError('ZERO', 'I');
          return null;
        },
        run(v, ctx) {
          const defl = deflCalc(v);
          const M = momentCalc(v);
          const ratio = v.L / defl; // たわみに対するスパンの比（1/n の n）
          return {
            values: { defl, M, ratio },
            formulaName: title,
            steps: [
              { formula: deflFormula, substituted: deflSteps(v, ctx), result: ctx.u(defl, 'length') },
              { formula: momentFormula, substituted: `${ctx.n(v.W, 'force')} · ${ctx.n(v.L, 'length')}`, result: ctx.u(M, 'moment') },
              { formula: 'スパン ÷ たわみ', substituted: `${ctx.n(v.L, 'length')} ÷ ${ctx.n(defl, 'length')}`, result: '1/' + ctx.f(ratio) }
            ]
          };
        }
      },
      {
        requires: ['L', 'W', 'E', 'defl'],
        provides: ['I', 'M', 'ratio'],
        validate(v) {
          if (v.E === 0) return calcError('ZERO', 'E');
          if (v.defl === 0) return calcError('ZERO', 'defl');
          return null;
        },
        run(v, ctx) {
          // たわみの式を I について解く（δ ∝ 1/I なので I = I(δ=1) / δ）
          const unitI = deflCalc({ ...v, E: v.E, I: 1 });
          const I = unitI / v.defl;
          const M = momentCalc(v);
          const ratio = v.L / v.defl;
          return {
            values: { I, M, ratio },
            formulaName: '許容したわみから必要な断面二次モーメントを逆算',
            steps: [
              { formula: 'I = (たわみの式を I について解く)', substituted: `${deflFormula} を I = … に変形`, result: ctx.u(I, 'inertia') },
              { formula: momentFormula, substituted: `${ctx.n(v.W, 'force')} · ${ctx.n(v.L, 'length')}`, result: ctx.u(M, 'moment') },
              { formula: 'スパン ÷ たわみ', substituted: `${ctx.n(v.L, 'length')} ÷ ${ctx.n(v.defl, 'length')}`, result: '1/' + ctx.f(ratio) }
            ]
          };
        }
      }
    ],

    outputs: [
      { key: 'L', label: 'スパン', quantity: 'length' },
      { key: 'W', label: loadLabel, quantity: 'force' },
      { key: 'E', label: 'ヤング係数', quantity: 'stress', defaultUnit: 'Nmm2', fixedUnit: true },
      { key: 'I', label: '断面二次モーメント', quantity: 'inertia', primary: true },
      { key: 'defl', label: 'たわみ量', quantity: 'length', primary: true },
      { key: 'M', label: '最大曲げモーメント', quantity: 'moment' },
      { key: 'ratio', label: 'スパン÷たわみ', quantity: 'number', help: 'たわみがスパンの何分の1かを表す値' }
    ],

    notes: NOTES.concat([
      E_NOTE,
      'たわみは荷重・スパン・ヤング係数・断面二次モーメントのみから求まる理論値です。実際の部材はめり込み・継手・経年のクリープなどで大きくなることがあります。'
    ])
  };
}

export const structBeamUdl = buildBeam({
  id: 'struct.beamUdl',
  title: '梁のたわみ（両端支持・等分布荷重）',
  subtitle: '棚板や根太のように、全体へ均等に載る荷重のたわみ',
  keywords: ['たわみ', '梁', 'はり', '等分布', '棚板', '根太', '曲げ', 'δ'],
  shape: 'beamUdl',
  loadLabel: '荷重の合計 W',
  loadHelp: '梁全体に均等に載る荷重の合計（1kgあたり約9.8N）',
  deflFormula: 'δ = 5 × W × L³ ÷ (384 × E × I)',
  deflCalc: (v) => (5 * v.W * Math.pow(v.L, 3)) / (384 * v.E * v.I),
  deflSteps: (v, ctx) =>
    `5 × ${ctx.n(v.W, 'force')} × ${ctx.n(v.L, 'length')}³ ÷ (384 × ${ctx.n(v.E, 'stress')} × ${ctx.n(v.I, 'inertia')})`,
  momentFormula: 'M = W × L ÷ 8',
  momentCalc: (v) => (v.W * v.L) / 8
});

export const structBeamPoint = buildBeam({
  id: 'struct.beamPoint',
  title: '梁のたわみ（両端支持・中央集中荷重）',
  subtitle: '中央の1点に載る荷重のたわみ',
  keywords: ['たわみ', '梁', 'はり', '集中荷重', '中央', '曲げ', 'δ'],
  shape: 'beamPoint',
  loadLabel: '集中荷重 P',
  loadHelp: '中央にかかる荷重（1kgあたり約9.8N）',
  deflFormula: 'δ = P × L³ ÷ (48 × E × I)',
  deflCalc: (v) => (v.W * Math.pow(v.L, 3)) / (48 * v.E * v.I),
  deflSteps: (v, ctx) =>
    `${ctx.n(v.W, 'force')} × ${ctx.n(v.L, 'length')}³ ÷ (48 × ${ctx.n(v.E, 'stress')} × ${ctx.n(v.I, 'inertia')})`,
  momentFormula: 'M = P × L ÷ 4',
  momentCalc: (v) => (v.W * v.L) / 4
});

export const structCantilever = buildBeam({
  id: 'struct.cantilever',
  title: 'たわみ（片持ち梁・先端集中荷重）',
  subtitle: '片側だけで支える棚受け・跳ね出しのたわみ',
  keywords: ['たわみ', '片持ち', 'カンチレバー', '跳ね出し', '棚受け', '庇'],
  shape: 'beamCantilever',
  loadLabel: '先端の荷重 P',
  loadHelp: '先端にかかる荷重（1kgあたり約9.8N）',
  deflFormula: 'δ = P × L³ ÷ (3 × E × I)',
  deflCalc: (v) => (v.W * Math.pow(v.L, 3)) / (3 * v.E * v.I),
  deflSteps: (v, ctx) =>
    `${ctx.n(v.W, 'force')} × ${ctx.n(v.L, 'length')}³ ÷ (3 × ${ctx.n(v.E, 'stress')} × ${ctx.n(v.I, 'inertia')})`,
  momentFormula: 'M = P × L',
  momentCalc: (v) => v.W * v.L
});

/* ==================================================================== *
 * struct.bending 曲げ応力度（σ = M ÷ Z）
 * ==================================================================== */

export const structBending = {
  id: 'struct.bending',
  category: 'struct',
  title: '曲げ応力度（σ = M ÷ Z）',
  subtitle: '曲げモーメントと断面係数から、部材に生じる応力度を計算',
  keywords: ['曲げ応力', '応力度', 'σ', 'シグマ', '断面係数', 'モーメント'],
  shape: null,

  fields: [
    { key: 'M', label: '曲げモーメント', quantity: 'moment', defaultUnit: 'Nm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'Z', label: '断面係数 Z', quantity: 'sectionMod', defaultUnit: 'mm3s', min: 0, exclusiveMin: true, optional: true },
    { key: 'sigma', label: '曲げ応力度 σ', quantity: 'stress', defaultUnit: 'Nmm2', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['M', 'Z'],
      provides: ['sigma'],
      validate(v) { if (v.Z === 0) return calcError('ZERO', 'Z'); return null; },
      run(v, ctx) {
        const sigma = v.M / v.Z;
        return {
          values: { sigma },
          formulaName: '曲げ応力度',
          steps: [{ formula: 'σ = M ÷ Z', substituted: `${ctx.n(v.M, 'moment')} ÷ ${ctx.n(v.Z, 'sectionMod')}`, result: ctx.u(sigma, 'stress') }]
        };
      }
    },
    {
      requires: ['M', 'sigma'],
      provides: ['Z'],
      validate(v) { if (v.sigma === 0) return calcError('ZERO', 'sigma'); return null; },
      run(v, ctx) {
        const Z = v.M / v.sigma;
        return {
          values: { Z },
          formulaName: '必要断面係数',
          steps: [{ formula: 'Z = M ÷ σ', substituted: `${ctx.n(v.M, 'moment')} ÷ ${ctx.n(v.sigma, 'stress')}`, result: ctx.u(Z, 'sectionMod') }]
        };
      }
    },
    {
      requires: ['Z', 'sigma'],
      provides: ['M'],
      run(v, ctx) {
        const M = v.Z * v.sigma;
        return {
          values: { M },
          formulaName: '曲げモーメント',
          steps: [{ formula: 'M = Z × σ', substituted: `${ctx.n(v.Z, 'sectionMod')} × ${ctx.n(v.sigma, 'stress')}`, result: ctx.u(M, 'moment') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'M', label: '曲げモーメント', quantity: 'moment', defaultUnit: 'Nm', fixedUnit: true, primary: true },
    { key: 'Z', label: '断面係数', quantity: 'sectionMod' },
    { key: 'sigma', label: '曲げ応力度', quantity: 'stress', defaultUnit: 'Nmm2', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat([
    '算出されるのは部材に生じる応力度の数値です。材料ごとの許容応力度との比較・判定は行いません。'
  ])
};

/* ==================================================================== *
 * struct.column 座屈荷重（オイラーの式）
 * ==================================================================== */

export const structColumn = {
  id: 'struct.column',
  category: 'struct',
  title: '座屈荷重（オイラーの式）',
  subtitle: '細長い柱・支柱が横に曲がり始める理論上の荷重',
  keywords: ['座屈', 'ざくつ', 'オイラー', '柱', '支柱', '束', '圧縮'],
  shape: 'column',
  shapeMap: { L: 'L' },
  fields: [
    lenField('L', '材長 L', '座屈する方向の材の長さ'),
    {
      key: 'k', label: '支持係数 k', quantity: 'number', defaultUnit: 'number',
      min: 0, exclusiveMin: true, optional: true,
      help: '両端ピン=1.0 / 両端固定=0.5 / 一端固定・他端ピン=0.7 / 一端固定・他端自由=2.0'
    },
    eField,
    iField,
    { key: 'Pcr', label: '座屈荷重', quantity: 'force', defaultUnit: 'N', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['L', 'k', 'E', 'I'],
      provides: ['Pcr', 'Lk'],
      validate(v) { if (v.L === 0 || v.k === 0) return calcError('ZERO', 'L'); return null; },
      run(v, ctx) {
        const Lk = v.k * v.L;
        const Pcr = (Math.PI * Math.PI * v.E * v.I) / (Lk * Lk);
        return {
          values: { Pcr, Lk },
          formulaName: 'オイラーの座屈荷重',
          steps: [
            { formula: '座屈長さ Lk = k × L', substituted: `${ctx.f(v.k)} × ${ctx.n(v.L, 'length')}`, result: ctx.u(Lk, 'length') },
            { formula: 'Pcr = π² × E × I ÷ Lk²', substituted: `π² × ${ctx.n(v.E, 'stress')} × ${ctx.n(v.I, 'inertia')} ÷ ${ctx.n(Lk, 'length')}²`, result: ctx.u(Pcr, 'force') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'L', label: '材長', quantity: 'length' },
    { key: 'Lk', label: '座屈長さ', quantity: 'length' },
    { key: 'Pcr', label: '座屈荷重', quantity: 'force', primary: true }
  ],

  notes: NOTES.concat([
    'オイラーの式は細長い部材に当てはまる理論式です。太く短い部材では材料の圧縮強さのほうが先に効くため、この値は当てはまりません。'
  ])
};

/* ==================================================================== *
 * struct.reaction 単純梁の反力（集中荷重の位置を指定）
 * ==================================================================== */

export const structReaction = {
  id: 'struct.reaction',
  category: 'struct',
  title: '単純梁の反力',
  subtitle: '荷重の位置から、左右の支点にかかる力と最大曲げモーメントを計算',
  keywords: ['反力', '支点', '集中荷重', '梁', 'モーメント', 'RA', 'RB'],
  shape: 'beamPoint',
  shapeMap: { L: 'L', W: 'P' },

  fields: [
    lenField('L', 'スパン L'),
    forceField('P', '荷重 P', '1kgあたり約9.8N'),
    lenField('a', '左支点からの距離 a', '荷重がかかる位置')
  ],

  solvers: [
    {
      requires: ['L', 'P', 'a'],
      provides: ['RA', 'RB', 'M'],
      validate(v) {
        if (v.L === 0) return calcError('ZERO', 'L');
        if (v.a > v.L) return calcError('RIGHT_HYP', 'a');
        return null;
      },
      run(v, ctx) {
        const b = v.L - v.a;
        const RA = (v.P * b) / v.L;
        const RB = (v.P * v.a) / v.L;
        const M = (v.P * v.a * b) / v.L;
        return {
          values: { RA, RB, M, b },
          formulaName: '単純梁の反力',
          steps: [
            { formula: '右支点からの距離 b = L − a', substituted: `${ctx.n(v.L, 'length')} − ${ctx.n(v.a, 'length')}`, result: ctx.u(b, 'length') },
            { formula: '左の反力 RA = P × b ÷ L', substituted: `${ctx.n(v.P, 'force')} × ${ctx.n(b, 'length')} ÷ ${ctx.n(v.L, 'length')}`, result: ctx.u(RA, 'force') },
            { formula: '右の反力 RB = P × a ÷ L', substituted: `${ctx.n(v.P, 'force')} × ${ctx.n(v.a, 'length')} ÷ ${ctx.n(v.L, 'length')}`, result: ctx.u(RB, 'force') },
            { formula: '最大曲げモーメント M = P × a × b ÷ L', substituted: `${ctx.n(v.P, 'force')} × ${ctx.n(v.a, 'length')} × ${ctx.n(b, 'length')} ÷ ${ctx.n(v.L, 'length')}`, result: ctx.u(M, 'moment') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'b', label: '右支点からの距離', quantity: 'length' },
    { key: 'RA', label: '左の反力', quantity: 'force', primary: true },
    { key: 'RB', label: '右の反力', quantity: 'force', primary: true },
    { key: 'M', label: '最大曲げモーメント', quantity: 'moment' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * struct.slender 細長比
 * ==================================================================== */

export const structSlender = {
  id: 'struct.slender',
  category: 'struct',
  title: '細長比',
  subtitle: '断面二次モーメントと断面積から、断面二次半径と細長比を計算',
  keywords: ['細長比', 'さいちょうひ', 'λ', 'ラムダ', '断面二次半径', '座屈', '柱'],
  shape: 'column',
  shapeMap: { L: 'Lk' },
  fields: [
    { key: 'I', label: '断面二次モーメント', quantity: 'inertia', defaultUnit: 'mm4', min: 0, exclusiveMin: true, optional: true },
    { key: 'A', label: '断面積', quantity: 'area', defaultUnit: 'mm2', min: 0, exclusiveMin: true, optional: true },
    lenField('Lk', '座屈長さ Lk', '材長 × 支持係数（「座屈荷重」の計算で求められます）'),
    { key: 'lambda', label: '細長比 λ', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['I', 'A', 'Lk'],
      provides: ['i', 'lambda'],
      validate(v) { if (v.A === 0) return calcError('ZERO', 'A'); return null; },
      run(v, ctx) {
        const i = Math.sqrt(v.I / v.A);
        const lambda = v.Lk / i;
        return {
          values: { i, lambda },
          formulaName: '細長比',
          steps: [
            { formula: '断面二次半径 i = √(I ÷ A)', substituted: `√(${ctx.n(v.I, 'inertia')} ÷ ${ctx.n(v.A, 'area')})`, result: ctx.u(i, 'length') },
            { formula: '細長比 λ = 座屈長さ ÷ 断面二次半径', substituted: `${ctx.n(v.Lk, 'length')} ÷ ${ctx.n(i, 'length')}`, result: ctx.f(lambda) }
          ]
        };
      }
    },
    {
      requires: ['I', 'A', 'lambda'],
      provides: ['i', 'Lk'],
      validate(v) { if (v.A === 0) return calcError('ZERO', 'A'); return null; },
      run(v, ctx) {
        const i = Math.sqrt(v.I / v.A);
        const Lk = v.lambda * i;
        return {
          values: { i, Lk },
          formulaName: '座屈長さの逆算',
          steps: [
            { formula: '断面二次半径 i = √(I ÷ A)', substituted: `√(${ctx.n(v.I, 'inertia')} ÷ ${ctx.n(v.A, 'area')})`, result: ctx.u(i, 'length') },
            { formula: '座屈長さ = 細長比 × 断面二次半径', substituted: `${ctx.f(v.lambda)} × ${ctx.n(i, 'length')}`, result: ctx.u(Lk, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'i', label: '断面二次半径', quantity: 'length', primary: true },
    { key: 'lambda', label: '細長比 λ', quantity: 'number', primary: true },
    { key: 'Lk', label: '座屈長さ', quantity: 'length' }
  ],

  notes: NOTES.concat(['細長比の上限は材料と規格ごとに定められています。ここでは値の算出のみを行います。'])
};

export default [
  structSection, structBeamUdl, structBeamPoint, structCantilever,
  structBending, structColumn, structReaction, structSlender
];
