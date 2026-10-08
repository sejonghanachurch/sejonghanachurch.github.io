import { bindHorizontalSwipe } from './horizontal-swipe.js?v=photo-swipe-20261008';

const INTERVAL=4500;
let active=null;

function photosFrom(albums,safeUrl){
  const seen=new Set(),photos=[];
  for(const album of albums){
    const images=album.images?.length?album.images:album.image?[{url:album.image,title:album.title}]:[];
    for(const photo of images){
      const src=safeUrl(photo.url),key=`${album.id}:${photo.id||src}`;
      if(!src||seen.has(key))continue;
      seen.add(key);photos.push({key,src,title:album.title||'함께한 순간들',alt:photo.title||album.title||'교회행사 사진'});
    }
  }
  return photos;
}

function createCarousel(host){
  host.innerHTML=`<div class="moments-stage"><p class="moments-empty" role="status"></p></div>`;
  const stage=host.querySelector('.moments-stage');
  const events=new AbortController();
  let photos=[],index=0,signature='',timer=null,visible=false,hovered=false,focused=false,dragging=false,destroyed=false,animation=null;
  const on=(target,type,listener,options={})=>target.addEventListener(type,listener,{...options,signal:events.signal});
  const stop=()=>{clearTimeout(timer);timer=null;};
  function schedule(){
    stop();
    if(!destroyed&&photos.length>1&&visible&&!document.hidden&&!hovered&&!focused&&!dragging&&!animation){timer=setTimeout(()=>move(1),INTERVAL);}
  }
  function markSlide(){
    host.dataset.slideKey=photos[index]?.key||'';
  }
  function slide(photo){
    const link=document.createElement('a');
    link.className='moments-slide';link.href='#/news/albums';link.setAttribute('aria-label',`${photo.title} 앨범 보기`);
    const img=document.createElement('img');img.src=photo.src;img.alt=photo.alt;img.decoding='async';img.draggable=false;
    const caption=document.createElement('span');caption.className='moments-caption';caption.textContent=photo.title;
    link.append(img,caption);return link;
  }
  function show(){
    stage.replaceChildren(slide(photos[index]));markSlide();
  }
  function cancelAnimation(){
    if(!animation)return;
    const pending=animation;animation=null;
    pending.forEach(item=>item.cancel());
  }
  async function move(direction){
    if(photos.length<2||animation||destroyed)return;
    stop();
    const nextIndex=(index+direction+photos.length)%photos.length;
    const previous=stage.querySelector('.moments-slide'),next=slide(photos[nextIndex]);
    // Only the incoming photo is decoded, and other page regions are untouched.
    next.style.visibility='hidden';stage.append(next);
    const loading=[];animation=loading;
    if(next.firstElementChild.decode)await next.firstElementChild.decode().catch(()=>{});
    if(destroyed||animation!==loading||!next.isConnected)return;
    next.style.visibility='';
    index=nextIndex;markSlide();
    previous.setAttribute('aria-hidden','true');previous.inert=true;
    const options={duration:800,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'};
    const running=[previous.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],options),next.animate([{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],options)];
    animation=running;
    await Promise.all(running.map(item=>item.finished.catch(()=>{})));
    if(destroyed||animation!==running)return;
    previous.remove();running.forEach(item=>item.cancel());animation=null;schedule();
  }
  on(host,'pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule();}});
  on(host,'pointerleave',event=>{if(event.pointerType!=='touch'){hovered=false;schedule();}});
  on(host,'focusin',()=>{focused=true;schedule();});
  on(host,'focusout',event=>{focused=host.contains(event.relatedTarget);schedule();});
  const swipe=bindHorizontalSwipe(stage,{
    canStart:()=>photos.length>1&&!animation,
    onStart(){dragging=true;stop();},
    onSwipe(direction){move(direction);},
    onEnd(){dragging=false;schedule();}
  });
  on(document,'visibilitychange',schedule);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:0.25});
  observer.observe(host);
  return {
    host,
    update(next,{loading,error}){
      const nextSignature=JSON.stringify(next);
      if(nextSignature===signature&&next.length)return;
      const selected=photos[index]?.key,previousIndex=index;
      signature=nextSignature;cancelAnimation();photos=next;
      index=Math.max(0,next.findIndex(photo=>photo.key===selected));
      if(selected&&!next.some(photo=>photo.key===selected))index=Math.min(previousIndex,Math.max(0,next.length-1));
      if(photos.length){show();}
      else{
        const message=document.createElement('p');message.className='moments-empty';message.setAttribute('role','status');
        message.textContent=loading?'함께한 순간들을 불러오는 중입니다.':error?'사진을 불러오지 못했습니다. 잠시 후 다시 방문해 주세요.':'새로운 추억을 기다립니다.';
        stage.replaceChildren(message);host.dataset.slideKey='';
      }
      schedule();
    },
    destroy(){destroyed=true;stop();cancelAnimation();swipe.destroy();observer.disconnect();events.abort();}
  };
}

export function syncHomeMoments(root,albums,status,safeUrl){
  const host=root.querySelector('[data-home-moments]');
  if(active?.host!==host){active?.destroy();active=host?createCarousel(host):null;}
  active?.update(photosFrom(albums,safeUrl),status);
}
