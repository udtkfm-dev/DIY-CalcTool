// engine.js — SVG構築・自動スケール・寸法線 / 角度弧 / 矢印
//
// 論理座標系は viewBox="0 0 320 220"。モデル座標は「y が上」で受け取り、
// 内部で SVG の「y が下」へ変換する。

const NS = 'http://www.w3.org/2000/svg';

export const VIEW_W = 320;
export const VIEW_H = 220;

/** 寸法線・角度ラベルがはみ出さないよう、方向ごとに余白を変えている */
const DEFAULT_PAD = { top: 34, right: 46, bottom: 52, left: 48 };

/** 極端な縦横比のしきい値と、確保する最小長 */
const MAX_RATIO = 50;
const MIN_PX = 24;

const ARROW_LEN = 6;
const ARROW_W = 3.4;
// ピルの寸法は viewBox 座標。SVG は幅に合わせて拡縮するため、CSSピクセルでは
// この値 × (実描画幅 / VIEW_W) になる。旧値（44×32）は幅320pxの端末で 38×27.9 まで
// 縮み、REQUIREMENTS 11章のタップ最小48pxを大きく下回っていた。
// components.css で幅400px以下は図を画面幅いっぱいに描くようにしたので、
// 倍率は 1.0 以上になり、この値がそのまま CSSピクセルの下限になる。
const PILL_MIN_W = 52;
const PILL_H = 48;
// ラベルを縦に積む図の逃げ道。5段だと1段あたり 36.8 しか取れないため、
// 48 のままでは押し分けられない重なりが必ず出る（createScene の dense を参照）
const DENSE_PILL_H = 32;
// ラベル間の最小すき間（viewBox 座標）。幅400px以下では図を全幅で描くので
// 倍率は 1.0 以上、この値がそのまま CSSピクセルの下限になる（REQUIREMENTS 11章の 8px）
const GAP = 10;
const DENSE_GAP = 3;
// 図を画面幅いっぱいに描くようにしたぶん、viewBox の端＝画面の端になった。
// ラベルが端に貼り付いて切れて見えないよう、内側の余白を 2 から広げる
const EDGE = 6;

function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      node.setAttribute(k, String(attrs[k]));
    }
  }
  if (parent) parent.appendChild(node);
  return node;
}

/**
 * 図形シーンを作る。
 * @param {{pad?:object, ariaLabel?:string, dense?:boolean}} opts
 *   dense: ラベルを縦に何段も積む図（barsMulti 等）用。既定のピル高では
 *   viewBox の高さ 220 に段が収まらず必ず重なるため、この図だけ小さいピルを使う。
 *   タップ最小48pxを満たせないが、重なって押し分けられないよりはましという判断。
 *   入力自体は下の入力欄リスト（48px）から常に行える。
 */
