// ---------- Project demo widgets ----------

// 1. Async pipeline: worker pods scaling 4 -> 15 under load
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
    label.textContent = `HorizontalPodAutoscaler: ${active} pods`;
  }
  tick();
  setInterval(tick, 700);
}

// 2. Decision Assist: bagging/boosting ensemble vote
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

// 3. Stock dashboard: live-ish forecast line
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

// 4. Identity360: multi-step LLM agent calling tools in sequence
function renderAgentDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 140');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const nodes = [
    { x: 30, y: 70, label: 'Agent' },
    { x: 110, y: 30, label: 'CRM' },
    { x: 110, y: 70, label: 'Billing' },
    { x: 110, y: 110, label: 'Support' },
    { x: 220, y: 70, label: 'Insight' },
  ];
  nodes.forEach((n) => {
    const isEnd = n.label === 'Agent' || n.label === 'Insight';
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y);
    circle.setAttribute('r', isEnd ? 16 : 12);
    circle.setAttribute('fill', isEnd ? '#4FD1C5' : '#16213A');
    circle.setAttribute('stroke', isEnd ? '#4FD1C5' : '#E8A33D');
    circle.setAttribute('stroke-width', 1.5);
    svg.appendChild(circle);
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', n.x);
    text.setAttribute('y', n.y + (n.label === 'Agent' || n.label === 'Insight' ? 32 : 26));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#8B98AF');
    text.setAttribute('font-family', 'IBM Plex Mono, monospace');
    text.setAttribute('font-size', '9');
    text.textContent = n.label;
    svg.appendChild(text);
  });

  const links = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]];
  links.forEach(([a, b]) => {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', nodes[a].x); line.setAttribute('y1', nodes[a].y);
    line.setAttribute('x2', nodes[b].x); line.setAttribute('y2', nodes[b].y);
    line.setAttribute('stroke', '#263449');
    svg.appendChild(line);
  });

  const callPaths = [[0, 1, 4], [0, 2, 4], [0, 3, 4]];
  callPaths.forEach((path, i) => {
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', 4);
    dot.setAttribute('fill', '#E8A33D');
    svg.appendChild(dot);
    const d = `M ${nodes[path[0]].x} ${nodes[path[0]].y} L ${nodes[path[1]].x} ${nodes[path[1]].y} L ${nodes[path[2]].x} ${nodes[path[2]].y}`;
    const animate = document.createElementNS(NS, 'animateMotion');
    animate.setAttribute('dur', '2.6s');
    animate.setAttribute('begin', `${i * 0.9}s`);
    animate.setAttribute('repeatCount', 'indefinite');
    animate.setAttribute('path', d);
    dot.appendChild(animate);
  });
}

// 5. Drone facial recognition: scanning confidence readout
function renderFaceScanDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 140');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const box = document.createElementNS(NS, 'rect');
  box.setAttribute('x', 105); box.setAttribute('y', 15);
  box.setAttribute('width', 90); box.setAttribute('height', 90);
  box.setAttribute('fill', 'none');
  box.setAttribute('stroke', '#4FD1C5');
  box.setAttribute('stroke-width', 2);
  svg.appendChild(box);

  const scanLine = document.createElementNS(NS, 'line');
  scanLine.setAttribute('x1', 105); scanLine.setAttribute('x2', 195);
  scanLine.setAttribute('stroke', '#E8A33D');
  scanLine.setAttribute('stroke-width', 2);
  svg.appendChild(scanLine);

  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 150);
  label.setAttribute('y', 128);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#8B98AF');
  label.setAttribute('font-family', 'IBM Plex Mono, monospace');
  label.setAttribute('font-size', '10');
  svg.appendChild(label);

  let y = 15;
  let dir = 1;
  function tick() {
    y += dir * 4;
    if (y > 105) dir = -1;
    if (y < 15) dir = 1;
    scanLine.setAttribute('y1', y);
    scanLine.setAttribute('y2', y);
    const confidence = 82 + Math.round(Math.random() * 12);
    label.textContent = `CNN confidence: ${confidence}% · target 90% accuracy`;
  }
  tick();
  setInterval(tick, 90);
}

