const CACHE = 'fittrack-v1';
const FICHEIROS = [
  './',
  './index.html',
  './login.html',
  './macros.html',
  './style.css',
  './script.js',
  './alimentos.js',
  './manifest.json',
  './fittrack_logo.png',
  './fittrack_mark.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Instalar e guardar ficheiros em cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FICHEIROS))
  );
  self.skipWaiting();
});

// Limpar caches antigas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: tenta buscar online, cai para cache se offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Não cachear chamadas à API Gemini
  if (e.request.url.includes('generativelanguage.googleapis.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
