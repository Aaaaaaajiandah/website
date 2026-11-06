import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const puppeteer = require(require.resolve('puppeteer-core', { paths: ['C:/Users/adiya/AppData/Roaming/npm/node_modules'] }));
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const page = await browser.newPage();
const local = name => new URL(name,'http://127.0.0.1:4173/').href;
function assert(value, message) { if (!value) throw new Error(message); }
try {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(local('index.html'));
  await page.evaluate(() => document.fonts.ready);
  assert(await page.$eval('.landscape', img => img.complete && img.naturalWidth > 0), 'Landscape failed to load');
  await page.waitForFunction(()=>window.impossibleMotion);
  const positions=[[.065,0,'C++'],[.25,1,'C++'],[.40,2,'Rust'],[.51,3,'LLVM IR'],[.62,4,'Hexagon'],[.75,5,'C'],[.96,6,'NPU'],[.75,5,'C'],[.51,3,'LLVM IR'],[.40,2,'Rust'],[.11,0,'C++']];
  for(const [position,stage,language] of positions){
    await page.$eval('[data-motion-track]',(track,p)=>scrollTo({top:scrollY+track.getBoundingClientRect().top+p*(track.offsetHeight-innerHeight),behavior:'instant'}),position);
    await page.waitForFunction(p=>Math.abs(window.impossibleMotion.progress-p)<.015,{},position);
    assert(await page.$eval('[data-motion-track]',(track,stage)=>Number(track.dataset.stage)===stage,stage),'Wrong compiler stage while scrolling');
    assert(await page.$eval('[data-motion-value]',el=>el.textContent)===language,'Right-hand label is out of sync');
  }
  await page.emulateMediaFeatures([{ name:'prefers-reduced-motion',value:'reduce' }]);
  await page.waitForFunction(()=>!document.querySelector('[data-motion-track]').classList.contains('is-scrubbing'));
  assert(await page.$eval('.motion-static',el=>el.getBoundingClientRect().height>0),'Reduced-motion explanation unavailable');
  await page.emulateMediaFeatures([]);
  await page.setViewport({ width: 375, height: 812 });
  for (const name of ['index.html', 'progress.html', 'languages.html']) {
    await page.goto(local(name));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow on ${name}`);
    assert(await page.$$eval('a[href]', links => links.every(link => !link.getAttribute('href').includes('.md'))), `Markdown link on ${name}`);
    if(name==='index.html'){
      await page.waitForFunction(()=>window.impossibleMotion?.active);
      await page.$eval('[data-motion-track]',el=>scrollTo({top:scrollY+el.getBoundingClientRect().top+.74*(el.offsetHeight-innerHeight),behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('[data-motion-track]').dataset.stage==='5');
      const bounds=await page.evaluate(()=>{
        const rect=document.querySelector('.motion-caption.is-current').getBoundingClientRect();
        return {top:rect.top,bottom:rect.bottom,height:innerHeight};
      });
      assert(bounds.top>=0 && bounds.bottom<=bounds.height,'Mobile scene caption is outside the viewport');
      await page.$eval('.motion-canvas',canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
      await page.waitForFunction(()=>!window.impossibleMotion.active);
      assert(await page.$eval('.motion-static',el=>el.getBoundingClientRect().height>0),'WebGL fallback missing');
    }
  }
  await page.goto(local('progress.html'));
  await page.click('[data-filter="complete"]');
  assert(await page.$$eval('.phase:not([hidden])', rows => rows.length === 4), 'Complete filter failed');
  await page.click('[data-filter="active"]');
  assert(await page.$$eval('.phase:not([hidden])', rows => rows.length === 1), 'Active filter failed');
  await page.reload();
  assert(await page.$$eval('.phase:not([hidden])', rows => rows.length === 1), 'Filter URL state failed');
  await page.setJavaScriptEnabled(false);
  await page.goto(local('index.html'));
  assert(await page.$eval('.motion-static',el=>el.getBoundingClientRect().height>0),'No-script explanation missing');
  assert(await page.$eval('.motion-image-fallback img',img=>img.complete&&img.naturalWidth>0),'No-script laptop image missing');
  console.log('PASS: seven stages and their labels, reverse scrolling, mobile C handoff, reduced motion, WebGL fallback, no-script, mobile layouts, links and filters.');
} finally { await browser.close(); }
