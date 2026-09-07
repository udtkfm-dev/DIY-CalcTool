// ads.js — 広告枠
//
// AdMob がまだ使えないため、現在は「ダミー広告」を表示する。
// 配信を実装するときは PROVIDERS に admob を足し、ACTIVE を 'admob' に変えるだけで
// 差し替えられるようにしてある（呼び出し側 home.js は触らなくてよい）。
//
// REQUIREMENTS 12章:
//   - ホーム最下部に1枠だけ。計算画面には置かない（誤タップ防止）
//   - Settings.adFree が true なら描画しない
//   - テンキー表示中は非表示（計算画面に枠が無いので現状は自動的に満たされる）
// REQUIREMENTS 1章「外部通信は一切なし」の方針があるため、ダミーは
// 外部リクエストを一切行わない。AdMob を入れる時点でこの方針の変更が必要になる
// （運用者の判断事項。docs/GITHUB_PUBLISH.txt の注意書きも参照）。

import { getSettings } from '../core/store.js';

/** 実際に広告を出す高さ。AdMobのバナー（320×100）に合わせておき、
 *  差し替えたときにレイアウトが飛び跳ねないようにする */
export const AD_HEIGHT = 100;

/**
 * ダミーの内容。実在の企業・商品をかたるものは置かない
 * （本物の広告と誤認させないため）。このアプリ自身の使い方の案内にしてある。
 */
const DUMMY_CREATIVES = [
  { icon: 'triangle', title: '図をタップして入力', body: '寸法の場所をタップすると、その値のテンキーが開きます' },
  { icon: 'length', title: '単位はあとから変えられる', body: 'mm で入れてから m や 尺 に切り替えても、値はそのまま換算されます' },
  { icon: 'area', title: '空いている欄が答えになります', body: '2つ入れると残りが自動で出ます。求めたい値を選ぶ必要はありません' },
  { icon: 'estimate', title: '履歴から呼び出せます', body: '計算した内容は端末の中だけに保存され、あとから同じ条件で開き直せます' },
  { icon: 'volume', title: '電波が無くても使えます', body: 'ホーム画面に追加しておくと、オフラインでも起動します' }
];

let dummyIndex = Math.floor(Math.random() * DUMMY_CREATIVES.length);

const PROVIDERS = {
  /** ダミー: 外部通信なし。枠が生きていることが分かる見た目を出す */
  dummy(host, slotId) {
    const c = DUMMY_CREATIVES[dummyIndex % DUMMY_CREATIVES.length];
    dummyIndex++;

    host.innerHTML = '';
    host.classList.add('ad--dummy');

    const badge = document.createElement('span');
    badge.className = 'ad__badge';
    badge.textContent = 'サンプル表示';

    const body = document.createElement('div');
    body.className = 'ad__body';

    const title = document.createElement('div');
    title.className = 'ad__title';
    title.textContent = c.title;

    const text = document.createElement('div');
    text.className = 'ad__text';
    text.textContent = c.body;

    body.appendChild(title);
    body.appendChild(text);
    host.appendChild(badge);
    host.appendChild(body);

    // 読み上げ時に「広告枠のサンプル」だと分かるようにする
    host.setAttribute('aria-label', `広告枠（サンプル表示）: ${c.title}`);
    return true;
  }

  // 例: 配信を始めるときはここに足す
  // admob(host, slotId) {
  //   // <ins class="adsbygoogle" ...> を組み立てて adsbygoogle.push({}) する。
  //   // 外部スクリプトの読み込みが必要なので、REQUIREMENTS 1章「外部通信なし」と
  //   // オフライン動作（sw.js の cache-first）への影響を先に整理すること。
  // }
};

/** 現在使う配信元。AdMob が使えるようになったら 'admob' に変える */
const ACTIVE = 'dummy';

/**
 * 広告枠を1つ作って返す。表示しない設定なら null を返す。
 * @param {string} slotId 枠の識別子（例: 'home-bottom'）
 * @returns {HTMLElement|null}
 */
export function createAdSlot(slotId) {
  const settings = getSettings();
  if (settings.adFree) return null;

  const host = document.createElement('div');
  host.className = 'ad-slot';
  host.dataset.slot = slotId;
  host.style.minHeight = AD_HEIGHT + 'px';

  const render = PROVIDERS[ACTIVE];
  let ok = false;
  try {
    ok = render ? render(host, slotId) : false;
  } catch (e) {
    ok = false;
  }
  if (!ok) {
    // 配信に失敗しても枠だけは残す（レイアウトが動かないように）
    host.textContent = '';
    host.setAttribute('aria-hidden', 'true');
  }
  return host;
}
