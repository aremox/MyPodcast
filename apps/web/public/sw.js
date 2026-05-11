const CACHE_NAME = 'mypodcast-v1';
const AUDIO_CACHE_NAME = 'mypodcast-audio-v1';
const MAX_AUDIO_CACHE_ITEMS = 20;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Audio proxy — Cache First (offline playback)
  if (url.pathname.startsWith('/api/proxy/audio/')) {
    event.respondWith(handleAudioRequest(event.request));
    return;
  }

  // API requests — Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Static assets — Stale While Revalidate
  event.respondWith(handleStaticRequest(event.request));
});

async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      await enforceAudioCacheLimit(cache);
      await cache.put(request, cloned);
    }
    return response;
  } catch {
    return new Response('Audio no disponible offline', { status: 503 });
  }
}

async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Sin conexión' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}

async function enforceAudioCacheLimit(cache) {
  const keys = await cache.keys();
  if (keys.length >= MAX_AUDIO_CACHE_ITEMS) {
    const toDelete = keys.length - MAX_AUDIO_CACHE_ITEMS + 1;
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}
