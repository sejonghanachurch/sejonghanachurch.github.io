import { loadBulletinPdf } from './integrations.js';

const params=new URLSearchParams(location.search);
const status=document.querySelector('#pdf-status');
const frame=document.querySelector('#pdf-frame');
let documentUrl='';
document.title=`${(params.get('title')||'주보').slice(0,150)} | 세종하나교회`;

async function openPdf(){
  status.hidden=false;
  status.querySelector('h1').textContent='주보를 불러오고 있습니다.';
  status.querySelector('p').textContent='잠시만 기다려 주세요.';
  status.querySelector('.button-row').hidden=true;
  try{
    const blob=await loadBulletinPdf(params.get('id'),params.get('resourceKey')||'');
    if(documentUrl)URL.revokeObjectURL(documentUrl);
    documentUrl=URL.createObjectURL(blob);
    frame.src=documentUrl+'#view=FitH';
    frame.hidden=false;
    status.hidden=true;
  }catch{
    status.querySelector('h1').textContent='주보를 열지 못했습니다.';
    status.querySelector('p').textContent='잠시 후 다시 열어 주세요.';
    status.querySelector('.button-row').hidden=false;
  }
}
document.querySelector('#retry').addEventListener('click',openPdf);
window.addEventListener('pagehide',event=>{if(!event.persisted&&documentUrl)URL.revokeObjectURL(documentUrl);});
openPdf();
