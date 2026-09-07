// offsetPoint.js — 基準線からのオフセット位置（survey.offset）の作図
//
// 基準点1→基準点2の線を引き、その線に沿った距離 along（負値で逆方向）と、
// 直角方向のオフセット offset（符号で左右を区別）をタップ可能な寸法として示す。
// 結果の点(px,py)はマーカーのみ（出力専用のためタップ不可）。

import { createScene } from './engine.js';

const FALLBACK = { x1: 0, y1: 0, x2: 100, y2: 0, along: 60, offset: 30 };

/**
 * @param {object} model
 *   values: { x1,y1,x2,y2, along, offset, px?,py? } 内部単位（mm）
 *   labels: { along, offset } state/text/name（タップ対象）
 */
export function render(model) {
  const scene = createScene({ ariaLabel: 'オフセット位置の図' });

  const v = model.values || {};
  const has = (k) => Number.isFinite(v[k]);
  const x1 = has('x1') ? v.x1 : FALLBACK.x1;
  const y1 = has('y1') ? v.y1 : FALLBACK.y1;
  const x2 = has('x2') ? v.x2 : FALLBACK.x2;
  const y2 = has('y2') ? v.y2 : FALLBACK.y2;
  const along = has('along') ? v.along : FALLBACK.along;
  const offsetV = has('offset') ? v.offset : FALLBACK.offset;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const baseLen = Math.hypot(dx, dy) || 1;
  const ux = dx / baseLen;
  const uy = dy / baseLen;
  // 直角方向単位ベクトル（survey.js の run() と同じ符号規約）
  const nx = -uy;
  const ny = ux;

  const footX = x1 + ux * along;
  const footY = y1 + uy * along;
  const pointX = footX + nx * offsetV;
  const pointY = footY + ny * offsetV;

  const xs = [x1, x2, footX, pointX];
  const ys = [y1, y2, footY, pointY];
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
  // 点や寸法ラベルのピルが端ではみ出さないよう、余白を追加で確保する
  const marginX = (maxX - minX) * 0.22;
  const marginY = (maxY - minY) * 0.22;
  scene.fit(minX - marginX, minY - marginY, maxX + marginX, maxY + marginY);

  const pP1 = scene.pt(x1, y1);
  const pP2 = scene.pt(x2, y2);
  const pFoot = scene.pt(footX, footY);
  const pPoint = scene.pt(pointX, pointY);

  // 基準線
  scene.line(pP1, pP2, 'aux');
  scene.dot(pP1);
  scene.dot(pP2);
  scene.vertexLabel(pP1, '基準点1', -18, -10);
  scene.vertexLabel(pP2, '基準点2', 18, -10);

  // 直角の補助線（垂線）と結果の点
  const perp = scene.line(pFoot, pPoint, 'aux');
  perp.setAttribute('stroke-dasharray', '4 3');
  scene.dot(pPoint, 4.5, 'body-sub');
  scene.vertexLabel(pPoint, '点', 0, -14);

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

  scene.dim(pP1, pFoot, opt('along', { offset: 18, labelGap: 12, flip: true }));
  scene.dim(pFoot, pPoint, opt('offset', { offset: 14, labelGap: 12 }));

  scene.note();

  const focus = model.focusKey;
  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
