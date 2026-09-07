// about.js — このアプリについて（S7）
//
// 免責事項をまとめる画面。REQUIREMENTS 4章 S7 / 11章。

import { backButton } from './icons.js';

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const k of Object.keys(props)) {
    if (k === 'class') node.className = props[k];
    else if (k === 'text') node.textContent = props[k];
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else node.setAttribute(k, props[k]);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

export function renderAbout(appEl, barEl) {
  barEl.innerHTML = '';
  barEl.appendChild(
    backButton()
  );
  barEl.appendChild(h('div', { class: 'appbar__title', text: 'このアプリについて' }));

  appEl.innerHTML = '';
  appEl.className = 'app';

  appEl.appendChild(
    h('div', { class: 'card' }, [
      h('div', { class: 'card__head' }, [h('span', { text: 'DIY計算ツールについて' })]),
      h('ul', { class: 'card__body notes' }, [
        h('li', { text: '図を見る→寸法をタップ→数字を入力→図と結果が変わる、を中核操作にした計算アプリです。' }),
        h('li', { text: '登録不要・オフライン動作。入力・履歴・設定はすべてこの端末の中だけに保存され、外部への送信は一切行いません。' })
      ])
    ])
  );

  appEl.appendChild(
    h('div', { class: 'card' }, [
      h('div', { class: 'card__head' }, [h('span', { text: '免責事項' })]),
      h('ul', { class: 'card__body notes' }, [
        h('li', { text: '本アプリは寸法・数学の計算を支援するツールです。施工の可否や安全性は判断できません。' }),
        h('li', { text: '構造や法規に関わる判断は、必ず専門家にご確認ください。' }),
        h('li', { text: '畳数は中京間（1畳=1.653m²）で計算しています。地域・物件により畳の大きさは異なります。' }),
        h('li', { text: '尺貫法（尺・寸）の単位換算は地域差があります。目安としてご利用ください。' }),
        h('li', { text: '計算結果や換算値に誤りがないよう努めていますが、正確性を保証するものではありません。重要な用途では別の方法でも確認してください。' })
      ])
    ])
  );

  appEl.appendChild(
    h('div', { class: 'card' }, [
      h('div', { class: 'card__head' }, [h('span', { text: 'データの保存について' })]),
      h('ul', { class: 'card__body notes' }, [
        h('li', { text: '履歴・お気に入り・設定は端末のブラウザ内（localStorage）にのみ保存されます。' }),
        h('li', { text: 'ブラウザのプライベートモード等でlocalStorageが使えない環境では、保存機能のみ無効になり、計算自体は引き続き利用できます。' }),
        h('li', { text: 'ブラウザのデータを削除すると、保存した履歴・お気に入り・設定も消去されます。' })
      ])
    ])
  );
}
