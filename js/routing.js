// Public sections have real HTML entry points; live notice details retain their
// hash URL because their Google document identifiers are not static pages.
export const PUBLIC_PATHS = new Set([
  '', 'about/greeting', 'about/vision', 'about/history', 'about/people',
  'about/organization', 'about/offering', 'directions', 'worship', 'sermons',
  'jubilee', 'one-minute', 'cells', 'education', 'education/infant',
  'education/children', 'education/youth', 'education/young-adult',
  'education/caleb', 'mission/saturday-camp', 'mission/saturday-outreach',
  'mission/overseas', 'news/notices', 'news/bulletins', 'news/albums',
  'news/videos', 'welcome'
]);

function normalizePath(value) {
  const path = value.replace(/^\/+|\/+$/g, '').replace(/\/index\.html$/, '');
  if (path === 'index.html') return '';
  if (path === 'mission') return 'mission/overseas';
  if (path === 'education/adults' || path.startsWith('cells/')) return 'cells';
  return path;
}

export function currentPath(address = window.location) {
  return normalizePath(address.hash?.startsWith('#/') ? address.hash.slice(2) : address.pathname || '');
}

export function routeHref(path) {
  path = normalizePath(path);
  if (PUBLIC_PATHS.has(path)) return path ? `/${path}/` : '/';
  return `/#/${path}`;
}

export function routeFromLink(link) {
  if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return null;
  let address;
  try { address = new URL(link.getAttribute('href'), document.baseURI); } catch { return null; }
  if (address.origin !== window.location.origin) return null;
  // Document anchors, PDFs and external resources keep normal browser behavior.
  if (address.hash && !address.hash.startsWith('#/')) return null;
  const path = currentPath(address);
  return PUBLIC_PATHS.has(path) || /^news\/notices\/[^/]+$/.test(path) ? path : null;
}

export function normalizeRouteLinks(root = document) {
  for (const link of root.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (href.startsWith('#/')) link.setAttribute('href', routeHref(href.slice(2)));
    // With <base href="/">, a bare #main would otherwise jump to the homepage.
    else if (link.classList.contains('skip-link')) link.setAttribute('href', `${window.location.pathname}${window.location.search}#main`);
  }
}

export function canonicalizeCurrentRoute() {
  const path = currentPath();
  if (!PUBLIC_PATHS.has(path)) return;
  const href = routeHref(path) + window.location.search + (window.location.hash === '#main' ? '#main' : '');
  if (window.location.pathname + window.location.search + window.location.hash !== href) history.replaceState(history.state, '', href);
}

export function bindRouteNavigation(onNavigate) {
  let handledAddress = window.location.href;
  function changed() {
    if (handledAddress === window.location.href) return;
    canonicalizeCurrentRoute();
    handledAddress = window.location.href;
    normalizeRouteLinks();
    onNavigate();
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (link?.classList.contains('skip-link')) {
      event.preventDefault();
      document.querySelector('#main')?.focus({preventScroll:true});
      document.querySelector('#main')?.scrollIntoView({behavior:'instant',block:'start'});
      return;
    }
    const path = routeFromLink(link);
    if (path === null) return;
    event.preventDefault();
    const href = routeHref(path);
    if (window.location.pathname + window.location.search + window.location.hash !== href) history.pushState(null, '', href);
    handledAddress = window.location.href;
    normalizeRouteLinks();
    onNavigate();
  });
  window.addEventListener('popstate', changed);
  window.addEventListener('hashchange', changed);
}
