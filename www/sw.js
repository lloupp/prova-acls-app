const CACHE_NAME = 'prova-acls-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/data/PROVA_ACLS.json',
  '/imagens-ecg/ecg_q02.png',
  '/imagens-ecg/ecg_q09.png',
  '/imagens-ecg/ecg_q22.png',
  '/imagens-ecg/ecg_q25.png',
  '/imagens-ecg/ecg_q29.png',
  '/imagens-ecg/ecg_q32_cenario.png',
  '/imagens-ecg/ecg_q42.png',
  '/imagens-ecg/ecg_q48.png',
  '/imagens-ecg/ecg_q50.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});