// Cache only versioned photo previews. Drive metadata is still read on every visit.
const databaseName='sejong-hana-photo-previews-v1';
let databasePromise;
function database(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise(resolve=>{
  try{
   const request=indexedDB.open(databaseName,1);
   request.onupgradeneeded=()=>{
    const store=request.result.createObjectStore('photos',{keyPath:'key'});
    store.createIndex('savedAt','savedAt');
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=request.onblocked=()=>resolve(null);
  }catch{resolve(null);}
 });
 return databasePromise;
}
export async function readPhotoCache(key){
 const db=await database();if(!db)return null;
 return new Promise(resolve=>{
  try{
   const request=db.transaction('photos').objectStore('photos').get(key);
   request.onsuccess=()=>resolve(request.result?.value??null);
   request.onerror=()=>resolve(null);
  }catch{resolve(null);}
 });
}
export async function savePhotoCache(key,value){
 const db=await database();if(!db)return;
 await new Promise(resolve=>{
  try{
   const transaction=db.transaction('photos','readwrite'),store=transaction.objectStore('photos');
   store.put({key,value,savedAt:Date.now(),bytes:value instanceof Blob?value.size:1024});
   const entries=[];const cursor=store.index('savedAt').openCursor();
   cursor.onsuccess=()=>{
    const item=cursor.result;
    if(item){entries.push({key:item.primaryKey,bytes:item.value.bytes||0});item.continue();return;}
    let bytes=entries.reduce((sum,item)=>sum+item.bytes,0),count=entries.length;
    for(const entry of entries){
     if(count<=80&&bytes<=32*1024*1024)break;
     store.delete(entry.key);count--;bytes-=entry.bytes;
    }
   };
   transaction.oncomplete=transaction.onerror=transaction.onabort=()=>resolve();
  }catch{resolve();}
 });
}
export async function compactPhoto(blob){
 // Resizing after reception saves later visits and decoding work, not the first transfer.
 let bitmap;
 try{
  bitmap=await createImageBitmap(blob);
  const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  const preview=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.78));
  return preview&&(scale<1||preview.size<blob.size)?preview:blob;
 }catch{return blob;}finally{bitmap?.close();}
}
