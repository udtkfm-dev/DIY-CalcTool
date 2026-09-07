// stair.js — CALC_SPEC.md「階段」（Phase 4 第3グループ）
//
// 設計注記: 階高H・段数n・蹴上げR・踏面T・全長L・角度・斜距離の7項目は数学的に
// 独立ではない（H=n×R、L=(n−1)×T、angle=atan(R/T)、slant=√(H²+L²)）。
// spec が明示する「段数から蹴上げ、蹴上げから段数の両方向」を中心に、実用上
// 有用な組み合わせに絞って solver を実装した（全項目間の総当たり逆算はしない。
// tri.any の SSA と同様、簡略化として notes に明記）。
//
// 【本セッションで判明したsolver.js設計との相互作用】当初「H,n,T の3つが揃えば
// R,L,angle,slant を全部返す」solverも用意したが、solve()は常に「直近に触った
// 最小個数で一致する解法」を採用するため（solver.js 手順2-3のコメント参照）、
// H,n,T の一部（H,n や n,T）が先に2件solverと一致し、3件solverには到達しない
// （tri.any のように「2件の組み合わせでは一致するsolverが存在しない」場合のみ
// 3件以上のsolverが実際に選ばれる）。よって2件solverの部分集合になる3件以上の
// solverは事実上デッドコードになるため、本ファイルでは追加しなかった
// （一度追加して到達不能と判明し削除した実績あり。次に多項目solverを設計する際は
// 「小さいrequiresの部分集合が既存solverと一致しないか」を先に確認すること）。

import { calcError } from '../core/errors.js';
import { RAD_TO_DEG } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。',
  '蹴上げ・踏面の推奨寸法は建物や用途によって基準が異なります。必ず該当する仕様をご確認ください。'
];

const lenField = (key, label, help) => ({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help });
const numField = (key, label, help, extra) => Object.assign({ key, label, quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help }, extra);

/* ==================================================================== *
 * stair.main
 * ==================================================================== */

