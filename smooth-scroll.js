/* Smooth discrete mouse-wheel scrolling without changing touch, trackpad,
   keyboard, zoom, nested scrolling, or reduced-motion behavior. */
(function () {
  'use strict';
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var target = 0, frame = 0;
  function cancel() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function nestedScrollable(el, delta) {
    while (el && el !== document.body && el !== document.documentElement) {
      var style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if ((delta < 0 && el.scrollTop > 0) || (delta > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      el = el.parentElement;
    }
    return false;
  }
  function tick() {
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    target = Math.max(0, Math.min(target, max));
    var y = window.scrollY, diff = target - y;
    if (Math.abs(diff) < .5) { window.scrollTo({top: target, behavior: 'instant'}); frame = 0; return; }
    window.scrollTo({top: y + diff * .18, behavior: 'instant'});
    frame = requestAnimationFrame(tick);
  }
  window.addEventListener('wheel', function (e) {
    if (motion.matches || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || Math.abs(e.deltaX) > 0 || !e.deltaY) return;
    /* Leave high-resolution trackpads and pixel-precise wheel input native. */
    if (e.deltaMode === 0 && (Math.abs(e.deltaY) < 100 || !Number.isInteger(e.deltaY))) return;
    var delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (nestedScrollable(e.target, delta)) return;
    e.preventDefault();
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    target = Math.max(0, Math.min((frame ? target : window.scrollY) + delta, max));
    if (!frame) frame = requestAnimationFrame(tick);
  }, {passive:false});
  window.addEventListener('touchstart', cancel, {passive:true});
  window.addEventListener('pointerdown', cancel, {passive:true});
  window.addEventListener('keydown', function (e) { if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].indexOf(e.key) !== -1) cancel(); });
  window.addEventListener('hashchange', cancel);
  if (motion.addEventListener) motion.addEventListener('change', cancel);
})();
