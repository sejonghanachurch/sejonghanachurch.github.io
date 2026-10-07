const INTENT_DISTANCE=9;
const SWIPE_DISTANCE=42;
const INTERACTIVE='button,input,textarea,select,[contenteditable="true"],[role="button"]';
let clearSuppressedClick=null;

function suppressDragClick(){
  clearSuppressedClick?.();
  let timer;
  const clear=()=>{
    clearTimeout(timer);
    document.removeEventListener('click',block,true);
    document.removeEventListener('pointerdown',clear,true);
    if(clearSuppressedClick===clear)clearSuppressedClick=null;
  };
  const block=event=>{
    if(event.detail===0)return; // Keyboard activation remains available.
    event.preventDefault();event.stopImmediatePropagation();clear();
  };
  // A slide can replace its link before the browser generates the release click.
  document.addEventListener('click',block,true);
  document.addEventListener('pointerdown',clear,true);
  timer=setTimeout(clear,500);
  clearSuppressedClick=clear;
}

export function bindHorizontalSwipe(host,{onSwipe,canStart=()=>true,onStart=()=>{},onEnd=()=>{}}){
  const events=new AbortController();
  let pointer=null,destroyed=false;
  const on=(target,type,listener,options={})=>target.addEventListener(type,listener,{...options,signal:events.signal});
  host.classList.add('has-swipe');

  function finish(event,cancelled=false){
    if(!pointer)return;
    const current=pointer;pointer=null;
    const dx=(event?.clientX??current.x)-current.startX;
    const dy=(event?.clientY??current.y)-current.startY;
    const horizontal=current.axis==='horizontal'||(!current.axis&&Math.abs(dx)>INTENT_DISTANCE&&Math.abs(dx)>Math.abs(dy)*1.25);
    const swiped=!cancelled&&horizontal&&Math.abs(dx)>=SWIPE_DISTANCE&&Math.abs(dx)>Math.abs(dy)*1.25;
    host.classList.remove('is-swiping');
    if(host.hasPointerCapture?.(current.id))host.releasePointerCapture(current.id);
    if(horizontal||Math.max(Math.abs(dx),Math.abs(dy))>=INTENT_DISTANCE)suppressDragClick();
    try{if(swiped&&!destroyed)onSwipe(dx<0?1:-1);}finally{onEnd();}
  }

  on(host,'pointerdown',event=>{
    if(destroyed||pointer||!event.isPrimary||event.pointerType==='mouse'&&event.button!==0)return;
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest(INTERACTIVE)||!canStart(event))return;
    pointer={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,axis:null};
    onStart();
  });
  on(document,'pointerdown',event=>{if(pointer&&event.pointerId!==pointer.id)finish(null,true);});
  on(document,'pointermove',event=>{
    if(!pointer||event.pointerId!==pointer.id)return;
    pointer.x=event.clientX;pointer.y=event.clientY;
    const dx=pointer.x-pointer.startX,dy=pointer.y-pointer.startY;
    if(!pointer.axis){
      if(Math.max(Math.abs(dx),Math.abs(dy))<INTENT_DISTANCE)return;
      if(Math.abs(dy)>Math.abs(dx)*1.1){pointer.axis='vertical';return;}
      if(Math.abs(dx)<=Math.abs(dy)*1.25)return;
      pointer.axis='horizontal';host.classList.add('is-swiping');
      host.setPointerCapture?.(pointer.id);
    }
    if(pointer.axis==='horizontal'&&event.cancelable)event.preventDefault();
  },{passive:false});
  on(document,'pointerup',event=>{if(event.pointerId===pointer?.id)finish(event);});
  on(document,'pointercancel',event=>{if(event.pointerId===pointer?.id)finish(event,true);});
  // Touch capture can move from the image/link to its swipe surface.
  on(host,'lostpointercapture',event=>{if(event.target===host&&event.pointerId===pointer?.id)finish(event,true);});
  on(host,'dragstart',event=>{if(pointer)event.preventDefault();});
  on(window,'blur',()=>finish(null,true));
  on(document,'visibilitychange',()=>{if(document.hidden)finish(null,true);});

  return {
    destroy(){
      destroyed=true;finish(null,true);events.abort();
      host.classList.remove('has-swipe','is-swiping');
    }
  };
}
