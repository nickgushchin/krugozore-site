/* Ygor · ygor.app: story circles and the silent-film story viewer for "Eight things to know".
   Progressive enhancement: the eight reel cards in #story stay the real content. This script
   reads them (picture, intertitle, caption, data-label) and adds a row of story circles that
   open a full-screen viewer, a tiny 1930s picture house: toned frame, grain, flicker, gate
   weave, iris in and out, then the intertitle card.
   Nothing is stored: "seen" lives in memory for this page view only. The music loads only when
   you open a story and starts with that tap. No library, no network calls beyond our own files. */
(function () {
  'use strict';
  var MUSIC = 'assets/audio/maple-leaf-rag-loop.m4a';
  var CREDIT = 'Music: “Maple Leaf Rag” (Scott Joplin), U.S. Marine Band, 1906 · public domain';

  var section = document.getElementById('story');
  var list = section && section.querySelector('.reels');
  var head = section && section.querySelector('.story-head');
  if (!list || !head || typeof HTMLDialogElement !== 'function' || !window.requestAnimationFrame) return;

  // Where to look in each picture, as fractions of its width and height:
  // ring = circle crop [x, y, zoom], cam = camera-move centre, lamp = lantern glow.
  var STATION = { ring: [0.5, 0.53, 2], cam: [0.6, 0.52], lamp: [0.65, 0.54] };
  var BENCH = { ring: [0.3, 0.79, 2.4], cam: [0.42, 0.66], lamp: [0.37, 0.86] };

  var FILM_FPS = 18;     // the projector runs at silent speed; the progress bars stay smooth
  var IRIS_IN = 0.7;     // seconds
  var IRIS_OUT = 0.6;
  var SCENE = 5.2;       // seconds on the picture before the title card

  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function still() { return !!(motion && motion.matches); }

  var items = [].map.call(list.querySelectorAll('.reel'), function (li, i) {
    var img = li.querySelector('.reel-art img');
    var title = li.querySelector('.intertitle');
    var means = li.querySelector('.means');
    var set = img ? (img.getAttribute('srcset') || '') : '';
    var big = set ? set.split(',').pop().trim().split(/\s+/)[0] : '';
    var words = title ? title.textContent.replace(/\s+/g, ' ').trim().length : 40;
    return {
      li: li, img: img, title: title,
      label: li.getAttribute('data-label') || 'Story ' + (i + 1),
      means: li.getAttribute('data-caption') || (means ? means.textContent.trim() : ''),
      big: big || (img ? img.getAttribute('src') : ''),
      sepia: li.classList.contains('sepia'),
      look: i === 0 ? STATION : BENCH,
      // the card stays up long enough to read it
      card: Math.min(5.2, Math.max(3.2, 2.6 + words * 0.03)),
      seen: false, ring: null
    };
  }).filter(function (it) { return it.img && it.title; });
  if (!items.length) return;

  // ---- The circles --------------------------------------------------------------------
  var scroller = document.createElement('div');
  scroller.className = 'rings-scroll';
  var row = document.createElement('ul');
  row.className = 'rings';
  row.setAttribute('aria-label', 'Stories');
  items.forEach(function (it, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ring';
    b.setAttribute('aria-label', it.label + ': story ' + (i + 1) + ' of ' + items.length);
    var pic = document.createElement('span');
    pic.className = 'ring-pic';
    pic.appendChild(cropImage(it));
    var name = document.createElement('span');
    name.className = 'ring-label';
    name.textContent = it.label;
    b.appendChild(pic);
    b.appendChild(name);
    b.addEventListener('click', function () { open(i); });
    li.appendChild(b);
    row.appendChild(li);
    it.ring = b;
  });
  scroller.appendChild(row);
  head.parentNode.insertBefore(scroller, head.nextSibling);
  head.parentNode.classList.add('has-rings');

  function cropImage(it) {
    // Same file choice as the reel card below, so the browser fetches each picture once.
    var im = document.createElement('img');
    im.alt = '';
    im.loading = 'lazy';
    im.decoding = 'async';
    im.width = 720; im.height = 960;
    im.sizes = it.img.getAttribute('sizes') || '';
    im.srcset = it.img.getAttribute('srcset') || '';
    im.src = it.img.getAttribute('src');
    var r = it.look.ring;
    im.style.setProperty('--fx', r[0]);
    im.style.setProperty('--fy', r[1]);
    im.style.setProperty('--z', r[2]);
    var crop = document.createElement('span');
    crop.className = 'crop';
    crop.appendChild(im);
    return crop;
  }

  // ---- The viewer, built on first use -------------------------------------------------
  var dlg, frame, bars, stage, cam, shot, pic, glow, card, film, ctx, cap, live, titleEl, countEl, avatar, btnPause, btnMute;
  var cur = -1, t = 0, last = 0, raf = 0, lastFilm = -1;
  var userPaused = false, held = false, waiting = false, hidden = false;
  var audio = null, muted = false;

  var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path class="i-pause" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="i-play" d="M8 5v14l11-7z"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="i-on" d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="i-off" d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'sv';
    dlg.setAttribute('aria-label', 'Eight things to know about Ygor');
    var barHtml = '';
    for (var i = 0; i < items.length; i++) barHtml += '<span><i></i></span>';
    dlg.innerHTML =
      '<div class="sv-frame" tabindex="-1" autofocus>' +
        '<div class="sv-bars" aria-hidden="true">' + barHtml + '</div>' +
        '<div class="sv-head">' +
          '<span class="sv-avatar" aria-hidden="true"></span>' +
          '<p class="sv-title"><b></b> <span></span></p>' +
          '<button type="button" class="sv-btn sv-pause" aria-label="Pause" aria-pressed="false">' + ICON_PAUSE + '</button>' +
          '<button type="button" class="sv-btn sv-mute" aria-label="Mute music" aria-pressed="false">' + ICON_SOUND + '</button>' +
          '<button type="button" class="sv-btn sv-close" aria-label="Close stories">' + ICON_CLOSE + '</button>' +
        '</div>' +
        '<div class="sv-stage">' +
          '<div class="sv-shot"><div class="sv-cam"><img class="sv-img" alt=""><span class="sv-glow" aria-hidden="true"></span></div></div>' +
          '<div class="sv-card"></div>' +
          '<canvas class="sv-film" aria-hidden="true"></canvas>' +
        '</div>' +
        '<p class="sv-cap"></p>' +
        '<p class="sv-credit"></p>' +
        '<button type="button" class="sv-tap sv-prev" aria-label="Previous story"><span class="sv-chev" aria-hidden="true">‹</span></button>' +
        '<button type="button" class="sv-tap sv-next" aria-label="Next story"><span class="sv-chev" aria-hidden="true">›</span></button>' +
        '<p class="sv-live" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(dlg);

    function q(s) { return dlg.querySelector(s); }
    frame = q('.sv-frame'); stage = q('.sv-stage'); shot = q('.sv-shot'); cam = q('.sv-cam');
    pic = q('.sv-img'); glow = q('.sv-glow'); card = q('.sv-card'); film = q('.sv-film');
    cap = q('.sv-cap'); live = q('.sv-live'); avatar = q('.sv-avatar');
    titleEl = q('.sv-title b'); countEl = q('.sv-title span');
    btnPause = q('.sv-pause'); btnMute = q('.sv-mute');
    bars = [].slice.call(dlg.querySelectorAll('.sv-bars i'));
    q('.sv-credit').textContent = CREDIT;
    ctx = film.getContext('2d');

    q('.sv-close').addEventListener('click', close);
    q('.sv-prev').addEventListener('click', function () { if (!swallow()) go(cur - 1); });
    q('.sv-next').addEventListener('click', function () { if (!swallow()) go(cur + 1); });
    btnPause.addEventListener('click', function () { userPaused = !userPaused; syncPause(); });
    btnMute.addEventListener('click', function () { muted = !muted; syncMute(); });
    pic.addEventListener('load', function () { waiting = false; });
    pic.addEventListener('error', function () { waiting = false; });

    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('close', teardown);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener('keydown', onKey);
    frame.addEventListener('pointerdown', onDown);
    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerup', onUp);
    frame.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', function () { if (dlg.open) sizeFilm(); });
    document.addEventListener('visibilitychange', function () {
      hidden = document.hidden;
      if (dlg.open) syncPause();
    });
    if (motion && motion.addEventListener) motion.addEventListener('change', function () { if (dlg.open) show(cur); });
  }

  // ---- Open, move, close --------------------------------------------------------------
  function open(i) {
    if (!dlg) build();
    music();                       // inside the tap, so iOS lets it play
    userPaused = false; held = false;
    document.documentElement.classList.add('sv-lock');
    if (!dlg.open) dlg.showModal();
    sizeFilm();
    show(i);
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function close() {
    if (dlg && dlg.open) dlg.close();
  }

  function teardown() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (audio) audio.pause();
    document.documentElement.classList.remove('sv-lock');
    frame.style.transform = '';
    frame.style.opacity = '';
    var it = items[cur];
    if (it && it.ring) it.ring.focus();
  }

  function go(i) {
    if (i < 0) i = 0;
    if (i >= items.length) { close(); return; }
    show(i);
  }

  function show(i) {
    cur = i; t = 0; lastFilm = -1;
    var it = items[i];
    it.seen = true;
    it.ring.classList.add('is-seen');
    bars.forEach(function (b, k) { b.style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')'; });

    stage.classList.toggle('is-sepia', it.sepia);
    stage.style.setProperty('--cx', it.look.cam[0]);
    stage.style.setProperty('--cy', it.look.cam[1]);
    stage.style.setProperty('--lx', it.look.lamp[0]);
    stage.style.setProperty('--ly', it.look.lamp[1]);
    waiting = true;
    pic.alt = it.img.alt;
    pic.src = it.big;
    if (pic.complete && pic.naturalWidth) waiting = false;
    shot.style.transform = '';
    cam.style.transform = '';
    glow.style.transform = '';
    glow.style.opacity = '';

    card.className = 'sv-card' + (it.sepia ? ' sepia' : '');
    card.textContent = '';
    card.appendChild(it.title.cloneNode(true));
    card.classList.remove('is-on');
    cap.textContent = it.means;

    avatar.textContent = '';
    avatar.appendChild(cropImage(it));
    titleEl.textContent = it.label;
    countEl.textContent = (i + 1) + ' / ' + items.length;
    live.textContent = 'Story ' + (i + 1) + ' of ' + items.length + ': ' + it.label;

    var next = items[i + 1];
    if (next) { var pre = new Image(); pre.decoding = 'async'; pre.src = next.big; }
    drawFilm(0);
  }

  function duration(it) { return SCENE + it.card; }

  // ---- The clock ----------------------------------------------------------------------
  function paused() { return userPaused || held || hidden; }

  function syncPause() {
    btnPause.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    btnPause.setAttribute('aria-label', userPaused ? 'Play' : 'Pause');
    if (!audio) return;
    if (paused() || !dlg.open) audio.pause();
    else play();
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = Math.min(now - last, 100);
    last = now;
    if (paused() || waiting) return;
    t += dt / 1000;
    var it = items[cur];
    var d = duration(it);
    if (t >= d) { go(cur + 1); return; }
    bars[cur].style.transform = 'scaleX(' + (t / d).toFixed(4) + ')';
    var f = Math.floor(t * FILM_FPS);
    if (f !== lastFilm) { lastFilm = f; drawFilm(t); }
  }

  // ---- One frame of film ----------------------------------------------------------------
  var W = 0, H = 0, grain = [], vignette = null, scratches = [];

  function sizeFilm() {
    var r = stage.getBoundingClientRect();
    var w = Math.max(60, Math.round(r.width / 2));
    var h = Math.max(80, Math.round(r.height / 2));
    if (w === W && h === H) return;
    W = film.width = w; H = film.height = h;
    grain = [];
    for (var k = 0; k < 5; k++) grain.push(noise(w, h));
    vignette = document.createElement('canvas');
    vignette.width = w; vignette.height = h;
    var v = vignette.getContext('2d');
    var g = v.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,6,2,0.72)');
    v.fillStyle = g;
    v.fillRect(0, 0, w, h);
  }

  function noise(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    var img = x.createImageData(w, h);
    var px = img.data;
    for (var p = 0; p < px.length; p += 4) {
      px[p] = px[p + 1] = px[p + 2] = Math.random() < 0.5 ? 246 : 20;
      px[p + 3] = Math.pow(Math.random(), 2.6) * 44;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }

  function drawFilm(s) {
    var it = items[cur];
    var d = duration(it);
    var calm = still();
    var onCard = s >= SCENE;
    if (onCard !== card.classList.contains('is-on')) card.classList.toggle('is-on', onCard);
    if (!W) return;

    ctx.clearRect(0, 0, W, H);
    if (calm) {
      // reduced motion: a still, toned frame with a fixed grain, no flicker, no iris
      ctx.drawImage(grain[0], 0, 0);
      ctx.drawImage(vignette, 0, 0);
      return;
    }

    // camera: a slow push in (odd stories) or pull back (even), gate weave, a rubber-hose bounce
    var k = ease(Math.min(s / SCENE, 1));
    var zoom = cur % 2 ? 1.17 - 0.1 * k : 1.05 + 0.12 * k;
    cam.style.transform = 'scale(' + zoom.toFixed(4) + ')';
    var beat = Math.abs(Math.sin(s * Math.PI / 0.76));
    var sy = 1 + 0.016 * (beat - 0.4);
    var wx = 1.3 * Math.sin(s * 6.3) + 0.7 * Math.sin(s * 17.1) + (Math.random() - 0.5) * 1.2;
    var wy = 1.0 * Math.sin(s * 4.7 + 1) + (Math.random() - 0.5) * 1.2 - 3 * beat;
    if (Math.random() < 0.015) wy += 4;   // the odd skipped sprocket
    shot.style.transform = 'translate3d(' + wx.toFixed(2) + 'px,' + wy.toFixed(2) + 'px,0) scale(' + (1 / sy).toFixed(4) + ',' + sy.toFixed(4) + ')';
    var flame = 0.92 + 0.08 * Math.sin(s * 9.3) + Math.random() * 0.07;
    glow.style.transform = 'rotate(' + (5 * Math.sin(s * 2.2)).toFixed(2) + 'deg) scale(' + flame.toFixed(3) + ')';
    glow.style.opacity = (0.55 + 0.35 * Math.random()).toFixed(2);

    // flicker: the whole frame breathes a little darker or lighter
    ctx.fillStyle = Math.random() < 0.04 ? 'rgba(255,244,220,0.07)' : 'rgba(0,0,0,' + (0.03 + Math.random() * 0.09).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);

    // grain, shifted every frame
    var g = grain[(Math.random() * grain.length) | 0];
    var ox = (Math.random() * W) | 0, oy = (Math.random() * H) | 0;
    ctx.drawImage(g, -ox, -oy); ctx.drawImage(g, W - ox, -oy);
    ctx.drawImage(g, -ox, H - oy); ctx.drawImage(g, W - ox, H - oy);

    // scratches that live a few frames, and specks of dust
    if (Math.random() < 0.09) scratches.push({ x: Math.random() * W, life: 3 + (Math.random() * 10 | 0), a: 0.2 + Math.random() * 0.3, dark: Math.random() < 0.3 });
    scratches = scratches.filter(function (sc) { return sc.life-- > 0; });
    scratches.forEach(function (sc) {
      sc.x += (Math.random() - 0.5) * 1.5;
      ctx.strokeStyle = sc.dark ? 'rgba(20,12,4,' + sc.a + ')' : 'rgba(255,248,232,' + sc.a + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sc.x, 0);
      ctx.quadraticCurveTo(sc.x + (Math.random() - 0.5) * 4, H / 2, sc.x + (Math.random() - 0.5) * 3, H);
      ctx.stroke();
    });
    var specks = Math.random() < 0.5 ? 1 + (Math.random() * 3 | 0) : 0;
    for (var n = 0; n < specks; n++) {
      ctx.fillStyle = Math.random() < 0.6 ? 'rgba(15,10,5,0.55)' : 'rgba(255,248,232,0.5)';
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H, 0.4 + Math.random() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (Math.random() < 0.03) {   // a hair in the gate
      var hx = Math.random() * W, hy = Math.random() * H;
      ctx.strokeStyle = 'rgba(15,10,5,0.5)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.bezierCurveTo(hx + 8, hy - 6, hx + 4, hy + 10, hx + 14, hy + 6);
      ctx.stroke();
    }

    ctx.drawImage(vignette, 0, 0);

    // iris in on the lantern, iris out on the centre
    var r = -1, cx = W / 2, cy = H / 2;
    if (s < IRIS_IN) {
      r = ease(s / IRIS_IN);
      cx = W * (0.5 + (it.look.cam[0] - 0.5) * (1 - r));
      cy = H * (0.5 + (it.look.cam[1] - 0.5) * (1 - r));
    } else if (s > d - IRIS_OUT) {
      r = 1 - ease((s - (d - IRIS_OUT)) / IRIS_OUT);
    }
    if (r >= 0) {
      var R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * r;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    }
  }

  // ---- Music --------------------------------------------------------------------------
  function music() {
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = MUSIC;
    }
    syncMute();
    play();
  }

  function play() {
    if (!audio || muted) return;
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* blocked or unsupported: the stories still run */ });
  }

  function syncMute() {
    if (btnMute) {
      btnMute.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btnMute.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    }
    if (!audio) return;
    audio.muted = muted;
    if (muted) audio.pause();
    else if (dlg && dlg.open && !paused()) play();
  }

  // ---- Taps, holds, swipes, keys ------------------------------------------------------
  var down = null, holdTimer = 0, eatUntil = 0;

  // a hold or a swipe ends in a click on a tap zone; that click must not also move on
  function swallow() { return performance.now() < eatUntil; }
  function eat() { eatUntil = performance.now() + 400; }

  function onDown(e) {
    if (e.button || e.target.closest('.sv-head')) return;
    eatUntil = 0;
    down = { x: e.clientX, y: e.clientY };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () { held = true; syncPause(); }, 240);
  }

  function onMove(e) {
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearTimeout(holdTimer);
    if (dy > 10 && dy > Math.abs(dx)) {
      frame.style.transform = 'translate3d(0,' + dy.toFixed(0) + 'px,0) scale(' + Math.max(0.85, 1 - dy / 1600).toFixed(3) + ')';
      frame.style.opacity = Math.max(0.4, 1 - dy / 500).toFixed(2);
    }
  }

  function onUp(e) {
    if (!down) return;
    clearTimeout(holdTimer);
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    down = null;
    frame.style.transform = '';
    frame.style.opacity = '';
    if (held) { held = false; eat(); syncPause(); return; }
    if (e.type === 'pointercancel') return;
    if (dy > 90 && dy > Math.abs(dx)) { eat(); close(); return; }
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { eat(); go(dx < 0 ? cur + 1 : cur - 1); }
  }

  function onKey(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    else if ((e.key === ' ' || e.key === 'k') && !e.target.closest('button')) { e.preventDefault(); userPaused = !userPaused; syncPause(); }
    else if (e.key === 'm') { muted = !muted; syncMute(); }
  }
})();
