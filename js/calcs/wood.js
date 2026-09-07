// wood.js — CALC_SPEC.md「木工・DIY寸法」（Phase 4 第1グループ）
//
// wood.brace（筋交い・斜材の長さ）/ wood.miter（留め継ぎ・任意角度カット）/
// wood.cut45（45度カット寸法）/ wood.diagonal（板の対角線・直角出し）。
//
// 設計注記: CALC_SPEC.md の説明は各計算とも一方向の式のみが明記されている
// （例: wood.miter は「接合角度→カット角度＝角度÷2」）。本アプリの他の計算と
// 挙動を揃えるため、既存パターン（optional fields + 複数 solver）に沿って
// 妥当な逆算方向も併せて実装した。数式は spec 記載の式と一致させている。

import { calcError } from '../core/errors.js';
import { RAD_TO_DEG } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const lenField = (key, label, help, extra) =>
  Object.assign({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help }, extra);

/* ==================================================================== *
 * wood.brace 筋交い・斜材の長さ
 * 横幅 w・高さ h → 斜材長 len・下端の角度 angBottom・上端の角度 angTop
 * （tri.right と同一の直角三角形の関係。角度の主眼が「材の切断角度」である点が異なる）
 * ==================================================================== */

const BRACE_ANGLE_MSG = '角度は0°より大きく90°より小さい値にしてください';

const braceAngleField = (key, label, help) => ({
  key,
  label,
  quantity: 'angle',
  defaultUnit: 'deg',
  min: 0,
  max: 90,
  exclusiveMin: true,
  optional: true,
  rangeMessage: BRACE_ANGLE_MSG,
  help
});

function braceTail(all, derived, steps, ctx, input) {
  if (input.angTop === undefined) {
    all.angTop = 90 - all.angBottom;
    derived.angTop = all.angTop;
    steps.push({
      formula: '上端角度 = 90° − 下端角度',
      substituted: `90° − ${ctx.u(all.angBottom, 'angle')}`,
      result: ctx.u(all.angTop, 'angle')
    });
  }
}

