/* Service worker — cache offline-first da prova (imagens ECG + app shell). */
const CACHE = 'acls-prova-v7';
const ASSETS = [
  './',
  'index.html',
  'config.js',
  'css/style.css',
  'js/app.js',
  'manifest.json',
  'data/PROVA_ACLS.json',
  'imagens-ecg/ecg_q02.webp',
  'imagens-ecg/ecg_q09.webp',
  'imagens-ecg/ecg_q22.webp',
  'imagens-ecg/ecg_q25.webp',
  'imagens-ecg/ecg_q29.webp',
  'imagens-ecg/ecg_q32_cenario.webp',
  'imagens-ecg/ecg_q42.webp',
  'imagens-ecg/ecg_q48.webp',
  'imagens-ecg/ecg_q50.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Nunca cachear o POST de envio.
  if (req.method !== 'GET' || req.url.includes('/api/')) return;
  // Cache-first para os assets estáticos e imagens.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
