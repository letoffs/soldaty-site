// sw.js — Service Worker для кэширования и офлайн-режима
const CACHE_NAME = 'soldaty-v1.0';

// Файлы, которые нужно кэшировать для офлайн-доступа
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/script.js',
  '/js/episodes-data.js',
  '/js/firebase-auth.js',
  '/js/analytics.js',
  '/js/season-descriptions.js',
  '/firebase-config.js',
  '/Resources/soldaty_logo.png',
  '/Resources/soldaty_icon.png',
  '/manifest.json'
];

// Установка Service Worker — кэшируем файлы
self.addEventListener('install', (event) => {
  console.log('[SW] Установка...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэшируем файлы');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch((err) => console.error('[SW] Ошибка кэширования:', err))
  );
  self.skipWaiting();
});

// Активация — удаляем старые кэши
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Удаляем старый кэш:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Перехват запросов — сначала пытаемся из сети, потом из кэша
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к YouTube, Rutube и Firebase (они не кэшируются)
  const url = event.request.url;
  if (url.includes('youtube.com') || 
      url.includes('ytimg.com') || 
      url.includes('googlevideo.com') ||
      url.includes('rutube.ru') ||
      url.includes('firebaseio.com') ||
      url.includes('googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Нашли в кэше — отдаём
        if (response) {
          return response;
        }
        // Не нашли — идём в сеть
        return fetch(event.request)
          .then((networkResponse) => {
            // Кэшируем только успешные ответы
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Если нет сети и нет кэша — показываем страницу офлайн
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Нет соединения', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