export function createScene(opts = {}) {
  const pad = Object.assign({}, DEFAULT_PAD, opts.pad || {});
  const pillH = opts.dense ? DENSE_PILL_H : PILL_H;

  const svg = el('svg', {
    class: 'shape',
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': opts.ariaLabel || '図形',
    // refitLabels は svg しか受け取らないので、ピル高はここに載せて引き継ぐ
    'data-pill-h': pillH
  });

  const layers = {
    body: el('g', { class: 'layer-body' }, svg),
    aux: el('g', { class: 'layer-aux' }, svg),
    dims: el('g', { class: 'layer-dims' }, svg),
    labels: el('g', { class: 'layer-labels' }, svg)
  };

  const scene = {
    el: svg,
    layers,
    pad,
    adjusted: false, // 縦横比を調整したか（注記の出し分けに使う）
    _s: 1,
    _ox: 0,
    _oy: 0,
    _minX: 0,
    _minY: 0
  };

  /**
   * モデル座標のバウンディングボックスを、余白を残して収まる倍率へ線形変換する。
   * 縦横比は保持する。ただし 1:MAX_RATIO を超える極端な比のときだけ、
   * 図が線に潰れて操作できなくなるのを避けるため短辺を持ち上げ、注記を出す。
   */
  scene.fit = function fit(minX, minY, maxX, maxY) {
    let mw = Math.max(maxX - minX, 1e-9);
    let mh = Math.max(maxY - minY, 1e-9);

    const ratio = Math.max(mw, mh) / Math.min(mw, mh);
    if (ratio > MAX_RATIO) {
      scene.adjusted = true;
      if (mw > mh) mh = mw / MAX_RATIO;
      else mw = mh / MAX_RATIO;
    }

    const availW = VIEW_W - pad.left - pad.right;
    const availH = VIEW_H - pad.top - pad.bottom;
    const s = Math.min(availW / mw, availH / mh);

    if (Math.min(mw, mh) * s < MIN_PX) scene.adjusted = true;

    scene._s = s;
    scene._mhpx = mh * s;
    scene._minX = minX;
    scene._minY = minY;
    scene._ox = pad.left + (availW - mw * s) / 2;
    scene._oy = pad.top + (availH - mh * s) / 2;
    return scene;
  };

  /** モデル座標（y が上）→ 画面座標（y が下）。上端 = _oy を基準に反転する */
  scene.pt = function pt(x, y) {
    const sx = scene._ox + (x - scene._minX) * scene._s;
    const sy = scene._oy + scene._mhpx - (y - scene._minY) * scene._s;
    return [sx, sy];
  };

  /* ---------- 図形要素 ---------- */

  scene.polygon = function polygon(points, cls = 'body') {
    return el('polygon', { class: cls, points: points.map((p) => p.join(',')).join(' ') }, layers.body);
  };

  scene.line = function line(p1, p2, cls = 'aux') {
    return el('line', { class: cls, x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] }, layers.aux);
  };

  /* ---------- 寸法線 ---------- */

  /**
   * 両端矢印付きの寸法線と、タップ可能なラベルを描く。
   * 座標はすべて画面座標で受け取る。
   *
   * @param {number[]} p1 始点
   * @param {number[]} p2 終点
   * @param {object} o { key, text, state, offset, flip }
   *   offset: 線分から法線方向へずらす量（px）。flip:true で反対側へ。
   */
  scene.dim = function dim(p1, p2, o) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1;
    const sign = o.flip ? -1 : 1;
    // 法線（画面座標系）
    const nx = (-dy / len) * sign;
    const ny = (dx / len) * sign;
    const off = o.offset === undefined ? 24 : o.offset;

    const q1 = [p1[0] + nx * off, p1[1] + ny * off];
    const q2 = [p2[0] + nx * off, p2[1] + ny * off];

    const g = el('g', { class: 'dimgroup' }, layers.dims);
    // 補助線（対象の端点から寸法線へ）
    el('line', { class: 'dimline', x1: p1[0] + nx * 4, y1: p1[1] + ny * 4, x2: q1[0] + nx * 4, y2: q1[1] + ny * 4 }, g);
    el('line', { class: 'dimline', x1: p2[0] + nx * 4, y1: p2[1] + ny * 4, x2: q2[0] + nx * 4, y2: q2[1] + ny * 4 }, g);
    // 本体
    el('line', { class: 'dimline', x1: q1[0], y1: q1[1], x2: q2[0], y2: q2[1] }, g);
    arrowHead(g, q1, [dx / len, dy / len]);
    arrowHead(g, q2, [-dx / len, -dy / len]);

    const mid = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];
    const labelPos = [mid[0] + nx * (o.labelGap || 14), mid[1] + ny * (o.labelGap || 14)];
    return scene.tapLabel(labelPos, o);
  };

  /** 矢じり。dir は矢の「向き」（先端から根元へ向かうベクトル） */
  function arrowHead(parent, tip, dir) {
    const bx = tip[0] + dir[0] * ARROW_LEN;
    const by = tip[1] + dir[1] * ARROW_LEN;
    const px = -dir[1] * ARROW_W;
    const py = dir[0] * ARROW_W;
    el(
      'polygon',
      { class: 'arrow', points: `${tip[0]},${tip[1]} ${bx + px},${by + py} ${bx - px},${by - py}` },
      parent
    );
  }

  /* ---------- 角度弧 ---------- */

  /**
   * 頂点 v における、v→p1 と v→p2 のあいだの角度弧とラベル。
   */
  scene.angleArc = function angleArc(v, p1, p2, o) {
    const r = o.radius === undefined ? 30 : o.radius;
    const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0]);
    const a2 = Math.atan2(p2[1] - v[1], p2[0] - v[0]);
    let delta = a2 - a1;
    while (delta <= -Math.PI) delta += Math.PI * 2;
    while (delta > Math.PI) delta -= Math.PI * 2;

    const s = [v[0] + Math.cos(a1) * r, v[1] + Math.sin(a1) * r];
    const e = [v[0] + Math.cos(a2) * r, v[1] + Math.sin(a2) * r];
    const sweep = delta > 0 ? 1 : 0;

    el(
      'path',
      { class: 'arc', d: `M ${s[0]} ${s[1]} A ${r} ${r} 0 0 ${sweep} ${e[0]} ${e[1]}` },
      layers.dims
    );

    const mid = a1 + delta / 2;
    const lr = r + (o.labelGap === undefined ? 22 : o.labelGap);
    const pos = [v[0] + Math.cos(mid) * lr, v[1] + Math.sin(mid) * lr];
    return scene.tapLabel(pos, o);
  };

  /** 直角記号（□） */
  scene.rightAngle = function rightAngle(v, p1, p2, size = 12) {
    const u1 = unit(v, p1);
    const u2 = unit(v, p2);
    const a = [v[0] + u1[0] * size, v[1] + u1[1] * size];
    const b = [v[0] + u1[0] * size + u2[0] * size, v[1] + u1[1] * size + u2[1] * size];
    const c = [v[0] + u2[0] * size, v[1] + u2[1] * size];
    el('polyline', { class: 'dimline', fill: 'none', points: `${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}` }, layers.dims);
  };

  function unit(from, to) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  /* ---------- ラベル ---------- */

  /**
   * タップ可能な寸法ラベル。背景に角丸ピルを敷いて最小 44×32px を確保する。
   *
   * state='readonly' は「計算結果として表示するだけで入力はできない」ラベル
   * （面積・対角線など、CalcDef の outputs にしか対応キーが無いもの）。
   * ボタンとして振る舞わせると押しても何も起きず壊れて見えるため、
   * tabindex/role を付けずキーボードのフォーカス順からも外す。
   */
  scene.tapLabel = function tapLabel(pos, o) {
    const state = o.state || 'empty';
    const readonly = state === 'readonly';
    const g = el(
      'g',
      {
        class: `dim is-${state}`,
        'data-key': o.key,
        tabindex: readonly ? null : '0',
        role: readonly ? null : 'button',
        'aria-label': readonly
          ? `${o.name || o.key} ${o.text || '—'}（計算結果）`
          : `${o.name || o.key} ${o.text || '未入力'}`
      },
      layers.labels
    );

    const rect = el('rect', { class: 'pill', rx: 8, ry: 8, height: pillH }, g);
    const text = el('text', { class: 'pill-txt', x: pos[0], y: pos[1] }, g);
    text.textContent = o.text || '—';

    // 文字幅を実測してピル幅を決める（取れない環境では文字数から見積もる）
    let w = 0;
    try {
      w = text.getComputedTextLength ? text.getComputedTextLength() : 0;
    } catch (e) {
      w = 0;
    }
    if (!w) w = String(text.textContent).length * 7.2;
    const width = Math.max(PILL_MIN_W, w + 16);

    rect.setAttribute('x', pos[0] - width / 2);
    rect.setAttribute('y', pos[1] - pillH / 2);
    rect.setAttribute('width', width);

    // ピル全体をタップ領域にする（テキストの隙間でも反応させる）
    g.style.pointerEvents = 'bounding-box';
    return g;
  };

  /** 小さな点マーカー（測量系の図で座標点を示すのに使う）。8角形で円に近似する */
  scene.dot = function dot(pos, r = 4.5, cls = 'body') {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      pts.push([pos[0] + r * Math.cos(ang), pos[1] + r * Math.sin(ang)]);
    }
    return el('polygon', { class: cls, points: pts.map((p) => p.join(',')).join(' ') }, layers.aux);
  };

  scene.vertexLabel = function vertexLabel(pos, text, dx = 0, dy = 0) {
    const t = el('text', { class: 'vertex', x: pos[0] + dx, y: pos[1] + dy, 'text-anchor': 'middle' }, layers.labels);
    t.textContent = text;
    return t;
  };

  /** 図の右下に出す注記（縮尺の誤認防止） */
  scene.note = function note(extra) {
    const base = '※図は実寸比ではありません（形の比率は正確です）';
    const t = el('text', { class: 'note', x: VIEW_W - 6, y: VIEW_H - 6, 'text-anchor': 'end' }, layers.labels);
    t.textContent = scene.adjusted || extra ? base + ' / 見やすく調整しています' : base;
    return t;
  };

  return scene;
}

