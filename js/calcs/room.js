// room.js — CALC_SPEC.md「建築・リフォーム」（Phase 4 第5グループ）

const NOTES = [
  '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。',
  '構造や法規に関わる判断は、必ず専門家にご確認ください。'
];

const lenField = (key, label, help, extra) =>
  Object.assign({ key, label, quantity: 'length', defaultUnit: 'mm', min: 0, exclusiveMin: true, optional: true, help }, extra);
const areaField = (key, label, help) => ({ key, label, quantity: 'area', defaultUnit: 'mm2', min: 0, exclusiveMin: true, optional: true, help });

/* ==================================================================== *
 * room.wall 壁面積（周長×高さ − 開口部）
 * ==================================================================== */

export const roomWall = {
  id: 'room.wall',
  category: 'room',
  title: '壁面積（開口部を除く）',
  subtitle: '周長・天井高・開口部の合計面積から、塗装や壁紙に必要な壁面積を計算',
  keywords: ['壁面積', 'クロス', '壁紙', '塗装', 'リフォーム', '開口部'],
  shape: 'wallStrip',

  fields: [
    lenField('perimeter', '周長'),
    lenField('height', '天井高'),
    areaField('openings', '開口部の合計面積（任意）', 'ドア・窓など塗らない部分の合計'),
    areaField('area', '壁面積')
  ],

  solvers: [
    {
      requires: ['perimeter', 'height', 'openings'],
      provides: ['area'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const gross = v.perimeter * v.height;
        const area = gross - v.openings;
        return {
          values: { area },
          formulaName: '壁面積',
          steps: [
            { formula: '総壁面積 = 周長 × 天井高', substituted: `${ctx.n(v.perimeter, 'length', au.lengthUnit)} × ${ctx.n(v.height, 'length', au.lengthUnit)}`, result: ctx.u(gross, 'area', au.areaUnit) },
            { formula: '壁面積 = 総壁面積 − 開口部', substituted: `${ctx.n(gross, 'area', au.areaUnit)} − ${ctx.n(v.openings, 'area', au.areaUnit)}`, result: ctx.u(area, 'area', au.areaUnit) }
          ]
        };
      }
    },
    {
      requires: ['perimeter', 'height'],
      provides: ['area'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const area = v.perimeter * v.height;
        return { values: { area }, formulaName: '壁面積', steps: [{ formula: '壁面積 = 周長 × 天井高', substituted: `${ctx.n(v.perimeter, 'length', au.lengthUnit)} × ${ctx.n(v.height, 'length', au.lengthUnit)}`, result: ctx.u(area, 'area', au.areaUnit) }] };
      }
    }
  ],

  outputs: [
    { key: 'perimeter', label: '周長', quantity: 'length' },
    { key: 'height', label: '天井高', quantity: 'length' },
    { key: 'openings', label: '開口部の合計面積', quantity: 'area' },
    { key: 'area', label: '壁面積', quantity: 'area', defaultUnit: 'mm2', primary: true }
  ],

  notEnoughHint(enteredKeys) {
    if (enteredKeys.length === 1 && enteredKeys[0] === 'openings') return '周長と天井高を入力してください（開口部は任意項目です）';
    return null;
  },

  notes: NOTES
};

/* ==================================================================== *
 * room.ceiling 天井・床面積
 * ==================================================================== */

