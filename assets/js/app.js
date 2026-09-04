/* ───────────────────────────────────────────────────────────────────────────
   InvisChat — how the app works
   A swipeable deck of cards, built from content.js and translated by i18n.js.

   Query parameters
     lang=en|tr|de|id|es|pt|ar|fr|ms|af|hi   what language to read it in
     full=1|0        1 (default) shows every page, 0 only the essential ones
     pages=a,b,c     an explicit page list, overrides `full`
     mode=guide|onboarding   onboarding offers "Skip" and ends on "Get started"
     theme=light|dark        defaults to the device setting

   Inside the app it also talks to Flutter: it reports every page change over
   the `AppBridge` channel, and Flutter drives it through `window.Guide`.
   Opened in a plain browser, both simply do nothing.
   ─────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var I18N = window.GUIDE_I18N || {};
  var CONTENT = window.GUIDE_CONTENT || { pages: [] };
  var ICONS = window.GUIDE_ICONS || {};

  var RTL_LANGUAGES = ['ar'];
  var FALLBACK_LANG = 'en';

  // ── Parameters ──────────────────────────────────────────────────────────

  var params = new URLSearchParams(window.location.search);

  function flag(name, fallback) {
    var raw = params.get(name);
    if (raw === null) return fallback;
    return raw !== '0' && raw !== 'false' && raw !== 'no';
  }

  var lang = pickLanguage(params.get('lang'));
  var isRtl = RTL_LANGUAGES.indexOf(lang) !== -1;
  var dirSign = isRtl ? -1 : 1;
  var isOnboarding = (params.get('mode') || 'guide') === 'onboarding';
  var showAll = flag('full', true);

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

  /** The translation for a string id, falling back to English. */
  function t(id) {
    var entry = I18N[id];
    if (!entry) return '';
    return entry[lang] || entry[FALLBACK_LANG] || '';
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

  // ── Which pages to show ─────────────────────────────────────────────────

  var pages = CONTENT.pages.filter(function (page) {
    return showAll || !page.full;
  });

  var explicit = params.get('pages');
  if (explicit) {
    var wanted = explicit.split(',').map(function (id) { return id.trim(); });
    var chosen = wanted
      .map(function (id) {
        return CONTENT.pages.filter(function (page) { return page.id === id; })[0];
      })
      .filter(Boolean);
    if (chosen.length) pages = chosen;
  }

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

  // ── Rendering ───────────────────────────────────────────────────────────

  var deck = document.getElementById('deck');
  var progress = document.getElementById('progress');
  var exitButton = document.getElementById('exit');
  var bottomBar = document.getElementById('bottombar');
  var lead = document.getElementById('lead');
  var cta = document.getElementById('cta');
  var ctaLabel = document.getElementById('cta-label');
  var ctaIcon = document.getElementById('cta-icon');

  function cardIcon(name) {
    return '<div class="card__icon">' + icon(name) + '</div>';
  }

  function shot(card) {
    if (!card.image) return '';
    return (
      '<button class="shot" type="button" data-shot="' + escapeHtml(card.image) + '" aria-label="' + escapeHtml(t('tap_enlarge')) + '">' +
      '<img src="' + escapeHtml(card.image) + '" alt="' + escapeHtml(t(card.title)) + '" decoding="async">' +
      '<span class="shot__hint">' + icon('zoom-in') + escapeHtml(t('tap_zoom')) + '</span>' +
      '</button>'
    );
  }

  function renderBody(page) {
    if (page.layout === 'grid') {
      return (
        '<div class="grid">' +
        page.cards
          .map(function (card) {
            return '<article class="card">' + cardIcon(card.icon) + '<h3 class="card__title">' + escapeHtml(t(card.title)) + '</h3></article>';
          })
          .join('') +
        '</div>'
      );
    }

    if (page.layout === 'steps') {
      return (
        '<div class="steps">' +
        page.cards
          .map(function (card) {
            return (
              '<article class="card">' +
              '<div class="step__body">' +
              '<div class="step__head">' +
              cardIcon(card.icon) +
              '<div><h3 class="card__title">' + escapeHtml(t(card.title)) + '</h3>' +
              '<p class="card__desc">' + escapeHtml(t(card.desc)) + '</p></div>' +
              '</div>' +
              shot(card) +
              '</div>' +
              '</article>'
            );
          })
          .join('') +
        '</div>'
      );
    }

    return (
      '<div class="list">' +
      page.cards
        .map(function (card) {
          return (
            '<article class="card">' +
            cardIcon(card.icon) +
            '<div><h3 class="card__title">' + escapeHtml(t(card.title)) + '</h3>' +
            (card.desc ? '<p class="card__desc">' + escapeHtml(t(card.desc)) + '</p>' : '') +
            '</div></article>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderPage(page, index) {
    var section = document.createElement('section');
    section.className = 'page';
    section.setAttribute('data-tone', page.tone || 'primary');
    section.setAttribute('data-index', String(index));
    section.setAttribute('aria-label', t(page.title));
    section.innerHTML =
      '<div class="page__inner">' +
      '<div class="page__header">' +
      '<div class="page__badge">' + icon(page.icon) + '</div>' +
      '<span class="page__kicker">' + escapeHtml(t(page.kicker)) + '</span>' +
      '<h2 class="page__title">' + escapeHtml(t(page.title)) + '</h2>' +
      '<p class="page__subtitle">' + escapeHtml(t(page.subtitle)) + '</p>' +
      '</div>' +
      '<div class="page__body">' + renderBody(page) + '</div>' +
      '</div>';
    return section;
  }

  function build() {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.title = t('guide_title');

    document.getElementById('brand-name').textContent = window.GUIDE_APP_NAME || 'InvisChat';

    var fragment = document.createDocumentFragment();
    pages.forEach(function (page, index) {
      fragment.appendChild(renderPage(page, index));
    });
    deck.appendChild(fragment);

    // Screenshots further along load only when they are approached — the first
    // page has to be instant, the rest can wait for the swipe.
    Array.prototype.forEach.call(deck.querySelectorAll('.page'), function (section, index) {
      if (index === 0) return;
      Array.prototype.forEach.call(section.querySelectorAll('.shot img'), function (img) {
        img.loading = 'lazy';
      });
    });

    // A screenshot that never arrives leaves the card without a hole in it.
    Array.prototype.forEach.call(deck.querySelectorAll('.shot img'), function (img) {
      img.addEventListener('error', function () {
        var button = img.closest('.shot');
        if (button) button.remove();
      });
    });

    progress.innerHTML = pages
      .map(function () { return '<span class="progress__seg"></span>'; })
      .join('');

    exitButton.hidden = !Bridge.available;
    if (isOnboarding) {
      exitButton.innerHTML = '<span>' + escapeHtml(t('skip')) + '</span>';
      exitButton.setAttribute('aria-label', t('skip'));
    } else {
      exitButton.innerHTML = icon('close');
      exitButton.setAttribute('aria-label', t('done'));
    }

    document.getElementById('swipe-text').textContent = t('swipe_hint');
    document.getElementById('back-label').textContent = t('back');
    document.getElementById('lightbox-hint-text').textContent = t('pinch_hint');
    document.getElementById('lightbox-close').setAttribute('aria-label', t('done'));
    document.getElementById('app').classList.remove('is-loading');
  }

  // ── The deck ────────────────────────────────────────────────────────────

  var index = 0;
  var sections = [];
  var headers = [];
  var bodies = [];
  // Right-to-left scrolling reports negative offsets in current browsers and
  // reversed positive ones in a few old WebViews. Probed once, on the first
  // page, where the two are told apart by whether the deck starts at zero.
  var legacyRtl = false;

  function pageWidth() {
    return deck.clientWidth || 1;
  }

  function scrollPosition() {
    var offset = deck.scrollLeft;
    if (legacyRtl) return (deck.scrollWidth - deck.clientWidth - offset) / pageWidth();
    return Math.abs(offset) / pageWidth();
  }

  function scrollTargetFor(i) {
    if (legacyRtl) return deck.scrollWidth - deck.clientWidth - i * pageWidth();
    return dirSign * i * pageWidth();
  }

  function goTo(i, smooth) {
    var target = Math.max(0, Math.min(pages.length - 1, i));
    deck.scrollTo({ left: scrollTargetFor(target), behavior: smooth === false ? 'auto' : 'smooth' });
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  /** Header and body drift against the swipe, at different speeds. */
  function paint() {
    var position = scrollPosition();
    for (var i = 0; i < sections.length; i++) {
      var drift = clamp(position - i, -1, 1);
      var faded = 1 - Math.abs(drift);
      sections[i].style.opacity = faded < 0 ? 0 : faded;
      headers[i].style.transform = 'translate3d(' + (-drift * 28 * dirSign).toFixed(2) + 'px,0,0)';
      bodies[i].style.transform = 'translate3d(' + (-drift * 64 * dirSign).toFixed(2) + 'px,0,0)';
    }
  }

  /** Which page the deck has settled on. Read straight from the scroll event
      rather than from the paint below it: animation frames are throttled while
      the app is in the background, and the progress bar — and the app, which
      steers its back gesture by this — must not fall behind. */
  function syncIndex() {
    var current = Math.round(scrollPosition());
    if (current === index || current < 0 || current >= pages.length) return;
    index = current;
    onIndexChanged();
  }

  function onIndexChanged() {
    var last = index === pages.length - 1;

    Array.prototype.forEach.call(progress.children, function (segment, i) {
      segment.classList.toggle('is-on', i <= index);
    });

    bottomBar.classList.toggle('is-last', last);
    lead.classList.toggle('is-first', index === 0);
    document.getElementById('swipe').hidden = index !== 0;
    document.getElementById('back').hidden = index === 0;

    ctaLabel.textContent = last ? (isOnboarding ? t('get_started') : t('done')) : t('next');
    ctaIcon.innerHTML = ICONS[last ? 'check' : 'arrow'];
    ctaIcon.classList.toggle('is-directional', !last);
    // Nothing to skip past on the closing page — the button below is the only
    // sensible action there.
    exitButton.classList.toggle('is-muted', isOnboarding && last);

    Bridge.post({ type: 'page', index: index, last: last, total: pages.length });
  }

  var painting = false;
  function schedulePaint() {
    if (painting) return;
    painting = true;
    requestAnimationFrame(function () {
      painting = false;
      paint();
    });
  }

  function finish(reason) {
    Bridge.post({ type: 'finish', reason: reason, index: index });
  }

  function next() {
    if (index >= pages.length - 1) {
      finish('cta');
      return false;
    }
    goTo(index + 1);
    return true;
  }

  function previous() {
    if (index <= 0) return false;
    goTo(index - 1);
    return true;
  }

  function wireDeck() {
    sections = Array.prototype.slice.call(deck.querySelectorAll('.page'));
    headers = sections.map(function (section) { return section.querySelector('.page__header'); });
    bodies = sections.map(function (section) { return section.querySelector('.page__body'); });

    if (isRtl && deck.scrollLeft > 1) legacyRtl = true;

    deck.addEventListener('scroll', function () {
      syncIndex();
      schedulePaint();
    }, { passive: true });
    window.addEventListener('resize', function () {
      goTo(index, false);
      schedulePaint();
    });

    cta.addEventListener('click', function () { next(); });
    document.getElementById('back').addEventListener('click', function () { previous(); });
    exitButton.addEventListener('click', function () { finish('skip'); });

    document.addEventListener('keydown', function (event) {
      if (lightbox.isOpen()) {
        if (event.key === 'Escape') lightbox.close();
        return;
      }
      if (event.key === 'ArrowRight') isRtl ? previous() : next();
      else if (event.key === 'ArrowLeft') isRtl ? next() : previous();
      else if (event.key === 'Escape' && Bridge.available) finish('skip');
    });

    deck.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.shot') : null;
      if (button) lightbox.open(button);
    });

    goTo(0, false);
    onIndexChanged();
    paint();
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
    next: next,
    previous: function () {
      if (lightbox.isOpen()) {
        lightbox.close();
        return true;
      }
      return previous();
    },
    goTo: function (i) { goTo(i); },
    closeImage: function () { lightbox.close(); },
    setTheme: function (theme) { applyTheme(theme); },
    getState: function () {
      return { index: index, total: pages.length, last: index === pages.length - 1 };
    },
  };

  // ── Go ──────────────────────────────────────────────────────────────────

  build();
  wireDeck();
  Bridge.post({ type: 'ready', total: pages.length, index: 0, lang: lang });
})();