/**
 * ラベルの文字幅は DOM に載ってからでないと実測できない。
 * 描画後にこれを呼ぶと、ピル幅を実測値で引き直す。
 */
export function refitLabels(svg) {
  const items = [];
  // createScene が載せたピル高。dense な図では小さい値が入っている
  const pillH = Number(svg.dataset.pillH) || PILL_H;
  const gap = pillH === DENSE_PILL_H ? DENSE_GAP : GAP;

  svg.querySelectorAll('.dim').forEach((g) => {
    const rect = g.querySelector('.pill');
    const text = g.querySelector('.pill-txt');
    if (!rect || !text) return;
    let w = 0;
    try {
      w = text.getComputedTextLength();
    } catch (e) {
      return;
    }
    if (!w) return;
    const width = Math.max(PILL_MIN_W, w + 16);

    // 桁数が増えるとピルが viewBox の外へ出て、端が切れて読めなくなる。
    // 図形ごとに余白を広げても値の桁数次第で再発するため、ここで内側へ寄せる。
    // （寸法線から少しずれるが、切れて読めないより実用上ましと判断した）
    const cx = clamp(Number(text.getAttribute('x')), width / 2 + EDGE, VIEW_W - width / 2 - EDGE);
    const cy = clamp(Number(text.getAttribute('y')), pillH / 2 + EDGE, VIEW_H - pillH / 2 - EDGE);

    items.push({
      rect,
      text,
      width,
      cx0: cx,
      cy0: cy,
      cx,
      cy,
      // 結果ラベル（面積・対角線など）は寸法線に紐づかないので大きく動かしてよい。
      // 入力できる寸法ラベルは線との対応が崩れないよう動きを小さく抑える。
      readonly: g.classList.contains('is-readonly')
    });
  });

  separateLabels(items, pillH, gap);

  for (const it of items) {
    it.text.setAttribute('x', it.cx);
    it.text.setAttribute('y', it.cy);
    it.rect.setAttribute('x', it.cx - it.width / 2);
    it.rect.setAttribute('y', it.cy - pillH / 2);
    it.rect.setAttribute('width', it.width);
  }
}

