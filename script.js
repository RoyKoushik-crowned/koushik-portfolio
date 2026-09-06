// ---------- Tooltip bubbles for skills ----------
(function () {
  const bubble = document.getElementById('tooltip-bubble');
  const tags = document.querySelectorAll('.skill-tag');
  let activeTag = null;

  function placeBubble(tag) {
    const rect = tag.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bubbleRect.width - 12));
    let top = rect.top - bubbleRect.height - 10;
    if (top < 8) top = rect.bottom + 10;
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  function show(tag) {
    bubble.textContent = tag.dataset.tip;
    bubble.classList.add('is-visible');
    tag.classList.add('is-active');
    activeTag = tag;
    // measure after content set
    requestAnimationFrame(() => placeBubble(tag));
  }

  function hide() {
    bubble.classList.remove('is-visible');
    if (activeTag) activeTag.classList.remove('is-active');
    activeTag = null;
  }

  tags.forEach((tag) => {
    tag.addEventListener('mouseenter', () => show(tag));
    tag.addEventListener('mouseleave', hide);
    tag.addEventListener('focus', () => show(tag));
    tag.addEventListener('blur', hide);
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      if (activeTag === tag) { hide(); } else { show(tag); }
    });
  });

  document.addEventListener('scroll', () => { if (activeTag) placeBubble(activeTag); }, { passive: true });
  window.addEventListener('resize', () => { if (activeTag) placeBubble(activeTag); });
  document.addEventListener('click', (e) => {
    if (activeTag && !e.target.classList.contains('skill-tag')) hide();
  });
})();

