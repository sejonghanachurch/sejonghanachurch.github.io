import { bindHorizontalSwipe } from './horizontal-swipe.js?v=photo-swipe-20261008';

const INTERVAL=4000;
const FADE_DURATION=1600;
let active=null;

function createSlideshow(host){
  const slides=[...host.querySelectorAll('[data-hero-slide]')];
  const events=new AbortController();
  const ready=slides.map(()=>false);
  let index=0,leavingTimer=null,destroyed=false;
  const on=(target,type,listener)=>target.addEventListener(type,listener,{signal:events.signal});
  const canAdvance=()=>!destroyed&&slides.length>1;

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
  slides.forEach((slide,i)=>prepare(slide).then(loaded=>{if(!destroyed)ready[i]=loaded;}));

  function showFirst(){
    index=0;
    clearTimeout(leavingTimer);leavingTimer=null;
    slides.forEach((slide,i)=>{
      slide.classList.remove('is-leaving');
      slide.classList.toggle('is-active',i===0);
      slide.setAttribute('aria-hidden',String(i!==0));
    });
  }

  function advance(direction=1){
    if(!canAdvance())return;
    const step=direction<0?-1:1;
    for(let offset=1;offset<slides.length;offset++){
      const nextIndex=(index+step*offset+slides.length)%slides.length;
      if(!ready[nextIndex])continue;
      const previous=slides[index],next=slides[nextIndex];
      clearTimeout(leavingTimer);
      slides.forEach(slide=>slide.classList.remove('is-leaving'));
      previous.classList.replace('is-active','is-leaving');
      next.classList.add('is-active');
      index=nextIndex;
      slides.forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==index)));
      leavingTimer=setTimeout(()=>{previous.classList.remove('is-leaving');leavingTimer=null;},FADE_DURATION);
      return;
    }
    // Failed photos never replace the currently visible photo.
  }

  on(host,'click',event=>{
    const button=event.target.closest?.('[data-hero-step]');
    if(button)advance(Number(button.dataset.heroStep));
  });

  const swipe=bindHorizontalSwipe(host,{
    canStart(event){
      return canAdvance()&&!event.target.closest?.('a,button,input,select,textarea,label,[contenteditable]:not([contenteditable="false"]),[role="button"]');
    },
    onSwipe:advance
  });

  showFirst();
  // Touch, dragging and manual navigation never reset the automatic cadence.
  const timer=setInterval(()=>advance(),INTERVAL);

  return {
    host,
    destroy(){
      destroyed=true;clearInterval(timer);clearTimeout(leavingTimer);swipe.destroy();events.abort();
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
