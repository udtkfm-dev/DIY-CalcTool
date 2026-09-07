// diagrams.js — 「図が無かった計算」のための説明図
//
// 運用者の指摘（14回目）:「寸法入力する画面では必ず絵を出してほしい。
// どこの寸法を入れているのかわからない」。テンキーの中に図を出す仕組みを入れたので、
// 図を持たない計算にも図を用意して、どの寸法を入れているのかを常に見せる。
//
// 19-4 の規約どおり1ファイルから複数の名前付きレンダラを export する。
// 19-5 の規約どおり labels に無いキーの寸法線は描かない。

import { createScene } from './engine.js';

const SEG = 40;

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

function ellipsePts(cx, cy, rx, ry, fromT, toT, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = fromT + ((toT - fromT) * i) / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return pts;
}

/* ==================================================================== *
 * pipe3d — 横に伸びる管（内径 d / 管長 L）
 * ==================================================================== */

export const pipe3d = {
  render(model) {
    const scene = createScene({ ariaLabel: '管の図', pad: { left: 66, right: 68, bottom: 62 } });
    const v = model.values || {};
    const d = num(v.d, 70);
    const L = num(v.L, 210);
    const rx = d * 0.16;

    scene.fit(-rx, 0, L + rx, d);

    scene.polygon([scene.pt(0, 0), scene.pt(L, 0), scene.pt(L, d), scene.pt(0, d)], 'body');
    // 端の楕円で「筒」であることを示す
    const cap = ellipsePts(0, d / 2, rx, d / 2, 0, Math.PI * 2, SEG);
    scene.polygon(cap.map((p) => scene.pt(...p)), 'body');
    const capR = ellipsePts(L, d / 2, rx, d / 2, -Math.PI / 2, Math.PI / 2, SEG / 2);
    for (let i = 0; i < capR.length - 1; i++) scene.line(scene.pt(...capR[i]), scene.pt(...capR[i + 1]), 'aux');

    const { opt, has } = labelHelpers(model);
    if (has('L')) scene.dim(scene.pt(0, 0), scene.pt(L, 0), opt('L', { offset: 22, labelGap: 12 }));
    if (has('d')) scene.dim(scene.pt(0, 0), scene.pt(0, d), opt('d', { offset: 18, labelGap: 10, flip: true }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * bendSheet — 板金の曲げ（辺A / 辺B / 板厚 t / 内側の曲げ半径 r）
 * ==================================================================== */

export const bendSheet = {
  render(model) {
    const scene = createScene({ ariaLabel: '曲げた板金の図', pad: { left: 60, right: 60, bottom: 58 } });
    const v = model.values || {};
    const a = num(v.a, 120); // 水平の辺
    const b = num(v.b, 90); // 垂直の辺
    const t = Math.min(num(v.t, 10), Math.min(a, b) / 3);

    scene.fit(0, 0, a, b);

    // L字の板（外側の輪郭 → 内側をくり抜かず、太さ t の L 字ポリゴンで表す）
    const P = (x, y) => scene.pt(x, y);
    scene.polygon(
      [P(0, b), P(t, b), P(t, t), P(a, t), P(a, 0), P(0, 0)],
      'body'
    );

    const { opt, has } = labelHelpers(model);
    // 辺A = 水平部分、辺B = 垂直部分
    if (has('a')) scene.dim(P(0, 0), P(a, 0), opt('a', { offset: 20, labelGap: 11 }));
    if (has('b')) scene.dim(P(0, 0), P(0, b), opt('b', { offset: 20, labelGap: 11, flip: true }));
    if (has('t')) scene.dim(P(a, 0), P(a, t), opt('t', { offset: 16, labelGap: 10 }));
    if (has('r')) scene.tapLabel(P(t * 1.6, t * 1.6), opt('r', {}));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * weldFillet — 隅肉溶接（脚長 S / のど厚 a / 溶接長 L）
 * ==================================================================== */

export const weldFillet = {
  render(model) {
    const scene = createScene({ ariaLabel: '隅肉溶接の図', pad: { left: 58, right: 58, bottom: 60 } });
    const v = model.values || {};
    const s = num(v.s, 60);
    const plate = s * 0.45;
    const span = s * 2.6;

    scene.fit(0, 0, span, span);
    const P = (x, y) => scene.pt(x, y);

    // 下の板と立ち上がりの板
    scene.polygon([P(0, 0), P(span, 0), P(span, plate), P(0, plate)], 'body');
    scene.polygon([P(0, plate), P(plate, plate), P(plate, span), P(0, span)], 'body');
    // 溶接ビード（脚長 s の三角形）
    scene.polygon([P(plate, plate), P(plate + s, plate), P(plate, plate + s)], 'body-weld');

    const { opt, has } = labelHelpers(model);
    // 脚長は下の板の上側（ビードのすぐ下）、溶接長は板の下側に離して置く
    if (has('s')) scene.dim(P(plate, plate), P(plate + s, plate), opt('s', { offset: 14, labelGap: 11, flip: true }));
    if (has('a')) {
      // のど厚は三角形の斜辺への垂線。ビードの中に置くと脚長ラベルと重なるので、
      // 斜辺の外側（中点から法線方向）へ逃がす
      scene.tapLabel(P(plate + s * 1.05, plate + s * 1.05), opt('a', {}));
    }
    if (has('L')) scene.dim(P(0, 0), P(span, 0), opt('L', { offset: 26, labelGap: 12 }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * wallLayers — 断熱の層構成（材料1〜3の厚さ）
 * ==================================================================== */

export const wallLayers = {
  render(model) {
    const scene = createScene({ ariaLabel: '壁の層構成の図', pad: { top: 40, bottom: 66 } });
    const v = model.values || {};
    const ts = [num(v.t1, 40), num(v.t2, 70), num(v.t3, 30)];
    const total = ts[0] + ts[1] + ts[2];
    const height = total * 0.75;

    scene.fit(0, 0, total, height);
    const P = (x, y) => scene.pt(x, y);

    let x = 0;
    const bounds = [];
    ts.forEach((t, i) => {
      scene.polygon([P(x, 0), P(x + t, 0), P(x + t, height), P(x, height)], i === 1 ? 'body-insul' : 'body');
      bounds.push([x, x + t]);
      x += t;
    });

    const { opt, has } = labelHelpers(model);
    ['t1', 't2', 't3'].forEach((key, i) => {
      if (!has(key)) return;
      const [x0, x1] = bounds[i];
      // 3層ぶんのラベルが重ならないよう、真ん中の層だけ上側に出す
      const flip = i === 1;
      scene.dim(P(x0, flip ? height : 0), P(x1, flip ? height : 0), opt(key, { offset: 20, labelGap: 11, flip }));
    });

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * column — 柱（材長 L / 座屈長さ Lk）。両端の支持を短い線で示す
 * ==================================================================== */

export const column = {
  render(model) {
    const scene = createScene({ ariaLabel: '柱の図', pad: { left: 70, right: 70, bottom: 56 } });
    const v = model.values || {};
    const L = num(v.L, 180);
    const w = L * 0.16;

    scene.fit(-w * 0.8, 0, w * 1.8, L);
    const P = (x, y) => scene.pt(x, y);

    // 柱本体
    scene.polygon([P(0, 0), P(w, 0), P(w, L), P(0, L)], 'body');
    // 上下の支持
    scene.line(P(-w * 0.7, 0), P(w * 1.7, 0), 'body');
    scene.line(P(-w * 0.7, L), P(w * 1.7, L), 'body');
    // 上からの荷重
    const top = P(w / 2, L);
    scene.line([top[0], top[1] - 26], top, 'aux');

    const { opt, has } = labelHelpers(model);
    if (has('L')) scene.dim(P(w, 0), P(w, L), opt('L', { offset: 20, labelGap: 11 }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * pumpHead — ポンプの揚程（実揚程 / 損失水頭 / 全揚程）
 * ==================================================================== */

export const pumpHead = {
  render(model) {
    const scene = createScene({ ariaLabel: '揚程の図', pad: { left: 78, right: 76, bottom: 56 } });
    const v = model.values || {};
    const stat = num(v.staticHead, 120);
    const loss = num(v.lossHead, 30);
    const totalH = stat + loss;
    const span = totalH * 1.15;

    scene.fit(0, 0, span, totalH);
    const P = (x, y) => scene.pt(x, y);

    // 下の水槽 → 立ち上がり管 → 上の吐出口
    scene.polygon([P(0, 0), P(span * 0.3, 0), P(span * 0.3, stat * 0.12), P(0, stat * 0.12)], 'body');
    scene.line(P(span * 0.15, stat * 0.12), P(span * 0.15, stat), 'body');
    scene.line(P(span * 0.15, stat), P(span * 0.42, stat), 'body');

    const { opt, has } = labelHelpers(model);
    // 実揚程と損失水頭は同じ x に縦へ積む（y の範囲が違うので重ならない）。
    // 全揚程は図の左側へ、ラベルを反対向きに出して 3つが横に並ばないようにする。
    if (has('staticHead')) scene.dim(P(span * 0.62, 0), P(span * 0.62, stat), opt('staticHead', { offset: 16, labelGap: 11 }));
    if (has('lossHead')) scene.dim(P(span * 0.62, stat), P(span * 0.62, totalH), opt('lossHead', { offset: 16, labelGap: 11 }));
    if (has('totalHead')) scene.dim(P(span * 0.05, 0), P(span * 0.05, totalH), opt('totalHead', { offset: 16, labelGap: 11, flip: true }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * ratioBar — 全体を比で分けた帯（全体量 + 各項）
 * ==================================================================== */

export const ratioBar = {
  render(model) {
    const scene = createScene({ ariaLabel: '比で分けた帯の図', pad: { top: 44, bottom: 62 } });
    const v = model.values || {};
    const parts = ['v1', 'v2', 'v3', 'v4'].map((k) => Number(v[k])).filter((n) => Number.isFinite(n) && n > 0);
    const list = parts.length ? parts : [40, 60];
    const total = list.reduce((a, b) => a + b, 0);
    const height = total * 0.22;

    scene.fit(0, 0, total, height);
    const P = (x, y) => scene.pt(x, y);

    const { opt, has } = labelHelpers(model);
    let x = 0;
    list.forEach((p, i) => {
      scene.polygon([P(x, 0), P(x + p, 0), P(x + p, height), P(x, height)], i % 2 ? 'body-alt' : 'body');
      const key = 'v' + (i + 1);
      if (has(key)) {
        // 帯が細いと隣同士のラベルが横に並びきらないので、上下へ交互にずらす
        const sp = scene.pt(x + p / 2, height / 2);
        scene.tapLabel([sp[0], sp[1] + (i % 2 ? 20 : -20)], opt(key, {}));
      }
      x += p;
    });

    if (has('total')) scene.dim(P(0, 0), P(total, 0), opt('total', { offset: 20, labelGap: 11 }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * barsMulti — 測った値を並べた棒（1〜5か所）
 * ==================================================================== */

export const barsMulti = {
  render(model) {
    // 測定値そのものを長さに使うと 2730 : 5行 のような極端な縦横比になり図が潰れる。
    // 最大値を 100 に正規化した「相対的な長さ」で描く。
    // dense: 5段まで縦に積むため、既定のピル高(48)では段の高さ(36.8)に収まらず必ず重なる
    const scene = createScene({ ariaLabel: '測定値をならべた図', dense: true, pad: { left: 34, right: 92, top: 18, bottom: 18 } });
    const v = model.values || {};
    const { opt, has } = labelHelpers(model);
    const shown = ['v1', 'v2', 'v3', 'v4', 'v5'].filter((k) => has(k));
    const raw = shown.map((k) => {
      const n = Number(v[k]);
      return Number.isFinite(n) ? Math.abs(n) : 0;
    });
    const max = Math.max(...raw, 0) || 1;
    const n = shown.length || 1;

    // 1行の高さもモデル座標で持つ。縦横比が極端だと fit() が幅に律速されて
    // 行がすべて数pxに潰れるため、全体の高さが幅と同程度になる行高にする。
    const ROW = 100 / 5;
    scene.fit(0, 0, 100, n * ROW);
    const P = (x, y) => scene.pt(x, y);

    shown.forEach((key, i) => {
      const yTop = (n - i) * ROW; // 上から v1, v2, ... の順に並べる
      const yBot = yTop - ROW;
      const pad = ROW * 0.2;
      const filled = raw[i] > 0;
      const len = filled ? Math.max(8, (raw[i] / max) * 100) : 10;
      scene.polygon(
        [P(0, yBot + pad), P(len, yBot + pad), P(len, yTop - pad), P(0, yTop - pad)],
        filled ? 'body' : 'body-ghost'
      );
      scene.tapLabel(scene.pt(len, (yTop + yBot) / 2), opt(key, {}));
    });

    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * scalePair — 縮尺（図面上の寸法 と 実際の寸法）
 * ==================================================================== */

export const scalePair = {
  render(model) {
    const scene = createScene({ ariaLabel: '縮尺の図', pad: { top: 40, bottom: 60 } });
    const v = model.values || {};
    const draw = num(v.drawing, 40);
    const actual = num(v.actual, 160);
    const span = Math.max(draw, actual);
    const h = span * 0.5;

    scene.fit(0, 0, span, h);
    const P = (x, y) => scene.pt(x, y);

    // 上: 図面上の長さ / 下: 実際の長さ
    scene.polygon([P(0, h * 0.62), P(draw, h * 0.62), P(draw, h), P(0, h)], 'body');
    scene.polygon([P(0, 0), P(actual, 0), P(actual, h * 0.38), P(0, h * 0.38)], 'body-alt');

    const { opt, has } = labelHelpers(model);
    if (has('drawing')) scene.dim(P(0, h), P(draw, h), opt('drawing', { offset: 18, labelGap: 11, flip: true }));
    if (has('actual')) scene.dim(P(0, 0), P(actual, 0), opt('actual', { offset: 18, labelGap: 11 }));

    scene.note();
    applyFocus(scene, model.focusKey);
    return scene.el;
  }
};

/* ==================================================================== *
 * polygonPts — 座標で結んだ多角形（survey.polygon）
 *
 * 12個の座標すべてに寸法ピルを出すと図が埋まるので、頂点に番号だけを打ち、
 * いま入れている座標の頂点を強調する。
 * ==================================================================== */

export const polygonPts = {
  render(model) {
    const scene = createScene({ ariaLabel: '座標で結んだ多角形の図', pad: { left: 40, right: 40, top: 30, bottom: 40 } });
    const v = model.values || {};
    const pts = [];
    for (let i = 1; i <= 6; i++) {
      const x = Number(v['x' + i]);
      const y = Number(v['y' + i]);
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ i, x, y });
    }
    const list = pts.length >= 3 ? pts : [
      { i: 1, x: 0, y: 0 }, { i: 2, x: 100, y: 0 }, { i: 3, x: 100, y: 70 }, { i: 4, x: 0, y: 70 }
    ];
    const ghost = pts.length < 3;

    const xs = list.map((p) => p.x);
    const ys = list.map((p) => p.y);
    scene.fit(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));

    scene.polygon(list.map((p) => scene.pt(p.x, p.y)), ghost ? 'body-ghost' : 'body');

    // 入力中の座標がどの頂点か分かるよう、頂点に番号を打って強調する。
    // 番号は図形の外側（重心と反対側）へ逃がして、辺や塗りに重ならないようにする
    const cx = list.reduce((a, p) => a + p.x, 0) / list.length;
    const cy = list.reduce((a, p) => a + p.y, 0) / list.length;
    const center = scene.pt(cx, cy);
    const focus = model.focusKey || '';
    const focusIdx = /^[xy](\d)$/.test(focus) ? Number(focus.slice(1)) : 0;
    for (const p of list) {
      const sp = scene.pt(p.x, p.y);
      const dx = sp[0] - center[0];
      const dy = sp[1] - center[1];
      const len = Math.hypot(dx, dy) || 1;
      scene.dot(sp, p.i === focusIdx ? 6.5 : 4, p.i === focusIdx ? 'pt-focus' : 'body');
      scene.vertexLabel(sp, String(p.i), (dx / len) * 13, (dy / len) * 13 + 4);
    }

    scene.note();
    return scene.el;
  }
};
