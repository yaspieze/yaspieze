"use strict";
(() => {
    'use strict';
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
