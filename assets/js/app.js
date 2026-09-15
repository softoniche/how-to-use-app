/* ───────────────────────────────────────────────────────────────────────────
   InvisChat — how the app works
   A small stack of screens, built from content.js and translated by i18n.js.

   On a fresh install it opens on a short story: a few pages, one thing the
   app does on each, a button that carries the user through them and then into
   the app. From Settings it opens on one page to scroll. Either way every
   answer is one tap away, and the way back is always the same.

   It answers at more than one address. `/` is the whole guide; a folder of
   its own — `/connect-account/` — is one screen of it, standing alone, for a
   link that should open there and nowhere else. Such a page says which screen
   it is in `window.GUIDE_SCREEN`, and has nothing behind it: leaving it leaves
   the page rather than falling back to the start.

   Query parameters
     lang=en|tr|de|id|es|pt|ar|fr|ms|af|hi   what language to read it in
     full=1|0        1 (default) shows everything, 0 only connecting
     platform=android|ios    which recordings to show; read off the browser
                             when the app does not say
     screen=<id>     open on another screen, with the start behind it
     mode=guide|onboarding   onboarding opens on the story, offers "Skip" and
                             ends on "Get started"
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

  /**
   * The translation for a string id, falling back to English. `{app}` is the
   * app's name; any other `{name}` is filled in from `vars`.
   */
  function t(id, vars) {
    var entry = I18N[id];
    if (!entry) return '';
    var value = entry[lang] || entry[FALLBACK_LANG] || '';
    return value.replace(/\{(\w+)\}/g, function (match, key) {
      if (key === 'app') return APP_NAME;
      return vars && key in vars ? String(vars[key]) : match;
    });
  }

  /** A translation, ready to be put into markup. */
  function text(id, vars) {
    return escapeHtml(t(id, vars));
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

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
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

  /** Whether a screen, block, page or item belongs in this build and on this phone. */
  function applies(thing) {
    if (thing.full && !showAll) return false;
    if (thing.lite && showAll) return false;
    return !thing.platform || thing.platform === platform;
  }

  /** The items of a block, minus what this build and this phone do not show. */
  function visible(items) {
    return (items || []).filter(applies);
  }

  /** A screen, or nothing when this build of the app does not include it. */
  function screenDef(id) {
    var def = screens[id];
    return def && applies(def) ? def : null;
  }

  /** A video or picture path, with {platform} filled in for the phone reading it. */
  function forPlatform(path) {
    return path ? String(path).split('{platform}').join(platform) : '';
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

  /** Where the guide starts: the story on a fresh install, the one page from Settings. */
  var HOME = (isOnboarding && screenDef(CONTENT.onboarding) && CONTENT.onboarding) || CONTENT.home || 'home';

  /** Where the deck starts: this page's own screen, or the start of the guide. */
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

  function findVideos() {
    Object.keys(screens).forEach(function (id) {
      (screens[id].blocks || []).forEach(function (block) {
        if (block.type !== 'video' || !applies(block)) return;
        var src = forPlatform(block.src);
        if (!src || src in videos) return;
        videos[src] = undefined;
        probe(src, function (found) {
          videos[src] = found;
          // A screen already on the page catches up with the answer.
          each(document.querySelectorAll('.video'), function (card) {
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
      card.innerHTML = '<p class="video__error">' + text('video_error') + '</p>';
    });

    var frame = document.createElement('div');
    frame.className = 'video__player';
    frame.appendChild(video);
    card.innerHTML = '';
    card.appendChild(frame);

    var started = video.play();
    if (started && started.catch) started.catch(function () { /* the controls are there */ });
  }

  // ── The pictures of what the app does ───────────────────────────────────

  // Each one is a moment the user already knows from their chats — a message
  // deleted, a photo that can only be opened once, a status about to vanish —
  // next to what the app keeps of it. The chat side is a real screenshot; the
  // app side is drawn here, so it reads in the user's own language.

  function picture(src, extraClass) {
    return '<img class="demo__img ' + (extraClass || '') + '" src="' + escapeHtml(src) + '" alt="" decoding="async">';
  }

  var DEMOS = {
    deleted: function () {
      return (
        picture('assets/img/features/deleted.jpg', 'demo__bubble demo__bubble--wide') +
        '<span class="demo__arrow demo__reveal">' + icon('arrow-down') + '</span>' +
        '<span class="demo__card demo__reveal">' +
        '<span class="demo__tag">' + icon('restore') + text('demo_recovered') + '</span>' +
        '<span class="demo__text">' + text('demo_deleted_text') + '</span>' +
        '</span>'
      );
    },
    // A photo that can be opened once, then a video — both kept all the same.
    view_once: function () {
      return (
        '<span class="demo__swap">' +
        picture('assets/img/features/view-once-photo.jpg', 'demo__bubble') +
        picture('assets/img/features/view-once-video.jpg', 'demo__bubble demo__swap-in') +
        '</span>' +
        '<span class="demo__arrow demo__reveal">' + icon('arrow-down') + '</span>' +
        '<span class="demo__card demo__card--row demo__reveal">' +
        '<span class="demo__thumb"><span class="demo__play demo__swap-in">' + icon('play') + '</span></span>' +
        '<span class="demo__card-text">' +
        '<span class="demo__tag">' + icon('bookmark') + text('view_once') + '</span>' +
        '<span class="demo__again">' + icon('eye') + text('demo_view_again') + '</span>' +
        '</span>' +
        '</span>'
      );
    },
    // A status, and the button that puts it in the gallery.
    status: function () {
      return (
        '<span class="status-mock">' +
        '<span class="status-mock__bars"><i></i><i></i><i></i></span>' +
        '<span class="status-mock__who"><i class="status-mock__avatar"></i><i class="status-mock__name"></i></span>' +
        '<i class="status-mock__sun"></i>' +
        '<span class="status-mock__save">' +
        '<span class="status-mock__idle">' + icon('download') + text('save_to_gallery') + '</span>' +
        '<span class="status-mock__done">' + icon('check') + text('saved_to_gallery') + '</span>' +
        '</span>' +
        '</span>'
      );
    },
    // Blue ticks going quiet as Ghost mode is switched on.
    ticks: function () {
      return (
        '<span class="demo__swap demo__ticks">' +
        picture('assets/img/features/ticks-blue.png') +
        picture('assets/img/features/ticks-hidden.png', 'demo__swap-in') +
        '</span>' +
        '<span class="demo__toggle">' +
        '<span class="demo__toggle-label">' + icon('moon') + text('toolbar_ghost_title') + '</span>' +
        '<span class="demo__switch"><i class="demo__knob"></i></span>' +
        '</span>'
      );
    },
    shield: function () {
      return '<span class="demo__shield">' + icon('shield-check') + '</span>';
    },
  };

  function demo(name) {
    var draw = DEMOS[name];
    return draw ? '<span class="demo demo--' + name + '">' + draw() + '</span>' : '';
  }

  // A picture moves only while it is on screen: one that is scrolled or swiped
  // away holds still, and starts from the beginning of its story when it is
  // first seen rather than halfway through it.
  var demoObserver =
    typeof window.IntersectionObserver === 'function'
      ? new window.IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              entry.target.classList.toggle('is-live', entry.isIntersecting && entry.intersectionRatio >= 0.5);
            });
          },
          { threshold: [0, 0.5] }
        )
      : null;

  function watchDemos(section) {
    each(section.querySelectorAll('.demo'), function (el) {
      if (demoObserver) demoObserver.observe(el);
      else el.classList.add('is-live');
    });
    // A picture that never arrives leaves the drawing without a hole in it.
    each(section.querySelectorAll('.demo__img'), function (img) {
      img.addEventListener('error', function () { img.hidden = true; });
    });
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

  /** A block's own heading, when it has one. */
  function label(block) {
    return block.label ? '<h3 class="block__label">' + text(block.label) + '</h3>' : '';
  }

  function shot(image, titleId) {
    var src = forPlatform(image);
    if (!src) return '';
    return (
      '<button class="shot" type="button" data-shot="' + escapeHtml(src) + '" aria-label="' + text('tap_enlarge') + '">' +
      '<img src="' + escapeHtml(src) + '" alt="' + (titleId ? text(titleId) : '') + '" decoding="async" loading="lazy">' +
      '<span class="shot__hint">' + icon('zoom-in') + text('tap_zoom') + '</span>' +
      '</button>'
    );
  }

  function renderStory(block) {
    var pages = visible(block.pages);
    if (!pages.length) return '';
    return (
      '<div class="story" data-index="0">' +
      '<ol class="story__track track">' +
      pages
        .map(function (page, i) {
          return (
            '<li class="story__page' + (i === 0 ? ' is-active' : '') + '">' +
            '<div class="story__content">' +
            (page.stage ? '<div class="story__stage" aria-hidden="true">' + demo(page.stage) + '</div>' : '') +
            (page.blocks || []).map(renderBlock).join('') +
            '</div>' +
            '</li>'
          );
        })
        .join('') +
      '</ol>' +
      (pages.length > 1
        ? '<div class="story__dots" aria-hidden="true">' +
          pages
            .map(function (page, i) {
              return '<span class="story__dot' + (i === 0 ? ' is-active' : '') + '"></span>';
            })
            .join('') +
          '</div>'
        : '') +
      '</div>'
    );
  }

  function renderHero(block) {
    var badges = visible(block.badges);
    return (
      '<header class="hero">' +
      (block.pill ? '<span class="hero__pill">' + text(block.pill) + '</span>' : '') +
      '<h2 class="hero__title">' + text(block.title) + '</h2>' +
      (block.subtitle ? '<p class="hero__subtitle">' + text(block.subtitle) + '</p>' : '') +
      (badges.length
        ? '<ul class="hero__badges">' +
          badges
            .map(function (badge) {
              return '<li class="hero__badge">' + icon(badge.icon) + '<span>' + text(badge.text) + '</span></li>';
            })
            .join('') +
          '</ul>'
        : '') +
      '</header>'
    );
  }

  function renderShowcase(block) {
    var items = visible(block.items);
    if (!items.length) return '';
    return (
      '<div class="showcase">' +
      label(block) +
      items
        .map(function (item) {
          var go = item.go && screenDef(item.go) ? item.go : null;
          var tag = go ? 'button' : 'div';
          return (
            '<' + tag + ' class="feature"' + (go ? ' type="button" data-go="' + escapeHtml(go) + '"' : '') + '>' +
            '<span class="feature__stage" aria-hidden="true">' + demo(item.demo) + '</span>' +
            '<span class="feature__body">' +
            '<span class="feature__text">' +
            '<span class="feature__title">' + text(item.title) + '</span>' +
            '<span class="feature__desc">' + text(item.desc) + '</span>' +
            '</span>' +
            (go ? '<span class="feature__go">' + icon('chevron') + '</span>' : '') +
            '</span>' +
            '</' + tag + '>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderOptions(block) {
    // An option whose screen this build leaves out is left out with it.
    var items = visible(block.items).filter(function (item) {
      return !!screenDef(item.go);
    });
    if (!items.length) return '';
    return (
      '<div class="options">' +
      label(block) +
      items
        .map(function (item) {
          return (
            '<button class="option' + (item.accent ? ' option--accent' : '') + '" type="button" data-go="' + escapeHtml(item.go) + '">' +
            cardIcon(item.icon) +
            '<span class="option__text">' +
            (item.badge ? '<span class="option__badge">' + text(item.badge) + '</span>' : '') +
            '<span class="option__title">' + text(item.title) + '</span>' +
            (item.desc ? '<span class="card__desc">' + text(item.desc) + '</span>' : '') +
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
      '<h3 class="trust__head"><span class="trust__badge">' + icon(block.icon || 'shield-check') + '</span><span>' + text(block.title) + '</span></h3>' +
      visible(block.items)
        .map(function (item) {
          return (
            '<div class="trust__item">' +
            '<span class="trust__icon">' + icon(item.icon) + '</span>' +
            '<div><p class="trust__title">' + text(item.title) + '</p>' +
            '<p class="trust__desc">' + text(item.desc) + '</p></div>' +
            '</div>'
          );
        })
        .join('') +
      '</section>'
    );
  }

  function renderVideo(block) {
    // Hidden until the file is known to be there; see findVideos().
    var src = forPlatform(block.src);
    if (!src || videos[src] === false) return '';
    return (
      '<div class="video" data-src="' + escapeHtml(src) + '"' + (videos[src] === true ? '' : ' hidden') + '>' +
      '<button class="video__button" type="button" data-video="1">' +
      '<span class="video__play">' + icon('play') + '</span>' +
      '<span class="option__text">' +
      '<span class="option__title">' + text('watch_video') + '</span>' +
      '<span class="card__desc">' + text('watch_video_desc') + '</span>' +
      '</span>' +
      '</button>' +
      '</div>'
    );
  }

  /**
   * One screenshot at a time, with how far along the user is above it and the
   * way on below it. On the last picture the way on becomes "Got it".
   */
  function renderSlides(block) {
    var items = visible(block.items);
    if (!items.length) return '';
    return (
      '<div class="stepper' + (items.length === 1 ? ' is-last' : '') + '" data-index="0">' +
      '<div class="stepper__head">' +
      '<span class="stepper__count">' + text('step_of', { n: 1, total: items.length }) + '</span>' +
      '<span class="stepper__bar"><span class="stepper__fill" style="width:' + 100 / items.length + '%"></span></span>' +
      '</div>' +
      '<ol class="slides__track track">' +
      items
        .map(function (item, i) {
          // The instruction first, so it is read before the picture is looked at.
          return '<li class="slide' + (i === 0 ? ' is-active' : '') + '"><p class="slide__text">' + text(item.text) + '</p>' + shot(item.image, item.text) + '</li>';
        })
        .join('') +
      '</ol>' +
      '<div class="stepper__nav">' +
      '<button class="btn btn--quiet" type="button" data-slide="-1" aria-label="' + text('back') + '" disabled>' + icon('chevron', 'is-back') + '</button>' +
      '<button class="btn btn--primary" type="button" data-slide="1">' +
      '<span class="when-next">' + text('next') + '</span>' + icon('chevron', 'when-next is-forward') +
      '<span class="when-done">' + text('got_it') + '</span>' + icon('check', 'when-done') +
      '</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderSteps(block) {
    return (
      '<div class="steps-block">' +
      label(block) +
      '<ol class="steps">' +
      visible(block.items)
        .map(function (item, i) {
          return (
            '<li class="step">' +
            '<span class="step__num">' + (i + 1) + '</span>' +
            '<div class="step__body">' +
            '<h3 class="card__title">' + text(item.title) + '</h3>' +
            (item.desc ? '<p class="card__desc">' + text(item.desc) + '</p>' : '') +
            shot(item.image, item.title) +
            '</div>' +
            '</li>'
          );
        })
        .join('') +
      '</ol>' +
      '</div>'
    );
  }

  function renderList(block) {
    return (
      '<div class="list">' +
      visible(block.items)
        .map(function (item) {
          return (
            '<article class="card">' +
            cardIcon(item.icon) +
            '<div class="list__text">' +
            '<h3 class="card__title">' + text(item.title) + '</h3>' +
            (item.desc ? '<p class="card__desc">' + text(item.desc) + '</p>' : '') +
            shot(item.image, item.title) +
            '</div>' +
            '</article>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderShot(block) {
    return '<div class="block--shot">' + shot(block.image, block.title) + '</div>';
  }

  function renderNote(block) {
    return (
      '<div class="note' + (block.variant ? ' note--' + block.variant : '') + '">' +
      icon(block.icon || 'bulb') +
      '<div><p class="note__title">' + text(block.title) + '</p>' +
      '<p class="note__desc">' + text(block.desc) + '</p></div>' +
      '</div>'
    );
  }

  function renderFaq(block) {
    return (
      '<div class="faq">' +
      label(block) +
      '<div class="faq__list">' +
      visible(block.items)
        .map(function (item) {
          return (
            '<details class="faq__item">' +
            '<summary class="faq__q"><span>' + text(item.q) + '</span>' + icon('chevron', 'faq__chevron') + '</summary>' +
            '<p class="faq__a">' + text(item.a) + '</p>' +
            '</details>'
          );
        })
        .join('') +
      '</div>' +
      '</div>'
    );
  }

  function renderDone() {
    return (
      '<div class="done"><button class="cta" type="button" data-done="1">' +
      '<span>' + text('got_it') + '</span>' + icon('check') +
      '</button></div>'
    );
  }

  var RENDERERS = {
    story: renderStory,
    hero: renderHero,
    showcase: renderShowcase,
    options: renderOptions,
    trust: renderTrust,
    video: renderVideo,
    slides: renderSlides,
    steps: renderSteps,
    list: renderList,
    shot: renderShot,
    note: renderNote,
    faq: renderFaq,
    done: renderDone,
  };

  function renderBlock(block) {
    var render = RENDERERS[block.type];
    return render && applies(block) ? render(block) : '';
  }

  function renderScreen(id, def) {
    var isStory = (def.blocks || []).some(function (block) {
      return block.type === 'story' && applies(block);
    });
    var section = document.createElement('section');
    section.className = 'screen' + (isStory ? ' screen--story' : '');
    section.setAttribute('data-tone', def.tone || 'primary');
    section.setAttribute('data-screen', id);
    section.setAttribute('aria-label', t(def.title || def.label));
    section.innerHTML =
      '<div class="screen__inner">' +
      (def.title
        ? '<header class="screen__header">' +
          (def.icon ? '<div class="screen__badge">' + icon(def.icon) + '</div>' : '') +
          '<h2 class="screen__title">' + text(def.title) + '</h2>' +
          (def.subtitle ? '<p class="screen__subtitle">' + text(def.subtitle) + '</p>' : '') +
          (def.meta ? '<span class="screen__meta">' + icon('clock') + '<span>' + text(def.meta) + '</span></span>' : '') +
          '</header>'
        : '') +
      '<div class="screen__body">' + (def.blocks || []).map(renderBlock).join('') + '</div>' +
      '</div>';

    // A screenshot that never arrives leaves the step without a hole in it.
    each(section.querySelectorAll('.shot img'), function (img) {
      img.addEventListener('error', function () {
        remove(img.closest ? img.closest('.shot') : img.parentNode);
      });
    });
    wireTracks(section);
    watchDemos(section);
    return section;
  }

  // ── Tracks: the story's pages and the step pictures, one at a time ──────

  function trackOf(holder) {
    return holder.querySelector('.track');
  }

  /** The page nearest the middle of its track: the one being read. */
  function currentSlide(holder) {
    var track = trackOf(holder);
    var box = track.getBoundingClientRect();
    var middle = box.left + box.width / 2;
    var nearest = 0;
    var nearestDistance = Infinity;
    each(track.children, function (slide, i) {
      var rect = slide.getBoundingClientRect();
      var distance = Math.abs(rect.left + rect.width / 2 - middle);
      if (distance < nearestDistance) {
        nearest = i;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  /**
   * Brings a page to the middle of its track. The distance is measured on the
   * screen rather than in scrollLeft, which counts backwards in Arabic — and
   * differently in each engine — while a distance on screen does not.
   */
  function showSlide(holder, index) {
    var track = trackOf(holder);
    var slide = track.children[clamp(index, 0, track.children.length - 1)];
    var box = track.getBoundingClientRect();
    var rect = slide.getBoundingClientRect();
    var distance = rect.left + rect.width / 2 - (box.left + box.width / 2);
    if ('scrollBehavior' in document.documentElement.style) {
      track.scrollBy({ left: distance, behavior: 'smooth' });
    } else {
      track.scrollLeft += distance;
    }
  }

  /** The page a track last settled on, as markTrack() wrote it down. */
  function indexOf(holder) {
    return holder ? Number(holder.getAttribute('data-index')) || 0 : 0;
  }

  function countOf(holder) {
    return holder ? trackOf(holder).children.length : 0;
  }

  /** Lights up the page being read, and everything that follows from which one it is. */
  function markTrack(holder) {
    var index = currentSlide(holder);
    if (index === indexOf(holder)) return;
    var count = countOf(holder);
    holder.setAttribute('data-index', index);
    each(trackOf(holder).children, function (page, i) {
      page.classList.toggle('is-active', i === index);
    });

    if (holder.classList.contains('story')) {
      each(holder.querySelectorAll('.story__dot'), function (dot, i) {
        dot.classList.toggle('is-active', i === index);
      });
      // A page of the story is a step the app counts, and its button changes.
      onScreenChanged();
      return;
    }

    holder.classList.toggle('is-last', index === count - 1);
    holder.querySelector('.stepper__count').textContent = t('step_of', { n: index + 1, total: count });
    holder.querySelector('.stepper__fill').style.width = ((index + 1) / count) * 100 + '%';
    holder.querySelector('[data-slide="-1"]').disabled = index === 0;
  }

  function wireTracks(section) {
    each(section.querySelectorAll('.story, .stepper'), function (holder) {
      var queued = false;
      // A swipe fires scroll events far faster than anyone can see: catch up
      // once a frame. They do not bubble, so every track listens for itself.
      trackOf(holder).addEventListener(
        'scroll',
        function () {
          if (queued) return;
          queued = true;
          requestAnimationFrame(function () {
            queued = false;
            markTrack(holder);
          });
        },
        { passive: true }
      );
    });
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
   * start on the guide, this page's own screen on a page of its own.
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

  /** The story at the bottom of the deck, when the guide opened on one. */
  function bottomStory() {
    return stack[0] ? stack[0].el.querySelector('.story') : null;
  }

  /**
   * How far into the guide the user is: every screen above the first, and
   * every page of the story they have swiped past. It is what the app steers
   * its back gesture by, so a page of the story is as much a step back as a
   * screen is.
   */
  function depth() {
    return stack.length - 1 + indexOf(bottomStory());
  }

  function onScreenChanged() {
    // The bottom of the deck: the start on the guide, and on a page of its
    // own the screen that page is. Either way there is nothing behind it.
    var atFirst = stack.length <= 1;
    brand.hidden = !atFirst;
    navBack.hidden = atFirst;
    // The button that closes the guide, which only the app can act on. The
    // walkthrough has always offered it; a page of its own, read in a browser,
    // has nobody to tell — so it offers nothing to press.
    bottomBar.hidden = !atFirst || (!!ownScreen && !Bridge.available);
    drawCta();

    // `last` is answered in finish(), below.
    Bridge.post({ type: 'page', index: depth(), last: false, total: total });
  }

  /** Whether the story still has pages ahead of the one being read. */
  function storyGoesOn() {
    var story = stack.length === 1 ? bottomStory() : null;
    return !!story && indexOf(story) < countOf(story) - 1;
  }

  /** The button at the bottom: on through the story while there is more of it, then into the app. */
  function drawCta() {
    var onwards = storyGoesOn();
    var directional = onwards || isOnboarding;
    ctaLabel.textContent = onwards ? t('continue') : isOnboarding ? t('get_started') : t('done');
    ctaIcon.innerHTML = ICONS[directional ? 'arrow' : 'check'];
    ctaIcon.classList.toggle('is-directional', directional);
  }

  function onCta() {
    if (storyGoesOn()) {
      var story = bottomStory();
      showSlide(story, indexOf(story) + 1);
      return;
    }
    finish('cta');
  }

  /** One step back: a screen if there is one above the first, else a page of the story. */
  function previous() {
    if (stack.length > 1) return pop();
    var story = bottomStory();
    if (story && indexOf(story) > 0) {
      showSlide(story, indexOf(story) - 1);
      return true;
    }
    return false;
  }

  function finish(reason) {
    // The app logs the walkthrough as completed on a page that reports itself
    // the last one. Nothing is last in a guide the user steers, so the moment
    // that counts is closing it on the button — never a skip, which is not a
    // walkthrough completed. The index has to differ from the one the app saw
    // last for it to read `last` at all.
    if (reason !== 'skip' && !ownScreen) Bridge.post({ type: 'page', index: depth() + 1, last: true, total: total });
    Bridge.post({ type: 'finish', reason: reason, index: depth() });
  }

  /**
   * "Got it", at the end of something read. On the guide it returns to the
   * start. On a page of its own inside the app there is nothing to return to
   * but the account the user was linking, so it goes there — ready to do what
   * they have just read.
   */
  function done() {
    if (ownScreen && Bridge.available) finish('done');
    else goHome();
  }

  // ── Wiring ──────────────────────────────────────────────────────────────

  function wire() {
    deck.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var picture = target.closest('.shot');
      if (picture) { lightbox.open(picture); return; }

      var arrow = target.closest('[data-slide]');
      if (arrow) {
        var stepper = arrow.closest('.stepper');
        var step = Number(arrow.getAttribute('data-slide'));
        if (step > 0 && stepper.classList.contains('is-last')) done();
        else showSlide(stepper, indexOf(stepper) + step);
        return;
      }

      var option = target.closest('[data-go]');
      if (option) { push(option.getAttribute('data-go')); return; }

      var video = target.closest('[data-video]');
      if (video) { playVideo(video); return; }

      if (target.closest('[data-done]')) done();
    });

    navBack.addEventListener('click', function () { pop(); });
    exitButton.addEventListener('click', function () { finish('skip'); });
    cta.addEventListener('click', onCta);

    document.addEventListener('keydown', function (event) {
      if (lightbox.isOpen()) {
        if (event.key === 'Escape') lightbox.close();
        return;
      }
      if (event.key === 'Escape') {
        if (!previous() && Bridge.available) finish('skip');
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
      return previous();
    },
    closeImage: function () { lightbox.close(); },
    goTo: function (id) { return typeof id === 'string' ? push(id) : false; },
    home: goHome,
    setTheme: function (theme) { applyTheme(theme); },
    getState: function () {
      var top = stack[stack.length - 1];
      return { index: depth(), screen: top ? top.id : null, total: total, last: false, platform: platform };
    },
    // Kept for app versions that predate the screens; the button does this now.
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
      exitButton.innerHTML = '<span>' + text('skip') + '</span>';
      exitButton.setAttribute('aria-label', t('skip'));
    } else {
      exitButton.innerHTML = icon('close');
      exitButton.setAttribute('aria-label', t('done'));
    }

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

  Bridge.post({ type: 'ready', total: total, index: depth(), lang: lang, platform: platform });
})();
