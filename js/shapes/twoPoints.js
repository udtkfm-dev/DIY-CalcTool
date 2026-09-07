// twoPoints.js — 2点の座標平面図（survey.distance2p / survey.midpoint）
//
// 原点(0,0)を基準に、点1・点2をプロットする。各点の X/Y 座標はタップ可能な
// ラベルとして点の近くに置く（寸法線ではなく、座標そのものをタップして
// テンキーを開く簡易的な表現）。中点（survey.midpoint）が与えられた場合は
// 追加のマーカーとして描く（座標はタップ不可＝出力専用のため）。

import { createScene } from './engine.js';

const FALLBACK = { x1: 0, y1: 0, x2: 90, y2: 60 };

/**
 * @param {object} model
 *   values: { x1,y1,x2,y2, mx?,my? } 内部単位（mm）
 *   labels: { x1,y1,x2,y2 } state/text/name（座標はタップ対象）
 */
export function render(model) {
  const scene = createScene({ ariaLabel: '2点の座標平面図' });

  const v = model.values || {};
  const has = (k) => Number.isFinite(v[k]);
  const x1 = has('x1') ? v.x1 : FALLBACK.x1;
  const y1 = has('y1') ? v.y1 : FALLBACK.y1;
  const x2 = has('x2') ? v.x2 : FALLBACK.x2;
  const y2 = has('y2') ? v.y2 : FALLBACK.y2;
  const hasMid = has('mx') && has('my');

  const xs = [0, x1, x2, hasMid ? v.mx : x1];
  const ys = [0, y1, y2, hasMid ? v.my : y1];
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxX - minX < 1) {
    maxX += 20;
    minX -= 20;
  }
  if (maxY - minY < 1) {
    maxY += 20;
    minY -= 20;
  }
  // 点が端に来ても座標ラベルのピルがはみ出さないよう、余白を追加で確保する
  const marginX = (maxX - minX) * 0.28;
  const marginY = (maxY - minY) * 0.28;
  minX -= marginX;
  maxX += marginX;
  minY -= marginY;
  maxY += marginY;
  scene.fit(minX, minY, maxX, maxY);

  const origin = scene.pt(0, 0);
  const p1 = scene.pt(x1, y1);
  const p2 = scene.pt(x2, y2);

  // 原点を示す十字（軸の目印）
  scene.line([origin[0] - 6, origin[1]], [origin[0] + 6, origin[1]], 'aux');
  scene.line([origin[0], origin[1] - 6], [origin[0], origin[1] + 6], 'aux');

  const connector = scene.line(p1, p2, 'aux');
  connector.setAttribute('stroke-dasharray', '4 3');

  scene.dot(p1);
  scene.dot(p2);
  scene.vertexLabel(p1, '点1', -14, -10);
  scene.vertexLabel(p2, '点2', 14, -10);

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

  // X は点の下、Y は点の横。近すぎるとピルの角が触れるので、Xを少し下へ離す
  if (L.x1) scene.tapLabel([p1[0], p1[1] + 34], opt('x1', {}));
  if (L.y1) scene.tapLabel([p1[0] - 42, p1[1] - 4], opt('y1', {}));
  if (L.x2) scene.tapLabel([p2[0], p2[1] + 34], opt('x2', {}));
  if (L.y2) scene.tapLabel([p2[0] + 42, p2[1] - 4], opt('y2', {}));

  if (hasMid) {
    const pm = scene.pt(v.mx, v.my);
    scene.dot(pm, 4.5, 'body-sub');
    scene.vertexLabel(pm, '中点', 0, -14);
  }

  scene.note();

  const focus = model.focusKey;
  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
