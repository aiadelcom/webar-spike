# Источники материалов

Скачаны 2026-10-24. Все файлы локальны; камера и пользовательские данные не отправляются на сервер.

| Цель / файл | Источник | Разрешение / лицензия |
| --- | --- | --- |
| `portrait` — портрет на однотонном фоне | [Unsplash, photo-1534528741775-53994a69daeb](https://images.unsplash.com/photo-1534528741775-53994a69daeb) | Получен JPG 1200×1600; [Unsplash License](https://unsplash.com/license) |
| `city` — детальная улица города | [Unsplash, photo-1519501025264-65ba15a82390](https://images.unsplash.com/photo-1519501025264-65ba15a82390) | Получен JPG 1200×1600; [Unsplash License](https://unsplash.com/license) |
| `media/portrait.mp4`, `media/city.mp4` — одинаковый технический ролик медуз | [8th Wall, актуальный Image Targets example](https://github.com/8thwall/aframe-image-targets-example/blob/main/src/assets/jellyfish-video.mp4), тот же jellyfish из flyer | [MIT примера](https://github.com/8thwall/aframe-image-targets-example/blob/main/LICENSE), копия в `external/scripts/LICENSE` |
| `external/scripts/8frame-1.5.0.min.js` | [8-Frame из официального примера](https://github.com/8thwall/aframe-image-targets-example/blob/main/external/scripts/8frame-1.5.0.min.js) | Версия, на которую направляет [Engine overview](https://8thwall.org/docs/engine/overview); MIT, встроенные notices сохранены |

Unsplash License разрешает скачивание, изменение и использование фото, включая коммерческое; запрещает перепродажу неизменённых фото и создание конкурирующей фотобиблиотеки. Здесь фото используются только как тестовые цели. Авторство не угадывалось; точные CDN-источники сохранены выше.

Загрузка обеих фотографий: `?auto=format&fit=crop&w=1200&h=1600&q=90`. Пропорция намеренно приведена к 3:4 перед CLI: печатается ровно тот же cropped JPG, который скомпилирован, без растяжения tracking-изображения. `*_original.jpg` — вход CLI (уже эта версия Unsplash), не исходник полного разрешения фотографа.

Официальный `npx @8thwall/image-target-cli@latest` разрешился в **1.0.0**. На каждой цели: путь к JPG → flat → default crop → `targets` → `portrait`/`city`. Изменён только `imagePath`: с дефолтного `image-targets/...` на `targets/...`, относительно index.html. Luminance: 480×640, grayscale. Все остальные поля — вывод CLI.

FFmpeg в PATH отсутствовал; согласно заданию использован запасной jellyfish, по копии на цель, каждая 1 862 205 байт (<2 МБ). Это демонстрационный ролик, не анимация самого портрета/города; оценивать нужно крепление видео к фотографии. Фактическая длительность и кодек записываются в `verification/assets.json`.
