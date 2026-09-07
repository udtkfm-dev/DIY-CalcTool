// basic.js — CALC_SPEC.md A群「基本計算」
//
// A-1 単位換算・A-2 割合・A-3 比率。
//
// 【A-1 単位換算についての設計上の注記】
// CALC_SPEC.md は「種類（長さ／面積／体積／角度）をセグメントで選び、値を1つ入力すると
// その種類の全単位へ同時変換した一覧を表示する」という1画面内の切替UIを想定しているが、
// 現行の calcView.js は「1つの CalcDef = 1つの固定フィールド集合」を前提にしており、
// 画面内で入力欄の集合をまるごと切り替える汎用UIは Phase 1 に存在しない（Phase 3 のUX
// 仕上げ範囲）。そのため本実装では長さ／面積／体積／角度を4つの独立した CalcDef
// （basic.unit.length / .area / .volume / .angle）に分けている。
// 計算結果・逆算の性質は CALC_SPEC と同一（1つの単位に入力すると同じ物理量を表す
// 内部値がそのまま他の単位欄へ流れ込むだけなので、単位ごとの換算式は表示層が担う）。
// 検索キーワードは元の basic.unit のものを4分割して引き継ぎ、どの入口からも見つかる。

import { calcError } from '../core/errors.js';
import { unitLabel } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

/* ------------------------------------------------------------------ *
 * A-1. 単位換算（長さ／面積／体積／角度の4つに分割。理由は上記コメント）
 * ------------------------------------------------------------------ */

function buildUnitConvCalc({ id, title, subtitle, keywords, category, quantity, unitIds }) {
  const fields = unitIds.map((uid) => ({
    key: uid,
    label: unitLabel(quantity, uid) || uid,
    quantity,
    defaultUnit: uid,
    fixedUnit: true, // 設定の既定単位より、この行自身の単位を優先する（行ごとに異なる単位で並べるため）
    min: 0,
    exclusiveMin: true,
    optional: true
  }));

  const solvers = unitIds.map((srcId) => ({
    requires: [srcId],
    provides: unitIds.filter((k) => k !== srcId),
    run(v, ctx) {
      const value = v[srcId]; // 内部単位（quantity の base）の値
      const derived = {};
      const steps = [];
      // 内部値はどの単位欄でも共通（換算は表示層 ctx.u() が単位ごとに行う）。
      // 計算過程には、換算係数がわかるよう主要な2〜3件だけ「掛け算/割り算」の形で明示する。
      const others = unitIds.filter((k) => k !== srcId);
      for (const dstId of others) derived[dstId] = value;
      for (const dstId of others.slice(0, 3)) {
        steps.push({
          formula: `${ctx.u(value, quantity, srcId)} を ${unitLabel(quantity, dstId) || dstId} に換算`,
          substituted: ctx.u(value, quantity, srcId),
          result: ctx.u(value, quantity, dstId)
        });
      }
      return { values: derived, formulaName: '単位換算', steps };
    }
  }));

  return {
    id,
    category,
    title,
    subtitle,
    keywords,
    shape: null,
    fields,
    solvers,
    outputs: unitIds.map((uid) => ({ key: uid, label: unitLabel(quantity, uid) || uid, quantity, defaultUnit: uid, fixedUnit: true })),
    notes: NOTES
  };
}

export const basicUnitLength = buildUnitConvCalc({
  id: 'basic.unit.length',
  category: 'length',
  title: '長さの単位換算',
  subtitle: 'mm・cm・m・インチ・フィート・尺・寸を相互変換',
  keywords: ['長さ', 'センチ', 'メートル', 'インチ', 'フィート', '換算', '単位', 'mm', 'cm', 'm', '尺', '寸'],
  quantity: 'length',
  unitIds: ['mm', 'cm', 'm', 'inch', 'ft', 'shaku', 'sun']
});

export const basicUnitArea = buildUnitConvCalc({
  id: 'basic.unit.area',
  category: 'area',
  title: '面積の単位換算',
  subtitle: 'mm²・cm²・m²・坪・畳を相互変換',
  keywords: ['面積', '単位', '換算', '坪', '畳', 'm2', 'm²'],
  quantity: 'area',
  unitIds: ['mm2', 'cm2', 'm2', 'tsubo', 'jo']
});

