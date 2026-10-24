# Проверки без телефона

2026-10-24, Chromium 149.0.7827.55 / Playwright 1.61.1, уже установлены на хосте. Bazel и сборки из исходников не запускались, HTTP-сервер/порты не использовались. Браузеры закрываются в finally.

## Шаг 2: binary и MIT

- `browser-published.json` и `browser-published-mit.json`: реальные HTTPS-запросы к Pages, fake camera. На обеих страницах проверены **hasVideo**, **xrimagescanning: portrait + city**, **realityready**, отсутствие исключений JavaScript. Оба видео декодированы до readyState 4, muted/playsinline/loop сохранены. Захват картинки не имитировался, время до захвата не измерялось.
- На обеих версиях прошли фолбэки Instagram, Telegram, Facebook, VK по UA, отсутствие getUserMedia, принудительный `NotAllowedError`, закрытие камеры, переключение обычного видео, копирование ссылки и JSON-лога через ручное поле при запрете Clipboard API. В экспортируемом логе проверено поле `engine` — binary/mit. Отказ камеры — инъекция в браузерный API, не реальный отказ пользователя на телефоне.
- `network-mit.json`: события запросов/ответов из изолированного browser context (включая workers), без блокирования хостов. **16 запросов до xrimagescanning**, после него до окончания наблюдения (realityready + 3 s) новых запросов нет. Единственный HTTP-хост — **aiadelcom.github.io**, запросов к 8thwall.com / nianticspatial.com и их поддоменам **0**. Запросов к `external/xr/` (binary) **0**; загружены `external/xr-mit/xr.js` и **xr-tracking.js**, не xr-slam.js. Это проверка текущего сценария с видеоплоскостями, не обещание для будущих Draco-моделей и других функций.
- В MIT dist есть ссылки на `cdn.8thwall.com/web/resources/draco-worker-l5sniji5.js` и `draco_wasm_wrapper-l325u8do.js`. Они не запрашиваются: сжатых 3D-моделей в спайке нет. Патчи dist и переопределения URL не понадобились. `resources/powered-by.svg` скопирован локально вместе с MIT LICENSE.
- `http-published.json`: **58 из 58 HTTP 200** через `curl -sI`, включая `/`, `/mit/`, оба index.html, общие app.js/style.css/print.html, обе пары runtime JS, оба JSON и MP4, изображения, локальные ресурсы и лицензии. Удалённый неиспользуемый binary media-worker больше не входит в дистрибутив/проверку.
- В консоли предупреждения 8-Frame/THREE: schema default color, deprecated useLegacyLights; программный WebGL Chromium сообщает GPU stall. При остановке/удалении сцены XR8 предупреждает `Pause cannot be called at this time`. На обеих страницах при переключении fallback-видео браузер отменил один запрос portrait.mp4 (`net::ERR_ABORTED`); HTTP-ошибок и ошибок декодирования нет.

## Размеры и неизменность

`assets.json` — актуальные размеры и SHA-256 всех external/targets/media. Весь external с двумя движками: **13 490 652 байта** (<15 МБ). MIT: xr.js **1 014 245**, xr-tracking.js **3 887 693**, powered-by.svg **6 056**, LICENSE **1 069**, всего **4 909 063 байта**. Все четыре файла побайтово совпадают с `@8thwall/engine@0.1.0`.

`index.html` бинарной страницы, targets и media не менялись. Общий app.js добавляет параметр пути/названия движка и его имя в лог, значения по умолчанию сохраняют binary. Для лимита размера вместо обязательного для binary Image Targets `xr-slam.js` удалён неиспользуемый `external/xr/resources/media-worker.js` (4 995 543 байта; запись/экспорт видео). Результаты повторного запуска подтверждают, что обе страницы работают без него. Остальные binary-файлы сохранены без изменений; xrextras — полная копия dist.

MP4: 1 862 205 байт каждый, AVC1/H.264, duration 2.867 s (Chromium: 2.866667 s), 980×1308. Фото — 1200×1600, luminance CLI — 480×640, визуально grayscale (JPEG хранит 3 канала). JSON.parse и `node --check app.js` успешны. Источники материалов — в docs/ASSETS.md.

## Повторение

Команды есть в корневом README. `browser-local*.json` и `network-local-mit.json` сохраняют предварительную проверку настоящих дистрибутивов через Playwright route по тестовому HTTPS origin; опубликованные проверки используют настоящую сеть. `python3 verification/update-assets.py` обновляет размеры/хеши без сборок. Проверку удержания/потери/возврата цели, autoplay Safari, фактическое время захвата и сравнение отпечатков выполняет владелец по таблице binary/mit.
