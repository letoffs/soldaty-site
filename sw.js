// sw.js — Полностью переработан для офлайн-режима
const CACHE_NAME = 'soldaty-v2.0'; // Новая версия кэша
// Файлы, которые будут доступны офлайн
const OFFLINE_CACHE = [
  '/',
  '/index.html',
  '/heroes.html',
  '/gallery.html',
  '/quiz.html',
  '/soundtracks.html',
  '/videos.html',
  '/css/style.css',
  '/js/script.js',
  '/js/heroes-data.js',
  '/js/heroes.js',
  '/js/season-descriptions.js',
  '/js/episodes-data.js',
  '/js/firebase-auth.js',
  '/js/analytics.js',
  '/firebase-config.js',
  '/manifest.json',
  '/Resources/soldaty_logo.png',
  '/Resources/soldaty_icon.png',
  '/offline.html' // Создайте этот файл (см. ниже)
];

// Установка: кэшируем файлы
self.addEventListener('install', event => {
  console.log('[SW] Установка и кэширование ресурсов...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
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
  
  // Пропускаем запросы к API и Firebase
  if (url.includes('firebaseio.com') || 
      url.includes('googleapis.com') ||
      url.includes('youtube.com') ||
      url.includes('ytimg.com') ||
      url.includes('googlevideo.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Кэшируем успешные ответы для будущего офлайн-доступа
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, ищем в кэше
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Если в кэше нет, показываем страницу-заглушку
            return caches.match('/offline.html');
          });
      })
  );
});
