# Проверки без телефона

2026-10-24, Chromium 149.0.7827.55 / Playwright 1.61.1, уже установлены на хосте.

- `browser-local.json`: настоящие дистрибутивы XR8/xrextras/8-Frame через Playwright route, HTTPS origin, fake camera. `hasVideo`, загрузка **portrait + city**, `xrimagescanning`, `realityready`; исключений страницы и неудачных сетевых запросов нет. Захват и его время не имитировались.
- Проверены фолбэки Instagram, Telegram, Facebook, VK по UA, отсутствие getUserMedia, принудительный `NotAllowedError` при запросе камеры, закрытие камеры, переключение обычного видео, ручное копирование ссылки и JSON-лога при запрете Clipboard API. Все прошли. Отказ камеры — тестовая инъекция в браузерный API, не реальный отказ пользователя на телефоне.
- В консоли есть предупреждения самого 8-Frame/THREE: schema default color, deprecated useLegacyLights; программный WebGL Chromium сообщает GPU stall. При остановке/удалении сцены XR8 предупреждает `Pause cannot be called at this time`. Ошибок/исключений нет; файлы поставщиков не правились.
- `assets.json`: размеры и SHA-256 всех external/targets/media; MP4 mvhd = 2.867 s, AVC1/H.264 sample entry, 1 862 205 байт каждый. Chromium декодирует ролик 980×1308, 2.866667 s, readyState 4. Luminance-изображения CLI — 480×640, визуально grayscale (JPEG хранит 3 канала). Обе фото для экрана/печати — 1200×1600.
- Оставленные файлы external/xr побайтово совпадают с npm dist; external/xrextras — полная побайтовая копия dist. Сумма размеров файлов всего external = 13 577 132 байта (<15 МБ).
- `node --check app.js` и JSON.parse обоих targets/*.json — успешно.

Проверка опубликованной страницы и curl добавляются после публикации в `browser-published.json` и `http-published.json`. Тест скриптом можно повторить командой из README; он закрывает браузер в finally и не слушает сетевые порты. Переходы событий/поза на реальной фотографии, autoplay на iOS и качество печати требуют телефона.
