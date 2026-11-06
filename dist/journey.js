import * as T from 'three';
import { canvasMap, createChip, createLaptop, createLayer, createNativeBoundary, studio } from './hardware.js';
import { createPacket, createRain, levels } from './code-rain.js';

const track=document.querySelector('[data-motion-track]');
const frame=document.querySelector('[data-motion-art]');
const canvas=frame.querySelector('canvas');
const captions=[...track.querySelectorAll('[data-motion-caption]')];
const progressBar=track.querySelector('.motion-progress i');
const label=track.querySelector('[data-motion-label]');
const kind=track.querySelector('[data-motion-kind]');
const value=track.querySelector('[data-motion-value]');
function setStageText(caption) {
  label.textContent=caption.dataset.label;
  kind.textContent=caption.dataset.kind;
  value.textContent=caption.dataset.value;
}
const motionAllowed=matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 420px)');
const {clamp,lerp,smootherstep}=T.MathUtils;
const ease=(p,start,end)=>smootherstep(p,start,end);

// A short acceleration and braking distance, with no stops between languages.
function descent(p) {
  const x=clamp((p-.175)/.79,0,1),ramp=.095;
  if(x<ramp) return x*x/(2*ramp*(1-ramp));
  if(x>1-ramp) return 1-(1-x)*(1-x)/(2*ramp*(1-ramp));
  return (x-ramp/2)/(1-ramp);
}
function makeScene(renderer) {
  const scene=new T.Scene();
  studio(renderer,scene);
  const camera=new T.PerspectiveCamera(34,1,.1,65);
  const hemi=new T.HemisphereLight(0xc4d1e1,0x1a2232,1.1);
  scene.add(hemi);
  const key=new T.DirectionalLight(0xffead8,2.35);
  key.position.set(-3,7,4);scene.add(key);
  const rim=new T.DirectionalLight(0xabcfff,2.1);
  rim.position.set(6,4,-5);scene.add(rim);

  const laptop=createLaptop(),rain=createRain(),packet=createPacket(),chip=createChip();
  chip.group.position.y=levels.die-.28;
  const nativeCall=createNativeBoundary(levels.call);
  const layers=[
    createLayer('Rust  /  Kernel IR',levels.rust,0xf3b887),
    createLayer('LLVM  /  IR',levels.llvm,0xb2a9ff),
    createLayer('Hexagon  /  v75',levels.native,0x8bddfa),
    nativeCall.gate,
  ];
  scene.add(laptop.group,rain.mesh,packet,...layers,chip.group);
  const shadowMap=canvasMap(256,256,(ctx,w)=>{
    const gradient=ctx.createRadialGradient(w/2,w/2,4,w/2,w/2,w/2);
    gradient.addColorStop(0,'rgba(0,0,0,.70)');gradient.addColorStop(.45,'rgba(0,0,0,.42)');gradient.addColorStop(1,'transparent');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,w);
  });
  const shadow=new T.Mesh(new T.PlaneGeometry(7.2,4.8),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,toneMapped:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.34;scene.add(shadow);
  const target=new T.Vector3();
  let stageIndex=-1;
  function paint(p,seconds) {
    const release=ease(p,.095,.267),travel=descent(p);
    const head=lerp(1.74,levels.die-3.8,travel);
    const landing=ease(p,.795,.987);
    laptop.type(.26+.74*ease(p,0,.127));
    laptop.group.rotation.set(.015+.08*release,-.27+.16*ease(p,0,.12)-1.85*release,-.025+.20*release);
    laptop.group.position.set(-7.8*release,.29+3.1*release,-2.5*release);
    laptop.group.visible=release<1;
    shadow.material.opacity=1-release;shadow.visible=laptop.group.visible;

    const emerging=ease(p,.115,.211);
    rain.uniforms.head.value=head;
    rain.uniforms.progress.value=p;
    rain.uniforms.time.value=seconds;
    rain.uniforms.reveal.value=ease(p,.147,.236)*(1-ease(p,.90,.963));
    rain.mesh.visible=rain.uniforms.reveal.value>.001;
    packet.position.set(-.16*(1-emerging),head+.32,-1.4+2.02*emerging);
    packet.rotation.set(-.165*(1-emerging),-.25+.40*emerging+.07*Math.sin(travel*5),-.032*Math.sin(travel*8));
    const compression=ease(-head,-levels.die-4.35,-levels.die+.45);
    packet.scale.setScalar((.95+.08*emerging)*(1-.78*compression));
    const opacity=ease(p,.111,.174);
    packet.visible=opacity>.001 && packet.position.y>levels.die-1;
    packet.children.forEach(piece=>piece.material.opacity=opacity);
    nativeCall.plug.position.x=lerp(-3.8,-2.6,ease(-head,-levels.call-2.1,-levels.call));
    for(const layer of layers) {
      const near=Math.abs(layer.position.y-head-.4);
      const crossing=1-ease(near,0,2.0);
      layer.userData.glow.opacity=.022+.16*crossing;
      layer.userData.flare.opacity=.52*crossing;
    }
    chip.die.emissiveIntensity=.03+.56*landing;
    chip.impact.value=lerp(-1,4.8,ease(-head,-levels.die-.2,-levels.die+3.4));

    const sourceFocus=1.45+.16*emerging;
    const trackingY=lerp(sourceFocus,head+.72,ease(p,.166,.285));
    const floor=chip.group.position.y+.26;
    const distanceToFloor=trackingY-floor;
    // Smoothly level the camera as the glyphs disappear through the die surface.
    const focusY=floor+(distanceToFloor>2?distanceToFloor:Math.pow(Math.max(0,distanceToFloor+2),2)/8);
    target.set(0,focusY,-.18*(1-emerging));
    const pitch=.25+.10*ease(p,0,.10)+.075*emerging+.51*landing;
    const azimuth=.36-.27*release+.15*Math.sin(travel*5)+.51*landing;
    const width=lerp(7.72,9.25,landing);
    const span=Math.max(4.85+.38*emerging,width/camera.aspect);
    const distance=span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)));
    camera.position.set(target.x+distance*Math.sin(azimuth)*Math.cos(pitch),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(azimuth)*Math.cos(pitch));
    camera.lookAt(target);
    // Wide empty space above/below the visible shot contains other stages.
    // Cull them before submitting their components, especially on mobile GPUs.
    layers.forEach(layer=>layer.visible=Math.abs(layer.position.y-focusY)<6.7);
    chip.group.visible=focusY<levels.call+.8;
    const index=head<levels.die+.06?6:head<levels.call?5:head<levels.native?4:head<levels.llvm?3:head<levels.rust?2:p>.175?1:0;
    if(index!==stageIndex || !captions[index].classList.contains('is-current')) {
      stageIndex=index;
      captions.forEach((caption,i)=>{
        caption.classList.toggle('is-current',i===index);
        caption.setAttribute('aria-hidden',String(i!==index));
      });
      track.dataset.stage=String(index);setStageText(captions[index]);
    }
    progressBar.style.transform='scaleX('+p+')';
    renderer.render(scene,camera);
  }
  return {camera,paint};
}

