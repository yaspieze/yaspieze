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
