const CACHE_NAME = 'mypodcast-v4';
const AUDIO_CACHE_NAME = 'mypodcast-audio-v2';
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

  // Only handle http/https — ignore chrome-extension://, data:, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Offline audio — served from Cache API (downloaded by OfflineStorageService)
  if (url.pathname.startsWith('/api/proxy/audio/')) {
    // Bypass service worker caching for direct USB exports to prevent memory exhaustion or channel closing
    if (url.searchParams.has('export')) {
      return;
    }
    // Tesla browser media player does not play nice with SW media interception (causes seeking to reset to 0)
    if (typeof navigator !== 'undefined' && /Tesla/i.test(navigator.userAgent)) {
      return;
    }
    event.respondWith(handleAudioRequest(event.request));
    return;
  }

  // All other API requests — always go to network (Angular interceptor handles JWT)
  // The SW must NOT intercept these or the Authorization header gets lost
  if (url.pathname.startsWith('/api/')) {
    return; // Let the browser handle it directly
  }

  // Static assets — Stale While Revalidate
  event.respondWith(handleStaticRequest(event.request));
});

async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    return handleRangeRequest(request, cached);
  }

  // Not in cache — fetch from network (will carry the JWT from OfflineStorageService)
  try {
    const response = await fetch(request);
    // Only cache full 200 responses. Caching 206 Partial Content throws an error.
    if (response.status === 200) {
      const cloned = response.clone();
      await enforceAudioCacheLimit(cache);
      await cache.put(request, cloned);
    }
    return response;
  } catch (err) {
    console.error('SW Audio Fetch error:', err);
    return new Response('Audio no disponible offline', { status: 503 });
  }
}

async function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) {
    return response;
  }

  try {
    const blob = await response.blob();
    const size = blob.size;
    
    // Parse range: e.g. "bytes=100-200" or "bytes=100-"
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (!rangeMatch) {
      return response;
    }
    
    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : size - 1;
    
    if (isNaN(start) || isNaN(end) || start >= size || end >= size) {
      return new Response('', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`,
        }
      });
    }
    
    const slicedBlob = blob.slice(start, end + 1);
    return new Response(slicedBlob, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(slicedBlob.size),
        'Accept-Ranges': 'bytes',
      }
    });
  } catch (err) {
    console.error('Error handling SW range request:', err);
    return response;
  }
}

async function handleStaticRequest(request) {
  // Skip non-cacheable requests (POST, etc.)
  if (request.method !== 'GET') return fetch(request);

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
