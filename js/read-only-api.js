// A guard against accidental writes in this client, not an authorization boundary.
// Google enforces access: use only a standard API key and publicly readable files.
export function readPublicResource(input, options={}) {
  if(typeof input!=='string')throw new TypeError('A public resource URL is required');
  if((options.method&&options.method.toUpperCase()!=='GET')||options.body!=null||
    (options.credentials&&options.credentials!=='omit'))throw new Error('Only anonymous read requests are allowed');

  const url=new URL(input);
  const https=url.protocol==='https:'&&!url.username&&!url.password&&!url.port;
  const drive=https&&url.hostname==='www.googleapis.com'&&/^\/drive\/v3\/files(?:\/[a-zA-Z0-9_-]+(?:\/export)?)?$/.test(url.pathname);
  const youtube=https&&url.hostname==='www.googleapis.com'&&/^\/youtube\/v3\/(?:channels|playlistItems)$/.test(url.pathname);
  const image=https&&(url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com'));
  const inlineImage=/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(input);
  if(!drive&&!youtube&&!image&&!inlineImage)throw new Error('Unsupported public resource');
  if([...url.searchParams.keys()].some(key=>/^(?:access_token|oauth_token|_method|method|\$httpmethod|uploadType)$/i.test(key)))throw new Error('Authentication and write overrides are not allowed');

  const headers=new Headers(options.headers);
  for(const name of headers.keys()){
    if(!drive||name!=='x-goog-drive-resource-keys')throw new Error('Unsupported read request header');
  }
  return fetch(url.href,{
    method:'GET',credentials:'omit',headers,
    signal:options.signal,cache:options.cache??'no-store',
    ...(options.referrerPolicy?{referrerPolicy:options.referrerPolicy}:{}),
  });
}
