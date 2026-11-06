import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require=createRequire(import.meta.url);
const puppeteer=require(require.resolve('puppeteer-core',{paths:['C:/Users/adiya/AppData/Roaming/npm/node_modules']}));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
page.on('pageerror',error=>console.log('PAGE ERROR:',error.message));
await page.setViewport({width:1440,height:900});
await page.goto('http://127.0.0.1:4173/index.html');
await page.waitForFunction(()=>window.impossibleMotion?.active,{timeout:15000});
mkdirSync('.hallmark/motion-qa',{recursive:true});
await page.$eval('[data-motion-track]',el=>scrollTo({top:scrollY+el.getBoundingClientRect().top+1,behavior:'instant'}));
await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
for(const p of [.078,.155,.221,.33,.413,.548,.689,.763,.855,.90,1]){
 await page.evaluate(p=>window.impossibleMotion.seek(p),p);
 await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 await page.screenshot({path:`.hallmark/motion-qa/frame-${p}.png`});
}
const poster=await page.evaluate(()=>{
  window.impossibleMotion.seek(.095);
  return document.querySelector('.motion-canvas').toDataURL('image/png').split(',')[1];
});
writeFileSync('dist/assets/computer-preview.png',Buffer.from(poster,'base64'));
console.log('3D scene and static laptop image rendered.');
await browser.close();
