import { CONFIG } from './config.js';
import { readPublicResource } from './read-only-api.js';
import { readPhotoCache, savePhotoCache, compactPhoto } from './photo-cache.js';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const YOUTUBE = 'https://www.googleapis.com/youtube/v3';
const cachePrefix = 'sejong-hana-v2:';
const driveMedia = new Map();
const mediaBlobs=new Map(),originalPhotos=new Map(),pendingPreviews=new Map(),noticeSources=new Map(),pendingNoticeSources=new Map();
const noticePhotoCache=new Map(),pendingNoticePhotos=new Map();
const pendingCache = new Map(),pendingFolders=new Map(),pendingImages=new Map();
const memoryCache=new Map();
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
export function safeUrl(value, fallback='') {
  if(typeof value!=='string')return fallback;
  try { const url=new URL(value,window.location.href); return ['http:','https:'].includes(url.protocol)||(url.protocol==='blob:'&&[...driveMedia.values()].includes(value))?url.href:fallback; } catch { return fallback; }
}
export function driveViewUrl(file) {
  if(file.mimeType==='application/pdf'&&validId(file.id)){
    const params=new URLSearchParams({id:file.id,title:file.name||'주보'});
    if(file.resourceKey)params.set('resourceKey',file.resourceKey);
    return `./pdf.html?${params}`;
  }
  const fallback=`https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
  return safeUrl(file.webViewLink,fallback);
}
export async function loadBulletinPdf(id,resourceKey='') {
  if(!validId(id)||(resourceKey&&!validId(resourceKey)))throw new Error('Invalid bulletin address');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),CONFIG.requestTimeoutMs);
  try{
    const response=await readPublicResource(driveImage({id}),{signal:controller.signal,cache:'no-cache',headers:resourceHeaders({id,resourceKey})});
    if(!response.ok)throw new Error(`Bulletin unavailable (${response.status})`);
    const blob=await response.blob();
    if(!(await blob.slice(0,5).text()).startsWith('%PDF-'))throw new Error('Invalid PDF');
    return new Blob([blob],{type:'application/pdf'});
  }finally{clearTimeout(timer);}
}
export function driveImage(file) {
  if(!validId(file.id))return '';
  const params=new URLSearchParams({alt:'media',key:CONFIG.googleApiKey});
  return `${DRIVE}/files/${encodeURIComponent(file.id)}?${params}`;
}
function resourceHeaders(file) {
  return file?.resourceKey?{'X-Goog-Drive-Resource-Keys':`${file.id}/${file.resourceKey}`} : {};
}
async function request(base,path,params={},headers={}) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),CONFIG.requestTimeoutMs);
  try {
    const query=new URLSearchParams({...params,key:CONFIG.googleApiKey});
    const response=await readPublicResource(`${base}/${path}?${query}`,{signal:controller.signal,cache:'no-store',headers});
    if(!response.ok)throw new Error(`Google resource unavailable (${response.status})`);
    return await response.json();
  } finally {clearTimeout(timer);}
}
async function fetchImageResource(file) {
  const version=`${file.id}:${file.modifiedTime||''}`;
  if(driveMedia.has(version))return driveMedia.get(version);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),CONFIG.requestTimeoutMs);
  try {
    const response=await readPublicResource(driveImage(file),{signal:controller.signal,cache:'no-cache',headers:resourceHeaders(file)});
    if(!response.ok)throw new Error(`Drive image unavailable (${response.status})`);
    const blob=await response.blob();
    if(!blob.type.startsWith('image/'))throw new Error('Drive file is not an image');
    return storePhoto(version,blob);
  } finally {clearTimeout(timer);}
}
function imageResource(file){
  const key=`${file.id}:${file.modifiedTime||''}`;
  if(pendingImages.has(key))return pendingImages.get(key);
  const task=fetchImageResource(file).finally(()=>pendingImages.delete(key));
  pendingImages.set(key,task);return task;
}
function storePhoto(key,blob){
  if(driveMedia.has(key))return driveMedia.get(key);
  const address=URL.createObjectURL(blob);driveMedia.set(key,address);mediaBlobs.set(key,blob);return address;
}
function thumbnailSource(value){
  const source=documentPhotoSource(value);
  if(!source||source.startsWith('data:'))return '';
  const address=new URL(source);
  // Google currently supplies =sNNN URLs. This size hint is best effort, not an API guarantee.
  address.pathname=address.pathname.replace(/=s\d+(?:-[a-z0-9]+)*$/i,'=s1200');
  return address.href;
}
async function drivePreview(file){
  const version=noticeVersion(file),key=`drive-preview:v1:${version}`,originalKey=`drive:${version}`;
  originalPhotos.set(originalKey,{kind:'drive',file});
  if(driveMedia.has(key))return {url:driveMedia.get(key),originalKey};
  if(pendingPreviews.has(key))return pendingPreviews.get(key);
  const task=(async()=>{
    let blob=await readPhotoCache(key);
    if(!(blob instanceof Blob)||!blob.type.startsWith('image/')){
      const thumbnail=thumbnailSource(file.thumbnailLink);
      if(thumbnail){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
        try{
          const response=await readPublicResource(thumbnail,{signal:controller.signal,cache:'default',referrerPolicy:'no-referrer'});
          if(!response.ok)throw new Error('Preview unavailable');
          blob=await response.blob();
          if(!blob.type.startsWith('image/'))throw new Error('Invalid preview');
          const decoded=await createImageBitmap(blob);decoded.close();
        }catch{blob=null;}finally{clearTimeout(timer);}
      }
      if(!blob){await imageResource(file);blob=mediaBlobs.get(version);}
      blob=await compactPhoto(blob);await savePhotoCache(key,blob);
    }
    return {url:storePhoto(key,blob),originalKey};
  })().finally(()=>pendingPreviews.delete(key));
  pendingPreviews.set(key,task);return task;
}
export async function loadPhotoOriginal(key){
  const photo=originalPhotos.get(key);
  if(!photo)throw new Error('Unknown photo');
  if(photo.kind==='drive')return imageResource(photo.file);
  const sources=await readNoticeSources(photo.file);
  return documentPhotoBlob(sources[photo.index]?.source,`notice-original:${noticeVersion(photo.file)}:${photo.index}`);
}
async function photosFrom(files,onUpdate=()=>{}) {
  const images=files.filter(isImage),photos=images.map(file=>({id:file.id,title:file.description||file.name,url:'',status:'loading'}));let failed=false;
  const publish=()=>onUpdate(photos.filter(photo=>photo.status==='ready'),photos.map(photo=>({...photo})));
  publish();
  await mapLimited(images,3,async(file,index)=>{
    try{photos[index]={...photos[index],...await drivePreview(file),status:'ready'};}
    catch{failed=true;photos[index]={...photos[index],status:'error'};}
    publish();
  });
  if(failed)console.warn('일부 사진을 불러오지 못했습니다. 다음 갱신 때 다시 시도합니다.');
  return photos.filter(photo=>photo.status==='ready');
}
function readCached(key){
  let stored=memoryCache.get(key);
  if(!stored)try{stored=JSON.parse(sessionStorage.getItem(cachePrefix+key));}catch{}
  if(stored&&Date.now()-stored.savedAt<CONFIG.cacheMinutes*60000){memoryCache.set(key,stored);return stored;}
  return null;
}
async function cached(key,fetcher,{fresh=false}={}) {
  if(pendingCache.has(key))return pendingCache.get(key);
  const stored=!fresh&&readCached(key);
  if(stored)return stored.value;
  const task=(async()=>{
    const value=await fetcher(),entry={savedAt:Date.now(),value};
    memoryCache.set(key,entry);
    try{sessionStorage.setItem(cachePrefix+key,JSON.stringify(entry));}catch{}
    return value;
  })().finally(()=>pendingCache.delete(key));
  pendingCache.set(key,task);return task;
}
export function listDriveFiles(parentId,resourceKey){
  const key=`${parentId}:${resourceKey||''}`;
  if(pendingFolders.has(key))return pendingFolders.get(key);
  const task=readDriveFolder(parentId,resourceKey).finally(()=>pendingFolders.delete(key));
  pendingFolders.set(key,task);return task;
}
async function readDriveFolder(parentId,resourceKey) {
  if(!validId(parentId))throw new Error('Invalid Drive folder ID');
  {
    const files=[];let pageToken='';const seen=new Set();
    do {
      const data=await request(DRIVE,'files',{q:`'${parentId}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,description,webViewLink,createdTime,modifiedTime,resourceKey,thumbnailLink)',pageSize:'100',orderBy:'name',...(pageToken?{pageToken}:{})},resourceHeaders({id:parentId,resourceKey}));
      files.push(...(data.files??[]));pageToken=data.nextPageToken??'';
      if(pageToken&&seen.has(pageToken))throw new Error('Repeated Drive page token');
      seen.add(pageToken);
    }while(pageToken);
    return files;
  }
}
const isFolder=f=>f.mimeType==='application/vnd.google-apps.folder';
const isImage=f=>f.mimeType?.startsWith('image/');
const findFolder=(files,names)=>files.find(f=>isFolder(f)&&names.includes(f.name));
async function childFiles(root,names){const folder=findFolder(root,names);return folder?await listDriveFiles(folder.id,folder.resourceKey):[];}
async function getContent(files) {
  const content=files.filter(f=>f.name==='content.json'&&!isFolder(f)).sort((a,b)=>(b.modifiedTime||'').localeCompare(a.modifiedTime||'')||a.id.localeCompare(b.id))[0];
  if(!content)return {};
  const json=await cached(`content:${content.id}:${content.modifiedTime}`,()=>request(DRIVE,`files/${encodeURIComponent(content.id)}`,{alt:'media'},resourceHeaders(content)));
  if(!json||typeof json!=='object'||Array.isArray(json))throw new Error('content.json must contain an object');
  return json;
}
function plain(value,fallback){return typeof value==='string'?value.slice(0,12000):fallback;}
function noticeKind(file){
  if(file.mimeType==='application/vnd.google-apps.document'||file.mimeType?.startsWith('text/'))return 'text';
  if(file.mimeType==='application/pdf')return 'pdf';
  return isImage(file)?'image':'file';
}
function noticeDate(value){
  if(!value||Number.isNaN(Date.parse(value)))return '';
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
async function noticeText(file){
  return cached(`notice-document:${file.id}:${file.modifiedTime||''}`,async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),CONFIG.requestTimeoutMs);
    try{
      const isDoc=file.mimeType==='application/vnd.google-apps.document';
      const params=new URLSearchParams({key:CONFIG.googleApiKey,...(isDoc?{mimeType:'text/plain'}:{alt:'media'})});
      const response=await readPublicResource(`${DRIVE}/files/${encodeURIComponent(file.id)}${isDoc?'/export':''}?${params}`,{signal:controller.signal,cache:'no-store',headers:resourceHeaders(file)});
      if(!response.ok)throw new Error(`Notice document unavailable (${response.status})`);
      return (await response.text()).replace(/^\uFEFF/,'');
    }finally{clearTimeout(timer);}
  });
}
const noticeVersion=file=>`${file.id}:${file.modifiedTime||''}`;
function documentPhotoSource(value){
  if(typeof value!=='string')return '';
  if(/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(value))return value;
  try{
    const address=new URL(value);
    if(address.protocol==='https:'&&!address.username&&!address.password&&(!address.port||address.port==='443')&&(address.hostname==='googleusercontent.com'||address.hostname.endsWith('.googleusercontent.com')))return address.href;
  }catch{}
  return '';
}
function documentPhotoBlob(source,key){
  if(driveMedia.has(key))return Promise.resolve(driveMedia.get(key));
  if(pendingImages.has(key))return pendingImages.get(key);
  const task=fetchDocumentPhotoBlob(source,key).finally(()=>pendingImages.delete(key));
  pendingImages.set(key,task);return task;
}
async function fetchDocumentPhotoBlob(source,key){
  if(driveMedia.has(key))return driveMedia.get(key);
  if(!source)throw new Error('Unsupported document image');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),CONFIG.requestTimeoutMs);
  try{
    const response=await readPublicResource(source,{signal:controller.signal,referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('Document image unavailable');
    const blob=await response.blob();
    if(!/^image\/(png|jpeg|gif|webp|avif)$/i.test(blob.type))throw new Error('Invalid document image');
    return storePhoto(key,blob);
  }finally{clearTimeout(timer);}
}
async function noticePhotos(file,onUpdate=()=>{}){
  const version=noticeVersion(file),stored=noticePhotoCache.get(version);
  if(stored?.imagesStatus==='ready'){onUpdate(stored);return stored;}
  const pending=pendingNoticePhotos.get(version);
  if(pending){pending.listeners.add(onUpdate);if(pending.last)onUpdate(pending.last);return pending.promise;}
  const record={listeners:new Set([onUpdate]),last:null,promise:null};
  const publish=next=>{
    record.last=next;noticePhotoCache.set(version,next);
    for(const listener of record.listeners)listener(next);
    return next;
  };
  record.promise=(async()=>{
    const manifestKey=`notice-manifest:v1:${version}`,manifest=await readPhotoCache(manifestKey);
    if(Array.isArray(manifest?.images)){
      const restored=await Promise.all(manifest.images.map(async photo=>{
        const blob=await readPhotoCache(`notice-preview:v1:${version}:${photo.id}`);
        if(!(blob instanceof Blob)||!blob.type.startsWith('image/'))return null;
        const originalKey=`document:${version}:${photo.id}`;
        originalPhotos.set(originalKey,{kind:'document',file,index:Number(photo.id)});
        return {...photo,url:storePhoto(`notice-preview:v1:${version}:${photo.id}`,blob),originalKey,status:'ready'};
      }));
      if(restored.every(Boolean))return publish({images:restored,imagesStatus:'ready'});
    }
    let sources;
    try{sources=await readNoticeSources(file);}catch{return publish({images:stored?.images||[],imagesStatus:'error'});}
    const images=sources.map((photo,index)=>{
      const key=`notice-preview:v1:${version}:${index}`,imageUrl=driveMedia.get(key)||'',originalKey=`document:${version}:${index}`;
      originalPhotos.set(originalKey,{kind:'document',file,index});
      return {id:String(index),url:imageUrl,originalKey,alt:photo.alt,width:photo.width,height:photo.height,status:imageUrl?'ready':'loading'};
    });
    const snapshot=status=>publish({images:images.map(photo=>({...photo})),imagesStatus:status});
    snapshot(images.length?'loading':'ready');
    await mapLimited(images,2,async(photo,index)=>{
      if(photo.status!=='ready'){
        try{
          const key=`notice-preview:v1:${version}:${index}`;
          let blob=await readPhotoCache(key);
          if(!(blob instanceof Blob)||!blob.type.startsWith('image/')){
            const original=`notice-original:${version}:${index}`;
            await documentPhotoBlob(sources[index].source,original);
            blob=await compactPhoto(mediaBlobs.get(original));await savePhotoCache(key,blob);
          }
          photo.url=storePhoto(key,blob);photo.status='ready';
        }catch{photo.status='error';}
        snapshot('loading');
      }
    });
    if(images.every(photo=>photo.status==='ready'))await savePhotoCache(manifestKey,{images:images.map(({id,alt,width,height})=>({id,alt,width,height}))});
    return snapshot(images.some(photo=>photo.status==='error')?'error':'ready');
  })().finally(()=>pendingNoticePhotos.delete(version));
  pendingNoticePhotos.set(version,record);
  return record.promise;
}
async function readNoticeSources(file){
  const version=noticeVersion(file);
  if(noticeSources.has(version))return noticeSources.get(version);
  if(pendingNoticeSources.has(version))return pendingNoticeSources.get(version);
  const task=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),CONFIG.requestTimeoutMs);
    let html;
    try{
      const params=new URLSearchParams({key:CONFIG.googleApiKey,mimeType:'text/html'});
      const response=await readPublicResource(`${DRIVE}/files/${encodeURIComponent(file.id)}/export?${params}`,{signal:controller.signal,cache:'no-store',headers:resourceHeaders(file)});
      if(!response.ok)throw new Error('Document images unavailable');
      html=await response.text();
    }finally{clearTimeout(timer);}
    // Template contents stay inert. Never insert the document HTML into the page.
    const template=document.createElement('template');template.innerHTML=html;
    const sources=[...template.content.querySelectorAll('img')].map(element=>{
      const width=parseFloat(element.getAttribute('width')||element.style.width),height=parseFloat(element.getAttribute('height')||element.style.height);
      return {source:documentPhotoSource(element.getAttribute('src')),alt:(element.getAttribute('alt')||element.getAttribute('title')||'').slice(0,500),width:Number.isFinite(width)&&width>0?Math.min(width,20000):0,height:Number.isFinite(height)&&height>0?Math.min(height,20000):0};
    });
    template.innerHTML='';html='';
    noticeSources.set(version,sources);return sources;
  })().finally(()=>pendingNoticeSources.delete(version));
  pendingNoticeSources.set(version,task);return task;
}
function noticesFrom(files){
  return files.filter(f=>!isFolder(f)&&validId(f.id)&&f.name?.trim()!=='content.json').map(file=>{
    const kind=noticeKind(file),stored=kind==='text'?readCached(`notice-document:${file.id}:${file.modifiedTime||''}`):null;
    const photos=noticePhotoCache.get(noticeVersion(file))||{images:[],imagesStatus:file.mimeType==='application/vnd.google-apps.document'?'unloaded':'ready'};
    return {
      id:file.id,title:file.name.trim().replace(/\.(pdf|txt|md|docx?|hwp|hwpx|odt|rtf|png|jpe?g|webp)$/i,''),
      date:noticeDate(file.createdTime),createdTime:file.createdTime||'',modifiedTime:file.modifiedTime||'',kind,mimeType:file.mimeType,resourceKey:file.resourceKey,thumbnailLink:file.thumbnailLink,
      description:file.description||'',url:driveViewUrl(file),bodyStatus:stored||['pdf','file'].includes(kind)?'ready':'unloaded',
      ...(stored?{body:stored.value}:{}),...photos,pinned:false
    };
  }).sort((a,b)=>b.createdTime.localeCompare(a.createdTime)||a.title.localeCompare(b.title,'ko')||a.id.localeCompare(b.id));
}
export async function preloadNotice(notice){
  if(notice.kind!=='text')return notice;
  return {...notice,body:await noticeText(notice),bodyStatus:'ready'};
}
async function loadNotice(notice,onUpdate=()=>{}){
  let detail=notice;
  try{
    if(notice.kind==='text')detail=await preloadNotice(notice);
    else if(notice.kind==='image')detail={...notice,image:(await drivePreview(notice)).url,bodyStatus:'ready'};
  }catch{detail={...notice,bodyStatus:'error'};}
  onUpdate(detail);
  if(notice.mimeType==='application/vnd.google-apps.document'){
    const photos=await noticePhotos(notice,patch=>onUpdate({...detail,...patch}));
    return {...detail,...photos};
  }
  return detail;
}
async function groupContent(base,folders,onUpdate=()=>{},{coverOnly=false}={}) {
  const folder=findFolder(folders,[base.title,...(base.aliases||[]),base.id]);
  if(!folder)return {...base,contentPending:false,mediaPending:false};
  const files=await listDriveFiles(folder.id,folder.resourceKey),content=await getContent(files);
  const imageFiles=files.filter(isImage),coverFile=imageFiles.find(file=>file.id===content.coverFileId)||imageFiles[0];
  const mediaFiles=coverOnly?(coverFile?[coverFile]:[]):files;
  const mediaVersion=JSON.stringify(mediaFiles.filter(isImage).map(file=>[file.id,file.modifiedTime||'']));
  const groupText=(value,fallback)=>{const text=plain(value,fallback);return base.id==='caleb'?text.replaceAll('갈랩세대','갈렙세대'):text;};
  const heading=groupText(content.title,base.title);
  const text={...base,title:base.aliases?.includes(heading.trim())?base.title:heading,description:groupText(content.description,base.description),leader:plain(content.leader,base.leader||''),meeting:groupText(content.meeting,base.meeting),location:groupText(content.location,base.location),audience:groupText(content.audience,base.audience),sample:content.sample===true||!content.description,contentPending:false,mediaPending:true,mediaVersion,image:'',images:[]};
  onUpdate(text);
  const coverId=coverFile?.id;
  const photos=await photosFrom(mediaFiles,(photos,slots)=>onUpdate({...text,image:photos.find(photo=>photo.id===coverId)?.url||'',images:base.id==='saturday-outreach'?slots:photos})),cover=photos.find(f=>f.id===content.coverFileId)||photos[0];
  return {...text,image:cover?cover.url:base.image,images:photos,mediaPending:false,mediaError:photos.length<mediaFiles.filter(isImage).length,imageSample:!cover||content.sample===true||content.imageSample===true};
}
async function mapLimited(items,limit,worker){
  let index=0;const failures=[];
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(index<items.length){const next=index++;try{await worker(items[next],next);}catch(error){failures.push(error);}}
  }));
  if(failures.length)throw failures[0];
}
export async function loadDrive(base,{path=null,onUpdate=()=>{}}={}) {
  if(!CONFIG.googleApiKey)return {status:'unconfigured'};
  const all=path===null,home=path==='';
  const wantsCells=all||path==='cells'||path?.startsWith('cells/');
  const wantsEducation=all||path==='education'||path?.startsWith('education/');
  const wantsBulletins=all||path==='news/bulletins';
  const wantsAlbums=all||home||path==='news/albums';
  const wantsNotices=all||home||path==='news/notices'||path?.startsWith('news/notices/');
  const wantsOutreach=all||path==='mission/saturday-outreach';
  if(!wantsCells&&!wantsEducation&&!wantsBulletins&&!wantsAlbums&&!wantsNotices&&!wantsOutreach)return {status:'idle'};
  const root=await listDriveFiles(CONFIG.driveRootFolderId),result={status:'connected'};
  const publish=patch=>onUpdate({status:'connected',...patch});
  const tasks=[];
  if(wantsOutreach)tasks.push((async()=>{
    const folders=await childFiles(root,['선교','mission']);
    const update=outreach=>{result.outreach=outreach;publish({outreach});};
    const outreach=await groupContent(base.outreach,folders,update);
    update(outreach);
    if(outreach.mediaError)throw new Error('Some outreach photos are unavailable');
  })());
  for(const [wanted,key,names] of [[wantsCells,'cells',['셀모임','cells']],[wantsEducation,'education',['교육공동체','education']]]){
    if(!wanted)continue;
    tasks.push((async()=>{
      const folders=await childFiles(root,names),id=path?.startsWith(key+'/')?path.split('/')[1]:null;
      const groups=base[key].filter(g=>!id||g.id===id);
      result[key]=groups.map(g=>({...g,contentPending:true,mediaPending:true,image:'',images:[]}));
      // A list can show known group names before each introduction and image arrives.
      if(!id)publish({[key]:[...result[key]]});
      await mapLimited(groups,2,async(group,index)=>{
        const update=next=>{result[key][index]=next;publish({[key]:[...result[key]]});};
        try{update(await groupContent(group,folders,update,{coverOnly:key==='cells'}));}
        catch(error){update({...group,contentPending:false,mediaPending:false,loadError:true});throw error;}
      });
    })());
  }
  if(wantsNotices)tasks.push((async()=>{
    const files=await childFiles(root,['공지사항','notices']);
    result.notices=noticesFrom(files);
    publish({notices:result.notices});
    const selectedId=path?.startsWith('news/notices/')?path.split('/')[2]:null;
    const selected=result.notices.find(n=>n.id===selectedId);
    if(selected){
      const update=detail=>{
        result.notices=result.notices.map(n=>n.id===selectedId?detail:n);
        publish({notices:result.notices});
      };
      update(await loadNotice(selected,update));
    }
  })());
  if(wantsBulletins)tasks.push((async()=>{
    const files=await childFiles(root,['주보','bulletins']);
    result.bulletins=files.filter(f=>f.mimeType==='application/pdf'||isImage(f)).map(f=>({id:f.id,title:f.name.replace(/\.[^.]+$/,''),date:f.name.match(/^\d{4}-\d{2}-\d{2}/)?.[0]||f.modifiedTime?.slice(0,10)||'',description:f.description||'',url:driveViewUrl(f)})).sort((a,b)=>b.date.localeCompare(a.date));
    publish({bulletins:result.bulletins});
  })());
  if(wantsAlbums)tasks.push((async()=>{
    const folders=(await childFiles(root,['앨범','albums'])).filter(isFolder);
    result.albums=folders.map(folder=>({id:folder.id,title:folder.name,description:folder.description||'',date:folder.name.match(/^\d{4}-\d{2}-\d{2}/)?.[0]||'',uploadDate:noticeDate(folder.createdTime),image:'',images:[],contentPending:true,mediaPending:true,url:`https://drive.google.com/drive/folders/${folder.id}`}));
    const publishAlbums=()=>publish({albums:[...result.albums].sort((a,b)=>b.date.localeCompare(a.date))});
    publishAlbums();
    await mapLimited(folders,2,async folder=>{
      const index=result.albums.findIndex(a=>a.id===folder.id);
      try{
      const files=await listDriveFiles(folder.id,folder.resourceKey),content=await getContent(files);
      const album={...result.albums[index],title:plain(content.title,folder.name),description:plain(content.description,folder.description||''),date:plain(content.date,folder.name.match(/^\d{4}-\d{2}-\d{2}/)?.[0]||''),contentPending:false};
      result.albums[index]=album;publishAlbums();
      const photos=await photosFrom(files),cover=photos.find(f=>f.id===content.coverFileId)||photos[0];
      result.albums[index]={...album,image:cover?.url||'',images:photos,mediaPending:false,mediaError:!photos.length&&files.some(isImage)};publishAlbums();
      }catch(error){result.albums[index]={...result.albums[index],mediaPending:false,mediaError:true,loadError:true};publishAlbums();throw error;}
    });
    result.albums=result.albums.filter(a=>a.images.length||a.mediaError).sort((a,b)=>b.date.localeCompare(a.date));
    publishAlbums();
  })());
  const completed=await Promise.allSettled(tasks);
  const failed=completed.find(item=>item.status==='rejected');
  if(failed)throw failed.reason;
  return result;
}
export async function loadVideos({jubilee=false,mission=false,playlistId:requestedPlaylist='',kind='video',fresh=false,allPages=false}={}) {
  const type=requestedPlaylist?kind:mission?'mission':jubilee?'jubilee':'video';
  const selectedPlaylist=requestedPlaylist||(mission?CONFIG.missionPlaylistId:jubilee?CONFIG.jubileePlaylistId:CONFIG.youtubeUploadsPlaylistId);
  if(!CONFIG.googleApiKey || (type!=='video'&&!selectedPlaylist))return {status:'unconfigured'};
  const cacheKey=(type==='video'&&!requestedPlaylist?'videos':`${type}:${selectedPlaylist}`)+(allPages?':all':'');
  return cached(cacheKey,async()=>{
    let playlistId=selectedPlaylist;
    if(!playlistId){const data=await request(YOUTUBE,'channels',{part:'contentDetails',id:CONFIG.youtubeChannelId});playlistId=data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;}
    if(!playlistId)throw new Error('Channel uploads playlist unavailable');
    const items=[],seenTokens=new Set();let pageToken='';
    do{
      const response=await request(YOUTUBE,'playlistItems',{part:'snippet,contentDetails',playlistId,maxResults:'50',...(pageToken?{pageToken}:{})});
      items.push(...(response.items||[]));
      pageToken=allPages?(response.nextPageToken||''):'';
      if(pageToken&&seenTokens.has(pageToken))throw new Error('Repeated playlist page');
      if(pageToken)seenTokens.add(pageToken);
    }while(pageToken);
    const videos=items.filter(v=>/^[a-zA-Z0-9_-]{11}$/.test(v.contentDetails?.videoId||'')&&!['Private video','Deleted video'].includes(v.snippet?.title)).map(v=>({id:v.contentDetails.videoId,title:v.snippet.title,date:(v.contentDetails.videoPublishedAt||v.snippet.publishedAt).slice(0,10),description:v.snippet.description||'',type}));
    const filtered=type==='video'?videos.filter(v=>v.title.includes(CONFIG.youtubeSermonKeyword)):videos;
    return {status:'connected',videos:filtered};
  },{fresh});
}

