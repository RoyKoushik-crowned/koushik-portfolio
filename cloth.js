// ==========================================================
// Scroll-reactive silk renderer
// ==========================================================
(function () {
  const canvases = document.querySelectorAll('.cloth-canvas');
  if (!canvases.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = [
    [91, 27, 6],
    [145, 49, 9],
    [194, 77, 17],
    [229, 122, 48],
    [247, 177, 106],
    [255, 226, 196]
  ];

  canvases.forEach((canvas) => {
    const host = canvas.closest('.cloth-host') || canvas.parentElement;
    const ctx = canvas.getContext('2d', { alpha: true });
    const density = Math.max(7, Number(canvas.dataset.density || 10));

    let width = 1, height = 1, dpr = 1;
    let lastY = window.scrollY || 0;
    let velocity = 0;
    let flow = 0;
    let lastTime = performance.now();

    const ribbons = Array.from({ length: density }, (_, i) => ({
      y: (i + 0.28) / density,
      amp: 34 + Math.random() * 72,
      freq: 0.003 + Math.random() * 0.004,
      width: 42 + Math.random() * 96,
      phase: Math.random() * Math.PI * 2,
      color: palette[i % palette.length],
      alpha: 0.16 + Math.random() * 0.12,
      drift: 0.6 + Math.random() * 1.1
    }));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function curveY(ribbon, x, phase) {
      const nx = x / width;
      return (
        ribbon.y * height +
        Math.sin(x * ribbon.freq + phase) * ribbon.amp +
        Math.sin(x * ribbon.freq * 0.48 - phase * 1.42) * ribbon.amp * 0.52 +
        Math.sin(nx * Math.PI * 2.2 + phase * 0.5) * ribbon.amp * 0.18
      );
    }

    function drawRibbon(ribbon, phase) {
      const step = Math.max(8, width / 120);
      const points = [];

      for (let x = -step; x <= width + step; x += step) {
        points.push([x, curveY(ribbon, x, phase)]);
      }

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);

      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        ctx.quadraticCurveTo(
          p0[0], p0[1],
          (p0[0] + p1[0]) / 2,
          (p0[1] + p1[1]) / 2
        );
      }

      const end = points[points.length - 1];
      ctx.lineTo(end[0], end[1] + ribbon.width);

      for (let i = points.length - 1; i > 0; i--) {
        const p0 = points[i];
        const p1 = points[i - 1];
        ctx.quadraticCurveTo(
          p0[0], p0[1] + ribbon.width,
          (p0[0] + p1[0]) / 2,
          (p0[1] + p1[1]) / 2 + ribbon.width
        );
      }

      ctx.closePath();

      const [r, g, b] = ribbon.color;
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.02)`);
      grad.addColorStop(0.18, `rgba(${r},${g},${b},${ribbon.alpha})`);
      grad.addColorStop(0.50, `rgba(255,241,222,${Math.min(.32, ribbon.alpha * 1.5)})`);
      grad.addColorStop(0.76, `rgba(${r},${g},${b},${ribbon.alpha * 1.18})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0.02)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Fine highlight gives the ribbons a silk sheen.
      ctx.save();
      ctx.globalAlpha = Math.min(.32, ribbon.alpha * 1.6);
      ctx.strokeStyle = 'rgba(255,249,240,.9)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1] + ribbon.width * .17);
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        ctx.quadraticCurveTo(
          p0[0], p0[1] + ribbon.width * .17,
          (p0[0] + p1[0]) / 2,
          (p0[1] + p1[1]) / 2 + ribbon.width * .17
        );
      }
      ctx.stroke();
      ctx.restore();
    }

    function frame(now) {
      const rect = host.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > window.innerHeight + 300) {
        if (!reduced) requestAnimationFrame(frame);
        return;
      }

      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      // Scroll changes direction. Ambient motion keeps the silk visibly alive.
      velocity *= 0.91;
      const direction = velocity === 0 ? 1 : Math.sign(velocity);
      const scrollEnergy = Math.min(Math.abs(velocity) * 0.016, 3.8);
      const ambient = reduced ? 0 : 0.32;
      flow += (ambient + scrollEnergy) * direction * (dt / 16.67);

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      ribbons.forEach((ribbon, i) => {
        const phase =
          ribbon.phase +
          flow * ribbon.drift * 0.028 +
          Math.sin(now * 0.00032 + i * 0.73) * 0.18;
        drawRibbon(ribbon, phase);
      });

      ctx.globalCompositeOperation = 'source-over';
      if (!reduced) requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', () => {
      const current = window.scrollY || 0;
      velocity += current - lastY;
      lastY = current;
      if (reduced) frame(performance.now());
    }, { passive: true });

    window.addEventListener('resize', resize, { passive: true });
    resize();
    frame(performance.now());
  });
})();

// ==========================================================
// Header reveal
// ==========================================================
(function () {
  const header = document.querySelector('.site-header[data-reveal-on-scroll]');
  if (!header) return;

  const update = () => {
    const visible = (window.scrollY || 0) > 120;
    header.classList.toggle('is-visible', visible);
    header.querySelectorAll('a').forEach((a) => {
      if (visible) a.removeAttribute('tabindex');
      else a.setAttribute('tabindex', '-1');
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
