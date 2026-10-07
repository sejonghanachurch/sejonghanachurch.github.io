import { bindHorizontalSwipe } from './horizontal-swipe.js?v=photo-swipe-20261008';

const INTERVAL=6000;
const FADE_DURATION=1600;
let active=null;

function createSlideshow(host){
  const slides=[...host.querySelectorAll('[data-hero-slide]')];
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const events=new AbortController();
  let index=0,timer=null,leavingTimer=null,pending=false,destroyed=false,revision=0,exhausted=false,dragging=false;
  const on=(target,type,listener)=>target.addEventListener(type,listener,{signal:events.signal});
  const stop=()=>{clearTimeout(timer);timer=null;};
  const canAdvance=()=>!destroyed&&!document.hidden&&!exhausted&&slides.length>1;
  const canRun=()=>canAdvance()&&!media.matches&&!dragging;

  function prepare(slide){
    const image=slide.matches('img')?slide:slide.querySelector('img');
    if(!image)return Promise.resolve(false);
    image.loading='eager';
    image.draggable=false;
    if(image.decode)return image.decode().then(()=>image.naturalWidth>0).catch(()=>false);
    if(image.complete)return Promise.resolve(image.naturalWidth>0);
    return new Promise(resolve=>{
      const finish=()=>{image.removeEventListener('load',finish);image.removeEventListener('error',finish);events.signal.removeEventListener('abort',cancel);resolve(image.naturalWidth>0);};
      const cancel=()=>{image.removeEventListener('load',finish);image.removeEventListener('error',finish);resolve(false);};
      image.addEventListener('load',finish,{once:true});
      image.addEventListener('error',finish,{once:true});
      events.signal.addEventListener('abort',cancel,{once:true});
    });
  }

  // Decode the local photos ahead of their first transition.
  const prepared=slides.map(prepare);

  function schedule(){
    stop();
    if(canRun()&&!pending)timer=setTimeout(()=>advance(),INTERVAL);
  }

  function showFirst(){
    revision++;pending=false;index=0;
    clearTimeout(leavingTimer);leavingTimer=null;
    slides.forEach((slide,i)=>{
      slide.classList.remove('is-leaving');
      slide.classList.toggle('is-active',i===0);
      slide.setAttribute('aria-hidden',String(i!==0));
    });
  }

  async function advance(direction=1,{manual=false}={}){
    stop();
    const allowed=()=>manual?canAdvance():canRun();
    if(!allowed()||pending)return;
    pending=true;
    const token=++revision;
    const step=direction<0?-1:1;
    for(let offset=1;offset<slides.length;offset++){
      const nextIndex=(index+step*offset+slides.length)%slides.length;
      const ready=await prepared[nextIndex];
      if(destroyed||revision!==token)return;
      if(!allowed()){pending=false;schedule();return;}
      if(!ready)continue;
      const previous=slides[index],next=slides[nextIndex];
      clearTimeout(leavingTimer);
      slides.forEach(slide=>slide.classList.remove('is-leaving'));
      previous.classList.replace('is-active','is-leaving');
      next.classList.add('is-active');
      index=nextIndex;pending=false;
      slides.forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==index)));
      leavingTimer=setTimeout(()=>{previous.classList.remove('is-leaving');leavingTimer=null;},FADE_DURATION);
      schedule();return;
    }
    // Failed photos never replace the currently visible photo.
    pending=false;exhausted=true;
  }

  on(host,'click',event=>{
    const button=event.target.closest?.('[data-hero-step]');
    if(button)advance(Number(button.dataset.heroStep),{manual:true});
  });

  const swipe=bindHorizontalSwipe(host,{
    canStart(event){
      return canAdvance()&&!event.target.closest?.('a,button,input,select,textarea,label,[contenteditable]:not([contenteditable="false"]),[role="button"]');
    },
    onStart(){
      stop();revision++;pending=false;dragging=true;
      host.classList.add('is-paused');
    },
    onSwipe(direction){advance(direction,{manual:true});},
    onEnd(){
      dragging=false;
      host.classList.toggle('is-paused',document.hidden);
      schedule();
    }
  });

  on(document,'visibilitychange',()=>{
    host.classList.toggle('is-paused',document.hidden||dragging);
    if(document.hidden){revision++;pending=false;stop();}
    else schedule();
  });
  on(media,'change',()=>{
    stop();
    if(media.matches)showFirst();
    schedule();
  });
  showFirst();
  host.classList.toggle('is-paused',document.hidden);
  schedule();

  return {
    host,
    destroy(){
      destroyed=true;revision++;stop();clearTimeout(leavingTimer);swipe.destroy();events.abort();
      host.classList.remove('is-paused');
    }
  };
}

export function syncHomeHero(root=document){
  const host=root.matches?.('.hero')?root:root.querySelector('.hero');
  const slideshowHost=host?.querySelector('[data-hero-slide]')?host:null;
  if(active?.host===slideshowHost)return;
  active?.destroy();
  active=slideshowHost?createSlideshow(slideshowHost):null;
}
