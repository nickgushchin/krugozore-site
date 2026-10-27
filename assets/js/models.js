/* Ygor · ygor.app: the models section, compact.
   Progressive enhancement: the twelve article.spec cards and the Smart Group example in #models
   stay the real content (and what no-JS readers and search engines see). This script reads them
   and adds three things:
   1. Ygor at the top of the section: his head opens, the old model pops out, a new one drops
      in, and he says one line about it. A tap opens the full card of the model he's holding.
   2. A compact list with the app's filter pills (OR-combined) and sort, one tap to the full card.
   3. A "Single models | Smart Groups" switch; Smart Groups shows the example group.
   No library, no network calls beyond our own files, nothing stored. */
(function () {
  'use strict';
  var section = document.getElementById('models');
  var head = section && section.querySelector('.section-head');
  if (!head || typeof HTMLDialogElement !== 'function' || !window.requestAnimationFrame) return;

  var LOGOS = 'assets/img/brand/';
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function still() { return !!(motion && motion.matches); }

  // ---- Read the cards ------------------------------------------------------------------
  function own(el) {
    // the element's own text, without its child elements (h4 "Qwen3 4B <span>Reasoning</span>")
    var t = '';
    for (var n = el ? el.firstChild : null; n; n = n.nextSibling) if (n.nodeType === 3) t += n.nodeValue;
    return t.replace(/\s+/g, ' ').trim();
  }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  var CAPS = { 'Text': 'text', 'Sees images': 'vision', 'Makes pictures': 'image', 'Uses tools': 'tools', 'Thinks first': 'reasoning' };

  var models = [].map.call(section.querySelectorAll('article.spec[data-model]'), function (a, i) {
    var h4 = a.querySelector('h4');
    var needs = txt(a.querySelector('.needs'));
    var size = txt(a.querySelector('.needs b'));
    var m = /([\d.]+)\s*(GB|MB)/.exec(size);
    var mem = /(\d+) GB memory/.exec(needs);
    var phone = /Needs (iPhone [^,.]*?) or newer/.exec(needs);
    var caps = {};
    [].forEach.call(a.querySelectorAll('.tags li'), function (li) { var c = CAPS[txt(li)]; if (c) caps[c] = true; });
    if (caps.text) caps.code = true;            // as in the app: code rides with text
    var rate = {};
    [].forEach.call(a.querySelectorAll('.rating div'), function (d) {
      var k = txt(d.querySelector('dt')).toLowerCase();
      var dots = d.querySelector('.dots');
      var n = dots && /\bd(\d)\b/.exec(dots.className);
      rate[k] = n ? +n[1] : (k === 'time' ? txt(d.querySelector('dd')) : 0);
    });
    var brand = a.getAttribute('data-brand');
    return {
      el: a, i: i, id: a.getAttribute('data-model'), brand: brand,
      logo: LOGOS + brand + (brand === 'apple' ? '.svg' : '.webp'),
      name: own(h4), suffix: txt(h4 && h4.querySelector('span')),
      maker: own(a.querySelector('.maker')).replace(/^Made by\s+/, ''),
      mb: m ? parseFloat(m[1]) * (m[2] === 'GB' ? 1000 : 1) : 0,
      size: m ? size : 'Built into iOS',
      mem: mem ? mem[1] + ' GB memory' : (phone ? phone[1] + '+' : ''),
      caps: caps, q: rate.quality || 0, s: rate.speed || 0,
      time: typeof rate.time === 'string' ? rate.time.replace(/^About\s*/, '~').replace(/ per 512 px picture.*/, ' a picture') : '',
      line: a.getAttribute('data-line') || '',
      turn: +a.getAttribute('data-turn') || 99 + i
    };
  });
  if (!models.length) return;
  var byId = {};
  models.forEach(function (m) { byId[m.id] = m; });

  // ---- Small parts ---------------------------------------------------------------------
  var NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    text: '<rect x="2" y="2" width="12" height="12" rx="3"/><path d="M5.2 5.6h5.6M8 5.6v5.4"/>',
    code: '<path d="M5.4 4.6 2 8l3.4 3.4M10.6 4.6 14 8l-3.4 3.4M9.1 3.2 6.9 12.8"/>',
    vision: '<path d="M1.5 8S4 3.6 8 3.6 14.5 8 14.5 8 12 12.4 8 12.4 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
    image: '<rect x="1.8" y="2.6" width="12.4" height="10.8" rx="2"/><path d="m2.4 12 3.8-3.8 2.8 2.8 1.8-1.8 3.2 3.2"/><circle cx="10.8" cy="6" r="1.1"/>',
    reasoning: '<path d="M8 3.1C7.2 2 5.3 2 4.6 3.3 3.2 3.4 2.4 4.7 2.8 5.9 1.8 6.6 1.7 8.1 2.5 8.9c-.4 1.3.4 2.7 1.8 2.9.4 1.3 1.9 1.9 3.1 1.2.2-.1.4-.3.6-.5.2.2.4.4.6.5 1.2.7 2.7.1 3.1-1.2 1.4-.2 2.2-1.6 1.8-2.9.8-.8.7-2.3-.3-3 .4-1.2-.4-2.5-1.8-2.6C10.7 2 8.8 2 8 3.1zM8 3.1v10.2M5.3 6.2c.9.1 1.5.8 1.5 1.7M10.7 6.2c-.9.1-1.5.8-1.5 1.7M4.6 10c.7-.4 1.6-.2 2.1.4M11.4 10c-.7-.4-1.6-.2-2.1.4"/>',
    tools: '<path d="M10.4 2.2a3.3 3.3 0 0 0-3 4.4L2.6 11.4a1.4 1.4 0 0 0 2 2l4.8-4.8a3.3 3.3 0 0 0 4.4-3l-2 2-1.9-.5-.5-1.9 2-2z"/>'
  };
  var CAP_NAMES = { text: 'Text', vision: 'Vision', image: 'Image', tools: 'Tools', reasoning: 'Reasoning', code: 'Code' };
  var ROW_CAPS = ['text', 'vision', 'image', 'reasoning', 'tools'];
  var CAP_WORDS = { text: 'writes text', vision: 'sees images', image: 'makes pictures', reasoning: 'thinks first', tools: 'uses tools' };

  function icon(k) {
    return '<svg class="mx-i" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' + ICONS[k] + '</svg>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function logo(m, cls) {
    return '<span class="mx-logo' + (cls ? ' ' + cls : '') + (m.brand === 'apple' ? ' is-apple' : '') + '" aria-hidden="true"><img src="' + m.logo + '" alt="" width="48" height="48" decoding="async"></span>';
  }
  function dots(n, label) {
    var h = '<span class="mx-r" title="' + label + (n ? ': ' + n + ' of 5' : ': not rated yet') + '"><b>' + label.charAt(0) + '</b><span class="mx-d' + (n ? ' d' + n : ' nr') + '">';
    for (var k = 0; k < 5; k++) h += '<i></i>';
    return h + '</span></span>';
  }
  function words(m) {
    var c = ROW_CAPS.filter(function (k) { return m.caps[k]; }).map(function (k) { return CAP_WORDS[k]; });
    var r = m.time ? 'about ' + m.time.slice(1) : 'quality ' + (m.q ? m.q + ' of 5' : 'not rated') + ', speed ' + (m.s ? m.s + ' of 5' : 'not rated yet');
    return c.join(', ') + '. ' + r + '.';
  }

  // ---- The full card, in a dialog ------------------------------------------------------
  var dlg, body, opener = null, onClose = null;
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function openCard(m, from, after) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'mc';
      dlg.setAttribute('aria-labelledby', 'mc-title');
      dlg.innerHTML = '<div class="mc-sheet"><button type="button" class="mc-close" aria-label="Close">' + ICON_CLOSE + '</button><div class="mc-body"></div></div>';
      document.body.appendChild(dlg);
      body = dlg.querySelector('.mc-body');
      dlg.querySelector('.mc-close').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () {
        document.documentElement.classList.remove('mc-lock');
        var cb = onClose; onClose = null;
        if (opener && opener.isConnected) opener.focus();
        if (cb) cb();
      });
    }
    var card = m.el.cloneNode(true);
    card.className += ' spec-full';
    ['data-model', 'data-brand', 'data-turn', 'data-line'].forEach(function (k) { card.removeAttribute(k); });
    var h = card.querySelector('h4');
    if (h) h.id = 'mc-title';
    card.insertAdjacentHTML('afterbegin', logo(m, 'mc-logo'));
    body.textContent = '';
    body.appendChild(card);
    opener = from || null;
    onClose = after || null;
    document.documentElement.classList.add('mc-lock');
    dlg.showModal();
    dlg.querySelector('.mc-close').focus();
  }

  // ---- 1. Ygor, the head that holds a model --------------------------------------------
  var cycle = models.slice().sort(function (a, b) { return a.turn - b.turn; });
  var D = 3.6;            // seconds per model; keep in step with --yg-d in style.css
  var LAND = 0.33;        // the share of the loop after which the new model is inside

  // Ygor's head, traced from the app icon (icon-light.png, 1024 px) with potrace and kept in the
  // icon's own pixel coordinates; only the back of the skull and the neck, hidden by the hump in
  // the icon, are closed by hand (the neck widened and flaring like a collar, its back sweeping out to the left edge, Nick 27 Oct). The skull top is cut along the lower edge of a tilted ellipse
  // into a lid hinged at the back of the head (558, 337).
  var HEAD_BASE = 'M655.88 315.5c-0.12 0 -0.38 0.25 -0.5 0.5 -0.88 1.5 -4.62 3.38 -12.25 6 -3.75 1.38 -16.5 5 -18.75 5.5 -0.5 0.12 -3.25 0.75 -6.25 1.5 -3 0.75 -6 1.5 -6.5 1.5 -0.62 0.12 -1.75 0.38 -2.38 0.62 -1.5 0.38 -13.5 2.62 -15.5 3 -0.88 0.12 -2.12 0.38 -2.75 0.5 -1.25 0.25 -7.88 1.25 -9.12 1.5 -0.38 0 -1.25 0.12 -2 0.25 -1.38 0.25 -3.12 0.38 -7.88 0.88 -7.5 0.88 -12.88 0.62 -13.38 -0.5 0 -0.12 -0.75 -0.12 -0.75 0 -0.25 0.62 -2.5 10.5 -3.25 14.12C552 382 547 410 532 432C519 451 497 462 470 470L534.37 469.87c0 0.12 6.88 0.12 53.75 0.12 53.62 0 53.62 0 53.5 -0.25 -0.12 -0.62 -0.5 -1.12 -4.38 -7.38 -2.25 -3.38 -5.5 -8.25 -7.25 -10.88 -6.38 -8.88 -9.25 -13.25 -11.5 -16.88 -2.88 -4.62 -4.25 -6.75 -5.25 -7.75 -0.75 -1 -0.88 -1.25 -0.5 -1.62 0.25 -0.12 0.75 -0.25 16.25 -0.25 16 -0.12 16 -0.12 17 -0.5 1 -0.38 1.25 -0.38 3 -0.5 1.75 -0.12 2 -0.12 3 -0.5 0.5 -0.25 1.38 -0.5 1.88 -0.62 1.12 -0.38 2.38 -1 3.75 -2 0.5 -0.38 1.38 -1 1.88 -1.25 1.25 -0.75 6.75 -6.38 7.38 -7.5 0.25 -0.38 0.75 -1.12 1 -1.62 0.38 -0.38 1 -1.25 1.25 -1.75 0.38 -0.62 1.12 -1.5 2.38 -2.75 0.88 -1 1.88 -2.12 2.12 -2.5 0.75 -1.25 3 -5.75 3.25 -6.62 0.12 -0.5 0.5 -1.38 0.62 -2 0.38 -0.75 0.38 -1.25 0.5 -2.38 0.12 -1.25 0.12 -1.62 0.5 -2.5 0.62 -1.75 0.62 -5.25 0 -7.12 -0.75 -2.25 -0.62 -4 0.38 -4.62 0.38 -0.12 0.88 -0.25 6.25 -0.25 5.88 -0.12 5.88 -0.12 6.88 -0.5 1 -0.38 1.25 -0.38 3 -0.5 1.75 -0.12 2 -0.12 3 -0.5 0.5 -0.25 1.38 -0.5 1.88 -0.62 1.25 -0.38 4.38 -2 5.38 -2.75 0.5 -0.38 1.25 -0.88 1.62 -1.12 1.88 -1 1.88 -1.5 0.12 -5 -0.75 -1.38 -1.5 -2.88 -1.88 -3.38 -0.38 -0.5 -0.88 -1.25 -1.25 -1.75 -0.25 -0.38 -0.88 -1.25 -1.38 -1.75 -0.5 -0.62 -1.12 -1.5 -1.5 -2 -0.88 -1.62 -13.5 -14.25 -15.12 -15.12 -0.75 -0.5 -1.5 -1.12 -3 -2.5 -1.38 -1.38 -2.25 -2.12 -3 -2.5 -0.5 -0.38 -1.38 -1 -2 -1.5 -0.5 -0.5 -1.38 -1.25 -2 -1.5 -0.5 -0.38 -1.38 -1 -2 -1.5 -0.5 -0.5 -1.25 -1.12 -1.75 -1.38 -0.38 -0.25 -1.12 -0.75 -1.5 -1 -0.5 -0.38 -1.38 -1 -1.75 -1.25 -0.5 -0.38 -1.38 -1 -1.88 -1.5 -0.75 -0.62 -1.62 -1.12 -3 -1.88 -2.75 -1.5 -3.5 -2.25 -4 -4.12 -0.25 -0.75 -1 -2.5 -2.62 -5.75 -0.62 -1.38 -0.62 -1.38 -1.5 -1.12z';
  var HEAD_LID = 'M615 291.75c-0.25 0.12-2.38 0.25-4.62 0.25-4.25 0.12-4.25 0.12-5.25 0.5-0.75 0.38-1.12 0.38-2.12 0.5-0.88 0.12-1.38 0.25-2.12 0.5-0.62 0.25-1.38 0.38-2 0.5-0.75 0.12-1.25 0.25-1.88 0.5-0.38 0.25-1 0.38-1.5 0.5-0.38 0.12-1.5 0.5-2.5 1-1.12 0.5-2.25 0.88-2.5 1-0.88 0.25-4.88 2.25-6.12 3-0.5 0.38-1.12 0.88-1.5 1-0.25 0.12-0.88 0.5-1.25 0.88-0.5 0.25-1.25 0.88-1.88 1.25-9.25 5.75-18.25 19-21.38 31.62-0.62 2.5-0.62 2.38-0.5 2.38 0.12 0 0.25 0.12 0.25 0.12 0.5 1.12 6.62 1.38 14.38 0.5 4.75-0.5 6.5-0.62 7.88-0.88 0.75-0.12 1.62-0.25 2-0.25 1.25-0.25 7.88-1.25 9.12-1.5 0.62-0.12 1.88-0.38 2.75-0.5 2-0.38 14-2.62 15.5-3 0.62-0.25 1.75-0.5 2.38-0.62 0.5 0 3.5-0.75 6.5-1.5 3-0.75 5.75-1.38 6.25-1.5 2.25-0.5 15-4.12 18.75-5.5 7.62-2.75 11.5-4.5 12.25-6 0.25-0.38 0.38-0.5 0.75-0.5 0.25-0.12 0.38-0.12 0.38-0.25-0.5-1.12-2.5-4.62-3-5.25-0.38-0.5-0.88-1.25-1.12-1.75-0.88-1.62-6.88-7.5-9-8.75-0.5-0.38-1.75-1.12-2.62-1.62-2.38-1.5-5.25-2.88-6.75-3.38-1.88-0.62-3.5-1.12-4.5-1.5-0.5-0.25-1.38-0.38-2-0.5-0.5 0-1.38-0.25-2-0.5-1-0.38-1-0.38-4.38-0.5-1.88 0-3.62-0.12-3.88-0.25-0.62-0.12-2.12-0.12-2.75 0z';
  var SVG =
    '<svg class="yg" viewBox="0 0 360 250" aria-hidden="true" focusable="false">' +
      '<path class="yg-wire" d="M-4 84H40M-4 196H40M318 140H364"/>' +
      '<path class="yg-gate" transform="matrix(3.6 0 0 3.6 -19.6 -40)" d="M6 18.75C43.8 18.75 78 28.13 96 50C78 71.87 43.8 81.25 6 81.25Q30.3 50 6 18.75Z"/>' +
      '<svg class="yg-fig" x="65" y="57.4" width="207" height="207" viewBox="540 280 180 180" overflow="visible">' +
        '<defs>' +
          '<clipPath id="yg-clip"><path d="M300-100L300 338.7L550.2 338.7L558 337L559.2 337.8L562.2 338.3L566.9 338.2L573.2 337.7L580.7 336.8L589.3 335.5L598.6 333.8L608.2 331.9L617.7 329.7L626.8 327.5L635.2 325.1L642.5 322.9L648.4 320.8L652.7 318.9L655.3 317.3L656 316L663.8 314.3L900 314.3L900-100Z"/></clipPath>' +
          '<radialGradient id="yg-cav" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="#FFB25E"/><stop offset=".5" stop-color="#B9481A"/><stop offset="1" stop-color="#3A1606"/></radialGradient>' +
        '</defs>' +
        '<g class="yg-head">' +
          '<ellipse cx="607" cy="326.5" rx="50.11" ry="5.5" transform="rotate(-12.09 607 326.5)" fill="url(#yg-cav)"/>' +
          '<g clip-path="url(#yg-clip)">' +
            '<g transform="translate(607 380)"><g class="yg-in"><circle class="yg-disc" r="40"/><image class="yg-in-img" x="-27" y="-27" width="54" height="54"/></g></g>' +
          '</g>' +
          '<path class="yg-ink" d="' + HEAD_BASE + '"/>' +
          // the mouth, under the nose where the icon's face turns down to the chin: a flat line while
          // the lid is open, a smile once the new model is in, and a mouth that opens as he talks
          '<g class="yg-mouth">' +
            '<path class="yg-m-open" d="M680 388.6Q667 395 656.2 381.6Q661 404 680.6 400z"/>' +
            '<path class="yg-m-flat" d="M679.5 388.6Q669 389.4 660 387.4"/>' +
            '<path class="yg-m-smile" d="M680 388.6Q667 395 656.2 381.6"/>' +
          '</g>' +
          '<circle class="yg-eye" cx="643.5" cy="341.2" r="6"/>' +
          '<g class="yg-spark"><path d="M607 294v-9M587 298l-5-7M627 295l5-7M572 308h-7M642 303l7-3"/></g>' +
          '<g class="yg-lid">' +
            '<path class="yg-ink" d="' + HEAD_LID + '"/>' +
            '<path class="yg-rim" d="M558 337A50.11 5.5-12.09 0 0 656 316"/>' +
          '</g>' +
          '<g clip-path="url(#yg-clip)">' +
            '<g transform="translate(607 380)"><g class="yg-out"><circle class="yg-disc" r="40"/><image class="yg-out-img" x="-27" y="-27" width="54" height="54"/></g></g>' +
          '</g>' +
        '</g>' +
      '</svg>' +
    '</svg>';

  // The Smart Group turn: every 3rd turn the token going in is a Smart Group. His thought grows
  // into a tiny route ttree for one of the example questions (random, never the same route twice
  // in a row), the signal weighs the branches and lights one, then that model answers.
  var group = document.getElementById('smart-group');
  var groupRoutes = group ? [].map.call(group.querySelectorAll('.routes li[data-model]'), function (li) {
    return {
      m: byId[li.getAttribute('data-model')], swap: byId[li.getAttribute('data-swap')],
      ask: txt(li.querySelector('.ask')), name: txt(li.querySelector('.route b')),
      desc: txt(li.querySelector('.route span')), say: li.getAttribute('data-say') || ''
    };
  }).filter(function (r) { return r.m; }) : [];
  var showGroups = null;                 // set by the Smart Groups tab below
  var GROUP_LOGO = LOGOS + 'group.svg';
  var GATE_MINI = '<svg class="yg-gate-mini" viewBox="-16 17 130 66" aria-hidden="true" focusable="false"><path d="M6 18.75C43.8 18.75 78 28.13 96 50C78 71.87 43.8 81.25 6 81.25Q30.3 50 6 18.75Z"/><path d="M-16 34.38H16.11M-16 65.62H16.11M95 50H114" fill="none" stroke-width="9"/></svg>';
  var TY = [7.5, 22.5, 37.5, 52.5];
  function treeSvg() {
    var h = '<svg class="yg-ttree" viewBox="0 0 220 60" aria-hidden="true" focusable="false">' +
      '<path class="t-w t-root" d="M11 30H45"/>';
    groupRoutes.forEach(function (r, i) {
      var y = TY[i];
      h += '<path class="t-w t-br" d="M65 30C88 30 94 ' + y + ' 117 ' + y + 'H121.5"/>';
    });
    h += '<circle class="t-in" cx="7" cy="30" r="4.5"/>' +
      '<circle class="t-hub" cx="55" cy="30" r="10"/>' +
      '<g transform="translate(47.5 25) scale(.12)" class="t-gate"><path d="M6 18.75C43.8 18.75 78 28.13 96 50C78 71.87 43.8 81.25 6 81.25Q30.3 50 6 18.75Z" transform="translate(16 -17)"/></g>';
    groupRoutes.forEach(function (r, i) {
      var y = TY[i];
      h += '<g class="t-leaf"><circle class="t-ring" cx="128" cy="' + y + '" r="10"/><circle class="t-disc" cx="128" cy="' + y + '" r="6.6"/>' +
        '<image href="' + r.m.logo + '" x="123.5" y="' + (y - 4.5) + '" width="9" height="9"/>' +
        '<text x="139" y="' + (y + 3.2) + '">' + esc(r.name) + '</text></g>';
    });
    return h + '<circle class="t-sig" r="3.4"/></svg>';
  }

  var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path class="i-pause" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="i-play" d="M8 5v14l11-7z"/></svg>';

  var brain = document.createElement('div');
  brain.className = 'brain is-paused';
  brain.innerHTML =
    '<div class="yg-box"><button type="button" class="yg-stage" aria-label="Ygor holds one model at a time. Open the full card of the model in his head">' + SVG +
      '<span class="yg-say" aria-hidden="true"><b class="yg-who"></b><span class="yg-line"></span>' +
      '<svg class="yg-tail" viewBox="0 0 24 40" aria-hidden="true" focusable="false"><path d="M7 0 3 37 19 0"/></svg></span>' +
      (groupRoutes.length ? '<span class="yg-think" aria-hidden="true"><span class="yg-tq"></span>' + treeSvg() + '</span>' : '') +
    '</button>' +
    '<button type="button" class="yg-pause" aria-label="Pause the animation" aria-pressed="false">' + ICON_PAUSE + '</button></div>' +
    '<p class="yg-hint">Every brain runs on your iPhone. Tap Ygor to meet the one inside.</p>' +
    '<i class="yg-clock" aria-hidden="true"></i>';
  var lede = head.querySelector('.lede');
  head.insertBefore(brain, lede ? lede.nextSibling : null);
  section.classList.add('has-brain');

  var stage = brain.querySelector('.yg-stage');
  var say = brain.querySelector('.yg-say');
  var who = brain.querySelector('.yg-who');
  var lineEl = brain.querySelector('.yg-line');
  var inImg = brain.querySelector('.yg-in-img');
  var outImg = brain.querySelector('.yg-out-img');
  var pauseBtn = brain.querySelector('.yg-pause');
  var clockEl = brain.querySelector('.yg-clock');
  var think = brain.querySelector('.yg-think');
  var userPaused = false, offscreen = true, cardOpen = false;

  // the turns: models in their cycle order, a Smart Group every 3rd turn
  var mi = 0, turns = 0, lastRoute = -1, phase = 0;      // phase: 0 model turn, 1 group going in, 2 group answering
  var turn = { m: cycle[0] }, prevTurn = { m: cycle[cycle.length - 1] };
  function logoOf(t) { return t.r ? GROUP_LOGO : t.m.logo; }
  function nextTurn() {
    turns++;
    if (groupRoutes.length > 1 && turns % 3 === 2) {
      var k;
      do { k = Math.floor(Math.random() * groupRoutes.length); } while (k === lastRoute);
      lastRoute = k;
      return { r: groupRoutes[k], k: k };
    }
    mi = (mi + 1) % cycle.length;
    return { m: cycle[mi] };
  }
  function paint() {
    inImg.setAttribute('href', logoOf(turn));
    outImg.setAttribute('href', logoOf(prevTurn));
    var m = turn.r ? turn.r.m : turn.m;
    who.innerHTML = (turn.r ? GATE_MINI : '') + logo(m, 'yg-logo') + esc(m.name) + ':';
    lineEl.textContent = turn.r ? turn.r.say : m.line;
    brain.classList.toggle('is-routed', !!turn.r);
    if (turn.r && think) {
      think.querySelector('.yg-tq').textContent = turn.r.ask;
      think.classList.remove('is-up', 'is-out');
      say.classList.remove('is-up');
      ttree.classList.remove('is-picked');
      [].forEach.call(ttree.querySelectorAll('.is-lit, .is-scan'), function (el) { el.classList.remove('is-lit', 'is-scan'); });
      sig.style.opacity = '0';
      scan = [0, 1, 2, 3].sort(function () { return Math.random() - 0.5; }).filter(function (i) { return i < groupRoutes.length; });
      scan.push(turn.k);
    }
  }
  var ttree = think && think.querySelector('.yg-ttree');
  var sig = ttree && ttree.querySelector('.t-sig');
  var brs = ttree ? [].slice.call(ttree.querySelectorAll('.t-br')) : [];
  var lfs = ttree ? [].slice.call(ttree.querySelectorAll('.t-leaf')) : [];
  var rootW = ttree && ttree.querySelector('.t-root');
  var scan = [], gStart = 0, gRaf = 0;
  if (groupRoutes.length) { var g0 = new Image(); g0.src = GROUP_LOGO; }
  // every logo once, so no swap waits for a file
  var seen = {};
  cycle.forEach(function (m) { if (!seen[m.logo]) { seen[m.logo] = 1; var im = new Image(); im.src = m.logo; } });
  paint();

  function sync() {
    var stop = userPaused || offscreen || cardOpen || document.hidden;
    brain.classList.toggle('is-paused', stop);
    pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play the animation' : 'Pause the animation');
  }
  function clockMs() {
    var a = clockEl.getAnimations ? clockEl.getAnimations()[0] : null;
    return a && a.currentTime != null ? a.currentTime : null;
  }
  // a hidden element's loop is the clock: each new round, the next turn
  clockEl.addEventListener('animationiteration', function () {
    if (still()) return;
    if (phase === 1) { phase = 2; brain.classList.add('is-hold'); return; }
    brain.classList.remove('is-group', 'is-hold');
    phase = 0;
    prevTurn = turn;
    turn = nextTurn();
    paint();
    if (turn.r && think) {
      phase = 1;
      brain.classList.add('is-group');
      var c = clockMs();
      gStart = c == null ? 0 : Math.round(c / (D * 1000)) * D * 1000;
      cancelAnimationFrame(gRaf);
      gRaf = requestAnimationFrame(groupFrame);
    }
  });

  // the group turn, in seconds from the moment its lid opens (two rounds of the clock)
  function at(path, k) { var L = path.getTotalLength(), p = path.getPointAtLength(L * Math.max(0, Math.min(1, k))); sig.setAttribute('cx', p.x); sig.setAttribute('cy', p.y); }
  function groupFrame() {
    if (phase === 0) return;
    gRaf = requestAnimationFrame(groupFrame);
    var c = clockMs();
    if (c == null) return;
    var t = (c - gStart) / 1000;
    think.classList.toggle('is-up', t >= 1.45 && t < 4.35);
    think.classList.toggle('is-out', t >= 4.35);
    say.classList.toggle('is-up', t >= 4.45 && t < 6.85);
    var step = Math.floor((t - 2.05) / 0.24);
    var chosen = brs[turn.k];
    if (t >= 1.65 && t < 2.05) { sig.style.opacity = '1'; at(rootW, (t - 1.65) / 0.4); }
    else if (t >= 3.25 && t < 3.65) { sig.style.opacity = '1'; at(chosen, (t - 3.25) / 0.4); }
    else sig.style.opacity = '0';
    brs.forEach(function (b, i) {
      b.classList.toggle('is-scan', t >= 2.05 && t < 3.25 && scan[step] === i);
      b.classList.toggle('is-lit', t >= 3.25 && i === turn.k);
    });
    rootW.classList.toggle('is-lit', t >= 1.65);
    lfs.forEach(function (l, i) { l.classList.toggle('is-lit', t >= 3.65 && i === turn.k); });
    ttree.classList.toggle('is-picked', t >= 3.65);
  }

  pauseBtn.addEventListener('click', function () { userPaused = !userPaused; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(stage);
  } else { offscreen = false; sync(); }

  // What he holds right now: until the new token is inside, still the last one.
  function holding() {
    var c = clockMs();
    if (still() || c == null || phase === 2) return turn;
    return (c / 1000 % D) / D < LAND ? prevTurn : turn;
  }
  function advanceStill() { prevTurn = turn; turn = nextTurn(); paint(); }
  stage.addEventListener('click', function () {
    var t = holding();
    if (t.r) {
      // a Smart Group: the clearest answer is the group itself, in the Smart Groups tab
      if (showGroups) showGroups();
      if (still()) advanceStill();
      return;
    }
    cardOpen = true; sync();
    openCard(t.m, stage, function () {
      cardOpen = false;
      if (still()) advanceStill();     // without motion, each tap brings the next turn
      sync();
    });
  });

  // ---- 2. The compact list -------------------------------------------------------------
  var TAGS = ['text', 'vision', 'image', 'tools', 'reasoning', 'code'];
  var SORTS = [['', 'Apple, then size'], ['size', 'Smallest first'], ['quality', 'Best quality'], ['speed', 'Fastest'], ['name', 'Name']];
  var picked = {}, sortBy = '';

  var mx = document.createElement('div');
  mx.className = 'mx';
  var chips = '<button type="button" class="mx-chip" data-tag="" aria-pressed="true">All <span>' + models.length + '</span></button>';
  TAGS.forEach(function (t) {
    var n = models.filter(function (m) { return m.caps[t]; }).length;
    if (n) chips += '<button type="button" class="mx-chip" data-tag="' + t + '" aria-pressed="false">' + icon(t) + CAP_NAMES[t] + ' <span>' + n + '</span></button>';
  });
  var opts = SORTS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
  mx.innerHTML =
    '<div class="mx-tabs" role="tablist" aria-label="Models">' +
      '<button type="button" role="tab" id="mx-t1" aria-controls="mx-p1" aria-selected="true">Single models <span>' + models.length + '</span></button>' +
      (group ? '<button type="button" role="tab" id="mx-t2" aria-controls="mx-p2" aria-selected="false" tabindex="-1">Smart Groups <span>1</span></button>' : '') +
    '</div>' +
    '<div class="mx-panel" id="mx-p1" role="tabpanel" aria-labelledby="mx-t1">' +
      '<div class="mx-chips" role="group" aria-label="Show models that can">' + chips + '</div>' +
      '<div class="mx-bar"><p class="mx-count" aria-hidden="true"></p>' +
        '<label class="mx-sort"><span class="mx-sort-k">Sort</span><select>' + opts + '</select>' +
          '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></label>' +
      '</div>' +
      '<ul class="mx-list"></ul>' +
      '<p class="mx-key"><b>Q</b> quality · <b>S</b> speed, in dots from the Ygor Lab test (below). Tap a model for its full card.</p>' +
    '</div>' +
    (group ? '<div class="mx-panel" id="mx-p2" role="tabpanel" aria-labelledby="mx-t2" hidden></div>' : '') +
    '<p class="vh" aria-live="polite"></p>';
  head.parentNode.insertBefore(mx, head.nextSibling);
  section.classList.add('has-mx');

  var list = mx.querySelector('.mx-list');
  var live = mx.querySelector('[aria-live]');
  var count = mx.querySelector('.mx-count');
  models.forEach(function (m) {
    var li = document.createElement('li');
    var caps = ROW_CAPS.map(function (k) { return '<span class="mx-cap' + (m.caps[k] ? ' on' : '') + '">' + icon(k) + '</span>'; }).join('');
    var rate = m.time ? '<span class="mx-time">' + esc(m.time) + '</span>' : dots(m.q, 'Quality') + dots(m.s, 'Speed');
    li.innerHTML =
      '<button type="button" class="mx-row" aria-haspopup="dialog">' + logo(m) +
        '<span class="mx-main">' +
          '<span class="mx-name">' + esc(m.name) + (m.suffix ? ' <i>' + esc(m.suffix) + '</i>' : '') + '</span>' +
          '<span class="mx-meta"><b>' + esc(m.maker) + '</b> · ' + esc(m.size) + (m.mem ? ' · ' + esc(m.mem) : '') + '</span>' +
          '<span class="mx-foot"><span class="mx-caps" aria-hidden="true">' + caps + '</span><span class="mx-rate" aria-hidden="true">' + rate + '</span></span>' +
          '<span class="vh">, ' + esc(words(m)) + '</span>' +
        '</span>' +
      '</button>';
    li.querySelector('button').addEventListener('click', function () { openCard(m, this); });
    m.li = li;
    list.appendChild(li);
  });

  function order(a, b) {
    function rated(x, y) { return (y ? 1 : 0) - (x ? 1 : 0); }      // unrated last
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return a.mb - b.mb;
    if (sortBy === 'quality' || sortBy === 'speed') {
      var x = a[sortBy[0]], y = b[sortBy[0]];
      return rated(x, y) || (y - x) || a.mb - b.mb;
    }
    // default as in the app: Apple Intelligence, then smallest to largest, pictures after text
    var ia = a.caps.image ? 1 : 0, ib = b.caps.image ? 1 : 0;
    return (ia - ib) || a.mb - b.mb;
  }

  function render(announce) {
    var tags = Object.keys(picked);
    var shown = 0;
    models.slice().sort(order).forEach(function (m) {
      var ok = !tags.length || tags.some(function (t) { return m.caps[t]; });
      m.li.hidden = !ok;
      if (ok) shown++;
      list.appendChild(m.li);
    });
    [].forEach.call(mx.querySelectorAll('.mx-chip'), function (c) {
      var t = c.getAttribute('data-tag');
      c.setAttribute('aria-pressed', (t ? !!picked[t] : !tags.length) ? 'true' : 'false');
    });
    if (!still()) { list.classList.remove('is-new'); void list.offsetWidth; list.classList.add('is-new'); }
    var said = shown + (shown === 1 ? ' model' : ' models');
    count.textContent = said;
    if (announce) live.textContent = said + ' shown';
  }

  mx.querySelector('.mx-chips').addEventListener('click', function (e) {
    var c = e.target.closest('.mx-chip');
    if (!c) return;
    var t = c.getAttribute('data-tag');
    if (!t) picked = {};
    else if (picked[t]) delete picked[t];
    else picked[t] = true;
    render(true);
  });
  mx.querySelector('select').addEventListener('change', function () { sortBy = this.value; render(true); });
  render(false);

  // ---- 3. Smart Groups -----------------------------------------------------------------
  if (group) {
    var p2 = mx.querySelector('#mx-p2');
    var gh = group.querySelector('.group-head');
    var members = [].map.call(group.querySelectorAll('.routes li[data-model]'), function (li) { return byId[li.getAttribute('data-model')]; }).filter(Boolean);
    if (gh) {
      gh.insertAdjacentHTML('afterbegin', '<span class="group-mark" aria-hidden="true"><svg viewBox="-16 17 130 66" focusable="false"><path d="M6 18.75C43.8 18.75 78 28.13 96 50C78 71.87 43.8 81.25 6 81.25Q30.3 50 6 18.75Z"/><path d="M-16 34.38H16.11M-16 65.62H16.11M95 50H114" fill="none" stroke-width="6"/></svg></span>');
      gh.insertAdjacentHTML('beforeend', '<p class="group-members" aria-hidden="true">' + members.map(function (m) { return logo(m); }).join('') + '<span>' + members.length + ' models</span></p>');
    }
    // The route tree: one input, a junction that picks on the iPhone, a branch per route with
    // its example question above the wire, and the model at the end of each branch. Built from
    // the same list the no-JS page shows; the wires are drawn from the laid-out boxes.
    var routes = groupRoutes;
    var tree = document.createElement('div');
    tree.className = 'tree';
    var ICON_CHAT = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 5.5h16v10H9.5L5.5 19v-3.5H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    var GATE = '<svg viewBox="-16 17 130 66" width="30" height="16" aria-hidden="true" focusable="false"><path d="M6 18.75C43.8 18.75 78 28.13 96 50C78 71.87 43.8 81.25 6 81.25Q30.3 50 6 18.75Z"/><path d="M-16 34.38H16.11M-16 65.62H16.11M95 50H114" fill="none" stroke-width="7"/></svg>';
    tree.innerHTML =
      '<svg class="tree-wires" aria-hidden="true" focusable="false"><g class="tw-base"></g><path class="tw-hot"/><circle class="tw-halo" r="11"/><circle class="tw-dot" r="5"/></svg>' +
      '<div class="tree-in">' +
        '<p class="tn tn-root"><span class="tn-ic">' + ICON_CHAT + '</span><span class="tn-tx"><b>Your message</b>one chat</span></p>' +
        '<p class="tn tn-hub"><span class="tn-ic">' + GATE + '</span><span class="tn-tx"><b>Smart Group</b>picks a route on your iPhone</span></p>' +
      '</div>' +
      '<ol class="tree-rows" aria-label="Routes">' +
        routes.map(function (r, i) {
          return '<li class="br">' +
            '<p class="br-ask">' + esc(r.ask) + '</p><span class="br-wire"></span>' +
            '<button type="button" class="br-leaf" aria-haspopup="dialog" data-i="' + i + '">' + logo(r.m) + '<span>' + esc(r.m.name) + '</span></button>' +
            '<p class="br-route"><b>' + esc(r.name) + '</b> ' + esc(r.desc) + '</p></li>';
        }).join('') +
        '<li class="br br-add" aria-hidden="true"><span class="br-wire"></span><span class="br-leaf br-ghost">+ Add route</span></li>' +
      '</ol>';
    var edit = group.querySelector('.group-edit');
    if (edit) { var cap = document.createElement('p'); cap.className = 'tree-edit'; cap.innerHTML = edit.innerHTML; tree.appendChild(cap); edit.hidden = true; }
    group.querySelector('.routes').insertAdjacentElement('afterend', tree);
    var rows = [].slice.call(tree.querySelectorAll('.br'));
    var leaves = [].slice.call(tree.querySelectorAll('.br-leaf[data-i]'));
    leaves.forEach(function (b) {
      b.addEventListener('click', function () { var r = routes[+b.getAttribute('data-i')]; openCard(b.swapped ? r.swap : r.m, b); });
    });

    var wires = tree.querySelector('.tree-wires'), base = wires.querySelector('.tw-base');
    var hot = wires.querySelector('.tw-hot'), dot = wires.querySelector('.tw-dot'), halo = wires.querySelector('.tw-halo');
    var paths = [], lens = [];
    function box(el, t) {
      var r = el.getBoundingClientRect();
      return { l: r.left - t.left, r: r.right - t.left, t: r.top - t.top, b: r.bottom - t.top, x: (r.left + r.right) / 2 - t.left, y: (r.top + r.bottom) / 2 - t.top };
    }
    function f(n) { return Math.round(n * 10) / 10; }
    function layout() {
      if (!tree.offsetParent) return;
      tree.classList.toggle('is-wide', tree.clientWidth >= 640);
      var wide = tree.classList.contains('is-wide');
      var t = tree.getBoundingClientRect();
      wires.setAttribute('viewBox', '0 0 ' + f(t.width) + ' ' + f(t.height));
      var a = box(tree.querySelector('.tn-root .tn-ic'), t), h = box(tree.querySelector('.tn-hub .tn-ic'), t);
      var list = box(tree.querySelector('.tree-rows'), t);
      paths = rows.map(function (li) {
        var w = box(li.querySelector('.br-wire'), t), leaf = box(li.querySelector('.br-leaf'), t);
        var y = w.y, end = leaf.l;
        if (wide) {
          var x0 = h.r, x1 = list.l, k = (x1 - x0) * 0.55;
          return 'M' + f(a.x) + ' ' + f(a.y) + 'H' + f(h.x) + 'M' + f(x0) + ' ' + f(h.y) + 'C' + f(x0 + k) + ' ' + f(h.y) + ' ' + f(x1 - k) + ' ' + f(y) + ' ' + f(x1) + ' ' + f(y) + 'H' + f(end);
        }
        var r = 12;
        return 'M' + f(a.x) + ' ' + f(a.y) + 'V' + f(h.y) + 'M' + f(h.x) + ' ' + f(h.b) + 'V' + f(y - r) + 'Q' + f(h.x) + ' ' + f(y) + ' ' + f(h.x + r) + ' ' + f(y) + 'H' + f(end);
      });
      base.innerHTML = paths.map(function (d, i) { return '<path d="' + d + '"' + (rows[i].classList.contains('br-add') ? ' class="tw-ghost"' : '') + '/>'; }).join('');
      lens = [].map.call(base.querySelectorAll('path'), function (p) { return p.getTotalLength(); });
    }

    // the signal: from the message to one leaf, route after route, then the "make it yours" beat
    var STEP = 2.4, TRAVEL = 1.25, EDIT = 4.2;
    var clock = 0, prev = 0, tRaf = 0, seenTree = false, beat = -1;
    function treeOn() { return seenTree && !document.hidden && !still() && !p2.hidden; }
    function light(i) {
      rows.forEach(function (li, k) { li.classList.toggle('is-on', k === i); li.classList.remove('is-hit'); });
      if (i < 0) { hot.removeAttribute('d'); return; }
      hot.setAttribute('d', paths[i]);
      hot.style.strokeDasharray = lens[i] + ' ' + lens[i];
    }
    function setEdit(on) {
      tree.classList.toggle('is-edit', on);
      routes.forEach(function (r, i) {
        if (!r.swap) return;
        var b = leaves[i], to = on ? r.swap : r.m;
        if (b.swapped === on) return;
        b.swapped = on;
        var flip = b.animate ? b.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: 170, easing: 'ease-in' }) : null;
        function swap() {
          b.innerHTML = logo(to) + '<span>' + esc(to.name) + '</span>';
          layout();
          if (b.animate) b.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: 220, easing: 'ease-out' });
        }
        if (flip) flip.onfinish = swap; else swap();
      });
    }
    function frame(now) {
      tRaf = requestAnimationFrame(frame);
      var dt = Math.min(now - prev, 100) / 1000;
      prev = now;
      if (!treeOn()) return;
      clock += dt;
      var n = routes.length, total = n * STEP + EDIT, s = clock % total;
      var i = Math.floor(s / STEP);
      if (i < n) {
        if (beat !== i) { beat = i; setEdit(false); light(i); tree.classList.add('is-live'); }
        var k = Math.min(1, (s - i * STEP) / TRAVEL), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var p = base.querySelectorAll('path')[i], L = lens[i] * e, pt = p.getPointAtLength(L);
        dot.setAttribute('transform', 'translate(' + f(pt.x) + ' ' + f(pt.y) + ')');
        halo.setAttribute('transform', 'translate(' + f(pt.x) + ' ' + f(pt.y) + ')');
        hot.style.strokeDashoffset = lens[i] - L;
        rows[i].classList.toggle('is-hit', k >= 1);
        tree.classList.toggle('is-moving', k < 1);
      } else if (beat !== n) {
        beat = n; light(-1); tree.classList.remove('is-moving'); setEdit(true);
      }
    }
    function startTree() {
      layout();
      if (still()) return;
      cancelAnimationFrame(tRaf); prev = performance.now(); tRaf = requestAnimationFrame(frame);
    }
    if ('ResizeObserver' in window) new ResizeObserver(function () { layout(); if (beat >= 0 && beat < routes.length) light(beat); }).observe(tree);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seenTree = es[0].isIntersecting; }, { threshold: 0.2 }).observe(tree);
    } else seenTree = true;

    p2.appendChild(group);
    group.classList.add('is-live');

    var tabs = [].slice.call(mx.querySelectorAll('[role="tab"]'));
    var panels = [mx.querySelector('#mx-p1'), p2];
    function pick(k, focus) {
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', j === k ? 'true' : 'false');
        t.tabIndex = j === k ? 0 : -1;
        panels[j].hidden = j !== k;
      });
      section.classList.toggle('mx-on-groups', k === 1);
      if (k === 1) startTree(); else cancelAnimationFrame(tRaf);
      if (focus) tabs[k].focus();
    }
    showGroups = function () {
      pick(1);
      tabs[1].focus({ preventScroll: true });
      group.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' });
    };
    tabs.forEach(function (t, j) {
      t.addEventListener('click', function () { pick(j); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); pick(1 - j, true); }
      });
    });
  }
})();
