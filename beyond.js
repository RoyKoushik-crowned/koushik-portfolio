(() => {
  const instagramProfile = 'https://www.instagram.com/roysgallery.jpg/';
  const grid = document.getElementById('photo-grid');
  const note = document.getElementById('instagram-note');

  function renderInstagram(posts) {
    if (!grid || !Array.isArray(posts) || !posts.length) return;
    grid.innerHTML = posts.slice(0, 6).map((post, i) => {
      const media = post.media_url || post.thumbnail_url;
      const caption = (post.caption || `Instagram photo ${i + 1}`).replace(/"/g, '&quot;');
      return `<a class="photo-tile instagram-tile" href="${post.permalink || instagramProfile}" target="_blank" rel="noopener" aria-label="Open Instagram post ${i + 1}">
        ${media ? `<img src="${media}" alt="${caption}">` : `<span class="instagram-fallback">Open on Instagram ↗</span>`}
        <span class="instagram-overlay">Open ↗</span>
      </a>`;
    }).join('');
    if (note) note.textContent = 'Latest posts from @roysgallery.jpg — click any frame to open it on Instagram.';
  }

  // Vercel serverless endpoint. It uses env vars, so the Instagram token never reaches the browser.
  fetch('/api/instagram')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => renderInstagram(data.posts))
    .catch(() => {
      if (grid) {
        [...grid.children].forEach((el, i) => {
          el.textContent = '';
          el.className = 'instagram-placeholder';
          el.href = instagramProfile;
          el.target = '_blank';
          el.rel = 'noopener';
          el.innerHTML = `<span>@roysgallery.jpg</span><small>Latest frame ${String(i + 1).padStart(2, '0')} ↗</small>`;
        });
      }
      if (note) note.textContent = 'Instagram feed will populate automatically once the secure Instagram API variables are added in Vercel.';
    });

  // Fill missing YouTube titles using YouTube's oEmbed metadata when available.
  document.querySelectorAll('.music-row--link').forEach((row) => {
    const id = row.dataset.id;
    const titleEl = row.querySelector('.music-track');
    const artistEl = row.querySelector('.music-artist');
    if (!id || !titleEl || !artistEl) return;
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(meta => {
        if (meta.title) titleEl.textContent = meta.title;
        if (meta.author_name) artistEl.textContent = meta.author_name;
      }).catch(() => {});
  });

  // Lightbox for Instagram images, while preserving the outbound post destination.
  const lightbox = document.getElementById('photo-lightbox');
  const body = document.getElementById('photo-lightbox-body');
  const closeBtn = document.getElementById('photo-lightbox-close');
  document.addEventListener('click', (e) => {
    const tile = e.target.closest('.instagram-tile');
    if (!tile || !lightbox) return;
    const img = tile.querySelector('img');
    if (!img) return;
    e.preventDefault();
    body.innerHTML = `<img src="${img.src}" alt="${img.alt}"><a class="lightbox-outbound" href="${tile.href}" target="_blank" rel="noopener">Open on Instagram ↗</a>`;
    lightbox.hidden = false;
    closeBtn?.focus();
  });
  const close = () => { if (lightbox) { lightbox.hidden = true; body.innerHTML = ''; } };
  closeBtn?.addEventListener('click', close);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Hyperbike easter egg: synthesized engine sequence (not a recording of a specific motorcycle).
  const trigger = document.getElementById('hyperbike-trigger');
  const stage = document.getElementById('hyperbike-stage');
  const stop = document.getElementById('engine-stop');
  const gear = document.getElementById('gear-value');
  const rpm = document.querySelector('.tach-rpm');
  const status = document.getElementById('engine-status');
  let ctx, master, noise, running = false, timers = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function makeNoise(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.55));
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 180;
    const gain = ctx.createGain(); gain.gain.value = 0.045;
    src.connect(filter).connect(gain); gain.connect(master); src.start();
    return {src, gain};
  }

  function rev(targetHz, targetRpm, duration, gearText, message) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const voices = [0, 1, 2].map((i) => {
      const osc = ctx.createOscillator(); osc.type = i === 0 ? 'sawtooth' : 'square';
      const gain = ctx.createGain(); gain.gain.value = i === 0 ? 0.08 : 0.025;
      osc.frequency.setValueAtTime(i === 0 ? 46 : 92 + i * 35, now);
      osc.frequency.exponentialRampToValueAtTime(targetHz * (i === 0 ? 1 : (i + 1) * 0.63), now + duration);
      osc.connect(gain).connect(master); osc.start(now); osc.stop(now + duration + 0.05);
      return osc;
    });
    if (rpm) rpm.textContent = `${targetRpm.toLocaleString()} RPM`;
    if (gear) gear.textContent = gearText;
    if (status) status.textContent = message;
    stage?.style.setProperty('--rpm', Math.min(1, targetRpm / 14500));
  }

  function startSequence() {
    if (running) return;
    running = true;
    clearTimers();
    trigger?.setAttribute('aria-expanded', 'true');
    trigger?.classList.add('is-active');
    stage.hidden = false;
    stage.classList.add('is-running');
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.42; master.connect(ctx.destination);
    noise = makeNoise(ctx);

    status.textContent = 'IGNITION';
    gear.textContent = 'N'; rpm.textContent = '0 RPM';
    later(() => rev(92, 2800, 0.55, 'N', 'ENGINE START'), 150);
    later(() => rev(120, 4200, 0.7, '1', 'LAUNCH'), 900);
    later(() => rev(180, 7600, 0.9, '1', 'FULL THROTTLE'), 1700);
    later(() => rev(150, 6400, 0.2, '2', 'UPSHIFT'), 2650);
    later(() => rev(230, 11200, 1.0, '2', 'ACCELERATING'), 2920);
    later(() => rev(190, 8200, 0.18, '3', 'UPSHIFT'), 3920);
    later(() => rev(280, 13800, 0.8, '3', 'REDLINE'), 4150);
    later(() => rev(150, 7000, 0.3, '4', 'UPSHIFT'), 5000);
    later(() => rev(95, 3900, 0.45, '3', 'DOWNSHIFT'), 5550);
    later(() => rev(72, 2500, 0.8, 'N', 'COOLING DOWN'), 6200);
    later(stopSequence, 7600);
  }

  function stopSequence() {
    clearTimers();
    if (!running) return;
    running = false;
    if (noise?.src) { try { noise.src.stop(); } catch (_) {} }
    if (ctx) {
      master?.gain?.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      later(() => ctx?.close(), 320);
    }
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.classList.remove('is-active');
    stage?.classList.remove('is-running');
    if (status) status.textContent = 'ENGINE OFF';
    if (gear) gear.textContent = 'N';
    if (rpm) rpm.textContent = '0 RPM';
    stage?.style.setProperty('--rpm', 0);
    later(() => { if (stage) stage.hidden = true; }, 450);
  }

  trigger?.addEventListener('click', startSequence);
  stop?.addEventListener('click', stopSequence);
})();