let scene,renderer,scheduled=0,previousTime=0,shown=0,wanted=0;
let start=0,distance=1,active=false,failed=false,inView=false;
function scrollPosition(){return clamp((scrollY-start)/distance,0,1);}
function tick(time) {
  scheduled=0;
  if(!active) return;
  const dt=previousTime?Math.min(.1,(time-previousTime)/1000):1/60;
  previousTime=time;
  shown=lerp(shown,wanted,-Math.expm1(-13*dt));
  if(Math.abs(wanted-shown)<.00012) shown=wanted;
  scene.paint(shown,time/1000);
  if(shown!==wanted || (inView && !document.hidden && shown>.147 && shown<.963)) scheduled=requestAnimationFrame(tick);
  else previousTime=0;
}
function onScroll() {
  if(!active) return;
  wanted=scrollPosition();
  if(!scheduled && (wanted!==shown || inView)) scheduled=requestAnimationFrame(tick);
}
function seek(p) {
  if(!active) return;
  cancelAnimationFrame(scheduled);scheduled=0;previousTime=0;
  shown=wanted=clamp(p,0,1);scene.paint(shown,0);
}
function measure() {
  if(!active) return;
  start=track.getBoundingClientRect().top+scrollY;
  distance=Math.max(1,track.offsetHeight-track.querySelector('.motion-pin').offsetHeight);
  const width=frame.clientWidth,height=frame.clientHeight;
  if(!width||!height)return;
  const pixelRatio=Math.min(devicePixelRatio,1.75,Math.sqrt(1800000/(width*height)));
  renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height,false);
  scene.camera.aspect=width/height;scene.camera.updateProjectionMatrix();
  seek(scrollPosition());
  onScroll();
}
function fallback() {
  cancelAnimationFrame(scheduled);scheduled=0;active=false;previousTime=0;
  track.classList.remove('is-scrubbing');document.documentElement.dataset.motion='fallback';
  setStageText(captions[0]);
  captions.forEach((c,i)=>{c.classList.toggle('is-current',i===0);c.setAttribute('aria-hidden',String(i!==0));});
}
function configure() {
  if(!motionAllowed.matches||failed){fallback();return;}
  try {
    if(!renderer) {
      renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
      renderer.outputColorSpace=T.SRGBColorSpace;
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
      renderer.localClippingEnabled=true;
      scene=makeScene(renderer);
    }
    active=true;track.classList.add('is-scrubbing');
    document.documentElement.dataset.motion='ready';measure();
  } catch(error) {
    console.error('Compiler journey could not initialize.',error);
    failed=true;fallback();
  }
}
canvas.addEventListener('webglcontextlost',()=>{failed=true;fallback();});
new IntersectionObserver(([entry])=>{
  inView=entry.isIntersecting;onScroll();
}).observe(track.querySelector('.motion-pin'));
document.addEventListener('visibilitychange',onScroll);
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',measure);
motionAllowed.addEventListener('change',configure);
configure();
document.fonts.ready.then(measure);
window.impossibleMotion={seek,get progress(){return shown;},get active(){return active;}};
