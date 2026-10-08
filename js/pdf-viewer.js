import { loadBulletinPdf } from './integrations.js?v=drive-download-20261007';

const params=new URLSearchParams(location.search);
const status=document.querySelector('#pdf-status'),pages=document.querySelector('#pdf-pages');
const title=(params.get('title')||'주보').slice(0,150);
document.title=`${title} | 세종하나교회`;
document.querySelector('#pdf-title').textContent=title;
const controls=Object.fromEntries(['zoom-out','zoom-in','fit'].map(key=>[key,document.querySelector(`#pdf-${key}`)]));
let libraryPromise,libraryAttempt=0,pdf=null,loadingTask=null,renderTask=null,request=0,zoom=1,opening=true,failed=false;

function library(){
  const source=new URL('../vendor/pdfjs/build/pdf.mjs',import.meta.url);
  // Browsers cache a failed module load; a manual retry needs a fresh module URL.
  if(libraryAttempt)source.searchParams.set('retry',String(libraryAttempt));
  if(!libraryPromise)libraryPromise=import(source.href).then(lib=>{
    lib.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/build/pdf.worker.mjs',import.meta.url).href;
    return lib;
  }).catch(error=>{libraryPromise=null;libraryAttempt++;throw error;});
  return libraryPromise;
}
function updateControls(){
  const unavailable=!pdf||opening||failed;
  controls['zoom-out'].disabled=unavailable||zoom<=.5;
  controls['zoom-in'].disabled=unavailable||zoom>=3;
  controls.fit.disabled=unavailable;
  document.querySelector('#pdf-page-number').textContent=pdf?`${pdf.numPages}페이지`:'주보';
  document.querySelector('#pdf-zoom').textContent=`${Math.round(zoom*100)}%`;
}
function releaseCanvas(canvas){canvas.width=0;canvas.height=0;}
function clearPages(){pages.querySelectorAll('canvas').forEach(releaseCanvas);pages.replaceChildren();}
function showError(){
  failed=true;opening=false;renderTask=null;pages.hidden=true;pages.setAttribute('aria-busy','false');
  clearPages();
  status.hidden=false;status.querySelector('h2').textContent='주보를 열지 못했습니다.';
  status.querySelector('p').textContent='연결 상태를 확인한 뒤 다시 열어 주세요.';
  status.querySelector('.button-row').hidden=false;updateControls();
}
async function renderPages({resetScroll=false}={}){
  const current=++request;
  renderTask?.cancel();
  pages.setAttribute('aria-busy','true');
  try{
    const first=await pdf.getPage(1);
    if(current!==request)return;
    pages.hidden=false;
    const base=first.getViewport({scale:1}),width=Math.max(1,Math.min(pages.clientWidth-32,1200));
    const scale=width/base.width*zoom,firstViewport=first.getViewport({scale});
    const oldWidth=pages.querySelector('canvas')?.getBoundingClientRect().width||firstViewport.width;
    const scroll={top:pages.scrollTop,left:pages.scrollLeft},container=document.createElement('div');
    container.className='pdf-document';
    // Reserve the full document height so zooming preserves the reading position.
    const sheets=Array.from({length:pdf.numPages},(_,index)=>{
      const sheet=document.createElement('div');sheet.className='pdf-sheet';sheet.dataset.pageNumber=String(index+1);
      sheet.style.width=`${firstViewport.width}px`;sheet.style.height=`${firstViewport.height}px`;
      container.append(sheet);return sheet;
    });
    for(let index=0;index<pdf.numPages;index++){
      const page=index===0?first:await pdf.getPage(index+1);
      if(current!==request)return;
      const viewport=page.getViewport({scale});
      // Paint pages sequentially and cap both per-page and total canvas memory.
      const budget=Math.min(6000000,24000000/pdf.numPages);
      const output=Math.min(window.devicePixelRatio||1,2,4096/Math.max(viewport.width,viewport.height),Math.sqrt(budget/(viewport.width*viewport.height)));
      const canvas=document.createElement('canvas');canvas.className='pdf-page';
      canvas.width=Math.max(1,Math.floor(viewport.width*output));canvas.height=Math.max(1,Math.floor(viewport.height*output));
      canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${title}, ${index+1} / ${pdf.numPages} 페이지`);
      canvas.dataset.pageNumber=String(index+1);
      const task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[output,0,0,output,0,0],background:'#ffffff'});
      renderTask=task;
      try{await task.promise;}catch(error){releaseCanvas(canvas);throw error;}
      if(current!==request){releaseCanvas(canvas);return;}
      sheets[index].style.width=`${viewport.width}px`;sheets[index].style.height=`${viewport.height}px`;
      sheets[index].append(canvas);
      if(index===0){
        const oldCanvases=[...pages.querySelectorAll('canvas')];
        pages.replaceChildren(container);oldCanvases.forEach(releaseCanvas);
        status.hidden=true;opening=false;updateControls();
        const ratio=firstViewport.width/oldWidth;
        pages.scrollTo({top:resetScroll?0:scroll.top*ratio,left:resetScroll?0:scroll.left*ratio,behavior:'instant'});
      }
    }
    renderTask=null;
    pages.setAttribute('aria-busy','false');updateControls();
  }catch(error){if(current===request&&error.name!=='RenderingCancelledException')showError();}
}
async function openPdf(){
  const current=++request;renderTask?.cancel();opening=true;failed=false;updateControls();
  pages.hidden=true;clearPages();status.hidden=false;
  status.querySelector('h2').textContent='주보를 불러오고 있습니다.';
  status.querySelector('p').textContent='잠시만 기다려 주세요.';status.querySelector('.button-row').hidden=true;
  try{
    if(loadingTask)await loadingTask.destroy();pdf=null;loadingTask=null;
    const [lib,blob]=await Promise.all([library(),loadBulletinPdf(params.get('id'),params.get('resourceKey')||'')]);
    if(current!==request)return;
    const data=new Uint8Array(await blob.arrayBuffer());
    if(current!==request)return;
    loadingTask=lib.getDocument({data,isEvalSupported:false,
      cMapUrl:new URL('../vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,
      standardFontDataUrl:new URL('../vendor/pdfjs/standard_fonts/',import.meta.url).href,
      wasmUrl:new URL('../vendor/pdfjs/wasm/',import.meta.url).href});
    const document=await loadingTask.promise;
    if(current!==request)return;
    pdf=document;zoom=1;
    await renderPages({resetScroll:true});
  }catch{if(current===request)showError();}
}
controls['zoom-out'].onclick=()=>{zoom=Math.max(.5,zoom-.5);renderPages();};
controls['zoom-in'].onclick=()=>{zoom=Math.min(3,zoom+.5);renderPages();};
controls.fit.onclick=()=>{zoom=1;renderPages({resetScroll:true});};
document.querySelector('#retry').addEventListener('click',openPdf);
let resizeTimer,lastWidth=window.innerWidth;
window.addEventListener('resize',()=>{
  if(window.innerWidth===lastWidth)return;
  lastWidth=window.innerWidth;clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{if(pdf&&!failed)renderPages({resetScroll:true});},150);
});
window.addEventListener('pagehide',event=>{if(!event.persisted){request++;clearTimeout(resizeTimer);renderTask?.cancel();clearPages();loadingTask?.destroy().catch(()=>{});}});
openPdf();