export const stairMain = {
  id: 'stair.main',
  category: 'stair',
  title: '階段の段数・蹴上げ・踏面',
  subtitle: '階高・段数・蹴上げ・踏面・全長・角度・斜距離を相互計算',
  keywords: ['階段', '段数', '蹴上げ', '踏面', 'けあげ', 'ふみづら', '階高'],
  shape: 'rightTriangle',
  shapeMap: { a: 'L', b: 'H', c: 'slant', angA: 'angle' },

  fields: [
    lenField('H', '階高'),
    numField('n', '段数', '階段の段の数'),
    lenField('R', '蹴上げ'),
    lenField('T', '踏面'),
    lenField('L', '全長（水平距離）', '階段の水平方向の長さ'),
    { key: 'angle', label: '角度', quantity: 'angle', defaultUnit: 'deg', min: 0, max: 90, exclusiveMin: true, optional: true, rangeMessage: '角度は0°より大きく90°より小さい値にしてください', help: '階段の傾斜角' },
    lenField('slant', '斜距離', '階段の踏面に沿った斜めの長さ')
  ],

  solvers: [
    {
      requires: ['H', 'n'],
      provides: ['R'],
      run(v, ctx) {
        const R = v.H / v.n;
        return { values: { R }, formulaName: '階段寸法', steps: [{ formula: '蹴上げ = 階高 ÷ 段数', substituted: `${ctx.n(v.H, 'length')} ÷ ${ctx.f(v.n)}`, result: ctx.u(R, 'length') }] };
      }
    },
    {
      requires: ['H', 'R'],
      provides: ['n'],
      run(v, ctx) {
        const n = v.H / v.R;
        return { values: { n }, formulaName: '階段寸法', steps: [{ formula: '段数 = 階高 ÷ 蹴上げ', substituted: `${ctx.n(v.H, 'length')} ÷ ${ctx.n(v.R, 'length')}`, result: ctx.f(n) }] };
      }
    },
    {
      requires: ['n', 'R'],
      provides: ['H'],
      run(v, ctx) {
        const H = v.n * v.R;
        return { values: { H }, formulaName: '階段寸法', steps: [{ formula: '階高 = 段数 × 蹴上げ', substituted: `${ctx.f(v.n)} × ${ctx.n(v.R, 'length')}`, result: ctx.u(H, 'length') }] };
      }
    },
    {
      requires: ['n', 'T'],
      provides: ['L'],
      run(v, ctx) {
        const L = v.T * (v.n - 1);
        return { values: { L }, formulaName: '階段寸法', steps: [{ formula: '全長 = 踏面 × (段数 − 1)', substituted: `${ctx.n(v.T, 'length')} × (${ctx.f(v.n)} − 1)`, result: ctx.u(L, 'length') }] };
      }
    },
    {
      requires: ['L', 'n'],
      provides: ['T'],
      validate(v) {
        if (v.n <= 1) return calcError('ZERO', 'n', '段数は2以上にしてください');
        return null;
      },
      run(v, ctx) {
        const T = v.L / (v.n - 1);
        return { values: { T }, formulaName: '階段寸法', steps: [{ formula: '踏面 = 全長 ÷ (段数 − 1)', substituted: `${ctx.n(v.L, 'length')} ÷ (${ctx.f(v.n)} − 1)`, result: ctx.u(T, 'length') }] };
      }
    },
    {
      requires: ['R', 'T'],
      provides: ['angle'],
      run(v, ctx) {
        const angle = Math.atan2(v.R, v.T) * RAD_TO_DEG;
        return { values: { angle }, formulaName: '階段寸法', steps: [{ formula: '角度 = atan(蹴上げ ÷ 踏面)', substituted: `atan(${ctx.n(v.R, 'length')} ÷ ${ctx.n(v.T, 'length')})`, result: ctx.u(angle, 'angle') }] };
      }
    },
    {
      requires: ['H', 'L'],
      provides: ['slant', 'angle'],
      run(v, ctx) {
        const slant = Math.hypot(v.H, v.L);
        const angle = Math.atan2(v.H, v.L) * RAD_TO_DEG;
        return {
          values: { slant, angle },
          formulaName: '階段寸法',
          steps: [{ formula: '斜距離 = √(階高² + 全長²)', substituted: `√(${ctx.n(v.H, 'length')}² + ${ctx.n(v.L, 'length')}²)`, result: ctx.u(slant, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'H', label: '階高', quantity: 'length' },
    { key: 'n', label: '段数', quantity: 'number' },
    { key: 'R', label: '蹴上げ', quantity: 'length', primary: true },
    { key: 'T', label: '踏面', quantity: 'length', primary: true },
    { key: 'L', label: '全長（水平距離）', quantity: 'length' },
    { key: 'angle', label: '角度', quantity: 'angle' },
    { key: 'slant', label: '斜距離', quantity: 'length' }
  ],

  notes: NOTES.concat(['蹴上げ・踏面・全長・角度・斜距離の全組み合わせを逆算できるわけではありません。階高・段数・踏面の3つから求める方法を基本としています。'])
};

/* ==================================================================== *
 * stair.landing 踊り場を含む全長
 * ==================================================================== */

export const stairLanding = {
  id: 'stair.landing',
  category: 'stair',
  title: '踊り場を含む階段の全長',
  subtitle: '第1区間・踊り場・第2区間の水平距離から全長を計算',
  keywords: ['階段', '踊り場', '折り返し', '全長'],
  shape: 'stairPath',

  fields: [
    lenField('run1', '第1区間の水平距離'),
    lenField('landing', '踊り場の奥行き'),
    Object.assign(lenField('run2', '第2区間の水平距離（無ければ0）'), { exclusiveMin: false }),
    lenField('total', '全長')
  ],

  solvers: [
    {
      requires: ['run1', 'landing', 'run2'],
      provides: ['total'],
      run(v, ctx) {
        const total = v.run1 + v.landing + v.run2;
        return { values: { total }, formulaName: '踊り場を含む全長', steps: [{ formula: '全長 = 第1区間 + 踊り場 + 第2区間', substituted: `${ctx.n(v.run1, 'length')} + ${ctx.n(v.landing, 'length')} + ${ctx.n(v.run2, 'length')}`, result: ctx.u(total, 'length') }] };
      }
    },
    {
      requires: ['total', 'landing', 'run2'],
      provides: ['run1'],
      run(v, ctx) {
        const run1 = v.total - v.landing - v.run2;
        return { values: { run1 }, formulaName: '踊り場を含む全長', steps: [{ formula: '第1区間 = 全長 − 踊り場 − 第2区間', substituted: `${ctx.n(v.total, 'length')} − ${ctx.n(v.landing, 'length')} − ${ctx.n(v.run2, 'length')}`, result: ctx.u(run1, 'length') }] };
      }
    },
    {
      requires: ['total', 'run1', 'run2'],
      provides: ['landing'],
      run(v, ctx) {
        const landing = v.total - v.run1 - v.run2;
        return { values: { landing }, formulaName: '踊り場を含む全長', steps: [{ formula: '踊り場 = 全長 − 第1区間 − 第2区間', substituted: `${ctx.n(v.total, 'length')} − ${ctx.n(v.run1, 'length')} − ${ctx.n(v.run2, 'length')}`, result: ctx.u(landing, 'length') }] };
      }
    },
    {
      requires: ['total', 'run1', 'landing'],
      provides: ['run2'],
      run(v, ctx) {
        const run2 = v.total - v.run1 - v.landing;
        return { values: { run2 }, formulaName: '踊り場を含む全長', steps: [{ formula: '第2区間 = 全長 − 第1区間 − 踊り場', substituted: `${ctx.n(v.total, 'length')} − ${ctx.n(v.run1, 'length')} − ${ctx.n(v.landing, 'length')}`, result: ctx.u(run2, 'length') }] };
      }
    }
  ],

  outputs: [
    { key: 'run1', label: '第1区間の水平距離', quantity: 'length' },
    { key: 'landing', label: '踊り場の奥行き', quantity: 'length' },
    { key: 'run2', label: '第2区間の水平距離', quantity: 'length' },
    { key: 'total', label: '全長', quantity: 'length', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * stair.rule 蹴上げと踏面の関係（歩きやすさの目安の式）
 * ==================================================================== *
 * 「2R + T」（歩幅の式）「R + T」「R × T」は、階段の寸法を検討するときに
 * 昔から使われている経験式。ここでは値を算出するだけで、良し悪しの判定はしない。
 */

/** 蹴上げRと踏面Tから、どの解法でも共通に出せる値 */
function derived(R, T) {
  return {
    sum: R + T,
    product: R * T,
    nosing: Math.hypot(R, T),
    angle: Math.atan2(R, T) * RAD_TO_DEG
  };
}

export const stairRule = {
  id: 'stair.rule',
  category: 'stair',
  title: '蹴上げと踏面の関係',
  subtitle: '2R+T などの経験式の値を計算（目標値から逆算もできます）',
  keywords: ['蹴上げ', 'けあげ', '踏面', 'ふみづら', '2R+T', '歩幅', '階段', '寸法'],
  // 1段分を直角三角形として描く（底辺=踏面、高さ=蹴上げ、斜辺=段鼻を結ぶ線）
  shape: 'rightTriangle',
  shapeMap: { a: 'T', b: 'R', c: 'nosing', angA: 'angle' },

  fields: [
    lenField('R', '蹴上げ R', '1段の高さ'),
    lenField('T', '踏面 T'),
    lenField('walk', '2R + T の値', '歩幅の式。550〜650mm がよく目安として使われます')
  ],

  solvers: [
    {
      requires: ['R', 'T'],
      provides: ['walk', 'sum', 'product', 'nosing', 'angle'],
      run(v, ctx) {
        const walk = 2 * v.R + v.T;
        return {
          values: Object.assign({ walk }, derived(v.R, v.T)),
          formulaName: '階段の経験式',
          steps: [
            { formula: '2R + T（歩幅の式）', substituted: `2 × ${ctx.n(v.R, 'length')} + ${ctx.n(v.T, 'length')}`, result: ctx.u(walk, 'length') },
            { formula: 'R + T', substituted: `${ctx.n(v.R, 'length')} + ${ctx.n(v.T, 'length')}`, result: ctx.u(v.R + v.T, 'length') },
            { formula: 'R × T', substituted: `${ctx.n(v.R, 'length')} × ${ctx.n(v.T, 'length')}`, result: ctx.u(v.R * v.T, 'area') },
            { formula: '勾配 = atan(R ÷ T)', substituted: `atan(${ctx.n(v.R, 'length')} ÷ ${ctx.n(v.T, 'length')})`, result: ctx.u(Math.atan2(v.R, v.T) * RAD_TO_DEG, 'angle') }
          ]
        };
      }
    },
    {
      requires: ['walk', 'R'],
      provides: ['T', 'sum', 'product', 'nosing', 'angle'],
      run(v, ctx) {
        const T = v.walk - 2 * v.R;
        return {
          values: Object.assign({ T }, derived(v.R, T)),
          formulaName: '踏面の逆算',
          steps: [{ formula: 'T = (2R+T の値) − 2R', substituted: `${ctx.n(v.walk, 'length')} − 2 × ${ctx.n(v.R, 'length')}`, result: ctx.u(T, 'length') }]
        };
      }
    },
    {
      requires: ['walk', 'T'],
      provides: ['R', 'sum', 'product', 'nosing', 'angle'],
      run(v, ctx) {
        const R = (v.walk - v.T) / 2;
        return {
          values: Object.assign({ R }, derived(R, v.T)),
          formulaName: '蹴上げの逆算',
          steps: [{ formula: 'R = ((2R+T の値) − T) ÷ 2', substituted: `(${ctx.n(v.walk, 'length')} − ${ctx.n(v.T, 'length')}) ÷ 2`, result: ctx.u(R, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'R', label: '蹴上げ R', quantity: 'length', primary: true },
    { key: 'T', label: '踏面 T', quantity: 'length', primary: true },
    { key: 'walk', label: '2R + T', quantity: 'length' },
    { key: 'sum', label: 'R + T', quantity: 'length' },
    { key: 'product', label: 'R × T', quantity: 'area' },
    { key: 'nosing', label: '段鼻を結ぶ線の長さ', quantity: 'length' },
    { key: 'angle', label: '階段の勾配', quantity: 'angle' }
  ],

  notes: NOTES.concat([
    '2R+T が 550〜650mm、R+T が 450mm前後、R×T が 65,000mm²前後、といった目安が知られていますが、これらは経験則です。寸法の可否は用途と法令にあわせて専門家にご確認ください。'
  ])
};

export default [stairMain, stairLanding, stairRule];
