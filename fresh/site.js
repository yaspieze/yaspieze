"use strict";
(() => {
    'use strict';
    const root = document.documentElement;
    const loader = document.getElementById('loader');
    if (loader) {
        root.classList.add('loading');
        const started = Date.now();
        let finished = false;
        const reveal = () => {
            if (finished)
                return;
            finished = true;
            window.setTimeout(() => {
                loader.classList.add('done');
                root.classList.remove('loading');
            }, Math.max(0, 650 - (Date.now() - started)));
        };
        const images = Array.from(document.images).map((image) => {
            if (image.complete)
                return Promise.resolve();
            return new Promise((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
            });
        });
        const pageLoaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
        const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
        void Promise.all([Promise.all(images), fonts, pageLoaded]).then(reveal, reveal);
        window.setTimeout(reveal, 9000);
    }
    const nav = document.getElementById('nav');
    const menuToggle = document.getElementById('menuToggle');
    if (nav && menuToggle) {
        const closeMenu = () => {
            nav.classList.remove('menu-open');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', 'Open navigation');
        };
        menuToggle.addEventListener('click', () => {
            if (menuToggle.getAttribute('aria-expanded') === 'true')
                closeMenu();
            else {
                nav.classList.add('menu-open');
                menuToggle.setAttribute('aria-expanded', 'true');
                menuToggle.setAttribute('aria-label', 'Close navigation');
            }
        });
        document.querySelectorAll('#mobileMenu a').forEach((link) => link.addEventListener('click', closeMenu));
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape')
            closeMenu(); });
    }
    const topics = [
        { kicker: 'Original music', title: 'A different way to hear a story.', text: 'I love taking a story I can’t stop thinking about and finding a way to make it into a song.', label: 'Explore the videos ↗', url: 'https://www.youtube.com/@yaspieze/videos' },
        { kicker: 'Theme songs', title: 'Familiar worlds. A new sound.', text: 'Sometimes a character or a game inspires a song of its own. Those are some of my favorite ones to make.', label: 'Listen on YouTube ↗', url: 'https://www.youtube.com/@yaspieze/videos' },
        { kicker: 'Stories & worlds', title: 'Every world has a song.', text: 'A tiny detail, a favorite character, a scene that hits just right: any of it can be the start of a song.', label: 'Get to know Yaspieze ↑', url: '#about' },
        { kicker: 'Community', title: 'It’s better together.', text: 'If one of my songs means something to you, I’d love to hear about it in the comments.', label: 'Visit the channel ↗', url: 'https://www.youtube.com/@yaspieze' }
    ];
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const panel = document.getElementById('topicPanel');
    const kicker = document.getElementById('topicKicker');
    const title = document.getElementById('topicTitle');
    const text = document.getElementById('topicText');
    const topicLink = document.querySelector('#topicLink');
    if (tabs.length === topics.length && panel && kicker && title && text && topicLink) {
        const select = (index, focus) => {
            tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(index === i)); tab.tabIndex = index === i ? 0 : -1; });
            panel.setAttribute('aria-labelledby', tabs[index].id);
            kicker.textContent = topics[index].kicker;
            title.textContent = topics[index].title;
            text.textContent = topics[index].text;
            topicLink.textContent = topics[index].label;
            topicLink.href = topics[index].url;
            if (focus) {
                tabs[index].focus();
                tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        };
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => select(index, false));
            tab.addEventListener('keydown', (event) => {
                let next;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                    next = (index + 1) % tabs.length;
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                    next = (index + tabs.length - 1) % tabs.length;
                else if (event.key === 'Home')
                    next = 0;
                else if (event.key === 'End')
                    next = tabs.length - 1;
                else
                    return;
                event.preventDefault();
                select(next, true);
            });
        });
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = 0, frame = 0;
    const cancel = () => { if (frame)
        cancelAnimationFrame(frame); frame = 0; };
    const nestedScrollable = (start, delta) => {
        let el = start instanceof Element ? start : null;
        while (el && el !== document.body && el !== document.documentElement) {
            const style = getComputedStyle(el);
            if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1 &&
                ((delta < 0 && el.scrollTop > 0) || (delta > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)))
                return true;
            el = el.parentElement;
        }
        return false;
    };
    const tick = () => {
        target = Math.max(0, Math.min(target, document.documentElement.scrollHeight - window.innerHeight));
        const y = window.scrollY, diff = target - y;
        if (Math.abs(diff) < .5) {
            window.scrollTo({ top: target, behavior: 'instant' });
            frame = 0;
            return;
        }
        window.scrollTo({ top: y + diff * .18, behavior: 'instant' });
        frame = requestAnimationFrame(tick);
    };
    window.addEventListener('wheel', (event) => {
        if (motion.matches || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || Math.abs(event.deltaX) > 0 || !event.deltaY)
            return;
        if (event.deltaMode === 0 && (Math.abs(event.deltaY) < 100 || !Number.isInteger(event.deltaY)))
            return;
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
        if (nestedScrollable(event.target, delta))
            return;
        event.preventDefault();
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        target = Math.max(0, Math.min((frame ? target : window.scrollY) + delta, max));
        if (!frame)
            frame = requestAnimationFrame(tick);
    }, { passive: false });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('pointerdown', cancel, { passive: true });
    window.addEventListener('keydown', (event) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        cancel(); });
    window.addEventListener('hashchange', cancel);
    if (motion.addEventListener)
        motion.addEventListener('change', cancel);
})();
