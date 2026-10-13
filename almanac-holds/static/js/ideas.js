// Preview-only ideas layer on top of the existing site. Nothing here changes the
// ship: it only uses the messages the ship already understands. Each idea can be
// switched on and off in the panel at the bottom left, and the choice is kept in
// localStorage so it holds across pages.
(function () {
  var KEY = 'almanac-ideas';
  var DEFAULTS = { caption: true, numbers: true, dive: true, morph: true, shipOnArtist: false, labels: true };
  var NAMES = {
    caption: 'A · caption on hover',
    numbers: 'B · numbers',
    dive: 'C · dive into the ship',
    morph: 'D · name carries over',
    shipOnArtist: 'E · ship behind the entry',
    labels: 'F · labels on the views'
  };

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(ideas)); } catch (e) {}
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  var ideas = load();
  var body = document.body;
  var isToc = body.classList.contains('toc-ship');
  var isArtist = body.classList.contains('artist-page');

  function apply() {
    Object.keys(DEFAULTS).forEach(function (k) { body.classList.toggle('idea-on-' + k, !!ideas[k]); });
  }
  apply();

  var panel = document.createElement('div');
  panel.className = 'ideas-panel';
  panel.innerHTML = '<button type="button" class="ideas-toggle" aria-expanded="true">Ideas · preview only</button><div class="ideas-list"></div>';
  var list = panel.querySelector('.ideas-list');
  Object.keys(DEFAULTS).forEach(function (k) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = NAMES[k];
    b.setAttribute('aria-pressed', String(!!ideas[k]));
    b.addEventListener('click', function () {
      ideas[k] = !ideas[k];
      b.setAttribute('aria-pressed', String(ideas[k]));
      save();
      apply();
      if (k === 'shipOnArtist' && isArtist) location.reload();
    });
    list.appendChild(b);
  });
  panel.querySelector('.ideas-toggle').addEventListener('click', function () {
    var show = list.hidden;
    list.hidden = !show;
    this.setAttribute('aria-expanded', String(show));
  });
  body.appendChild(panel);

  if (isToc) setUpListing();
  if (isArtist) setUpArtist();

  function setUpListing() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc-link[data-index]'));
    var count = links.length;

    links.forEach(function (link, i) {
      var n = document.createElement('span');
      n.className = 'idea-num';
      n.textContent = pad(i + 1);
      link.insertBefore(n, link.firstChild);
    });

    var cap = document.createElement('div');
    cap.className = 'idea-caption';
    cap.hidden = true;
    cap.innerHTML = '<span class="cap-name"></span><span class="cap-work"></span><span class="cap-hint">These lit buildings hold their work. Click to go in.</span>';
    body.appendChild(cap);

    links.forEach(function (link, i) {
      var name = link.querySelector('.toc-name').textContent;
      var work = link.querySelector('.toc-work').textContent;
      link.addEventListener('mouseenter', function () {
        cap.querySelector('.cap-name').textContent = pad(i + 1) + ' · ' + name;
        cap.querySelector('.cap-work').textContent = work;
        cap.hidden = false;
      });
      link.addEventListener('mouseleave', function () { cap.hidden = true; });
      link.addEventListener('click', function (e) {
        try { sessionStorage.setItem('almanac-entry', JSON.stringify({ index: i, count: count, path: new URL(link.href).pathname })); } catch (err) {}
        if (ideas.morph) link.querySelector('.toc-name').style.viewTransitionName = 'artist-name';
        if (!ideas.dive || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        link.closest('.toc-entry').classList.add('idea-picked');
        body.classList.add('idea-diving');
        var href = link.href;
        setTimeout(function () { window.location.href = href; }, 650);
      });
    });

    var views = ['Front', 'Side', 'Plan'];
    document.querySelectorAll('.ship-panel').forEach(function (p, i) {
      var s = document.createElement('span');
      s.className = 'idea-panel-label';
      s.textContent = views[i] || '';
      p.appendChild(s);
    });

    // Coming back from an artist page, undo the dive so the page is whole again.
    window.addEventListener('pageshow', function () {
      body.classList.remove('idea-diving');
      document.querySelectorAll('.idea-picked').forEach(function (el) { el.classList.remove('idea-picked'); });
    });
  }

  function setUpArtist() {
    var entry = null;
    try { entry = JSON.parse(sessionStorage.getItem('almanac-entry') || 'null'); } catch (e) {}
    if (!entry || entry.path !== window.location.pathname) return;
    var header = document.querySelector('.artist-header');
    if (header) {
      var n = document.createElement('span');
      n.className = 'idea-num';
      n.textContent = pad(entry.index + 1);
      header.appendChild(n);
    }
    if (!ideas.shipOnArtist) return;
    // Show the ship behind the entry with this artist's buildings lit, using the
    // same ?groups= and ship:highlight message the homepage already uses.
    var frame = document.querySelector('.ship-backdrop');
    if (!frame) return;
    window.addEventListener('message', function (ev) {
      if (ev.origin !== window.location.origin || ev.source !== frame.contentWindow) return;
      if (ev.data && ev.data.type === 'ship:ready') {
        frame.contentWindow.postMessage({ type: 'ship:highlight', group: entry.index }, window.location.origin);
      }
    });
    frame.src = '/ship/?groups=' + entry.count;
    frame.title = 'Arcology ship';
  }
})();
