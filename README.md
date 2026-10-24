# SPIKE-AR1 · TREK-594 · EPIC-16

Статическая проверка 8th Wall Image Targets: две активные цели, видео на фотографии, без приложения, аккаунта, appKey и серверной части. Пригодность для реальной печати определяет проверка владельцем; запуск в headless этого не доказывает.

## Владельцу: 5 строк

1. На телефоне откройте https://aiadelcom.github.io/webar-spike/ в iPhone Safari или Android Chrome; на ноутбуке — https://aiadelcom.github.io/webar-spike/print.html.
2. Нажмите «Включить камеру» и разрешите доступ; если видео не играет, нажмите «Запустить видео»; во встроенном браузере кнопка «Открыть в Safari/Chrome» копирует ссылку.
3. Наведите на одну фотографию целиком на экране ноутбука, затем на её матовую распечатку; отдельно распечатайте city или portrait на глянце и проверьте при лампе с бликом и без него.
4. Успех: `found:portrait` или `found:city`, видео совпадает с границами фото и держится при медленном движении/наклоне руки; после закрытия цели — `lost`, при возврате — повторный захват.
5. Для каждого нового замера перезагрузите страницу; нажмите «Скопировать лог» и пришлите текст вместе со строкой таблицы ниже; также проверьте отказ камеры и открытие ссылки из мессенджера.

## Таблица результатов

На каждом устройстве выполните все шесть условий. Глянец проверяйте под лампой с бликом и после изменения угла. Впишите модель/ОС/версию браузера и освещение в замечания. Если захвата нет — укажите «нет за 30 с», не 0 мс.

| Устройство | Цель | Экран-или-печать | Время до захвата, мс | Держит при движении да-нет | Замечания |
| --- | --- | --- | --- | --- | --- |
| iPhone / Safari | portrait | экран | | | |
| iPhone / Safari | city | экран | | | |
| iPhone / Safari | portrait | матовая печать | | | |
| iPhone / Safari | city | матовая печать | | | |
| iPhone / Safari | city | глянец / лампа, блик | | | |
| iPhone / Safari | city | глянец / лампа, без блика | | | |
| Android / Chrome | portrait | экран | | | |
| Android / Chrome | city | экран | | | |
| Android / Chrome | portrait | матовая печать | | | |
| Android / Chrome | city | матовая печать | | | |
| Android / Chrome | city | глянец / лампа, блик | | | |
| Android / Chrome | city | глянец / лампа, без блика | | | |

Печать: print.html → A4, 100%, без колонтитулов; одна цель на лист, фото 168×224 мм. Не обрезайте содержимое фото, не растягивайте. На экране уменьшите блики, держите цель целиком в кадре, начните примерно с 25–50 см.

## Реализация и замер

