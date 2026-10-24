/* Static SPIKE-AR1. No account, API server, WebXR session or app key. */
'use strict';
(() => {
  const engineName = document.currentScript.dataset.engineName || 'binary';
  const enginePath = document.currentScript.dataset.engine || 'external/xr/xr.js';
  const $ = (id) => document.getElementById(id);
  const names = ['portrait', 'city'];
  const records = [];
  const active = new Set();
  const videos = new Map();
  let scene = null;
  let mode = 'intro';
  let cameraAt = null;
  let firstFoundMs = null;
  let startupTimer;
  const describe = (error) => ({name: error?.name, message: error?.message || String(error)});
  const log = (event, data = {}) => {
    const row = {at: new Date().toISOString(), pageMs: Math.round(performance.now()), event, ...data};
    records.push(row);
    if (records.length > 500) records.splice(1, 1);
    console.info('[SPIKE-AR1]', JSON.stringify(row));
  };
  const state = (text) => { $('status').textContent = text; };
  const refreshState = () => state(active.size ? `found:${[...active].join(',')}` : 'lost · наведите на фото снова');
  const refreshPlay = () => { $('play').hidden = ![...active].some((name) => videos.get(name)?.paused); };

  async function copy(text, notice) {
    try {
      await navigator.clipboard.writeText(text);
      $('notice').textContent = notice;
    } catch (_) {
      $('manual-copy').hidden = false;
      $('manual-copy').open = true;
      $('copy-text').value = text;
      $('copy-text').focus();
      $('copy-text').select();
      $('notice').textContent = 'Выделенный текст можно скопировать вручную.';
    }
  }
  function stopCamera() {
    clearTimeout(startupTimer);
    active.clear();
    videos.forEach((video) => video.pause());
    if (window.XR8 && scene) {
      try { XR8.stop(); } catch (error) { log('stop-error', describe(error)); }
    }
    if (scene) scene.remove();
    scene = null;
    $('scene-host').replaceChildren();
    document.body.classList.remove('ar');
    $('stop').hidden = true;
    $('play').hidden = true;
  }
  function fallback(reason) {
    mode = 'fallback';
    stopCamera();
    $('intro').hidden = true;
    $('fallback').hidden = false;
    $('fallback-reason').textContent = reason;
    state('fallback · видео без камеры');
    log('fallback', {reason});
    $('fallback-video').play().catch((error) => log('fallback-play-needs-tap', describe(error)));
  }
  async function playVideo(name) {
    const video = videos.get(name);
    if (!video) return;
    try {
      await video.play();
      if (!active.has(name)) video.pause();
    } catch (error) {
      log('autoplay-blocked', {target: name, ...describe(error)});
    }
    refreshPlay();
  }
  function loadScript(src, attributes = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
      document.head.appendChild(script);
    });
  }
  function engineReady() {
    return new Promise((resolve, reject) => {
      const ready = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(() => {
        window.removeEventListener('xrloaded', ready);
        reject(new Error('XR8 xrloaded timeout (45 s)'));
      }, 45000);
      window.addEventListener('xrloaded', ready, {once: true});
      loadScript(enginePath, {'data-preload-chunks': 'slam'}).then(() => {
        if (window.XR8) ready();
      }).catch((error) => {
        clearTimeout(timer);
        window.removeEventListener('xrloaded', ready);
        reject(error);
      });
    });
  }
  function wireScene(el) {
    el.addEventListener('camerastatuschange', ({detail}) => {
      if (mode !== 'ar') return;
      log('camera', {status: detail.status});
      if (detail.status === 'hasVideo' && cameraAt === null) {
        cameraAt = performance.now();
        log('camera-start', {clock: 'performance.now', origin: 'camerastatuschange:hasVideo'});
      }
      if (detail.status === 'failed') fallback('Камера недоступна или доступ отклонён. Откройте ссылку в Safari/Chrome и разрешите камеру.');
    });
    el.addEventListener('realityready', () => {
      if (mode !== 'ar') return;
      clearTimeout(startupTimer);
      log('realityready');
    });
    el.addEventListener('realityerror', ({detail}) => {
      log('realityerror', {error: describe(detail?.error || detail)});
      fallback('Ошибка запуска AR. Можно посмотреть видео ниже; подробности — в логе.');
    });
    el.addEventListener('xrimageloading', () => { if (mode === 'ar') { state('loading · загрузка целей'); log('xrimageloading'); } });
    el.addEventListener('xrimagescanning', ({detail}) => {
      if (mode !== 'ar') return;
      state('scanning · наведите на фото');
      log('xrimagescanning', {targets: detail.imageTargets.map((t) => t.name)});
    });
    el.addEventListener('xrimagefound', ({detail}) => {
      if (mode !== 'ar' || !names.includes(detail.name)) return;
      active.add(detail.name);
      if (firstFoundMs === null && cameraAt !== null) {
        firstFoundMs = Math.round(performance.now() - cameraAt);
        $('timing').textContent = `Камера → первый захват: ${firstFoundMs} мс (${detail.name})`;
        log('first-found', {target: detail.name, cameraToFirstFoundMs: firstFoundMs});
      } else if (cameraAt === null) {
        log('timing-unavailable', {reason: 'no camera hasVideo event; no fabricated measurement'});
      }
      log('xrimagefound', {target: detail.name, scaledWidth: detail.scaledWidth, scaledHeight: detail.scaledHeight});
      refreshState();
      playVideo(detail.name);
    });
    const lastUpdate = {};
    el.addEventListener('xrimageupdated', ({detail}) => {
      if (mode !== 'ar' || !names.includes(detail.name)) return;
      if (performance.now() - (lastUpdate[detail.name] || 0) < 1000) return;
      lastUpdate[detail.name] = performance.now();
      log('xrimageupdated', {target: detail.name, position: detail.position, rotation: detail.rotation, scale: detail.scale});
    });
    el.addEventListener('xrimagelost', ({detail}) => {
      if (mode !== 'ar') return;
      active.delete(detail.name);
      videos.get(detail.name)?.pause();
      log('xrimagelost', {target: detail.name});
      refreshState();
      refreshPlay();
    });
  }
  async function start() {
    $('start').disabled = true;
    mode = 'loading';
    state('loading · движок и цели');
    log('start-click');
    // Create/unlock the muted inline videos during the user's gesture.
    const assets = document.createElement('a-assets');
    assets.setAttribute('timeout', '15000');
    for (const name of names) {
      const video = document.createElement('video');
      video.id = `ar-video-${name}`;
      video.src = `media/${name}.mp4`;
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.loop = true;
      video.preload = 'auto';
      videos.set(name, video);
      assets.appendChild(video);
      video.play().then(() => { if (!active.has(name)) video.pause(); }).catch((error) => log('video-unlock-needs-tap', {target: name, ...describe(error)}));
      video.addEventListener('error', () => log('video-error', {target: name, code: video.error?.code}));
    }
    try {
      const dataPromise = Promise.all(names.map(async (name) => {
        const response = await fetch(`targets/${name}.json`);
        if (!response.ok) throw new Error(`targets/${name}.json: HTTP ${response.status}`);
        return response.json();
      })).then((data) => ({data}), (error) => ({error}));
      // Scripts are ordered: 8-Frame -> xrextras -> XR8 -> configure -> scene.
      await loadScript('external/scripts/8frame-1.5.0.min.js');
      await loadScript('external/xrextras/xrextras.js');
      await engineReady();
      const targetResult = await dataPromise;
      if (targetResult.error) throw targetResult.error;
      const imageTargetData = targetResult.data;
      if (mode !== 'loading') return;
      XR8.XrController.configure({disableWorldTracking: true, imageTargetData});
      log('engine-configured', {engine: engineName, enginePath, disableWorldTracking: true, targets: imageTargetData.map((t) => t.name), aframe: AFRAME.version});
      AFRAME.registerComponent('spike-video-size', {
        init() {
          this.onGeometry = ({detail}) => {
            if (detail.scaledWidth > 0 && detail.scaledHeight > 0) {
              this.el.object3D.scale.set(detail.scaledWidth, detail.scaledHeight, 1);
            }
          };
          this.el.parentNode.addEventListener('xrextrasimagegeometry', this.onGeometry);
        },
        remove() { this.el.parentNode?.removeEventListener('xrextrasimagegeometry', this.onGeometry); }
      });
      scene = document.createElement('a-scene');
      scene.setAttribute('xrconfig', 'allowedDevices: any; cameraDirection: back; disableDefaultEnvironment: true; disableDesktopCameraControls: true');
      scene.setAttribute('xrweb', 'disableWorldTracking: true');
      scene.setAttribute('vr-mode-ui', 'enabled: false');
      scene.setAttribute('ar-mode-ui', 'enabled: false');
      scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
      scene.setAttribute('renderer', 'colorManagement: true; alpha: true');
      scene.appendChild(assets);
      const camera = document.createElement('a-camera');
      camera.setAttribute('position', '0 0 0');
      camera.setAttribute('look-controls', 'enabled: false');
      camera.setAttribute('wasd-controls', 'enabled: false');
      scene.appendChild(camera);
      names.forEach((name) => {
        const target = document.createElement('xrextras-named-image-target');
        target.setAttribute('name', name);
        target.setAttribute('visible', 'false');
        const plane = document.createElement('a-entity');
        plane.setAttribute('geometry', 'primitive: plane; width: 1; height: 1');
        plane.setAttribute('material', `shader: flat; src: #ar-video-${name}; side: double`);
        plane.setAttribute('spike-video-size', '');
        target.appendChild(plane);
        scene.appendChild(target);
      });
      wireScene(scene);
      mode = 'ar';
      $('intro').hidden = true;
      $('stop').hidden = false;
      document.body.classList.add('ar');
      startupTimer = setTimeout(() => {
        log('startup-timeout');
        fallback('Камера не запустилась за 90 секунд. Проверьте разрешение камеры и откройте ссылку в Safari/Chrome.');
      }, 90000);
      $('scene-host').appendChild(scene);
    } catch (error) {
      log('startup-error', describe(error));
      fallback(`AR не запустился: ${error.message}. Видео доступно ниже.`);
    }
  }
  $('start').addEventListener('click', start);
  $('play').addEventListener('click', () => active.forEach(playVideo));
  $('stop').addEventListener('click', () => fallback('Камера закрыта. Для нового замера перезагрузите страницу.'));
  $('copy-log').addEventListener('click', () => copy(JSON.stringify({task: 'SPIKE-AR1 / TREK-594 / EPIC-16', engine: engineName, url: location.href, userAgent: navigator.userAgent, cameraToFirstFoundMs: firstFoundMs, records}, null, 2), 'Лог скопирован. Пришлите его вместе с устройством и условиями теста.'));
  $('open-browser').addEventListener('click', () => copy(location.href, 'Ссылка скопирована. Вставьте её в Safari/Chrome.'));
  $('fallback-target').addEventListener('change', ({target}) => {
    const name = target.value;
    $('fallback-photo').src = `targets/${name}_cropped.jpg`;
    $('fallback-video').poster = `targets/${name}_cropped.jpg`;
    $('fallback-video').src = `media/${name}.mp4`;
    $('fallback-video').play().catch((error) => log('fallback-play-needs-tap', describe(error)));
  });
  document.addEventListener('visibilitychange', () => {
    log('visibility', {hidden: document.hidden});
    if (document.hidden) videos.forEach((video) => video.pause());
    else active.forEach(playVideo);
  });
  window.addEventListener('pagehide', stopCamera);
  window.addEventListener('error', (event) => log('window-error', {message: event.message, file: event.filename, line: event.lineno}));
  window.addEventListener('unhandledrejection', (event) => log('unhandledrejection', describe(event.reason)));
  log('page-open', {engine: engineName, userAgent: navigator.userAgent, secureContext: window.isSecureContext});
  const embedded = /Instagram|Telegram|FBAN|FBAV|FB_IAB|FBIOS|FB4A|\bVK\b|VKAndroidApp|VKApp|VKontakte|com\.vk\./i.test(navigator.userAgent);
  if (embedded) fallback('Вы открыли страницу во встроенном браузере. Для камеры скопируйте ссылку и откройте её в Safari/Chrome.');
  else if (!navigator.mediaDevices?.getUserMedia) fallback('В этом браузере нет доступа к камере. Откройте HTTPS-ссылку в Safari/Chrome.');
})();
