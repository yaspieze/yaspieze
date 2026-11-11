import Lenis from 'lenis';

/* Small progressive enhancements. Native scrolling and navigation remain usable
   without JavaScript and respect the browser's reduced-motion preference. */
((): void => {
  'use strict';
  // Mouse and trackpad smoothing is desktop-only. Phones, tablets and users
  // requesting reduced motion use the browser's native scrolling instead.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopScroll = window.matchMedia('(min-width: 801px) and (hover: hover) and (pointer: fine)');
  let smooth: Lenis | null = null;
  const syncSmoothScroll = (): void => {
    if (reducedMotion.matches || !desktopScroll.matches) {
      if (smooth) { smooth.destroy(); smooth = null; }
    } else if (!smooth) {
      smooth = new Lenis({ autoRaf: true, smoothWheel: true, syncTouch: false, lerp: 0.085, wheelMultiplier: 0.95, anchors: true });
    }
  };
  syncSmoothScroll();
  // Keep one instance for the lifetime of the page. Short-lived layout changes
  // (loading, browser chrome, media and viewport resizes) must not destroy it.
  window.addEventListener('pageshow', () => { smooth?.resize(); });
  reducedMotion.addEventListener('change', syncSmoothScroll);
  desktopScroll.addEventListener('change', syncSmoothScroll);
  // YouTube's unofficial UULF playlist contains regular uploads, not Shorts.
  // Its RSS feed is converted to JSON by rss2json because
  // YouTube's feed does not allow direct cross-origin browser requests.
  const latestLink = document.querySelector<HTMLAnchorElement>('#latestVideo');
  const latestImage = latestLink?.querySelector<HTMLImageElement>('img');
  if (latestLink && latestImage) {
    const feedUrl = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UULFjZ31sAP7v7aXQCpNvdX0lg';
    const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    let checking = false;
    let imageRequest = 0;
    const applyVideo = (id: string, title: string): void => {
      const request = ++imageRequest;
      const setThumbnail = (src: string, fallback?: string): void => {
        const image = new Image();
        image.onload = () => {
          if (request !== imageRequest) return;
          // YouTube can return a tiny placeholder when maxres is unavailable.
          if (image.naturalWidth < 400 && fallback) { setThumbnail(fallback); return; }
          latestImage.src = src;
          latestImage.alt = `Thumbnail: ${title}`;
          latestLink.href = `https://www.youtube.com/watch?v=${id}`;
          latestLink.setAttribute('aria-label', `Watch ${title} on YouTube`);
          try { localStorage.setItem('yaspieze-latest-regular-video', JSON.stringify({ id, title })); } catch { /* Storage is optional. */ }
        };
        image.onerror = () => { if (fallback) setThumbnail(fallback); };
        image.src = src;
      };
      setThumbnail(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    };
    const refreshLatest = async (): Promise<void> => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'ok' || !('items' in data) || !Array.isArray(data.items)) return;
        const entries = data.items.filter((item: unknown): item is { guid: string; title: string; pubDate: string } => {
          if (!item || typeof item !== 'object') return false;
          const entry = item as Record<string, unknown>;
          return typeof entry.guid === 'string' && /^yt:video:[A-Za-z0-9_-]{11}$/.test(entry.guid) && typeof entry.title === 'string' && typeof entry.pubDate === 'string';
        }).sort((a, b) => Date.parse(b.pubDate.replace(' ', 'T') + 'Z') - Date.parse(a.pubDate.replace(' ', 'T') + 'Z'));
        const latest = entries[0];
        if (!latest) return;
        const id = latest.guid.slice('yt:video:'.length);
        applyVideo(id, latest.title);
      } catch {
        // Keep the last known thumbnail and link if the feed is unavailable.
      } finally { checking = false; }
    };
    let latestActivated = false;
    const activateLatest = (): void => {
      if (latestActivated) return;
      latestActivated = true;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('yaspieze-latest-regular-video') || 'null');
      if (saved && typeof saved === 'object' && 'id' in saved && typeof saved.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(saved.id) && 'title' in saved && typeof saved.title === 'string') applyVideo(saved.id, saved.title);
    } catch { /* Storage is optional. */ }
      void refreshLatest();
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); activateLatest(); }
      }, { rootMargin: '700px 0px' });
      observer.observe(latestLink);
    } else activateLatest();
    window.setInterval(() => { if (latestActivated && !document.hidden) void refreshLatest(); }, 15 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (latestActivated && !document.hidden) void refreshLatest(); });
  }
  // A light, playful pointer for mouse users only; touch and reduced motion
  // retain the operating system cursor and never depend on this enhancement.
  const finePointer = window.matchMedia('(min-width: 801px) and (hover: hover) and (pointer: fine)');
  if (finePointer.matches && !reducedMotion.matches) {
    const cursor = document.createElement('div');
    cursor.className = 'play-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="play-cursor-ring"></span><span class="play-cursor-dot"></span>';
    document.body.append(cursor);
    const ring = cursor.querySelector<HTMLElement>('.play-cursor-ring')!;
    const dot = cursor.querySelector<HTMLElement>('.play-cursor-dot')!;
    let x = 0, y = 0, rx = 0, ry = 0, frame = 0, started = false;
    const draw = (): void => {
      rx += (x - rx) * 0.22; ry += (y - ry) * 0.22;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.15) frame = requestAnimationFrame(draw);
      else frame = 0;
    };
    const hide = (): void => { document.documentElement.classList.remove('cursor-active'); cursor.classList.remove('is-visible'); };
    window.addEventListener('pointermove', (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches || !finePointer.matches) { hide(); return; }
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, iframe, [contenteditable="true"]')) { hide(); return; }
      x = event.clientX; y = event.clientY;
      if (!started) { rx = x; ry = y; started = true; }
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      cursor.classList.toggle('is-link', !!target?.closest('a, button, summary, [role="button"]'));
      cursor.classList.add('is-visible'); document.documentElement.classList.add('cursor-active');
      if (!frame) frame = requestAnimationFrame(draw);
    }, { passive: true });
    document.addEventListener('pointerout', (event: PointerEvent) => { if (!event.relatedTarget) hide(); });
    window.addEventListener('blur', hide);
    reducedMotion.addEventListener('change', hide);
    finePointer.addEventListener('change', hide);
  }
  // Soft pointer-following light on buttons, with no dependency on JS to click.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion.matches) {
    document.querySelectorAll<HTMLElement>('.button, .nav-social a').forEach(button => {
      button.addEventListener('pointermove', (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
        const rect = button.getBoundingClientRect();
        button.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
        button.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  }
  const loader = document.getElementById('bootLoader');
  if (loader && document.documentElement.classList.contains('boot-loading')) {
    const image = loader.querySelector<HTMLImageElement>('img');
    const began = Date.now();
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      window.setTimeout(() => {
        loader.classList.add('boot-done');
      }, Math.max(0, 1100 - (Date.now() - began)));
    };
    if (!image || image.complete) finish();
    else {
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    }
    window.setTimeout(finish, 3000);
  }
  // A small hysteresis prevents the header from flickering near the threshold.
  const updateNavigation = (): void => {
    if (window.scrollY <= 12) document.documentElement.classList.add('nav-is-collapsed');
    else if (window.scrollY >= 64) document.documentElement.classList.remove('nav-is-collapsed');
  };
  window.addEventListener('scroll', updateNavigation, { passive: true });
  updateNavigation();
  document.querySelectorAll<HTMLDetailsElement>('.simple-menu').forEach((menu) => {
    menu.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.addEventListener('click', () => { menu.open = false; });
    });
    menu.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector<HTMLElement>('summary')?.focus();
      }
    });
  });
})();
