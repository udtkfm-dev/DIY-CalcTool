// icons.js — ラインアイコン
//
// 絵文字ではなく自前のSVGで描くのは、このアプリが計算画面で描く図（shapes/engine.js が
// 出力する製図的な線画）と同じ語彙——細い線・幾何形状・アクセント色——にそろえるため。
// 端末やOSごとに絵柄が変わらない点も、寸法図を扱うアプリでは利点になる。

const ATTR =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

/** カテゴリID → パス。各カテゴリの計算が扱う「形そのもの」を描く */
const CATEGORY_PATHS = {
  // 直角三角形＋直角記号
  triangle: '<path d="M4 5v14h16z"/><path d="M4 16.3h2.7V19"/>',
  // 目盛り付きの定規
  length: '<rect x="2.5" y="9" width="19" height="6" rx="1"/><path d="M7 9v3.2M11.5 9v4M16 9v3.2"/>',
  // 面積（ハッチングを入れた矩形）。ハッチは輪郭より薄くして図面の表現に寄せる
  area: '<rect x="3.5" y="6" width="17" height="12" rx="1"/><path d="M5 16.5l6-6M10 18l7.5-7.5" opacity=".45"/>',
  // 立方体（等角投影）
  volume: '<path d="M12 3l8.5 4.8v8.4L12 21l-8.5-4.8V7.8z"/><path d="M12 12.2l8.5-4.4M12 12.2V21M12 12.2L3.5 7.8"/>',
  // 勾配（斜辺の角度弧つき）
  slope: '<path d="M3.5 19h17V8.5z"/><path d="M9 19a5.5 5.5 0 0 0-.85-2.93"/>',
  // 板と切断線
  wood: '<rect x="2.5" y="8" width="19" height="8" rx="1"/><path d="M14.5 8l3.5 8"/><path d="M5 11.2h5"/>',
  // 等間隔の割付
  layout: '<path d="M3 12h18"/><path d="M3 8.2v7.6M9 9.4v5.2M15 9.4v5.2M21 8.2v7.6"/>',
  // 階段の断面
  stair: '<path d="M3 20h4.5v-4h4.5v-4h4.5V8H21"/>',
  // 切妻屋根
  roof: '<path d="M2.5 13L12 5.5 21.5 13"/><path d="M5.5 12.2V19h13v-6.8"/>',
  // 間取り（開き戸つき）
  room: '<rect x="3" y="4.5" width="18" height="15" rx="1"/><path d="M3 12.5h5.5M15 4.5v6"/><path d="M15 19.5v-4a4 4 0 0 0-4-4" opacity=".55"/>',
  // 骨材入りのスラブ
  concrete:
    '<rect x="3" y="10.5" width="18" height="8.5" rx="1"/><path d="M3 7.5h18"/>' +
    '<circle cx="7.5" cy="14.6" r="1.1" fill="currentColor" stroke="none"/>' +
    '<circle cx="12.4" cy="16.4" r=".95" fill="currentColor" stroke="none"/>' +
    '<circle cx="16.8" cy="13.9" r="1.05" fill="currentColor" stroke="none"/>',
  // 目地で割った4枚のタイル
  tile:
    '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/>' +
    '<rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  // ローラー
  paint: '<rect x="3" y="4" width="13" height="5.5" rx="1"/><path d="M16 6.75h3.5v4.75h-6.5v2.5"/><rect x="10" y="14" width="6" height="6" rx="1"/>',
  // エルボ管
  pipe: '<path d="M4 8.5h5.5a6.5 6.5 0 0 1 6.5 6.5V20"/><path d="M4 5.5v6M13 20h6"/>',
  // 電気（波形）
  elec: '<path d="M2.5 12h4l2.2-5 3.3 10 3.3-10 2.2 5h4"/>',
  // 掘削断面（地層のハッチング）
  earth: '<path d="M2.5 8.5h6.5l3.5 6.5h9"/><path d="M4.2 8.5v3M7.4 8.5v3M13.6 15v3M17 15v3M20.4 15v3"/>',
  // 測点（十字＋ターゲット）
  survey:
    '<circle cx="12" cy="12" r="6.8"/><path d="M12 1.8v4.2M12 18v4.2M1.8 12H6M18 12h4.2"/>' +
    '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  // 構造: 梁に載る荷重とたわみ
  struct:
    '<path d="M3 9h18"/><path d="M4 5.5v2.5M9 4.5v3.5M15 4.5v3.5M20 5.5v2.5" opacity=".55"/>' +
    '<path d="M3 11.5c4.5 3.4 13.5 3.4 18 0" opacity=".5"/>' +
    '<path d="M5 15l-2.2 3.5h4.4zM19 15l-2.2 3.5h4.4z"/>',
  // 家具（椅子の側面）
  furniture: '<path d="M6 3.5v10M6 13.5h11"/><path d="M17 8.5v5"/><path d="M7.5 13.5V20M16 13.5V20"/><path d="M6 8.5h11"/>',
  // 積算（数量を数える）
  estimate:
    '<rect x="3.5" y="3" width="17" height="18" rx="1.5"/><path d="M7 7.5h10"/>' +
    '<path d="M7 12h3M14 12h3M7 16.5h3M14 16.5h3"/>',
  // 機械要素（六角ナット）。歯車の放射線は小さいサイズだと太陽に見えるため使わない
  metal: '<path d="M12 2.6l8.1 4.7v9.4L12 21.4 3.9 16.7V7.3z"/><circle cx="12" cy="12" r="3.4"/>',
  // 空調・断熱（温度計）
  hvac:
    '<path d="M10 14.2V4.8a2 2 0 0 1 4 0v9.4a4 4 0 1 1-4 0z"/>' +
    '<circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none"/><path d="M12 9.5v5"/>',
  // 照明（電球）
  light: '<path d="M9 17h6"/><path d="M9.8 20h4.4"/><path d="M12 3a6 6 0 0 0-3.4 10.9c.5.4.9 1 .9 1.6V17h5v-1.5c0-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z"/>',
  // 立体・3D（等角投影の立方体＋空間対角線）
  solid:
    '<path d="M12 3l8.5 4.8v8.4L12 21l-8.5-4.8V7.8z"/>' +
    '<path d="M12 12.2l8.5-4.4M12 12.2V21M12 12.2L3.5 7.8" opacity=".45"/>' +
    '<path d="M3.5 16.2L20.5 7.8" stroke-dasharray="3 2"/>',
  // 庭（芽）
  garden:
    '<path d="M12 21v-8"/><path d="M12 13c0-3.3-2.5-6-6-6 0 3.3 2.5 6 6 6z"/>' +
    '<path d="M12 15.5c0-3 2.2-5.5 5.5-5.5 0 3-2.2 5.5-5.5 5.5z"/>'
};

