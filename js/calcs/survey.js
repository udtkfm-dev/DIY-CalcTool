// survey.js — CALC_SPEC.md「測量・位置」（Phase 4 第12グループ）
//
// 設計注記: 座標(x,y)・オフセット量は負の値も意味を持つため、他の計算で使う
// lenField（0より大きい値のみ許可）とは別に、下限を設けない coordField を使う。

import { RAD_TO_DEG } from '../core/units.js';

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。座標系（原点・方位の基準）は用途に応じて読み替えてください。'
];

const coordField = (key, label, help) => ({ key, label, quantity: 'length', defaultUnit: 'mm', optional: true, help });
const lenField = (key, label, help) => ({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help });

/* ==================================================================== *
 * survey.distance2p 2点間距離・方位角
 * ==================================================================== */

export const surveyDistance2p = {
  id: 'survey.distance2p',
  category: 'survey',
  title: '2点間の距離・方位角',
  subtitle: '2点の座標(x,y)から、距離と方位角を計算',
  keywords: ['測量', '2点間距離', '方位角', '座標', '外構', '土地'],
  shape: 'twoPoints',

  fields: [coordField('x1', '点1 X座標'), coordField('y1', '点1 Y座標'), coordField('x2', '点2 X座標'), coordField('y2', '点2 Y座標')],

  solvers: [
    {
      requires: ['x1', 'y1', 'x2', 'y2'],
      provides: ['distance', 'bearing'],
      run(v, ctx) {
        const dx = v.x2 - v.x1;
        const dy = v.y2 - v.y1;
        const distance = Math.hypot(dx, dy);
        let bearing = Math.atan2(dx, dy) * RAD_TO_DEG; // 北(Y+)を0°、東(X+)を90°とする方位角
        if (bearing < 0) bearing += 360;
        return {
          values: { distance, bearing },
          formulaName: '2点間の距離・方位角',
          steps: [
            { formula: '距離 = √((x2−x1)² + (y2−y1)²)', substituted: `√(${ctx.n(dx, 'length')}² + ${ctx.n(dy, 'length')}²)`, result: ctx.u(distance, 'length') },
            { formula: '方位角 = atan2(x2−x1, y2−y1)（北を0°、時計回り）', substituted: `atan2(${ctx.n(dx, 'length')}, ${ctx.n(dy, 'length')})`, result: ctx.u(bearing, 'angle') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'x1', label: '点1 X座標', quantity: 'length' },
    { key: 'y1', label: '点1 Y座標', quantity: 'length' },
    { key: 'x2', label: '点2 X座標', quantity: 'length' },
    { key: 'y2', label: '点2 Y座標', quantity: 'length' },
    { key: 'distance', label: '距離', quantity: 'length', primary: true },
    { key: 'bearing', label: '方位角', quantity: 'angle', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * survey.midpoint 中点・等分点
 * ==================================================================== */

export const surveyMidpoint = {
  id: 'survey.midpoint',
  category: 'survey',
  title: '2点の中点・等分点',
  subtitle: '2点の座標から中点、または線分をn等分する点の座標を計算',
  keywords: ['測量', '中点', '等分点', '座標', '芯出し'],
  shape: 'twoPoints',
  shapeMap: { x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2', mx: 'mx', my: 'my' },

  fields: [
    coordField('x1', '点1 X座標'),
    coordField('y1', '点1 Y座標'),
    coordField('x2', '点2 X座標'),
    coordField('y2', '点2 Y座標'),
    { key: 'n', label: '分割数（任意・既定2＝中点）', quantity: 'number', defaultUnit: 'number', min: 1, exclusiveMin: true, optional: true }
  ],

  solvers: [
    {
      requires: ['x1', 'y1', 'x2', 'y2', 'n'],
      provides: ['mx', 'my'],
      run(v, ctx) {
        const nInt = Math.max(1, Math.round(v.n));
        const mx = v.x1 + ((v.x2 - v.x1) * 1) / nInt;
        const my = v.y1 + ((v.y2 - v.y1) * 1) / nInt;
        const steps = [{ formula: '点1から見て1/n地点の座標', substituted: '', result: `x=${ctx.u(mx, 'length')}, y=${ctx.u(my, 'length')}` }];
        for (let i = 1; i <= Math.min(nInt - 1, 30); i++) {
          const px = v.x1 + ((v.x2 - v.x1) * i) / nInt;
          const py = v.y1 + ((v.y2 - v.y1) * i) / nInt;
          steps.push({ formula: `分割点${i}`, substituted: '', result: `x=${ctx.u(px, 'length')}, y=${ctx.u(py, 'length')}` });
        }
        return { values: { mx, my }, formulaName: '等分点', steps };
      }
    },
    {
      requires: ['x1', 'y1', 'x2', 'y2'],
      provides: ['mx', 'my'],
      run(v, ctx) {
        const mx = (v.x1 + v.x2) / 2;
        const my = (v.y1 + v.y2) / 2;
        return {
          values: { mx, my },
          formulaName: '中点',
          steps: [{ formula: '中点 = ((x1+x2)÷2, (y1+y2)÷2)', substituted: '', result: `x=${ctx.u(mx, 'length')}, y=${ctx.u(my, 'length')}` }]
        };
      }
    }
  ],

  outputs: [
    { key: 'x1', label: '点1 X座標', quantity: 'length' },
    { key: 'y1', label: '点1 Y座標', quantity: 'length' },
    { key: 'x2', label: '点2 X座標', quantity: 'length' },
    { key: 'y2', label: '点2 Y座標', quantity: 'length' },
    { key: 'n', label: '分割数', quantity: 'number' },
    { key: 'mx', label: '中点/分割点 X座標', quantity: 'length', primary: true },
    { key: 'my', label: '中点/分割点 Y座標', quantity: 'length', primary: true }
  ],

  notEnoughHint(enteredKeys) {
    const rest = enteredKeys.filter((k) => k !== 'n');
    if (enteredKeys.includes('n') && rest.length < 4) return 'あと座標を入力すると計算できます（分割数のみでは計算できません）';
    return null;
  },

  notes: NOTES
};

/* ==================================================================== *
 * survey.offset 直角位置・オフセット
 * ==================================================================== */

export const surveyOffset = {
  id: 'survey.offset',
  category: 'survey',
  title: '基準線からのオフセット位置',
  subtitle: '基準線（2点）・沿い距離・直角オフセットから、点の座標を計算',
  keywords: ['測量', 'オフセット', '直角出し', '座標', '丁張り'],
  shape: 'offsetPoint',
  shapeMap: { x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2', along: 'along', offset: 'offset' },

  fields: [
    coordField('x1', '基準点1 X座標'),
    coordField('y1', '基準点1 Y座標'),
    coordField('x2', '基準点2 X座標'),
    coordField('y2', '基準点2 Y座標'),
    coordField('along', '基準線に沿った距離', '基準点1からの距離（負の値で逆方向）'),
    coordField('offset', '直角方向のオフセット', '基準線から直角方向の距離（符号で左右を区別）')
  ],

  solvers: [
    {
      requires: ['x1', 'y1', 'x2', 'y2', 'along', 'offset'],
      provides: ['px', 'py'],
      run(v, ctx) {
        const dx = v.x2 - v.x1;
        const dy = v.y2 - v.y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const px = v.x1 + ux * v.along - uy * v.offset;
        const py = v.y1 + uy * v.along + ux * v.offset;
        return {
          values: { px, py },
          formulaName: 'オフセット位置',
          steps: [
            { formula: '基準線の単位ベクトル', substituted: '', result: `(${ctx.f(ux)}, ${ctx.f(uy)})` },
            { formula: '点の座標 = 基準点1 + 沿い方向×along + 直角方向×offset', substituted: '', result: `x=${ctx.u(px, 'length')}, y=${ctx.u(py, 'length')}` }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'x1', label: '基準点1 X座標', quantity: 'length' },
    { key: 'y1', label: '基準点1 Y座標', quantity: 'length' },
    { key: 'x2', label: '基準点2 X座標', quantity: 'length' },
    { key: 'y2', label: '基準点2 Y座標', quantity: 'length' },
    { key: 'along', label: '沿い距離', quantity: 'length' },
    { key: 'offset', label: '直角オフセット', quantity: 'length' },
    { key: 'px', label: '点の X座標', quantity: 'length', primary: true },
    { key: 'py', label: '点の Y座標', quantity: 'length', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * survey.polygon 座標法による面積（3〜6点）
 * ==================================================================== *
 * いわゆる靴ひも公式（Shoelace formula）。頂点を順に回ったときの
 * Σ(xi × yi+1 − xi+1 × yi) の絶対値の半分が面積になる。
 * 点数の多い解法から順に並べる（少ない側が先だと、多点入力時に
 * 3点分だけで確定してしまうため。9-5-1の注意点と同じ理由）。
 */

const POLY_MAX = 6;

function polygonSolver(n) {
  const requires = [];
  for (let i = 1; i <= n; i++) requires.push(`x${i}`, `y${i}`);
  return {
    requires,
    provides: ['area', 'perimeter', 'pointCount'],
    run(v, ctx) {
      const pts = [];
      for (let i = 1; i <= n; i++) pts.push([v[`x${i}`], v[`y${i}`]]);

      let cross = 0;
      let perimeter = 0;
      const terms = [];
      for (let i = 0; i < n; i++) {
        const [xa, ya] = pts[i];
        const [xb, yb] = pts[(i + 1) % n];
        cross += xa * yb - xb * ya;
        perimeter += Math.hypot(xb - xa, yb - ya);
        terms.push(`(${ctx.n(xa, 'length')}×${ctx.n(yb, 'length')} − ${ctx.n(xb, 'length')}×${ctx.n(ya, 'length')})`);
      }
      const area = Math.abs(cross) / 2;

      return {
        values: { area, perimeter, pointCount: n },
        formulaName: `座標法（${n}点）`,
        steps: [
          { formula: 'Σ(xi × yi+1 − xi+1 × yi)', substituted: terms.join(' + '), result: ctx.f(cross) },
          { formula: '面積 = |Σ| ÷ 2', substituted: `|${ctx.f(cross)}| ÷ 2`, result: ctx.u(area, 'area') },
          { formula: '周長 = 各辺の長さの合計', substituted: `${n} 辺の合計`, result: ctx.u(perimeter, 'length') }
        ]
      };
    }
  };
}

function polygonFields() {
  const out = [];
  for (let i = 1; i <= POLY_MAX; i++) {
    out.push(coordField(`x${i}`, `点${i} X座標`, i === 1 ? '頂点を時計回り（または反時計回り）の順に入力します' : undefined));
    out.push(coordField(`y${i}`, `点${i} Y座標`));
  }
  return out;
}

export const surveyPolygon = {
  id: 'survey.polygon',
  category: 'survey',
  title: '座標法による面積（3〜6点）',
  subtitle: '各頂点の座標から、多角形の面積と周長を計算',
  keywords: ['座標法', '面積', '多角形', '敷地', '求積', '靴ひも', 'ヘロン', '不整形', '三斜'],
  shape: 'polygonPts',
  fields: polygonFields(),

  // 6点 → 3点 の順。少ない側を先に置くと、多点入力時に一部だけで確定してしまう
  solvers: [polygonSolver(6), polygonSolver(5), polygonSolver(4), polygonSolver(3)],

  outputs: [
    { key: 'pointCount', label: '使った点の数', quantity: 'number' },
    { key: 'area', label: '面積', quantity: 'area', primary: true },
    { key: 'perimeter', label: '周長', quantity: 'length', primary: true }
  ],

  notes: NOTES.concat([
    '頂点は順番に入力してください（順序が入れ替わると、へこんだ形として計算されます）。',
    '辺が交差する形（自己交差）には対応していません。'
  ])
};

export default [surveyDistance2p, surveyMidpoint, surveyOffset, surveyPolygon];