export const basicUnitVolume = buildUnitConvCalc({
  id: 'basic.unit.volume',
  category: 'volume',
  title: '体積の単位換算',
  subtitle: 'mm³・cm³・m³・L・mLを相互変換',
  keywords: ['体積', '単位', '換算', 'リットル', 'L', 'mL', '容量'],
  quantity: 'volume',
  unitIds: ['mm3', 'cm3', 'm3', 'L', 'mL']
});

export const basicUnitAngle = buildUnitConvCalc({
  id: 'basic.unit.angle',
  category: 'triangle',
  title: '角度の単位換算',
  subtitle: '度とラジアンを相互変換',
  keywords: ['角度', '単位', '換算', 'ラジアン', 'rad', '度'],
  quantity: 'angle',
  unitIds: ['deg', 'rad']
});

/* ------------------------------------------------------------------ *
 * A-2. 割合・増減率
 * ------------------------------------------------------------------ */

const numberField = (key, label, help) => ({
  key,
  label,
  quantity: 'number',
  defaultUnit: 'number',
  optional: true,
  help
});

function diffStep(ctx, base, value, diff) {
  return {
    formula: 'diff = value − base',
    substituted: `${ctx.n(value, 'number')} − ${ctx.n(base, 'number')}`,
    result: ctx.u(diff, 'number')
  };
}

