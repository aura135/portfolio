/* ==========================================================================
   Demo Portfolio — script.js
   Reads everything from index.html and renders / animates it.
   You should never need to edit this file: all content lives in index.html.

   Contract:
     * every element marked with [data-field] is content read from the HTML
     * empty text, empty href or empty list items are hidden automatically
     * missing / broken images fall back to the "Demo Pic" placeholder
     * no content strings are hardcoded here (only UI chrome messages)
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || doc).querySelectorAll(s));
  };

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = function () { return mqReduce.matches; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var mainStarted = false;

  /* ======================================================================
     1. CONTENT HYDRATION — reads HTML, hides empty fields
     ====================================================================== */

  function wrapFor(el) {
    var w = el.closest('[data-field-wrap]');
    if (w) return w;
    var li = el.closest('li');
    if (li) return li;
    return el;
  }

  function fieldEmpty(el) {
    if (el.matches('img')) {
      return !(el.getAttribute('src') || '').trim() || el.dataset.failed === '1';
    }
    if (el.matches('a')) {
      if (!(el.getAttribute('href') || '').trim()) return true;
      /* icon-only links (svg, no text) are never "empty" */
      if (el.querySelector('svg')) return false;
    }
    return !el.textContent.trim();
  }

  function markNoImg(img, on) {
    img.hidden = on;
    var box = img.parentElement;
    if (box) box.classList.toggle('is-noimg', on);
  }

  function watchImage(img) {
    if (img._watched) return;
    img._watched = true;
    img.addEventListener('error', function () {
      img.dataset.failed = '1';
      markNoImg(img, true);
    });
    img.addEventListener('load', function () {
      if (img.dataset.failed) delete img.dataset.failed;
      markNoImg(img, false);
    });
    if (img.complete && img.naturalWidth === 0 && (img.getAttribute('src') || '').trim()) {
      img.dataset.failed = '1';
    }
  }

  function parseCount(el) {
    if (el._orig === undefined) el._orig = el.textContent;
    var m = el._orig.trim().match(/^(\D*)(\d[\d\s,]*)(\D*)$/);
    if (!m) { el._to = null; return; }
    el._to = {
      pre: m[1],
      n: parseInt(m[2].replace(/[^\d]/g, ''), 10),
      suf: m[3]
    };
  }

  var RULE_HIDE_ALL_FIELDS = [
    '.hero__eyebrow', '.hero__tagline', '.p-card__body',
    '.p-card__links', '.tl-item__meta', '.footer__brand'
  ];
  var RULE_HIDE_ALL_CHILDREN = ['.p-card__meta', '.contact__info'];

  function hydrate() {
    /* --- fields sharing a wrap: hide the wrap if ANY field is empty --- */
    var wraps = new Map();
    $$('[data-field]').forEach(function (el) {
      var w = wrapFor(el);
      if (!wraps.has(w)) wraps.set(w, []);
      wraps.get(w).push(el);
    });
    wraps.forEach(function (els, w) {
      w.hidden = els.some(fieldEmpty);
    });

    /* --- lists: hide empty items, hide the list if nothing is left --- */
    $$('[data-list]').forEach(function (list) {
      var visible = 0;
      Array.prototype.forEach.call(list.children, function (li) {
        if (!li.querySelector('[data-field]')) {
          li.hidden = !li.textContent.trim();
        }
        if (!li.hidden) visible++;
      });
      list.hidden = visible === 0;
    });

    /* --- decorative separators disappear with their content --- */
    $$('[data-sep]').forEach(function (sep) {
      var parent = sep.parentElement;
      var kids = $$('[data-field]', parent);
      sep.hidden = kids.some(function (k) { return k.hidden || fieldEmpty(k); });
    });

    /* --- containers: hide when their content is gone --- */
    RULE_HIDE_ALL_FIELDS.forEach(function (sel) {
      $$(sel).forEach(function (box) {
        var kids = Array.prototype.filter.call(box.children, function (c) {
          return c.hasAttribute('data-field');
        });
        if (!kids.length) { box.hidden = false; return; }
        box.hidden = kids.every(function (k) { return k.hidden; });
      });
    });
    RULE_HIDE_ALL_CHILDREN.forEach(function (sel) {
      $$(sel).forEach(function (box) {
        var kids = box.children;
        box.hidden = kids.length > 0 && Array.prototype.every.call(kids, function (k) {
          return k.hidden;
        });
      });
    });

    /* --- images: broken or missing pic -> placeholder --- */
    $$('img[data-field]').forEach(function (img) {
      watchImage(img);
      markNoImg(img, fieldEmpty(img));
    });

    /* --- stats + counters + skills --- */
    $$('[data-count]').forEach(parseCount);
    $$('.skill').forEach(function (skill) {
      var lvl = clamp(parseInt(skill.dataset.level, 10) || 0, 0, 100);
      skill.style.setProperty('--lvl', lvl + '%');
      var pct = $('.skill__pct', skill);
      if (pct) pct.textContent = lvl + '%';
    });

    /* --- hero roles list --- */
    var roleList = $('#roleList');
    var rolesEl = $('.hero__roles');
    if (roleList && rolesEl) {
      rolesEl.hidden = roleList.hidden || readRoles().length === 0;
    }
  }

  function readRoles() {
    var list = $('#roleList');
    if (!list) return [];
    return $$('#roleList li')
      .map(function (li) { return li.textContent.trim(); })
      .filter(Boolean);
  }

  /* ======================================================================
     2. PRELOADER — letter by letter, then slides away
     ====================================================================== */

  function initPreloader() {
    var pre = $('#preloader');
    var nameEl = $('#preName');
    var heroEl = $('#heroName');
    if (!pre) { startMain(); return; }

    var name = heroEl && !heroEl.closest('[hidden]') ? heroEl.textContent.trim() : '';
    if (nameEl) {
      nameEl.textContent = '';
      name.split('').forEach(function (ch, i) {
        var s = doc.createElement('span');
        s.textContent = ch === ' ' ? '\u00A0' : ch;
        s.style.setProperty('--ld', (0.1 + i * 0.06).toFixed(2) + 's');
        nameEl.appendChild(s);
      });
    }
    var wait = reduced()
      ? 250
      : (name ? Math.max(1500, 620 + name.length * 60) : 500);
    setTimeout(function () {
      pre.classList.add('is-done');
      doc.body.classList.remove('is-loading');
      startMain();
    }, wait);
  }

  function startMain() {
    if (mainStarted) return;
    mainStarted = true;
    initReveal();
    initTyping();
  }

  /* ======================================================================
     3. THEME — light/dark with circular reveal, persisted
     ====================================================================== */

  function initTheme() {
    var btn = $('#themeToggle');
    if (!btn) return;
    function syncLabel() {
      var light = root.getAttribute('data-theme') === 'light';
      btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('aria-pressed', light ? 'true' : 'false');
    }
    syncLabel();
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      var apply = function () {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('demo-theme', next); } catch (e) {}
        syncLabel();
      };
      if (doc.startViewTransition && !reduced()) {
        var r = btn.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var max = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
        root.style.setProperty('--vt-x', cx + 'px');
        root.style.setProperty('--vt-y', cy + 'px');
        root.style.setProperty('--vt-r', Math.ceil(max) + 'px');
        doc.startViewTransition(apply);
      } else {
        apply();
      }
    });
  }

  /* ======================================================================
     4. SCROLL — progress bar, sticky nav, active section, back to top
     ====================================================================== */

  var scrollHooks = [];
  var scrollScheduled = false;

  function onScroll() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(function () {
      scrollScheduled = false;
      var y = window.pageYOffset || doc.documentElement.scrollTop;
      var max = Math.max(1, doc.documentElement.scrollHeight - innerHeight);

      var bar = $('#progressBar');
      if (bar) bar.style.transform = 'scaleX(' + clamp(y / max, 0, 1) + ')';

      var topbar = $('#topbar');
      if (topbar) topbar.classList.toggle('is-scrolled', y > 24);

      var toTop = $('#toTop');
      if (toTop) toTop.classList.toggle('is-show', y > 600);

      var hero = $('.hero');
      if (hero && !reduced()) {
        hero.style.setProperty('--sy', (Math.min(y, innerHeight) * 0.14).toFixed(1) + 'px');
      }

      scrollHooks.forEach(function (fn) { fn(y); });
    });
  }

  function initScroll() {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    var toTop = $('#toTop');
    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      });
    }
  }

  function initNav() {
    var toggle = $('#navToggle');
    var list = $('#navList');

    function setMenu(open) {
      doc.body.classList.toggle('menu-open', open);
      if (toggle) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        var use = toggle.querySelector('use');
        if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
      }
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        setMenu(!doc.body.classList.contains('menu-open'));
      });
    }
    if (list) {
      list.addEventListener('click', function (e) {
        if (e.target.closest('a')) setMenu(false);
      });
    }
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.body.classList.contains('menu-open')) setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (innerWidth > 860) setMenu(false);
    });

    /* active section highlight */
    var links = $$('.nav__link');
    if (!('IntersectionObserver' in window) || !links.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    $$('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ======================================================================
     5. REVEAL / COUNTERS / SKILLS / TIMELINE
     ====================================================================== */

  function initReveal() {
    var items = $$('[data-reveal]');
    if (reduced() || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      if (!el._to) return;
      var to = el._to;
      var write = function (v) {
        el.textContent = to.pre + v + to.suf;
      };
      if (reduced() || !('IntersectionObserver' in window)) { write(to.n); return; }
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        if (el.closest('[hidden]')) { write(to.n); return; }
        var start = performance.now();
        var dur = 1500;
        (function frame(now) {
          var p = clamp((now - start) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          write(Math.round(to.n * eased));
          if (p < 1) requestAnimationFrame(frame);
        })(start);
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  function initSkills() {
    var skills = $$('.skill');
    if (!skills.length) return;
    if (reduced() || !('IntersectionObserver' in window)) {
      skills.forEach(function (s) { s.classList.add('is-on'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-on');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.35 });
    skills.forEach(function (s) { io.observe(s); });
  }

  function initTimeline() {
    var tl = $('[data-timeline]');
    if (!tl) return;
    if (reduced()) { tl.style.setProperty('--draw', 1); return; }
    var update = function () {
      var r = tl.getBoundingClientRect();
      var p = (innerHeight * 0.78 - r.top) / Math.max(1, r.height);
      tl.style.setProperty('--draw', clamp(p, 0, 1).toFixed(3));
    };
    tl.style.setProperty('--draw', '0');
    scrollHooks.push(update);
    update();
  }

  /* ======================================================================
     6. TABS — My Projects / Team Projects with sliding indicator
     ====================================================================== */

  function initTabs() {
    var list = $('.tabs__list');
    if (!list) return;
    var tabs = $$('.tabs__tab', list);
    var ink = $('.tabs__ink', list);
    if (!tabs.length || !ink) return;

    function moveInk() {
      var active = list.querySelector('.tabs__tab.is-active') || tabs[0];
      ink.style.width = active.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    }

    function select(tab, moveFocus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      moveInk();
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab);
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });

    moveInk();
    if (window.ResizeObserver) {
      new ResizeObserver(moveInk).observe(list);
    } else {
      window.addEventListener('resize', moveInk);
    }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(moveInk);
  }

  /* ======================================================================
     7. PROJECT CARDS — flip, tilt + sheen, lightbox
     ====================================================================== */

  function initFlip() {
    $$('.p-card').forEach(function (card) {
      var front = $('.p-card__front', card);
      var back = $('.p-card__back', card);
      if (!front || !back) return;
      var frontBtn = card.querySelector('.p-card__btn:not(.p-card__btn-back)');
      var backBtn = $('.p-card__btn-back', card);
      var flipEl = $('.p-card__flip', card);
      var hoverTimer = 0;

      function set(on) {
        var was = card.classList.contains('is-flipped');
        if (was === on) return;
        card.classList.toggle('is-flipped', on);
        if ('inert' in HTMLElement.prototype) {
          front.inert = on;
          back.inert = !on;
        }
        if (frontBtn) frontBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      }

      /* focus can only land on a face once it has rotated into view */
      function focusAfter(target) {
        if (!target) return;
        var done = false;
        var run = function () {
          if (done) return;
          done = true;
          try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
        };
        if (flipEl) {
          flipEl.addEventListener('transitionend', function handler(e) {
            if (e.target !== flipEl || e.propertyName !== 'transform') return;
            flipEl.removeEventListener('transitionend', handler);
            run();
          });
        }
        setTimeout(run, 950);
      }

      /* initialise face interactivity explicitly: set(false) would
         early-return here because the class is not set yet */
      if ('inert' in HTMLElement.prototype) {
        front.inert = false;
        back.inert = true;
      }
      if (frontBtn) frontBtn.setAttribute('aria-expanded', 'false');

      /* hover flip (with a small dwell) opens details; the picture area is
         excluded so clicks there reach the lightbox */
      var zone = $('.p-card__body', card);
      if (zone) {
        zone.addEventListener('pointerenter', function () {
          if (!mqFine.matches) return;
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function () { set(true); }, 160);
        });
        zone.addEventListener('pointerleave', function () { clearTimeout(hoverTimer); });
      }
      card.addEventListener('pointerleave', function () {
        clearTimeout(hoverTimer);
        set(false);
      });

      card.addEventListener('focusin', function (e) {
        if (back.contains(e.target)) set(true);
      });
      card.addEventListener('focusout', function (e) {
        if (!card.contains(e.relatedTarget) && !card.matches(':hover')) set(false);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { clearTimeout(hoverTimer); set(false); }
      });

      /* buttons force a state instead of toggling, so a hover that flips the
         card while the pointer travels to the button cannot race the click */
      if (frontBtn) {
        frontBtn.addEventListener('click', function () {
          clearTimeout(hoverTimer);
          set(true);
          focusAfter(backBtn);
        });
      }
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          clearTimeout(hoverTimer);
          set(false);
          focusAfter(frontBtn);
        });
      }
    });
  }

  function initTilt() {
    if (!mqFine.matches || reduced()) return;
    $$('[data-tilt]').forEach(function (card) {
      var tilt = $('.p-card__tilt', card) || card;
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        tilt.style.transform =
          'rotateX(' + ((0.5 - y) * 9).toFixed(2) + 'deg) rotateY(' +
          ((x - 0.5) * 11).toFixed(2) + 'deg)';
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        tilt.style.transform = '';
      });
    });
  }

  function initLightbox() {
    var dlg = $('#lightbox');
    if (!dlg) return;
    var img = $('#lbImg');
    var ph = $('#lbPh');
    var cap = $('#lbCap');
    var closeBtn = $('#lbClose');
    var lastFocus = null;

    function captionFor(media) {
      var card = media.closest('.p-card');
      if (card) {
        var t = $('.p-card__title', card);
        return t ? t.textContent.trim() : '';
      }
      var h = $('#heroName');
      return h ? h.textContent.trim() : '';
    }

    function open(source) {
      if (source.showPh) {
        img.hidden = true;
        img.removeAttribute('src');
        ph.hidden = false;
      } else {
        ph.hidden = true;
        img.hidden = false;
        img.src = source.src;
        img.alt = source.alt || '';
      }
      cap.textContent = source.cap || '';
      lastFocus = doc.activeElement;
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (dlg.open && typeof dlg.close === 'function') dlg.close();
      else dlg.removeAttribute('open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    doc.addEventListener('click', function (e) {
      var pic = e.target.closest('.p-card__media img, .hero__pic');
      if (pic && !pic.hidden) {
        e.preventDefault();
        open({
          src: pic.currentSrc || pic.src,
          alt: pic.alt,
          cap: captionFor(pic),
          showPh: false
        });
        return;
      }
      var box = e.target.closest('.p-card__media, .hero__frame');
      if (box && box.classList.contains('is-noimg')) {
        e.preventDefault();
        open({ showPh: true, cap: captionFor(box) || box.textContent.trim() });
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) close();
    });
    dlg.addEventListener('close', function () {
      if (lastFocus && lastFocus.focus && doc.activeElement === doc.body) lastFocus.focus();
    });
  }

  /* ======================================================================
     8. MICRO-INTERACTIONS — magnetic buttons, ripples, custom cursor,
        hero parallax, constellation canvas
     ====================================================================== */

  function initMagnetic() {
    if (!mqFine.matches || reduced()) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform =
          'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  function initRipple() {
    if (reduced()) return;
    doc.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.btn, .icon-btn, .p-card__btn, .tabs__tab');
      if (!b) return;
      var r = b.getBoundingClientRect();
      if (!r.width) return;
      var size = Math.max(r.width, r.height) * 0.6;
      var s = doc.createElement('span');
      s.className = 'ripple';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left) + 'px';
      s.style.top = (e.clientY - r.top) + 'px';
      s.addEventListener('animationend', function () { s.remove(); });
      b.appendChild(s);
    });
  }

  function initCursor() {
    if (!mqFine.matches || reduced()) return;
    var dot = $('.cursor-dot');
    var ring = $('.cursor-ring');
    if (!dot || !ring) return;
    doc.body.classList.add('has-cursor');

    var mx = -100, my = -100, rx = -100, ry = -100;
    var raf = 0;

    doc.addEventListener('pointermove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    function tick() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    doc.addEventListener('pointerover', function (e) {
      var hot = e.target.closest('a, button, [data-tilt], .hero__frame, input, textarea, label');
      ring.classList.toggle('is-hot', !!hot);
      doc.body.classList.toggle('has-cursor', true);
    });
    doc.addEventListener('pointerout', function (e) {
      if (!e.relatedTarget) doc.body.classList.remove('has-cursor');
    });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    });
  }

  function initParallax() {
    var hero = $('.hero');
    if (!hero || reduced() || !mqFine.matches) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      var y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      hero.style.setProperty('--px', x.toFixed(3));
      hero.style.setProperty('--py', y.toFixed(3));
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--px', '0');
      hero.style.setProperty('--py', '0');
    });
  }

  function initConstellation() {
    var cv = $('#constellation');
    if (!cv) return;
    if (reduced()) { cv.style.display = 'none'; return; }
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], raf = 0, running = false;
    var mx = -9999, my = -9999;
    var C1 = 'rgba(129, 140, 248,', C2 = 'rgba(34, 211, 238,';

    function size() {
      w = cv.clientWidth;
      h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = clamp(Math.round((w * h) / 15000), 26, 90);
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.7 + 0.7
        });
      }
    }

    function draw() {
      if (!w || !h) { size(); if (!w) return; }
      ctx.clearRect(0, 0, w, h);
      var i, j, p, q, dx, dy, d, alpha;

      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        dx = p.x - mx;
        dy = p.y - my;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110 && d > 0.01) {
          p.x += (dx / d) * (110 - d) * 0.02;
          p.y += (dy / d) * (110 - d) * 0.02;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? C2 + '0.75)' : C1 + '0.8)';
        ctx.fill();
      }

      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          p = pts[i];
          q = pts[j];
          dx = p.x - q.x;
          dy = p.y - q.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < 118) {
            alpha = (1 - d / 118) * 0.32;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = (i + j) % 2 ? C2 + alpha.toFixed(3) + ')' : C1 + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running || doc.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    size();
    window.addEventListener('resize', function () {
      size();
      if (!running) draw();
    });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) stop(); else start();
    });

    var hero = $('.hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else stop();
      }, { threshold: 0 }).observe(hero);
      hero.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener('pointerleave', function () {
        mx = my = -9999;
      });
    } else {
      start();
    }
  }

  /* ======================================================================
     9. TYPING EFFECT for hero roles
     ====================================================================== */

  function initTyping() {
    var out = $('#typedRole');
    var roles = readRoles();
    if (!out || !roles.length) return;
    if (reduced()) return;

    var i = 0, ci = 0, deleting = false;
    (function step() {
      var word = roles[i];
      ci += deleting ? -1 : 1;
      out.textContent = word.slice(0, ci);
      var t = deleting ? 42 : 72;
      if (!deleting && ci === word.length) {
        deleting = true;
        t = 1700;
      } else if (deleting && ci === 0) {
        deleting = false;
        i = (i + 1) % roles.length;
        t = 380;
      }
      setTimeout(step, t);
    })();
  }

  /* ======================================================================
     10. CONTACT FORM — validation, confetti, success
     ====================================================================== */

  function confettiBurst(x, y) {
    if (reduced()) return;
    var cv = $('#confetti');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(innerWidth * dpr)) {
      cv.width = Math.round(innerWidth * dpr);
      cv.height = Math.round(innerHeight * dpr);
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var colors = ['#6366f1', '#22d3ee', '#14b8a6', '#f5b942', '#a78bfa'];
    var parts = [];
    var count = 130;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 3 + Math.random() * 9;
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 4,
        w: 5 + Math.random() * 7,
        h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        c: colors[i % colors.length],
        life: 1
      });
    }
    cv.classList.add('is-on');
    var start = performance.now();
    var running = true;
    cv._confettiStop = function () { running = false; };

    (function frame(now) {
      var elapsed = (now - start) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var alive = 0;
      parts.forEach(function (p) {
        p.vy += 0.22;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / 2.1);
        if (p.life <= 0) return;
        alive++;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (running && alive > 0 && elapsed < 2.3) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        cv.classList.remove('is-on');
      }
    })(start);
  }

  function initForm() {
    var form = $('#contactForm');
    if (!form) return;
    var success = $('#formSuccess');
    if (success) success.setAttribute('aria-live', 'polite');

    function errorEl(input) {
      return input.nextElementSibling &&
        input.nextElementSibling.classList.contains('field__error')
        ? input.nextElementSibling : null;
    }
    function clearError(input) {
      input.removeAttribute('aria-invalid');
      var err = errorEl(input);
      if (err) { err.hidden = true; err.textContent = ''; }
    }
    function showError(input, msg) {
      input.setAttribute('aria-invalid', 'true');
      var err = errorEl(input);
      if (err) { err.textContent = msg; err.hidden = false; }
    }

    $$('input, textarea', form).forEach(function (input) {
      input.addEventListener('input', function () {
        clearError(input);
        if (success) success.hidden = true;
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var first = null;

      $$('[required]', form).forEach(function (input) {
        clearError(input);
        var v = input.value.trim();
        if (!v) {
          showError(input, input.dataset.msgRequired || 'This field is required.');
          ok = false;
          first = first || input;
        } else if (input.type === 'email' &&
                   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          showError(input, input.dataset.msgEmail || 'Please enter a valid email.');
          ok = false;
          first = first || input;
        }
      });

      if (!ok) {
        form.classList.remove('is-shake');
        void form.offsetWidth;
        form.classList.add('is-shake');
        if (first) first.focus();
        return;
      }

      if (success && success.textContent.trim()) {
        success.hidden = false;
        success.tabIndex = -1;
        try { success.focus({ preventScroll: true }); } catch (err) { success.focus(); }
      }
      var btn = form.querySelector('[type="submit"]');
      var r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
      form.reset();
    });
  }

  /* ======================================================================
     11. TOAST — demo-link note + easter egg message (texts live in HTML)
     ====================================================================== */

  function initToasts() {
    var toast = $('#toast');
    var toastText = $('#toastText');
    if (!toast || !toastText) return;
    var timer = 0;

    function show(text, ms) {
      if (!text) return;
      clearTimeout(timer);
      toastText.textContent = text;
      toast.hidden = false;
      requestAnimationFrame(function () {
        toast.classList.add('is-show');
      });
      timer = setTimeout(function () {
        toast.classList.remove('is-show');
        setTimeout(function () { toast.hidden = true; }, 420);
      }, ms || 4200);
    }
    window.__showToast = show;

    /* placeholder hrefs never navigate: they show a friendly note */
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = (a.getAttribute('href') || '').trim();
      if (href === '') { e.preventDefault(); return; }
      if (href === '#' || href.indexOf('#demo') === 0) {
        e.preventDefault();
        var msg = $('#msgLink');
        show(msg ? msg.textContent.trim() : '');
      }
    });

    /* hidden easter egg: type "demo" anywhere (outside form fields) */
    var buf = '';
    doc.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && typeof t.matches === 'function' &&
          (t.matches('input, textarea, select') || t.isContentEditable)) return;
      if (!e.key || e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-8);
      if (buf.indexOf('demo') !== -1) {
        buf = '';
        var egg = $('#msgEgg');
        show(egg ? egg.textContent.trim() : '', 5200);
        confettiBurst(innerWidth / 2, innerHeight * 0.35);
      }
    });
  }

  /* ======================================================================
     12. BOOT
     ====================================================================== */

  function boot() {
    hydrate();
    initTheme();
    initScroll();
    initNav();
    initCounters();
    initSkills();
    initTimeline();
    initTabs();
    initFlip();
    initTilt();
    initLightbox();
    initMagnetic();
    initRipple();
    initCursor();
    initParallax();
    initConstellation();
    initForm();
    initToasts();
    initPreloader();
  }

  /* debug/testing hook: re-reads the HTML and re-applies hide rules */
  window.__demo = { hydrate: hydrate, readRoles: readRoles };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