- `index.html`, `app.js`, `style.css`, `print.html` — обычная статика без сборщика. Никакого WebXR API в коде спайка, MindAR, CDN, аналитики или загрузки фото/камеры на сервер. XR8 использует обычную камеру браузера.
- `@8thwall/engine-binary` **1.0.0**, `@8thwall/xrextras` **1.0.0**, lockfile; 8-Frame **1.5.0** из официального примера. Единственный npm install: `npm install --ignore-scripts @8thwall/engine-binary@1.0.0 @8thwall/xrextras@1.0.0 --save-exact`.
- До создания сцены вызывается `XR8.XrController.configure({disableWorldTracking: true, imageTargetData})`. Чанк `slam` нужен и для Image Targets; мировая SLAM-трекинг-функция отключена.
- Оба JSON от CLI загружаются вместе. [Release notes 27.4](https://8thwall.org/docs/engine/release-notes) указывают до **32 активных** целей: две не требуют отдельных страниц. Это лимит активного набора для сканирования, не обещание одновременного устойчивого трекинга 32 отпечатков.
- `xrextras-named-image-target` обновляет position/quaternion/scale по событиям движка; дочерняя плоскость размером `scaledWidth × scaledHeight`, материал — видео, muted + playsinline + loop. Вместо `xrextras-play-video` используются явные `play().catch()` и кнопка, чтобы обработать запрет autoplay и логировать его. Собственная плашка обрабатывает загрузку/ошибки вместо перекрывающих экран xrextras-loading/runtime-error.
- Главный замер: `performance.now()` от **`camerastatuschange: hasVideo`** (появились кадры камеры) до первого **`xrimagefound`** за посещение страницы. Разрешение камеры и загрузка JS до старта камеры в него не входят. Значение остаётся на экране после потери/повторного захвата. Каждый тест — новая загрузка страницы. Если событие старта отсутствует, значение не выдумывается.
- `loading / scanning / found:<name> / lost` показаны на экране и в консольном логе. `xrimageupdated` записывается не чаще раза в секунду на цель; лог ограничен 500 записями. «Скопировать лог» включает UA, URL, время и события. При запрете Clipboard API показывается поле для ручного копирования.
- Нет getUserMedia, камера отклонена/недоступна или UA Instagram/Telegram/Facebook/VK → ссылка для копирования в Safari/Chrome и обычное видео в рамке выбранного фото. Определение встроенного браузера по UA эвристическое: если приложение скрывает своё имя, оно не будет распознано заранее, но ошибка камеры всё равно приводит к фолбэку.

## Дистрибутив, лицензия и материалы

[Контекст](docs/CONTEXT.md), [источники/генерация целей](docs/ASSETS.md), [полные лицензии](LICENSE-THIRD-PARTY.md), [проверки](verification/).

Причина отклонения от полной копии dist: `engine-binary/dist` занимает 30 967 196 байт, больше заданных 15 МБ. В `external/xr/` скопированы неизменённые файлы; исключены только `xr-face.js`, `resources/face-{ear,mesh,model}*.tflite`, `resources/semantics-model.tflite`, `resources/semantics-worker.js`, относящиеся к Face/Sky. XR8, Image Targets/SLAM, media-worker, остальные ресурсы и LICENSE сохранены. `external/xrextras/` — полная копия dist. Итоговые размеры — в `verification/assets.json`; весь external укладывается в 15 МБ. Сборка движка не запускалась.

Используется **бинарник под XR Engine License Agreement, не MIT-движок**. Copyright Niantic Spatial показан в футере index.html; полный LICENSE пакета включён без изменений в LICENSE-THIRD-PARTY.md. По §1.1 допускается использование неизменённого бинарника в своём приложении. §1.2 ограничивает платные продукты, чья ценность полностью или существенно определяется движком; запрещает модификацию/reverse engineering, конкурентный движок и сходные продукты. Поэтому разрешение коммерческого использования не означает неограниченного разрешения строить платную AR-платформу. Подробности и отказ от гарантий — в самом соглашении.

Для перехода на MIT: закрепить ревизию [8thwall/8thwall](https://github.com/8thwall/8thwall), подготовить отдельное окружение Bazel/Bazelisk, Buildifier, Node и Python 3.11 по [CONTRIBUTING](https://github.com/8thwall/8thwall/blob/main/CONTRIBUTING.md), получить полный исходный монорепозиторий и зависимости. [prepack.sh пакета engine](https://github.com/8thwall/8thwall/blob/main/packages/engine/tools/prepack.sh) собирает `//reality/app/xr/js:bundle --config=wasmreleasesimd`; результат bundle.zip нужно распаковать вместо external/xr. Сохранить MIT и notices, не подключать бинарный SLAM-чанк. В MIT пакетe chunk по совместимости тоже называется `slam`, но содержит Image Targets без world tracking. Повторить запуск, измерения и всю матрицу устройств/печати: равное качество бинарной и MIT версий этим спайком не установлено. [README MIT engine](https://github.com/8thwall/8thwall/blob/main/packages/engine/README.md) также описывает pre-release `@8thwall/engine@0.1.0`; здесь его не устанавливали.

## Проверка без телефона

`node --check app.js`; JSON.parse для targets; размеры и SHA-256 в assets.json. Установленный Playwright/Chromium запускается с `--use-fake-device-for-media-stream`; без порта файлы отдаются через Playwright route по тестовому HTTPS origin. Повторная проверка опубликованного сайта использует настоящие HTTPS-запросы. Запуск: `node verification/check-browser.cjs`; для Pages — `SPIKE_URL=https://aiadelcom.github.io/webar-spike/ node verification/check-browser.cjs`. Ничего дополнительно устанавливать и запускать HTTP-сервер не нужно. Замер захвата на фейковой камере не делается. Реальные результаты сохраняются в verification; распечатки и Safari/Chrome на телефонах проверяет владелец.
