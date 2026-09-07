// units.js — 単位定義と換算
//
// 内部単位は長さ mm / 面積 mm² / 体積 mm³ / 角度 deg に統一する。
// factor は「その単位1つ分が内部単位でいくつか」を表す。
//   内部値 = 表示値 × factor
//   表示値 = 内部値 ÷ factor

/** 数量の種類 */
export const QUANTITIES = [
  'length', 'area', 'volume', 'angle', 'ratio', 'percent', 'number',
  'voltage', 'current', 'resistance', 'power', 'energy', 'currency',
  'force', 'stress', 'moment', 'inertia', 'sectionMod', 'weight',
  'flow', 'velocity', 'illuminance', 'luminous',
  'uvalue', 'thermalRes', 'conductivity', 'tempDiff', 'temperature',
  'torque', 'rpm'
];

/**
 * attached:true の単位はスペースを空けずに数値へ付ける（°, %）。
 * note は単位ピッカーに出す補足（地域差のある単位に付ける）。
 */
export const UNIT_DEFS = {
  length: {
    base: 'mm',
    units: [
      { id: 'mm', label: 'mm', factor: 1 },
      { id: 'cm', label: 'cm', factor: 10 },
      { id: 'm', label: 'm', factor: 1000 },
      { id: 'inch', label: 'inch', factor: 25.4 },
      { id: 'ft', label: 'ft', factor: 304.8 },
      { id: 'shaku', label: '尺', factor: 10000 / 33, note: '尺貫法は地域差があります' },
      { id: 'sun', label: '寸', factor: 1000 / 33, note: '尺貫法は地域差があります' }
    ]
  },
  area: {
    base: 'mm2',
    units: [
      { id: 'mm2', label: 'mm²', factor: 1 },
      { id: 'cm2', label: 'cm²', factor: 100 },
      { id: 'm2', label: 'm²', factor: 1e6 },
      { id: 'tsubo', label: '坪', factor: 3305785.124, note: '1坪 = 3.305785124 m²' },
      { id: 'jo', label: '畳', factor: 1653000, note: '中京間（1畳 = 1.653 m²）で計算しています。地域・物件により畳の大きさは異なります' }
    ]
  },
  volume: {
    base: 'mm3',
    units: [
      { id: 'mm3', label: 'mm³', factor: 1 },
      { id: 'cm3', label: 'cm³', factor: 1000 },
      { id: 'm3', label: 'm³', factor: 1e9 },
      { id: 'L', label: 'L', factor: 1e6 },
      { id: 'mL', label: 'mL', factor: 1000 }
    ]
  },
  angle: {
    base: 'deg',
    units: [
      { id: 'deg', label: '°', factor: 1, attached: true },
      { id: 'rad', label: 'rad', factor: 180 / Math.PI }
    ]
  },
  ratio: {
    base: 'ratio',
    picker: false,
    units: [{ id: 'ratio', label: '', factor: 1, attached: true }]
  },
  percent: {
    base: 'percent',
    picker: false,
    units: [{ id: 'percent', label: '%', factor: 1, attached: true }]
  },
  number: {
    base: 'number',
    picker: false,
    units: [{ id: 'number', label: '', factor: 1, attached: true }]
  },
  // 電気計算（elec.*）専用。V/A/Ω は単位換算の需要が無いため単一単位のみ持つ。
  voltage: {
    base: 'V',
    picker: false,
    units: [{ id: 'V', label: 'V', factor: 1 }]
  },
  current: {
    base: 'A',
    picker: false,
    units: [{ id: 'A', label: 'A', factor: 1 }]
  },
  resistance: {
    base: 'ohm',
    picker: false,
    units: [{ id: 'ohm', label: 'Ω', factor: 1 }]
  },
  power: {
    base: 'W',
    units: [
      { id: 'W', label: 'W', factor: 1 },
      { id: 'kW', label: 'kW', factor: 1000 }
    ]
  },
  energy: {
    base: 'Wh',
    units: [
      { id: 'Wh', label: 'Wh', factor: 1 },
      { id: 'kWh', label: 'kWh', factor: 1000 }
    ]
  },
  currency: {
    base: 'yen',
    picker: false,
    units: [{ id: 'yen', label: '円', factor: 1, attached: true }]
  },

  /* ---- 構造・強度（struct.* / furniture.shelf）---- *
   * 建築・木工の実務にならい、応力とヤング係数はどちらも N/mm²（= MPa）を基準にする。
   * 断面二次モーメント・断面係数は体積(mm³)と数値が紛らわしいため、別量種として持つ
   * （volume を流用すると「L で見る」のサジェストが出てしまい意味が通らない）。 */
  force: {
    base: 'N',
    units: [
      { id: 'N', label: 'N', factor: 1 },
      { id: 'kN', label: 'kN', factor: 1000 },
      { id: 'kgf', label: 'kgf', factor: 9.80665 }
    ]
  },
  stress: {
    base: 'Nmm2',
    units: [
      { id: 'Nmm2', label: 'N/mm²', factor: 1 },
      { id: 'GPa', label: 'GPa', factor: 1000 },
      { id: 'kNm2', label: 'kN/m²', factor: 0.001 }
    ]
  },
  moment: {
    base: 'Nmm',
    units: [
      { id: 'Nmm', label: 'N·mm', factor: 1 },
      { id: 'Nm', label: 'N·m', factor: 1000 },
      { id: 'kNm', label: 'kN·m', factor: 1e6 }
    ]
  },
  inertia: {
    base: 'mm4',
    units: [
      { id: 'mm4', label: 'mm⁴', factor: 1 },
      { id: 'cm4', label: 'cm⁴', factor: 1e4 }
    ]
  },
  sectionMod: {
    base: 'mm3s',
    units: [
      { id: 'mm3s', label: 'mm³', factor: 1 },
      { id: 'cm3s', label: 'cm³', factor: 1000 }
    ]
  },
  weight: {
    base: 'kg',
    units: [
      { id: 'kg', label: 'kg', factor: 1 },
      { id: 'g', label: 'g', factor: 0.001 },
      { id: 't', label: 't', factor: 1000 }
    ]
  },

  /* ---- 配管・流体（pipe.*）---- */
  flow: {
    base: 'Lmin',
    units: [
      { id: 'Lmin', label: 'L/min', factor: 1 },
      { id: 'Ls', label: 'L/s', factor: 60 },
      { id: 'm3h', label: 'm³/h', factor: 1000 / 60 },
      { id: 'm3s', label: 'm³/s', factor: 60000 }
    ]
  },
  velocity: {
    base: 'ms',
    units: [
      { id: 'ms', label: 'm/s', factor: 1 },
      { id: 'mmin', label: 'm/min', factor: 1 / 60 }
    ]
  },

  /* ---- 照明（light.*）---- */
  illuminance: {
    base: 'lx',
    picker: false,
    units: [{ id: 'lx', label: 'lx', factor: 1 }]
  },
  luminous: {
    base: 'lm',
    picker: false,
    units: [{ id: 'lm', label: 'lm', factor: 1 }]
  },

  /* ---- 空調・断熱（hvac.*）---- */
  uvalue: {
    base: 'Wm2K',
    picker: false,
    units: [{ id: 'Wm2K', label: 'W/(m²·K)', factor: 1 }]
  },
  thermalRes: {
    base: 'm2KW',
    picker: false,
    units: [{ id: 'm2KW', label: 'm²·K/W', factor: 1 }]
  },
  conductivity: {
    base: 'WmK',
    picker: false,
    units: [{ id: 'WmK', label: 'W/(m·K)', factor: 1 }]
  },
  tempDiff: {
    base: 'K',
    picker: false,
    units: [{ id: 'K', label: '℃', factor: 1 }]
  },
  /* 温度そのもの（露点計算など）。差ではなく実温度なので負の値を取り得る。
     Field に min を付けなければ、独自テンキーに符号キーが出る（12-1の規約）。 */
  temperature: {
    base: 'degC',
    picker: false,
    units: [{ id: 'degC', label: '℃', factor: 1 }]
  },

  /* ---- 金属加工・機械要素（metal.*）---- */
  torque: {
    base: 'Nm',
    units: [
      { id: 'Nm', label: 'N·m', factor: 1 },
      { id: 'kgfm', label: 'kgf·m', factor: 9.80665 }
    ]
  },
  rpm: {
    base: 'rpm',
    picker: false,
    units: [{ id: 'rpm', label: 'min⁻¹', factor: 1 }]
  }
};

