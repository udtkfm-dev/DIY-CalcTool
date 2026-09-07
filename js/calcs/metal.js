// metal.js — 金属加工・機械要素（板金展開・切削条件・締付トルク・溶接・歯車・材料重量）

import { calcError } from '../core/errors.js';
import { DEG_TO_RAD } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '加工条件・締付力は材料や工具、機械の状態で変わります。実際の値はメーカーの資料や現場の基準にあわせてご確認ください。'
];

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
const numField = (key, label, help) => ({
  key, label, quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help
});

/* ==================================================================== *
 * metal.bend 板金の展開長（曲げ伸び代）
 * ==================================================================== */

export const metalBend = {
  id: 'metal.bend',
  category: 'metal',
  title: '板金の展開長（曲げ伸び代）',
  subtitle: '板厚・曲げ半径・角度から、曲げ代を含む展開寸法を計算',
  keywords: ['板金', '展開', '曲げ', '伸び代', 'ベンドアローワンス', 'K値', '中立軸', 'BA'],
  shape: 'bendSheet',
  shapeMap: { a: 'a', b: 'b', t: 't', r: 'r' },
  fields: [
    lenField('a', '辺A の長さ', '曲げの外側で測った一方の辺'),
    lenField('b', '辺B の長さ', '曲げの外側で測ったもう一方の辺'),
    lenField('t', '板厚'),
    lenField('r', '内側の曲げ半径'),
    { key: 'angle', label: '曲げ角度', quantity: 'angle', defaultUnit: 'deg', min: 0, exclusiveMin: true, max: 180, optional: true, help: '板を曲げた角度（直角に曲げるなら90°）' },
    { key: 'K', label: 'K値（中立軸の位置）', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, max: 1, optional: true, help: '軟鋼の一般的な目安は 0.33〜0.44。板厚に対する中立軸の位置の比' }
  ],

  solvers: [
    {
      requires: ['a', 'b', 't', 'r', 'angle', 'K'],
      provides: ['BA', 'total', 'setback'],
      run(v, ctx) {
        const rad = v.angle * DEG_TO_RAD;
        const BA = rad * (v.r + v.K * v.t);
        // セットバック（外側寸法どうしの交点からの戻り量）
        const setback = (v.r + v.t) * Math.tan(rad / 2);
        const total = v.a + v.b - 2 * setback + BA;
        return {
          values: { BA, total, setback },
          formulaName: '曲げ伸び代と展開長',
          steps: [
            { formula: '曲げ代 BA = 角度[rad] × (内R + K × 板厚)', substituted: `${ctx.f(rad)} × (${ctx.n(v.r, 'length')} + ${ctx.f(v.K)} × ${ctx.n(v.t, 'length')})`, result: ctx.u(BA, 'length') },
            { formula: 'セットバック = (内R + 板厚) × tan(角度 ÷ 2)', substituted: `(${ctx.n(v.r, 'length')} + ${ctx.n(v.t, 'length')}) × tan(${ctx.n(v.angle, 'angle')} ÷ 2)`, result: ctx.u(setback, 'length') },
            { formula: '展開長 = 辺A + 辺B − セットバック × 2 + BA', substituted: `${ctx.n(v.a, 'length')} + ${ctx.n(v.b, 'length')} − ${ctx.n(setback, 'length')} × 2 + ${ctx.n(BA, 'length')}`, result: ctx.u(total, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'BA', label: '曲げ代（BA）', quantity: 'length' },
    { key: 'setback', label: 'セットバック', quantity: 'length' },
    { key: 'total', label: '展開長', quantity: 'length', primary: true }
  ],

  notes: NOTES.concat(['K値は材質・曲げ方法・工具で変わります。実際の展開長は試し曲げで確認することが一般的です。'])
};

/* ==================================================================== *
 * metal.cutting 切削条件（回転数・送り速度）
 * ==================================================================== */

export const metalCutting = {
  id: 'metal.cutting',
  category: 'metal',
  title: '切削条件（回転数・送り速度）',
  subtitle: '切削速度と工具径から主軸回転数を、刃数と1刃送りから送り速度を計算',
  keywords: ['切削', '回転数', '主軸', '送り', 'フライス', 'ドリル', 'エンドミル', 'rpm', '周速'],
  shape: 'circle',
  shapeMap: { d: 'D' },
  fields: [
    { key: 'Vc', label: '切削速度', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は m/min。アルミ 100〜300 / 軟鋼 20〜60 / ステンレス 15〜35 が目安' },
    lenField('D', '工具の直径'),
    { key: 'n', label: '主軸回転数', quantity: 'rpm', defaultUnit: 'rpm', min: 0, exclusiveMin: true, optional: true },
    numField('z', '刃数', 'エンドミルなら刃の枚数。ドリルは2'),
    { key: 'fz', label: '1刃あたりの送り', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は mm/刃' },
    { key: 'vf', label: '送り速度', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '単位は mm/min' }
  ],

  solvers: [
    {
      requires: ['Vc', 'D', 'z', 'fz'],
      provides: ['n', 'vf'],
      validate(v) { if (v.D === 0) return calcError('ZERO', 'D'); return null; },
      run(v, ctx) {
        const n = (1000 * v.Vc) / (Math.PI * v.D);
        const vf = n * v.z * v.fz;
        return {
          values: { n, vf },
          formulaName: '切削条件',
          steps: [
            { formula: '回転数 n = 1000 × 切削速度 ÷ (π × 工具径)', substituted: `1000 × ${ctx.f(v.Vc)} ÷ (π × ${ctx.n(v.D, 'length')})`, result: ctx.u(n, 'rpm') },
            { formula: '送り速度 vf = 回転数 × 刃数 × 1刃送り', substituted: `${ctx.f(n)} × ${ctx.f(v.z)} × ${ctx.f(v.fz)}`, result: ctx.f(vf) + ' mm/min' }
          ]
        };
      }
    },
    {
      requires: ['Vc', 'D'],
      provides: ['n'],
      validate(v) { if (v.D === 0) return calcError('ZERO', 'D'); return null; },
      run(v, ctx) {
        const n = (1000 * v.Vc) / (Math.PI * v.D);
        return {
          values: { n },
          formulaName: '主軸回転数',
          steps: [{ formula: 'n = 1000 × 切削速度 ÷ (π × 工具径)', substituted: `1000 × ${ctx.f(v.Vc)} ÷ (π × ${ctx.n(v.D, 'length')})`, result: ctx.u(n, 'rpm') }]
        };
      }
    },
    {
      requires: ['n', 'D'],
      provides: ['Vc'],
      run(v, ctx) {
        const Vc = (Math.PI * v.D * v.n) / 1000;
        return {
          values: { Vc },
          formulaName: '切削速度',
          steps: [{ formula: '切削速度 = π × 工具径 × 回転数 ÷ 1000', substituted: `π × ${ctx.n(v.D, 'length')} × ${ctx.f(v.n)} ÷ 1000`, result: ctx.f(Vc) + ' m/min' }]
        };
      }
    }
  ],

  outputs: [
    { key: 'Vc', label: '切削速度（m/min）', quantity: 'number' },
    { key: 'D', label: '工具の直径', quantity: 'length' },
    { key: 'n', label: '主軸回転数', quantity: 'rpm', primary: true },
    { key: 'vf', label: '送り速度（mm/min）', quantity: 'number', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * metal.torque ねじの締付トルク
 * ==================================================================== */

export const metalTorque = {
  id: 'metal.torque',
  category: 'metal',
  title: 'ねじの締付トルク',
  subtitle: 'トルク係数・呼び径・軸力から締付トルクを計算',
  keywords: ['トルク', '締付', 'ねじ', 'ボルト', '軸力', 'N・m', 'トルクレンチ'],
  shape: 'circle',
  shapeMap: { d: 'd' },
  fields: [
    { key: 'K', label: 'トルク係数 K', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '潤滑なしの鋼ボルトで 0.2 前後、潤滑ありで 0.15 前後が目安' },
    lenField('d', 'ねじの呼び径', 'M8 なら 8mm'),
    { key: 'F', label: '軸力', quantity: 'force', defaultUnit: 'N', min: 0, exclusiveMin: true, optional: true, help: 'ボルトに生じさせたい引張力' },
    { key: 'T', label: '締付トルク', quantity: 'torque', defaultUnit: 'Nm', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['K', 'd', 'F'],
      provides: ['T'],
      run(v, ctx) {
        const T = (v.K * (v.d / 1000) * v.F); // d は内部mm → m
        return {
          values: { T },
          formulaName: '締付トルク',
          steps: [{ formula: 'T = K × 呼び径[m] × 軸力', substituted: `${ctx.f(v.K)} × ${ctx.f(v.d / 1000)} × ${ctx.n(v.F, 'force')}`, result: ctx.u(T, 'torque') }]
        };
      }
    },
    {
      requires: ['K', 'd', 'T'],
      provides: ['F'],
      validate(v) { if (v.K === 0 || v.d === 0) return calcError('ZERO', 'K'); return null; },
      run(v, ctx) {
        const F = v.T / (v.K * (v.d / 1000));
        return {
          values: { F },
          formulaName: '軸力',
          steps: [{ formula: '軸力 = T ÷ (K × 呼び径[m])', substituted: `${ctx.n(v.T, 'torque')} ÷ (${ctx.f(v.K)} × ${ctx.f(v.d / 1000)})`, result: ctx.u(F, 'force') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'K', label: 'トルク係数', quantity: 'number' },
    { key: 'd', label: '呼び径', quantity: 'length' },
    { key: 'F', label: '軸力', quantity: 'force', primary: true },
    { key: 'T', label: '締付トルク', quantity: 'torque', primary: true }
  ],

  notes: NOTES.concat(['トルク係数は表面処理・潤滑・座面の状態で大きく変わります。強度区分ごとの締付値はねじの規格や機器の指定をご確認ください。'])
};

/* ==================================================================== *
 * metal.weld 隅肉溶接ののど厚
 * ==================================================================== */

export const metalWeld = {
  id: 'metal.weld',
  category: 'metal',
  title: '隅肉溶接ののど厚',
  subtitle: '脚長からのど厚と、溶接部の有効断面積を計算',
  keywords: ['溶接', '隅肉', 'のど厚', '脚長', 'サイズ', '有効長さ'],
  shape: 'weldFillet',
  shapeMap: { s: 's', a: 'a', L: 'L' },
  fields: [
    lenField('s', '脚長 S', '溶接部の一辺の長さ'),
    lenField('a', 'のど厚 a'),
    lenField('L', '溶接の有効長さ')
  ],

  solvers: [
    {
      requires: ['s', 'L'],
      provides: ['a', 'A'],
      run(v, ctx) {
        const a = v.s * Math.cos(45 * DEG_TO_RAD);
        const A = a * v.L;
        return {
          values: { a, A },
          formulaName: '隅肉溶接ののど厚',
          steps: [
            { formula: 'のど厚 = 脚長 × cos45° ≒ 脚長 × 0.707', substituted: `${ctx.n(v.s, 'length')} × 0.707`, result: ctx.u(a, 'length') },
            { formula: '有効断面積 = のど厚 × 有効長さ', substituted: `${ctx.n(a, 'length')} × ${ctx.n(v.L, 'length')}`, result: ctx.u(A, 'area') }
          ]
        };
      }
    },
    {
      requires: ['a', 'L'],
      provides: ['s', 'A'],
      run(v, ctx) {
        const s = v.a / Math.cos(45 * DEG_TO_RAD);
        const A = v.a * v.L;
        return {
          values: { s, A },
          formulaName: 'のど厚から脚長を逆算',
          steps: [
            { formula: '脚長 = のど厚 ÷ 0.707', substituted: `${ctx.n(v.a, 'length')} ÷ 0.707`, result: ctx.u(s, 'length') },
            { formula: '有効断面積 = のど厚 × 有効長さ', substituted: `${ctx.n(v.a, 'length')} × ${ctx.n(v.L, 'length')}`, result: ctx.u(A, 'area') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 's', label: '脚長', quantity: 'length', primary: true },
    { key: 'a', label: 'のど厚', quantity: 'length', primary: true },
    { key: 'A', label: '有効断面積', quantity: 'area' }
  ],

  notes: NOTES.concat(['溶接の設計・施工方法や資格要件は規格・仕様で定められています。ここでは寸法の換算のみを行います。'])
};

/* ==================================================================== *
 * metal.gear 平歯車の諸元
 * ==================================================================== */

export const metalGear = {
  id: 'metal.gear',
  category: 'metal',
  title: '平歯車の諸元',
  subtitle: 'モジュールと歯数から、ピッチ円直径・外径・中心距離を計算',
  keywords: ['歯車', 'ギア', 'モジュール', '歯数', 'ピッチ円', '中心距離', '減速比'],
  shape: 'circle',
  // circle.js は r と d を必ず描くため、r もピッチ円半径の出力に割り当てる
  shapeMap: { d: 'd1', r: 'r1' },

  fields: [
    { key: 'm', label: 'モジュール', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '歯の大きさ。ピッチ円直径 ÷ 歯数' },
    numField('z1', '歯車1の歯数'),
    numField('z2', '歯車2の歯数'),
    lenField('d1', '歯車1のピッチ円直径')
  ],

  solvers: [
    {
      requires: ['m', 'z1', 'z2'],
      provides: ['d1', 'd2', 'da1', 'da2', 'center', 'ratio'],
      validate(v) { if (v.z1 === 0) return calcError('ZERO', 'z1'); return null; },
      run(v, ctx) {
        const d1 = v.m * v.z1;
        const d2 = v.m * v.z2;
        const da1 = v.m * (v.z1 + 2);
        const da2 = v.m * (v.z2 + 2);
        const center = (d1 + d2) / 2;
        const ratio = v.z2 / v.z1;
        return {
          values: { d1, d2, da1, da2, center, ratio, r1: d1 / 2 },
          formulaName: '平歯車の諸元',
          steps: [
            { formula: 'ピッチ円直径 = モジュール × 歯数', substituted: `${ctx.f(v.m)} × ${ctx.f(v.z1)}`, result: ctx.u(d1, 'length') },
            { formula: '外径 = モジュール × (歯数 + 2)', substituted: `${ctx.f(v.m)} × (${ctx.f(v.z1)} + 2)`, result: ctx.u(da1, 'length') },
            { formula: '中心距離 = (d1 + d2) ÷ 2', substituted: `(${ctx.n(d1, 'length')} + ${ctx.n(d2, 'length')}) ÷ 2`, result: ctx.u(center, 'length') },
            { formula: '減速比 = 歯数2 ÷ 歯数1', substituted: `${ctx.f(v.z2)} ÷ ${ctx.f(v.z1)}`, result: ctx.f(ratio) }
          ]
        };
      }
    },
    {
      requires: ['d1', 'z1'],
      provides: ['m', 'da1'],
      validate(v) { if (v.z1 === 0) return calcError('ZERO', 'z1'); return null; },
      run(v, ctx) {
        const m = v.d1 / v.z1;
        const da1 = m * (v.z1 + 2);
        return {
          values: { m, da1, r1: v.d1 / 2 },
          formulaName: 'モジュールの逆算',
          steps: [
            { formula: 'モジュール = ピッチ円直径 ÷ 歯数', substituted: `${ctx.n(v.d1, 'length')} ÷ ${ctx.f(v.z1)}`, result: ctx.f(m) },
            { formula: '外径 = モジュール × (歯数 + 2)', substituted: `${ctx.f(m)} × (${ctx.f(v.z1)} + 2)`, result: ctx.u(da1, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'm', label: 'モジュール', quantity: 'number' },
    { key: 'd1', label: '歯車1のピッチ円直径', quantity: 'length', primary: true },
    { key: 'r1', label: '歯車1のピッチ円半径', quantity: 'length' },
    { key: 'da1', label: '歯車1の外径', quantity: 'length' },
    { key: 'd2', label: '歯車2のピッチ円直径', quantity: 'length' },
    { key: 'da2', label: '歯車2の外径', quantity: 'length' },
    { key: 'center', label: '中心距離', quantity: 'length', primary: true },
    { key: 'ratio', label: '減速比', quantity: 'number' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * metal.weight 材料の重量
 * ==================================================================== */

const DENSITY_NOTE =
  '比重の目安: 鉄・鋼 7.85 / ステンレス(SUS304) 7.93 / アルミ 2.70 / 銅 8.96 / 真鍮 8.50 / ' +
  'チタン 4.51 / 鉛 11.34 / 木材(スギ) 0.38 / 木材(ナラ) 0.68';

export const metalWeight = {
  id: 'metal.weight',
  category: 'metal',
  title: '材料の重量',
  subtitle: '寸法と比重から、材料の重さを計算',
  keywords: ['重量', '重さ', '比重', '密度', '鋼材', 'アルミ', '鉄板', 'kg'],
  shape: 'box3d',
  shapeMap: { w: 'w', h: 'h', d: 'L' },

  fields: [
    lenField('w', '幅'),
    lenField('h', '厚さ'),
    lenField('L', '長さ'),
    { key: 'density', label: '比重', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: DENSITY_NOTE },
    { key: 'n', label: '本数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true },
    { key: 'weight', label: '重量', quantity: 'weight', defaultUnit: 'kg', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['w', 'h', 'L', 'density', 'n'],
      provides: ['V_mm3', 'weight', 'unitWeight'],
      run(v, ctx) {
        const volMm3 = v.w * v.h * v.L;
        const volCm3 = volMm3 / 1000;
        const unitKg = (volCm3 * v.density) / 1000;
        const weight = unitKg * v.n;
        return {
          values: { V_mm3: volMm3 * v.n, weight, unitWeight: unitKg },
          formulaName: '材料の重量',
          steps: [
            { formula: '体積 = 幅 × 厚さ × 長さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.h, 'length')} × ${ctx.n(v.L, 'length')}`, result: ctx.f(volCm3) + ' cm³' },
            { formula: '1本の重量[kg] = 体積[cm³] × 比重 ÷ 1000', substituted: `${ctx.f(volCm3)} × ${ctx.f(v.density)} ÷ 1000`, result: ctx.f(unitKg) + ' kg' },
            { formula: '合計 = 1本の重量 × 本数', substituted: `${ctx.f(unitKg)} × ${ctx.f(v.n)}`, result: ctx.u(weight, 'weight') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'V_mm3', label: '体積の合計', quantity: 'volume' },
    { key: 'unitWeight', label: '1本あたりの重量（kg）', quantity: 'number' },
    { key: 'weight', label: '合計重量', quantity: 'weight', defaultUnit: 'kg', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat([DENSITY_NOTE])
};

/* ==================================================================== *
 * metal.tap タップの下穴径
 * ==================================================================== *
 * めねじの内径 D1 = D − 1.0825 × P（ひっかかり率100%）。
 * 実際は 70〜80% で加工するため、下穴 = D − 1.0825 × P × (率/100)。
 */

const PITCH_NOTE =
  'メートル並目ねじのピッチ: M3=0.5 / M4=0.7 / M5=0.8 / M6=1.0 / M8=1.25 / M10=1.5 / M12=1.75 / M16=2.0';

export const metalTap = {
  id: 'metal.tap',
  category: 'metal',
  title: 'タップの下穴径',
  subtitle: 'ねじの呼び径とピッチ、ひっかかり率から下穴の直径を計算',
  keywords: ['タップ', '下穴', 'ねじ切り', 'ひっかかり率', 'ピッチ', 'めねじ', 'M6', 'ドリル'],
  shape: 'circle',
  shapeMap: { d: 'drill', r: 'drillR' },

  fields: [
    lenField('D', 'ねじの呼び径', 'M6 なら 6'),
    lenField('P', 'ピッチ', PITCH_NOTE),
    { key: 'rate', label: 'ひっかかり率（%）', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '一般的な加工で 70〜80%。数値が小さいほど下穴は大きくなります' },
    lenField('drill', '下穴の直径')
  ],

  solvers: [
    {
      requires: ['D', 'P', 'rate'],
      provides: ['drill', 'drillR', 'full'],
      run(v, ctx) {
        const full = v.D - 1.0825 * v.P;
        const drill = v.D - 1.0825 * v.P * (v.rate / 100);
        return {
          values: { drill, drillR: drill / 2, full },
          formulaName: 'タップの下穴径',
          steps: [
            { formula: 'ひっかかり率100%の内径 = 呼び径 − 1.0825 × ピッチ', substituted: `${ctx.n(v.D, 'length')} − 1.0825 × ${ctx.n(v.P, 'length')}`, result: ctx.u(full, 'length') },
            { formula: '下穴 = 呼び径 − 1.0825 × ピッチ × (ひっかかり率 ÷ 100)', substituted: `${ctx.n(v.D, 'length')} − 1.0825 × ${ctx.n(v.P, 'length')} × ${ctx.f(v.rate / 100)}`, result: ctx.u(drill, 'length') },
            { formula: '簡易の目安（呼び径 − ピッチ）', substituted: `${ctx.n(v.D, 'length')} − ${ctx.n(v.P, 'length')}`, result: ctx.u(v.D - v.P, 'length') }
          ]
        };
      }
    },
    {
      requires: ['D', 'P', 'drill'],
      provides: ['rate', 'drillR', 'full'],
      validate(v) { if (v.P === 0) return calcError('ZERO', 'P'); return null; },
      run(v, ctx) {
        const rate = ((v.D - v.drill) / (1.0825 * v.P)) * 100;
        return {
          values: { rate, drillR: v.drill / 2, full: v.D - 1.0825 * v.P },
          formulaName: 'ひっかかり率の逆算',
          steps: [
            { formula: 'ひっかかり率 = (呼び径 − 下穴) ÷ (1.0825 × ピッチ) × 100', substituted: `(${ctx.n(v.D, 'length')} − ${ctx.n(v.drill, 'length')}) ÷ (1.0825 × ${ctx.n(v.P, 'length')}) × 100`, result: ctx.f(rate) + ' %' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'drill', label: '下穴の直径', quantity: 'length', primary: true },
    { key: 'drillR', label: '下穴の半径', quantity: 'length' },
    { key: 'rate', label: 'ひっかかり率（%）', quantity: 'number', primary: true },
    { key: 'full', label: 'ひっかかり率100%の内径', quantity: 'length' }
  ],

  notes: NOTES.concat([PITCH_NOTE, '実際にはドリルの規格寸法に合わせて選びます。材料の粘りによっても適した下穴は変わります。'])
};

/* ==================================================================== *
 * metal.tube 丸パイプの重量（中空断面）
 * ==================================================================== */

export const metalTube = {
  id: 'metal.tube',
  category: 'metal',
  title: '丸パイプの重量',
  subtitle: '外径・肉厚・長さ・比重から、中空断面の重さを計算',
  keywords: ['パイプ', '丸パイプ', 'single', '中空', '肉厚', '重量', '鋼管', 'アルミパイプ'],
  shape: 'circle',
  shapeMap: { d: 'dOuter', r: 'rOuter' },

  fields: [
    lenField('dOuter', '外径'),
    lenField('t', '肉厚'),
    lenField('L', '長さ'),
    { key: 'density', label: '比重', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '鉄・鋼 7.85 / ステンレス 7.93 / アルミ 2.70 / 銅 8.96' },
    { key: 'n', label: '本数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['dOuter', 't', 'L', 'density', 'n'],
      provides: ['dInner', 'rOuter', 'sectionArea', 'unitWeight', 'weight'],
      validate(v) {
        if (v.t * 2 >= v.dOuter) return calcError('RIGHT_HYP', 't');
        return null;
      },
      run(v, ctx) {
        const dInner = v.dOuter - 2 * v.t;
        const sectionArea = (Math.PI / 4) * (v.dOuter * v.dOuter - dInner * dInner);
        const volCm3 = (sectionArea * v.L) / 1000;
        const unitWeight = (volCm3 * v.density) / 1000;
        const weight = unitWeight * v.n;
        return {
          values: { dInner, rOuter: v.dOuter / 2, sectionArea, unitWeight, weight },
          formulaName: '丸パイプの重量',
          steps: [
            { formula: '内径 = 外径 − 肉厚 × 2', substituted: `${ctx.n(v.dOuter, 'length')} − ${ctx.n(v.t, 'length')} × 2`, result: ctx.u(dInner, 'length') },
            { formula: '断面積 = π ÷ 4 × (外径² − 内径²)', substituted: `π ÷ 4 × (${ctx.n(v.dOuter, 'length')}² − ${ctx.n(dInner, 'length')}²)`, result: ctx.u(sectionArea, 'area') },
            { formula: '1本の重量[kg] = 断面積 × 長さ[cm³] × 比重 ÷ 1000', substituted: `${ctx.f(volCm3)} × ${ctx.f(v.density)} ÷ 1000`, result: ctx.f(unitWeight) + ' kg' },
            { formula: '合計 = 1本の重量 × 本数', substituted: `${ctx.f(unitWeight)} × ${ctx.f(v.n)}`, result: ctx.u(weight, 'weight') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'dInner', label: '内径', quantity: 'length' },
    { key: 'rOuter', label: '外半径', quantity: 'length' },
    { key: 'sectionArea', label: '断面積', quantity: 'area' },
    { key: 'unitWeight', label: '1本あたりの重量（kg）', quantity: 'number' },
    { key: 'weight', label: '合計重量', quantity: 'weight', defaultUnit: 'kg', fixedUnit: true, primary: true }
  ],

  notes: NOTES
};

export default [metalBend, metalCutting, metalTorque, metalWeld, metalGear, metalWeight, metalTap, metalTube];