export const roomCeiling = {
  id: 'room.ceiling',
  category: 'room',
  title: '天井・床の面積',
  subtitle: '幅・奥行きから天井や床の面積を計算',
  keywords: ['天井面積', '床面積', 'クロス', 'フローリング', 'リフォーム'],
  shape: 'rectangle',

  fields: [lenField('w', '幅'), lenField('d', '奥行き'), areaField('S', '面積')],

  solvers: [
    {
      requires: ['w', 'd'],
      provides: ['S'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const S = v.w * v.d;
        return { values: { S }, formulaName: '面積', steps: [{ formula: 'S = 幅 × 奥行き', substituted: `${ctx.n(v.w, 'length', au.lengthUnit)} × ${ctx.n(v.d, 'length', au.lengthUnit)}`, result: ctx.u(S, 'area', au.areaUnit) }] };
      }
    },
    {
      requires: ['S', 'w'],
      provides: ['d'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const d = v.S / v.w;
        return { values: { d }, formulaName: '面積', steps: [{ formula: '奥行き = 面積 ÷ 幅', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ ${ctx.n(v.w, 'length', au.lengthUnit)}`, result: ctx.u(d, 'length') }] };
      }
    },
    {
      requires: ['S', 'd'],
      provides: ['w'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const w = v.S / v.d;
        return { values: { w }, formulaName: '面積', steps: [{ formula: '幅 = 面積 ÷ 奥行き', substituted: `${ctx.n(v.S, 'area', au.areaUnit)} ÷ ${ctx.n(v.d, 'length', au.lengthUnit)}`, result: ctx.u(w, 'length') }] };
      }
    }
  ],

  outputs: [
    { key: 'w', label: '幅', quantity: 'length' },
    { key: 'd', label: '奥行き', quantity: 'length' },
    { key: 'S', label: '面積', quantity: 'area', defaultUnit: 'mm2', primary: true }
  ],

  notes: NOTES
};

/* ==================================================================== *
 * room.volume 部屋の体積
 * ==================================================================== */

const VOLUME_OUTPUTS = [
  { key: 'V_mm3', label: '体積(mm³)', quantity: 'volume', defaultUnit: 'mm3', fixedUnit: true },
  { key: 'V_m3', label: '体積(m³)', quantity: 'volume', defaultUnit: 'm3', fixedUnit: true }
];

export const roomVolume = {
  id: 'room.volume',
  category: 'room',
  title: '部屋の体積',
  subtitle: '幅・奥行き・天井高から部屋の体積（気積）を計算',
  keywords: ['部屋の体積', '気積', '換気', 'エアコン', 'リフォーム'],
  shape: 'box3d',
  shapeMap: { w: 'w', d: 'd', h: 'h' },
  fields: [lenField('w', '幅'), lenField('d', '奥行き'), lenField('h', '天井高'), { key: 'V', label: '体積', quantity: 'volume', defaultUnit: 'mm3', min: 0, exclusiveMin: true, optional: true }],

  solvers: [
    {
      requires: ['w', 'd', 'h'],
      provides: ['V_mm3', 'V_m3'],
      run(v, ctx) {
        const V = v.w * v.d * v.h;
        return { values: { V_mm3: V, V_m3: V }, formulaName: '部屋の体積', steps: [{ formula: 'V = 幅 × 奥行き × 天井高', substituted: `${ctx.n(v.w, 'length')} × ${ctx.n(v.d, 'length')} × ${ctx.n(v.h, 'length')}`, result: ctx.u(V, 'volume', 'm3') }] };
      }
    }
  ],

  outputs: [{ key: 'w', label: '幅', quantity: 'length' }, { key: 'd', label: '奥行き', quantity: 'length' }, { key: 'h', label: '天井高', quantity: 'length' }, ...VOLUME_OUTPUTS],

  notes: NOTES
};

/* ==================================================================== *
 * room.multiRect 複数長方形の合成（L字・凹凸の簡易対応）
 * ==================================================================== */

export const roomMultiRect = {
  id: 'room.multiRect',
  category: 'room',
  title: '複数長方形の合成面積',
  subtitle: 'L字型など、2つの長方形に分けられる部屋の合計面積を計算',
  keywords: ['L字', '複合図形', '間取り', '床面積', 'リフォーム'],
  shape: 'twoRects',

  fields: [
    lenField('w1', '長方形1の幅'),
    lenField('d1', '長方形1の奥行き'),
    lenField('w2', '長方形2の幅'),
    lenField('d2', '長方形2の奥行き'),
    areaField('area', '合計面積')
  ],

  solvers: [
    {
      requires: ['w1', 'd1', 'w2', 'd2'],
      provides: ['area'],
      run(v, ctx) {
        const au = ctx.areaUnits();
        const S1 = v.w1 * v.d1;
        const S2 = v.w2 * v.d2;
        const area = S1 + S2;
        return {
          values: { area },
          formulaName: '複数長方形の合成',
          steps: [
            { formula: '長方形1の面積 = 幅1 × 奥行き1', substituted: `${ctx.n(v.w1, 'length', au.lengthUnit)} × ${ctx.n(v.d1, 'length', au.lengthUnit)}`, result: ctx.u(S1, 'area', au.areaUnit) },
            { formula: '長方形2の面積 = 幅2 × 奥行き2', substituted: `${ctx.n(v.w2, 'length', au.lengthUnit)} × ${ctx.n(v.d2, 'length', au.lengthUnit)}`, result: ctx.u(S2, 'area', au.areaUnit) },
            { formula: '合計面積 = 長方形1 + 長方形2', substituted: `${ctx.n(S1, 'area', au.areaUnit)} + ${ctx.n(S2, 'area', au.areaUnit)}`, result: ctx.u(area, 'area', au.areaUnit) }
          ]
        };
      }
    }
  ],

  outputs: [
    { key: 'w1', label: '長方形1の幅', quantity: 'length' },
    { key: 'd1', label: '長方形1の奥行き', quantity: 'length' },
    { key: 'w2', label: '長方形2の幅', quantity: 'length' },
    { key: 'd2', label: '長方形2の奥行き', quantity: 'length' },
    { key: 'area', label: '合計面積', quantity: 'area', defaultUnit: 'mm2', primary: true }
  ],

  notes: NOTES.concat(['3つ以上の長方形に分かれる複雑な間取りには対応していません。2つに分けて計算し、合計を別途足し合わせてください。'])
};

export default [roomWall, roomCeiling, roomVolume, roomMultiRect];
