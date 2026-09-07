// solids.js — 立体・曲線の追加図形
//
// 19-4 の規約どおり、骨格を共有する図をまとめて1ファイルから複数の名前付き
// レンダラとして export する（SHAPES は「名前 → {render}」を要求するだけ）。
//   pyramid3d   角錐（vol.pyramid）
//   frustumCone 円錐台＝バケツ・植木鉢（vol.frustumCone）
//   tankH       横置き円筒タンクの液量（vol.tankH）
//   arcSegment  円弧・アール（wood.arc）
//
// 19-5 の規約: labels に無いキーの寸法線は描かない（対応する値を持たない
// ラベルが「—」で残るのを防ぐ）。

import { createScene } from './engine.js';

const SEGMENTS = 48;
const RY_RATIO = 0.32; // 楕円の縦横比（奥行き感）。cylinder3d/cone3d と揃える

const DEPTH_ANGLE = Math.PI / 6.5; // box3d と同じ投影
const DEPTH_SCALE = 0.55;

/** 3D(X:幅, Y:高さ, Z:奥行き) → 2Dモデル座標。box3d.js と同じキャビネット図法 */
function proj(X, Y, Z) {
  return [X + Z * Math.cos(DEPTH_ANGLE) * DEPTH_SCALE, Y + Z * Math.sin(DEPTH_ANGLE) * DEPTH_SCALE];
}

function ellipsePts(cx, cy, rx, ry, fromT, toT, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = fromT + ((toT - fromT) * i) / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return pts;
}

/** labels からラベル指定を組み立てる共通処理 */
function labelHelpers(model) {
  const L = model.labels || {};
  const opt = (key, extra) =>
    Object.assign(
      {
        key,
        text: L[key] ? L[key].text : '—',
        state: L[key] ? L[key].state : 'empty',
        name: L[key] ? L[key].name : key
      },
      extra
    );
  const has = (key) => Object.prototype.hasOwnProperty.call(L, key);
  return { opt, has };
}