const braceSolvers = [
  {
    // 横幅・高さ → 斜材長・両端角度（CALC_SPEC記載の主方向）
    requires: ['w', 'h'],
    provides: ['len', 'angBottom', 'angTop'],
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      all.len = Math.hypot(v.w, v.h);
      derived.len = all.len;
      steps.push({
        formula: '斜材長 = √(横幅² + 高さ²)',
        substituted: `√(${ctx.n(v.w, 'length')}² + ${ctx.n(v.h, 'length')}²)`,
        result: ctx.u(all.len, 'length')
      });
      all.angBottom = Math.atan2(v.h, v.w) * RAD_TO_DEG;
      derived.angBottom = all.angBottom;
      steps.push({
        formula: '下端角度 = atan(高さ ÷ 横幅)',
        substituted: `atan(${ctx.n(v.h, 'length')} ÷ ${ctx.n(v.w, 'length')})`,
        result: ctx.u(all.angBottom, 'angle')
      });
      braceTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三平方の定理', steps };
    }
  },
  {
    // 横幅・斜材長 → 高さ・両端角度
    requires: ['w', 'len'],
    provides: ['h', 'angBottom', 'angTop'],
    validate(v) {
      if (v.len <= v.w) return calcError('RIGHT_HYP', 'len');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      all.h = Math.sqrt(v.len * v.len - v.w * v.w);
      derived.h = all.h;
      steps.push({
        formula: '高さ = √(斜材長² − 横幅²)',
        substituted: `√(${ctx.n(v.len, 'length')}² − ${ctx.n(v.w, 'length')}²)`,
        result: ctx.u(all.h, 'length')
      });
      all.angBottom = Math.acos(v.w / v.len) * RAD_TO_DEG;
      derived.angBottom = all.angBottom;
      steps.push({
        formula: '下端角度 = acos(横幅 ÷ 斜材長)',
        substituted: `acos(${ctx.n(v.w, 'length')} ÷ ${ctx.n(v.len, 'length')})`,
        result: ctx.u(all.angBottom, 'angle')
      });
      braceTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三平方の定理', steps };
    }
  },
  {
    // 高さ・斜材長 → 横幅・両端角度
    requires: ['h', 'len'],
    provides: ['w', 'angBottom', 'angTop'],
    validate(v) {
      if (v.len <= v.h) return calcError('RIGHT_HYP', 'len');
      return null;
    },
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      all.w = Math.sqrt(v.len * v.len - v.h * v.h);
      derived.w = all.w;
      steps.push({
        formula: '横幅 = √(斜材長² − 高さ²)',
        substituted: `√(${ctx.n(v.len, 'length')}² − ${ctx.n(v.h, 'length')}²)`,
        result: ctx.u(all.w, 'length')
      });
      all.angBottom = Math.asin(v.h / v.len) * RAD_TO_DEG;
      derived.angBottom = all.angBottom;
      steps.push({
        formula: '下端角度 = asin(高さ ÷ 斜材長)',
        substituted: `asin(${ctx.n(v.h, 'length')} ÷ ${ctx.n(v.len, 'length')})`,
        result: ctx.u(all.angBottom, 'angle')
      });
      braceTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三平方の定理', steps };
    }
  },
  {
    // 横幅・下端角度 → 高さ・斜材長・上端角度
    requires: ['w', 'angBottom'],
    provides: ['h', 'len', 'angTop'],
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const rad = (v.angBottom * Math.PI) / 180;
      all.h = v.w * Math.tan(rad);
      derived.h = all.h;
      steps.push({
        formula: '高さ = 横幅 × tan(下端角度)',
        substituted: `${ctx.n(v.w, 'length')} × tan(${ctx.u(v.angBottom, 'angle')})`,
        result: ctx.u(all.h, 'length')
      });
      all.len = v.w / Math.cos(rad);
      derived.len = all.len;
      steps.push({
        formula: '斜材長 = 横幅 ÷ cos(下端角度)',
        substituted: `${ctx.n(v.w, 'length')} ÷ cos(${ctx.u(v.angBottom, 'angle')})`,
        result: ctx.u(all.len, 'length')
      });
      braceTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三角比', steps };
    }
  },
  {
    // 高さ・下端角度 → 横幅・斜材長・上端角度
    requires: ['h', 'angBottom'],
    provides: ['w', 'len', 'angTop'],
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const rad = (v.angBottom * Math.PI) / 180;
      all.w = v.h / Math.tan(rad);
      derived.w = all.w;
      steps.push({
        formula: '横幅 = 高さ ÷ tan(下端角度)',
        substituted: `${ctx.n(v.h, 'length')} ÷ tan(${ctx.u(v.angBottom, 'angle')})`,
        result: ctx.u(all.w, 'length')
      });
      all.len = v.h / Math.sin(rad);
      derived.len = all.len;
      steps.push({
        formula: '斜材長 = 高さ ÷ sin(下端角度)',
        substituted: `${ctx.n(v.h, 'length')} ÷ sin(${ctx.u(v.angBottom, 'angle')})`,
        result: ctx.u(all.len, 'length')
      });
      braceTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三角比', steps };
    }
  },
  {
    // 斜材長・下端角度 → 横幅・高さ・上端角度
    requires: ['len', 'angBottom'],
    provides: ['w', 'h', 'angTop'],
    run(v, ctx) {
      const all = Object.assign({}, v);
      const derived = {};
      const steps = [];
      const rad = (v.angBottom * Math.PI) / 180;
      all.w = v.len * Math.cos(rad);
      derived.w = all.w;
      steps.push({
        formula: '横幅 = 斜材長 × cos(下端角度)',
        substituted: `${ctx.n(v.len, 'length')} × cos(${ctx.u(v.angBottom, 'angle')})`,
        result: ctx.u(all.w, 'length')
      });
      all.h = v.len * Math.sin(rad);
      derived.h = all.h;
      steps.push({
        formula: '高さ = 斜材長 × sin(下端角度)',
        substituted: `${ctx.n(v.len, 'length')} × sin(${ctx.u(v.angBottom, 'angle')})`,
        result: ctx.u(all.h, 'length')
      });
      braceTail(all, derived, steps, ctx, v);
      return { values: derived, formulaName: '三角比', steps };
    }
  }
];

export const woodBrace = {
  id: 'wood.brace',
  category: 'wood',
  title: '筋交い・斜材の長さ',
  subtitle: '横幅・高さから斜材の長さと両端の切断角度を計算',
  keywords: ['筋交い', 'すじかい', 'ブレース', '斜材', '斜め', '木工', '切断角度'],
  shape: 'rightTriangle',
  shapeMap: { a: 'w', b: 'h', c: 'len', angA: 'angBottom', angC: 'angTop' },

  fields: [
    lenField('w', '横幅', '枠の横方向の長さ'),
    lenField('h', '高さ', '枠の縦方向の長さ'),
    lenField('len', '斜材長', '筋交い材そのものの長さ'),
    braceAngleField('angBottom', '下端の角度', '材の下端で切る角度'),
    braceAngleField('angTop', '上端の角度', '材の上端で切る角度')
  ],

  solvers: braceSolvers,

  outputs: [
    { key: 'w', label: '横幅', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'len', label: '斜材長', quantity: 'length' },
    { key: 'angBottom', label: '下端の角度', quantity: 'angle' },
    { key: 'angTop', label: '上端の角度', quantity: 'angle' }
  ],

  notes: NOTES,

  notEnoughHint(enteredKeys, def) {
    if (enteredKeys.length < 2) return null;
    const allAngle = enteredKeys.every((k) => {
      const f = def.fields.find((x) => x.key === k);
      return f && f.quantity === 'angle';
    });
    if (allAngle) return '角度だけでは大きさが決まりません。長さを1つ入れてください';
    return null;
  }
};