// ---------- Hero pipeline animation (SVG) ----------
(function () {
  const svg = document.getElementById('pipeline-svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const stages = [
    { x: 40,  y: 160, label: 'upload' },
    { x: 150, y: 90,  label: 'queue'  },
    { x: 150, y: 160, label: 'queue'  },
    { x: 150, y: 230, label: 'queue'  },
    { x: 270, y: 90,  label: 'worker' },
    { x: 270, y: 160, label: 'worker' },
    { x: 270, y: 230, label: 'worker' },
    { x: 380, y: 160, label: 'stored' },
  ];

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  // connecting lines
  const links = [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [2, 5], [3, 6],
    [4, 7], [5, 7], [6, 7],
  ];
  links.forEach(([a, b]) => {
    const line = el('line', {
      x1: stages[a].x, y1: stages[a].y,
      x2: stages[b].x, y2: stages[b].y,
      stroke: '#263449', 'stroke-width': 1.5,
    });
    svg.appendChild(line);
  });

  // nodes
  stages.forEach((s, i) => {
    const isEndpoint = i === 0 || i === 7;
    const circle = el('circle', {
      cx: s.x, cy: s.y, r: isEndpoint ? 10 : 8,
      fill: isEndpoint ? '#4FD1C5' : '#16213A',
      stroke: isEndpoint ? '#4FD1C5' : '#E8A33D',
      'stroke-width': 1.5,
    });
    svg.appendChild(circle);
  });

  // animated packets traveling along a path
  const paths = [
    [stages[0], stages[1], stages[4], stages[7]],
    [stages[0], stages[2], stages[5], stages[7]],
    [stages[0], stages[3], stages[6], stages[7]],
  ];

  function makePathD(pts) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y}`;
  }

  paths.forEach((pts, i) => {
    const pathEl = el('path', { d: makePathD(pts), fill: 'none', stroke: 'none' });
    svg.appendChild(pathEl);
    const dot = el('circle', { r: 4, fill: '#E8A33D' });
    svg.appendChild(dot);
    const animate = el('animateMotion', {
      dur: '3.2s',
      begin: `${i * 1.05}s`,
      repeatCount: 'indefinite',
      path: makePathD(pts),
    });
    dot.appendChild(animate);
  });
})();

// ---------- Project glance widgets ----------

// 1. Async pipeline scaling demo: worker pods 4 -> 15
function renderPipelineDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 140');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const maxPods = 15;
  const cols = 5;
  const podEls = [];
  for (let i = 0; i < maxPods; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', 40 + col * 44);
    rect.setAttribute('y', 20 + row * 34);
    rect.setAttribute('width', 28);
    rect.setAttribute('height', 22);
    rect.setAttribute('rx', 4);
    rect.setAttribute('fill', '#0B1220');
    rect.setAttribute('stroke', '#263449');
    svg.appendChild(rect);
    podEls.push(rect);
  }
  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 150);
  label.setAttribute('y', 132);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#8B98AF');
  label.setAttribute('font-family', 'IBM Plex Mono, monospace');
  label.setAttribute('font-size', '10');
  svg.appendChild(label);

  let active = 4;
  let dir = 1;
  function tick() {
    active += dir;
    if (active >= maxPods) dir = -1;
    if (active <= 4) dir = 1;
    podEls.forEach((rect, i) => {
      const on = i < active;
      rect.setAttribute('fill', on ? '#E8A33D' : '#0B1220');
      rect.setAttribute('stroke', on ? '#E8A33D' : '#263449');
    });
    label.textContent = `${active} worker pods scaling under load`;
  }
  tick();
  setInterval(tick, 700);
}

// 2. Classifier confidence demo: bagging/boosting ensemble vote
function renderClassifierDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 140');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const trees = 7;
  const barEls = [];
  for (let i = 0; i < trees; i++) {
    const bar = document.createElementNS(NS, 'rect');
    bar.setAttribute('x', 24 + i * 36);
    bar.setAttribute('width', 20);
    bar.setAttribute('fill', '#4FD1C5');
    bar.setAttribute('rx', 2);
    svg.appendChild(bar);
    barEls.push(bar);
  }
  const line = document.createElementNS(NS, 'line');
  line.setAttribute('x1', 10); line.setAttribute('x2', 290);
  line.setAttribute('stroke', '#263449');
  svg.appendChild(line);

  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 150);
  label.setAttribute('y', 132);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#8B98AF');
  label.setAttribute('font-family', 'IBM Plex Mono, monospace');
  label.setAttribute('font-size', '10');
  svg.appendChild(label);

  const baseline = 108;
  line.setAttribute('y1', baseline); line.setAttribute('y2', baseline);

  function tick() {
    let votesYes = 0;
    barEls.forEach((bar) => {
      const h = 14 + Math.random() * 70;
      const vote = h > 45;
      if (vote) votesYes++;
      bar.setAttribute('height', h);
      bar.setAttribute('y', baseline - h);
      bar.setAttribute('fill', vote ? '#4FD1C5' : '#3A4A63');
    });
    const majority = votesYes > trees / 2;
    label.textContent = `${votesYes}/${trees} learners agree — ${majority ? 'high risk flagged' : 'low risk'}`;
  }
  tick();
  setInterval(tick, 1100);
}

// 3. Stock forecasting demo: live-ish line chart
function renderStocksDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 140');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const points = 24;
  let data = Array.from({ length: points }, () => 70 + Math.random() * 20);
  const actualPath = document.createElementNS(NS, 'polyline');
  actualPath.setAttribute('fill', 'none');
  actualPath.setAttribute('stroke', '#4FD1C5');
  actualPath.setAttribute('stroke-width', '2');
  svg.appendChild(actualPath);

  const forecastPath = document.createElementNS(NS, 'polyline');
  forecastPath.setAttribute('fill', 'none');
  forecastPath.setAttribute('stroke', '#E8A33D');
  forecastPath.setAttribute('stroke-width', '2');
  forecastPath.setAttribute('stroke-dasharray', '4 3');
  svg.appendChild(forecastPath);

  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 150);
  label.setAttribute('y', 132);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#8B98AF');
  label.setAttribute('font-family', 'IBM Plex Mono, monospace');
  label.setAttribute('font-size', '10');
  label.textContent = 'live price vs. LSTM/GRU forecast';
  svg.appendChild(label);

  function toCoords(arr, offsetX) {
    return arr.map((v, i) => `${offsetX + i * (240 / points)},${110 - v}`).join(' ');
  }

  function tick() {
    data.shift();
    const last = data[data.length - 1];
    const next = Math.max(50, Math.min(105, last + (Math.random() - 0.5) * 14));
    data.push(next);
    actualPath.setAttribute('points', toCoords(data, 20));

    const forecast = [data[data.length - 1]];
    for (let i = 0; i < 5; i++) {
      forecast.push(Math.max(50, Math.min(105, forecast[forecast.length - 1] + (Math.random() - 0.5) * 10)));
    }
    const fx = 20 + (points - 1) * (240 / points);
    const fPoints = forecast.map((v, i) => `${fx + i * (240 / points)},${110 - v}`).join(' ');
    forecastPath.setAttribute('points', fPoints);
  }
  tick();
  setInterval(tick, 900);
}

(function () {
  const widgets = {
    'pipeline-demo': renderPipelineDemo,
    'classifier-demo': renderClassifierDemo,
    'stocks-demo': renderStocksDemo,
  };
  document.querySelectorAll('[data-widget]').forEach((container) => {
    const fn = widgets[container.dataset.widget];
    if (fn) fn(container);
  });
})();
