// triangle.js — 任意三角形の作図
//
// 3辺 a(=BC) b(=CA) c(=AB) から実形状を作図する（正弦定理・余弦定理・ヘロンの計算結果を
// そのまま図形へ反映するので、ここでは幾何配置だけを行う）。
// A=(0,0), B=(c,0) に固定し、余弦定理で角Aを求めて C を配置する。
// タップ可能ラベル: a / b / c / A(angA) / B(angB) / C(angC)（REQUIREMENTS 6-2）。
// 高さ補助線（Aから辺aへの垂線）は視覚的な添え物のみでタップ対象ではない。

import { createScene } from './engine.js';

/** 3辺が揃わない・成立しないときの仮の形（正三角形もどき） */
const FALLBACK_SIDE = 100;

export function render(model) {
  // 辺cのラベルを底辺の外（下）へ出すぶん、下の余白を広げる
  const scene = createScene({ ariaLabel: '三角形の図', pad: { bottom: 66 } });

  const v = model.values || {};
  let a = Number(v.a);
  let b = Number(v.b);
  let c = Number(v.c);
  const finite = [a, b, c].every((x) => Number.isFinite(x) && x > 0);
  const validTriangle = finite && a + b > c && b + c > a && a + c > b;
  if (!validTriangle) {
    a = FALLBACK_SIDE;
    b = FALLBACK_SIDE;
    c = FALLBACK_SIDE;
  }

  // 余弦定理: cosA = (b²+c²−a²) / (2bc)。浮動小数の誤差で±1をわずかに超えることがあるためクランプする。
  let cosA = (b * b + c * c - a * a) / (2 * b * c);
  cosA = Math.max(-1, Math.min(1, cosA));
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));

  const Am = [0, 0];
  const Bm = [c, 0];
  const Cm = [b * cosA, b * sinA];

  const xs = [Am[0], Bm[0], Cm[0]];
  const ys = [Am[1], Bm[1], Cm[1]];
  scene.fit(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));

  const A = scene.pt(Am[0], Am[1]);
  const B = scene.pt(Bm[0], Bm[1]);
  const C = scene.pt(Cm[0], Cm[1]);

  scene.polygon([A, B, C], 'body');

  // 高さ補助線: A から辺 a（直線BC、延長線を含む）への垂線の足 H
  const dx = Cm[0] - Bm[0];
  const dy = Cm[1] - Bm[1];
  const len2 = dx * dx + dy * dy || 1;
  const t = ((Am[0] - Bm[0]) * dx + (Am[1] - Bm[1]) * dy) / len2;
  const Hm = [Bm[0] + dx * t, Bm[1] + dy * t];
  const H = scene.pt(Hm[0], Hm[1]);
  const hLine = scene.line(A, H, 'aux');
  hLine.setAttribute('stroke-dasharray', '3 3');

  const L = model.labels || {};
  const focus = model.focusKey;
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

  // 対応する値を持たないラベル（area.triangle3 に角度は無い等）は描かずに飛ばす
  const has = (key) => Object.prototype.hasOwnProperty.call(L, key);

  // 辺: a=BC（下辺）/ b=CA（左上辺）/ c=AB（下から見て奥、外側へオフセット）
  if (has('a')) scene.dim(B, C, opt('a', { offset: 22, labelGap: 12 }));
  if (has('b')) scene.dim(C, A, opt('b', { offset: 22, labelGap: 12 }));
  // c は底辺 AB。内側（flip）へ出すと、頂点A・Bの角度ラベルと重なるため外側（下）へ出す
  if (has('c')) scene.dim(A, B, opt('c', { offset: 20, labelGap: 11 }));

  // 角: A / B / C
  if (has('angA')) scene.angleArc(A, B, C, opt('angA', { radius: 22, labelGap: 16 }));
  if (has('angB')) scene.angleArc(B, C, A, opt('angB', { radius: 22, labelGap: 16 }));
  if (has('angC')) scene.angleArc(C, A, B, opt('angC', { radius: 22, labelGap: 16 }));

  scene.vertexLabel(A, 'A', -10, 12);
  scene.vertexLabel(B, 'B', 10, 12);
  scene.vertexLabel(C, 'C', 0, -10);

  scene.note();

  if (focus) {
    const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
    if (g) g.classList.add('is-focus');
  }

  return scene.el;
}

export default { render };