export const basicPercent = {
  id: 'basic.percent',
  category: 'length',
  title: '割合・増減率',
  subtitle: 'もとの値・割合(%)・割合をかけた値を相互計算',
  keywords: ['割合', 'パーセント', '％', '増減率', 'ロス率', '割引', '増加', '減少'],
  shape: null,

  fields: [
    numberField('base', 'もとの値', '割合の基準になる値'),
    { key: 'pct', label: '割合', quantity: 'percent', defaultUnit: 'percent', optional: true, help: '例: ロス率+10%は110' },
    numberField('value', '割合をかけた値', 'もとの値に割合を掛けた結果')
  ],

  solvers: [
    {
      requires: ['base', 'pct'],
      provides: ['value', 'diff'],
      run(v, ctx) {
        const value = (v.base * v.pct) / 100;
        const diff = value - v.base;
        return {
          values: { value, diff },
          formulaName: '割合',
          steps: [
            {
              formula: 'value = base × pct ÷ 100',
              substituted: `${ctx.n(v.base, 'number')} × ${ctx.n(v.pct, 'percent')} ÷ 100`,
              result: ctx.u(value, 'number')
            },
            diffStep(ctx, v.base, value, diff)
          ]
        };
      }
    },
    {
      requires: ['base', 'value'],
      provides: ['pct', 'diff'],
      validate(v) {
        if (v.base === 0) return calcError('ZERO', 'base');
        return null;
      },
      run(v, ctx) {
        const pct = (v.value / v.base) * 100;
        const diff = v.value - v.base;
        return {
          values: { pct, diff },
          formulaName: '割合',
          steps: [
            {
              formula: 'pct = value ÷ base × 100',
              substituted: `${ctx.n(v.value, 'number')} ÷ ${ctx.n(v.base, 'number')} × 100`,
              result: ctx.u(pct, 'percent')
            },
            diffStep(ctx, v.base, v.value, diff)
          ]
        };
      }
    },
    {
      requires: ['pct', 'value'],
      provides: ['base', 'diff'],
      validate(v) {
        if (v.pct === 0) return calcError('ZERO', 'pct');
        return null;
      },
      run(v, ctx) {
        const base = (v.value / v.pct) * 100;
        const diff = v.value - base;
        return {
          values: { base, diff },
          formulaName: '割合',
          steps: [
            {
              formula: 'base = value ÷ pct × 100',
              substituted: `${ctx.n(v.value, 'number')} ÷ ${ctx.n(v.pct, 'percent')} × 100`,
              result: ctx.u(base, 'number')
            },
            diffStep(ctx, base, v.value, diff)
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'base', label: 'もとの値', quantity: 'number' },
    { key: 'pct', label: '割合', quantity: 'percent' },
    { key: 'value', label: '割合をかけた値', quantity: 'number' },
    { key: 'diff', label: '差', quantity: 'number' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * A-3. 比率・比例配分（2〜4項）
 * ------------------------------------------------------------------ */

const RATIO_KEYS = ['r1', 'r2', 'r3', 'r4'];
const VALUE_KEYS = ['v1', 'v2', 'v3', 'v4'];

const lengthField = (key, label, help) => ({
  key,
  label,
  quantity: 'length',
  defaultUnit: 'mm',
  min: 0,
  exclusiveMin: true,
  optional: true,
  help
});

const ratioNumField = (key, label) => ({
  key,
  label,
  quantity: 'number',
  defaultUnit: 'number',
  min: 0,
  exclusiveMin: true,
  optional: true,
  help: '比の数字（例: 2:3なら2と3）'
});

function buildRatioSolvers() {
  const solvers = [];
  // k(何項の比を使うか)は大きい方から並べる。solve() は「requires ⊆ 入力集合」を満たす
  // 最初の solver を採用するため、r3/r4 まで入力されている場合に k=2 の solver が
  // （r3/r4 を無視して）先に一致してしまわないよう、より具体的な（要求項目が多い）
  // solver を優先して並べる。
  for (let k = 4; k >= 2; k--) {
    const rs = RATIO_KEYS.slice(0, k);
    const vs = VALUE_KEYS.slice(0, k);
    const knownKeys = ['total', ...vs];

    for (const known of knownKeys) {
      const requires = [known, ...rs];
      const provides = knownKeys.filter((x) => x !== known);

      solvers.push({
        requires,
        provides,
        validate(v) {
          const sum = rs.reduce((s, rk) => s + v[rk], 0);
          if (sum === 0) return calcError('ZERO', rs[0]);
          if (known !== 'total') {
            const idx = vs.indexOf(known);
            if (v[rs[idx]] === 0) return calcError('ZERO', rs[idx]);
          }
          return null;
        },
        run(v, ctx) {
          const sum = rs.reduce((s, rk) => s + v[rk], 0);
          const derived = {};

          let total;
          if (known === 'total') {
            total = v.total;
          } else {
            const idx = vs.indexOf(known);
            const perUnit = v[known] / v[rs[idx]];
            total = perUnit * sum;
            derived.total = total;
          }
          for (let i = 0; i < rs.length; i++) {
            if (vs[i] === known) continue;
            derived[vs[i]] = (total * v[rs[i]]) / sum;
          }

          const partsText = vs
            .map((vk, i) => `${vk}=${ctx.u(derived[vk] !== undefined ? derived[vk] : v[vk], 'length')}(比${ctx.f(v[rs[i]])})`)
            .join(' / ');

          return {
            values: derived,
            formulaName: '比例配分',
            steps: [
              {
                formula: '各項 = 全体量 × (その項の比 ÷ 比の合計)',
                substituted: `${ctx.n(total, 'length')} × (比 ÷ ${ctx.f(sum)})`,
                result: partsText
              }
            ]
          };
        }
      });
    }
  }
  return solvers;
}

export const basicRatio = {
  id: 'basic.ratio',
  category: 'length',
  title: '比率・比例配分',
  subtitle: '全体量と比（2〜4項）から各項の値を計算',
  keywords: ['比率', '比例', '配分', '按分', '材料', '配合比', '板を分ける'],
  shape: 'ratioBar',
  shapeMap: { total: 'total', v1: 'v1', v2: 'v2', v3: 'v3', v4: 'v4' },
  fields: [
    lengthField('total', '全体量', '分配する全体の長さ'),
    ratioNumField('r1', '比1'),
    ratioNumField('r2', '比2'),
    ratioNumField('r3', '比3（使わない場合は空欄）'),
    ratioNumField('r4', '比4（使わない場合は空欄）'),
    lengthField('v1', '項1の値', '比1に対応する実際の値'),
    lengthField('v2', '項2の値', '比2に対応する実際の値'),
    lengthField('v3', '項3の値', '比3に対応する実際の値'),
    lengthField('v4', '項4の値', '比4に対応する実際の値')
  ],

  solvers: buildRatioSolvers(),

  outputs: [
    { key: 'total', label: '全体量', quantity: 'length' },
    { key: 'v1', label: '項1の値', quantity: 'length' },
    { key: 'v2', label: '項2の値', quantity: 'length' },
    { key: 'v3', label: '項3の値', quantity: 'length' },
    { key: 'v4', label: '項4の値', quantity: 'length' }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * basic.scale 縮尺（図面の寸法 ⇄ 実寸）
 * ==================================================================== */

export const basicScale = {
  id: 'basic.scale',
  category: 'length',
  title: '縮尺（図面 ⇄ 実寸）',
  subtitle: '1/50 などの縮尺で、図面上の寸法と実際の寸法を換算',
  keywords: ['縮尺', 'スケール', '図面', '実寸', '1/50', '1/100', '製図', '模型'],
  shape: 'scalePair',
  shapeMap: { drawing: 'drawing', actual: 'real' },
  fields: [
    { key: 'drawing', label: '図面上の寸法', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true },
    { key: 'denom', label: '縮尺の分母', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '1/50 なら 50。1/100 なら 100' },
    { key: 'real', label: '実際の寸法', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['drawing', 'denom'],
      provides: ['real'],
      run(v, ctx) {
        const real = v.drawing * v.denom;
        return {
          values: { real },
          formulaName: '縮尺',
          steps: [{ formula: '実寸 = 図面上の寸法 × 縮尺の分母', substituted: `${ctx.n(v.drawing, 'length')} × ${ctx.f(v.denom)}`, result: ctx.u(real, 'length') }]
        };
      }
    },
    {
      requires: ['real', 'denom'],
      provides: ['drawing'],
      validate(v) { if (v.denom === 0) return calcError('ZERO', 'denom'); return null; },
      run(v, ctx) {
        const drawing = v.real / v.denom;
        return {
          values: { drawing },
          formulaName: '縮尺',
          steps: [{ formula: '図面上の寸法 = 実寸 ÷ 縮尺の分母', substituted: `${ctx.n(v.real, 'length')} ÷ ${ctx.f(v.denom)}`, result: ctx.u(drawing, 'length') }]
        };
      }
    },
    {
      requires: ['drawing', 'real'],
      provides: ['denom'],
      validate(v) { if (v.drawing === 0) return calcError('ZERO', 'drawing'); return null; },
      run(v, ctx) {
        const denom = v.real / v.drawing;
        return {
          values: { denom },
          formulaName: '縮尺',
          steps: [{ formula: '縮尺の分母 = 実寸 ÷ 図面上の寸法', substituted: `${ctx.n(v.real, 'length')} ÷ ${ctx.n(v.drawing, 'length')}`, result: '1 / ' + ctx.f(denom) }]
        };
      }
    }
  ],

  outputs: [
    { key: 'drawing', label: '図面上の寸法', quantity: 'length', primary: true },
    { key: 'denom', label: '縮尺の分母', quantity: 'number' },
    { key: 'real', label: '実際の寸法', quantity: 'length', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * basic.fraction インチの分数 ⇄ ミリ
 * ==================================================================== *
 * 木工用の工具・材料はインチ分数（1/16, 3/8 など）で表記されることが多い。
 * ミリから分数へ戻すときは、指定した分母で最も近い分数に丸める（割り切れないため）。
 */

export const basicFraction = {
  id: 'basic.fraction',
  category: 'length',
  title: 'インチの分数 ⇄ ミリ',
  subtitle: '3/8インチ などの分数表記とミリを相互に換算',
  keywords: ['インチ', '分数', 'inch', '1/16', '3/8', 'ミリ', '換算', '工具', 'ビット'],
  shape: null,

  fields: [
    { key: 'whole', label: '整数部（インチ）', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: '1・1/2 インチなら 1。分数だけなら 0' },
    { key: 'num', label: '分子', quantity: 'number', defaultUnit: 'number', min: 0, optional: true, help: '3/8 の 3' },
    { key: 'den', label: '分母', quantity: 'number', defaultUnit: 'number', min: 0, exclusiveMin: true, optional: true, help: '3/8 の 8。ミリから戻すときは、丸める細かさ（16・32など）として使う' },
    { key: 'mm', label: 'ミリ', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, fixedUnit: true }
  ],

  solvers: [
    {
      requires: ['whole', 'num', 'den'],
      provides: ['inch', 'mm'],
      validate(v) { if (v.den === 0) return calcError('ZERO', 'den'); return null; },
      run(v, ctx) {
        const inch = v.whole + v.num / v.den;
        const mm = inch * 25.4;
        return {
          values: { inch, mm },
          formulaName: 'インチ分数 → ミリ',
          steps: [
            { formula: 'インチ = 整数部 + 分子 ÷ 分母', substituted: `${ctx.f(v.whole)} + ${ctx.f(v.num)} ÷ ${ctx.f(v.den)}`, result: ctx.f(inch) + ' inch' },
            { formula: 'ミリ = インチ × 25.4', substituted: `${ctx.f(inch)} × 25.4`, result: ctx.u(mm, 'length') }
          ]
        };
      }
    },
    {
      requires: ['mm', 'den'],
      provides: ['inch', 'whole', 'num'],
      validate(v) { if (v.den === 0) return calcError('ZERO', 'den'); return null; },
      run(v, ctx) {
        const inchExact = v.mm / 25.4;
        const totalTicks = Math.round(inchExact * v.den);
        const whole = Math.floor(totalTicks / v.den);
        const num = totalTicks - whole * v.den;
        const inch = totalTicks / v.den;
        return {
          values: { inch, whole, num },
          formulaName: 'ミリ → インチ分数（最も近い分数に丸め）',
          steps: [
            { formula: 'インチ = ミリ ÷ 25.4', substituted: `${ctx.n(v.mm, 'length')} ÷ 25.4`, result: ctx.f(inchExact) + ' inch' },
            { formula: '分母をかけて四捨五入', substituted: `${ctx.f(inchExact)} × ${ctx.f(v.den)}`, result: totalTicks + ' / ' + ctx.f(v.den) },
            { formula: '帯分数にする', substituted: `${totalTicks} ÷ ${ctx.f(v.den)}`, result: `${whole} と ${num}/${ctx.f(v.den)} インチ` }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'whole', label: '整数部（インチ）', quantity: 'number' },
    { key: 'num', label: '分子', quantity: 'number' },
    { key: 'den', label: '分母', quantity: 'number' },
    { key: 'inch', label: 'インチ（小数）', quantity: 'number', primary: true },
    { key: 'mm', label: 'ミリ', quantity: 'length', defaultUnit: 'mm', fixedUnit: true, primary: true }
  ],

  notes: NOTES.concat(['ミリから分数へ戻す場合、指定した分母で最も近い分数に丸めます。丁度の値にならないことがあります。'])
};

/* ------------------------------------------------------------------ *
 * basic.round 切り上げ・切り捨て・キリのいい数
 *
 * 「910mm の材を 50mm 単位で切るなら何mm？」のような現場の丸め。
 * ------------------------------------------------------------------ */

export const basicRound = {
  id: 'basic.round',
  category: 'length',
  title: '切り上げ・切り捨て（キリのいい数）',
  subtitle: '基準の単位で、切り上げ・切り捨て・四捨五入した値を同時に表示',
  keywords: ['切り上げ', '切り捨て', '四捨五入', '丸め', 'キリ', '端数', '単位', 'まるめ'],

  shape: 'lineSegment',
  shapeMap: { total: 'value', pitch: 'step' },
  fields: [
    { key: 'value', label: 'もとの値', quantity: 'length', defaultUnit: 'mm', optional: true },
    { key: 'step', label: '刻み（基準の単位）', quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help: '10mm 単位で丸めたいなら 10、50mm 単位なら 50 と入れます' }
  ],

  solvers: [
    {
      requires: ['value', 'step'],
      provides: ['up', 'down', 'near', 'remainder'],
      validate(v) {
        if (v.step === 0) return calcError('ZERO', 'step');
        return null;
      },
      run(v, ctx) {
        const up = Math.ceil(v.value / v.step) * v.step;
        const down = Math.floor(v.value / v.step) * v.step;
        const near = Math.round(v.value / v.step) * v.step;
        const remainder = v.value - down;
        return {
          values: { up, down, near, remainder },
          formulaName: '刻みで丸める',
          steps: [
            { formula: '切り上げ = ceil(値 ÷ 刻み) × 刻み', substituted: `ceil(${ctx.n(v.value, 'length')} ÷ ${ctx.n(v.step, 'length')}) × ${ctx.n(v.step, 'length')}`, result: ctx.u(up, 'length') },
            { formula: '切り捨て = floor(値 ÷ 刻み) × 刻み', substituted: `floor(${ctx.n(v.value, 'length')} ÷ ${ctx.n(v.step, 'length')}) × ${ctx.n(v.step, 'length')}`, result: ctx.u(down, 'length') },
            { formula: '四捨五入 = round(値 ÷ 刻み) × 刻み', substituted: `round(${ctx.n(v.value, 'length')} ÷ ${ctx.n(v.step, 'length')}) × ${ctx.n(v.step, 'length')}`, result: ctx.u(near, 'length') },
            { formula: '端数 = 値 − 切り捨て', substituted: `${ctx.n(v.value, 'length')} − ${ctx.n(down, 'length')}`, result: ctx.u(remainder, 'length') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'up', label: '切り上げ', quantity: 'length', primary: true },
    { key: 'down', label: '切り捨て', quantity: 'length', primary: true },
    { key: 'near', label: '四捨五入', quantity: 'length' },
    { key: 'remainder', label: '端数', quantity: 'length' }
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * basic.stats 合計・平均（測った値をならす）
 * ------------------------------------------------------------------ */

const measField = (key, label) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', optional: true
});

export const basicStats = {
  id: 'basic.stats',
  category: 'length',
  title: '合計・平均（複数の測定値）',
  subtitle: '2〜5か所を測った値から、合計・平均・最大・最小・差を計算',
  keywords: ['合計', '平均', '測定', 'ばらつき', '最大', '最小', '差', '実測', 'ならし'],

  shape: 'barsMulti',
  shapeMap: { v1: 'v1', v2: 'v2', v3: 'v3', v4: 'v4', v5: 'v5' },
  fields: [
    measField('v1', '1か所目'),
    measField('v2', '2か所目'),
    measField('v3', '3か所目'),
    measField('v4', '4か所目'),
    measField('v5', '5か所目')
  ],

  solvers: [
    buildStatsSolver(['v1', 'v2', 'v3', 'v4', 'v5']),
    buildStatsSolver(['v1', 'v2', 'v3', 'v4']),
    buildStatsSolver(['v1', 'v2', 'v3']),
    buildStatsSolver(['v1', 'v2'])
  ],

  outputs: [
    { key: 'sum', label: '合計', quantity: 'length', primary: true },
    { key: 'avg', label: '平均', quantity: 'length', primary: true },
    { key: 'max', label: '最大', quantity: 'length' },
    { key: 'min', label: '最小', quantity: 'length' },
    { key: 'range', label: '最大 − 最小', quantity: 'length' },
    { key: 'n', label: '個数', quantity: 'number' }
  ],

  notes: NOTES.concat(['部屋の対辺を数か所測って「ばらつき（最大−最小）」を見ると、ゆがみの目安になります。'])
};

function buildStatsSolver(keys) {
  return {
    requires: keys.slice(),
    provides: ['sum', 'avg', 'max', 'min', 'range', 'n'],
    run(v, ctx) {
      const xs = keys.map((k) => v[k]);
      const sum = xs.reduce((a, b) => a + b, 0);
      const avg = sum / xs.length;
      const max = Math.max(...xs);
      const min = Math.min(...xs);
      return {
        values: { sum, avg, max, min, range: max - min, n: xs.length },
        formulaName: '合計・平均',
        steps: [
          { formula: '合計 = 各値の和', substituted: xs.map((x) => ctx.n(x, 'length')).join(' + '), result: ctx.u(sum, 'length') },
          { formula: '平均 = 合計 ÷ 個数', substituted: `${ctx.n(sum, 'length')} ÷ ${xs.length}`, result: ctx.u(avg, 'length') },
          { formula: 'ばらつき = 最大 − 最小', substituted: `${ctx.n(max, 'length')} − ${ctx.n(min, 'length')}`, result: ctx.u(max - min, 'length') }
        ]
      };
    }
  };
}

export default [
  basicUnitLength,
  basicUnitArea,
  basicUnitVolume,
  basicUnitAngle,
  basicPercent,
  basicRatio,
  basicScale,
  basicFraction,
  basicRound,
  basicStats
];