/* ==================================================================== *
 * wood.miter 留め継ぎ・任意角度カット
 * 接合角度 jointAngle → カット角度 miterAngle = jointAngle ÷ 2
 * ==================================================================== */

const MITER_ANGLE_MSG = '角度は0°より大きく180°より小さい値にしてください';

const miterAngleField = (key, label, help) => ({
  key,
  label,
  quantity: 'angle',
  defaultUnit: 'deg',
  min: 0,
  max: 180,
  exclusiveMin: true,
  exclusiveMax: true,
  optional: true,
  rangeMessage: MITER_ANGLE_MSG,
  help
});

export const woodMiter = {
  id: 'wood.miter',
  category: 'wood',
  title: '留め継ぎ・任意角度カット',
  subtitle: '接合角度からカット角度（半分）を計算',
  keywords: ['留め継ぎ', 'とめつぎ', 'マイター', '角度カット', '木工', '額縁', 'フレーム'],
  shape: 'miterAngle',

  fields: [
    miterAngleField('jointAngle', '接合角度', '2枚の材が作る角（例: 四角い枠の角は90°）'),
    miterAngleField('cutAngle', 'カット角度', '材の木口を切る角度（接合角度の半分）')
  ],

  solvers: [
    {
      requires: ['jointAngle'],
      provides: ['cutAngle'],
      run(v, ctx) {
        const cutAngle = v.jointAngle / 2;
        return {
          values: { cutAngle },
          formulaName: 'カット角度',
          steps: [{ formula: 'カット角度 = 接合角度 ÷ 2', substituted: `${ctx.n(v.jointAngle, 'angle')} ÷ 2`, result: ctx.u(cutAngle, 'angle') }]
        };
      }
    },
    {
      requires: ['cutAngle'],
      provides: ['jointAngle'],
      run(v, ctx) {
        const jointAngle = v.cutAngle * 2;
        return {
          values: { jointAngle },
          formulaName: 'カット角度',
          steps: [{ formula: '接合角度 = カット角度 × 2', substituted: `${ctx.n(v.cutAngle, 'angle')} × 2`, result: ctx.u(jointAngle, 'angle') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'jointAngle', label: '接合角度', quantity: 'angle' },
    { key: 'cutAngle', label: 'カット角度', quantity: 'angle' }
  ],

  presets: [{ label: '90°（四角い枠）', values: { jointAngle: 90 } }],

  notes: NOTES
};

/* ==================================================================== *
 * wood.cut45 45度カット寸法
 * 材幅 width から、45度カット面の長さと、長い点・短い点の差を計算
 * ==================================================================== */

// 45度カットは材幅を2辺とする直角二等辺三角形（角度は常に45°/45°/90°で固定）。
// rightTriangle を width=a=b, diagLen=c として流用し、角度は常時45°の定数として
// angA/angC に出力する（17-6で保留していた「角度出力が無く図形上に空ラベルが残る」
// 問題を、定数出力の追加で解消した設計判断）。
const CUT45_ANGLE = 45;

export const woodCut45 = {
  id: 'wood.cut45',
  category: 'wood',
  title: '45度カット寸法',
  subtitle: '材の幅から45度カット面の長さと出寸法を計算',
  keywords: ['45度', 'カット', '木工', '角度カット', 'ミッター'],
  shape: 'rightTriangle',
  shapeMap: { a: 'width', b: 'width', c: 'diagLen', angA: 'angle', angC: 'angle' },

  fields: [
    lenField('width', '材の幅', '45度にカットする材の幅'),
    lenField('diagLen', 'カット面の長さ', '45度カットでできる切断面の長さ'),
    lenField('pointDiff', '長い点と短い点の差', '材の両端で生じる長さの差（＝材の幅と同じ）')
  ],

  solvers: [
    {
      requires: ['width'],
      provides: ['diagLen', 'pointDiff', 'angle'],
      run(v, ctx) {
        const diagLen = v.width * Math.SQRT2;
        const pointDiff = v.width;
        return {
          values: { diagLen, pointDiff, angle: CUT45_ANGLE },
          formulaName: '45度カット',
          steps: [
            { formula: 'カット面の長さ = 材の幅 × √2', substituted: `${ctx.n(v.width, 'length')} × √2`, result: ctx.u(diagLen, 'length') },
            { formula: '長短差 = 材の幅', substituted: ctx.u(v.width, 'length'), result: ctx.u(pointDiff, 'length') }
          ]
        };
      }
    },
    {
      requires: ['diagLen'],
      provides: ['width', 'pointDiff', 'angle'],
      run(v, ctx) {
        const width = v.diagLen / Math.SQRT2;
        const pointDiff = width;
        return {
          values: { width, pointDiff, angle: CUT45_ANGLE },
          formulaName: '45度カット',
          steps: [{ formula: '材の幅 = カット面の長さ ÷ √2', substituted: `${ctx.n(v.diagLen, 'length')} ÷ √2`, result: ctx.u(width, 'length') }]
        };
      }
    },
    {
      requires: ['pointDiff'],
      provides: ['width', 'diagLen', 'angle'],
      run(v, ctx) {
        const width = v.pointDiff;
        const diagLen = width * Math.SQRT2;
        return {
          values: { width, diagLen, angle: CUT45_ANGLE },
          formulaName: '45度カット',
          steps: [{ formula: '材の幅 = 長短差', substituted: ctx.u(v.pointDiff, 'length'), result: ctx.u(width, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'width', label: '材の幅', quantity: 'length' },
    { key: 'diagLen', label: 'カット面の長さ', quantity: 'length' },
    { key: 'pointDiff', label: '長い点と短い点の差', quantity: 'length' },
    { key: 'angle', label: '角度（材の両側とも45°）', quantity: 'angle' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * wood.diagonal 板の対角線・直角出し（3-4-5の実寸版）
 * ==================================================================== */

export const woodDiagonal = {
  id: 'wood.diagonal',
  category: 'wood',
  title: '板の対角線・直角出し',
  subtitle: '幅・高さ・対角線を相互計算し、直角の確認に使う（3-4-5の実寸版）',
  keywords: ['直角出し', '対角線', '3-4-5', 'さしがね', '木工', '土台', '基礎'],
  shape: 'rectangle',

  fields: [lenField('w', '幅'), lenField('h', '高さ'), lenField('d', '対角線')],

  solvers: [
    {
      requires: ['w', 'h'],
      provides: ['d'],
      run(v, ctx) {
        const d = Math.hypot(v.w, v.h);
        return {
          values: { d },
          formulaName: '対角線',
          steps: [{ formula: '対角線 = √(幅² + 高さ²)', substituted: `√(${ctx.n(v.w, 'length')}² + ${ctx.n(v.h, 'length')}²)`, result: ctx.u(d, 'length') }]
        };
      }
    },
    {
      requires: ['d', 'w'],
      provides: ['h'],
      validate(v) {
        if (v.d <= v.w) return calcError('RIGHT_HYP', 'd');
        return null;
      },
      run(v, ctx) {
        const h = Math.sqrt(v.d * v.d - v.w * v.w);
        return {
          values: { h },
          formulaName: '対角線',
          steps: [{ formula: '高さ = √(対角線² − 幅²)', substituted: `√(${ctx.n(v.d, 'length')}² − ${ctx.n(v.w, 'length')}²)`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['d', 'h'],
      provides: ['w'],
      validate(v) {
        if (v.d <= v.h) return calcError('RIGHT_HYP', 'd');
        return null;
      },
      run(v, ctx) {
        const w = Math.sqrt(v.d * v.d - v.h * v.h);
        return {
          values: { w },
          formulaName: '対角線',
          steps: [{ formula: '幅 = √(対角線² − 高さ²)', substituted: `√(${ctx.n(v.d, 'length')}² − ${ctx.n(v.h, 'length')}²)`, result: ctx.u(w, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '幅', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'd', label: '対角線', quantity: 'length' }
  ],

  presets: [{ label: '3-4-5（実寸1m）', values: { w: 3000, h: 4000 } }],

  notes: NOTES.concat(['対角線の長さが幅・高さから求めた値と一致すれば、その四角形は直角です。'])
};

/* ==================================================================== *
 * wood.yield 木取り（定尺材から何本取れるか）
 * ==================================================================== *
 * 切断のたびに鋸の刃厚（切りしろ）だけ材料が減る。n本取るのに必要な長さは
 * n×必要長 + (n−1)×切りしろ なので、取れる本数は
 * floor((定尺長 + 切りしろ) ÷ (必要長 + 切りしろ)) になる。
 */

export const woodYield = {
  id: 'wood.yield',
  category: 'wood',
  title: '木取り（定尺から何本取れるか）',
  subtitle: '定尺材の長さ・必要な長さ・切りしろから、取れる本数と端材を計算',
  keywords: ['木取り', 'きどり', '材料取り', '定尺', '切りしろ', '刃厚', '端材', '歩留まり', 'カット'],
  shape: 'lineSegment',
  shapeMap: { total: 'stock', pitch: 'piece' },

  fields: [
    lenField('stock', '定尺材の長さ', '購入する材料1本の長さ（例: 1820・2000・3000）'),
    lenField('piece', '必要な長さ', '切り出したい1本の長さ'),
    lenField('kerf', '切りしろ（刃厚）', '丸ノコで3mm前後、手ノコで1mm前後'),
    { key: 'need', label: '必要な本数', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['stock', 'piece', 'kerf', 'need'],
      provides: ['perStock', 'stockCount', 'remainder', 'usage'],
      validate(v) {
        if (v.piece + v.kerf === 0) return calcError('ZERO', 'piece');
        if (v.piece > v.stock) return calcError('RIGHT_HYP', 'piece');
        return null;
      },
      run(v, ctx) {
        const perStock = Math.floor((v.stock + v.kerf) / (v.piece + v.kerf));
        const stockCount = Math.ceil(v.need / perStock);
        const used = perStock * v.piece + (perStock - 1) * v.kerf;
        const remainder = v.stock - used;
        const usage = (used / v.stock) * 100;
        return {
          values: { perStock, stockCount, remainder, usage },
          formulaName: '木取り',
          steps: [
            { formula: '1本から取れる数 = (定尺長 + 切りしろ) ÷ (必要長 + 切りしろ)（切り捨て）', substituted: `(${ctx.n(v.stock, 'length')} + ${ctx.n(v.kerf, 'length')}) ÷ (${ctx.n(v.piece, 'length')} + ${ctx.n(v.kerf, 'length')})`, result: perStock + ' 本' },
            { formula: '必要な定尺材 = 必要本数 ÷ 1本から取れる数（切り上げ）', substituted: `${ctx.f(v.need)} ÷ ${perStock}`, result: stockCount + ' 本' },
            { formula: '端材 = 定尺長 − (必要長 × 取れる数 + 切りしろ × (取れる数−1))', substituted: `${ctx.n(v.stock, 'length')} − ${ctx.n(used, 'length')}`, result: ctx.u(remainder, 'length') },
            { formula: '歩留まり = 使った長さ ÷ 定尺長', substituted: `${ctx.n(used, 'length')} ÷ ${ctx.n(v.stock, 'length')}`, result: ctx.f(usage) + ' %' }
          ]
        };
      }
    },
    {
      requires: ['stock', 'piece', 'kerf'],
      provides: ['perStock', 'remainder', 'usage'],
      validate(v) {
        if (v.piece + v.kerf === 0) return calcError('ZERO', 'piece');
        if (v.piece > v.stock) return calcError('RIGHT_HYP', 'piece');
        return null;
      },
      run(v, ctx) {
        const perStock = Math.floor((v.stock + v.kerf) / (v.piece + v.kerf));
        const used = perStock * v.piece + (perStock - 1) * v.kerf;
        const remainder = v.stock - used;
        return {
          values: { perStock, remainder, usage: (used / v.stock) * 100 },
          formulaName: '木取り',
          steps: [
            { formula: '1本から取れる数 = (定尺長 + 切りしろ) ÷ (必要長 + 切りしろ)（切り捨て）', substituted: `(${ctx.n(v.stock, 'length')} + ${ctx.n(v.kerf, 'length')}) ÷ (${ctx.n(v.piece, 'length')} + ${ctx.n(v.kerf, 'length')})`, result: perStock + ' 本' },
            { formula: '端材', substituted: `${ctx.n(v.stock, 'length')} − ${ctx.n(used, 'length')}`, result: ctx.u(remainder, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'perStock', label: '定尺1本から取れる数', quantity: 'number', primary: true },
    { key: 'stockCount', label: '必要な定尺材の本数', quantity: 'number', primary: true },
    { key: 'remainder', label: '1本あたりの端材', quantity: 'length' },
    { key: 'usage', label: '歩留まり（%）', quantity: 'number' }
  ],

  notes: NOTES.concat(['木口の面取りや反りの切り落とし分は含みません。実際にはもう少し余裕をみてください。'])
};

/* ==================================================================== *
 * wood.moisture 含水率による寸法変化
 * ==================================================================== */

const SHRINK_NOTE =
  '収縮係数の目安（含水率1%あたりの寸法変化率）: 接線方向（板目の幅） 0.25〜0.35 / ' +
  '放射方向（柾目の幅） 0.10〜0.20 / 繊維方向（長さ） 0.01前後。樹種によって差があります。';

export const woodMoisture = {
  id: 'wood.moisture',
  category: 'wood',
  title: '含水率による寸法変化',
  subtitle: '木材が乾く・湿るときの伸び縮みを計算',
  keywords: ['含水率', '乾燥', '収縮', '膨張', '狂い', '反り', '寸法変化', '木材'],
  shape: 'rectangle',
  shapeMap: { w: 'w0' },
  fields: [
    lenField('w0', '今の寸法'),
    { key: 'u0', label: '今の含水率（%）', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: '生材は30%以上、人工乾燥材は15%前後、室内で落ち着くと8〜12%程度' },
    { key: 'u1', label: '変化後の含水率（%）', quantity: 'number', defaultUnit: 'number', min: 0, optional: true },
    { key: 'k', label: '収縮係数', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: SHRINK_NOTE }
  ],

  solvers: [
    {
      requires: ['w0', 'u0', 'u1', 'k'],
      provides: ['w1', 'delta'],
      run(v, ctx) {
        const rate = (v.k / 100) * (v.u1 - v.u0);
        const w1 = v.w0 * (1 + rate);
        const delta = w1 - v.w0;
        return {
          values: { w1, delta },
          formulaName: '含水率による寸法変化',
          steps: [
            { formula: '変化率 = 収縮係数 ÷ 100 × (変化後の含水率 − 今の含水率)', substituted: `${ctx.f(v.k)} ÷ 100 × (${ctx.f(v.u1)} − ${ctx.f(v.u0)})`, result: ctx.f(rate * 100) + ' %' },
            { formula: '変化後の寸法 = 今の寸法 × (1 + 変化率)', substituted: `${ctx.n(v.w0, 'length')} × ${ctx.f(1 + rate)}`, result: ctx.u(w1, 'length') },
            { formula: '変化量', substituted: `${ctx.n(w1, 'length')} − ${ctx.n(v.w0, 'length')}`, result: ctx.u(delta, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'w1', label: '変化後の寸法', quantity: 'length', primary: true },
    { key: 'delta', label: '変化量', quantity: 'length', primary: true, help: 'マイナスは縮み、プラスは膨らみを表します' }
  ],

  notes: NOTES.concat([
    SHRINK_NOTE,
    '繊維飽和点（含水率およそ30%）より上では、含水率が変わっても寸法はほとんど変わりません。'
  ])
};

/* ==================================================================== *
 * wood.plywood 板取り（合板・定尺板から何枚取れるか）
 *
 * 木取り（wood.yield）が1方向の棒材なのに対し、こちらは2次元。
 * 部材を縦向き・横向きの2通りで並べて、多く取れる方を採用する。
 * ==================================================================== */

export const woodPlywood = {
  id: 'wood.plywood',
  category: 'wood',
  title: '板取り（合板から何枚取れるか）',
  subtitle: '母材の板から、部材を縦向き・横向きで何枚取れるかを比較',
  keywords: ['板取り', '木取り', '合板', 'コンパネ', '定尺', '割付', '何枚', 'サブロク', '歩留まり'],
  shape: 'rectangle',
  shapeMap: { w: 'sheetW', h: 'sheetH', S: 'sheetArea' },

  fields: [
    lenField('sheetW', '母材の幅', 'サブロク板なら 910mm'),
    lenField('sheetH', '母材の長さ', 'サブロク板なら 1820mm'),
    lenField('pieceW', '部材の幅'),
    lenField('pieceH', '部材の長さ'),
    lenField('kerf', '切りしろ', '丸ノコの刃厚。3mm程度', { exclusiveMin: false })
  ],

  solvers: [
    {
      requires: ['sheetW', 'sheetH', 'pieceW', 'pieceH', 'kerf'],
      provides: ['sheetArea', 'countA', 'countB', 'count', 'usedArea', 'wasteArea', 'yieldPct'],
      validate(v) {
        if (v.pieceW + v.kerf === 0) return calcError('ZERO', 'pieceW');
        if (v.pieceH + v.kerf === 0) return calcError('ZERO', 'pieceH');
        return null;
      },
      run(v, ctx) {
        // 切りしろは部材どうしの間に入るので、部材寸法に足した「1コマ」で割る
        const fit = (span, size) => Math.floor((span + v.kerf) / (size + v.kerf));
        const countA = fit(v.sheetW, v.pieceW) * fit(v.sheetH, v.pieceH);
        const countB = fit(v.sheetW, v.pieceH) * fit(v.sheetH, v.pieceW);
        const count = Math.max(countA, countB);
        const sheetArea = v.sheetW * v.sheetH;
        const usedArea = count * v.pieceW * v.pieceH;
        const wasteArea = sheetArea - usedArea;
        const yieldPct = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;
        return {
          values: { sheetArea, countA, countB, count, usedArea, wasteArea, yieldPct },
          formulaName: '板取り',
          steps: [
            {
              formula: 'そのまま並べる = (母材幅+切りしろ)÷(部材幅+切りしろ) × (母材長+切りしろ)÷(部材長+切りしろ)',
              substituted: `${fit(v.sheetW, v.pieceW)} 列 × ${fit(v.sheetH, v.pieceH)} 段`,
              result: countA + ' 枚'
            },
            {
              formula: '90°回して並べる',
              substituted: `${fit(v.sheetW, v.pieceH)} 列 × ${fit(v.sheetH, v.pieceW)} 段`,
              result: countB + ' 枚'
            },
            { formula: '多い方を採用', substituted: `max(${countA}, ${countB})`, result: count + ' 枚' },
            { formula: '歩留まり = 部材の合計面積 ÷ 母材の面積', substituted: `${ctx.n(usedArea, 'area')} ÷ ${ctx.n(sheetArea, 'area')}`, result: ctx.f(yieldPct) + ' %' }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'count', label: '取れる枚数', quantity: 'number', primary: true },
    { key: 'yieldPct', label: '歩留まり', quantity: 'percent', primary: true },
    { key: 'countA', label: 'そのままの向きで', quantity: 'number' },
    { key: 'countB', label: '90°回した向きで', quantity: 'number' },
    { key: 'sheetArea', label: '母材の面積', quantity: 'area' },
    { key: 'usedArea', label: '部材の合計面積', quantity: 'area' },
    { key: 'wasteArea', label: '端材の面積', quantity: 'area' }
  ],

  notes: NOTES.concat([
    '部材をすべて同じ向きにそろえて並べた場合の枚数です。向きを混ぜた並べ方や、端材からの追加取りは考えていません。',
    '合板には木目（繊維）の向きがあります。向きの指定がある部材では、取れる枚数が減ることがあります。'
  ])
};

/* ==================================================================== *
 * wood.arc 円弧・アール（弦と矢から半径）
 *
 * 曲線をけがくときの定番。弦 c と矢（中央のふくらみ）v から
 *   R = c² ÷ (8v) + v ÷ 2
 * ==================================================================== */

export const woodArc = {
  id: 'wood.arc',
  category: 'wood',
  title: '円弧・アール（弦と矢から半径）',
  subtitle: '両端の間隔とふくらみから、曲線の半径・弧長・中心角を計算',
  keywords: ['円弧', 'アール', 'R', '曲線', '弦', '矢', 'ふくらみ', '半径', 'カーブ', '曲げ', 'けがき'],
  shape: 'arcSegment',

  fields: [
    lenField('chord', '弦（両端の間隔）', '曲線の始点から終点までの直線距離'),
    lenField('rise', '矢（中央のふくらみ）', '弦の中央から曲線までの高さ'),
    lenField('r', '半径')
  ],

  solvers: [
    {
      requires: ['chord', 'rise'],
      provides: ['r', 'theta', 'arcLen'],
      validate(v) {
        if (v.rise > v.chord / 2) return calcError('DOMAIN', 'rise');
        return null;
      },
      run(v, ctx) {
        const r = (v.chord * v.chord) / (8 * v.rise) + v.rise / 2;
        return arcResult(r, v.chord, ctx, [
          { formula: '半径 = 弦² ÷ (8 × 矢) + 矢 ÷ 2', substituted: `${ctx.n(v.chord, 'length')}² ÷ (8 × ${ctx.n(v.rise, 'length')}) + ${ctx.n(v.rise, 'length')} ÷ 2`, result: ctx.u(r, 'length') }
        ]);
      }
    },
    {
      requires: ['chord', 'r'],
      provides: ['rise', 'theta', 'arcLen'],
      validate(v) {
        if (v.r < v.chord / 2) return calcError('DOMAIN', 'r');
        return null;
      },
      run(v, ctx) {
        const rise = v.r - Math.sqrt(v.r * v.r - (v.chord / 2) * (v.chord / 2));
        const res = arcResult(v.r, v.chord, ctx, [
          { formula: '矢 = 半径 − √(半径² − (弦÷2)²)', substituted: `${ctx.n(v.r, 'length')} − √(${ctx.n(v.r, 'length')}² − ${ctx.n(v.chord / 2, 'length')}²)`, result: ctx.u(rise, 'length') }
        ]);
        res.values.rise = rise;
        delete res.values.r;
        return res;
      }
    },
    {
      requires: ['rise', 'r'],
      provides: ['chord', 'theta', 'arcLen'],
      validate(v) {
        if (v.rise > 2 * v.r) return calcError('DOMAIN', 'rise');
        return null;
      },
      run(v, ctx) {
        const chord = 2 * Math.sqrt(Math.max(0, 2 * v.r * v.rise - v.rise * v.rise));
        const res = arcResult(v.r, chord, ctx, [
          { formula: '弦 = 2 × √(2 × 半径 × 矢 − 矢²)', substituted: `2 × √(2 × ${ctx.n(v.r, 'length')} × ${ctx.n(v.rise, 'length')} − ${ctx.n(v.rise, 'length')}²)`, result: ctx.u(chord, 'length') }
        ]);
        res.values.chord = chord;
        delete res.values.r;
        return res;
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length', primary: true },
    { key: 'rise', label: '矢（ふくらみ）', quantity: 'length' },
    { key: 'chord', label: '弦（両端の間隔）', quantity: 'length' },
    { key: 'arcLen', label: '弧の長さ', quantity: 'length', primary: true },
    { key: 'theta', label: '中心角', quantity: 'angle' }
  ],

  notes: NOTES.concat([
    '半径が板の外に出るほど大きい場合は、弦と矢のまま数点を出してけがく方法（弦を分割して各点の矢を求める）が実用的です。'
  ])
};

function arcResult(r, chord, ctx, headSteps) {
  const half = Math.asin(Math.min(1, chord / 2 / r));
  const theta = 2 * half * RAD_TO_DEG;
  const arcLen = 2 * r * half;
  return {
    values: { r, theta, arcLen },
    formulaName: '円弧',
    steps: headSteps.concat([
      { formula: '中心角 = 2 × asin(弦 ÷ 2 ÷ 半径)', substituted: `2 × asin(${ctx.n(chord / 2, 'length')} ÷ ${ctx.n(r, 'length')})`, result: ctx.u(theta, 'angle') },
      { formula: '弧長 = 半径 × 中心角(rad)', substituted: `${ctx.n(r, 'length')} × ${ctx.f(2 * half)}`, result: ctx.u(arcLen, 'length') }
    ])
  };
}

/* ==================================================================== *
 * wood.taper テーパー（先細りのカット）
 * ==================================================================== */

export const woodTaper = {
  id: 'wood.taper',
  category: 'wood',
  title: 'テーパー（先細りのカット）',
  subtitle: '両端の幅と長さから、片側の削り量・角度・勾配を計算',
  keywords: ['テーパー', '先細り', '斜めカット', '脚', '勾配', 'すぼまり', '傾斜', 'カット'],
  shape: 'trapezoid',
  shapeMap: { a: 'wTop', b: 'wBottom', h: 'len' },

  fields: [
    lenField('wBottom', '太い方の幅'),
    lenField('wTop', '細い方の幅'),
    lenField('len', '長さ', 'テーパーが付く区間の長さ'),
    { key: 'angle', label: '傾きの角度', quantity: 'angle', defaultUnit: 'deg', min: 0, exclusiveMin: true, optional: true, help: '材の縁に対する片側の角度' }
  ],

  solvers: [
    {
      requires: ['wBottom', 'wTop', 'len'],
      provides: ['diff', 'perSide', 'angle', 'slopePercent', 'ratio'],
      run(v, ctx) {
        const diff = v.wBottom - v.wTop;
        const perSide = diff / 2;
        const angle = Math.atan2(perSide, v.len) * RAD_TO_DEG;
        const slopePercent = (perSide / v.len) * 100;
        const ratio = perSide === 0 ? 0 : v.len / perSide;
        return {
          values: { diff, perSide, angle, slopePercent, ratio },
          formulaName: 'テーパー',
          steps: [
            { formula: '幅の差 = 太い方 − 細い方', substituted: `${ctx.n(v.wBottom, 'length')} − ${ctx.n(v.wTop, 'length')}`, result: ctx.u(diff, 'length') },
            { formula: '片側の削り量 = 幅の差 ÷ 2', substituted: `${ctx.n(diff, 'length')} ÷ 2`, result: ctx.u(perSide, 'length') },
            { formula: '角度 = atan(片側の削り量 ÷ 長さ)', substituted: `atan(${ctx.n(perSide, 'length')} ÷ ${ctx.n(v.len, 'length')})`, result: ctx.u(angle, 'angle') },
            { formula: '勾配 = 片側の削り量 ÷ 長さ × 100', substituted: `${ctx.n(perSide, 'length')} ÷ ${ctx.n(v.len, 'length')} × 100`, result: ctx.f(slopePercent) + ' %' }
          ]
        };
      }
    },
    {
      requires: ['wBottom', 'len', 'angle'],
      provides: ['wTop', 'diff', 'perSide', 'slopePercent', 'ratio'],
      run(v, ctx) {
        const perSide = v.len * Math.tan(v.angle / RAD_TO_DEG);
        const diff = perSide * 2;
        const wTop = v.wBottom - diff;
        const slopePercent = (perSide / v.len) * 100;
        const ratio = perSide === 0 ? 0 : v.len / perSide;
        return {
          values: { wTop, diff, perSide, slopePercent, ratio },
          formulaName: 'テーパー',
          steps: [
            { formula: '片側の削り量 = 長さ × tan(角度)', substituted: `${ctx.n(v.len, 'length')} × tan(${ctx.u(v.angle, 'angle')})`, result: ctx.u(perSide, 'length') },
            { formula: '細い方の幅 = 太い方 − 片側 × 2', substituted: `${ctx.n(v.wBottom, 'length')} − ${ctx.n(perSide, 'length')} × 2`, result: ctx.u(wTop, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'wTop', label: '細い方の幅', quantity: 'length' },
    { key: 'perSide', label: '片側の削り量', quantity: 'length', primary: true },
    { key: 'angle', label: '傾きの角度', quantity: 'angle', primary: true },
    { key: 'diff', label: '幅の差（両側の合計）', quantity: 'length' },
    { key: 'slopePercent', label: '勾配', quantity: 'percent' },
    { key: 'ratio', label: '勾配比（1:n の n）', quantity: 'number' }
  ],

  notes: NOTES.concat(['両側から同じだけ削る場合の値です。片側だけ削る場合は「幅の差」をそのまま片側の削り量として使ってください。'])
};

export default [
  woodBrace, woodMiter, woodCut45, woodDiagonal, woodYield, woodMoisture,
  woodPlywood, woodArc, woodTaper
];
