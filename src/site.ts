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
  // Locally hosted songs are used instead of hiding a YouTube player. Browsers
  // may block autoplay with sound, so the speaker button starts it on a click.
  type Song = { id: string; title: string; src: string };
  let songs: Song[] = [
    { id: 'k8ASohZN9DE', title: 'Run Away', src: '/fresh/audio/run-away.mp3' },
    { id: '901NBsNnias', title: 'UNDISCLOSED', src: '/fresh/audio/undisclosed.mp3' }
  ];
  const storageKey = 'yaspieze-background-audio';
  type AudioState = { enabled: boolean; track: number; position: number; id?: string };
  let audioState: AudioState = { enabled: true, track: 0, position: 0 };
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object') {
      const state = saved as Partial<AudioState>;
      if (typeof state.enabled === 'boolean') audioState.enabled = state.enabled;
      if (typeof state.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(state.id)) audioState.id = state.id;
      if (Number.isInteger(state.track) && typeof state.track === 'number' && state.track >= 0 && state.track < songs.length) audioState.track = state.track;
      if (typeof state.position === 'number' && Number.isFinite(state.position) && state.position >= 0) audioState.position = state.position;
    }
  } catch { /* Storage is optional. */ }
  const savedTrackId = audioState.id;
  const music = new Audio();
  music.preload = 'none';
  music.volume = 0.08;
  music.src = songs[audioState.track].src;
  const speaker = document.createElement('button');
  speaker.type = 'button';
  speaker.className = 'sound-toggle';
  const soundWidget = document.createElement('div');
  soundWidget.className = 'sound-widget';
  const nowPlaying = document.createElement('span');
  nowPlaying.className = 'now-playing';
  const updateTitle = (): void => { nowPlaying.textContent = `Now Playing: ${songs[audioState.track].title}`; };
  updateTitle();
  const onIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6.8 8.5H4.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.3L11 19V5Z" fill="currentColor"/><path d="M14.5 9a4.2 4.2 0 0 1 0 6m2.7-8.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const offIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6.8 8.5H4.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.3L11 19V5Z" fill="currentColor"/><path d="m15 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const updateSpeaker = (): void => {
    const playing = !music.paused;
    speaker.innerHTML = playing ? onIcon : offIcon;
    speaker.setAttribute('aria-label', playing ? 'Mute background music' : 'Play background music');
    speaker.setAttribute('aria-pressed', String(playing));
  };
  const saveAudio = (): void => {
    if (Number.isFinite(music.currentTime) && music.currentTime > 0) audioState.position = music.currentTime;
    audioState.id = songs[audioState.track].id;
    try { sessionStorage.setItem(storageKey, JSON.stringify(audioState)); } catch { /* Storage is optional. */ }
  };
  let restorePosition = audioState.position;
  music.addEventListener('loadedmetadata', () => {
    if (restorePosition > 0 && Number.isFinite(music.duration) && restorePosition < music.duration) music.currentTime = restorePosition;
    restorePosition = 0;
  });
  music.addEventListener('play', updateSpeaker);
  music.addEventListener('pause', updateSpeaker);
  let lastSaved = 0;
  music.addEventListener('timeupdate', () => { if (Date.now() - lastSaved >= 2000) { lastSaved = Date.now(); saveAudio(); } });
  music.addEventListener('ended', () => {
    audioState.track = (audioState.track + 1) % songs.length; audioState.position = 0; restorePosition = 0;
    music.src = songs[audioState.track].src; updateTitle(); saveAudio();
    if (audioState.enabled) void music.play().catch(updateSpeaker);
  });
  speaker.addEventListener('click', () => {
    if (!music.paused) { audioState.enabled = false; music.pause(); updateSpeaker(); saveAudio(); }
    else { audioState.enabled = true; saveAudio(); void music.play().then(updateSpeaker).catch(updateSpeaker); }
  });
  window.addEventListener('pagehide', saveAudio);
  soundWidget.append(speaker, nowPlaying);
  document.body.append(soundWidget);
  updateSpeaker();
  if (audioState.enabled) void music.play().then(updateSpeaker).catch(updateSpeaker);
  // On an update, start the latest release from the manifest; once playback is
  // underway, finish the current track rather than abruptly interrupting it.
  void fetch('/fresh/audio/playlist.json', { cache: 'no-cache' }).then(response => response.ok ? response.json() : null).then((data: unknown) => {
    if (!data || typeof data !== 'object' || !('tracks' in data) || !Array.isArray(data.tracks)) return;
    const list = data.tracks.filter((item: unknown): item is Song => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Record<string, unknown>;
      return typeof entry.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(entry.id) && typeof entry.title === 'string' && entry.title.length > 0 && entry.title.length <= 200 && typeof entry.src === 'string' && /^\/fresh\/audio\/[A-Za-z0-9_-]+\.mp3$/.test(entry.src);
    });
    if (!list.length) return;
    const currentId = songs[audioState.track].id;
    const savedIndex = savedTrackId ? list.findIndex(song => song.id === savedTrackId) : -1;
    const nextIndex = savedIndex >= 0 ? savedIndex : 0;
    const next = list[nextIndex];
    if (next.id !== currentId || next.src !== songs[audioState.track].src) {
      music.src = next.src;
      if (next.id !== savedTrackId) { audioState.position = 0; restorePosition = 0; }
    }
    songs = list; audioState.track = nextIndex; updateTitle(); saveAudio();
    if (audioState.enabled && music.paused) void music.play().then(updateSpeaker).catch(updateSpeaker);
  }).catch(() => { /* Keep the local fallback playlist if unavailable. */ });
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
        if (!reducedMotion.matches && !document.documentElement.classList.contains('page-exiting')) {
          document.documentElement.classList.add('page-entering');
          window.setTimeout(() => document.documentElement.classList.remove('page-entering'), 650);
        }
      }, Math.max(0, 1100 - (Date.now() - began)));
    };
    if (!image || image.complete) finish();
    else {
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    }
    window.setTimeout(finish, 3000);
  }
  // Only intercept ordinary same-site page changes. In-page anchors, new tabs,
  // downloads, external links and reduced-motion navigation remain native.
  let navigating = false;
  document.addEventListener('click', (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches || navigating) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!target || target.hasAttribute('download') || (target.target && target.target.toLowerCase() !== '_self')) return;
    let next: URL;
    try { next = new URL(target.href, location.href); } catch { return; }
    if (next.origin !== location.origin || !/^https?:$/.test(next.protocol)) return;
    if (next.pathname === location.pathname && next.search === location.search) return;
    event.preventDefault();
    navigating = true;
    document.documentElement.classList.remove('page-entering');
    document.documentElement.classList.add('page-exiting');
    window.setTimeout(() => { window.location.assign(next.href); }, 220);
  });
  window.addEventListener('pageshow', () => {
    navigating = false;
    document.documentElement.classList.remove('page-exiting');
  });
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
