const CACHE_NAME = 'soldaty-v5.0';

const OFFLINE_CACHE = [
  '/',
  '/index.html',
  '/heroes.html',
  '/gallery.html',
  '/quiz.html',
  '/soundtracks.html',
  '/videos.html',
  '/profile.html',
  '/contacts.html',
  '/offer.html',
  '/admin-gallery.html',
  '/analytics.html',
  '/offline.html',
  '/css/style.css',
  '/css/soundtracks.css',
  '/css/videos.css',
  '/js/admin-gallery.js',
  '/js/analytics.js',
  '/js/episodes-data.js',
  '/js/firebase-auth.js',
  '/js/gallery.js',
  '/js/heroes-data.js',
  '/js/heroes.js',
  '/js/profile.js',
  '/js/quiz-levels.js',
  '/js/quiz.js',
  '/js/script.js',
  '/js/season-descriptions.js',
  '/js/soundtracks.js',
  '/js/videos.js',
  '/firebase-config.js',
  '/sw.js',
  '/manifest.json',
  '/.nojekyll',
  '/CNAME',
  '/Resources/soldaty_logo.png',
  '/Resources/soldaty_icon.png'
];

// Установка: кэшируем файлы
self.addEventListener('install', event => {
  console.log('[SW] Установка и кэширование всех ресурсов...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование файлов, всего:', OFFLINE_CACHE.length);
        return cache.addAll(OFFLINE_CACHE);
      })
      .catch(err => console.error('[SW] Ошибка кэширования:', err))
  );
  self.skipWaiting();
});

// Активация: удаляем старый кэш
self.addEventListener('activate', event => {
  console.log('[SW] Активация и очистка старого кэша...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Удаляем старый кэш:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Стратегия загрузки: сначала сеть, при ошибке — кэш
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Пропускаем запросы к внешним API
  if (url.includes('firebaseio.com') || 
      url.includes('googleapis.com') ||
      url.includes('youtube.com') ||
      url.includes('ytimg.com') ||
      url.includes('googlevideo.com') ||
      url.includes('rutube.ru') ||
      url.includes('ren.tv')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Нет соединения', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
