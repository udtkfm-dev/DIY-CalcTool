// beam.js — 梁の荷重図（struct.beamUdl / struct.beamPoint / struct.cantilever）
//
// 3つの支持・荷重条件は式が別物なので CalcDef も別IDに分けてある（struct.js 冒頭の注記）。
// 図もそれぞれ違うが、梁本体・寸法線・荷重矢印という骨格は共通なので、
// 1ファイル内で variant を変えた3つのレンダラを組み立てて export する。
// calcView.js の SHAPES には beamUdl / beamPoint / beamCantilever の3名で登録する。

import { createScene } from './engine.js';

const FALLBACK_L = 240;

/** 下向きの荷重矢印（画面座標）。長さ len px */
function loadArrow(scene, x, yTop, len) {
  const yEnd = yTop + len;
  scene.line([x, yTop], [x, yEnd], 'dimline');
  scene.polygon(
    [[x, yEnd + 1], [x - 3.4, yEnd - 5.5], [x + 3.4, yEnd - 5.5]],
    'arrow'
  );
}

/** 三角形の支点 */
function support(scene, p, size) {
  scene.polygon(
    [[p[0], p[1]], [p[0] - size, p[1] + size * 1.5], [p[0] + size, p[1] + size * 1.5]],
    'body'
  );
  scene.line([p[0] - size * 1.5, p[1] + size * 1.5], [p[0] + size * 1.5, p[1] + size * 1.5], 'body');
}

/** 固定端（壁）のハッチング */
function fixedEnd(scene, pTop, pBottom) {
  scene.line(pTop, pBottom, 'body');
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const y = pTop[1] + ((pBottom[1] - pTop[1]) * i) / n;
    scene.line([pTop[0], y], [pTop[0] - 9, y + 7], 'dimline');
  }
}

function build(variant) {
  function render(model) {
    const scene = createScene({ ariaLabel: '梁と荷重の図', pad: { bottom: 60 } });

    const v = model.values || {};
    let L = Number(v.L);
    if (!(Number.isFinite(L) && L > 0)) L = FALLBACK_L;

    const depth = L * 0.055;      // 梁の見た目の成
    const headroom = L * 0.3;     // 荷重矢印を描く高さ
    scene.fit(0, -depth * 3, L, headroom);

    const topL = scene.pt(0, 0);
    const topR = scene.pt(L, 0);
    const botL = scene.pt(0, -depth);
    const botR = scene.pt(L, -depth);

    // 梁本体
    scene.polygon([topL, topR, botR, botL], 'body');

    const px = (x) => scene.pt(x, 0)[0];
    const beamTopY = topL[1];
    const arrowLen = Math.max(16, (scene.pt(0, headroom * 0.55)[1] - beamTopY) * -1);

    if (variant === 'udl') {
      // 等分布荷重: 上に横線 + 等間隔の矢印
      const yTop = beamTopY - arrowLen;
      scene.line([topL[0], yTop], [topR[0], yTop], 'dimline');
      const n = 5;
      for (let i = 0; i <= n; i++) loadArrow(scene, px((L * i) / n), yTop, arrowLen);
    } else if (variant === 'point') {
      // 中央集中荷重
      loadArrow(scene, px(L / 2), beamTopY - arrowLen * 1.6, arrowLen * 1.6);
    } else {
      // 片持ち: 先端集中荷重
      loadArrow(scene, px(L), beamTopY - arrowLen * 1.6, arrowLen * 1.6);
    }

    // 支持条件
    const sup = Math.max(7, depth * 0);
    if (variant === 'cantilever') {
      fixedEnd(scene, [botL[0], topL[1] - 4], [botL[0], botL[1] + 4]);
    } else {
      support(scene, botL, Math.max(7, (botR[0] - botL[0]) * 0.025) + sup);
      support(scene, botR, Math.max(7, (botR[0] - botL[0]) * 0.025) + sup);
    }

    const Ls = model.labels || {};
    const focus = model.focusKey;
    const opt = (key, extra) =>
      Object.assign(
        {
          key,
          text: Ls[key] ? Ls[key].text : '—',
          state: Ls[key] ? Ls[key].state : 'empty',
          name: Ls[key] ? Ls[key].name : key
        },
        extra
      );

    // スパン（下側）
    scene.dim(botL, botR, opt('L', { offset: 30, labelGap: 14 }));

    // 荷重（上側）。矢印列と重ならないよう、梁の上端から十分離す
    const wy = beamTopY - arrowLen - 16;
    const wx = variant === 'cantilever' ? px(L) : px(L / 2);
    scene.dim([wx - 26, wy], [wx + 26, wy], opt('W', { offset: 0, labelGap: 0 }));

    scene.note();

    if (focus) {
      const g = scene.el.querySelector(`.dim[data-key="${focus}"]`);
      if (g) g.classList.add('is-focus');
    }

    return scene.el;
  }
  return { render };
}

export const beamUdl = build('udl');
export const beamPoint = build('point');
export const beamCantilever = build('cantilever');
