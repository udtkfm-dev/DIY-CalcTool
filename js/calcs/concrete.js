// concrete.js — CALC_SPEC.md「コンクリート・モルタル」（Phase 4 第6グループ）

import { calcError } from '../core/errors.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '余裕率は打設時のロス・こぼれを見込むための目安です。実際の必要量は施工条件により異なります。'
];

const lenField = (key, label, help) => ({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help });
const VOLUME_OUTPUTS = [
  { key: 'V_mm3', label: '体積(mm³)', quantity: 'volume', defaultUnit: 'mm3', fixedUnit: true },
  { key: 'V_m3', label: '体積(m³)', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true },
  { key: 'V_L', label: '体積(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true }
];
function volumeTriple(v) {
  return { V_mm3: v, V_m3: v, V_L: v };
}

/* ==================================================================== *
 * concrete.slab 土間・基礎の体積（余裕率つき）
 * ==================================================================== */

export const concreteSlab = {
  id: 'concrete.slab',
  category: 'concrete',
  title: '土間・基礎の体積（余裕率つき）',
  subtitle: '幅・奥行き・厚さと余裕率から、生コンの必要量を計算',
  keywords: ['コンクリート', '土間', '基礎', '生コン', '余裕率', 'ロス率'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd' },

  fields: [
    lenField('w', '幅'),
    lenField('d', '奥行き'),
    lenField('h', '厚さ'),
    { key: 'margin', label: '余裕率（任意）', quantity: 'percent', defaultUnit: 'percent', optional: true, help: '打設ロスを見込む割合。例: 10なら+10%' },
    { key: 'V', label: '必要量', quantity: 'volume', defaultUnit: 'mm3', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'h', 'margin'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const base = v.w * v.d * v.h;
        const V = base * (1 + v.margin / 100);
        return {
          values: volumeTriple(V),
          formulaName: '土間・基礎の体積',
          steps: [
            { formula: '基本体積 = 幅 × 奥行き × 厚さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(base, 'volume', 'm3') },
            { formula: '必要量 = 基本体積 × (1 + 余裕率 ÷ 100)', substituted: `${ctx.n(base, 'volume', 'm3')} × (1 + ${ctx.n(v.margin, 'percent')} ÷ 100)`, result: ctx.u(V, 'volume', 'm3') }
          ]
        };
      }
    },
    {
      requires: ['w', 'd', 'h'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = v.w * v.d * v.h;
        return { values: volumeTriple(V), formulaName: '土間・基礎の体積', steps: [{ formula: '体積 = 幅 × 奥行き × 厚さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'm3') }] };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '幅', quantity: 'length' },
    { key: 'd', label: '奥行き', quantity: 'length' },
    { key: 'h', label: '厚さ', quantity: 'length' },
    { key: 'margin', label: '余裕率', quantity: 'percent' },
    ...VOLUME_OUTPUTS
  ],

  notEnoughHint(enteredKeys) {
    if (enteredKeys.length <= 2 && enteredKeys.includes('margin')) return '幅・奥行き・厚さを入力してください（余裕率は任意項目です）';
    return null;
  },

  notes: NOTES
};

/* ==================================================================== *
 * concrete.pier 柱基礎・円柱基礎（余裕率つき）
 * ==================================================================== */

export const concretePier = {
  id: 'concrete.pier',
  category: 'concrete',
  title: '柱基礎・円柱基礎の体積',
  subtitle: '半径・深さと余裕率から、円柱基礎の生コン必要量を計算',
  keywords: ['コンクリート', '柱基礎', '独立基礎', 'フェンス', '生コン', '円柱'],
  shape: 'circle',

  fields: [
    lenField('r', '半径'),
    lenField('h', '深さ'),
    { key: 'margin', label: '余裕率（任意）', quantity: 'percent', defaultUnit: 'percent', optional: true },
    { key: 'V', label: '必要量', quantity: 'volume', defaultUnit: 'mm3', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['r', 'h', 'margin'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const base = Math.PI * v.r * v.r * v.h;
        const V = base * (1 + v.margin / 100);
        return {
          values: volumeTriple(V),
          formulaName: '柱基礎の体積',
          steps: [
            { formula: '基本体積 = π × 半径² × 深さ', substituted: `π × ${ctx.n(v.r, 'length')}² × ${ctx.n(v.h, 'length')}`, result: ctx.u(base, 'volume', 'L') },
            { formula: '必要量 = 基本体積 × (1 + 余裕率 ÷ 100)', substituted: `${ctx.n(base, 'volume', 'L')} × (1 + ${ctx.n(v.margin, 'percent')} ÷ 100)`, result: ctx.u(V, 'volume', 'L') }
          ]
        };
      }
    },
    {
      requires: ['r', 'h'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = Math.PI * v.r * v.r * v.h;
        return { values: volumeTriple(V), formulaName: '柱基礎の体積', steps: [{ formula: '体積 = π × 半径² × 深さ', substituted: `π × ${ctx.n(v.r, 'length')}² × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'L') }] };
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'h', label: '深さ', quantity: 'length' },
    { key: 'margin', label: '余裕率', quantity: 'percent' },
    ...VOLUME_OUTPUTS
  ],

  notEnoughHint(enteredKeys) {
    if (enteredKeys.length <= 2 && enteredKeys.includes('margin')) return '半径と深さを入力してください（余裕率は任意項目です）';
    return null;
  },

  notes: NOTES
};

/* ==================================================================== *
 * concrete.mix コンクリート・モルタルの配合
 * ==================================================================== *
 * 容積比 1 : a : b（セメント : 砂 : 砂利）で練るとき、材料は練り混ぜると
 * すき間に入り込んで体積が減るため、割増係数（実積率の逆数にあたる）をかける。
 */

const MIX_NOTE =
  '容積比の目安: コンクリート（1 : 3 : 6）／モルタル（1 : 3、砂利なし）／' +
  '強度を出したいとき（1 : 2 : 4）。割増係数は 1.5〜1.7 程度がよく使われます。';

export const concreteMix = {
  id: 'concrete.mix',
  category: 'concrete',
  title: 'コンクリート・モルタルの配合',
  subtitle: '容積比から、セメント・砂・砂利それぞれの必要量を計算',
  keywords: ['配合', '調合', 'セメント', '砂', '砂利', 'モルタル', '容積比', '練る'],
  shape: null,

  fields: [
    { key: 'V', label: '仕上がりの体積', quantity: 'volume', defaultUnit: 'L', min: 0, exclusiveMin: true, optional: true, fixedUnit: true },
    { key: 'rc', label: 'セメントの比', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: MIX_NOTE },
    { key: 'rs', label: '砂の比', quantity: 'number', defaultUnit: 'number', min: 0, optional: true },
    { key: 'rg', label: '砂利の比', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: 'モルタルの場合は 0' },
    { key: 'bulk', label: '割増係数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '練ると体積が減る分の割増。1.5〜1.7 程度' }
  ],

  solvers: [
    {
      requires: ['V', 'rc', 'rs', 'rg', 'bulk'],
      provides: ['cement', 'sand', 'gravel', 'totalMaterial'],
      validate(v) {
        if (v.rc + v.rs + v.rg === 0) return calcError('ZERO', 'rc');
        return null;
      },
      run(v, ctx) {
        const sum = v.rc + v.rs + v.rg;
        const total = v.V * v.bulk;
        const cement = (total * v.rc) / sum;
        const sand = (total * v.rs) / sum;
        const gravel = (total * v.rg) / sum;
        return {
          values: { cement, sand, gravel, totalMaterial: total },
          formulaName: '配合',
          steps: [
            { formula: '材料の合計体積 = 仕上がり × 割増係数', substituted: `${ctx.n(v.V, 'volume', 'L')} × ${ctx.f(v.bulk)}`, result: ctx.u(total, 'volume', 'L') },
            { formula: 'セメント = 合計 × セメントの比 ÷ 比の合計', substituted: `${ctx.n(total, 'volume', 'L')} × ${ctx.f(v.rc)} ÷ ${ctx.f(sum)}`, result: ctx.u(cement, 'volume', 'L') },
            { formula: '砂 = 合計 × 砂の比 ÷ 比の合計', substituted: `${ctx.n(total, 'volume', 'L')} × ${ctx.f(v.rs)} ÷ ${ctx.f(sum)}`, result: ctx.u(sand, 'volume', 'L') },
            { formula: '砂利 = 合計 × 砂利の比 ÷ 比の合計', substituted: `${ctx.n(total, 'volume', 'L')} × ${ctx.f(v.rg)} ÷ ${ctx.f(sum)}`, result: ctx.u(gravel, 'volume', 'L') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'cement', label: 'セメント', quantity: 'volume', defaultUnit: 'L', fixedUnit: true, primary: true },
    { key: 'sand', label: '砂', quantity: 'volume', defaultUnit: 'L', fixedUnit: true, primary: true },
    { key: 'gravel', label: '砂利', quantity: 'volume', defaultUnit: 'L', fixedUnit: true },
    { key: 'totalMaterial', label: '材料の合計体積', quantity: 'volume', defaultUnit: 'L', fixedUnit: true }
  ],

  notes: NOTES.concat([MIX_NOTE, '容積比での概算です。強度が求められる場合は、質量での配合設計を専門家にご確認ください。'])
};

/* ==================================================================== *
 * concrete.rebar 鉄筋の本数・重量
 * ==================================================================== */

const REBAR_NOTE =
  '鉄筋の単位重量(kg/m): D10=0.560 / D13=0.995 / D16=1.560 / D19=2.250 / D22=3.040 / D25=3.980';

export const concreteRebar = {
  id: 'concrete.rebar',
  category: 'concrete',
  title: '鉄筋の本数・重量',
  subtitle: '配筋のピッチから、縦横の本数・総延長・重量を計算',
  keywords: ['鉄筋', '配筋', 'D10', 'D13', 'ピッチ', '重量', 'メッシュ', '土間'],
  shape: 'rectangle',
  shapeMap: { w: 'w', h: 'd', S: 'area' },

  fields: [
    lenField('w', '配筋する範囲の幅'),
    lenField('d', '配筋する範囲の奥行き'),
    lenField('pitch', '配筋のピッチ', '一般的な土間で 200mm 前後'),
    { key: 'unitW', label: '鉄筋の単位重量', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: REBAR_NOTE }
  ],

  solvers: [
    {
      requires: ['w', 'd', 'pitch', 'unitW'],
      provides: ['area', 'nx', 'ny', 'totalLength', 'weight'],
      validate(v) { if (v.pitch === 0) return calcError('ZERO', 'pitch'); return null; },
      run(v, ctx) {
        const nx = Math.floor(v.w / v.pitch) + 1; // 縦筋（幅方向に並ぶ、長さは奥行き）
        const ny = Math.floor(v.d / v.pitch) + 1; // 横筋（奥行き方向に並ぶ、長さは幅）
        const totalLength = nx * v.d + ny * v.w;
        const weight = (totalLength / 1000) * v.unitW;
        return {
          values: { area: v.w * v.d, nx, ny, totalLength, weight },
          formulaName: '鉄筋の数量',
          steps: [
            { formula: '縦方向の本数 = 幅 ÷ ピッチ + 1（切り捨て）', substituted: `${ctx.n(v.w, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: nx + ' 本' },
            { formula: '横方向の本数 = 奥行き ÷ ピッチ + 1（切り捨て）', substituted: `${ctx.n(v.d, 'length')} ÷ ${ctx.n(v.pitch, 'length')} + 1`, result: ny + ' 本' },
            { formula: '総延長 = 縦本数 × 奥行き + 横本数 × 幅', substituted: `${nx} × ${ctx.n(v.d, 'length')} + ${ny} × ${ctx.n(v.w, 'length')}`, result: ctx.u(totalLength, 'length') },
            { formula: '重量 = 総延長[m] × 単位重量', substituted: `${ctx.f(totalLength / 1000)} × ${ctx.f(v.unitW)}`, result: ctx.u(weight, 'weight') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'area', label: '配筋する面積', quantity: 'area' },
    { key: 'nx', label: '縦方向の本数', quantity: 'number', primary: true },
    { key: 'ny', label: '横方向の本数', quantity: 'number', primary: true },
    { key: 'totalLength', label: '鉄筋の総延長', quantity: 'length' },
    { key: 'weight', label: '鉄筋の重量', quantity: 'weight', defaultUnit: 'kg', fixedUnit: true }
  ],

  notes: NOTES.concat([REBAR_NOTE, '定着・重ね継手の長さは含みません。実際の必要量はこれより多くなります。'])
};

/* ==================================================================== *
 * concrete.formwork 型枠の面積・材料
 * ==================================================================== */

export const concreteFormwork = {
  id: 'concrete.formwork',
  category: 'concrete',
  title: '型枠の面積・材料',
  subtitle: '打設する範囲の寸法から、型枠の面積・コンパネの枚数・桟木の長さを計算',
  keywords: ['型枠', 'かたわく', 'コンパネ', 'せき板', '打設', '基礎', '土間', '桟木', 'ベニヤ'],
  shape: 'box3d',
  shapeMap: { w: 'w', d: 'd', h: 'h' },

  fields: [
    lenField('w', '打設する幅'),
    lenField('d', '打設する奥行き'),
    lenField('h', '打設する高さ（厚み）'),
    lenField('panelW', 'コンパネの幅', 'サブロク板なら 910mm'),
    lenField('panelH', 'コンパネの長さ', 'サブロク板なら 1820mm')
  ],

  solvers: [
    {
      requires: ['w', 'd', 'h', 'panelW', 'panelH'],
      provides: ['perimeter', 'formArea', 'panelArea', 'panels', 'V_mm3', 'V_m3', 'V_L'],
      validate(v) {
        if (v.panelW === 0 || v.panelH === 0) return calcError('ZERO', 'panelW');
        return null;
      },
      run(v, ctx) {
        const perimeter = 2 * (v.w + v.d);
        const formArea = perimeter * v.h;
        const panelArea = v.panelW * v.panelH;
        const panels = Math.ceil(formArea / panelArea);
        const V = v.w * v.d * v.h;
        return {
          values: { perimeter, formArea, panelArea, panels, V_mm3: V, V_m3: V, V_L: V },
          formulaName: '型枠の数量',
          steps: [
            { formula: '周長 = (幅 + 奥行き) × 2', substituted: `(${ctx.n(v.w, 'length')} + ${ctx.n(v.d, 'length')}) × 2`, result: ctx.u(perimeter, 'length') },
            { formula: '型枠の面積 = 周長 × 高さ', substituted: `${ctx.n(perimeter, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(formArea, 'area') },
            { formula: 'コンパネ枚数 = 型枠面積 ÷ 1枚の面積（切り上げ）', substituted: `${ctx.n(formArea, 'area')} ÷ ${ctx.n(panelArea, 'area')}`, result: panels + ' 枚' },
            { formula: 'コンクリート体積 = 幅 × 奥行き × 高さ', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'm3') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'formArea', label: '型枠の面積', quantity: 'area', primary: true },
    { key: 'panels', label: 'コンパネの枚数', quantity: 'number', primary: true },
    { key: 'perimeter', label: '周長', quantity: 'length' },
    { key: 'panelArea', label: 'コンパネ1枚の面積', quantity: 'area' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES.concat([
    'コンパネの枚数は面積を割っただけの目安です。実際は切り方・継ぎ目・端材の出方で必要枚数が変わります。',
    '型枠は打設したコンクリートの重さに耐える必要があります。支保工・締付けの仕様は専門家にご確認ください。'
  ])
};

export default [concreteSlab, concretePier, concreteMix, concreteRebar, concreteFormwork];