/**
 * 図形ID → その図形を象徴するアイコン。計算一覧の各行に「その計算で出てくる図」を
 * 出すために使う（分野アイコンだけだと同じカテゴリの計算が全部同じ絵になるため）。
 * 図形を持たない計算はカテゴリのアイコンにフォールバックする。
 */
const SHAPE_PATHS = {
  rightTriangle: '<path d="M4 5v14h16z"/><path d="M4 16.3h2.7V19"/>',
  triangle: '<path d="M12 4L21 19H3z"/>',
  triangleBH: '<path d="M4 19h16L9 5z"/><path d="M9 5v14" stroke-dasharray="3 2" opacity=".6"/>',
  rectangle: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 18L21 6" opacity=".45"/>',
  circle: '<circle cx="12" cy="12" r="8.2"/><path d="M12 12h8.2"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  trapezoid: '<path d="M7 6h10l4 12H3z"/>',
  parallelogram: '<path d="M8 6h13l-5 12H3z"/>',
  sector: '<path d="M5 19V5A14 14 0 0 1 19 19z"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6"/><path d="M12 12h9" opacity=".5"/>',
  lineSegment: '<path d="M3 12h18"/><path d="M3 8.2v7.6M9 9.4v5.2M15 9.4v5.2M21 8.2v7.6"/>',
  centerLine: '<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M12 3.5v17" stroke-dasharray="4 2.5"/>',
  miterAngle: '<path d="M3 18h18"/><path d="M7 18L14.5 6"/><path d="M11.6 18a5 5 0 0 0-.7-2.6"/>',
  box3d: '<path d="M12 3l8.5 4.8v8.4L12 21l-8.5-4.8V7.8z"/><path d="M12 12.2l8.5-4.4M12 12.2V21M12 12.2L3.5 7.8"/>',
  cylinder3d: '<ellipse cx="12" cy="6.6" rx="7" ry="2.8"/><path d="M5 6.6v10.8a7 2.8 0 0 0 14 0V6.6"/>',
  cone3d: '<path d="M12 3.6l7 13.8a7 2.8 0 0 1-14 0z"/>',
  sphere3d: '<circle cx="12" cy="12" r="8.2"/><ellipse cx="12" cy="12" rx="8.2" ry="3.2" opacity=".55"/>',
  prism3d: '<path d="M3 18h10L8 9z"/><path d="M8 9l5-3 5 9-5 3M13 18l5-3"/>',
  pyramid3d: '<path d="M12 3L3.5 17.5h17z"/><path d="M12 3l3.5 17M3.5 17.5l12 2.5 5-2.5" opacity=".55"/>',
  frustumCone: '<ellipse cx="12" cy="7" rx="4.5" ry="1.9"/><path d="M7.5 7L4 17.2a8 3.2 0 0 0 16 0L16.5 7"/>',
  frustumPyramid: '<path d="M8 6.5h8l4 11H4z"/><path d="M8 6.5l-4 11" opacity="0"/>',
  sphereCap: '<path d="M3.5 16.5a9 9 0 0 1 17 0z"/><ellipse cx="12" cy="16.5" rx="8.5" ry="2.2" opacity=".55"/>',
  tankH: '<rect x="3" y="7.5" width="18" height="9" rx="4.5"/><path d="M3.6 13.2h16.8" opacity=".7"/><path d="M4 16.5h16" opacity=".35"/>',
  arcSegment: '<path d="M3 17.5a12 12 0 0 1 18 0"/><path d="M3 17.5h18"/><path d="M12 17.5v-4.1"/>',
  pipe3d: '<rect x="2.5" y="8.5" width="19" height="7" rx="1"/><ellipse cx="2.5" cy="12" rx="1.6" ry="3.5"/><path d="M21.5 8.5a1.6 3.5 0 0 0 0 7" opacity=".6"/>',
  bendSheet: '<path d="M4 4.5v15h16"/><path d="M6.5 4.5v12.5H20" opacity=".55"/>',
  weldFillet:
    '<path d="M3 15h18v4.5H3z"/><path d="M3 4h4.5v11H3z"/>' +
    '<path d="M7.5 15h5l-5-5z" fill="currentColor" stroke="none" opacity=".45"/><path d="M7.5 10l5 5"/>',
  wallLayers: '<path d="M4 4v16M9.5 4v16M16 4v16M20 4v16"/><path d="M9.5 12h6.5" stroke-dasharray="2.5 2" opacity=".6"/>',
  column: '<path d="M5 3.5h14M5 20.5h14"/><path d="M9.5 3.5v17M14.5 3.5v17"/>',
  pumpHead:
    '<path d="M3 19h6v2H3z"/><path d="M6 19V8h9"/><path d="M18.5 4v16" opacity=".5"/>' +
    '<path d="M18.5 5.5l-1.6 2.4h3.2zM18.5 18.5l-1.6-2.4h3.2z" fill="currentColor" stroke="none" opacity=".7"/>',
  ratioBar: '<rect x="2.5" y="8" width="19" height="8" rx="1"/><path d="M10 8v8M15 8v8"/>',
  barsMulti: '<path d="M3 5.5h16M3 10h11M3 14.5h18M3 19h8"/>',
  scalePair: '<rect x="3" y="5" width="6" height="4" rx=".8"/><rect x="3" y="14" width="18" height="5" rx=".8"/><path d="M11 7h4" stroke-dasharray="2 2" opacity=".7"/>',
  polygonPts:
    '<path d="M5 7.5L12 3.5l7 4L16.5 18h-9z"/>' +
    '<circle cx="5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="3.5" r="1.5" fill="currentColor" stroke="none"/>' +
    '<circle cx="19" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>',
  twoPoints:
    '<circle cx="5.5" cy="17" r="2"/><circle cx="18.5" cy="7" r="2"/>' +
    '<path d="M7.2 15.7L16.8 8.3" stroke-dasharray="3 2"/>',
  offsetPoint:
    '<path d="M3.5 18.5h17"/><path d="M12.5 18.5V11"/><circle cx="12.5" cy="9.2" r="2"/>' +
    '<path d="M11.4 17.4h1.1v1.1" opacity=".7"/>',
  stairPath: '<path d="M3 20h4.5v-4h4.5v-4h4.5V8H21"/>',
  wallStrip: '<rect x="3" y="6" width="18" height="12" rx="1"/><rect x="8.5" y="10" width="7" height="8"/>',
  twoRects: '<rect x="3" y="5" width="11" height="8" rx="1"/><rect x="9.5" y="11" width="11.5" height="8" rx="1"/>',
  beamUdl:
    '<path d="M3 13h18"/><path d="M5 6.5v4M9 6.5v4M13 6.5v4M17 6.5v4M20 6.5v4" opacity=".6"/>' +
    '<path d="M5 13l-2 4h4zM19 13l-2 4h4z"/>',
  beamPoint:
    '<path d="M3 14h18"/><path d="M12 5v7"/><path d="M12 12.5l-2.2-3.2h4.4z" fill="currentColor" stroke="none"/>' +
    '<path d="M5 14l-2 4h4zM19 14l-2 4h4z"/>',
  beamCantilever:
    '<path d="M4 4.5v15"/><path d="M4 11h15"/><path d="M19 4.5v5"/>' +
    '<path d="M19 10l-2.2-3.2h4.4z" fill="currentColor" stroke="none"/>'
};