export async function loadVisionVideos() {
  // Wait for the exclusion list before publishing: a slow request must never
  // briefly put the one-minute series in the vision page.
  const [vision,shorts,oneMinute]=await Promise.all([
    loadVideos({playlistId:CONFIG.visionPlaylistId,kind:'vision',fresh:true,allPages:true}),
    loadVideos({playlistId:CONFIG.youtubeShortsPlaylistId,kind:'vision-shorts',fresh:true,allPages:true}),
    loadVideos({playlistId:CONFIG.oneMinutePlaylistId,kind:'one-minute',fresh:true,allPages:true})
  ]);
  if([vision,shorts,oneMinute].some(result=>result.status!=='connected'))throw new Error('Vision video sources unavailable');
  const excluded=new Set(oneMinute.videos.map(video=>video.id));
  const merged=new Map();
  for(const video of [...vision.videos,...shorts.videos]){
    // Also cover new episodes before they are added to the managed playlist.
    if(excluded.has(video.id)||/내\s*삶을\s*바꾸는\s*1\s*분/.test(video.title.normalize('NFC')))continue;
    if(!merged.has(video.id))merged.set(video.id,{...video,type:'vision'});
  }
  return {status:'connected',videos:[...merged.values()].sort((a,b)=>b.date.localeCompare(a.date))};
}
