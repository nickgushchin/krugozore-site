/* Ygor · ygor.app: one cookieless page count per page load.
   Sends the page name and the hostname of the page you came from (never the full address,
   never an identifier). No cookies, no localStorage. The Worker adds 1 to a daily tally
   and keeps nothing else; the totals are public at /stats/.
   fetch(keepalive) is used rather than navigator.sendBeacon: the site sends no referrer
   (meta referrer = no-referrer), and under that policy a beacon carries "Origin: null",
   which the Worker rejects. A CORS fetch always carries the real Origin. */
(function () {
  'use strict';
  var API = 'https://ygor-site.jai-twin.workers.dev';
  window.YGOR_API = API;

  var path = location.pathname.replace(/index\.html$/, '');
  var m = /\/(privacy|support|stats)\/$/.exec(path);
  var page = m ? m[1] : (path === '/' ? 'home' : '');
  if (!page || !window.fetch) return;

  var ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { ref = ''; }

  try {
    fetch(API + '/hit', {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ page: page, ref: ref })
    }).catch(function () {});
  } catch (e) { /* counting is best effort */ }
})();