/** 長さ単位 → 対応する面積単位（計算過程を長さ単位に追従させるために使う） */
export const SQUARE_OF_LENGTH = { mm: 'mm2', cm: 'cm2', m: 'm2' };

export function unitList(quantity) {
  const def = UNIT_DEFS[quantity];
  return def ? def.units : [];
}

export function hasPicker(quantity) {
  const def = UNIT_DEFS[quantity];
  return !!def && def.picker !== false && def.units.length > 1;
}

export function baseUnit(quantity) {
  const def = UNIT_DEFS[quantity];
  return def ? def.base : 'number';
}

export function getUnit(quantity, unitId) {
  const list = unitList(quantity);
  return list.find((u) => u.id === unitId) || list[0] || null;
}

export function unitLabel(quantity, unitId) {
  const u = getUnit(quantity, unitId);
  return u ? u.label : '';
}

export function isAttachedUnit(quantity, unitId) {
  const u = getUnit(quantity, unitId);
  return !!(u && u.attached);
}

export function unitNote(quantity, unitId) {
  const u = getUnit(quantity, unitId);
  return u && u.note ? u.note : '';
}

/** 表示値 → 内部値 */
export function toBase(value, quantity, unitId) {
  const u = getUnit(quantity, unitId);
  if (!u || !Number.isFinite(value)) return NaN;
  return value * u.factor;
}

/** 内部値 → 表示値 */
export function fromBase(value, quantity, unitId) {
  const u = getUnit(quantity, unitId);
  if (!u || !Number.isFinite(value)) return NaN;
  return value / u.factor;
}

/** 単位どうしの直接換算（表示単位の切替に使う） */
export function convert(value, quantity, fromUnitId, toUnitId) {
  return fromBase(toBase(value, quantity, fromUnitId), quantity, toUnitId);
}

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