/**
 * 計算ID → 固有アイコン。図形アイコンだけでは同じカテゴリ内が同じ絵になってしまう計算
 * （電気・機械・設備など、図形を持たないか同じ図形を流用しているもの）に、
 * その計算の対象物そのものを描いて一覧で見分けられるようにする。
 * ここに無い計算は 図形アイコン → カテゴリアイコン の順にフォールバックする。
 */
const CALC_PATHS = {
  /* 立体・3D（box3d を共有していて絵が同じになるもの） */
  'solid.diagonal':
    '<path d="M12 3l8.5 4.8v8.4L12 21l-8.5-4.8V7.8z"/>' +
    '<path d="M12 12.2l8.5-4.4M12 12.2V21M12 12.2L3.5 7.8" opacity=".4"/>' +
    '<path d="M3.5 16.2L20.5 7.8"/>',
  'solid.surfaceBox':
    '<path d="M12 3l8.5 4.8v8.4L12 21l-8.5-4.8V7.8z"/><path d="M12 12.2l8.5-4.4M12 12.2V21M12 12.2L3.5 7.8"/>' +
    '<path d="M12 12.2L20.5 7.8v8.4L12 21z" fill="currentColor" stroke="none" opacity=".22"/>',
  'solid.distance3d':
    '<path d="M4 20V6M4 20h15" opacity=".5"/><path d="M4 20l5-4" opacity=".5"/>' +
    '<circle cx="7.5" cy="16.5" r="1.9"/><circle cx="18" cy="7" r="1.9"/>' +
    '<path d="M9.1 15.4l7.4-6.9" stroke-dasharray="3 2"/>',
  'solid.coneDev': '<path d="M12 3.6l7 13.8a7 2.8 0 0 1-14 0z" opacity=".45"/><path d="M20.5 20.5A9 9 0 0 0 11.5 11.5v9z"/>',

  /* 電気 */
  'elec.ohm': '<circle cx="12" cy="12" r="8.4"/><path d="M8.8 17.2v-1.4a4.3 4.3 0 1 1 6.4 0v1.4"/><path d="M7.4 17.2h2.6M14 17.2h2.6"/>',
  'elec.cost': '<path d="M12 11.5V20"/><path d="M7.5 4l4.5 7.5L16.5 4"/><path d="M8.4 13.4h7.2M8.4 16.4h7.2"/>',
  'elec.series': '<path d="M2 12h3.5M10.5 12h3M18.5 12H22"/><rect x="5.5" y="9.3" width="5" height="5.4" rx="1"/><rect x="13.5" y="9.3" width="5" height="5.4" rx="1"/>',
  'elec.parallel': '<path d="M2 12h3.5M18.5 12H22"/><path d="M5.5 6v12M18.5 6v12"/><rect x="8" y="3.6" width="8" height="4.4" rx="1"/><rect x="8" y="16" width="8" height="4.4" rx="1"/><path d="M5.5 5.8H8M16 5.8h2.5M5.5 18.2H8M16 18.2h2.5"/>',
  'elec.voltDrop': '<path d="M3 8h18v8H3z" opacity=".3"/><path d="M3 12h18"/><path d="M6 5.5v13M18 5.5v13"/><path d="M9.5 9.6l2.5 4.8 2.5-4.8" opacity=".85"/>',
  'elec.threePhase': '<path d="M2.5 12h4l1.8-5 2.7 10 2.7-10 1.8 5h4"/><path d="M4 17.5h16" opacity=".5"/><path d="M4 20h16" opacity=".3"/>',
  'elec.led': '<path d="M9 4h6v6.5a3 3 0 0 1-6 0z"/><path d="M10.5 13.5v6M13.5 13.5v6"/><path d="M17 4.5l2.5-2M18.5 8h3" opacity=".7"/>',
  'elec.load': '<path d="M6 9.5h12v5.5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/><path d="M9 9.5V4.5M15 9.5V4.5"/><path d="M12 19v2.5" opacity=".7"/>',

  /* 金属加工・機械 */
  'metal.bend': '<path d="M3 17h9a5 5 0 0 0 5-5V4"/><path d="M3 20h9a8 8 0 0 0 8-8V4" opacity=".55"/>',
  'metal.cutting': '<path d="M10 3h4v9h-4z"/><path d="M12 12v6"/><path d="M9.5 18h5l-2.5 3z"/><path d="M4 21h16" opacity=".45"/>',
  'metal.torque': '<path d="M15.5 3.5a4.5 4.5 0 0 0-4 6.7L4 17.7 6.3 20l7.5-7.5a4.5 4.5 0 0 0 5.7-5.8l-2.6 2.6-2.2-2.2z"/>',
  'metal.weld': '<path d="M4 20V8h12"/><path d="M4 8l8-4"/><path d="M4.5 12.5L11 8" stroke-dasharray="2.5 2"/>',
  'metal.weight': '<path d="M7 8h10l2.5 12h-15z"/><path d="M9.6 8V5.6a2.4 2.4 0 0 1 4.8 0V8"/>',
  'metal.tap': '<path d="M10 3h4v5h-4z"/><path d="M9.5 8h5v9l-2.5 4-2.5-4z"/><path d="M9.5 10.5h5M9.5 13h5M9.5 15.5h5" opacity=".7"/>',
  'metal.tube': '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.8"/><path d="M12 3.6v3.6" opacity=".7"/>',

  /* 構造 */
  'struct.bending': '<path d="M3 8h18"/><path d="M3 8v4M21 8v4" opacity=".5"/><path d="M4 16.5c4.5 3.6 11.5 3.6 16 0"/><path d="M12 4.5v3"/><path d="M12 8l-2-2.6h4z" fill="currentColor" stroke="none"/>',
  'struct.column': '<path d="M8 20h8"/><path d="M9.5 20V7h5v13"/><path d="M12 2v3.4"/><path d="M12 6l-2.2-3h4.4z" fill="currentColor" stroke="none"/>',
  'struct.slender': '<path d="M7 21h10"/><path d="M10.5 21V4h3v17"/><path d="M4 4v17" stroke-dasharray="3 2" opacity=".55"/>',

  /* 配管・設備 */
  'pipe.volume': '<path d="M3 7.5h18v9H3z"/><path d="M3 12h18" opacity=".4"/><path d="M6 7.5v9M18 7.5v9" opacity=".4"/>',
  'pipe.pressureLoss': '<circle cx="12" cy="12" r="7.5"/><path d="M12 12l4-3.5"/><path d="M12 12v0" /><path d="M12 4.5v1.6M19.5 12h-1.6M12 19.5v-1.6M4.5 12h1.6" opacity=".6"/>',
  'pipe.pumpHead': '<circle cx="9" cy="15" r="5"/><path d="M9 15l3.5-3.5"/><path d="M14 8.5h6v-4"/><path d="M9 20v1.5H3" opacity=".6"/>',
  'pipe.tank': '<path d="M5 6.5h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><ellipse cx="12" cy="6.5" rx="7" ry="2.4"/><path d="M5.4 13.5h13.2" opacity=".65"/>',

  /* 塗装・仕上げ */
  'paint.area': '<rect x="3" y="4" width="13" height="5.5" rx="1"/><path d="M16 6.75h3.5v4.75h-6.5v2.5"/><rect x="10" y="14" width="6" height="6" rx="1"/>',
  'wallpaper.length': '<path d="M5 3.5h11a3 3 0 0 1 0 6H9"/><path d="M9 9.5v11H5a3 3 0 0 1 0-6h4"/><path d="M16 3.5a3 3 0 0 0 0 6" opacity=".6"/>',
  'paint.thinner': '<path d="M8 8.5h8v11a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5z"/><path d="M9.5 8.5V5h5v3.5"/><path d="M8 14h8" opacity=".55"/><path d="M19 3.5c1.4 1.8 2 2.9 2 3.7a2 2 0 0 1-4 0c0-.8.6-1.9 2-3.7z"/>',

  /* 空調・断熱 */
  'hvac.uvalue': '<path d="M4 4v16M9 4v16M14 4v16M20 4v16" opacity=".85"/><path d="M4 12h16" stroke-dasharray="3 2" opacity=".5"/>',
  'hvac.heatLoss': '<path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 10.6V20h13v-9.4"/><path d="M14 13.5h5M14 16.5h4" opacity=".7"/>',
  'hvac.ventilation': '<circle cx="12" cy="12" r="8.4"/><path d="M12 12c0-3.4 1.2-5.2 3.6-5.2S18 9.6 12 12zM12 12c2.9 1.7 3.4 3.8 2.2 5.9S10.6 18.6 12 12zM12 12c-2.9-1.7-4.6-3-3.4-5.1S13.4 5.6 12 12z"/>',
  'hvac.aircon': '<rect x="3" y="5" width="18" height="7" rx="2"/><path d="M6.5 9h11" opacity=".6"/><path d="M8 15v3M12 15v4M16 15v3" opacity=".8"/>',
  'hvac.dew': '<path d="M12 3.5c3.6 4.6 5.4 7.5 5.4 9.6A5.4 5.4 0 0 1 6.6 13c0-2.1 1.8-5 5.4-9.5z"/><path d="M9.3 13.6a2.8 2.8 0 0 0 2.2 2.6" opacity=".6"/>',

  /* 照明 */
  'light.lux': '<path d="M12 3a5.5 5.5 0 0 0-3.1 10c.5.4.8 1 .8 1.6V16h4.6v-1.4c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3z"/><path d="M9.7 19h4.6"/><path d="M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 6.9l1.3-1.3" opacity=".6"/>',
  'light.spacing': '<path d="M6.5 4a3.5 3.5 0 0 0-2 6.4V12h4v-1.6A3.5 3.5 0 0 0 6.5 4z"/><path d="M5 14h3"/><path d="M17.5 4a3.5 3.5 0 0 0-2 6.4V12h4v-1.6A3.5 3.5 0 0 0 17.5 4z"/><path d="M16 14h3"/><path d="M6.5 19h11" stroke-dasharray="3 2"/>',

  /* 庭・外構 */
  'garden.material': '<path d="M6.5 8h11l1.5 12H5z"/><path d="M6.5 8c0-2.2 2.5-4 5.5-4s5.5 1.8 5.5 4" opacity=".7"/><path d="M9 14.5h6" opacity=".55"/>',
  'garden.deck': '<path d="M3 6.5h18M3 10h18M3 13.5h18M3 17h18"/><path d="M7 4v16M17 4v16" opacity=".4"/>',
  'garden.brick': '<rect x="2.5" y="5" width="19" height="4.4" rx=".6"/><rect x="2.5" y="10.2" width="19" height="4.4" rx=".6"/><rect x="2.5" y="15.4" width="19" height="4.4" rx=".6"/><path d="M12 5v4.4M7 10.2v4.4M17 10.2v4.4M12 15.4v4.4" opacity=".55"/>',

  /* 材料・積算 */
  'estimate.cost': '<path d="M12 11.5V20"/><path d="M7.5 4l4.5 7.5L16.5 4"/><path d="M8.4 13.4h7.2M8.4 16.4h7.2"/>',
  'estimate.screws': '<path d="M8.5 3h7l-1 3.5h-5z"/><path d="M9.5 6.5h5v8L12 21l-2.5-6.5z"/><path d="M9.6 9h4.8M9.8 11.5h4.4M10.2 14h3.6" opacity=".7"/>',
  'estimate.bag': '<path d="M6.5 8h11l1.5 12H5z"/><path d="M8.5 8V5.5h7V8"/><path d="M9 13h6" opacity=".6"/>',

  /* コンクリート */
  'concrete.mix': '<path d="M4 9h13l-1.6 9H5.6z"/><path d="M3 6h15l-1 3"/><path d="M17.5 12.5H21v6h-3.4" opacity=".6"/>',
  'concrete.rebar': '<path d="M3 8h18M3 13h18M3 18h18" opacity=".45"/><path d="M7 4v17M12 4v17M17 4v17"/>',

  /* 木工・その他 */
  'wood.moisture': '<rect x="2.5" y="9" width="19" height="7" rx="1"/><path d="M17 5.5c1.5 2 2.2 3.2 2.2 4.1a2.2 2.2 0 0 1-4.4 0c0-.9.7-2.1 2.2-4.1z" fill="var(--surface)"/><path d="M6 12h5" opacity=".6"/>',
  'survey.polygon': '<path d="M5 8.5L12 3.5l7 4.5-2.5 10h-9z"/><circle cx="5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="3.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="8.5" r="1.4" fill="currentColor" stroke="none"/>',
  'area.compound': '<path d="M3.5 4h9v8h8v8h-17z"/>',
  'room.volume': '<path d="M3 9.5L12 3l9 6.5V20H3z"/><path d="M12 3v17M3 9.5h18" opacity=".45"/>',
  'roof.slope': '<path d="M3 19h18L3 8z"/><path d="M9 19a6 6 0 0 0-.9-3.1"/>',
  'tile.grout': '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M12 2v20M2 12h20" opacity=".35"/>',
  'basic.scale': '<path d="M3 20L21 4"/><path d="M3 20h6v-6" opacity=".5"/><path d="M15 10V4h6" opacity=".5"/>',
  'basic.fraction': '<path d="M6 20L18 4"/><path d="M6.5 5.5h4M8.5 3.5v4"/><circle cx="16.5" cy="17" r="2.2"/>',
  'basic.percent': '<path d="M5 19L19 5"/><circle cx="7.5" cy="7.5" r="2.8"/><circle cx="16.5" cy="16.5" r="2.8"/>',
  'basic.ratio': '<path d="M4 20V9h5v11zM10.5 20V4h5v16zM17 20v-7h3v7z"/>'
};

