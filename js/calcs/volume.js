// volume.js — CALC_SPEC.md E群「体積」
//
// 出力は必ず mm³ / m³ / L を併記する（REQUIREMENTS）。3つの出力キーへ同じ内部値を
// 複製し、それぞれ fixedUnit:true で固定表示単位を与える（area.room と同じパターン）。

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const lenField = (key, label, help) => ({
  key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help
});
const volField = (key, label, help) => ({
  key, label, quantity: 'volume', defaultUnit: 'mm3', min: 0, exclusiveMin: true, optional: true, help
});

/** V_mm3 / V_m3 / V_L の3出力（同じ内部値、表示単位だけ固定で違う）を共通化する */
const VOLUME_OUTPUTS = [
  { key: 'V_mm3', label: '体積(mm³)', quantity: 'volume', defaultUnit: 'mm3', fixedUnit: true },
  { key: 'V_m3', label: '体積(m³)', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true },
  { key: 'V_L', label: '体積(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true }
];

function volumeTriple(v) {
  return { V_mm3: v, V_m3: v, V_L: v };
}

/* ------------------------------------------------------------------ *
 * vol.box 直方体
 * ------------------------------------------------------------------ */

export const volBox = {
  id: 'vol.box',
  category: 'volume',
  title: '直方体の体積',
  subtitle: '幅・奥行・高さ・体積を相互計算',
  keywords: ['体積', '直方体', '箱', '容量', 'リットル'],
  shape: 'box3d',

  fields: [lenField('w', '幅'), lenField('d', '奥行'), lenField('h', '高さ'), volField('V', '体積')],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = v.w * v.d * v.h;
        return {
          values: volumeTriple(V),
          formulaName: '直方体の体積',
          steps: [{ formula: 'V = w × d × h', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V', 'w', 'd'],
      provides: ['h'],
      run(v, ctx) {
        const h = v.V / (v.w * v.d);
        return {
          values: { h },
          formulaName: '直方体の体積',
          steps: [{ formula: '高さ = V ÷ (幅×奥行)', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ (${ctx.n(v.w, 'length')}×${ctx.n(v.d, 'length')})`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['V', 'w', 'h'],
      provides: ['d'],
      run(v, ctx) {
        const d = v.V / (v.w * v.h);
        return {
          values: { d },
          formulaName: '直方体の体積',
          steps: [{ formula: '奥行 = V ÷ (幅×高さ)', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ (${ctx.n(v.w, 'length')}×${ctx.n(v.h, 'length')})`, result: ctx.u(d, 'length') }]
        };
      }
    },
    {
      requires: ['V', 'd', 'h'],
      provides: ['w'],
      run(v, ctx) {
        const w = v.V / (v.d * v.h);
        return {
          values: { w },
          formulaName: '直方体の体積',
          steps: [{ formula: '幅 = V ÷ (奥行×高さ)', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ (${ctx.n(v.d, 'length')}×${ctx.n(v.h, 'length')})`, result: ctx.u(w, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '幅', quantity: 'length' },
    { key: 'd', label: '奥行', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.cube 立方体
 * ------------------------------------------------------------------ */

export const volCube = {
  id: 'vol.cube',
  category: 'volume',
  title: '立方体の体積',
  subtitle: '一辺・体積を相互計算',
  keywords: ['体積', '立方体', 'サイコロ', '容量'],
  shape: 'box3d',
  shapeMap: { w: 'a', h: 'a', d: 'a' },

  fields: [lenField('a', '一辺'), volField('V', '体積')],

  solvers: [
    {
      requires: ['a'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = v.a * v.a * v.a;
        return {
          values: volumeTriple(V),
          formulaName: '立方体の体積',
          steps: [{ formula: 'V = a³', substituted: `${ctx.n(v.a, 'length')}³`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V'],
      provides: ['a'],
      run(v, ctx) {
        const a = Math.cbrt(v.V);
        return {
          values: { a },
          formulaName: '立方体の体積',
          steps: [{ formula: 'a = ∛V', substituted: `∛${ctx.n(v.V, 'volume', 'mm3')}`, result: ctx.u(a, 'length') }]
        };
      }
    }
  ],

  outputs: [{ key: 'a', label: '一辺', quantity: 'length' }, ...VOLUME_OUTPUTS],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.cylinder 円柱
 * ------------------------------------------------------------------ */

export const volCylinder = {
  id: 'vol.cylinder',
  category: 'volume',
  title: '円柱の体積',
  subtitle: '半径・高さ・体積を相互計算',
  keywords: ['体積', '円柱', '丸', '容量', 'リットル'],
  shape: 'cylinder3d',

  fields: [lenField('r', '半径'), lenField('h', '高さ'), volField('V', '体積')],

  solvers: [
    {
      requires: ['r', 'h'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = Math.PI * v.r * v.r * v.h;
        return {
          values: volumeTriple(V),
          formulaName: '円柱の体積',
          steps: [{ formula: 'V = πr²h', substituted: `π × ${ctx.n(v.r, 'length')}² × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V', 'r'],
      provides: ['h'],
      run(v, ctx) {
        const h = v.V / (Math.PI * v.r * v.r);
        return {
          values: { h },
          formulaName: '円柱の体積',
          steps: [{ formula: '高さ = V ÷ (πr²)', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ (π×${ctx.n(v.r, 'length')}²)`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['V', 'h'],
      provides: ['r'],
      run(v, ctx) {
        const r = Math.sqrt(v.V / (Math.PI * v.h));
        return {
          values: { r },
          formulaName: '円柱の体積',
          steps: [{ formula: '半径 = √(V ÷ (πh))', substituted: `√(${ctx.n(v.V, 'volume', 'mm3')} ÷ (π×${ctx.n(v.h, 'length')}))`, result: ctx.u(r, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.cone 円錐
 * ------------------------------------------------------------------ */

export const volCone = {
  id: 'vol.cone',
  category: 'volume',
  title: '円錐の体積',
  subtitle: '半径・高さ・体積を相互計算',
  keywords: ['体積', '円錐', '容量'],
  shape: 'cone3d',

  fields: [lenField('r', '半径'), lenField('h', '高さ'), volField('V', '体積')],

  solvers: [
    {
      requires: ['r', 'h'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = (Math.PI * v.r * v.r * v.h) / 3;
        return {
          values: volumeTriple(V),
          formulaName: '円錐の体積',
          steps: [{ formula: 'V = πr²h ÷ 3', substituted: `π × ${ctx.n(v.r, 'length')}² × ${ctx.n(v.h, 'length')} ÷ 3`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V', 'r'],
      provides: ['h'],
      run(v, ctx) {
        const h = (3 * v.V) / (Math.PI * v.r * v.r);
        return {
          values: { h },
          formulaName: '円錐の体積',
          steps: [{ formula: '高さ = 3V ÷ (πr²)', substituted: `3×${ctx.n(v.V, 'volume', 'mm3')} ÷ (π×${ctx.n(v.r, 'length')}²)`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['V', 'h'],
      provides: ['r'],
      run(v, ctx) {
        const r = Math.sqrt((3 * v.V) / (Math.PI * v.h));
        return {
          values: { r },
          formulaName: '円錐の体積',
          steps: [{ formula: '半径 = √(3V ÷ (πh))', substituted: `√(3×${ctx.n(v.V, 'volume', 'mm3')} ÷ (π×${ctx.n(v.h, 'length')}))`, result: ctx.u(r, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'r', label: '半径', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.sphere 球
 * ------------------------------------------------------------------ */

export const volSphere = {
  id: 'vol.sphere',
  category: 'volume',
  title: '球の体積',
  subtitle: '半径・体積を相互計算',
  keywords: ['体積', '球', 'ボール', '容量'],
  shape: 'sphere3d',

  fields: [lenField('r', '半径'), volField('V', '体積')],

  solvers: [
    {
      requires: ['r'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = (4 / 3) * Math.PI * v.r * v.r * v.r;
        return {
          values: volumeTriple(V),
          formulaName: '球の体積',
          steps: [{ formula: 'V = 4πr³ ÷ 3', substituted: `4π × ${ctx.n(v.r, 'length')}³ ÷ 3`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V'],
      provides: ['r'],
      run(v, ctx) {
        const r = Math.cbrt((3 * v.V) / (4 * Math.PI));
        return {
          values: { r },
          formulaName: '球の体積',
          steps: [{ formula: 'r = ∛(3V ÷ (4π))', substituted: `∛(3×${ctx.n(v.V, 'volume', 'mm3')} ÷ (4π))`, result: ctx.u(r, 'length') }]
        };
      }
    }
  ],

  outputs: [{ key: 'r', label: '半径', quantity: 'length' }, ...VOLUME_OUTPUTS],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.prismTri 三角柱
 * ------------------------------------------------------------------ */

export const volPrismTri = {
  id: 'vol.prismTri',
  category: 'volume',
  title: '三角柱の体積',
  subtitle: '底辺・高さ・長さ・体積を相互計算',
  keywords: ['体積', '三角柱', '容量'],
  shape: 'prism3d',

  fields: [lenField('b', '底辺'), lenField('h', '高さ'), lenField('L', '長さ'), volField('V', '体積')],

  solvers: [
    {
      requires: ['b', 'h', 'L'],
      provides: ['V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const V = ((v.b * v.h) / 2) * v.L;
        return {
          values: volumeTriple(V),
          formulaName: '三角柱の体積',
          steps: [{ formula: 'V = (底辺×高さ÷2) × 長さ', substituted: `(${ctx.n(v.b, 'length')}×${ctx.n(v.h, 'length')}÷2) × ${ctx.n(v.L, 'length')}`, result: ctx.u(V, 'volume', 'L') }]
        };
      }
    },
    {
      requires: ['V', 'b', 'h'],
      provides: ['L'],
      run(v, ctx) {
        const L = v.V / ((v.b * v.h) / 2);
        return {
          values: { L },
          formulaName: '三角柱の体積',
          steps: [{ formula: '長さ = V ÷ (底辺×高さ÷2)', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ (${ctx.n(v.b, 'length')}×${ctx.n(v.h, 'length')}÷2)`, result: ctx.u(L, 'length') }]
        };
      }
    },
    {
      requires: ['V', 'b', 'L'],
      provides: ['h'],
      run(v, ctx) {
        const h = (v.V / v.L / v.b) * 2;
        return {
          values: { h },
          formulaName: '三角柱の体積',
          steps: [{ formula: '高さ = V ÷ 長さ ÷ 底辺 × 2', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ ${ctx.n(v.L, 'length')} ÷ ${ctx.n(v.b, 'length')} × 2`, result: ctx.u(h, 'length') }]
        };
      }
    },
    {
      requires: ['V', 'h', 'L'],
      provides: ['b'],
      run(v, ctx) {
        const b = (v.V / v.L / v.h) * 2;
        return {
          values: { b },
          formulaName: '三角柱の体積',
          steps: [{ formula: '底辺 = V ÷ 長さ ÷ 高さ × 2', substituted: `${ctx.n(v.V, 'volume', 'mm3')} ÷ ${ctx.n(v.L, 'length')} ÷ ${ctx.n(v.h, 'length')} × 2`, result: ctx.u(b, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'b', label: '底辺', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'L', label: '長さ', quantity: 'length' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.pyramid 角錐（四角錐）
 * ------------------------------------------------------------------ */

export const volPyramid = {
  id: 'vol.pyramid',
  category: 'volume',
  title: '角錐の体積',
  subtitle: '底面（幅×奥行）と高さから、四角錐の体積を計算',
  keywords: ['角錐', '四角錐', 'ピラミッド', '体積', '三角屋根', '砂山'],
  shape: 'pyramid3d',

  fields: [lenField('w', '底面の幅'), lenField('d', '底面の奥行'), lenField('h', '高さ'), volField('V', '体積')],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['A', 'V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const A = v.w * v.d;
        const V = (A * v.h) / 3;
        return {
          values: Object.assign({ A }, volumeTriple(V)),
          formulaName: '角錐の体積',
          steps: [
            { formula: '底面積 = 幅 × 奥行', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')}`, result: ctx.u(A, 'area') },
            { formula: 'V = 底面積 × 高さ ÷ 3', substituted: `${ctx.n(A, 'area')} × ${ctx.n(v.h, 'length')} ÷ 3`, result: ctx.u(V, 'volume', 'L') }
          ]
        };
      }
    },
    {
      requires: ['V', 'w', 'd'],
      provides: ['A', 'h'],
      run(v, ctx) {
        const A = v.w * v.d;
        const h = (3 * v.V) / A;
        return {
          values: { A, h },
          formulaName: '角錐の体積',
          steps: [{ formula: '高さ = 3V ÷ 底面積', substituted: `3 × ${ctx.n(v.V, 'volume', 'mm3')} ÷ ${ctx.n(A, 'area')}`, result: ctx.u(h, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '底面の幅', quantity: 'length' },
    { key: 'd', label: '底面の奥行', quantity: 'length' },
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'A', label: '底面積', quantity: 'area' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES
};

/* ------------------------------------------------------------------ *
 * vol.frustumCone 円錐台（バケツ・植木鉢）
 *
 * 上下で口径が違う容器の容量。DIYでは植木鉢・バケツ・ホッパーがこの形になる。
 * V = πh(R² + Rr + r²) ÷ 3
 * ------------------------------------------------------------------ */

export const volFrustumCone = {
  id: 'vol.frustumCone',
  category: 'volume',
  title: '円錐台の体積（バケツ・植木鉢）',
  subtitle: '上下の直径と高さから、すぼまった容器の容量を計算',
  keywords: ['円錐台', 'バケツ', '植木鉢', 'プランター', '容量', 'ホッパー', 'すぼまり', 'テーパー'],
  shape: 'frustumCone',

  fields: [
    lenField('dTop', '上の直径', '容器の口の内側の直径'),
    lenField('dBottom', '下の直径', '容器の底の内側の直径'),
    lenField('h', '高さ', '底から口までの内寸の深さ'),
    volField('V', '容量')
  ],

  solvers: [
    {
      requires: ['dTop', 'dBottom', 'h'],
      provides: ['rTop', 'rBottom', 'slant', 'sideArea', 'V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const R = v.dBottom / 2;
        const r = v.dTop / 2;
        const V = (Math.PI * v.h * (R * R + R * r + r * r)) / 3;
        const slant = Math.hypot(v.h, R - r);
        const sideArea = Math.PI * (R + r) * slant;
        return {
          values: Object.assign({ rTop: r, rBottom: R, slant, sideArea }, volumeTriple(V)),
          formulaName: '円錐台の体積',
          steps: [
            { formula: '半径 = 直径 ÷ 2', substituted: `上 ${ctx.n(v.dTop, 'length')} ÷ 2 / 下 ${ctx.n(v.dBottom, 'length')} ÷ 2`, result: `${ctx.u(r, 'length')} / ${ctx.u(R, 'length')}` },
            { formula: 'V = π × h × (R² + R×r + r²) ÷ 3', substituted: `π × ${ctx.n(v.h, 'length')} × (${ctx.f(R * R)} + ${ctx.f(R * r)} + ${ctx.f(r * r)}) ÷ 3`, result: ctx.u(V, 'volume', 'L') },
            { formula: '母線 = √(h² + (R − r)²)', substituted: `√(${ctx.n(v.h, 'length')}² + ${ctx.n(Math.abs(R - r), 'length')}²)`, result: ctx.u(slant, 'length') },
            { formula: '側面積 = π × (R + r) × 母線', substituted: `π × ${ctx.n(R + r, 'length')} × ${ctx.n(slant, 'length')}`, result: ctx.u(sideArea, 'area') }
          ]
        };
      }
    },
    {
      // 容量と上下の直径から必要な深さを求める（何mmまで入れれば◯Lか）
      requires: ['V', 'dTop', 'dBottom'],
      provides: ['rTop', 'rBottom', 'h'],
      run(v, ctx) {
        const R = v.dBottom / 2;
        const r = v.dTop / 2;
        const h = (3 * v.V) / (Math.PI * (R * R + R * r + r * r));
        return {
          values: { rTop: r, rBottom: R, h },
          formulaName: '円錐台の体積',
          steps: [{ formula: 'h = 3V ÷ (π × (R² + R×r + r²))', substituted: `3 × ${ctx.u(v.V, 'volume', 'L')} ÷ (π × ${ctx.f(R * R + R * r + r * r)})`, result: ctx.u(h, 'length') }]
        };
      }
    }
  ],

  outputs: [
    { key: 'h', label: '高さ', quantity: 'length' },
    { key: 'rTop', label: '上の半径', quantity: 'length' },
    { key: 'rBottom', label: '下の半径', quantity: 'length' },
    { key: 'slant', label: '母線（斜めの長さ）', quantity: 'length' },
    { key: 'sideArea', label: '側面積', quantity: 'area' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES.concat(['容器の内側の寸法で計算してください。外寸で入れると板厚のぶん多く出ます。'])
};

/* ------------------------------------------------------------------ *
 * vol.tankH 横置き円筒タンクの液量
 *
 * 液深 y のときの断面積（円の弓形）:
 *   A = r²·acos((r − y)/r) − (r − y)·√(2ry − y²)
 * ------------------------------------------------------------------ */

export const volTankH = {
  id: 'vol.tankH',
  category: 'volume',
  title: '横置きタンクの液量',
  subtitle: '横に寝かせた円筒タンクの、液面の深さから残量を計算',
  keywords: ['タンク', '横置き', '残量', '液量', '雨水', 'ドラム缶', '燃料', '水槽'],
  shape: 'tankH',

  fields: [
    lenField('d', 'タンクの直径'),
    lenField('L', 'タンクの長さ'),
    Object.assign(lenField('depth', '液面の深さ', '底から液面までの高さ'), { exclusiveMin: false })
  ],

  solvers: [
    {
      requires: ['d', 'L', 'depth'],
      provides: ['sectionArea', 'fullV_L', 'ratio', 'V_mm3', 'V_m3', 'V_L'],
      run(v, ctx) {
        const r = v.d / 2;
        const y = Math.min(Math.max(v.depth, 0), v.d);
        const A = r * r * Math.acos((r - y) / r) - (r - y) * Math.sqrt(Math.max(0, 2 * r * y - y * y));
        const V = A * v.L;
        const fullV = Math.PI * r * r * v.L;
        const ratio = fullV > 0 ? (V / fullV) * 100 : 0;
        return {
          values: Object.assign({ sectionArea: A, fullV_L: fullV, ratio }, volumeTriple(V)),
          formulaName: '横置き円筒タンクの液量',
          steps: [
            { formula: '半径 = 直径 ÷ 2', substituted: `${ctx.n(v.d, 'length')} ÷ 2`, result: ctx.u(r, 'length') },
            { formula: '断面積 = r²·acos((r − y) ÷ r) − (r − y)·√(2ry − y²)', substituted: `r=${ctx.n(r, 'length')}, y=${ctx.n(y, 'length')}`, result: ctx.u(A, 'area') },
            { formula: '液量 = 断面積 × 長さ', substituted: `${ctx.n(A, 'area')} × ${ctx.n(v.L, 'length')}`, result: ctx.u(V, 'volume', 'L') },
            { formula: '満水量 = π × r² × 長さ', substituted: `π × ${ctx.n(r, 'length')}² × ${ctx.n(v.L, 'length')}`, result: ctx.u(fullV, 'volume', 'L') }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'sectionArea', label: '液面下の断面積', quantity: 'area' },
    { key: 'fullV_L', label: '満水量(L)', quantity: 'volume', defaultUnit: 'L', fixedUnit: true, primary: true },
    { key: 'ratio', label: '満水に対する割合', quantity: 'percent' },
    ...VOLUME_OUTPUTS
  ],

  notes: NOTES.concat(['タンクの内寸で計算してください。鏡板（端部のふくらみ）の分は含みません。'])
};

export default [
  volBox, volCube, volCylinder, volCone, volSphere, volPrismTri,
  volPyramid, volFrustumCone, volTankH
];
