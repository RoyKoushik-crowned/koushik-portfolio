// ---------- Flowing cloth background: reusable across any .cloth-canvas ----------
(function () {
  const canvases = document.querySelectorAll('.cloth-canvas');
  if (!canvases.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = [
    [232, 163, 61],  // amber
    [79, 209, 197],  // teal
    [232, 163, 61],
    [140, 150, 190], // cool neutral — keeps it from feeling two-note
  ];

  function makeFolds(count) {
    return Array.from({ length: count }, (_, i) => ({
      baseFrac: (i + 0.5) / count,
      amp: 20 + Math.random() * 30,
      freq: 0.0018 + Math.random() * 0.0022,
      phase: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.5,
      parallax: 0.06 + (i % 5) * 0.045,
      thickness: 26 + Math.random() * 22,
      color: COLORS[i % COLORS.length],
      alpha: 0.09 + Math.random() * 0.09,
    }));
  }

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const host = canvas.closest('.cloth-host') || canvas.parentElement;
    const density = Number(canvas.dataset.density || 10);
    let width = 0, height = 0, dpr = 1;
    let folds = makeFolds(density);
    let scrollY = window.scrollY || 0;
    let targetScrollY = scrollY;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFold(fold, t) {
      const drift = scrollY * fold.parallax;
      const baseY = fold.baseFrac * height + Math.sin(t * 0.00012 * fold.speed + fold.phase) * 8 - drift * 0.3;

      const step = Math.max(8, Math.floor(width / 90));
      const top = [];
      for (let x = -step; x <= width + step; x += step) {
        const y = baseY + Math.sin(x * fold.freq + t * 0.00035 * fold.speed + fold.phase) * fold.amp;
        top.push([x, y]);
      }

      ctx.beginPath();
      ctx.moveTo(top[0][0], top[0][1]);
      for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
      for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1] + fold.thickness);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      const [r, g, b] = fold.color;
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},${fold.alpha})`);
      grad.addColorStop(0.65, `rgba(${r},${g},${b},${fold.alpha})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function draw(t) {
      const rect = host.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      scrollY += (targetScrollY - scrollY) * (prefersReduced ? 1 : 0.12);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      folds.forEach((fold) => drawFold(fold, t));
      ctx.globalCompositeOperation = 'source-over';
    }

    function loop(t) {
      draw(t);
      requestAnimationFrame(loop);
    }

    window.addEventListener('scroll', () => {
      targetScrollY = window.scrollY || 0;
      if (prefersReduced) draw(performance.now());
    }, { passive: true });

    window.addEventListener('resize', () => {
      resize();
      folds = makeFolds(density);
      if (prefersReduced) draw(performance.now());
    });

    resize();
    if (prefersReduced) {
      draw(0);
    } else {
      requestAnimationFrame(loop);
    }
  });
})();

// ---------- Header: hidden over the big name, revealed on scroll ----------
(function () {
  const header = document.querySelector('.site-header[data-reveal-on-scroll]');
  if (!header) return;
  const sentinel = document.querySelector('[data-header-sentinel]');

  function setVisible(visible) {
    header.classList.toggle('is-visible', visible);
    header.querySelectorAll('a').forEach((a) => {
      if (visible) a.removeAttribute('tabindex');
      else a.setAttribute('tabindex', '-1');
    });
  }

  if (sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setVisible(entry.boundingClientRect.top < 0)),
      { threshold: 0 }
    );
    io.observe(sentinel);
  } else {
    // fallback: reveal after a fixed scroll distance
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