const UI_PATHS = {
  // 半径の寸法線を引いた円（area.circle 用）
  circle: '<circle cx="12" cy="12" r="8.2"/><path d="M12 12h8.2"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.7 15.7L21 21"/>',
  // 設定はスライダー型。歯車の放射線は小さいサイズだと太陽に見えるため使わない
  gear: '<path d="M3.5 8h9M17 8h3.5M3.5 16h4M11.5 16h9"/><circle cx="14.75" cy="8" r="2.4"/><circle cx="9.25" cy="16" r="2.4"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  star: '<path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z"/>'
};

/** 汎用アイコン。size は px（正方形） */
export function icon(name, size = 20) {
  const d = UI_PATHS[name];
  if (!d) return '';
  return `<svg ${ATTR} width="${size}" height="${size}">${d}</svg>`;
}

/**
 * カテゴリアイコン。未定義のカテゴリが追加された場合は null を返すので、
 * 呼び出し側で CATEGORIES の絵文字にフォールバックできる。
 */
export function categoryIcon(catId, size = 22) {
  const d = CATEGORY_PATHS[catId];
  if (!d) return null;
  return `<svg ${ATTR} width="${size}" height="${size}">${d}</svg>`;
}

/**
 * ヘッダの「戻る」ボタン。全画面（計算・カテゴリ・検索・履歴・設定・about・複合図形）で
 * 同じ見た目にするため、生成をここ1か所に集約する。
 * @param {Function} [onClick] 既定は history.back()
 */
export function backButton(onClick) {
  const b = document.createElement('button');
  b.className = 'appbar__btn appbar__btn--back';
  b.type = 'button';
  b.setAttribute('aria-label', '戻る');
  b.innerHTML = `<span class="back__chev">${icon('chevronLeft', 17)}</span><span>戻る</span>`;
  b.addEventListener('click', onClick || (() => history.back()));
  return b;
}

/**
 * 計算1件のアイコン。その計算が描く図形を優先し、図形を持たない計算は
 * 分野のアイコンにフォールバックする。
 * @param {object} def CalcDef
 */
export function calcIcon(def, size = 20) {
  if (!def) return null;
  const d = CALC_PATHS[def.id] || (def.shape && SHAPE_PATHS[def.shape]) || CATEGORY_PATHS[def.category];
  if (!d) return null;
  return `<svg ${ATTR} width="${size}" height="${size}">${d}</svg>`;
}