function applyFocus(scene, focus) {
  if (!focus) return;
  const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
  if (g) g.classList.add('is-focus');
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/* ==================================================================== *
 * pyramid3d — 角錐（底面 w × d、高さ h）
 * ==================================================================== */

export const pyramid3d = {
  render(model) {
    // 底面の幅ラベルが右下の注記に、奥行ラベルが右の稜線にかからない余白を取る
    const scene = createScene({ ariaLabel: '角錐の図', pad: { bottom: 74, right: 56 } });
    const v = model.values || {};
    const w = num(v.w, 110);
    const d = num(v.d, 60);
    const h = num(v.h, 100);

    const A = proj(0, 0, 0);
    const B = proj(w, 0, 0);
    const C = proj(w, 0, d);
    const D = proj(0, 0, d);
    const apex = proj(w / 2, h, d / 2);
    const baseCenter = proj(w / 2, 0, d / 2);

    const all = [A, B, C, D, apex];
    scene.fit(
      Math.min(...all.map((p) => p[0])),
      Math.min(...all.map((p) => p[1])),
      Math.max(...all.map((p) => p[0])),
      Math.max(...all.map((p) => p[1]))
    );

    const pA = scene.pt(...A);
    const pB = scene.pt(...B);
    const pC = scene.pt(...C);
    const pD = scene.pt(...D);
    const pApex = scene.pt(...apex);
    const pBase = scene.pt(...baseCenter);

    // 底面 → 右の斜面 → 正面の斜面 の順に重ねて、奥の稜線を隠す
    scene.polygon([pA, pB, pC, pD], 'body');
    scene.polygon([pB, pC, pApex], 'body');
    scene.polygon([pA, pB, pApex], 'body');

    const axis = scene.line(pBase, pApex, 'aux');
    axis.setAttribute('stroke-dasharray', '4 3');

    const { opt, has } = labelHelpers(model);
    if (has('w')) scene.dim(pA, pB, opt('w', { offset: 20, labelGap: 11 }));
    if (has('d')) scene.dim(pB, pC, opt('d', { offset: 20, labelGap: 13 }));
    if (has('h')) scene.dim(pBase, pApex, opt('h', { offset: 26, labelGap: 12, flip: true }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * frustumCone — 円錐台（下の直径 dBottom / 上の直径 dTop / 高さ h）
 * バケツ・植木鉢・ホッパーの形。
 * ==================================================================== */

export const frustumCone = {
  render(model) {
    // 下の直径のラベルが右下の注記と重ならないよう、下の余白を広めに取る
    const scene = createScene({ ariaLabel: '円錐台の図', pad: { bottom: 68 } });
    const v = model.values || {};
    const R = num(v.dBottom, 110) / 2;
    const r = num(v.dTop, 150) / 2;
    const h = num(v.h, 110);
    const ryB = R * RY_RATIO;
    const ryT = r * RY_RATIO;
    const xRef = Math.max(R, r);

    scene.fit(-xRef, -ryB, xRef, h + ryT);

    // 側面: 左の稜線 → 手前の底の弧 → 右の稜線（上端は直線。上に楕円を重ねて隠す）
    const body = [
      [-r, h],
      [-R, 0],
      ...ellipsePts(0, 0, R, ryB, Math.PI, Math.PI * 2, SEGMENTS / 2),
      [r, h]
    ];
    scene.polygon(body.map((p) => scene.pt(p[0], p[1])), 'body');
    // 上面（開口部）の楕円を重ねる
    scene.polygon(
      ellipsePts(0, h, r, ryT, 0, Math.PI * 2, SEGMENTS).map((p) => scene.pt(p[0], p[1])),
      'body'
    );

    const { opt, has } = labelHelpers(model);
    if (has('dTop')) {
      scene.dim(scene.pt(-r, h), scene.pt(r, h), opt('dTop', { offset: 26, labelGap: 12, flip: true }));
    }
    if (has('dBottom')) {
      scene.dim(scene.pt(-R, 0), scene.pt(R, 0), opt('dBottom', { offset: 26, labelGap: 12 }));
    }
    if (has('h')) {
      scene.dim(scene.pt(xRef, 0), scene.pt(xRef, h), opt('h', { offset: 22, labelGap: 12 }));
    }

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * tankH — 横置き円筒タンク（直径 d / 長さ L / 液深 depth）
 * 側面から見た図。液面より下を塗って液量を示す。
 * ==================================================================== */

export const tankH = {
  render(model) {
    // 直径ラベル（右）と液深ラベル（左）が viewBox からはみ出さない余白を確保する
    const scene = createScene({ ariaLabel: '横置きタンクの図', pad: { left: 70, right: 72, bottom: 62 } });
    const v = model.values || {};
    const d = num(v.d, 90);
    const L = num(v.L, 190);
    let depth = Number(v.depth);
    if (!Number.isFinite(depth) || depth < 0) depth = d * 0.45;
    depth = Math.min(depth, d);

    const rx = d * 0.16; // 鏡板（端部）の見かけの張り出し
    scene.fit(-rx, 0, L + rx, d);

    // 胴体
    scene.polygon(
      [scene.pt(0, 0), scene.pt(L, 0), scene.pt(L, d), scene.pt(0, d)],
      'body'
    );
    // 液面より下（液量）
    if (depth > 0) {
      scene.polygon(
        [scene.pt(0, 0), scene.pt(L, 0), scene.pt(L, depth), scene.pt(0, depth)],
        'liquid'
      );
      scene.line(scene.pt(0, depth), scene.pt(L, depth), 'aux');
    }
    // 端部の鏡板（円筒であることを示す破線の楕円）
    const cap = ellipsePts(0, d / 2, rx, d / 2, 0, Math.PI * 2, SEGMENTS);
    for (let i = 0; i < cap.length - 1; i++) {
      const seg = scene.line(scene.pt(...cap[i]), scene.pt(...cap[i + 1]), 'aux');
      seg.setAttribute('stroke-dasharray', '3 3');
    }

    const { opt, has } = labelHelpers(model);
    if (has('L')) scene.dim(scene.pt(0, 0), scene.pt(L, 0), opt('L', { offset: 22, labelGap: 12 }));
    if (has('d')) scene.dim(scene.pt(L, 0), scene.pt(L, d), opt('d', { offset: 18, labelGap: 10 }));
    if (has('depth')) {
      scene.dim(scene.pt(0, 0), scene.pt(0, depth), opt('depth', { offset: 18, labelGap: 10, flip: true }));
    }

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * arcSegment — 円弧・アール（弦 chord / 矢 rise / 半径 r）
 * 弦を水平に置き、その上に膨らむ弧を描く。
 * ==================================================================== */

export const arcSegment = {
  render(model) {
    // 半径ラベルを頂点の上に置くぶん、上の余白を広めに取る
    const scene = createScene({ ariaLabel: '円弧の図', pad: { top: 54 } });
    const v = model.values || {};
    const c = num(v.chord, 160);
    let rise = Number(v.rise);
    if (!Number.isFinite(rise) || rise <= 0) rise = c * 0.22;
    // 矢が弦の半分を超えると半円より深くなる。図が破綻しないよう上限を置く
    rise = Math.min(rise, c / 2);

    // 弦の両端 (±c/2, 0)、頂点 (0, rise) を通る円の中心と半径
    const R = (c * c) / (8 * rise) + rise / 2;
    const cy = rise - R; // 中心の y（弦より下にある）
    const half = Math.asin(Math.min(1, c / 2 / R)); // 中心から見た半開き角

    const arc = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = -half + (2 * half * i) / SEGMENTS;
      arc.push([R * Math.sin(t), cy + R * Math.cos(t)]);
    }

    scene.fit(-c / 2, 0, c / 2, rise);

    // 弦と弧で囲まれた部分（弓形）
    scene.polygon(arc.map((p) => scene.pt(p[0], p[1])), 'body');

    const pLeft = scene.pt(-c / 2, 0);
    const pRight = scene.pt(c / 2, 0);
    const pTop = scene.pt(0, rise);
    const pMid = scene.pt(0, 0);

    const chordLine = scene.line(pLeft, pRight, 'aux');
    chordLine.setAttribute('stroke-dasharray', '4 3');

    const { opt, has } = labelHelpers(model);
    if (has('chord')) scene.dim(pLeft, pRight, opt('chord', { offset: 26, labelGap: 12 }));
    if (has('rise')) scene.dim(pMid, pTop, opt('rise', { offset: 20, labelGap: 12 }));
    // 半径は中心が図の外に出ることが多いので、寸法線ではなく頂点の上にラベルを置く
    if (has('r')) scene.tapLabel([pTop[0], pTop[1] - 34], opt('r', {}));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};
