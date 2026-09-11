/* ───────────────────────────────────────────────────────────────────────────
   The frame the guide is drawn into: the top bar, the deck its screens slide
   through, and the full-screen picture viewer. app.js fills all of it in.

   It lives here rather than in index.html because the guide answers at more
   than one address — `/` is the whole guide, `/connect-account/` is one screen
   of it on its own — and every one of them needs this same frame. Each page is
   then nothing but a head, its name, and these scripts.

   Inserted at the top of the body while the page is still being parsed, so it
   is already there by the time app.js looks for it.
   ─────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  document.body.insertAdjacentHTML(
    'afterbegin',
    [
      '<div class="app is-loading" id="app">',
      '  <header class="topbar">',
      '    <div class="topbar__row">',
      // The brand on the first screen, the way back on every other.
      '      <div class="brand" id="brand">',
      '        <img class="brand__logo" id="brand-logo" src="assets/img/logo.png" alt="" />',
      '        <span class="brand__name" id="brand-name"></span>',
      '      </div>',
      '      <button class="navback" id="back" type="button" hidden>',
      '        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">',
      '          <path d="M4.6 12h13.8" />',
      '          <path d="M13 6.5l5.5 5.5-5.5 5.5" />',
      '        </svg>',
      '        <span id="back-label"></span>',
      '      </button>',
      '      <button class="exit" id="exit" type="button" hidden></button>',
      '    </div>',
      '  </header>',
      '',
      '  <main class="deck" id="deck" tabindex="-1"></main>',
      '',
      '  <footer class="bottombar" id="bottombar" hidden>',
      '    <button class="cta" id="cta" type="button">',
      '      <span id="cta-label"></span>',
      '      <svg class="icon" id="cta-icon" viewBox="0 0 24 24" aria-hidden="true"></svg>',
      '    </button>',
      '  </footer>',
      '</div>',
      '',
      // Full-screen screenshot: pinch, drag or double-tap to zoom.
      '<div class="lightbox" id="lightbox" hidden>',
      '  <img class="lightbox__img" id="lightbox-img" alt="" />',
      '  <button class="lightbox__close" id="lightbox-close" type="button">',
      '    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">',
      '      <path d="M6.2 6.2l11.6 11.6" />',
      '      <path d="M17.8 6.2L6.2 17.8" />',
      '    </svg>',
      '  </button>',
      '  <div class="lightbox__hint">',
      '    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">',
      '      <path d="M9.4 4.6H4.6v4.8" />',
      '      <path d="M14.6 19.4h4.8v-4.8" />',
      '      <path d="M4.6 4.6l5.6 5.6" />',
      '      <path d="M19.4 19.4l-5.6-5.6" />',
      '    </svg>',
      '    <span id="lightbox-hint-text"></span>',
      '  </div>',
      '</div>',
    ].join('\n')
  );
})();
