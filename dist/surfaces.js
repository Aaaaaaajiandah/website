const motionPreference=matchMedia('(prefers-reduced-motion: no-preference)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');

for(const surface of document.querySelectorAll('[data-sheen]')){
  let scheduled=0;
  let x=72,y=0;
  function paint(){
    scheduled=0;
    surface.style.setProperty('--sheen-x',x+'%');
    surface.style.setProperty('--sheen-y',y+'%');
  }
  surface.addEventListener('pointermove',event=>{
    if(!motionPreference.matches || !finePointer.matches) return;
    const bounds=surface.getBoundingClientRect();
    x=(event.clientX-bounds.left)/bounds.width*100;
    y=(event.clientY-bounds.top)/bounds.height*100;
    if(!scheduled) scheduled=requestAnimationFrame(paint);
  });
  surface.addEventListener('pointerleave',()=>{
    cancelAnimationFrame(scheduled);
    x=72;y=0;paint();
  });
}

if(motionPreference.matches && 'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if(motionPreference.matches){
        entry.target.animate([
          {opacity:0,transform:'translateY(22px)'},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:700,easing:'cubic-bezier(.16,1,.3,1)'});
      }
    }
  },{threshold:.12});
  document.querySelectorAll('.principles article,.today-links a,.vision-list article,.contact,.statement')
    .forEach(element=>observer.observe(element));
}
