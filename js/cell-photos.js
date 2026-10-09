const INTERVAL = 5000;
const FADE_DURATION = 800;
const active = new Map();

function createSlideshow(host, slides) {
  const events = new AbortController();
  const ready = slides.map(() => false);
  let index = 0;
  let leavingTimer = null;
  let destroyed = false;

  function prepare(slide) {
    const image = slide.matches('img') ? slide : slide.querySelector('img');
    if (!image) return Promise.resolve(false);
    image.loading = 'eager';
    image.draggable = false;
    if (image.decode) {
      return image.decode().then(() => image.naturalWidth > 0).catch(() => false);
    }
    if (image.complete) return Promise.resolve(image.naturalWidth > 0);
    return new Promise(resolve => {
      const finish = () => {
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        events.signal.removeEventListener('abort', cancel);
        resolve(image.naturalWidth > 0);
      };
      const cancel = () => {
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        resolve(false);
      };
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
      events.signal.addEventListener('abort', cancel, { once: true });
    });
  }

  slides.forEach((slide, i) => {
    slide.classList.remove('is-leaving');
    slide.classList.toggle('is-active', i === 0);
    slide.setAttribute('aria-hidden', String(i !== 0));
    // Decode the local previews before they become visible.
    prepare(slide).then(loaded => {
      if (!destroyed) ready[i] = loaded;
    });
  });

  function advance() {
    if (destroyed) return;
    for (let offset = 1; offset < slides.length; offset++) {
      const nextIndex = (index + offset) % slides.length;
      if (!ready[nextIndex]) continue;
      const previous = slides[index];
      const next = slides[nextIndex];
      clearTimeout(leavingTimer);
      slides.forEach(slide => slide.classList.remove('is-leaving'));
      previous.classList.replace('is-active', 'is-leaving');
      next.classList.add('is-active');
      index = nextIndex;
      slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== index)));
      leavingTimer = setTimeout(() => {
        previous.classList.remove('is-leaving');
        leavingTimer = null;
      }, FADE_DURATION);
      return;
    }
  }

  // Interacting with a card never changes the automatic cadence.
  const timer = slides.length > 1 ? setInterval(advance, INTERVAL) : null;
  return {
    destroy() {
      destroyed = true;
      clearInterval(timer);
      clearTimeout(leavingTimer);
      events.abort();
    }
  };
}

export function syncCellPhotos(root = document) {
  const hosts = [...root.querySelectorAll('[data-cell-slideshow]')];
  if (root.matches?.('[data-cell-slideshow]')) hosts.unshift(root);
  const current = new Set(hosts);
  for (const [host, slideshow] of active) {
    if (current.has(host)) continue;
    slideshow.destroy();
    active.delete(host);
  }
  for (const host of hosts) {
    if (active.has(host)) continue;
    const slides = [...host.querySelectorAll('[data-cell-slide]')];
    if (slides.length) active.set(host, createSlideshow(host, slides));
  }
}
