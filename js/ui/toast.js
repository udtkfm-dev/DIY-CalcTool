// toast.js — 画面下部の一時通知

let root = null;

function ensureRoot() {
  if (root && document.body.contains(root)) return root;
  root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  return root;
}

/**
 * @param {string} message
 * @param {{duration?:number, actionLabel?:string, onAction?:Function}} opts
 */
export function showToast(message, opts = {}) {
  const r = ensureRoot();
  const box = document.createElement('div');
  box.className = 'toast';

  const text = document.createElement('span');
  text.textContent = message;
  box.appendChild(text);

  let timer = null;
  const close = () => {
    if (timer) clearTimeout(timer);
    if (box.parentNode) box.parentNode.removeChild(box);
  };

  if (opts.actionLabel && opts.onAction) {
    const btn = document.createElement('button');
    btn.className = 'toast__action';
    btn.type = 'button';
    btn.textContent = opts.actionLabel;
    btn.addEventListener('click', () => {
      close();
      opts.onAction();
    });
    box.appendChild(btn);
  }

  r.appendChild(box);
  timer = setTimeout(close, opts.duration || 3000);
  return close;
}

export function clearToasts() {
  const r = ensureRoot();
  while (r.firstChild) r.removeChild(r.firstChild);
}
