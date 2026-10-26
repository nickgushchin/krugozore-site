/* Ygor · ygor.app: the update-list form (double opt-in).
   Cloudflare Turnstile (the only third-party script on the site) loads the first time you
   touch the form, not before. Without JavaScript the form stays hidden and a mailto
   fallback shows instead. */
(function () {
  'use strict';
  var TURNSTILE_SITEKEY = '0x4AAAAAAFm1mWqpQykK8dej';
  var API = window.YGOR_API || 'https://ygor-site.jai-twin.workers.dev';

  var form = document.getElementById('signup');
  if (!form || !window.fetch || !window.Promise) return;
  var fallback = document.getElementById('signup-fallback');
  var done = document.getElementById('signup-done');
  var email = form.elements.email;
  var cYgor = form.elements.consent_ygor;
  var cOther = form.elements.consent_other;
  var status = document.getElementById('signup-status');
  var button = form.querySelector('button[type="submit"]');
  var box = document.getElementById('signup-turnstile');

  form.hidden = false;
  if (fallback) fallback.hidden = true;

  var MSG = {
    bad_email: 'That email address doesn’t look right.',
    consent: 'Tick the first box so Ygor may write to you.',
    turnstile: 'The robot check didn’t pass. Please try once more.',
    rate_limit: 'Too many tries in a row. Wait a minute, then try again.',
    busy_today: 'Lots of sign-ups today. Please try again tomorrow.',
    mail: 'The confirmation email didn’t go out. Please try again in a few minutes.',
    fail: 'Something went wrong. Try again, or write to support@ygor.app.'
  };

  // ---- Turnstile, loaded on first use -------------------------------------------------
  var widget = null, token = '', loading = null, waiters = [];
  function settle(err) {
    var w = waiters; waiters = [];
    w.forEach(function (x) { if (err) x.reject(err); else x.resolve(token); });
  }
  function loadTurnstile() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      window.ygorTurnstileReady = resolve;
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=ygorTurnstileReady';
      s.async = true;
      s.onerror = function () { loading = null; s.remove(); reject(new Error('turnstile_load')); };
      document.head.appendChild(s);
    }).then(function () {
      widget = window.turnstile.render(box, {
        sitekey: TURNSTILE_SITEKEY,
        action: 'subscribe',
        appearance: 'interaction-only',
        theme: 'auto',
        size: 'flexible',
        callback: function (t) { token = t; settle(); },
        'expired-callback': function () { token = ''; },
        'error-callback': function () { token = ''; settle(new Error('turnstile')); }
      });
    });
    return loading;
  }
  function getToken() {
    if (token) return Promise.resolve(token);
    return loadTurnstile().then(function () {
      if (token) return token;
      return new Promise(function (resolve, reject) {
        waiters.push({ resolve: resolve, reject: reject });
        setTimeout(function () { reject(new Error('turnstile_timeout')); }, 60000);
      });
    });
  }
  function resetToken() {
    token = '';
    if (window.turnstile && widget !== null) { try { window.turnstile.reset(widget); } catch (e) { /* ignore */ } }
  }
  form.addEventListener('focusin', function warm() {
    form.removeEventListener('focusin', warm);
    loadTurnstile().catch(function () {});
  });

  // ---- states -------------------------------------------------------------------------
  function clearInvalid() {
    [email, cYgor].forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }
  function show(kind, text, field) {
    clearInvalid();
    status.className = 'signup-status' + (kind ? ' is-' + kind : '');
    status.textContent = text || '';
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function busy(on) {
    button.disabled = on;
    button.setAttribute('aria-busy', on ? 'true' : 'false');
    button.textContent = on ? 'Sending…' : 'Keep me posted';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (button.disabled) return;
    var addr = email.value.trim();
    if (!addr || addr.length > 254 || !email.checkValidity()) return show('error', MSG.bad_email, email);
    if (!cYgor.checked) return show('error', MSG.consent, cYgor);
    busy(true);
    show('sending', 'Sending…');
    getToken().then(function (t) {
      return fetch(API + '/subscribe', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr, consent_ygor: true, consent_other: cOther.checked, token: t })
      });
    }).then(function (r) {
      resetToken();
      if (r.ok) {
        form.hidden = true;
        done.hidden = false;
        done.focus();
        return;
      }
      return r.json().catch(function () { return {}; }).then(function (b) {
        var err = b && b.error;
        show('error', MSG[err] || MSG.fail, err === 'bad_email' ? email : null);
      });
    }).catch(function (err) {
      resetToken();
      show('error', /turnstile/.test(String(err && err.message)) ? MSG.turnstile : MSG.fail);
    }).then(function () { busy(false); });
  });
})();
