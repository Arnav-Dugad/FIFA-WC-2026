/* =====================================================================
   WORLD CUP 2026 HUB — Service Worker
   • Offline app shell + cached live data (open the app with no network)
   • Notifications surfaced via the SW registration (show even when the
     page is backgrounded on supported browsers)
   • Best-effort periodic background check for followed-team kick-offs
   NOTE: service workers require https:// or http://localhost. They do NOT
   run from file://. Serve the folder (e.g. `python -m http.server`) to
   unlock offline + background features.
   ===================================================================== */
const CACHE = 'wc2026-v4';
const SHELL = [
  './','index.html','fixtures.html','bracket.html','teams.html','players.html',
  'stats.html','stadiums.html','news.html','live.html','predictor.html',
  'css/styles.css','js/data.js','js/live-data.js','js/app.js','js/news.js','js/predictor.js',
  'manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // live data / external assets: network-first, fall back to cache
  if (/githubusercontent|thesportsdb|wikipedia\.org|flagcdn|basemaps|unpkg|tile/.test(url)) {
    e.respondWith(
      fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
                      .catch(() => caches.match(e.request))
    );
  } else {
    // app shell: network-first so new deploys load immediately (no hard refresh);
    // fall back to cache when offline, and to index.html for navigations.
    e.respondWith(
      fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
                      .catch(() => caches.match(e.request).then(c => c || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined)))
    );
  }
});

/* Page can hand the SW the schedule + followed teams so it can alert in the background */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'skip-waiting') { self.skipWaiting(); return; }
  if (e.data && e.data.type === 'state') {
    caches.open(CACHE).then(c => c.put('/_state', new Response(JSON.stringify(e.data.payload))));
  }
  if (e.data && e.data.type === 'notify') {
    self.registration.showNotification(e.data.title, { body: e.data.body, icon: e.data.icon, badge: e.data.icon, tag: e.data.tag });
  }
});

async function checkKickoffs() {
  try {
    const c = await caches.open(CACHE);
    const res = await c.match('/_state'); if (!res) return;
    const { favs = [], matches = [] } = await res.json();
    const now = Date.now();
    for (const m of matches) {
      if (!(favs.includes(m.home) || favs.includes(m.away))) continue;
      const mins = (m.ko - now) / 60000;
      if (mins <= 30 && mins > 0) {
        self.registration.showNotification('⏰ Kicking off soon', { body: `${m.h} vs ${m.a} — ${new Date(m.ko).toLocaleTimeString()}`, tag: 'k' + m.id });
      }
    }
  } catch (e) {}
}
self.addEventListener('periodicsync', e => { if (e.tag === 'wc-check') e.waitUntil(checkKickoffs()); });
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({type:'window'}).then(cl => cl.length ? cl[0].focus() : self.clients.openWindow('live.html'))); });
