import { CONFIG } from './config.js';

const ready = new Set();
const versions = new WeakMap();
const waiting = new Set();

export function settleResource(key) { ready.add(key); }
export function resetResource(key) { ready.delete(key); }

function skeleton(layout) {
  const lines = '<span class="skeleton-line wide"></span><span class="skeleton-line"></span><span class="skeleton-line short"></span>';
  const image = '<span class="skeleton-image"></span>';
  const card = `<div class="skeleton-card">${image}${lines}</div>`;
  return `<div class="resource-placeholder skeleton-${layout}" aria-hidden="true">${layout === 'detail' || layout === 'video' ? `${image}<div>${lines}${lines}</div>` : layout === 'cards' ? card.repeat(2) : layout === 'image' ? image : `<div>${lines}</div>`.repeat(3)}</div><span class="sr-only" role="status">자료를 불러오는 중입니다.</span>`;
}

export function resource(key, content, layout='rows', alwaysReady=false, pending=false) {
  const loading = pending || (!alwaysReady && Boolean(CONFIG.googleApiKey) && !ready.has(key));
  return `<div class="async-region${loading ? ' is-loading' : ''}" data-resource="${key}" aria-busy="${loading}">${loading ? skeleton(layout) : content}</div>`;
}

function imageReady(img) {
  img.loading = 'eager';
  const loaded = img.complete ? Promise.resolve() : new Promise(resolve => {
    const finish = () => { clearTimeout(timer); img.removeEventListener('load', finish); img.removeEventListener('error', finish); resolve(); };
    const timer = setTimeout(finish, 3500);
    img.addEventListener('load', finish, {once:true});
    img.addEventListener('error', finish, {once:true});
  });
  return loaded.then(() => img.complete && img.naturalWidth && img.decode ? img.decode().catch(() => {}) : undefined);
}

async function reveal(element) {
  observer?.unobserve(element);
  waiting.delete(element);
  await Promise.all([...element.querySelectorAll('img'), ...(element.matches('img') ? [element] : [])].map(imageReady));
  if (element.isConnected) element.classList.add('is-visible');
}
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
}, {threshold:0.05}) : null;

function prepare(region) {
  if (region.getAttribute('aria-busy') === 'true') return;
  const targets = [...region.children].flatMap(element => {
    if (element.matches('.cards, .gallery')) return [...element.children].flatMap(card => [...card.children]);
    if (element.matches('.detail-grid, .sermon-layout, .bulletin-list, .announcement-list, .announcement-article')) return [...element.children];
    return [element];
  });
  // Animate content units independently, so a slow image never delays the text.
  targets.forEach((element, index) => {
    if (element.hasAttribute('data-immediate') || element.matches('[data-resource]') || element.querySelector('[data-resource]')) return;
    element.classList.add('resource-enter');
    element.style.setProperty('--enter-delay', `${Math.min(index, 4) * 65}ms`);
    if (observer) { waiting.add(element); observer.observe(element); }
    else reveal(element);
  });
}

export function bindImages(root) {
  root.querySelectorAll('img[data-fallback]').forEach(img => img.addEventListener('error', () => {
    img.src = './assets/church.png';
    img.alt += ' 사진을 불러올 수 없어 교회 전경으로 표시합니다.';
  }, {once:true}));
}

function structure(region){
  const clone=region.cloneNode(true);
  // Nested data regions own their content, so image/body updates do not replace
  // the surrounding title, card, or navigation.
  for(const child of [...clone.querySelectorAll('[data-resource]')]){
    if(child.isConnected||clone.contains(child))child.replaceWith(document.createComment(child.dataset.resource));
  }
  return clone.innerHTML;
}
function forgetDetached(){
  for(const element of waiting)if(!element.isConnected){observer.unobserve(element);waiting.delete(element);}
}
export function mountResources(root) {
  forgetDetached();bindImages(root);
  const regions=[...(root.matches?.('[data-resource]')?[root]:[]),...root.querySelectorAll('[data-resource]')];
  regions.forEach(region=>versions.set(region,structure(region)));
  regions.forEach(prepare);
}
export function patchResources(root,nextView){
  const nextRegions=new Map([...nextView.querySelectorAll('[data-resource]')].map(el=>[el.dataset.resource,el]));
  function patch(region){
    const next=nextRegions.get(region.dataset.resource);
    if(!next)return;
    if(versions.get(region)!==structure(next)||region.getAttribute('aria-busy')!==next.getAttribute('aria-busy')){
      const active=region.contains(document.activeElement)?document.activeElement:null;
      const identity=active&&['href','data-video','data-album','data-photo'].find(key=>active.hasAttribute(key));
      const value=identity&&active.getAttribute(identity);
      region.innerHTML=next.innerHTML;
      region.classList.toggle('is-loading',next.classList.contains('is-loading'));
      region.setAttribute('aria-busy',next.getAttribute('aria-busy'));
      mountResources(region);
      if(identity)[...region.querySelectorAll(`[${identity}]`)].find(el=>el.getAttribute(identity)===value)?.focus({preventScroll:true});
      return;
    }
    for(const child of region.querySelectorAll('[data-resource]')){
      if(child.parentElement.closest('[data-resource]')===region)patch(child);
    }
  }
  for(const region of root.querySelectorAll('[data-resource]')){
    if(!region.parentElement.closest('[data-resource]'))patch(region);
  }
  const heading=root.querySelector('.page-hero h1'),nextHeading=nextView.querySelector('.page-hero h1');
  if(heading&&nextHeading&&heading.textContent!==nextHeading.textContent)heading.textContent=nextHeading.textContent;
  forgetDetached();
}

document.addEventListener('focusin', event => {
  const element = event.target.closest('.resource-enter');
  if (element) { element.style.setProperty('--enter-delay','0ms'); element.classList.add('is-visible'); }
});
