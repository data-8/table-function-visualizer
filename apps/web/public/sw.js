// Service worker: keeps the app shell available offline and caches the large Pyodide
// downloads. Two caches with independent lifetimes:
//   - the app cache is named after the build id (?v=...) so every deploy starts fresh;
//   - the Pyodide cache is named after the Pyodide version (?py=...) so it survives deploys
//     and is only refetched when Pyodide itself is upgraded.
const params = new URL(self.location.href).searchParams;
const APP_CACHE = `table-tutor-app-${params.get('v') || 'dev'}`;
const PYODIDE_CACHE = `table-tutor-pyodide-${params.get('py') || 'unknown'}`;
const KEEP = new Set([APP_CACHE, PYODIDE_CACHE]);

// The base path the app is served from ("/" or "/table-function-visualizer/")
const SCOPE = new URL(self.registration ? self.registration.scope : self.location.href).pathname;

function isPyodideAsset(url) {
  return (
    url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/pyodide/') ||
    url.hostname === 'files.pythonhosted.org' ||
    url.pathname.endsWith('.whl') ||
    url.pathname.endsWith('.wasm')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll([SCOPE, `${SCOPE}index.html`]).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => !KEEP.has(n)).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Pyodide runtime and wheels: cache first, they never change for a given version
  if (isPyodideAsset(url)) {
    event.respondWith(
      caches.open(PYODIDE_CACHE).then((cache) =>
        cache.match(event.request).then((hit) => hit || fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }))
      )
    );
    return;
  }

  // Everything else: network first, falling back to this build's cache when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (url.origin === self.location.origin || response.type === 'basic')) {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
