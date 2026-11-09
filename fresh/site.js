"use strict";
(() => {
    'use strict';
    const loader = document.getElementById('bootLoader');
    if (loader && document.documentElement.classList.contains('boot-loading')) {
        const image = loader.querySelector('img');
        const began = Date.now();
        let finished = false;
        const finish = () => {
            if (finished)
                return;
            finished = true;
            window.setTimeout(() => {
                loader.classList.add('boot-done');
            }, Math.max(0, 1100 - (Date.now() - began)));
        };
        if (!image || image.complete)
            finish();
        else {
            image.addEventListener('load', finish, { once: true });
            image.addEventListener('error', finish, { once: true });
        }
        window.setTimeout(finish, 3000);
    }
    const updateNavigation = () => {
        document.documentElement.classList.toggle('nav-is-collapsed', window.scrollY < 40);
    };
    window.addEventListener('scroll', updateNavigation, { passive: true });
    updateNavigation();
    document.querySelectorAll('.simple-menu').forEach((menu) => {
        menu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => { menu.open = false; });
        });
        menu.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && menu.open) {
                menu.open = false;
                menu.querySelector('summary')?.focus();
            }
        });
    });
})();
