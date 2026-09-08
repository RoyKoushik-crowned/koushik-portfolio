// ==========================================================
// EASTER EGGS
// 1. Tear the hero cloth to reveal a hidden message
// 2. Konami code (hint hidden in plain sight in the footer)
// 3. Type "whoami" anywhere to open a mock agent terminal
// 4. Click the hero name 3x fast for a silk burst
// ==========================================================
(() => {

  // ---------- tiny toast helper, reused by a couple of eggs ----------
  function toast(msg, ms = 2600) {
    let el = document.getElementById('egg-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'egg-toast';
      el.className = 'egg-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-visible'), ms);
  }

  // ---------- 1. Cloth tear reveal ----------
  // ClothSim (cloth.js) dispatches 'cloth-tear' with {ratio} on the canvas
  // each time a structural thread snaps. We listen on the hero canvas only.
  const heroCanvas = document.querySelector('.hero--cloth .cloth-canvas');
  const secret = document.querySelector('.cloth-secret');
  if (heroCanvas && secret) {
    let revealed = false;
    heroCanvas.addEventListener('cloth-tear', (e) => {
      const ratio = e.detail?.ratio ?? 0;
      secret.style.opacity = Math.min(1, ratio * 1.6).toFixed(2);
      if (ratio > 0.55 && !revealed) {
        revealed = true;
        secret.classList.add('is-revealed');
      }
    });
  }

  // ---------- 2. Konami code ----------
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let progress = 0;
  addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = (key === KONAMI[progress]) ? progress + 1 : (key === KONAMI[0] ? 1 : 0);
    if (progress === KONAMI.length) {
      progress = 0;
      window.dispatchEvent(new CustomEvent('konami-activated'));
      toast('🎮 Konami accepted — gravity\u2019s off for a bit.', 3600);
    }
  });

  // ---------- 3. whoami terminal ----------
  let buffer = '';
  let bufferTimer = null;
  function openWhoami() {
    let panel = document.getElementById('whoami-terminal');
    if (panel) { panel.classList.add('is-open'); return; }
    panel = document.createElement('div');
    panel.id = 'whoami-terminal';
    panel.className = 'whoami-terminal is-open';
    panel.innerHTML = `
      <div class="whoami-bar">
        <span class="whoami-dot"></span><span class="whoami-dot"></span><span class="whoami-dot"></span>
        <span class="whoami-title">koushik@portfolio: whoami</span>
      </div>
      <pre class="whoami-body">{
  "agent": "koushik-roy",
  "role": "Backend & AI/ML Engineer",
  "current": "Programmer Analyst @ Cognizant",
  "capabilities": [
    "LLM agents & function-calling",
    "RAG pipelines",
    "AWS infra & backend systems"
  ],
  "status": "probably building something this page hasn't shown you yet",
  "contact": "royeren00@gmail.com"
}</pre>
      <button class="whoami-close" aria-label="Close">Esc</button>`;
    document.body.appendChild(panel);
    panel.querySelector('.whoami-close').addEventListener('click', () => panel.classList.remove('is-open'));
  }
  addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
    if (e.key === 'Escape') {
      document.getElementById('whoami-terminal')?.classList.remove('is-open');
      return;
    }
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-6);
    clearTimeout(bufferTimer);
    bufferTimer = setTimeout(() => { buffer = ''; }, 2000);
    if (buffer === 'whoami') { openWhoami(); buffer = ''; }
  });

  // ---------- 4. Click the name 3x fast ----------
  const heroName = document.querySelector('.hero-name');
  if (heroName) {
    let clicks = [];
    heroName.style.cursor = 'pointer';
    heroName.addEventListener('click', () => {
      const now = performance.now();
      clicks = clicks.filter(t => now - t < 800);
      clicks.push(now);
      if (clicks.length >= 3) {
        clicks = [];
        window.dispatchEvent(new CustomEvent('silk-burst'));
        toast('✨', 1200);
      }
    });
  }
})();
