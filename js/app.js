import { SAMPLE } from './data.js?v=education-label-20261007';
import { COMMUNITY } from './community-data.js?v=education-contacts-20261008';
const groupPath=(root,id)=>root==='education'&&id==='adults'?'cells':`${root}/${id}`;
const nav = [
 ['교회소개',[['담임목사 인사','about/greeting'],['교회 비전','about/vision'],['연혁','about/history'],['섬기는 사람들','about/people'],['교회 조직','about/organization'],['온라인헌금','about/offering'],['오시는길','directions']]],
 ['예배',[['예배안내','worship'],['주일예배영상','sermons'],['쥬빌리기도회','jubilee'],['내 삶을 바꾸는 1분','one-minute']]],
 ['셀모임',[]],
 ['교육공동체',COMMUNITY.education.map(({id,title})=>[title,groupPath('education',id)])],
 ['선교',[['토요캠프','mission/saturday-camp'],['토요전도','mission/saturday-outreach'],['해외선교','mission/overseas']]],
 ['교회소식',[['공지사항','news/notices'],['주보안내','news/bulletins'],['교회행사 앨범','news/albums']]]
];
const missionNav=nav.find(([name])=>name==='선교'),newsNav=nav.find(([name])=>name==='교회소식');
const overviewPaths={'셀모임':'cells','교육공동체':'education'};
document.querySelector('#desktop-nav').innerHTML=nav.map(([name,items],i)=>`<div class="nav-group">${!items.length?`<a class="nav-label" href="#/${overviewPaths[name]}">${name}</a>`:`${overviewPaths[name]?`<a class="nav-label" href="#/${overviewPaths[name]}" aria-expanded="false" aria-controls="dropdown-${i}">${name}</a>`:`<button class="nav-label" aria-expanded="false" aria-controls="dropdown-${i}">${name}</button>`}<div class="dropdown" id="dropdown-${i}">${items.map(([label,path])=>`<a href="#/${path}">${label}</a>`).join('')}</div>`}</div>`).join('');
document.querySelector('#mobile-nav').innerHTML=nav.map(([name,items])=>!items.length?`<a class="mobile-direct-link" href="#/${overviewPaths[name]}">${name}</a>`:`<details><summary>${overviewPaths[name]?`<a class="mobile-nav-label" href="#/${overviewPaths[name]}">${name}</a>`:name}</summary>${items.map(([label,path])=>`<a href="#/${path}">${label}</a>`).join('')}</details>`).join('');
document.querySelector('.menu-toggle').onclick=()=>{const btn=document.querySelector('.menu-toggle');const opened=btn.getAttribute('aria-expanded')!=='true';btn.setAttribute('aria-expanded',opened);btn.setAttribute('aria-label',opened?'전체 메뉴 닫기':'전체 메뉴 열기');document.querySelector('#mobile-nav').hidden=!opened;document.body.classList.toggle('menu-open',opened);};
// Hover, click and keyboard focus share one open dropdown.
const desktopGroups=[...document.querySelectorAll('.nav-group')].filter(group=>group.querySelector('.dropdown'));
let desktopOpen=null,desktopPinned=null,suppressNavFocus=false;
function setDesktopMenu(group){
 desktopOpen=group;
 for(const item of desktopGroups){
  const opened=item===group;
  item.classList.toggle('open',opened);
  item.querySelector('.nav-label').setAttribute('aria-expanded',String(opened));
 }
}
function closeDesktopMenus(){desktopPinned=null;setDesktopMenu(null);}
for(const group of desktopGroups){
 const button=group.querySelector('.nav-label');
 group.addEventListener('pointerenter',event=>{
  if(event.pointerType==='touch')return;
  if(desktopOpen!==group)desktopPinned=null;
  setDesktopMenu(group);
 });
 group.addEventListener('pointerleave',event=>{
  if(event.pointerType!=='touch'&&desktopOpen===group)closeDesktopMenus();
 });
 group.addEventListener('focusin',()=>{
  if(suppressNavFocus)return;
  if(desktopOpen!==group)desktopPinned=null;
  setDesktopMenu(group);
 });
 group.addEventListener('focusout',event=>{
  if(!group.contains(event.relatedTarget)&&desktopOpen===group)closeDesktopMenus();
 });
 button.addEventListener('click',()=>{
  if(button.matches('a')){closeDesktopMenus();return;}
  if(desktopPinned===group&&desktopOpen===group)closeDesktopMenus();
  else{desktopPinned=group;setDesktopMenu(group);}
 });
 button.addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp'].includes(event.key))return;
  event.preventDefault();setDesktopMenu(group);
  const links=group.querySelectorAll('.dropdown a');
  (event.key==='ArrowDown'?links[0]:links[links.length-1])?.focus();
 });
}
matchMedia('(max-width:1000px)').addEventListener('change',closeDesktopMenus);
document.querySelector('#back-top').onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
document.querySelector('#year').textContent=new Date().getFullYear();
import { CONFIG } from './config.js';
import { resource, settleResource, mountResources, patchResources } from './resource-view.js';
import { syncHomeMoments } from './home-moments.js?v=photo-swipe-20261008';
import { syncHomeHero } from './home-hero.js?v=hero-arrows-20261008-2';
import { bindHorizontalSwipe } from './horizontal-swipe.js?v=viewer-scroll-lock-20261008';
import { capturePhotoSlide, startPhotoSlide } from './photo-slide.js?v=photo-preview-slide-20261008';
const currentPath=()=>{const path=location.hash.replace(/^#\/?/,'').replace(/\/$/,'');return path==='mission'?'mission/overseas':path;};
function driveKeys(path){
 if(!path)return ['notices','albums'];
 if(path.startsWith('news/notices'))return ['notices'];
 if(path==='news/bulletins')return ['bulletins'];
 if(path==='news/albums')return ['albums'];
 return [];
}
function pageResource(path){return path.startsWith('news/notices/')||path==='mission/saturday-outreach'?null:path==='sermons'?'videos':driveKeys(path)[0];}
import { loadDrive, loadVideos, loadVisionVideos, preloadNotice, safeUrl } from './integrations.js?v=news-only-drive-20261007';
const main=document.querySelector('#main');
const homeIntro=main.innerHTML;
const homeNewcomer=document.querySelector('#home-newcomer-template').innerHTML;
let state={...SAMPLE,...COMMUNITY,driveStatus:'unconfigured',noticesStatus:'loading',videoStatus:'unconfigured',jubileeStatus:'loading',jubileeVideos:[],missionStatus:'loading',missionVideos:[],youngAdultStatus:'loading',youngAdultVideos:[],visionStatus:'loading',visionVideos:[],visionLoaded:false,oneMinuteStatus:'loading',oneMinuteVideos:[],oneMinuteLoaded:false,infantPlaylists:CONFIG.infantPlaylists.map(playlist=>({...playlist,status:'loading',videos:[]}))};
const driveErrors=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=value=>esc(safeUrl(value));
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.replaceAll('-','.'):esc(value);
const youtube='https://www.youtube.com/channel/'+CONFIG.youtubeChannelId;
const jubileePlaylist='https://www.youtube.com/playlist?list='+encodeURIComponent(CONFIG.jubileePlaylistId);
const missionPlaylist='https://www.youtube.com/playlist?list='+encodeURIComponent(CONFIG.missionPlaylistId);
const empty=(title,description)=>`<div class="blank-state"><h3>${esc(title)}</h3><p>${esc(description)}</p></div>`;
const imageTag=(src,alt,cls='')=>`<img src="${url(src)}" alt="${esc(alt)}" ${cls?`class="${cls}"`:''} loading="lazy" data-fallback="true">`;
const videoThumb=v=>({'G4mc3skIenA':'./assets/sermon-latest.jpg','PZNTJbrassM':'./assets/sermon-2.jpg','7h2bONSKLOo':'./assets/sermon-3.jpg'}[v.id]||`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`);
const videoCover=v=>`<button class="video-cover" data-video="${esc(v.id)}" aria-label="${esc(v.title)} 영상 재생">${imageTag(videoThumb(v),v.title)}<span class="play" aria-hidden="true">▷</span><span class="video-label">${v.type==='one-minute'?'내 삶을 바꾸는 1분':v.type==='vision'?'교회 비전':v.type==='young-adult'?'청년부':v.type==='infant'?'유아부':v.type==='mission'?'MISSION':v.type==='jubilee'?'JUBILEE PRAYER':'SUNDAY WORSHIP'}</span></button>`;
const videoCards=videos=>videos.length?`<div class="cards">${videos.map(v=>`<article class="content-card">${videoCover(v)}<div class="card-body"><small class="green">${date(v.date)}</small><h3>${esc(v.title)}</h3>${v.speaker?`<p>${esc(v.speaker)}</p>`:''}<button class="text-link plain-button" data-video="${esc(v.id)}">${['infant','young-adult','vision','one-minute'].includes(v.type)?'영상 보기':v.type==='mission'?'선교 영상 보기':v.type==='jubilee'?'기도회 영상 보기':'말씀 듣기'} <span>+</span></button></div></article>`).join('')}</div>`:empty('등록된 영상이 없습니다.','교회 YouTube 채널에서 더 많은 영상을 만나보세요.');
function title(value){document.title=value?`세종하나교회 ${value}`:'세종하나교회';}
function subnav(group,path){return `<nav class="subnav" aria-label="${esc(group[0])} 하위 메뉴">${group[1].map(([name,p])=>`<a class="${(path===p||path.startsWith(p+'/'))?'active':''}" ${(path===p||path.startsWith(p+'/'))?'aria-current="page"':''} href="#/${p}">${name}</a>`).join('')}</nav>`;}
function page(heading,intro,body,group,afterBody=''){const path=currentPath(),key=pageResource(path);title(heading);if(key)body=resource(key,body,path.includes('/')&&(path.startsWith('cells/')||path.startsWith('education/'))?'detail':['cells','education','sermons','news/albums'].includes(path)?'cards':'rows',path==='cells');return `<section class="page-hero reveal"><div class="breadcrumbs"><a href="#/">홈</a> &nbsp; / &nbsp; ${esc(group?.[0]||heading)}</div><h1>${esc(heading)}</h1><p>${esc(intro)}</p></section><section class="page-content reveal${group?' page-layout':''}">${group?subnav(group,path):''}<div class="page-body">${body}${afterBody}</div></section>`;}
function bulletinRows(limit=100){
  if(state.bulletins.length)return state.bulletins.slice(0,limit).map(b=>`<a class="news-item" href="${url(b.url)}"${b.url.startsWith('./pdf.html?')?'':' target="_blank" rel="noopener noreferrer"'}><span class="tag">주보</span><strong>${esc(b.title)}</strong><small>${date(b.date)}</small><span class="plus">+</span></a>`).join('');
  if(state.driveStatus==='connected')return empty('등록된 주보가 없습니다.','새 주보가 등록되면 이곳에서 보실 수 있습니다.');
  return `<button class="news-item plain-button full-width" data-bulletin-sample><span class="tag">안내</span><strong>주보는 이렇게 만나보세요</strong><span class="sample-tag">샘플</span><span class="plus">+</span></button><a class="news-item" href="#/worship"><span class="tag">예배</span><strong>세종하나교회 예배 안내</strong><span class="plus">+</span></a><a class="news-item" href="#/welcome"><span class="tag">환영</span><strong>처음 오신 여러분을 환영합니다</strong><span class="plus">+</span></a>`;
}
function homeNoticeRows(){
 if(state.notices.length)return state.notices.slice(0,3).map(notice=>`<a class="news-item home-notice" href="#/news/notices/${encodeURIComponent(notice.id)}"><span class="tag">공지</span><strong>${esc(notice.title)}</strong>${notice.date?`<time datetime="${esc(notice.date)}" title="생성일">${date(notice.date)}</time>`:''}<span class="plus" aria-hidden="true">+</span></a>`).join('');
 if(state.noticesStatus==='error')return `<div class="notice" role="status">공지를 불러오지 못했습니다. <a class="text-link" href="#/">다시 불러오기</a></div>`;
 return empty('등록된 공지사항이 없습니다.','새로운 교회 소식이 등록되면 이곳에서 확인하실 수 있습니다.');
}
function home(){title('');const v=state.videos[0];return homeIntro+`
<section class="home-section soft-bg"><div class="section"><div class="section-heading"><div><p class="eyebrow green">THE WORD FOR OUR EVERYDAY</p><h2>말씀으로 여는 한 주</h2></div><a class="text-link" href="#/sermons">말씀 더 보기 <span>+</span></a></div>${resource('videos',v?`<div class="sermon-layout">${videoCover(v)}<div class="sermon-copy"><span class="tag">주일예배 말씀</span><h3>${esc(v.title)}</h3><p>${v.scripture?esc(v.scripture):'우리의 일상에 살아 있는 하나님의 말씀'}</p><div class="sermon-meta">${v.speaker?`<span>${esc(v.speaker)}</span>`:''}<span>${date(v.date)}</span></div><div class="button-row sermon-actions"><button class="button solid" data-video="${esc(v.id)}">▷ &nbsp; 말씀 영상 보기</button><a class="button outline" href="#/about/greeting">담임목사 소개</a></div></div></div>`:empty('말씀을 함께 나눕니다.','주일예배 영상은 교회 YouTube 채널에서 만나보세요.'),'video')}</div></section>
<section class="home-section"><div class="section news-layout"><div><div class="section-heading"><div><p class="eyebrow green">CHURCH NEWS</p><h2>하나의 소식</h2></div><a class="text-link" href="#/news/notices">전체 보기 <span>+</span></a></div>${resource('notices',homeNoticeRows())}</div><div><div class="section-heading"><div><p class="eyebrow green">OUR MOMENTS</p><h2>함께한 순간들</h2></div><a class="text-link" href="#/news/albums">앨범 보기 <span>+</span></a></div>${resource('albums','<div class="home-moments" data-home-moments data-immediate role="region" aria-roledescription="슬라이드" aria-label="함께한 순간들 사진"></div>','image')}</div></div></section>
<section class="home-section soft-bg"><div class="section"><div class="section-heading"><div><p class="eyebrow green">TOGETHER, WE GROW</p><h2>우리가 함께 자라는 자리</h2></div><p class="section-description">서로의 이름을 부르고, 함께 믿음을 키워갑니다.</p></div><div class="community-grid"><a class="community-card" href="#/cells"><p class="eyebrow">SMALL GROUP, BIG LOVE</p><h3>삶을 나누는 셀모임</h3><p>일곱 셀이 함께하는,<br>말씀과 사랑으로 이어지는 우리의 일상.</p><span class="text-link">우리 셀 만나보기 <span>+</span></span><span class="card-watermark">together</span></a><a class="community-card" href="#/education"><p class="eyebrow">FAITH ACROSS GENERATIONS</p><h3>믿음으로 함께 자라는 공동체</h3><p>유아부부터 갈렙세대까지,<br>세대를 넘어 함께하는 믿음의 여정.</p><span class="text-link">교육공동체 만나보기 <span>+</span></span><span class="card-watermark">grow</span></a></div></div></section>
<section class="home-section home-section--card">${homeNewcomer}</section>
<section class="home-section home-section--card home-section--visit"><div class="visit-banner"><div><p class="eyebrow">A PLACE TO CALL HOME</p><h2>이번 주일, 우리 함께 예배해요.</h2><p>세종 금남면 금남구즉로 509</p></div><a class="button yellow" href="#/directions">교회 찾아오시는 길</a></div></section>`;}
function groupPicture(g,key){return resource(`group-image:${key}`,g.image?imageTag(g.image,`${g.title} ${g.sample||g.imageSample?'분위기를 보여주는 샘플 이미지':'공동체 사진'}`):'','image',true,Boolean(g.mediaPending&&!g.image));}
function cells(){
 const cards=state.cells.map(g=>{
  const key=`cells/${g.id}`,headingId=`cell-${g.id}-title`;
  const picture=resource(`group-image:${key}`,g.image?imageTag(g.image,`${g.title} 대표 사진`):'','image',true,Boolean(g.contentPending||g.mediaPending&&!g.image));
  const info=`<dl class="cell-info"><div><dt>셀리더</dt><dd>${esc(g.leader?.trim()||'교회에 문의해 주세요.')}</dd></div><div><dt>모임 시간</dt><dd>${esc(g.meeting)}</dd></div><div><dt>모임 장소</dt><dd>${esc(g.location)}</dd></div></dl>`;
  return `<article class="cell-card" aria-labelledby="${headingId}"><div class="card-media">${picture}</div><div class="cell-card-body">${resource(`cell-title:${key}`,`<h2 id="${headingId}" data-immediate>${esc(g.title)}</h2>`,'rows',true)}${resource(`cell-info:${key}`,info,'rows',true,Boolean(g.contentPending))}</div></article>`;
 }).join('');
 return page('셀모임','일상을 나누고, 함께 기도하는 작은 교회.',`<div class="cell-list">${cards}</div>`);
}
function groupCards(groups,root){return `<div class="cards">${groups.map(g=>`<a class="content-card group-card" href="#/${groupPath(root,g.id)}"><div class="card-media">${groupPicture(g,`${root}/${g.id}`)}</div><div class="card-body"><p class="eyebrow green">${g.eyebrow}</p><h3>${esc(g.title)}</h3>${resource(`group-summary:${root}/${g.id}`,`<p>${esc(g.description)}</p>`,'rows',true,Boolean(g.contentPending))}<span class="text-link">자세히 보기 <span>+</span></span></div></a>`).join('')}</div>`;}
function groupPage(root,id){
 const g=state.education.find(x=>x.id===id);
 if(!g)return notFound();
 const mature=['adults','caleb'].includes(id);
 const copy=`<div class="prose"><p class="eyebrow green">${g.eyebrow}</p><h2>${mature?'삶을 나누며,<br>믿음으로 함께합니다.':'오늘의 작은 믿음이<br>내일의 큰 소망으로.'}</h2><p>${esc(g.description)}</p><div class="info-list">${g.leader?`<div class="info-row"><strong>담당자</strong><span>${esc(g.leader)}</span></div>`:''}${g.audience?`<div class="info-row"><strong>함께하는 이들</strong><span>${esc(g.audience)}</span></div>`:''}<div class="info-row"><strong>모임 안내</strong><span>${esc(g.meeting)}</span></div><div class="info-row"><strong>장소</strong><span>${esc(g.location)}</span></div></div><div class="button-row"><a class="button solid" href="#/directions">교회 방문 안내</a></div></div>`;
 return page(g.title,'하나님의 사랑 안에서 함께 자라는 공동체',`<div class="detail-grid"><div>${groupPicture(g,`${root}/${id}`)}</div><div>${resource(`group-copy:${root}/${id}`,copy,'rows',true,Boolean(g.contentPending))}</div></div>${resource(`group-gallery:${root}/${id}`,g.images.length>(mature?1:0)?`<h3 class="spaced-title">활동 사진</h3>${gallery(g.images,{hideTitles:true,galleryTitle:g.title})}`:'','image',true)}`,nav[3],id==='infant'?infantVideos():id==='young-adult'?youngAdultVideos():'');
}
function infantVideos(){
 return `<section class="infant-videos" aria-labelledby="infant-videos-title"><h3 class="spaced-title" id="infant-videos-title">활동 영상</h3><div class="infant-video-grid">${state.infantPlaylists.map(playlist=>{
  const href='https://www.youtube.com/playlist?list='+encodeURIComponent(playlist.id);
  const videos=playlist.status==='error'?`<div class="blank-state"><h3>영상을 불러오지 못했습니다.</h3><p>잠시 후 다시 방문하거나 YouTube에서 확인해 주세요.</p><a class="button outline" href="${url(href)}" target="_blank" rel="noopener noreferrer">재생목록 보기 <span aria-hidden="true">↗</span></a></div>`:videoCards(playlist.videos);
  return resource(`infant-videos:${playlist.id}`,videos,'cards');
 }).join('')}</div></section>`;
}
function youngAdultVideos(){
 const videos=state.youngAdultStatus==='error'?empty('영상을 불러오지 못했습니다.','잠시 후 다시 방문하거나 아래 재생목록에서 확인해 주세요.'):videoCards(state.youngAdultVideos);
 const href='https://www.youtube.com/playlist?list='+encodeURIComponent(CONFIG.youngAdultPlaylistId);
 return `<section class="young-adult-videos" aria-labelledby="young-adult-videos-title"><h3 class="spaced-title" id="young-adult-videos-title">활동 영상</h3>${resource('young-adult-videos',videos,'cards',!CONFIG.youngAdultPlaylistId)}<div class="button-row"><a class="button outline" href="${url(href)}" target="_blank" rel="noopener noreferrer">YouTube에서 재생목록 전체 보기 <span aria-hidden="true">↗</span></a></div></section>`;
}
function gallery(images,{albumId='',albumTitle='',hideTitles=false,galleryTitle=''}={}){return `<div class="gallery"${!albumId?` data-photo-gallery="${esc(galleryTitle||'공동체')}"`:''}>${images.map((p,index)=>{
 const label=albumId?`${albumTitle} 사진 ${index+1}`:hideTitles?`${galleryTitle||'공동체'} 사진 ${index+1}`:p.title;
 return `<button data-photo="${url(p.url)}" data-photo-title="${esc(label)}" data-photo-index="${index}"${albumId?` data-photo-album="${esc(albumId)}"`:''}${hideTitles?' data-photo-hide-title="true"':''}${albumId||hideTitles?` aria-label="${index+1}번째 사진 크게 보기"`:''}>${imageTag(p.url,label)}${albumId||hideTitles?'':`<span>${esc(p.title)}</span>`}</button>`;
}).join('')}</div>`;}
function peopleCards(){
 const people=[
  {id:'pastor',name:'위남환',role:'담임목사',image:'./assets/pastor-wi-namhwan-smooth.svg',width:1082,height:1082},
  {id:'seong',name:'성혜순',role:'사모',ministries:['유아부'],image:'./assets/seong-hyesun-smooth.svg',width:204,height:320},
  {id:'song',name:'송나단',role:'부목사',ministries:['학생부']},
  {id:'seok',name:'석정문',role:'협동목사',ministries:['교회 조직코칭','리더코칭','평신도코칭'],image:'./assets/seok-jeongmun.png',width:1140,height:1380},
  {id:'wi',name:'위태영',role:'전도사',ministries:['청년부']},
  {id:'park',name:'박한솔',role:'전도사',ministries:['초등부','행정']},
  {id:'moon',name:'문홍일',role:'전도사',ministries:['학생부','토요캠프']}
 ];
 return `<div class="people-grid">${people.map(person=>`<article class="people-card people-card-portrait" aria-labelledby="people-${person.id}">${person.image?`<div class="people-photo-stage people-photo-stage-${esc(person.id)}">${resource(`people-photo:${person.id}`,`<div class="people-photo-frame people-photo-${esc(person.id)}"><img src="${person.image}" alt="${esc(person.name)} ${esc(person.role)}" width="${person.width}" height="${person.height}" loading="eager" decoding="async"></div>`,'image',true)}</div>`:`<div class="people-photo-stage people-photo-placeholder" role="img" aria-label="${esc(person.name)} 프로필 사진 없음"><svg viewBox="0 0 120 148" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="60" cy="34" r="23"/><path d="M17 136v-24a43 43 0 0 1 86 0v24Z"/><text x="60" y="106" text-anchor="middle" dominant-baseline="middle" fill="currentColor" stroke="none">?</text></svg></div>`}<div class="people-card-body"><div class="people-identity"><p class="people-role">${esc(person.role)}</p><h2 id="people-${person.id}">${esc(person.name)}</h2></div><div class="people-details">${person.ministries?`<dl class="people-ministry"><div><dt>사역</dt><dd>${esc(person.ministries.join(', '))}</dd></div></dl>`:'<a class="text-link" href="#/about/greeting">담임목사 인사 <span aria-hidden="true">+</span></a>'}</div></div></article>`).join('')}</div>`;
}
function pastorProfile(){
 return `<section class="pastor-profile" aria-labelledby="pastor-profile-title"><p class="pastor-profile-role">세종하나교회 담임목사</p><h2 id="pastor-profile-title">위남환</h2><dl><div><dt>학력</dt><dd><p>대전침례신학대학교 학사 / 석사</p><p>미국 미드웨스턴 목회학 박사<span class="pastor-profile-school" lang="en">Midwestern Baptist Theological Seminary, D.Min.</span></p></dd></div><div><dt>사역</dt><dd><p>다니엘 기도회 세종지부 협력목사</p><p>세종쥬빌리구국기도회 대표</p></dd></div></dl></section>`;
}
function organizationChart(){
 const teams=[
  ['예배팀','정원교 간사','찬양과 기도회를 준비하고 성가대와 찬양팀을 운영합니다. 성찬식, 침례식과 절기 예배의 준비와 진행을 돕습니다.'],
  ['전도팀','위태영 전도사','토요전도와 새가족 돌봄을 맡아 이웃에게 복음을 전합니다. 선교 교회를 후원하고 선교지 방문을 준비합니다.'],
  ['교육팀','이은영 간사','성경 읽기와 암송, 말씀 교육을 통해 성도들의 믿음 성장을 돕습니다. 부서별 교육과 토요캠프, 다음 세대의 캠프 활동을 지원합니다.'],
  ['행정팀','홍정호 집사','교회 재정을 관리하고 사역 계획과 운영 자료를 정리합니다. 홈페이지와 주보, 예배 영상으로 교회 소식을 전합니다.'],
  ['관리팀','이종화 집사','교회 시설과 냉난방 설비를 점검하고 청소와 공간 관리를 맡습니다. 절기 장식과 현수막 설치로 예배와 행사를 준비합니다.']
 ];
 return `<div class="organization"><header class="organization-head"><h2>세종하나교회</h2><p>담임목사 위남환</p></header><section class="organization-teams" aria-label="교회 사역팀">${teams.map(([name,leader,description],index)=>`<article class="organization-team" aria-labelledby="organization-team-${index}"><div class="organization-team-heading"><h3 id="organization-team-${index}">${esc(name)}</h3><p class="organization-team-leader"><span>팀장</span> <strong>${esc(leader)}</strong></p></div><p>${esc(description)}</p></article>`).join('')}</section></div>`;
}
function churchVision(){
 const values=[
  {name:'말씀 중심',description:'말씀을 삶의 기준으로 삼고, 그 위에 굳게 섭니다.',verses:['시편 119:105'],icon:'<path d="M16 8c-4-3-8-3-12-1v19c4-2 8-2 12 1m0-19c4-3 8-3 12-1v19c-4-2-8-2-12 1V8Z"/>'},
  {name:'영적 예배',description:'온 마음으로 하나님께 나아가며, 성령 충만을 구합니다.',verses:['로마서 12:1'],icon:'<path d="M16 3v12M11 8h10M16 28S4 22 4 15a6 6 0 0 1 12-1 6 6 0 0 1 12 1c0 7-12 13-12 13Z"/>'},
  {name:'성도 교제',description:'서로 사랑하고 연합하며, 헌신과 격려로 함께 세워갑니다.',verses:['마태복음 23:37–39','시편 133:1'],icon:'<circle cx="12" cy="10" r="4"/><path d="M3 27v-3a9 9 0 0 1 18 0v3M22 6a4 4 0 0 1 0 8m3 5a8 8 0 0 1 4 7v1"/>'},
  {name:'제자 양육',description:'믿음 위에 바로 서서, 삶으로 말씀을 따르는 제자를 세웁니다.',verses:['디모데후서 4:7–8','고린도전서 15:58'],icon:'<path d="M16 28V15M16 20C7 20 4 14 5 7c8 0 11 5 11 13Zm0-5C16 7 21 3 28 4c0 7-4 11-12 11ZM10 28h12"/>'},
  {name:'복음 전파',description:'예수님의 복음을 전하며, 이웃과 세상으로 나아갑니다.',verses:['마태복음 28:18–20'],icon:'<path d="m3 14 26-10-10 26-5-11-11-5Zm11 5L29 4"/>'}
 ];
 return `<div class="church-vision"><section class="vision-mission" aria-labelledby="mission-title"><p class="vision-section-label">우리의 사명 <span>OUR MISSION</span></p><h2 id="mission-title">하나님을 기쁘시게,<br><span>세상에 복음을.</span></h2><p class="vision-mission-copy">하나님을 우리의 머리로 모시고, 말씀 안에서 믿음을 키웁니다.<br>성도 한 사람 한 사람이 복음을 전하는 통로가 되기를 소망합니다.</p><span class="vision-mission-rings" aria-hidden="true"></span></section>
 <section class="vision-future" aria-labelledby="vision-future-title"><header class="vision-section-heading"><p class="eyebrow green">SEJONG 2030 VISION</p><h2 id="vision-future-title">말씀에 순종하며,<br><em>2030</em>을 향해.</h2><p>하나님 중심의 삶과 말씀에 대한 순종으로<br>함께 이루어갈 비전입니다.</p></header><ol class="vision-goals" aria-label="세종 2030 비전"><li><h3 class="vision-goal-number vision-goal-faith">구원</h3><p class="vision-goal-title">복음의 진리를 함께 깨닫는 공동체</p><p class="vision-goal-copy">구원의 길을 배우고, 믿음의 첫걸음을 함께 걷습니다.</p></li><li><h3 class="vision-goal-number">100<span>개</span></h3><p class="vision-goal-title">삶과 믿음을 나누는 소그룹</p><p class="vision-goal-copy">작은 공동체 안에서 서로를 돌보며 함께 자라갑니다.</p></li><li><h3 class="vision-goal-number">1,000<span>명</span></h3><p class="vision-goal-title">말씀을 따라 세워지는 제자</p><p class="vision-goal-copy">배운 말씀을 삶으로 실천하고, 세상에 복음을 전합니다.</p></li></ol></section>
 <section class="vision-values" aria-labelledby="vision-values-title"><header class="vision-section-heading"><p class="eyebrow green">OUR CORE VALUES</p><h2 id="vision-values-title">우리가 지켜갈<br>다섯 가지 믿음의 중심.</h2></header><div class="vision-values-map"><div class="vision-values-church">${resource('vision-core-church',`<figure class="vision-church-photo"><img src="./assets/church.png" alt="푸른 하늘 아래 세종하나교회 전경" width="1672" height="941" loading="lazy" decoding="async"><figcaption><strong>세종하나교회</strong><span lang="en">SEJONG HANA CHURCH</span></figcaption></figure>`,'image',true)}</div>${values.map((value,index)=>`<article class="vision-value vision-value--${['word','worship','fellowship','disciples','gospel'][index]}" aria-labelledby="vision-value-${index}"><div class="vision-value-heading"><span class="vision-value-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${value.icon}</svg></span><h3 id="vision-value-${index}">${esc(value.name)}</h3></div><div class="vision-value-copy"><p>${esc(value.description)}</p><div class="vision-verses" aria-label="관련 성경 구절">${value.verses.map(verse=>`<span>${esc(verse)}</span>`).join('')}</div></div></article>`).join('')}</div></section></div>`;
}
function churchHistory(){
 const events=[
  {date:'1995-05-01',title:'북부교회 개척',description:'대전 유성구 송강동'},
  {date:'1997-05-01',title:'석교교회 이전',description:'연기군 석교리 140-1'},
  {date:'2018-07-30',title:'집현동 보상 및 용지 매입',description:'위남환 담임목사의 명의로 집현동 보상 및 용지 매입'},
  {date:'2018-12-17',title:'하나교회로 명칭 변경',description:'회덕교회로 증여'},
  {date:'2019-06-09',title:'임시 예배당',description:'세종특별자치시 한누리대로 1948 316호'},
  {date:'2020-04-18',title:'집현동 성전 입당'},
  {date:'2025-06-01',title:'황용리 성전 내부 인테리어 시행'},
  {date:'2026-03-22',title:'황용리 성전 입당'}
 ];
 const years=[...new Set(events.map(event=>event.date.slice(0,4)))];
 return `<div class="church-history"><header class="history-intro"><div><p class="eyebrow">OUR JOURNEY</p><h2>처음의 믿음에서,<br>오늘의 은혜까지.</h2></div><div class="history-range" aria-label="1995년부터 2026년까지"><span>1995</span><span class="history-range-line" aria-hidden="true"></span><span>2026</span></div></header><ol class="history-timeline" aria-label="교회 연혁">${years.map(year=>`<li class="history-year"><h3 class="history-year-label" id="history-year-${year}">${year}</h3><ol class="history-year-events" aria-labelledby="history-year-${year}">${events.filter(event=>event.date.startsWith(year)).map(event=>`<li class="history-event"><time datetime="${event.date}">${event.date.replaceAll('-','.')}</time><h4>${esc(event.title)}</h4>${event.description?`<p>${esc(event.description)}</p>`:''}</li>`).join('')}</ol></li>`).join('')}</ol></div>`;
}
function onlineOffering(){
 return `<div class="online-offering"><div class="offering-intro"><blockquote><span>헌금은,</span> <span>하나님이 나에게 주신 것에 대한</span> <span>자발적 감사의 반응입니다.</span></blockquote><div class="offering-intro-art" aria-hidden="true"><img src="./assets/offering-banner.png" alt="" width="994" height="290" decoding="async"></div></div><section class="offering-account" aria-labelledby="offering-account-title"><p class="eyebrow green">ONLINE OFFERING</p><h2 id="offering-account-title">온라인헌금 계좌안내</h2><dl><div class="offering-account-number"><dt>농협</dt><dd><span id="offering-account-number">355-0009-2519-93</span><button class="button outline offering-copy" type="button" data-copy-offering aria-describedby="offering-copy-status"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="11" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/></svg>계좌번호 복사</button></dd></div><div class="offering-account-holder"><dt>예금주</dt><dd>기독교한국침례회 하나교회</dd></div></dl><p id="offering-copy-status" class="inline-status" role="status" aria-live="polite"></p></section><section class="offering-guide" aria-labelledby="offering-guide-title"><h2 id="offering-guide-title">입금자 작성 안내</h2><p class="offering-guide-instruction"><strong>입금자란에 이름과 생년월일, 헌금종류를 꼭 기록하여 주세요!</strong></p><div class="offering-example"><h3>작성 예시</h3><p class="offering-example-format">본인이름 <span aria-hidden="true">+</span> 생년월일 <span aria-hidden="true">+</span> 십일조</p><p class="offering-example-name"><code>김하나870414십일조</code></p></div></section></div>`;
}
function about(path){
 const key=path.split('/')[1];const content={
 greeting:['담임목사 인사','세종하나교회에 오신 여러분을 진심으로 환영합니다.',`<div class="pastor-greeting"><div class="pastor-portrait">${resource('pastor-portrait','<div class="pastor-portrait-frame"><img class="pastor-portrait-image" src="./assets/pastor-wi-namhwan-smooth.svg" alt="세종하나교회 위남환 담임목사" width="1082" height="1082" loading="eager" decoding="async"></div>','image',true)}</div><div class="prose pastor-greeting-copy"><p class="eyebrow green">WELCOME MESSAGE</p><h2>“하나교회는 항상<br>열려있습니다.”</h2><p>하나교회는 거듭난 하나님의 자녀로 하나님을 경험하는 감격의 예배가 있으며, 행복한 삶을 누리고 일꾼으로 회복되어 가정과 지역사회와 민족, 그리고 세계 열방에 주님의 증인된 삶을 살고자 고백한 신앙공동체입니다.</p><p class="pastor-invitation"><strong>값진 삶을 위해 여러분을 초대합니다!</strong></p><p class="pastor-sign">세종하나교회 담임목사 <strong>위남환</strong></p></div></div>${pastorProfile()}`],
 vision:['교회 비전','하나님 중심의 삶, 말씀을 따라 걷는 공동체.',churchVision()],
 history:['연혁','하나님의 은혜 안에서 걸어온 길.',churchHistory()],
 people:['섬기는 사람들','사랑과 기도로 공동체를 섬깁니다.',peopleCards()],
 organization:['교회 조직','각자의 자리에서, 하나의 마음으로.',organizationChart()],
 offering:['온라인헌금','감사의 마음을 하나님께 드립니다.',onlineOffering()]
 };const c=content[key];return c?page(...c,nav[0],key==='vision'?visionVideos():''):notFound();
}
function visionVideos(){
 const failed=state.visionStatus==='error';
 const videos=failed&&!state.visionLoaded?empty('영상을 불러오지 못했습니다.','잠시 후 다시 불러오거나 YouTube에서 확인해 주세요.'):videoCards(state.visionVideos);
 const feedback=failed?`<div class="notice" role="status">${state.visionLoaded?'최신 영상을 불러오지 못해 이전 목록을 보여드립니다.':'영상 목록을 다시 확인해 주세요.'} <a class="text-link" href="#/about/vision">다시 불러오기</a></div>`:'';
 const href='https://www.youtube.com/playlist?list='+encodeURIComponent(CONFIG.visionPlaylistId);
 return `<section class="vision-videos" aria-labelledby="vision-videos-title"><h3 class="spaced-title" id="vision-videos-title">교회 소개 영상</h3>${resource('vision-feedback',feedback,'rows',true)}${resource('vision-videos',videos,'cards',false,!state.visionLoaded&&state.visionStatus==='loading')}<div class="button-row"><a class="button outline" href="${url(href)}" target="_blank" rel="noopener noreferrer">교회 비전 재생목록 <span aria-hidden="true">↗</span></a><a class="button outline" href="${url(youtube+'/shorts')}" target="_blank" rel="noopener noreferrer">YouTube Shorts 보기 <span aria-hidden="true">↗</span></a></div></section>`;
}
function directions(){
 const busInfo='https://bis.sejong.go.kr/web/traffic/traffic_station_search.view?'+new URLSearchParams({busStop:'황용리삼성복지회관',auto_stop_id:'293011080'});
 const transit=`<div class="info-row transit-row"><strong>대중교통</strong><div class="transit-guide"><p class="transit-stop"><strong>황용리삼성복지회관 정류장</strong>에서 하차해 교회까지 걸어오시면 됩니다.</p><p>이용 버스: <strong>66, 69, 661, 691, 75번</strong></p><dl class="transit-routes"><div><dt>세종터미널에서</dt><dd>세종고속시외버스터미널에서 위 버스를 타고 황용리삼성복지회관 정류장에서 내려주세요. 횡단보도를 이용해 교회까지 도보 약 2분이면 도착합니다.</dd></div><div><dt>대전 송강동에서</dt><dd>송강마을아파트에서 <strong>661번 또는 691번</strong> 세종고속시외버스터미널 방향 버스를 타고 황용리삼성복지회관 정류장에서 내려주세요.</dd></div></dl><p class="transit-note">배차 간격이 길 수 있으니 출발 전에 운행 시간과 버스 도착정보를 확인해 주세요.</p><a class="text-link transit-link" href="${url(busInfo)}" target="_blank" rel="noopener noreferrer">버스 도착정보 확인 <span aria-hidden="true">↗</span></a></div></div>`;
 const map=`<figure class="directions-map"><a class="directions-map-preview" href="${url(SAMPLE.mapUrl)}" target="_blank" rel="noopener noreferrer" aria-label="세종하나교회 네이버 지도 열기, 새 창"><img src="./assets/church-naver-map.png" width="2898" height="1542" alt="금남구즉로 509에 세종하나교회 위치가 표시된 네이버 지도" loading="eager" decoding="async"></a><figcaption><a href="${url(SAMPLE.mapUrl)}" target="_blank" rel="noopener noreferrer">지도 열기 <span aria-hidden="true">↗</span></a></figcaption></figure>`;
 return page('오시는 길','반가운 만남을 기다립니다.',`<div class="detail-grid directions-grid">${resource('directions-map',map,'image',true)}<div class="map-card"><p class="eyebrow green">COME & JOIN US</p><h3>세종하나교회</h3><p class="prose">세종특별자치시 금남면<br>금남구즉로 509</p><div class="info-list"><div class="info-row"><strong>자가용</strong><span>내비게이션에 ‘세종하나교회’ 또는 위 주소를 입력해 주세요.</span></div>${transit}<div class="info-row"><strong>처음 방문</strong><span>교회에 도착하시면 안내를 요청해 주세요. 예배 장소를 안내해 드리겠습니다.</span></div></div><div class="button-row"><a class="button solid" href="${url(SAMPLE.mapUrl)}" target="_blank" rel="noopener noreferrer">네이버 지도 열기</a><button class="button outline" data-copy-address>주소 복사</button></div><p id="copy-status" class="inline-status" aria-live="polite"></p></div></div>`,nav[0]);
}
function worship(){
 const schedule=[
  ['주일 1부 예배','주일','09:00 - 10:00'],
  ['주일 2부 예배','주일','11:00 - 12:00'],
  ['초등부 예배','주일','11:00 - 12:00'],
  ['유아부 예배','주일','11:00 - 12:00'],
  ['주일 3부 예배','주일','13:30 - 14:30'],
  ['새벽기도','매일','05:30 - 06:30'],
  ['수요예배','수요일','20:00 - 21:00'],
  ['금요기도회','금요일','20:00 - 22:00'],
  ['학생부 모임','주일','12:00 - 13:00'],
  ['청년부 모임','주일','12:00 - 13:00']
 ];
 return page('예배 안내','하나님을 만나는 시간, 함께 예배하는 기쁨.',`<div class="prose worship-intro"><p class="eyebrow green">WORSHIP TOGETHER</p><h2>예배가 삶이 되고,<br>삶이 예배가 됩니다.</h2><p>말씀을 듣고 찬양하며, 하나님께 우리의 마음을 드립니다. 세종하나교회의 예배에 여러분을 초대합니다.</p><a class="button solid" href="#/sermons">주일예배 영상 보기</a></div><section class="worship-schedule" aria-labelledby="worship-schedule-title"><h3 class="spaced-title" id="worship-schedule-title">예배와 모임 시간</h3><div class="schedule-wrap"><table class="schedule worship-schedule-table" aria-labelledby="worship-schedule-title"><thead><tr><th scope="col">예배 / 모임</th><th scope="col">요일</th><th scope="col">시간</th></tr></thead><tbody>${schedule.map(([name,day,time])=>`<tr><th scope="row">${esc(name)}</th><td>${esc(day)}</td><td class="worship-time">${esc(time)}</td></tr>`).join('')}</tbody></table></div></section>`,nav[1]);
}
function sermons(){return page('주일예배 영상','말씀으로 하루를 새롭게, 믿음으로 한 주를 든든하게.',`${state.videoStatus==='error'?'<p class="notice">새 영상을 불러오지 못해 기존에 등록된 영상을 보여드립니다.</p>':''}${videoCards(state.videos)}<div class="button-row"><a class="button outline" href="${youtube}/videos" target="_blank" rel="noopener noreferrer">YouTube에서 모든 영상 보기</a></div>`,nav[1]);}
function jubilee(){
 const videos=state.jubileeStatus==='error'?empty('영상을 불러오지 못했습니다.','잠시 후 다시 방문하거나 아래 재생목록에서 확인해 주세요.'):videoCards(state.jubileeVideos);
 return page('쥬빌리기도회','함께 마음을 모아, 기도로 나아갑니다.',`<div class="jubilee-intro"><p class="eyebrow green">JUBILEE PRAYER</p><h2>“복음적 통일은 우리가 함께 모여<br> 기도할 때 주시는 하나님의 선물입니다!”</h2></div><div class="detail-grid jubilee-details"><div class="jubilee-principles"><p>하나님의 절대 주권을 인정하는 <strong>‘희년’(쥬빌리) 정신</strong>을 추구합니다.</p><p>피 흘림 없는 복음적 평화 <strong>‘통일’</strong>을 추구합니다.</p><p>나라와 민족을 위한 <strong>‘구국’ 기도회</strong>입니다.</p><p>일체의 정치성을 배제한 순수한 <strong>‘기도 운동’</strong>입니다.</p><p>교단과 교파를 초월하여 한국교회가 다가올 통일을 위해 기도하는 자리입니다.</p></div><div class="map-card jubilee-meeting"><h3>함께 기도해요</h3><div class="info-list"><div class="info-row"><strong>일정</strong><span>매월 마지막 주 금요일<br><strong>오후 8시</strong></span></div><div class="info-row"><strong>장소</strong><span>세종하나교회 본당</span></div></div><a class="button solid" href="https://www.jubileeuni.com/" target="_blank" rel="noopener noreferrer">쥬빌리기도회 홈페이지 <span aria-hidden="true">↗</span></a></div></div><h3 class="spaced-title">쥬빌리기도회 영상</h3>${resource('jubilee',videos,'cards',!CONFIG.jubileePlaylistId)}<div class="button-row"><a class="button outline" href="${url(jubileePlaylist)}" target="_blank" rel="noopener noreferrer">YouTube에서 재생목록 전체 보기 <span aria-hidden="true">↗</span></a></div>`,nav[1]);
}
function oneMinute(){
 const href='https://www.youtube.com/playlist?list='+encodeURIComponent(CONFIG.oneMinutePlaylistId);
 const failed=state.oneMinuteStatus==='error';
 const videos=failed&&!state.oneMinuteLoaded?empty('영상을 불러오지 못했습니다.','잠시 후 다시 불러오거나 YouTube에서 확인해 주세요.'):videoCards(state.oneMinuteVideos);
 const feedback=failed?`<div class="notice" role="status">${state.oneMinuteLoaded?'최신 영상을 불러오지 못해 이전 목록을 보여드립니다.':'영상 목록을 다시 확인해 주세요.'} <a class="text-link" href="#/one-minute">다시 불러오기</a></div>`:'';
 return page('내 삶을 바꾸는 1분','짧은 영상으로 나누는 말씀.',`${resource('one-minute-feedback',feedback,'rows',true)}${resource('one-minute-videos',videos,'cards',false,!state.oneMinuteLoaded&&state.oneMinuteStatus==='loading')}<div class="button-row"><a class="button outline" href="${url(href)}" target="_blank" rel="noopener noreferrer">YouTube에서 재생목록 전체 보기 <span aria-hidden="true">↗</span></a></div>`,nav[1]);
}
function saturdayCamp(){
 return page('토요캠프','함께 배우고 어울리는 토요일.',`<section class="mission-intro"><p class="eyebrow green">SATURDAY CAMP</p><h2>배움의 즐거움,<br>함께하는 기쁨.</h2><div class="camp-programs"><h3>토요캠프 교실</h3><ul class="camp-classes"><li>기타 교실</li><li>드럼 교실</li><li>탁구 교실</li><li>영어성경 교실</li><li>영어찬양 교실</li></ul></div><div class="info-list"><div class="info-row"><strong>활동 기간</strong><span>2026년 9월–11월</span></div><div class="info-row"><strong>활동 시간</strong><span>매주 토요일 오후 3시–5시</span></div><div class="info-row"><strong>문의</strong><span>문홍일 전도사 (010-XXXX-XXXX)</span></div></div></section>`,missionNav);
}
function saturdayOutreach(){
 const outreach=state.outreach;
 const copy=`<div class="prose"><p>${esc(outreach.description)}</p></div><div class="info-list outreach-info"><div class="info-row"><strong>전도 시간</strong><span>${esc(outreach.meeting)}</span></div><div class="info-row"><strong>참여</strong><span>${esc(outreach.audience)}</span></div></div>`;
 const photos=outreach.images.length?`<div class="outreach-gallery">${outreach.images.map((photo,index)=>{
  const caption=`토요전도 활동 사진 ${index+1}`;
  const content=photo.status==='error'?'<p class="inline-status">사진을 불러오지 못했습니다.</p>':photo.url?`<button class="outreach-photo" data-photo="${url(photo.url)}" data-photo-title="${esc(caption)}" aria-label="${esc(caption)} 크게 보기">${imageTag(photo.url,caption)}</button>`:'';
  return resource(`outreach-photo:${photo.id||index}`,content,'image',true,photo.status==='loading');
 }).join('')}</div>`:outreach.mediaError?'<p class="inline-status">사진을 불러오지 못했습니다. 잠시 후 다시 방문해 주세요.</p>':empty('등록된 사진이 없습니다.','토요전도 활동 사진이 등록되면 이곳에서 볼 수 있습니다.');
 return page('토요전도','이웃에게 전하는 복음과 사랑.',`<section class="mission-intro"><p class="eyebrow green">SATURDAY OUTREACH</p><h2>매주 토요일,<br>이웃을 찾아갑니다.</h2>${resource('outreach-copy',copy,'rows',true)}</section><section aria-labelledby="outreach-photos-title"><h3 class="spaced-title" id="outreach-photos-title">토요전도 활동 사진</h3>${resource('outreach-gallery',photos,'cards',true,Boolean(outreach.mediaPending&&!outreach.images.length))}</section>`,missionNav);
}
function overseasMission(){
 const videos=state.missionStatus==='error'?empty('영상을 불러오지 못했습니다.','잠시 후 다시 방문하거나 아래 재생목록에서 확인해 주세요.'):videoCards(state.missionVideos);
 return page('해외선교','땅끝까지 전하는 복음과 사랑.',`<section class="mission-intro"><p class="eyebrow green">OVERSEAS MISSION</p><h2>이웃을 향한 사랑으로,<br>복음을 전합니다.</h2><div class="prose"><p>해외선교는 예수님의 사랑과 복음을 전하고, 현지 교회와 이웃을 섬기는 사역입니다.</p><p>세종하나교회는 선교의 현장을 위해 함께 기도하며, 서로의 믿음과 삶을 나누고자 합니다. 아래 영상에서 선교의 현장과 함께한 시간을 만나보세요.</p></div></section><section aria-labelledby="mission-videos-title"><h3 class="spaced-title" id="mission-videos-title">선교 영상</h3>${resource('mission',videos,'cards',!CONFIG.missionPlaylistId)}<div class="button-row"><a class="button outline" href="${url(missionPlaylist)}" target="_blank" rel="noopener noreferrer">YouTube에서 재생목록 전체 보기 <span aria-hidden="true">↗</span></a></div></section>`,missionNav);
}
function welcome(){return page('처음 오셨나요?','잘 오셨어요. 여러분의 첫걸음을 환영합니다.',`<div class="detail-grid"><div class="prose"><p class="eyebrow green">THERE IS A PLACE FOR YOU</p><h2>처음의 낯섦이<br>따뜻한 만남이 되도록.</h2><p>믿음의 첫걸음을 시작하는 분도, 새로운 공동체를 찾는 분도 환영합니다. 편안한 마음으로 오세요.</p><div class="button-row"><a class="button solid" href="#/worship">예배 안내</a><a class="button outline" href="#/directions">오시는 길</a></div></div>${imageTag('./assets/church.png','여러분을 환영하는 세종하나교회')}</div><div class="step-grid spaced-title"><article class="step"><span>01</span><h3>편안한 마음으로 오세요</h3><p>별도의 준비 없이 방문하실 수 있습니다. 방문 전 예배 안내를 확인해 주세요.</p></article><article class="step"><span>02</span><h3>함께 예배해요</h3><p>교회에 오셔서 처음 방문했다고 말씀해 주세요. 예배를 함께할 수 있도록 안내합니다.</p></article><article class="step"><span>03</span><h3>우리의 이야기를 나눠요</h3><p>셀모임과 교육공동체에서 함께 믿음의 길을 걸어갈 이웃을 만나보세요.</p></article></div>`);}
function noticeBody(item){
 if(item.bodyStatus==='error'||(item.bodyStatus!=='ready'&&state.noticesStatus==='error'))return `<div class="notice" role="status">문서를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</div><a class="button outline" href="#/news/notices/${encodeURIComponent(item.id)}">다시 불러오기</a>`;
 if(item.bodyStatus!=='ready')return '<p class="inline-status" role="status">문서를 불러오는 중입니다.</p>';
 if(item.kind==='text'){
  if(!item.body?.trim()&&item.mimeType==='application/vnd.google-apps.document'&&(item.imagesStatus!=='ready'||item.images?.length))return '';
  return `<div class="announcement-body">${item.body?.trim()?esc(item.body):'작성된 내용이 없습니다.'}</div>`;
 }
 if(item.kind==='image')return `<div class="announcement-media">${imageTag(item.image,item.title)}</div>`;
 return `${item.description?`<div class="announcement-body">${esc(item.description)}</div>`:''}<div class="button-row"><a class="button solid" href="${url(item.url)}" target="_blank" rel="noopener noreferrer">${item.kind==='pdf'?'PDF 보기':'문서 보기'}</a></div>`;
}
function noticePhotosView(item,id){
 if(item?.mimeType!=='application/vnd.google-apps.document')return '';
 const photos=item.images||[];
 const items=photos.map((photo,index)=>{
  const label=photo.alt||`${item.title} 사진 ${index+1}`;
  const picture=photo.status==='ready'?`<figure class="notice-photo"><button class="notice-photo-button" data-photo="${url(photo.url)}" data-photo-title="${esc(label)}" aria-label="${esc(label)} 크게 보기"><img src="${url(photo.url)}" alt="${esc(label)}" loading="lazy" decoding="async"></button></figure>`:photo.status==='error'?'<p class="notice-photo-error">사진을 불러오지 못했습니다.</p>':'';
  const ratio=photo.width&&photo.height?`${photo.width}/${photo.height}`:'16/9';
  return `<div class="notice-photo-slot" style="--photo-ratio:${ratio}">${resource(`notice-photo:${id}:${photo.id}`,picture,'image',true,photo.status==='loading')}</div>`;
 }).join('');
 const feedback=item.imagesStatus==='error'?`<p class="notice-photo-error" role="status">일부 사진을 불러오지 못했습니다. <a class="text-link" href="#/news/notices/${encodeURIComponent(id)}">다시 불러오기</a></p>`:!photos.length&&item.imagesStatus!=='ready'?'<p class="inline-status" role="status">사진을 불러오는 중입니다.</p>':'';
 return `<div class="notice-photo-list">${resource(`notice-photo-items:${id}`,items,'image',true)}${resource(`notice-photo-feedback:${id}`,feedback,'rows',true)}</div>`;
}
function notices(id=''){
 const back='<a class="button outline" href="#/news/notices">공지사항 목록으로</a>';
 if(id){
  const item=state.notices.find(n=>n.id===id),loading=!item&&state.noticesStatus==='loading';
  const heading=item?`<header data-immediate><div class="announcement-meta">${item.date?`<time datetime="${esc(item.date)}">생성일 ${date(item.date)}</time>`:''}</div><h2>${esc(item.title)}</h2></header>`:state.noticesStatus==='error'?'':empty('공지사항을 찾을 수 없습니다.','삭제되었거나 주소가 변경된 공지입니다.');
  const body=item?noticeBody(item):'';
  return page('공지사항','교회의 새로운 소식을 전합니다.',`<article class="announcement-article">${resource(`notice-header:${id}`,heading,'rows',true,loading)}${resource(`notice-body:${id}`,body,'rows',true,loading||Boolean(item?.bodyStatus==='unloaded'&&state.noticesStatus!=='error'))}${resource(`notice-images:${id}`,noticePhotosView(item,id),'image',true)}<div class="button-row">${back}</div></article>`,newsNav);
 }
 const content=state.notices.length?`<ul class="announcement-list">${state.notices.map(n=>`<li><a class="announcement-row" href="#/news/notices/${encodeURIComponent(n.id)}"><span class="tag">공지</span><strong>${esc(n.title)}</strong>${n.date?`<time datetime="${esc(n.date)}" title="생성일">${date(n.date)}</time>`:''}<span class="announcement-arrow" aria-hidden="true">→</span></a></li>`).join('')}</ul>`:state.noticesStatus==='error'?'':empty('등록된 공지사항이 없습니다.','새로운 교회 소식이 등록되면 이곳에서 확인하실 수 있습니다.');
 return page('공지사항','교회의 새로운 소식을 전합니다.',content,newsNav);
}
function albumPicture(album,key){return resource(`album-image:${key}`,album.image?imageTag(album.image,album.title):album.mediaError?'<p class="media-unavailable">사진을 불러오지 못했습니다.</p>':'','image',true,Boolean(album.mediaPending&&!album.image));}
function albums(){const fallback={id:'church-tour',title:'우리 교회 둘러보기',image:'./assets/church.png',images:[{url:'./assets/church.png',title:'세종하나교회 전경'}]};const list=state.driveStatus==='connected'?state.albums:(state.albums.length?state.albums:[fallback]);return page('교회행사 앨범','함께한 시간, 오래 간직할 은혜의 순간들.',list.length?`<div class="cards">${list.map(a=>`<button class="content-card album-button" data-album="${esc(a.id)}" aria-label="${esc(a.title)} 앨범 보기">${albumPicture(a,a.id)}<span class="card-body"><h3>${esc(a.title)}</h3></span></button>`).join('')}</div>`:empty('새로운 추억을 기다립니다.','교회행사 사진이 등록되면 이곳에서 만나보실 수 있습니다.'),newsNav);}
function notFound(){return page('페이지를 찾을 수 없습니다.','아래 메뉴에서 원하시는 페이지를 찾아보세요.',`<a class="button solid" href="#/">홈으로 돌아가기</a>`);}
function createView(){
 const path=location.hash.replace(/^#\/?/,'').replace(/\/$/,'');
 let markup;
 if(!path)markup=home();else if(path.startsWith('about/'))markup=about(path);else if(path==='directions')markup=directions();else if(path==='worship')markup=worship();else if(path==='sermons')markup=sermons();else if(path==='jubilee')markup=jubilee();else if(path==='one-minute')markup=oneMinute();else if(path==='mission'||path==='mission/overseas')markup=overseasMission();else if(path==='mission/saturday-camp')markup=saturdayCamp();else if(path==='mission/saturday-outreach')markup=saturdayOutreach();else if(path==='welcome')markup=welcome();else if(path==='cells')markup=cells();else if(path==='education')markup=page('교육공동체','한 세대에서 다음 세대로 이어지는 믿음.',groupCards(state.education,'education'),nav[3]);else if(path.startsWith('education/'))markup=groupPage('education',path.split('/')[1]);else if(path==='news/bulletins')markup=page('주보 안내','이번 주의 예배와 교회 소식을 만나보세요.',`${state.driveStatus==='error'?'<div class="notice">주보를 불러오지 못했습니다. 잠시 후 다시 방문해 주세요.</div>':''}<div class="bulletin-list">${bulletinRows()}</div>`,newsNav);else if(path==='news/notices')markup=notices();else if(path.startsWith('news/notices/'))markup=notices(path.split('/')[2]);else if(path==='news/albums')markup=albums();else markup=notFound();
 const template=document.createElement('template');
 template.innerHTML=markup;
 const feedback=resource('drive-feedback',driveErrors.has(path)?'<div class="notice" role="status">최신 자료를 불러오지 못했습니다. 잠시 후 이 페이지를 다시 열어 주세요.</div>':'','rows',true);
 const feedbackHost=template.content.querySelector('.page-body')||template.content;
 feedbackHost.insertBefore(document.createRange().createContextualFragment(feedback),feedbackHost.firstChild);
 return template.content;
}
function updateHomeMoments(){
 syncHomeMoments(main,state.albums,{loading:state.albums.some(album=>album.mediaPending),error:state.albums.some(album=>album.mediaError)||state.driveStatus==='error'},safeUrl);
}
function render({scroll=false}={}){
 const requestedPath=location.hash.replace(/^#\/?/,'').replace(/\/$/,'');
 if(requestedPath==='education/adults'||requestedPath.startsWith('cells/'))history.replaceState(history.state,'','#/cells');
 main.replaceChildren(createView());
 mountResources(main);
 updateHomeMoments();
 syncHomeHero(main);
 if(scroll){window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true});}
}
const viewer=document.querySelector('#viewer');
let currentAlbum=null;
let photoView=null;
let photoSwipe=null;
let photoSlide=null;
let viewerScroll=null;
function lockViewerScroll(){
 if(viewerScroll)return;
 const body=document.body,properties=['--viewer-scroll-top','--viewer-scrollbar-gap'];
 viewerScroll={x:window.scrollX,y:window.scrollY,styles:properties.map(name=>[name,body.style.getPropertyValue(name),body.style.getPropertyPriority(name)])};
 const gap=window.innerWidth-document.documentElement.clientWidth+(parseFloat(getComputedStyle(body).paddingRight)||0);
 body.style.setProperty('--viewer-scroll-top',`${-viewerScroll.y}px`);
 body.style.setProperty('--viewer-scrollbar-gap',`${gap}px`);
 document.documentElement.classList.add('viewer-open');body.classList.add('viewer-open');
}
function unlockViewerScroll({restore=true}={}){
 if(!viewerScroll)return;
 const saved=viewerScroll;viewerScroll=null;
 document.documentElement.classList.remove('viewer-open');document.body.classList.remove('viewer-open');
 for(const [name,value,priority] of saved.styles){if(value)document.body.style.setProperty(name,value,priority);else document.body.style.removeProperty(name);}
 if(restore)window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
}
function modal(content){photoSlide?.destroy();photoSlide=null;photoSwipe?.destroy();photoSwipe=null;photoView=null;viewer.classList.remove('album-photo-view');document.querySelector('#viewer-content').innerHTML=content;if(!viewer.open){lockViewerScroll();try{viewer.showModal();}catch(error){unlockViewerScroll();throw error;}}}
function albumModal(id,{photoIndex,scrollTop=0}={}){
 const album=state.albums.find(item=>item.id===id)||(currentAlbum?.id===id?currentAlbum:{id,title:'우리 교회 둘러보기',images:[{url:'./assets/church.png',title:'세종하나교회 전경'}]});
 currentAlbum=album;
 modal(`<h2 id="viewer-title">${esc(album.title)}</h2>${album.images.length?gallery(album.images,{albumId:id,albumTitle:album.title}):`<p class="inline-status">${album.mediaPending?'사진을 불러오는 중입니다. 잠시 후 다시 열어 주세요.':'사진을 불러오지 못했습니다. 앨범 페이지를 다시 열어 주세요.'}</p>`}`);
 viewer.scrollTop=scrollTop;
 if(/^\d+$/.test(String(photoIndex)))viewer.querySelector(`[data-photo-index="${photoIndex}"]`)?.focus({preventScroll:true});
}
viewer.querySelector('.dialog-close').onclick=()=>viewer.close();
viewer.addEventListener('close',()=>{if(!viewer.open){photoSlide?.destroy();photoSlide=null;photoSwipe?.destroy();photoSwipe=null;document.querySelector('#viewer-content').innerHTML='';currentAlbum=null;photoView=null;viewer.classList.remove('album-photo-view');unlockViewerScroll();}});
function galleryNavigation(photo){
 const host=photo.closest?.('[data-photo-gallery]');
 if(!host)return null;
 const buttons=[...host.querySelectorAll('[data-photo]')],index=buttons.indexOf(photo);
 if(index<0)return null;
 return {galleryTitle:host.dataset.photoGallery,index,hideTitle:photo.dataset.photoHideTitle==='true',images:buttons.map(button=>({url:button.dataset.photo,title:button.dataset.photoTitle}))};
}
function photoModal(photo,{photoNavigation,focusStep,focusClose=false,slideFrom,slideStep}={}){
 const title=photo.dataset.photoTitle||'교회 사진',albumId=photo.dataset.photoAlbum;
 const hideTitle=Boolean(albumId)||photo.dataset.photoHideTitle==='true';
 const index=Number(photo.dataset.photoIndex);
 const navigation=photoNavigation||(albumId&&currentAlbum?.id===albumId&&Number.isInteger(index)&&index>=0&&index<currentAlbum.images.length?{albumId,albumTitle:currentAlbum.title,images:currentAlbum.images.slice(),index,galleryScrollTop:viewer.scrollTop,hideTitle:true}:galleryNavigation(photo));
 const back=albumId?`<button type="button" class="button outline album-back" data-album-back="${esc(albumId)}" data-album-photo-index="${esc(photo.dataset.photoIndex)}" data-album-scroll="${navigation?.galleryScrollTop??viewer.scrollTop}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>앨범으로 돌아가기</button>`:'';
 const arrow=step=>`<button type="button" class="album-photo-arrow ${step<0?'previous':'next'}" data-album-photo-step="${step}" aria-label="${step<0?'이전':'다음'} 사진"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${step<0?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
 const controls=navigation?.images.length>1;
 const image=navigation?`<div class="album-photo-stage" data-photo-index="${navigation.index}">${controls?arrow(-1):''}${imageTag(photo.dataset.photo,title,'album-photo-image')}${controls?arrow(1):''}</div>`:imageTag(photo.dataset.photo,title);
 modal(`${back}<h2 id="viewer-title"${hideTitle?' class="sr-only"':''}>${esc(title)}</h2>${image}`);
 const currentImage=viewer.querySelector('img');
 currentImage.loading='eager';
 photoView=navigation;
 if(navigation){viewer.classList.add('album-photo-view');viewer.scrollTop=0;}
 photoSlide=slideFrom?startPhotoSlide(viewer.querySelector('.album-photo-stage'),slideFrom,slideStep):null;
 if(controls)photoSwipe=bindHorizontalSwipe(viewer.querySelector('.album-photo-stage'),{onSwipe:navigatePhoto,allowDiagonal:true});
 if(navigation)(focusClose?viewer.querySelector('.dialog-close'):viewer.querySelector(focusStep?`[data-album-photo-step="${focusStep}"]`:albumId?'[data-album-back]':'.dialog-close'))?.focus({preventScroll:true});
}
function navigatePhoto(step){
 const current=photoView;
 if(!viewer.open||!current||current.images.length<2)return;
 const index=(current.index+step+current.images.length)%current.images.length,photo=current.images[index];
 const focusStep=document.activeElement?.dataset.albumPhotoStep,focusClose=document.activeElement===viewer.querySelector('.dialog-close');
 const title=current.albumId?`${current.albumTitle} 사진 ${index+1}`:photo.title||`${current.galleryTitle} 사진 ${index+1}`;
 const slideFrom=capturePhotoSlide(viewer.querySelector('.album-photo-stage'));
 photoModal({dataset:{photo:photo.url,photoTitle:title,photoAlbum:current.albumId,photoIndex:String(index),photoHideTitle:String(current.hideTitle)}},{photoNavigation:{...current,index},focusStep,focusClose,slideFrom,slideStep:step});
}
viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});
document.addEventListener('keydown',event=>{
 if(viewer.open&&photoView&&['ArrowLeft','ArrowRight'].includes(event.key)&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.target.closest('input,textarea,select,[contenteditable="true"]')){
  if(photoView.images.length>1){event.preventDefault();navigatePhoto(event.key==='ArrowLeft'?-1:1);}
  return;
 }
 if(event.key!=='Escape'||viewer.open)return;
 const trigger=desktopOpen?.querySelector('.nav-label');
 closeDesktopMenus();
 if(trigger){
  event.preventDefault();suppressNavFocus=true;
  trigger.focus({preventScroll:true});suppressNavFocus=false;
 }
 if(!document.querySelector('#mobile-nav').hidden){
  document.querySelector('.menu-toggle').click();
  document.querySelector('.menu-toggle').focus({preventScroll:true});
 }
});
document.addEventListener('click',async event=>{
 const homeBrand=event.target.closest('.brand[href="#/"]');
 if(homeBrand&&!event.defaultPrevented&&!currentPath()&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
  event.preventDefault();
  if(location.hash!=='#/')history.replaceState(history.state,'','#/');
  renderNavigation();return;
 }
 const photoStep=event.target.closest('[data-album-photo-step]');if(photoStep){navigatePhoto(Number(photoStep.dataset.albumPhotoStep));return;}
 const albumBack=event.target.closest('[data-album-back]');if(albumBack){albumModal(albumBack.dataset.albumBack,{photoIndex:albumBack.dataset.albumPhotoIndex,scrollTop:Number(albumBack.dataset.albumScroll)||0});return;}
 const video=event.target.closest('[data-video]');
 if(video){const id=video.dataset.video;if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return;const data=[...state.videos,...state.jubileeVideos,...state.missionVideos,...state.youngAdultVideos,...state.visionVideos,...state.oneMinuteVideos,...state.infantPlaylists.flatMap(playlist=>playlist.videos)].find(v=>v.id===id);modal(`<h2 id="viewer-title">${esc(data?.title||'예배 영상')}</h2><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${esc(data?.title||'예배 영상')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><p class="inline-status">영상 재생이 제한되면 <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">YouTube에서 보기</a>를 이용해 주세요.</p>`);}
 const photo=event.target.closest('[data-photo]');if(photo)photoModal(photo);
 const album=event.target.closest('[data-album]');if(album)albumModal(album.dataset.album);
 if(event.target.closest('[data-bulletin-sample]'))modal(`<h2 id="viewer-title">주보 안내 <span class="sample-tag">샘플</span></h2><p class="prose">매주 주보를 통해 예배 순서와 교회 소식을 함께 나눕니다. 실제 주보가 등록되면 목록에서 PDF 또는 이미지로 열어볼 수 있습니다.</p><div class="notice">현재는 화면 구성을 위한 예시입니다. 실제 주보 파일은 아직 등록되지 않았습니다.</div>`);
 if(event.target.closest('[data-copy-address]')){const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(SAMPLE.address);status.textContent='주소를 복사했습니다.';}catch{status.textContent=`직접 복사해 주세요: ${SAMPLE.address}`;}}
 if(event.target.closest('[data-copy-offering]')){const status=document.querySelector('#offering-copy-status'),account=document.querySelector('#offering-account-number').textContent;try{await navigator.clipboard.writeText(account);status.textContent='계좌번호를 복사했습니다.';}catch{status.textContent=`직접 복사해 주세요: ${account}`;}}
 if(!event.target.closest('.nav-group')||event.target.closest('.dropdown a'))closeDesktopMenus();
});
function renderNavigation(){
 if(viewer.open)viewer.close();
 unlockViewerScroll({restore:false});
 const btn=document.querySelector('.menu-toggle');
 btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','전체 메뉴 열기');
 document.querySelector('#mobile-nav').hidden=true;document.body.classList.remove('menu-open');
 closeDesktopMenus();document.activeElement?.blur();
 render({scroll:true});refreshDrive();refreshOneMinute();refreshVision();
}
window.addEventListener('hashchange',renderNavigation);
render();
// Drive is the live source of truth. Video refresh is independent of content refresh.
const driveRefreshTasks=new Map();
let renderPending=false,requestSequence=0;
const latestResourceRequest=new Map();
const noticePrefetchSeen=new Set();
let noticePrefetchScheduled=false,noticePrefetchRunning=false;
function mayPrefetch(){return !navigator.connection?.saveData&&!['slow-2g','2g'].includes(navigator.connection?.effectiveType);}
async function warmNotice(item){
 const version=`${item.id}:${item.modifiedTime}`;
 if(item.kind!=='text'||item.bodyStatus==='ready'||noticePrefetchSeen.has(version)||!mayPrefetch())return;
 noticePrefetchSeen.add(version);
 try{
  const ready=await preloadNotice(item);
  const current=state.notices.find(n=>n.id===item.id);
  if(current?.modifiedTime===ready.modifiedTime&&current.bodyStatus!=='ready'){
   state.notices=state.notices.map(n=>n.id===ready.id?{...n,body:ready.body,bodyStatus:ready.bodyStatus}:n);
   renderResourceUpdate();
  }
 }catch{} // Foreground access offers the normal retry; prefetch never blocks a page.
}
function scheduleNoticePrefetch(){
 if(noticePrefetchScheduled||noticePrefetchRunning||!mayPrefetch())return;
 noticePrefetchScheduled=true;
 const run=async()=>{
  noticePrefetchScheduled=false;noticePrefetchRunning=true;
  try{
   for(const item of state.notices.filter(n=>n.kind==='text').slice(0,3)){
    if(!['','news/notices'].includes(currentPath()))break;
    await warmNotice(item);
   }
  }finally{noticePrefetchRunning=false;}
 };
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:800});else setTimeout(run,100);
}
for(const eventName of ['pointerover','focusin'])document.addEventListener(eventName,event=>{
 const link=event.target.closest('.announcement-row, .home-notice');
 if(!link||!mayPrefetch())return;
 const item=state.notices.find(n=>link.hash===`#/news/notices/${n.id}`);
 if(item)warmNotice(item);
});
function renderResourceUpdate(){
 if(viewer.open){renderPending=true;return;}
 renderPending=false;patchResources(main,createView());
 updateHomeMoments();
 syncHomeHero(main);
}
viewer.addEventListener('close',()=>{if(renderPending)renderResourceUpdate();});
async function refreshDrive(){
 const path=location.hash.replace(/^#\/?/,'').replace(/\/$/,'');
 const keys=driveKeys(path);
 if(!keys.length)return;
 const pending=driveRefreshTasks.get(path);
 if(pending){
  pending.sequence=++requestSequence;
  pending.requestedKeys.forEach(key=>latestResourceRequest.set(key,pending.sequence));
  return pending.promise;
 }
 const requestedKeys=keys;
 const taskRecord={sequence:++requestSequence,requestedKeys,promise:null};
 requestedKeys.forEach(key=>latestResourceRequest.set(key,taskRecord.sequence));
 let noticesReceived=false;
 const applyResult=incoming=>{
   const result={...incoming};
   if(keys.every(key=>latestResourceRequest.get(key)!==taskRecord.sequence))return;
   for(const key of ['bulletins','albums','notices'])if(result[key]&&latestResourceRequest.get(key)!==taskRecord.sequence)delete result[key];
   for(const key of ['bulletins','albums','notices'])if(result[key])settleResource(key);
   if(result.notices){
    noticesReceived=true;
    result.notices=result.notices.map(next=>{
     const previous=state.notices.find(n=>n.id===next.id);
     if(next.bodyStatus==='unloaded'&&previous?.modifiedTime===next.modifiedTime&&previous.bodyStatus==='ready')next={...next,body:previous.body,image:previous.image,bodyStatus:'ready'};
     if(next.imagesStatus==='unloaded'&&previous?.modifiedTime===next.modifiedTime&&previous.imagesStatus&&previous.imagesStatus!=='unloaded')next={...next,images:previous.images,imagesStatus:previous.imagesStatus};
     return next;
    });
    state.noticesStatus='connected';
   }
   if(result.albums)result.albums=result.albums.map(next=>{
    const previous=state.albums.find(a=>a.id===next.id);
    if(next.contentPending&&previous?.contentPending===false)next={...next,title:previous.title,description:previous.description,date:previous.date,contentPending:false};
    return (next.mediaPending||next.mediaError)&&previous?.image?{...next,image:previous.image,images:previous.images}:next;
   });
   driveErrors.delete(path);
   Object.assign(state,result,{driveStatus:'connected'});
   renderResourceUpdate();
   if(result.notices&&['','news/notices'].includes(currentPath()))scheduleNoticePrefetch();
 };
 const task=(async()=>{
  try{
   const result=await loadDrive(null,{path,onUpdate:applyResult});
   if(result.status!=='connected'){if(keys.includes('notices'))throw new Error('Notice data unavailable');return;}
   applyResult(result);
  }catch(error){
   if(keys.length&&keys.every(key=>latestResourceRequest.get(key)!==taskRecord.sequence))return;
   console.warn('교회 자료를 새로 불러오지 못했습니다.',error.message);
   driveErrors.add(path);
   keys.forEach(settleResource);
   if(keys.includes('notices')&&!noticesReceived&&latestResourceRequest.get('notices')===taskRecord.sequence)state.noticesStatus='error';
   if(state.driveStatus!=='connected')state.driveStatus='error';
   if(location.hash.replace(/^#\/?/,'').replace(/\/$/,'')===path)renderResourceUpdate();
  }finally{driveRefreshTasks.delete(path);}
 })();
 taskRecord.promise=task;
 driveRefreshTasks.set(path,taskRecord);
 return task;
}
refreshDrive();
// Re-entering the current menu also requests the latest Drive content.
document.addEventListener('click',event=>{
 if(event.defaultPrevented)return;
 const link=event.target.closest('a[href^="#/"]');
 if(link&&link.hash===location.hash&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
  if(link.closest('#mobile-nav')&&!document.querySelector('#mobile-nav').hidden)document.querySelector('.menu-toggle').click();
  refreshDrive();
  refreshOneMinute();
  refreshVision();
 }
});
loadVideos().then(result=>{
 settleResource('videos');
 if(result.status==='connected'){state.videos=result.videos;state.videoStatus='connected';}
 renderResourceUpdate();
}).catch(()=>{settleResource('videos');state.videoStatus='error';renderResourceUpdate();});
loadVideos({jubilee:true}).then(result=>{
 settleResource('jubilee');
 if(result.status==='connected')state.jubileeVideos=result.videos;
 state.jubileeStatus=result.status;
 renderResourceUpdate();
}).catch(()=>{settleResource('jubilee');state.jubileeStatus='error';renderResourceUpdate();});

loadVideos({mission:true}).then(result=>{
 settleResource('mission');
 if(result.status==='connected')state.missionVideos=result.videos;
 state.missionStatus=result.status;
 renderResourceUpdate();
}).catch(()=>{settleResource('mission');state.missionStatus='error';renderResourceUpdate();});

for(const playlist of state.infantPlaylists){
 loadVideos({playlistId:playlist.id,kind:'infant'}).then(result=>{
  settleResource(`infant-videos:${playlist.id}`);
  if(result.status==='connected')playlist.videos=result.videos;
  playlist.status=result.status;
  renderResourceUpdate();
 }).catch(()=>{settleResource(`infant-videos:${playlist.id}`);playlist.status='error';renderResourceUpdate();});
}

loadVideos({playlistId:CONFIG.youngAdultPlaylistId,kind:'young-adult'}).then(result=>{
 settleResource('young-adult-videos');
 if(result.status==='connected')state.youngAdultVideos=result.videos;
 state.youngAdultStatus=result.status;
 renderResourceUpdate();
}).catch(()=>{settleResource('young-adult-videos');state.youngAdultStatus='error';renderResourceUpdate();});

let visionRefreshTask=null;
function refreshVision(){
 if(currentPath()!=='about/vision')return;
 if(visionRefreshTask)return visionRefreshTask;
 state.visionStatus='loading';
 renderResourceUpdate();
 visionRefreshTask=(async()=>{
  try{
   const result=await loadVisionVideos();
   state.visionVideos=result.videos;
   state.visionLoaded=true;
   state.visionStatus='connected';
  }catch{state.visionStatus='error';}
  finally{
   settleResource('vision-videos');
   visionRefreshTask=null;
   if(currentPath()==='about/vision')renderResourceUpdate();
  }
 })();
 return visionRefreshTask;
}
refreshVision();

let oneMinuteRefreshTask=null;
function refreshOneMinute(){
 if(currentPath()!=='one-minute')return;
 if(oneMinuteRefreshTask)return oneMinuteRefreshTask;
 state.oneMinuteStatus='loading';
 renderResourceUpdate();
 oneMinuteRefreshTask=(async()=>{
  try{
   const result=await loadVideos({playlistId:CONFIG.oneMinutePlaylistId,kind:'one-minute',fresh:true,allPages:true});
   if(result.status!=='connected')throw new Error('Playlist unavailable');
   state.oneMinuteVideos=result.videos;
   state.oneMinuteLoaded=true;
   state.oneMinuteStatus='connected';
  }catch{state.oneMinuteStatus='error';}
  finally{
   settleResource('one-minute-videos');
   oneMinuteRefreshTask=null;
   if(currentPath()==='one-minute')renderResourceUpdate();
  }
 })();
 return oneMinuteRefreshTask;
}
refreshOneMinute();
