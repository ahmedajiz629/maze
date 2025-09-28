const CACHE_NAME = 'maze-game-v1';
const ASSETS_TO_CACHE = [
  // Core app files
  '/',
  '/index.html',
  
  // Models and assets
  '/assets/models/happy.glb',
  '/assets/models/minecraft_key.glb',
  '/assets/models/minecraft_box.glb',
  '/assets/models/btn.glb',
  '/assets/models/door.glb',
  '/assets/models/snake_doors.glb',
  
  // Textures and other assets
  '/assets/textures/lava.gif',
  '/assets/models/key.png',
  
  // Python worker and related files
  '/python-worker.js'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential assets');
        return cache.addAll(ASSETS_TO_CACHE.filter(url => {
          // Only cache local assets during install, skip external CDN
          return !url.startsWith('http');
        }));
      })
      .then(() => {
        console.log('Service Worker: All essential assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Caching failed during install:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim(); // Take control of all clients
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.includes('/assets/')) {
    // Asset files (models, textures, etc.) - Cache first strategy
    event.respondWith(
      cacheFirstStrategy(event.request)
    );
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    // JS/CSS files - Stale while revalidate
    event.respondWith(
      staleWhileRevalidateStrategy(event.request)
    );
  } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    // HTML files - Network first with cache fallback
    event.respondWith(
      networkFirstStrategy(event.request)
    );
  }
  // For other requests (APIs, external CDNs), let them go through normally
});

// Cache-first strategy for assets (GLB files, textures, etc.)
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Not in cache, fetch from network and cache it
    console.log('Service Worker: Fetching and caching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone the response before caching (response can only be consumed once)
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache-first strategy failed:', error);
    // Try to serve from cache as last resort
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request);
  }
}

// Stale-while-revalidate strategy for JS/CSS
async function staleWhileRevalidateStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Always try to fetch fresh version in background
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });
    
    // Return cached version immediately if available, otherwise wait for network
    return cachedResponse || await fetchPromise;
  } catch (error) {
    console.error('Service Worker: Stale-while-revalidate failed:', error);
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request);
  }
}

// Network-first strategy for HTML
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Network-first failed, trying cache:', error);
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a basic offline page if nothing is cached
    return new Response('Offline - Please check your internet connection', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}