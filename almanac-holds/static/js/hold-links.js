// Numbered holds, layered on top of the homepage. Each entry gets a number in
// the listing, and the same number is pinned over its tallest building on the
// ship, using the ship:anchors message the ship sends. Hovering an entry or a
// number draws a line between them, and a click opens the artist page out of
// that hold. ship-highlight.js keeps doing the lighting; this only adds.
(function () {
  var frame = document.querySelector('.ship-backdrop');
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-link[data-index]'));
  if (!frame || !links.length) return;

  var origin = window.location.origin;
  var anchors = null;
  var hot = null;
  var opening = false;

  function num(i) { return (i < 9 ? '0' : '') + (i + 1); }
  function post(message) { if (frame.contentWindow) frame.contentWindow.postMessage(message, origin); }

  links.forEach(function (link, i) {
    var n = document.createElement('span');
    n.className = 'toc-num';
    n.textContent = num(i);
    link.insertBefore(n, link.firstChild);
  });

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'hold-line');
  svg.setAttribute('aria-hidden', 'true');
  var line = document.createElementNS(svgNS, 'line');
  var dot = document.createElementNS(svgNS, 'rect');
  dot.setAttribute('width', '5');
  dot.setAttribute('height', '5');
  svg.appendChild(line);
  svg.appendChild(dot);

  var layer = document.createElement('div');
  layer.className = 'hold-layer';

  var curtain = document.createElement('div');
  curtain.className = 'hold-curtain';

  document.body.appendChild(svg);
  document.body.appendChild(layer);
  document.body.appendChild(curtain);

  var labels = links.map(function (link, i) {
    var el = document.createElement('a');
    el.className = 'hold-label';
    el.href = link.href;
    el.textContent = num(i);
    el.hidden = true;
    el.setAttribute('aria-label', link.querySelector('.toc-name').textContent);
    el.addEventListener('mouseenter', function () { setHot(i, true); });
    el.addEventListener('mouseleave', function () { setHot(null, true); });
    el.addEventListener('click', function (e) { open(e, i); });
    layer.appendChild(el);
    return el;
  });

  // From a number on the ship, light the entry and the buildings the same way
  // hovering the entry does. From the entry itself, ship-highlight.js already
  // lights the buildings, so only the line and the number change here.
  function setHot(i, fromLabel) {
    hot = i;
    if (fromLabel) {
      links.forEach(function (l, k) { l.classList.toggle('is-hot', k === i); });
      post({ type: 'ship:highlight', group: i });
    }
    draw();
  }

  function draw() {
    labels.forEach(function (el, i) {
      var a = anchors && anchors[i];
      if (!a || !a.visible || opening) { el.hidden = true; return; }
      el.hidden = false;
      el.style.transform = 'translate(' + a.x + 'px, ' + a.y + 'px) translate(-50%, -100%)';
      el.classList.toggle('is-hot', i === hot);
    });
    var a = hot !== null && anchors && anchors[hot];
    if (a && a.visible && !opening) {
      var r = links[hot].getBoundingClientRect();
      var x1 = r.left + r.width / 2, y1 = r.bottom;
      var y2 = a.y - labels[hot].offsetHeight;
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', a.x);
      line.setAttribute('y2', y2);
      dot.setAttribute('x', x1 - 2.5);
      dot.setAttribute('y', y1 - 2.5);
      svg.style.visibility = 'visible';
    } else {
      svg.style.visibility = 'hidden';
    }
  }

  function open(e, i) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var a = anchors && anchors[i];
    var x, y;
    if (a && a.visible) { x = a.x; y = a.y; }
    else { var r = links[i].getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    post({ type: 'ship:highlight', group: i });
    opening = true;
    draw();
    curtain.style.setProperty('--x', x + 'px');
    curtain.style.setProperty('--y', y + 'px');
    curtain.classList.add('is-open');
    var href = links[i].href;
    setTimeout(function () { window.location.href = href; }, 620);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    var d = event.data;
    if (!d || d.type !== 'ship:anchors' || !Array.isArray(d.anchors)) return;
    anchors = [];
    d.anchors.forEach(function (p) { anchors[p.group] = p; });
    draw();
  });

  links.forEach(function (link, i) {
    link.addEventListener('mouseenter', function () { setHot(i, false); });
    link.addEventListener('focus', function () { setHot(i, false); });
    link.addEventListener('mouseleave', function () { setHot(null, false); });
    link.addEventListener('blur', function () { setHot(null, false); });
    link.addEventListener('click', function (e) { open(e, i); });
  });

  window.addEventListener('resize', draw);
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    opening = false;
    curtain.classList.remove('is-open');
    draw();
  });
})();
