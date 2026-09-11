/* ───────────────────────────────────────────────────────────────────────────
   InvisChat — how the app works
   A small stack of screens, built from content.js and translated by i18n.js.
   The first one asks what the user wants to know; every answer is one tap
   away, and the way back is always the same.

   It answers at more than one address. `/` is the whole guide; a folder of
   its own — `/connect-account/` — is one screen of it, standing alone, for a
   link that should open there and nowhere else. Such a page says which screen
   it is in `window.GUIDE_SCREEN`, and has nothing behind it: leaving it leaves
   the page rather than falling back to the question.

   Query parameters
     lang=en|tr|de|id|es|pt|ar|fr|ms|af|hi   what language to read it in
     full=1|0        1 (default) shows everything, 0 only connecting
     platform=android|ios    which recordings to show; read off the browser
                             when the app does not say
     screen=<id>     open on a screen other than home — for a support link
     mode=guide|onboarding   onboarding offers "Skip" and ends on "Get started"
     theme=light|dark        defaults to the device setting

   Inside the app it also talks to Flutter: it reports where the user is over
   the `AppBridge` channel, and Flutter drives it through `window.Guide`.
   Opened in a plain browser, both simply do nothing.
   ─────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var I18N = window.GUIDE_I18N || {};
  var CONTENT = window.GUIDE_CONTENT || { screens: {} };
  var ICONS = window.GUIDE_ICONS || {};
  var APP_NAME = window.GUIDE_APP_NAME || 'InvisChat';

  var RTL_LANGUAGES = ['ar'];
  var FALLBACK_LANG = 'en';
  /** How long a screen takes to slide. Kept in step with style.css. */
  var TRANSITION = 340;

  // ── Parameters ──────────────────────────────────────────────────────────

  var params = new URLSearchParams(window.location.search);

  function flag(name, fallback) {
    var raw = params.get(name);
    if (raw === null) return fallback;
    return raw !== '0' && raw !== 'false' && raw !== 'no';
  }

  var lang = pickLanguage(params.get('lang'));
  var isRtl = RTL_LANGUAGES.indexOf(lang) !== -1;
  var isOnboarding = (params.get('mode') || 'guide') === 'onboarding';
  var showAll = flag('full', true);
  var platform = pickPlatform(params.get('platform'));

  function pickLanguage(requested) {
    var known = Object.keys(I18N.skip || {});
    var wanted = [requested, navigator.language, (navigator.languages || [])[0]];
    for (var i = 0; i < wanted.length; i++) {
      if (!wanted[i]) continue;
      var code = String(wanted[i]).toLowerCase().split(/[-_]/)[0];
      if (known.indexOf(code) !== -1) return code;
    }
    return FALLBACK_LANG;
  }

  /**
   * Which phone this is being read on: it decides which recording is shown,
   * and can hide a block or an option that only applies to one of them.
   *
   * The app says so in the URL. It has not always done, and phones keep old
   * versions for a long time, so the browser's own word is the fallback — and
   * a desktop browser, which is neither, previews the Android guide.
   */
  function pickPlatform(requested) {
    var wanted = String(requested || '').toLowerCase();
    if (wanted === 'ios' || wanted === 'android') return wanted;

    var agent = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(agent)) return 'ios';
    // An iPad calls itself a Mac; a Mac with a touch screen is an iPad.
    if (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1) return 'ios';
    if (/Android/i.test(agent)) return 'android';
    return 'android';
  }

  /** The translation for a string id, falling back to English. */
  function t(id) {
    var entry = I18N[id];
    if (!entry) return '';
    var value = entry[lang] || entry[FALLBACK_LANG] || '';
    return value.indexOf('{app}') === -1 ? value : value.split('{app}').join(APP_NAME);
  }

  function icon(name, extraClass) {
    var body = ICONS[name] || '';
    return '<svg class="icon ' + (extraClass || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function remove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  // ── The bridge to the app ───────────────────────────────────────────────

  var Bridge = {
    // Looked up on every call rather than captured once: the app installs the
    // channel before the page runs, but a late one still works.
    get available() {
      return !!(window.AppBridge && typeof window.AppBridge.postMessage === 'function');
    },
    post: function (message) {
      if (!this.available) return;
      try {
        window.AppBridge.postMessage(JSON.stringify(message));
      } catch (e) {
        /* the app is gone — nothing to do */
      }
    },
  };

  // ── Which screens exist ─────────────────────────────────────────────────

  var screens = CONTENT.screens || {};
  var HOME = CONTENT.home || 'home';

  /** A screen, or nothing when this build of the app does not include it. */
  function screenDef(id) {
    var def = screens[id];
    if (!def) return null;
    return !showAll && def.full ? null : def;
  }

  /** The items of a block, minus what this build and this phone do not show. */
  function visible(items) {
    return (items || []).filter(function (item) {
      return (showAll || !item.full) && applies(item);
    });
  }

  /** Whether something marked for one platform belongs on this one. */
  function applies(thing) {
    return !thing.platform || thing.platform === platform;
  }

  var total = Object.keys(screens).filter(function (id) {
    return !!screenDef(id);
  }).length;

  /**
   * The one screen this page is, when it is a page of its own — the id the
   * HTML declares in `window.GUIDE_SCREEN`. Null on the guide itself, and null
   * again when this build of the app does not include that screen, which
   * leaves the whole guide rather than an empty page.
   */
  var ownScreen = (function () {
    var id = window.GUIDE_SCREEN;
    return typeof id === 'string' && screenDef(id) ? id : null;
  })();

  /** Where the deck starts: this page's own screen, or the question. */
  var firstScreen = ownScreen || HOME;

  // ── Theme ───────────────────────────────────────────────────────────────

  function applyTheme(theme) {
    var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  var themeParam = params.get('theme');
  applyTheme(themeParam);
  if (!themeParam && window.matchMedia) {
    var query = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { applyTheme(null); };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  }

  // ── The videos ──────────────────────────────────────────────────────────

  // Whether a recording is really there. Asked once, in the background, so a
  // guide whose videos have not been uploaded yet shows no button that does
  // nothing — and so the button is already decided by the time it is reached.
  var videos = {};

  /** A recording's path, with {platform} filled in for the phone reading it. */
  function videoSrc(block) {
    if (!block || !block.src) return '';
    return block.src.split('{platform}').join(platform);
  }

  function findVideos() {
    Object.keys(screens).forEach(function (id) {
      (screens[id].blocks || []).forEach(function (block) {
        if (block.type !== 'video' || !applies(block)) return;
        var src = videoSrc(block);
        if (!src || src in videos) return;
        videos[src] = undefined;
        probe(src, function (found) {
          videos[src] = found;
          // A screen already on the page catches up with the answer.
          Array.prototype.forEach.call(document.querySelectorAll('.video'), function (card) {
            if (card.getAttribute('data-src') !== src) return;
            if (found) card.hidden = false;
            else remove(card);
          });
        });
      });
    });
  }

  function probe(src, done) {
    // Opened from a file:// path there is nothing to ask, so trust the content.
    if (window.location.protocol === 'file:' || typeof window.fetch !== 'function') {
      done(true);
      return;
    }
    window
      .fetch(src, { method: 'HEAD' })
      .then(function (response) { done(!!response.ok); })
      .catch(function () { done(false); });
  }

  /** Swaps the button for the player and starts it. */
  function playVideo(button) {
    var card = button.parentNode;
    var src = card.getAttribute('data-src');

    var video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.preload = 'auto';
    // Attributes as well as properties: older WebViews only read these.
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.addEventListener('error', function () {
      card.innerHTML = '<p class="video__error">' + escapeHtml(t('video_error')) + '</p>';
    });

    var frame = document.createElement('div');
    frame.className = 'video__player';
    frame.appendChild(video);
    card.innerHTML = '';
    card.appendChild(frame);

    var started = video.play();
    if (started && started.catch) started.catch(function () { /* the controls are there */ });
  }

  // ── Drawing a screen ────────────────────────────────────────────────────

  var app = document.getElementById('app');
  var deck = document.getElementById('deck');
  var brand = document.getElementById('brand');
  var navBack = document.getElementById('back');
  var exitButton = document.getElementById('exit');
  var bottomBar = document.getElementById('bottombar');
  var cta = document.getElementById('cta');
  var ctaLabel = document.getElementById('cta-label');
  var ctaIcon = document.getElementById('cta-icon');

  function cardIcon(name) {
    return '<span class="card__icon">' + icon(name) + '</span>';
  }

  function shot(image, titleId) {
    if (!image) return '';
    return (
      '<button class="shot" type="button" data-shot="' + escapeHtml(image) + '" aria-label="' + escapeHtml(t('tap_enlarge')) + '">' +
      '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(titleId ? t(titleId) : '') + '" decoding="async" loading="lazy">' +
      '<span class="shot__hint">' + icon('zoom-in') + escapeHtml(t('tap_zoom')) + '</span>' +
      '</button>'
    );
  }

  function renderOptions(block) {
    var items = visible(block.items);
    if (!items.length) return '';
    return (
      (block.label ? '<p class="options__label">' + escapeHtml(t(block.label)) + '</p>' : '') +
      '<div class="options">' +
      items
        .map(function (item) {
          return (
            '<button class="option" type="button" data-go="' + escapeHtml(item.go) + '">' +
            cardIcon(item.icon) +
            '<span class="option__text">' +
            '<span class="option__title card__title">' + escapeHtml(t(item.title)) + '</span>' +
            (item.desc ? '<span class="card__desc">' + escapeHtml(t(item.desc)) + '</span>' : '') +
            '</span>' +
            '<span class="option__go">' + icon('chevron') + '</span>' +
            '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderTrust(block) {
    return (
      '<section class="trust">' +
      '<h3 class="trust__head">' + icon(block.icon || 'shield-check') + '<span>' + escapeHtml(t(block.title)) + '</span></h3>' +
      block.items
        .map(function (item) {
          return (
            '<div class="trust__item">' +
            icon(item.icon) +
            '<div><p class="trust__title">' + escapeHtml(t(item.title)) + '</p>' +
            '<p class="trust__desc">' + escapeHtml(t(item.desc)) + '</p></div>' +
            '</div>'
          );
        })
        .join('') +
      '</section>'
    );
  }

  function renderVideo(block) {
    // Hidden until the file is known to be there; see findVideos().
    var src = videoSrc(block);
    if (!src || videos[src] === false) return '';
    return (
      '<div class="video" data-src="' + escapeHtml(src) + '"' + (videos[src] === true ? '' : ' hidden') + '>' +
      '<button class="video__button" type="button" data-video="1">' +
      '<span class="video__play">' + icon('play') + '</span>' +
      '<span class="option__text">' +
      '<span class="video__title">' + escapeHtml(t('watch_video')) + '</span>' +
      '<span class="card__desc">' + escapeHtml(t('watch_video_desc')) + '</span>' +
      '</span>' +
      '</button>' +
      '</div>'
    );
  }

  function renderSteps(block) {
    return (
      '<ol class="steps">' +
      block.items
        .map(function (item, i) {
          return (
            '<li class="step">' +
            '<span class="step__num">' + (i + 1) + '</span>' +
            '<div class="step__body">' +
            '<h3 class="card__title">' + escapeHtml(t(item.title)) + '</h3>' +
            (item.desc ? '<p class="card__desc">' + escapeHtml(t(item.desc)) + '</p>' : '') +
            shot(item.image, item.title) +
            '</div>' +
            '</li>'
          );
        })
        .join('') +
      '</ol>'
    );
  }

  function renderList(block) {
    return (
      '<div class="list">' +
      block.items
        .map(function (item) {
          return (
            '<article class="card">' +
            cardIcon(item.icon) +
            '<div class="list__text">' +
            '<h3 class="card__title">' + escapeHtml(t(item.title)) + '</h3>' +
            (item.desc ? '<p class="card__desc">' + escapeHtml(t(item.desc)) + '</p>' : '') +
            shot(item.image, item.title) +
            '</div>' +
            '</article>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderGrid(block) {
    return (
      '<div class="grid">' +
      block.items
        .map(function (item) {
          return '<article class="card">' + cardIcon(item.icon) + '<h3 class="card__title">' + escapeHtml(t(item.title)) + '</h3></article>';
        })
        .join('') +
      '</div>'
    );
  }

  function renderNote(block) {
    return (
      '<div class="note">' +
      icon(block.icon || 'bulb') +
      '<div><p class="note__title">' + escapeHtml(t(block.title)) + '</p>' +
      '<p class="note__desc">' + escapeHtml(t(block.desc)) + '</p></div>' +
      '</div>'
    );
  }

  function renderDone() {
    return (
      '<div class="done"><button class="cta" type="button" data-done="1">' +
      '<span>' + escapeHtml(t('got_it')) + '</span>' + icon('check') +
      '</button></div>'
    );
  }

  function renderBlock(block) {
    if (!applies(block)) return '';
    switch (block.type) {
      case 'options': return renderOptions(block);
      case 'trust': return renderTrust(block);
      case 'video': return renderVideo(block);
      case 'steps': return renderSteps(block);
      case 'list': return renderList(block);
      case 'grid': return renderGrid(block);
      case 'shot': return '<div class="block--shot">' + shot(block.image, block.title) + '</div>';
      case 'note': return renderNote(block);
      case 'done': return renderDone();
      default: return '';
    }
  }

  function renderScreen(id, def) {
    var section = document.createElement('section');
    section.className = 'screen';
    section.setAttribute('data-tone', def.tone || 'primary');
    section.setAttribute('data-screen', id);
    section.setAttribute('aria-label', t(def.title));
    section.innerHTML =
      '<div class="screen__inner">' +
      '<header class="screen__header">' +
      (def.icon ? '<div class="screen__badge">' + icon(def.icon) + '</div>' : '') +
      (def.kicker ? '<span class="screen__kicker">' + escapeHtml(t(def.kicker)) + '</span>' : '') +
      '<h2 class="screen__title">' + escapeHtml(t(def.title)) + '</h2>' +
      (def.subtitle ? '<p class="screen__subtitle">' + escapeHtml(t(def.subtitle)) + '</p>' : '') +
      '</header>' +
      '<div class="screen__body">' + (def.blocks || []).map(renderBlock).join('') + '</div>' +
      '</div>';

    // A screenshot that never arrives leaves the step without a hole in it.
    Array.prototype.forEach.call(section.querySelectorAll('.shot img'), function (img) {
      img.addEventListener('error', function () {
        remove(img.closest ? img.closest('.shot') : img.parentNode);
      });
    });
    return section;
  }

  // ── Moving between screens ──────────────────────────────────────────────

  var stack = [];

  // One slide at a time. Two taps on the same card while it is still opening
  // would otherwise stack the same screen twice, and the way back with it.
  var sliding = false;

  function startSliding() {
    sliding = true;
    window.setTimeout(function () { sliding = false; }, TRANSITION);
  }

  function push(id, animate) {
    var def = screenDef(id);
    if (!def) return false;
    if (animate !== false) {
      if (sliding) return false;
      startSliding();
    }

    var below = stack[stack.length - 1];
    var el = renderScreen(id, def);
    if (animate !== false) el.classList.add('is-ahead');
    deck.appendChild(el);
    if (animate !== false) {
      void el.offsetWidth; // land the start pose, then animate away from it
      el.classList.remove('is-ahead');
    }

    if (below) {
      below.el.classList.add('is-behind');
      // Out of the way, and then out of the reading order altogether.
      below.timer = window.setTimeout(function () { below.el.classList.add('is-hidden'); }, TRANSITION);
    }

    stack.push({ id: id, el: el });
    onScreenChanged();
    return true;
  }

  function pop() {
    if (stack.length < 2 || sliding) return false;
    startSliding();
    var top = stack.pop();
    var below = stack[stack.length - 1];

    window.clearTimeout(below.timer);
    below.el.classList.remove('is-hidden', 'is-behind');
    top.el.classList.add('is-ahead');
    window.setTimeout(function () { remove(top.el); }, TRANSITION);

    onScreenChanged();
    return true;
  }

  /**
   * Straight back to the bottom of the deck, however deep the user went: the
   * question on the guide, this page's own screen on a page of its own.
   */
  function goHome() {
    if (sliding) return false;
    while (stack.length > 2) {
      var middle = stack.splice(stack.length - 2, 1)[0];
      window.clearTimeout(middle.timer);
      remove(middle.el);
    }
    return pop();
  }

  function onScreenChanged() {
    // The bottom of the deck: the question on the guide, and on a page of its
    // own the screen that page is. Either way there is nothing behind it.
    var atFirst = stack.length <= 1;
    brand.hidden = !atFirst;
    navBack.hidden = atFirst;
    // The button that closes the guide, which only the app can act on. The
    // walkthrough has always offered it; a page of its own, read in a browser,
    // has nobody to tell — so it offers nothing to press.
    bottomBar.hidden = !atFirst || (!!ownScreen && !Bridge.available);

    // `index` is how deep the user is, which is what the app steers its back
    // gesture by. `last` is answered in finish(), below.
    Bridge.post({ type: 'page', index: stack.length - 1, last: false, total: total });
  }

  function finish(reason) {
    // The app logs the walkthrough as completed on a page that reports itself
    // the last one. Nothing is last in a guide the user steers, so the moment
    // that counts is closing it on the button — never a skip, which is not a
    // walkthrough completed. The index has to differ from the one the app saw
    // last for it to read `last` at all.
    if (reason !== 'skip' && !ownScreen) Bridge.post({ type: 'page', index: stack.length, last: true, total: total });
    Bridge.post({ type: 'finish', reason: reason, index: stack.length - 1 });
  }

  // ── Wiring ──────────────────────────────────────────────────────────────

  function wire() {
    deck.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var picture = target.closest('.shot');
      if (picture) { lightbox.open(picture); return; }

      var option = target.closest('[data-go]');
      if (option) { push(option.getAttribute('data-go')); return; }

      var video = target.closest('[data-video]');
      if (video) { playVideo(video); return; }

      if (target.closest('[data-done]')) goHome();
    });

    navBack.addEventListener('click', function () { pop(); });
    exitButton.addEventListener('click', function () { finish('skip'); });
    cta.addEventListener('click', function () { finish('cta'); });

    document.addEventListener('keydown', function (event) {
      if (lightbox.isOpen()) {
        if (event.key === 'Escape') lightbox.close();
        return;
      }
      if (event.key === 'Escape') {
        if (!pop() && Bridge.available) finish('skip');
      }
    });
  }

  // ── Full-screen screenshot: pinch, drag, double-tap ─────────────────────

  var lightbox = (function () {
    var root = document.getElementById('lightbox');
    var image = document.getElementById('lightbox-img');
    var closeButton = document.getElementById('lightbox-close');

    var MAX_SCALE = 5;
    var DOUBLE_TAP_SCALE = 2.5;

    var scale = 1;
    var x = 0;
    var y = 0;
    var pointers = {};
    var pinchStart = null;
    var lastTap = 0;
    var open = false;

    function apply(animated) {
      image.style.transition = animated ? 'transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
      image.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
      root.classList.toggle('is-zoomed', scale > 1.01);
    }

    /** Where the picture really sits inside its box under `object-fit: contain`. */
    function contentRect(element) {
      var box = element.getBoundingClientRect();
      var natural = element.naturalWidth / element.naturalHeight;
      if (!natural || !isFinite(natural)) return box;
      var boxRatio = box.width / box.height;
      var width = natural > boxRatio ? box.width : box.height * natural;
      var height = natural > boxRatio ? box.width / natural : box.height;
      return {
        left: box.left + (box.width - width) / 2,
        top: box.top + (box.height - height) / 2,
        width: width,
        height: height,
      };
    }

    /** Keeps the picture from being dragged off the screen. */
    function clampPan() {
      var box = image.getBoundingClientRect();
      var width = image.offsetWidth * scale;
      var height = image.offsetHeight * scale;
      var slackX = Math.max(0, (width - window.innerWidth) / 2);
      var slackY = Math.max(0, (height - window.innerHeight) / 2);
      x = clamp(x, -slackX, slackX);
      y = clamp(y, -slackY, slackY);
      return box;
    }

    function reset() {
      scale = 1;
      x = 0;
      y = 0;
    }

    function openFrom(button) {
      var thumb = button.querySelector('img');
      image.src = thumb.currentSrc || thumb.src;
      image.alt = thumb.alt;
      root.hidden = false;
      open = true;
      reset();
      apply(false);

      // Fly out of the thumbnail: start on top of it, then settle into place.
      var from = contentRect(thumb);
      var to = contentRect(image);
      if (to.width > 0 && from.width > 0) {
        scale = from.width / to.width;
        x = from.left + from.width / 2 - (to.left + to.width / 2);
        y = from.top + from.height / 2 - (to.top + to.height / 2);
        apply(false);
        // Two frames: one to land the start pose, one to animate away from it.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            reset();
            apply(true);
            root.classList.add('is-open');
          });
        });
      } else {
        root.classList.add('is-open');
      }

      document.body.style.overflow = 'hidden';
      Bridge.post({ type: 'zoom', open: true });
    }

    function close() {
      if (!open) return;
      open = false;
      Bridge.post({ type: 'zoom', open: false });
      root.classList.remove('is-open', 'is-zoomed');
      window.setTimeout(function () {
        if (open) return;
        root.hidden = true;
        image.removeAttribute('src');
      }, 260);
    }

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function pointerList() {
      return Object.keys(pointers).map(function (id) { return pointers[id]; });
    }

    root.addEventListener('pointerdown', function (event) {
      if (event.target === closeButton || closeButton.contains(event.target)) return;
      root.setPointerCapture(event.pointerId);
      pointers[event.pointerId] = { x: event.clientX, y: event.clientY };
      var list = pointerList();
      if (list.length === 2) {
        pinchStart = {
          distance: distance(list[0], list[1]),
          scale: scale,
          x: x,
          y: y,
          midX: (list[0].x + list[1].x) / 2,
          midY: (list[0].y + list[1].y) / 2,
        };
      }
    });

    root.addEventListener('pointermove', function (event) {
      if (!pointers[event.pointerId]) return;
      var previousPoint = pointers[event.pointerId];
      var moved = { x: event.clientX, y: event.clientY };
      pointers[event.pointerId] = moved;
      var list = pointerList();

      if (list.length >= 2 && pinchStart) {
        var current = distance(list[0], list[1]);
        var factor = current / (pinchStart.distance || 1);
        var wanted = clamp(pinchStart.scale * factor, 1, MAX_SCALE);
        // Zoom around the point between the fingers, so the picture does not
        // slide out from under them.
        var ratio = wanted / pinchStart.scale;
        var centreX = pinchStart.midX - window.innerWidth / 2;
        var centreY = pinchStart.midY - window.innerHeight / 2;
        scale = wanted;
        x = centreX - (centreX - pinchStart.x) * ratio;
        y = centreY - (centreY - pinchStart.y) * ratio;
        clampPan();
        apply(false);
        return;
      }

      if (list.length === 1 && scale > 1.01) {
        x += moved.x - previousPoint.x;
        y += moved.y - previousPoint.y;
        clampPan();
        apply(false);
      }
    });

    function endPointer(event) {
      delete pointers[event.pointerId];
      if (pointerList().length < 2) pinchStart = null;
      if (scale <= 1.01) {
        reset();
        apply(true);
      }
    }

    root.addEventListener('pointerup', function (event) {
      var wasSingle = pointerList().length === 1;
      endPointer(event);
      if (!wasSingle) return;

      var now = Date.now();
      if (now - lastTap < 300) {
        lastTap = 0;
        toggleZoom(event.clientX, event.clientY);
        return;
      }
      lastTap = now;
      // A plain tap only dismisses while the picture is not zoomed, so panning
      // stays safe. Waited out so a double-tap is not read as two taps.
      window.setTimeout(function () {
        if (lastTap !== now) return;
        if (scale <= 1.01) close();
      }, 300);
    });

    root.addEventListener('pointercancel', endPointer);

    function toggleZoom(pointX, pointY) {
      if (scale > 1.01) {
        reset();
      } else {
        var centreX = pointX - window.innerWidth / 2;
        var centreY = pointY - window.innerHeight / 2;
        scale = DOUBLE_TAP_SCALE;
        x = -centreX * (DOUBLE_TAP_SCALE - 1);
        y = -centreY * (DOUBLE_TAP_SCALE - 1);
        clampPan();
      }
      apply(true);
    }

    root.addEventListener('dblclick', function (event) {
      toggleZoom(event.clientX, event.clientY);
    });

    // A trackpad or mouse wheel zooms too, for anyone reading this on a laptop.
    root.addEventListener(
      'wheel',
      function (event) {
        if (!open) return;
        event.preventDefault();
        var wanted = clamp(scale * (event.deltaY < 0 ? 1.12 : 0.89), 1, MAX_SCALE);
        var ratio = wanted / scale;
        var centreX = event.clientX - window.innerWidth / 2;
        var centreY = event.clientY - window.innerHeight / 2;
        scale = wanted;
        x = centreX - (centreX - x) * ratio;
        y = centreY - (centreY - y) * ratio;
        if (scale <= 1.01) reset();
        clampPan();
        apply(false);
      },
      { passive: false }
    );

    closeButton.addEventListener('click', close);

    return {
      open: openFrom,
      close: close,
      isOpen: function () { return open; },
    };
  })();

  // ── What Flutter can call ───────────────────────────────────────────────

  window.Guide = {
    // The system back gesture: the picture first, then the way back.
    previous: function () {
      if (lightbox.isOpen()) {
        lightbox.close();
        return true;
      }
      return pop();
    },
    closeImage: function () { lightbox.close(); },
    goTo: function (id) { return typeof id === 'string' ? push(id) : false; },
    home: goHome,
    setTheme: function (theme) { applyTheme(theme); },
    getState: function () {
      var top = stack[stack.length - 1];
      return { index: stack.length - 1, screen: top ? top.id : null, total: total, last: false, platform: platform };
    },
    // Kept for app versions that predate the screens; there is no next any more.
    next: function () { return false; },
  };

  // ── Go ──────────────────────────────────────────────────────────────────

  function build() {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.title = ownScreen ? t(screenDef(ownScreen).title) : t('guide_title');

    document.getElementById('brand-name').textContent = APP_NAME;
    document.getElementById('back-label').textContent = t('back');
    document.getElementById('lightbox-hint-text').textContent = t('pinch_hint');
    document.getElementById('lightbox-close').setAttribute('aria-label', t('done'));

    exitButton.hidden = !Bridge.available;
    if (isOnboarding) {
      exitButton.innerHTML = '<span>' + escapeHtml(t('skip')) + '</span>';
      exitButton.setAttribute('aria-label', t('skip'));
    } else {
      exitButton.innerHTML = icon('close');
      exitButton.setAttribute('aria-label', t('done'));
    }

    ctaLabel.textContent = isOnboarding ? t('get_started') : t('done');
    ctaIcon.innerHTML = ICONS[isOnboarding ? 'arrow' : 'check'];
    ctaIcon.classList.toggle('is-directional', isOnboarding);

    app.classList.remove('is-loading');
  }

  build();
  findVideos();
  wire();
  push(firstScreen, false);

  // A support link can open the guide straight on the screen it is about, with
  // the first one still behind it to go back to.
  var deepLink = params.get('screen');
  if (deepLink && deepLink !== firstScreen) push(deepLink, false);

  Bridge.post({ type: 'ready', total: total, index: stack.length - 1, lang: lang, platform: platform });
})();
