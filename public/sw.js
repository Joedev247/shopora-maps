// Service Worker for Shopora Maps - Offline Support
const CACHE_NAME = 'shopora-maps-v1';
const OFFLINE_QUEUE_KEY = 'offline_queue';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/App.jsx'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip Vite dev server requests (development mode)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // Don't intercept dev server requests - let them pass through
    return;
  }
  
  // Skip Vite HMR and dev server internal requests
  if (url.pathname.includes('@vite') || 
      url.pathname.includes('@react-refresh') ||
      url.pathname.includes('@id') ||
      url.pathname.startsWith('/node_modules/')) {
    return;
  }
  
  // Only handle requests to Supabase API
  if (event.request.url.includes('supabase.co') || event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If request succeeds, return response
          return response;
        })
        .catch((error) => {
          // If request fails (offline), queue it
          if (event.request.method === 'POST' || event.request.method === 'PUT' || event.request.method === 'PATCH') {
            // For write operations, queue the request
            return queueRequest(event.request);
          }
          // For read operations, return error
          throw error;
        })
    );
  } else {
    // For other requests in production, try cache first, then network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Queue request for later sync
async function queueRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: {},
      body: await request.clone().text(),
      timestamp: Date.now()
    };
    
    // Store in IndexedDB or send message to client
    // For simplicity, we'll use postMessage to notify the client
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'OFFLINE_REQUEST_QUEUED',
        data: requestData
      });
    });
    
    // Return a response indicating the request was queued
    return new Response(JSON.stringify({ 
      queued: true, 
      message: 'Request queued for offline sync' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error queueing request:', error);
    return new Response(JSON.stringify({ error: 'Failed to queue request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

