/* Ygor · ygor.app/stats/: draws the public, cookieless counters from the Worker's /stats. */
(function () {
  'use strict';
  var API = window.YGOR_API || 'https://ygor-site.jai-twin.workers.dev';
  var $ = function (id) { return document.getElementById(id); };
  if (!window.fetch || !$('stats-live')) return;

  var SOURCES = { direct: 'Direct', search: 'Search engines', linkedin: 'LinkedIn', telegram: 'Telegram', x: 'X', youtube: 'YouTube', appstore: 'App Store', other: 'Other sites' };
  var PAGES = { home: 'Home', privacy: 'Privacy policy', support: 'Support', stats: 'This page' };
  var nf = new Intl.NumberFormat('en-US');
  var df = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  var tf = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  var dayLabel = function (d) { return df.format(new Date(d + 'T00:00:00Z')); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  $('stats-fallback').hidden = true;

  function hbars(target, counts, labels) {
    var rows = Object.keys(labels).map(function (k) { return [k, Number(counts && counts[k]) || 0]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat(1));
    var total = rows.reduce(function (s, r) { return s + r[1]; }, 0);
    rows.forEach(function (r) {
      if (!r[1] && total) return;              // hide empty groups once there is data
      var row = el('div');
      row.appendChild(el('dt', null, labels[r[0]]));
      var dd = el('dd'); var track = el('span', 'track'); var fill = el('span', 'fill');
      fill.style.setProperty('--w', (r[1] / max * 100).toFixed(1) + '%');
      track.appendChild(fill); dd.appendChild(track); row.appendChild(dd);
      var val = el('dd', 'val', nf.format(r[1])); row.appendChild(val);
      target.appendChild(row);
    });
  }

  function render(s) {
    $('s-visits').textContent = nf.format(s.visits || 0);
    $('s-today').textContent = nf.format(s.today || 0);
    $('s-subs').textContent = nf.format(s.subscribers || 0);
    $('s-updated').textContent = 'Figures as of ' + tf.format(new Date(s.updated)) + ' UTC.';

    var series = Array.isArray(s.series) ? s.series : [];
    var top = Math.max.apply(null, series.map(function (d) { return d.n; }).concat(0));
    var max = Math.max(top, 1);
    var bars = $('s-bars'), table = $('s-table');
    series.forEach(function (d) {
      var li = el('li');
      var h = d.n ? Math.max(2, d.n / max * 100) : 0;
      li.style.setProperty('--h', h.toFixed(1) + '%');
      li.appendChild(el('span', 'dbar' + (d.n ? '' : ' zero')));
      li.appendChild(el('span', 'tip', dayLabel(d.day) + ': ' + nf.format(d.n)));
      bars.appendChild(li);
      var tr = el('tr'); tr.appendChild(el('td', null, dayLabel(d.day))); tr.appendChild(el('td', null, nf.format(d.n)));
      table.insertBefore(tr, table.firstChild);   // newest first
    });
    $('s-max').textContent = 'Busiest day: ' + nf.format(top);
    if (series.length) {
      $('s-first').textContent = dayLabel(series[0].day);
      $('s-last').textContent = 'Today';
      var busiest = series.reduce(function (a, b) { return b.n > a.n ? b : a; }, series[0]);
      $('perday-summary').textContent = 'Page views per day from ' + dayLabel(series[0].day) + ' to ' + dayLabel(series[series.length - 1].day) +
        (busiest.n ? '. Busiest: ' + dayLabel(busiest.day) + ' with ' + nf.format(busiest.n) + '.' : '. No page views yet.');
    }
    hbars($('s-sources'), s.sources, SOURCES);
    hbars($('s-pages'), s.pages, PAGES);
    $('stats-live').hidden = false;
  }

  fetch(API + '/stats', { credentials: 'omit', referrerPolicy: 'no-referrer' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () {
      var e = $('stats-error');
      e.textContent = 'The numbers can’t be loaded right now. Please try again later.';
      e.hidden = false;
      $('stats-fallback').hidden = false;
    });
})();
