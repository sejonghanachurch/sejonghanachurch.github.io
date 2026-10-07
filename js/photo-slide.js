const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const duration=420;

export function capturePhotoSlide(stage){
 if(!stage||reducedMotion.matches)return null;
 const current=stage.querySelector('.album-photo-image:not(.photo-slide-outgoing)');
 const visible=current?.complete&&current.naturalWidth?current:stage.querySelector('.photo-slide-outgoing');
 if(!visible?.complete||!visible.naturalWidth)return null;
 const image=visible.cloneNode();
 image.removeAttribute('style');image.className='album-photo-image photo-slide-outgoing';
 image.alt='';image.setAttribute('aria-hidden','true');image.loading='eager';
 return {image,height:stage.getBoundingClientRect().height};
}

export function startPhotoSlide(stage,snapshot,step){
 const incoming=stage?.querySelector('.album-photo-image');
 if(!snapshot||!incoming||reducedMotion.matches||!incoming.animate)return null;
 const outgoing=snapshot.image,animations=[];
 let active=true;
 stage.style.height=`${snapshot.height}px`;
 incoming.style.visibility='hidden';
 stage.append(outgoing);

 function destroy(){
  if(!active)return;
  active=false;
  animations.forEach(animation=>animation.cancel());
  outgoing.remove();stage.classList.remove('is-photo-sliding');stage.style.removeProperty('height');
  incoming.style.removeProperty('visibility');
  reducedMotion.removeEventListener('change',onMotionChange);
 }
 function onMotionChange(){if(reducedMotion.matches)destroy();}
 reducedMotion.addEventListener('change',onMotionChange);

 // Keep the previous picture visible until the new preview has decoded.
 incoming.decode().then(()=>{
  if(!active||!stage.isConnected){destroy();return;}
  const height=Math.max(100,incoming.getBoundingClientRect().height),direction=step>0?1:-1;
  const timing={duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'};
  stage.classList.add('is-photo-sliding');incoming.style.removeProperty('visibility');
  animations.push(
   incoming.animate([{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],timing),
   outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],timing),
   stage.animate([{height:`${snapshot.height}px`},{height:`${height}px`}],timing)
  );
  Promise.all(animations.map(animation=>animation.finished)).then(destroy,()=>{});
 },destroy);
 return {destroy};
}
