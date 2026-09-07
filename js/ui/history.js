// history.js — 履歴画面（S5）
//
// 日時・名称・入力値・結果を一覧表示する。タップで再計算（入力値を復元して計算画面へ）、
// スワイプ（またはクリアボタン）で削除する。REQUIREMENTS 2-5 / 4章 S5。

import { getHistory, removeHistory, saveHistory } from '../core/store.js';
import { getCalc } from '../calcs/index.js';
import { showToast } from './toast.js';
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

function formatDate(at) {
  try {
    return new Date(at).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

export function renderHistory(appEl, barEl) {
  barEl.innerHTML = '';
  barEl.appendChild(
    backButton()
  );
  barEl.appendChild(h('div', { class: 'appbar__title', text: '履歴' }));

  appEl.innerHTML = '';
  appEl.className = 'app';

  const listWrap = h('div', {});
  appEl.appendChild(listWrap);

  function renderList() {
    listWrap.innerHTML = '';
    const items = getHistory();
    if (!items.length) {
      listWrap.appendChild(h('div', { class: 'empty', text: 'まだ履歴がありません。計算すると自動的に記録されます' }));
      return;
    }
    for (const item of items) listWrap.appendChild(row(item));
  }

  function row(item) {
    const def = getCalc(item.calcId);
    const wrap = h('div', { class: 'list-item history-item' });

    const link = h('a', { class: 'history-item__link', href: `#/c/${item.calcId}?h=${item.id}` }, [
      h('div', { class: 'list-item__main' }, [
        h('div', { class: 'list-item__title', text: (def && def.title) || item.title }),
        h('div', { class: 'list-item__sub', text: `${formatDate(item.at)} ・ ${item.summary || ''}` })
      ]),
      h('span', { class: 'list-item__chev', text: '›' })
    ]);
    wrap.appendChild(link);

    const delBtn = h('button', {
      class: 'field-row__clear',
      type: 'button',
      'aria-label': '履歴を削除',
      text: '✕',
      onclick: () => remove(item)
    });
    wrap.appendChild(delBtn);

    // スワイプで削除（numpad.js の左右スワイプと同じ考え方）
    let touchX = null;
    wrap.addEventListener(
      'touchstart',
      (e) => {
        touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    wrap.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (dx < -60) remove(item);
    });

    return wrap;
  }

  function remove(item) {
    removeHistory(item.id);
    renderList();
    showToast('履歴を削除しました', {
      duration: 5000,
      actionLabel: '元に戻す',
      onAction: () => {
        saveHistory(item);
        renderList();
      }
    });
  }

  renderList();
}
