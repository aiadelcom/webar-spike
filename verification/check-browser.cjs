const {chromium} = require('/usr/lib/node_modules/@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.woff':'font/woff','.ttf':'font/ttf'};
(async () => {
  const browser = await chromium.launch({headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--enable-unsafe-swiftshader','--no-sandbox']});
  const isMit = process.env.SPIKE_ENGINE === 'mit';
  const suffix = isMit ? '-mit' : '';
  const base = process.env.SPIKE_URL || `https://spike.test/${isMit ? 'mit/' : ''}`;
  const context = await browser.newContext({permissions:['camera'], viewport:{width:390,height:844}});
  const output = {base, browser:browser.version(), console:[], pageErrors:[], failedRequests:[], checks:{}};
  if (!process.env.SPIKE_URL) await context.route('https://spike.test/**', async (route) => {
    const file = path.resolve(root, '.'+new URL(route.request().url()).pathname.replace(/\/$/,'/index.html'));
    if (!file.startsWith(root+path.sep)) return route.fulfill({status:403});
    try {await route.fulfill({status:200, contentType:types[path.extname(file)] || 'application/octet-stream', body:await fs.readFile(file)});}
    catch (_) {await route.fulfill({status:404, body:'Missing: '+file});}
  });
  const page = await context.newPage();
  const requests = [];
  const byRequest = new Map();
  let capture = true;
  let scanningCount = null;
  let scanningAt = null;
  context.on('request', request => {
    if (!capture) return;
    const row = {url:request.url(),method:request.method(),resourceType:request.resourceType(),at:new Date().toISOString()};
    requests.push(row); byRequest.set(request,row);
  });
  context.on('response', response => {
    const row = byRequest.get(response.request());
    if (row) row.status = response.status();
  });
  context.on('requestfailed', request => {
    const row = byRequest.get(request);
    if (row) row.failure = request.failure()?.errorText;
  });
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[SPIKE-AR1] ') && text.includes('"event":"xrimagescanning"') && scanningCount === null) {
      scanningCount = requests.length; scanningAt = new Date().toISOString();
    }
  });
  page.on('console', (msg) => output.console.push({type:msg.type(),text:msg.text()}));
  page.on('pageerror', (error) => output.pageErrors.push(error.message));
  page.on('requestfailed', (request) => output.failedRequests.push({url:request.url(),error:request.failure()}));
  try {
    await page.goto(base);
    await page.click('#start');
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('scanning') || !document.querySelector('#fallback').hidden, null, {timeout:60000});
    output.checks.status = await page.locator('#status').textContent();
    output.checks.timing = await page.locator('#timing').textContent();
    output.checks.engine = await page.evaluate(() => ({XR8:!!window.XR8, aframe:window.AFRAME?.version, scene:!!document.querySelector('a-scene'), camera:document.querySelector('a-scene')?.hasLoaded}));
    await page.waitForFunction(() => {
      const text = document.querySelector('#status').textContent;
      return text.startsWith('scanning');
    }, null, {timeout:15000});
    // realityready can arrive just after xrimagescanning; require both milestones.
    const readyDeadline = Date.now() + 15000;
    while (!output.console.some(row => row.text.includes('"event":"realityready"')) && Date.now() < readyDeadline) await page.waitForTimeout(100);
    await page.waitForTimeout(3000);
    capture = false;
    output.checks.hasVideo = output.console.some(row => row.text.includes('"status":"hasVideo"'));
    output.checks.realityready = output.console.some(row => row.text.includes('"event":"realityready"'));
    const scanning = output.console.find(row => row.text.startsWith('[SPIKE-AR1] ') && row.text.includes('"event":"xrimagescanning"'));
    output.checks.scanningTargets = scanning ? JSON.parse(scanning.text.slice('[SPIKE-AR1] '.length)).targets : [];
    if (isMit) {
      const forbiddenHost = url => {const host=new URL(url).hostname;return ['8thwall.com','nianticspatial.com'].some(domain=>host===domain || host.endsWith('.'+domain));};
      const network = {base,engine:'@8thwall/engine@0.1.0',captureStarted:'before navigation',coverage:'isolated browser context including worker requests; no host blocking',scanningAt,
        requestsUntilScanning:requests.slice(0,scanningCount ?? requests.length),
        requestsAfterScanningUntilStop:requests.slice(scanningCount ?? requests.length),
        hosts:[...new Set(requests.filter(row=>/^https?:/.test(row.url)).map(row=>new URL(row.url).hostname))],
        nianticRequests:requests.filter(row=>forbiddenHost(row.url)),
        binaryRuntimeRequests:requests.filter(row=>row.url.includes('/external/xr/'))};
      output.checks.networkIndependent = network.nianticRequests.length === 0 && network.binaryRuntimeRequests.length === 0;
      await fs.writeFile(path.join(__dirname,process.env.SPIKE_URL ? 'network-mit.json' : 'network-local-mit.json'),JSON.stringify(network,null,2)+'\n');
    }
    output.checks.video = await page.evaluate(() => [...document.querySelectorAll('a-assets video')].map(v => ({id:v.id,duration:v.duration,width:v.videoWidth,height:v.videoHeight,readyState:v.readyState,error:v.error?.code,muted:v.muted,playsInline:v.playsInline,loop:v.loop})));
    await page.screenshot({path:path.join(__dirname,`camera${suffix}.png`)});
    await page.click('#stop');
    output.checks.stopFallback = await page.locator('#fallback').isVisible();
    await page.selectOption('#fallback-target','city');
    await page.waitForFunction(() => document.querySelector('#fallback-video').readyState >= 2);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {value:{writeText:() => Promise.reject(new Error('Clipboard denied for test'))}, configurable:true}));
    await page.click('#open-browser');
    output.checks.manualCopyLink = await page.locator('#copy-text').inputValue() === base;
    await page.click('#copy-log');
    const copiedLog = JSON.parse(await page.locator('#copy-text').inputValue());
    output.checks.copyLog = copiedLog.task.startsWith('SPIKE-AR1') && copiedLog.engine === (isMit ? 'mit' : 'binary') && copiedLog.cameraToFirstFoundMs === null;
    output.checks.fallbackVideo = await page.evaluate(() => ({duration:document.querySelector('#fallback-video').duration,playing:!document.querySelector('#fallback-video').paused}));
    await page.screenshot({path:path.join(__dirname,`fallback${suffix}.png`)});
    // New contexts exercise failures without requesting an AR session.
    for (const [label, ua, disable] of [
      ['instagram','Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Instagram 354.0',false],
      ['telegram','Mozilla/5.0 Telegram',false],
      ['facebook','Mozilla/5.0 [FBAN/FBIOS;FBAV/410]',false],
      ['vk','Mozilla/5.0 VKAndroidApp/8.0',false],
      ['noGetUserMedia',undefined,true]
    ]) {
      const c = await browser.newContext({userAgent:ua});
      if (!process.env.SPIKE_URL) await c.route('https://spike.test/**', async route => {
        const f = path.resolve(root,'.'+new URL(route.request().url()).pathname.replace(/\/$/,'/index.html'));
        try {await route.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:await fs.readFile(f)});} catch (_) {await route.fulfill({status:404});}
      });
      if (disable) await c.addInitScript(() => Object.defineProperty(navigator,'mediaDevices',{value:undefined}));
      const p = await c.newPage(); await p.goto(base);
      output.checks[label] = {fallback:await p.locator('#fallback').isVisible(),copyLink:await p.locator('#open-browser').isVisible(),engineLoaded:await p.evaluate(() => !!window.XR8)};
      await c.close();
    }
    const denied = await context.newPage();
    const denialConsole = [];
    const denialErrors = [];
    denied.on('console', msg => denialConsole.push({type:msg.type(),text:msg.text()}));
    denied.on('pageerror', error => denialErrors.push(error.message));
    await denied.addInitScript(() => {navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied (test)', 'NotAllowedError'));});
    await denied.goto(base); await denied.click('#start');
    await denied.waitForFunction(() => !document.querySelector('#fallback').hidden, null, {timeout:30000});
    output.checks.cameraDenied = {fallback:await denied.locator('#fallback').isVisible(),reason:await denied.locator('#fallback-reason').textContent(),console:denialConsole,pageErrors:denialErrors};
    await denied.close();
    const printUrl = await page.locator('#intro a').evaluate(link => link.href);
    const print = await context.newPage(); await print.goto(printUrl);
    output.checks.printImages = await print.locator('section img').evaluateAll(imgs=>imgs.map(i=>({width:i.naturalWidth,height:i.naturalHeight,complete:i.complete})));
    output.checks.printSections = await print.locator('section').count();
  } catch (error) { output.error = error.message; }
  finally {await browser.close();}
  await fs.writeFile(path.join(__dirname,process.env.SPIKE_URL ? `browser-published${suffix}.json` : `browser-local${suffix}.json`),JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify(output,null,2));
  if(output.error || output.pageErrors.length || !output.checks.status?.startsWith('scanning') || !output.checks.hasVideo || !output.checks.realityready || output.checks.scanningTargets?.slice().sort().join(',') !== 'city,portrait' || (isMit && !output.checks.networkIndependent) || ['instagram','telegram','facebook','vk','noGetUserMedia','cameraDenied'].some(key => !output.checks[key]?.fallback) || !output.checks.manualCopyLink || !output.checks.copyLog || output.checks.cameraDenied?.pageErrors.length) process.exitCode=1;
})();
