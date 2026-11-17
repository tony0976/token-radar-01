/* Token Radar dashboard: a static page, no fetch, no network. It reads window.RADAR from
   ../data.js (written by main.ts from the same board as board.json) and renders the board, the
   live-token set and the methodology. Hash routes make views linkable for screenshots:
   #detail=<slug> opens a protocol, #set=watchlist|early|all, #cat=<category>, #chain=<chain>,
   #sort=implied|tvl|age|growth, #q=<text>. */
(function () {
  'use strict';

  var R = window.RADAR || null;
  var main = document.getElementById('board');
  var rowsEl = document.getElementById('rows');
  var liveEl = document.getElementById('live-rows');
  var countEl = document.getElementById('count');
  var qEl = document.getElementById('q');
  var catEl = document.getElementById('f-cat');
  var chainEl = document.getElementById('f-chain');
  var setEl = document.getElementById('f-set');
  var sortEl = document.getElementById('f-sort');
  var drawer = document.getElementById('drawer');
  var drawerBody = document.getElementById('drawer-body');
  var backdrop = document.getElementById('drawer-backdrop');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function usd(n) {
    var s = String(Math.round(n));
    return '$' + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function compact(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  }
  function pct(v) {
    /* change_7d is already in percent units in the snapshot (median about -8.2). */
    if (v == null) return '&ndash;';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageText(d) {
    if (d == null) return '&ndash;';
    if (d < 365) return d + 'd';
    return (d / 365).toFixed(1) + 'y';
  }
  function option(el, values) {
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      el.appendChild(o);
    });
  }

  if (!R) {
    main.setAttribute('aria-busy', 'false');
    document.getElementById('masthead-meta').textContent = 'No data: data.js did not load.';
    return;
  }

  /* Which rows are watchlist rows: data.js carries the snapshot's own watchlist slugs. */
  var isWatch = {};
  (R.watchlist_slugs || []).forEach(function (s) { isWatch[s] = true; });

  /* ---- header ---- */
  document.getElementById('masthead-meta').innerHTML =
    'Snapshot <strong>' + esc(R.as_of) + '</strong> &middot; ' + esc(R.source) + '<br>' +
    '<strong>' + R.board_size + '</strong> ranked rows &middot; <strong>' + R.watchlist_size + '</strong> watchlist &middot; ' +
    '<strong>' + R.early_size + '</strong> early &middot; floor <strong>' + compact(R.floor_usd) + '</strong><br>' +
    'Model <strong>' + esc(R.model_version) + '</strong> &middot; fitted on ' + R.fit.n + ' issued tokens';

  /* ---- filters ---- */
  var cats = [], chains = [];
  R.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  option(catEl, cats);
  option(chainEl, chains);

  function readHash() {
    var h = {};
    location.hash.slice(1).split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) h[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return h;
  }
  function writeHash() {
    var parts = [];
    if (qEl.value) parts.push('q=' + encodeURIComponent(qEl.value));
    if (catEl.value) parts.push('cat=' + encodeURIComponent(catEl.value));
    if (chainEl.value) parts.push('chain=' + encodeURIComponent(chainEl.value));
    if (setEl.value !== 'all') parts.push('set=' + setEl.value);
    if (sortEl.value !== 'implied') parts.push('sort=' + sortEl.value);
    var slug = drawer.dataset.slug;
    if (slug) parts.push('detail=' + encodeURIComponent(slug));
    var next = parts.length ? '#' + parts.join('&') : '';
    if (location.hash !== next) history.replaceState(null, '', next || location.pathname + location.search);
  }

  function filtered() {
    var q = qEl.value.trim().toLowerCase();
    var cat = catEl.value, chain = chainEl.value, set = setEl.value;
    var out = R.rows.filter(function (r) {
      if (set === 'watchlist' && !isWatch[r.slug]) return false;
      if (set === 'early' && isWatch[r.slug]) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
    var sort = sortEl.value;
    out.sort(function (a, b) {
      if (sort === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (sort === 'age') return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days);
      if (sort === 'growth') return (b.change_7d || 0) - (a.change_7d || 0);
      return b.implied_value_usd - a.implied_value_usd;
    });
    return out;
  }

  function render() {
    var list = filtered();
    countEl.textContent = 'Showing ' + list.length + ' of ' + R.board_size + ' rows' +
      (list.length < R.board_size ? ' (filtered)' : '') + '. Click a row for its farm plan and model breakdown.';
    rowsEl.innerHTML = list.map(function (r) {
      var badge = isWatch[r.slug]
        ? '<span class="badge">watchlist</span>'
        : '<span class="badge early">early</span>';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong>' + badge + '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '&ndash;') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + compact(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><strong>' + compact(r.implied_value_usd) + '</strong>' +
        '<span class="interval">' + compact(r.implied_low_usd) + ' &ndash; ' + compact(r.implied_high_usd) + ' (80%)</span></td>' +
        '<td><button type="button" class="plan-btn" data-slug="' + esc(r.slug) + '">Farm plan &rsaquo;</button></td>' +
        '</tr>';
    }).join('');
    writeHash();
  }

  /* ---- live table ---- */
  liveEl.innerHTML = R.live.map(function (p) {
    return '<tr>' +
      '<td><strong>' + esc(p.name) + '</strong><br><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '&ndash;') + '</td>' +
      '<td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + compact(p.tvl_usd) + '</td>' +
      '<td class="num"><strong>' + (p.mcap_usd == null ? '&ndash;' : compact(p.mcap_usd)) + '</strong></td>' +
      '<td class="num">' + pct(p.change_7d) + '</td>' +
      '</tr>';
  }).join('');

  /* ---- methodology ---- */
  (function () {
    var f = R.fit, m = R.model;
    document.getElementById('method-body').innerHTML =
      '<div class="stat-grid">' +
      '<div class="stat"><b>' + f.n + '</b><span>issued-token protocols fitted</span></div>' +
      '<div class="stat"><b>R&sup2; ' + f.r2.toFixed(3) + '</b><span>fit on log market cap vs log TVL</span></div>' +
      '<div class="stat"><b>' + f.holdout_rmse_log.toFixed(2) + '</b><span>holdout RMSE (log units)</span></div>' +
      '<div class="stat"><b>' + Math.round(f.holdout_within_2x * 100) + '%</b><span>holdout predictions within 2&times;</span></div>' +
      '<div class="stat"><b>0.07&times;&ndash;14.3&times;</b><span>80% interval around each estimate</span></div>' +
      '<div class="stat"><b>' + f.starter_holdout_rmse_log.toFixed(2) + '</b><span>starter TVL &times; 0.25, same holdout</span></div>' +
      '</div>' +
      '<h3>The formula</h3>' +
      '<div class="formula">log(market cap) = ' + f.intercept + ' + ' + f.slope + ' x log(TVL)\n' +
      'implied = exp(' + f.intercept + ' + ' + f.slope + ' x ln(TVL)) x growth x maturity\n' +
      'growth   = 1 + clamp(7d change, -60%, +120%) / 100 x ' + m.growth_weight + '\n' +
      'maturity = ' + m.maturity_floor + ' + min(age, ' + m.maturity_days + 'd) / ' + m.maturity_days + ' x ' + m.maturity_range + '  (unknown age: ' + m.unknown_age_days + 'd)\n' +
      'interval = implied x exp(+/- ' + f.interval_z + ' x ' + f.residual_sd_log + ')  (' + f.interval_level + ', from the fit residuals)</div>' +
      '<h3>What was fitted, and how it was checked</h3>' +
      '<ul>' +
      '<li>The curve is an ordinary least-squares fit of log market cap on log TVL over the ' + f.n +
      ' snapshot protocols that already trade with a positive market cap (16 more carry a zero or negative market cap and were excluded as dirty data). Median market-cap-to-TVL across them is ' + f.median_mcap_tvl + '.</li>' +
      '<li>Holdout: trained on the ' + f.holdout_train_n + ' protocols listed before ' + f.holdout_split +
      ', tested on the ' + f.holdout_test_n + ' listed after. RMSE(log) ' + f.holdout_rmse_log.toFixed(3) +
      ', ' + Math.round(f.holdout_within_2x * 100) + '% within 2&times;, mean bias +' + f.holdout_bias_log.toFixed(3) +
      ' log units &mdash; the curve overstates newer listings by about 2&times; on average, so treat the top of the board as optimistic.</li>' +
      '<li>The starter&rsquo;s flat TVL &times; 0.25 scores worse on the same holdout: RMSE(log) ' + f.starter_holdout_rmse_log.toFixed(3) +
      ', ' + Math.round(f.starter_holdout_within_2x * 100) + '% within 2&times;. The fitted curve wins on error, not on certainty.</li>' +
      '<li>A per-category intercept was tried on the same split and scored worse (RMSE(log) ' + f.category_intercept_holdout_rmse_log.toFixed(3) +
      '), so the board uses one global curve. No category and no protocol name is special-cased.</li>' +
      '</ul>' +
      '<h3>How the farm plans are built</h3>' +
      '<ul>' +
      '<li>Each plan has seven steps, derived from the protocol&rsquo;s own record: its category picks the qualifying action (supply, stake, provide liquidity, bridge, mint, vote&hellip;), its first chain sets the gas cost (Ethereum about $8 a transaction, Solana about $0.05, Arbitrum / Optimism / Base about $0.50), its TVL sets the capital ($50&ndash;$250), its age sets the hold (30&ndash;60 days).</li>' +
      '<li>The net check states its assumption outright: farmers together receive 5% of the implied value, split across about 10,000 qualifying wallets. The capital comes back when the position unwinds; the gas does not. A plan only pays when the per-wallet share beats the gas.</li>' +
      '<li>Nothing here is a promise of an airdrop. Most pre-token protocols never issue one, and the interval is the honest width of that ignorance.</li>' +
      '</ul>' +
      '<h3>Limits</h3>' +
      '<ul>' +
      '<li>Data is the frozen DefiLlama snapshot of ' + esc(R.as_of) + ': 758 protocols at or above ' + usd(R.floor_usd) + ' TVL. It cannot see launches after that date.</li>' +
      '<li>The fit is cross-sectional, not causal: a high TVL does not cause a high market cap, and R&sup2; ' + f.r2.toFixed(3) + ' says TVL alone explains about a fifth of the variation.</li>' +
      '<li>Change over 7 days and age are weak, mechanical adjustments, not momentum signals.</li>' +
      '</ul>';
  })();

  /* ---- detail drawer ---- */
  function splitStep(s) {
    var m = s.match(/^(.*) Cost: (.*)\. Time: (.*)\.$/);
    if (!m) return { text: s, cost: '', time: '' };
    return { text: m[1], cost: m[2], time: m[3] };
  }
  function openDetail(slug) {
    var r = null;
    R.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    drawer.dataset.slug = slug;
    var base = Math.exp(R.fit.intercept + R.fit.slope * Math.log(r.tvl_usd));
    var lo = Math.log(r.implied_low_usd), mid = Math.log(r.implied_value_usd), hi = Math.log(r.implied_high_usd);
    var span = hi - lo || 1;
    /* The bar is the interval itself; the mark is the centre estimate, halfway in log space
       because the interval is symmetric around it (implied / spread .. implied x spread). */
    var mark = ((mid - lo) / span * 100).toFixed(1);
    var steps = r.farm_steps.map(function (s, i) {
      var p = splitStep(s);
      return '<li>' + esc(p.text) +
        (p.cost || p.time ? '<span class="step-meta">Cost: ' + esc(p.cost) + (p.time ? ' &middot; Time: ' + esc(p.time) : '') + '</span>' : '') +
        '</li>';
    }).join('');
    drawerBody.innerHTML =
      '<h2>' + esc(r.name) + '</h2>' +
      '<div class="slug">' + esc(r.slug) + ' &middot; ' + esc(r.category || 'uncategorised') + ' &middot; ' + esc(r.chains.join(', ')) + '</div>' +
      '<dl>' +
      '<dt>Rank</dt><dd>#' + r.rank + ' of ' + R.board_size + (isWatch[r.slug] ? ' (watchlist)' : ' (early radar)') + '</dd>' +
      '<dt>TVL</dt><dd>' + usd(r.tvl_usd) + '</dd>' +
      '<dt>7-day change</dt><dd>' + (r.change_7d == null ? '&ndash;' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</dd>' +
      '<dt>Age</dt><dd>' + (r.age_days == null ? 'unknown' : r.age_days + ' days (listed ' + esc(r.listed_at || '') + ')') + '</dd>' +
      '<dt>Implied value</dt><dd><strong>' + usd(r.implied_value_usd) + '</strong></dd>' +
      '</dl>' +
      '<div class="interval-bar" title="80% interval"><div class="band" style="left:0;width:100%"></div>' +
      '<div class="mark" style="left:' + mark + '%"></div></div>' +
      '<div class="slug">80% interval ' + usd(r.implied_low_usd) + ' &ndash; ' + usd(r.implied_high_usd) + ' &middot; centre mark is the estimate</div>' +
      '<h3>Model breakdown</h3>' +
      '<dl>' +
      '<dt>Curve base</dt><dd>' + usd(base) + ' &nbsp;(exp(' + R.fit.intercept + ' + ' + R.fit.slope + ' &times; ln TVL))</dd>' +
      '<dt>Growth &times;</dt><dd>' + r.growth_multiplier.toFixed(4) + '</dd>' +
      '<dt>Maturity &times;</dt><dd>' + r.maturity_multiplier.toFixed(4) + '</dd>' +
      '<dt>Implied</dt><dd>' + usd(r.implied_value_usd) + '</dd>' +
      '</dl>' +
      '<h3>Farm plan</h3>' +
      '<ol class="steps">' + steps + '</ol>' +
      '<p class="outlink"><a href="https://defillama.com/protocol/' + encodeURIComponent(r.slug) + '" target="_blank" rel="noopener">Open ' + esc(r.name) + ' on DefiLlama</a> (external link; the page itself loads nothing).</p>';
    drawer.hidden = false;
    backdrop.hidden = false;
    document.getElementById('drawer-close').focus();
    writeHash();
  }
  function closeDetail() {
    delete drawer.dataset.slug;
    drawer.hidden = true;
    backdrop.hidden = true;
    writeHash();
  }
  document.getElementById('drawer-close').addEventListener('click', closeDetail);
  backdrop.addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });
  rowsEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-slug]');
    if (t) openDetail(t.getAttribute('data-slug'));
  });

  /* ---- wire controls ---- */
  [qEl, catEl, chainEl, setEl, sortEl].forEach(function (el) {
    el.addEventListener(el === qEl ? 'input' : 'change', render);
  });
  window.addEventListener('hashchange', function () {
    var h = readHash();
    qEl.value = h.q || '';
    catEl.value = h.cat || '';
    chainEl.value = h.chain || '';
    setEl.value = h.set || 'all';
    sortEl.value = h.sort || 'implied';
    render();
    if (h.detail) openDetail(h.detail); else closeDetail();
  });

  /* ---- initial state from the hash ---- */
  (function () {
    var h = readHash();
    if (h.q) qEl.value = h.q;
    if (h.cat) catEl.value = h.cat;
    if (h.chain) chainEl.value = h.chain;
    if (h.set) setEl.value = h.set;
    if (h.sort) sortEl.value = h.sort;
  })();

  render();
  main.setAttribute('aria-busy', 'false');
  (function () {
    var h = readHash();
    if (h.detail) openDetail(h.detail);
  })();
})();
