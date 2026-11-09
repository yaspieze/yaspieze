import Lenis from 'lenis';

/* Small progressive enhancements. Native scrolling and navigation remain usable
   without JavaScript and respect the browser's reduced-motion preference. */
((): void => {
  'use strict';
  // Smooth mouse-wheel movement while keeping touch and reduced-motion native.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let smooth: Lenis | null = null;
  const syncSmoothScroll = (): void => {
    const scrollable = document.documentElement.scrollHeight > window.innerHeight + 2;
    if (reducedMotion.matches || !scrollable) {
      if (smooth) { smooth.destroy(); smooth = null; }
    } else if (!smooth) {
      smooth = new Lenis({ autoRaf: true, smoothWheel: true, syncTouch: false, lerp: 0.085, wheelMultiplier: 0.95, anchors: true });
    }
  };
  syncSmoothScroll();
  window.addEventListener('resize', syncSmoothScroll, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(syncSmoothScroll).observe(document.body);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncSmoothScroll);
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