/**
 * ラベル同士の重なりをほどく。
 * 図形ごとにラベル位置を調整しても、入力された値の桁数で幅が変わるため
 * 重なりは避けきれない（実測で29計算に発生）。ここでまとめて押し広げる。
 * 元の位置から離れすぎると寸法線との対応が分からなくなるので、移動量に上限を設ける。
 */
function separateLabels(items, pillH, gap) {
  if (items.length < 2) return;
  const GAP_X = gap;
  const GAP_Y = gap;

  for (let pass = 0; pass < 16; pass++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const needX = (a.width + b.width) / 2 + GAP_X;
        const needY = pillH + GAP_Y;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const overX = needX - Math.abs(dx);
        const overY = needY - Math.abs(dy);
        if (overX <= 0 || overY <= 0) continue; // 重なっていない

        moved = true;
        const wa = movability(a);
        const wb = movability(b);
        const total = wa + wb || 1;
        // 押し出し量が小さい軸へ逃がす（figの形をなるべく崩さない）
        if (overY <= overX) {
          const s = dy >= 0 ? overY : -overY;
          nudge(a, 0, (-s * wa) / total, pillH);
          nudge(b, 0, (s * wb) / total, pillH);
        } else {
          const s = dx >= 0 ? overX : -overX;
          nudge(a, (-s * wa) / total, 0, pillH);
          nudge(b, (s * wb) / total, 0, pillH);
        }
      }
    }
    if (!moved) break;
  }
}

function movability(it) {
  return it.readonly ? 2.5 : 1;
}

function nudge(it, dx, dy, pillH) {
  // 元の位置からの最大ずれ。ピルを 32→48 に大きくした分、ほどくのに必要な移動量も
  // 増えるため上限を広げた（22 のままだと重なりが解けない図が出た）
  const cap = it.readonly ? 52 : 30;
  it.cx = clamp(it.cx + dx, it.cx0 - cap, it.cx0 + cap);
  it.cy = clamp(it.cy + dy, it.cy0 - cap, it.cy0 + cap);
  it.cx = clamp(it.cx, it.width / 2 + EDGE, VIEW_W - it.width / 2 - EDGE);
  it.cy = clamp(it.cy, pillH / 2 + EDGE, VIEW_H - pillH / 2 - EDGE);
}

function clamp(v, lo, hi) {
  if (!Number.isFinite(v)) return v;
  if (hi < lo) return (lo + hi) / 2; // ピルが viewBox より広い極端な場合は中央へ
  return Math.min(hi, Math.max(lo, v));
}
