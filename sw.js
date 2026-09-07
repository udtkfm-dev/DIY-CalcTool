// sw.js — Service Worker（全アセットをプリキャッシュし、cache-first で返す）
//
// REQUIREMENTS 1章「オフライン」。バージョンを上げるときは CACHE_NAME を変更すること
// （変更しないと新しいアセットが古いキャッシュのまま配信され続ける）。
//
// パスは全て './' 始まりの相対で書くこと。Service Worker 内の相対URLは
// sw.js 自身の位置を基準に解決されるため、GitHub Pages のように
// https://<user>.github.io/<リポジトリ名>/ というサブパスで公開しても
// そのまま動く（絶対パスだと 404 になり cache.addAll() が丸ごと失敗する）。

const CACHE_NAME = 'diycalc-v22';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/main.js',
  './js/core/units.js',
  './js/core/format.js',
  './js/core/solver.js',
  './js/core/errors.js',
  './js/core/store.js',
  './js/core/input.js',
  './js/core/viewport.js',
  './js/calcs/index.js',
  './js/calcs/glossary.js',
  './js/calcs/basic.js',
  './js/calcs/triangle.js',
  './js/calcs/slope.js',
  './js/calcs/area.js',
  './js/calcs/volume.js',
  './js/calcs/wood.js',
  './js/calcs/layout.js',
  './js/calcs/stair.js',
  './js/calcs/roof.js',
  './js/calcs/room.js',
  './js/calcs/concrete.js',
  './js/calcs/tile.js',
  './js/calcs/paint.js',
  './js/calcs/pipe.js',
  './js/calcs/elec.js',
  './js/calcs/earth.js',
  './js/calcs/survey.js',
  './js/calcs/compound.js',
  './js/calcs/struct.js',
  './js/calcs/hvac.js',
  './js/calcs/light.js',
  './js/calcs/metal.js',
  './js/calcs/estimate.js',
  './js/calcs/furniture.js',
  './js/calcs/garden.js',
  './js/calcs/solid.js',
  './js/shapes/engine.js',
  './js/shapes/rightTriangle.js',
  './js/shapes/triangle.js',
  './js/shapes/rectangle.js',
  './js/shapes/circle.js',
  './js/shapes/triangleBH.js',
  './js/shapes/trapezoid.js',
  './js/shapes/parallelogram.js',
  './js/shapes/sector.js',
  './js/shapes/ellipse.js',
  './js/shapes/lineSegment.js',
  './js/shapes/centerLine.js',
  './js/shapes/miterAngle.js',
  './js/shapes/box3d.js',
  './js/shapes/cylinder3d.js',
  './js/shapes/cone3d.js',
  './js/shapes/sphere3d.js',
  './js/shapes/prism3d.js',
  './js/shapes/twoPoints.js',
  './js/shapes/offsetPoint.js',
  './js/shapes/stairPath.js',
  './js/shapes/wallStrip.js',
  './js/shapes/twoRects.js',
  './js/shapes/beam.js',
  './js/shapes/solids.js',
  './js/shapes/diagrams.js',
  './js/ui/home.js',
  './js/ui/ads.js',
  './js/ui/icons.js',
  './js/ui/calcView.js',
  './js/ui/compoundView.js',
  './js/ui/numpad.js',
  './js/ui/unitPicker.js',
  './js/ui/toast.js',
  './js/ui/history.js',
  './js/ui/settings.js',
  './js/ui/about.js',
  './js/ui/disclaimer.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => res)
        .catch(() => cached);
    })
  );
});
