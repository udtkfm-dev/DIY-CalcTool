// viewport.js — 画面に貼り付く要素（シート・トースト）を「見えている範囲」に合わせる
//
// 問題: position:fixed はレイアウトビューポート基準で置かれる。スマホでピンチ拡大すると
// 見えている範囲（visual viewport）はその一部だけになるため、画面下端に出すはずの
// ボトムシートやトーストが視野の外に出て、そのままでは触れない。ページをスクロールしても
// fixed 要素は追ってこないので詰む。ソフトキーボードが出たときも同じ形で隠れる。
//
// 対策: 対象要素を visual viewport の矩形に合わせて置き直し、拡大率の逆数で縮めて
// 「見た目の大きさ」を保つ。要素に transform が付くと、その中の position:fixed の
// 子（シート本体・背景）はこの箱を基準に置かれるので、シートは常に見える範囲の
// 下端に出る。
//
// 注意: 箱の高さは px で確定するため、中の要素は 100dvh ではなく % で天井を切ること
// （dvh はビューポート基準のままで、拡大中は箱より大きくなる）。

/** @type {HTMLElement[]} */
const targets = [];
let watching = false;

/**
 * 対象要素を登録して追従を始める。
 * visualViewport 非対応の環境では何もしない（従来どおり position:fixed のまま動く）。
 * @param {...(HTMLElement|null)} elements
 */
export function followVisualViewport(...elements) {
  for (const el of elements) if (el && !targets.includes(el)) targets.push(el);
  if (!window.visualViewport) return;
  apply();
  if (watching) return;
  watching = true;
  const vv = window.visualViewport;
  // scroll も拾う: 拡大したまま指でずらすと offsetLeft/Top だけが変わる
  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
  window.addEventListener('orientationchange', apply);
}

function apply() {
  const vv = window.visualViewport;
  if (!vv) return;
  const scale = vv.scale || 1;
  for (const el of targets) {
    el.style.position = 'fixed';
    el.style.left = vv.offsetLeft + 'px';
    el.style.top = vv.offsetTop + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    // 拡大率ぶん大きく作ってから 1/scale に縮める。
    // こうすると画面上の見た目は等倍のまま、見えている範囲をちょうど覆う。
    el.style.width = vv.width * scale + 'px';
    el.style.height = vv.height * scale + 'px';
    el.style.transformOrigin = '0 0';
    el.style.transform = 'scale(' + 1 / scale + ')';
  }
}
