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
  '/Resources/shmatko.jpg',
  '/Resources/kolobkov.jpg',
  '/Resources/borodin.jpg',
  '/Resources/zubov.jpg',
  '/Resources/smalkov.jpg',
  '/Resources/kudashyov.jpg',
  '/Resources/danilych.jpg',
  '/Resources/medvedev.webp',
  '/Resources/sokolov.jpg',
  '/Resources/ryleev.webp',
  '/Resources/gunko.webp',
  '/Resources/pogosyan.webp',
  '/Resources/medvedeva.jpg',
  '/Resources/schekochihina.jpg',
  '/Resources/shchur.jpg',
  '/Resources/babushkin.jpg',
  '/Resources/nelipa.jpg',
  '/Resources/fakhrutdinov.jpg',
  '/Resources/kichibekov.jpg',
  '/Resources/mazaev.png',
  '/Resources/maksimenko.jpg',
  '/Resources/kot.webp',
  '/Resources/tslav.jpg',
  '/Resources/lavrov.jpg',
  '/Resources/nesterov.jpg',
  '/Resources/kuzubov.jpg',
  '/Resources/dubin.jpg',
  '/Resources/kurenkov.jpg',
  '/Resources/tsyplakov.png',
  '/Resources/dobrodey.jpg',
  '/Resources/papazoglo.jpeg',
  '/Resources/varvara.webp',
  '/Resources/masha_shmatko.webp',
  '/Resources/angela.webp',
  '/Resources/evelina.jpg',
  '/Resources/evgeny_shmatko.jpg',
  '/Resources/anna_shmatko.jpg',
  '/Resources/kolobkova.jpg',
  '/Resources/zubova.webp',
  '/Resources/kabanov.jpeg',
  '/Resources/vakutagin.jpg',
  '/Resources/evseev.jpg',
  '/Resources/fomin.webp',
  '/Resources/prokhorov.webp',
  '/Resources/zvyagin.jpg',
  '/Resources/sukhachev.jpg',
  '/Resources/khodokov.jpg',
  '/Resources/kondrashov.jpg',
  '/Resources/nosov.jpg',
  '/Resources/tonyshev.jpg',
  '/Resources/slavskaya.jpg',
  '/Resources/kobyakova.jpg',
  '/Resources/kobrin.webp',
  '/Resources/navadsky.webp',
  '/Resources/pokroshinskaya.jpg',
  '/Resources/shkalin.jpg',
  '/Resources/yapontsev.jpg',
  '/Resources/prikhodko.jpg',
  '/Resources/zotova.webp',
  '/Resources/kaigorodov.jpg',
  '/Resources/kuleshov.jpg',
  '/Resources/borovoy.webp',
  '/Resources/kovalsky.jpg',
  '/Resources/pirozhak.webp',
  '/Resources/ivolgin.webp',
  '/Resources/kutsenko.jpg',
  '/Resources/yaroshenko.png',
  '/Resources/butonov.jpg',
  '/Resources/topalova.jpg',
  '/Resources/soldaty_logo.png',
  '/Resources/soldaty_icon.png',
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
  
  // Логируем все запросы (для отладки)
  console.log('[SW] Запрос:', url);

  // Пропускаем запросы к внешним API
  if (url.includes('firebaseio.com') || 
      url.includes('googleapis.com') ||
      url.includes('youtube.com') ||
      url.includes('ytimg.com') ||
      url.includes('googlevideo.com') ||
      url.includes('rutube.ru') ||
      url.includes('ren.tv')) {
    console.log('[SW] Пропускаем внешний запрос:', url);
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        console.log('[SW] Успешный ответ из сети:', url);
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        console.log('[SW] Ошибка сети, ищем в кэше:', url);
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[SW] Найдено в кэше:', url);
              return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
              console.log('[SW] Показываем offline.html');
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