// 6. Sudoku AR: grid filling in, representing OCR + solve
function renderSudokuDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 140');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const size = 9;
  const cell = 12;
  const startX = 114, startY = 10;
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', startX + c * cell);
      rect.setAttribute('y', startY + r * cell);
      rect.setAttribute('width', cell - 1);
      rect.setAttribute('height', cell - 1);
      rect.setAttribute('fill', '#16213A');
      rect.setAttribute('stroke', '#263449');
      svg.appendChild(rect);
      cells.push(rect);
    }
  }

  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 150);
  label.setAttribute('y', 128);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#8B98AF');
  label.setAttribute('font-family', 'IBM Plex Mono, monospace');
  label.setAttribute('font-size', '10');
  svg.appendChild(label);

  let filled = 0;
  function tick() {
    cells.forEach((c, i) => c.setAttribute('fill', i < filled ? '#E8A33D' : '#16213A'));
    label.textContent = filled >= cells.length ? 'solved in ~3s · 99% accuracy' : 'reading grid via OCR…';
    filled = filled >= cells.length ? 0 : filled + 4;
  }
  tick();
  setInterval(tick, 140);
}

// 7. Growth pipeline: funnel from sourced leads to sent emails
function renderFunnelDemo(container) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 150');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  container.appendChild(svg);

  const stages = [
    { label: 'Sourced', value: 225, color: '#4FD1C5' },
    { label: 'Prefiltered', value: 135, color: '#4FD1C5' },
    { label: 'LLM-qualified', value: 22, color: '#E8A33D' },
    { label: 'Sent', value: 22, color: '#E8A33D' },
  ];
  const max = stages[0].value;
  const barW = 56;
  stages.forEach((s, i) => {
    const h = (s.value / max) * 74;
    const baseline = 108;
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', 12 + i * 72);
    rect.setAttribute('y', baseline - h);
    rect.setAttribute('width', barW);
    rect.setAttribute('height', 0);
    rect.setAttribute('fill', s.color);
    rect.setAttribute('opacity', '0.85');
    rect.setAttribute('rx', 3);
    svg.appendChild(rect);

    const animate = document.createElementNS(NS, 'animate');
    animate.setAttribute('attributeName', 'height');
    animate.setAttribute('from', '0');
    animate.setAttribute('to', String(h));
    animate.setAttribute('dur', '1s');
    animate.setAttribute('begin', `${i * 0.25}s`);
    animate.setAttribute('fill', 'freeze');
    rect.appendChild(animate);

    const animateY = document.createElementNS(NS, 'animate');
    animateY.setAttribute('attributeName', 'y');
    animateY.setAttribute('from', String(baseline));
    animateY.setAttribute('to', String(baseline - h));
    animateY.setAttribute('dur', '1s');
    animateY.setAttribute('begin', `${i * 0.25}s`);
    animateY.setAttribute('fill', 'freeze');
    rect.appendChild(animateY);

    const valLabel = document.createElementNS(NS, 'text');
    valLabel.setAttribute('x', 12 + i * 72 + barW / 2);
    valLabel.setAttribute('y', baseline - h - 8);
    valLabel.setAttribute('text-anchor', 'middle');
    valLabel.setAttribute('fill', '#E8ECF4');
    valLabel.setAttribute('font-family', 'IBM Plex Mono, monospace');
    valLabel.setAttribute('font-size', '11');
    valLabel.textContent = s.value;
    svg.appendChild(valLabel);

    const nameLabel = document.createElementNS(NS, 'text');
    nameLabel.setAttribute('x', 12 + i * 72 + barW / 2);
    nameLabel.setAttribute('y', baseline + 14);
    nameLabel.setAttribute('text-anchor', 'middle');
    nameLabel.setAttribute('fill', '#8B98AF');
    nameLabel.setAttribute('font-family', 'IBM Plex Mono, monospace');
    nameLabel.setAttribute('font-size', '9');
    nameLabel.textContent = s.label;
    svg.appendChild(nameLabel);
  });

  const caption = document.createElementNS(NS, 'text');
  caption.setAttribute('x', 150);
  caption.setAttribute('y', 138);
  caption.setAttribute('text-anchor', 'middle');
  caption.setAttribute('fill', '#8B98AF');
  caption.setAttribute('font-family', 'IBM Plex Mono, monospace');
  caption.setAttribute('font-size', '9');
  caption.textContent = 'two runs · zero failed sends';
  svg.appendChild(caption);
}

(function () {
  const widgets = {
    'pipeline-demo': renderPipelineDemo,
    'classifier-demo': renderClassifierDemo,
    'stocks-demo': renderStocksDemo,
    'agent-demo': renderAgentDemo,
    'facescan-demo': renderFaceScanDemo,
    'sudoku-demo': renderSudokuDemo,
    'funnel-demo': renderFunnelDemo,
  };
  document.querySelectorAll('[data-widget]').forEach((container) => {
    const fn = widgets[container.dataset.widget];
    if (fn) fn(container);
  });
})();
