// ==========================================================
// V5 CLOTH SYSTEM
// Real Verlet-integration cloth: gravity, wind, structural +
// shear constraints, and mouse-grab dragging on the hero flag.
// The global background cloth uses the same engine but stays
// ambient-only (ambient wind, no pointer interaction) since it
// sits behind page content at z-index:-2.
// ==========================================================
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  class ClothSim {
    constructor(canvas, opts = {}) {
      if (!canvas) return null;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.fixed = !!opts.fixed;
      this.interactive = opts.interactive !== false && !this.fixed;
      this.blend = opts.blend || 'source-over';
      this.palette = opts.palette || [
        [132, 42, 7], [174, 58, 10], [209, 91, 22],
        [234, 130, 56], [247, 177, 108], [255, 219, 182]
      ];
      this.baseAlpha = opts.alpha ?? 0.85;
      this.gravity = opts.gravity ?? 620;
      this.windBase = opts.windBase ?? 260;
      this.pointSpacing = opts.pointSpacing ?? 30;
      const density = parseFloat(canvas.dataset.density) || opts.density || 10;
      this.pointSpacing = this.pointSpacing * (10 / density);

      this.pins = opts.pins || 'top'; // 'top' | 'left' | 'top-left'
      this.mouse = { x: -9999, y: -9999, down: false, grabbed: null, vx: 0, vy: 0, px: -9999, py: -9999 };
      this.w = 1; this.h = 1; this.dpr = 1;
      this.time = 0;
      this.gust = 0;
      this.lastScrollY = scrollY;

      // tearing (easter egg: pull hard enough on the hero flag to snap threads)
      this.tearable = !!opts.tearable;
      this.tearThreshold = opts.tearThreshold ?? 2.1;
      this.totalStructural = 0;
      this.tornCount = 0;

      // temporary state for the Konami / burst easter eggs
      this._gravitySign = 1;
      this._konamiTimer = null;
      this._paletteSwap = null;

      this.resize = this.resize.bind(this);
      this.frame = this.frame.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onKonami = this.onKonami.bind(this);
      this.onBurst = this.onBurst.bind(this);

      addEventListener('resize', this.resize, { passive: true });
      addEventListener('scroll', this.onScroll, { passive: true });
      addEventListener('konami-activated', this.onKonami);
      addEventListener('silk-burst', this.onBurst);

      if (this.interactive) this.bindPointer();

      this.resize();
      if (reduced) {
        // Settle instantly into a resting pose, then draw once.
        for (let i = 0; i < 60; i++) this.step(16.6, true);
        this.render();
      } else {
        requestAnimationFrame(this.frame);
      }
    }

    onScroll() {
      const y = scrollY;
      this.gust += (y - this.lastScrollY) * 0.9;
      this.lastScrollY = y;
    }

    bindPointer() {
      const rectOf = () => this.canvas.getBoundingClientRect();
      const toLocal = (e) => {
        const r = rectOf();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      this.canvas.style.touchAction = 'none';

      this.canvas.addEventListener('pointerdown', (e) => {
        const p = toLocal(e);
        const grabbed = this.nearestPoint(p.x, p.y, 46);
        if (grabbed && !grabbed.pinned) {
          grabbed.grabbed = true;
          this.mouse.grabbed = grabbed;
          this.canvas.setPointerCapture(e.pointerId);
        }
        this.mouse.down = true;
        this.mouse.x = this.mouse.px = p.x;
        this.mouse.y = this.mouse.py = p.y;
      });

      this.canvas.addEventListener('pointermove', (e) => {
        const p = toLocal(e);
        this.mouse.vx = p.x - this.mouse.x;
        this.mouse.vy = p.y - this.mouse.y;
        this.mouse.x = p.x;
        this.mouse.y = p.y;
        if (this.mouse.grabbed) {
          const g = this.mouse.grabbed;
          g.x = p.x; g.y = p.y;
        }
      });

      const release = () => {
        if (this.mouse.grabbed) this.mouse.grabbed.grabbed = false;
        this.mouse.grabbed = null;
        this.mouse.down = false;
        this.mouse.x = this.mouse.y = -9999;
      };
      this.canvas.addEventListener('pointerup', release);
      this.canvas.addEventListener('pointercancel', release);
      this.canvas.addEventListener('pointerleave', () => {
        if (!this.mouse.down) { this.mouse.x = this.mouse.y = -9999; }
      });
    }

    nearestPoint(x, y, radius) {
      let best = null, bestD = radius * radius;
      for (const p of this.points) {
        const dx = p.x - x, dy = p.y - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = p; }
      }
      return best;
    }

    resize() {
      const rect = this.fixed
        ? { width: innerWidth, height: innerHeight }
        : this.canvas.getBoundingClientRect();
      this.w = Math.max(1, rect.width);
      this.h = Math.max(1, rect.height);
      this.dpr = Math.min(devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.buildGrid();
    }

    buildGrid() {
      const spacing = this.pointSpacing;
      this.cols = Math.max(4, Math.round(this.w / spacing) + 2);
      this.rows = Math.max(4, Math.round(this.h / spacing) + 2);
      const stepX = this.w / (this.cols - 1);
      const stepY = this.h / (this.rows - 1);
      this.stepX = stepX; this.stepY = stepY;

      this.points = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const x = c * stepX;
          const y = r * stepY;
          let pinned = false;
          if (this.pins === 'top' && r === 0) pinned = true;
          if (this.pins === 'left' && c === 0) pinned = true;
          if (this.pins === 'top-left' && (r === 0 || c === 0)) pinned = true;
          this.points.push({ x, y, px: x, py: y, pinned, grabbed: false, r, c });
        }
      }

      const at = (r, c) => this.points[r * this.cols + c];
      this.constraints = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const p = at(r, c);
          if (c < this.cols - 1) this.constraints.push({ a: p, b: at(r, c + 1), len: stepX });
          if (r < this.rows - 1) this.constraints.push({ a: p, b: at(r + 1, c), len: stepY });
          // shear (diagonals) keeps the mesh from collapsing into a blob
          if (r < this.rows - 1 && c < this.cols - 1) {
            const diag = Math.hypot(stepX, stepY);
            this.constraints.push({ a: p, b: at(r + 1, c + 1), len: diag, shear: true });
            this.constraints.push({ a: at(r, c + 1), b: at(r + 1, c), len: diag, shear: true });
          }
        }
      }
      this.totalStructural = this.constraints.filter(c => !c.shear).length;
      this.tornCount = 0;
    }

    step(dt, settle = false) {
      const dts = Math.min(dt, 34) / 1000;
      this.time += dts;
      if (!settle) this.gust *= 0.92;

      const windPhase = this.time * 0.9;
      const gustForce = this.fixed ? this.gust * 0.6 : this.gust * 1.4;

      for (const p of this.points) {
        if (p.pinned || p.grabbed) { p.px = p.x; p.py = p.y; continue; }
        const vx = (p.x - p.px) * 0.985;
        const vy = (p.y - p.py) * 0.985;

        // ambient wind: a travelling sine wave across the cloth, plus a
        // scroll-triggered gust so it reacts like real fabric catching air
        const wind = this.windBase * (0.35 + 0.65 * Math.sin(windPhase + p.c * 0.35 + p.r * 0.12))
          + gustForce;

        // gentle pointer-proximity push (works even without grabbing)
        let pushX = 0, pushY = 0;
        if (this.interactive && this.mouse.x > -1000) {
          const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
          const dist = Math.hypot(dx, dy);
          const radius = 120;
          if (dist < radius) {
            const force = (1 - dist / radius) * 900;
            pushX = (dx / (dist || 1)) * force * dts;
            pushY = (dy / (dist || 1)) * force * dts;
          }
        }

        const ax = wind + pushX;
        const ay = this.gravity * this._gravitySign + pushY;

        const nx = p.x + vx + ax * dts * dts;
        const ny = p.y + vy + ay * dts * dts;
        p.px = p.x; p.py = p.y;
        p.x = nx; p.y = ny;
      }

      const iterations = 3;
      let snappedThisStep = false;
      for (let i = 0; i < iterations; i++) {
        for (let ci = this.constraints.length - 1; ci >= 0; ci--) {
          const c = this.constraints[ci];
          const dx = c.b.x - c.a.x, dy = c.b.y - c.a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const ratio = dist / c.len;

          if (this.tearable && !c.shear && ratio > this.tearThreshold) {
            this.constraints.splice(ci, 1);
            this.tornCount++;
            snappedThisStep = true;
            continue;
          }

          const diff = (dist - c.len) / dist;
          const stiff = c.shear ? 0.28 : 0.55;
          const ox = dx * 0.5 * diff * stiff;
          const oy = dy * 0.5 * diff * stiff;
          if (!c.a.pinned && !c.a.grabbed) { c.a.x += ox; c.a.y += oy; }
          if (!c.b.pinned && !c.b.grabbed) { c.b.x -= ox; c.b.y -= oy; }
        }
        for (const p of this.points) {
          if (p.pinned || p.grabbed) continue;
          if (p.y > this.h + 400) { p.y = this.h + 400; p.py = p.y; }
        }
      }
      if (snappedThisStep && this.totalStructural > 0) {
        const ratio = this.tornCount / this.totalStructural;
        this.canvas.dispatchEvent(new CustomEvent('cloth-tear', { detail: { ratio } }));
      }
    }

    onKonami() {
      // flip gravity for a bit — the flag floats instead of hanging
      clearTimeout(this._konamiTimer);
      this._gravitySign = -1;
      const original = this.palette;
      if (!this._paletteSwap) {
        this.palette = [[255,64,64],[255,159,28],[255,222,0],[64,200,120],[64,140,255],[168,85,247]];
        this._paletteSwap = original;
      }
      this._konamiTimer = setTimeout(() => {
        this._gravitySign = 1;
        if (this._paletteSwap) { this.palette = this._paletteSwap; this._paletteSwap = null; }
      }, 4000);
    }

    onBurst() {
      // radial shockwave from the canvas center, pushed into each point's
      // previous position so Verlet integration reads it as outward velocity
      const cx = this.w / 2, cy = this.h / 2;
      for (const p of this.points) {
        if (p.pinned || p.grabbed) continue;
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const falloff = Math.max(0, 1 - dist / (Math.max(this.w, this.h) * 0.8));
        const force = 26 * falloff;
        p.px -= (dx / dist) * force;
        p.py -= (dy / dist) * force;
      }
    }

    triColor(p1, p2, p3, alphaMul) {
      // fake lighting from how "stretched" / tilted the triangle is —
      // brighter facets read as catching light, like real fabric folds
      const ax = p2.x - p1.x, ay = p2.y - p1.y;
      const bx = p3.x - p1.x, by = p3.y - p1.y;
      const cross = ax * by - ay * bx;
      const area = Math.abs(cross);
      const norm = Math.max(0, Math.min(1, area / (this.stepX * this.stepY * 1.4)));
      const light = 0.55 + norm * 0.6;
      const idx = Math.floor(((p1.r + p1.c) * 0.6) % this.palette.length);
      const [R, G, B] = this.palette[idx];
      const r = Math.min(255, R * light + 255 * (1 - light) * 0.25);
      const g = Math.min(255, G * light + 255 * (1 - light) * 0.25);
      const b = Math.min(255, B * light + 255 * (1 - light) * 0.25);
      return `rgba(${r | 0},${g | 0},${b | 0},${this.baseAlpha * alphaMul})`;
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.globalCompositeOperation = this.blend;

      const at = (r, c) => this.points[r * this.cols + c];
      const alphaMul = this.fixed ? 0.55 : 1;

      for (let r = 0; r < this.rows - 1; r++) {
        for (let c = 0; c < this.cols - 1; c++) {
          const a = at(r, c), b = at(r, c + 1), d = at(r + 1, c), e = at(r + 1, c + 1);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y);
          ctx.closePath();
          ctx.fillStyle = this.triColor(a, b, d, alphaMul);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(b.x, b.y); ctx.lineTo(e.x, e.y); ctx.lineTo(d.x, d.y);
          ctx.closePath();
          ctx.fillStyle = this.triColor(b, e, d, alphaMul);
          ctx.fill();
        }
      }

      // subtle sheen along a couple of bands, like light catching folds
      ctx.save();
      ctx.globalAlpha = this.fixed ? 0.12 : 0.22;
      ctx.strokeStyle = 'rgba(255,248,239,.9)';
      ctx.lineWidth = 1;
      for (let r = 1; r < this.rows - 1; r += Math.max(2, Math.round(this.rows / 5))) {
        ctx.beginPath();
        for (let c = 0; c < this.cols; c++) {
          const p = at(r, c);
          if (c === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();

      ctx.globalCompositeOperation = 'source-over';
    }

    frame(now) {
      this.step(this._last ? now - this._last : 16.6);
      this._last = now;
      this.render();
      requestAnimationFrame(this.frame);
    }
  }

  // Global ambient background cloth — behind all page content (z-index:-2),
  // so it stays wind-driven only; there's nothing to grab.
  new ClothSim(document.getElementById('site-silk-canvas'), {
    fixed: true,
    interactive: false,
    pins: 'top',
    blend: 'source-over',
    alpha: 0.5,
    gravity: 420,
    windBase: 200,
    pointSpacing: 70
  });

  // Hero flag — pinned along the left edge like a flag on a pole, hangs
  // and ripples under gravity + wind, and can be grabbed and dragged.
  document.querySelectorAll('.hero--cloth .cloth-canvas').forEach((c) => {
    new ClothSim(c, {
      interactive: true,
      pins: 'left',
      blend: 'screen',
      alpha: 0.95,
      gravity: 560,
      windBase: 320,
      tearable: true,
      tearThreshold: 2.1,
      palette: [
        [92, 25, 5], [145, 43, 7], [192, 70, 12],
        [232, 112, 39], [255, 181, 110], [255, 222, 184]
      ]
    });
  });
})();

// ==========================================================
// EXPERIENCE — 5-scroll-length title hold, then disintegrate,
// then return to silk once actual timeline starts.
// ==========================================================
(() => {
  const section=document.getElementById('experience');
  const stage=section?.querySelector('.experience-reveal');
  const title=section?.querySelector('.experience-display-title');
  const content=section?.querySelector('.experience-content');
  const canvas=document.getElementById('experience-matrix-canvas');
  if(!section||!stage||!title||!content||!canvas) return;

  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx=canvas.getContext('2d',{alpha:true});
  const chars='0123456789';
  let w=1,h=1,dpr=1,columns=[],p=0,last=performance.now();

  function resize(){
    const r=stage.getBoundingClientRect();
    w=Math.max(1,r.width); h=Math.max(1,r.height);
    dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const size=Math.max(14,Math.min(22,w/82));
    const n=Math.ceil(w/(size*1.18));
    columns=Array.from({length:n},(_,i)=>({
      x:i*size*1.18,
      offset:Math.random()*h,
      speed:.55+Math.random()*1.6,
      size,
      phase:Math.random()*100
    }));
  }

  function updateProgress(){
    const r=section.getBoundingClientRect();

    // Keep the Experience title for a short, deliberate hold.
    // V6 made this too long on high-resolution/trackpad scrolling.
    // Matrix dissolve timing remains unchanged.
    const holdDistance=Math.max(500, innerHeight*.62);
    const dissolveDistance=Math.max(760, innerHeight*.95);

    // The sequence timing is unchanged. The same distance is also used as
    // physical space before the timeline so the sticky stage can never sit
    // on top of timeline content.
    section.style.setProperty(
      '--experience-sequence-distance',
      `${Math.ceil(holdDistance + dissolveDistance)}px`
    );

    const travelled=Math.max(0,-r.top);
    const hold=Math.min(1,travelled/holdDistance);
    const dissolve=Math.max(0,Math.min(1,(travelled-holdDistance)/dissolveDistance));

    // Keep title at full strength during hold; disintegrate after.
    p={hold,dissolve,travelled,holdDistance,dissolveDistance};
  }

  function render(now){
    const dt=Math.min(40,now-last); last=now;
    const dissolve=reduced?1:p.dissolve;

    ctx.clearRect(0,0,w,h);

    // Matrix begins when the title begins disintegrating and is deliberately
    // high-contrast so it cannot disappear into the warm silk background.
    if(dissolve>.01 && dissolve<.995){
      const intensity=Math.min(1, .34 + Math.sin(Math.PI*Math.min(1,dissolve))*.82);
      ctx.save();
      ctx.globalAlpha=intensity;
      columns.forEach((col,i)=>{
        const step=col.size*1.12;
        const head=(col.offset+now*.060*col.speed)% (h+step*22);
        const tail=14+Math.floor(dissolve*24);

        for(let n=0;n<tail;n++){
          const yy=head-n*step;
          if(yy<0||yy>h) continue;
          const fade=Math.pow(1-n/tail, 1.35);

          // Bright head + saturated green trail.
          ctx.fillStyle=n===0
            ? `rgba(226,255,231,${fade})`
            : `rgba(0,188,84,${Math.max(.18,fade*.88)})`;

          ctx.font=`700 ${col.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(
            chars[(Math.floor(now*.016+i*7+n*11+col.phase))%10],
            col.x,
            yy
          );
        }
      });
      ctx.restore();
    }

    // Experience stays visible during the long hold, then breaks apart.
    const d=dissolve;
    title.style.opacity=String(Math.max(0,1-d*1.08));
    title.style.transform=`translateY(${d*-58}px) scale(${1-d*.12})`;
    title.style.letterSpacing=`${-.08+d*.20}em`;
    title.style.filter=`blur(${d*3}px)`;

    // The timeline is structurally placed after the complete sequence.
    // Use its actual viewport position to decide when the sticky stage ends.
    const contentRect=content.getBoundingClientRect();
    const timelineReached=contentRect.top <= innerHeight*.72;

    content.style.opacity='1';
    content.style.transform='none';

    section.classList.toggle('is-matrixing',d>.01&&d<.995);

    // Do NOT hide the Experience stage merely because the dissolve percentage
    // crossed a threshold. Hide it only when the real timeline arrives.
    section.classList.toggle('is-timeline',timelineReached);

    if(!reduced) requestAnimationFrame(render);
  }

  addEventListener('scroll',updateProgress,{passive:true});
  addEventListener('resize',()=>{resize();updateProgress();},{passive:true});
  resize(); updateProgress(); render(performance.now());
})();

// Header reveal — strict visibility contract:
// hidden on the hero and throughout the complete Experience sequence/timeline;
// visible immediately once the page moves into the section AFTER Experience.
(() => {
  const header=document.querySelector('.site-header[data-reveal-on-scroll]');
  const projects=document.getElementById('projects');
  if(!header || !projects) return;

  const setInteractive=(visible)=>{
    header.querySelectorAll('a,button').forEach(el=>{
      if(visible){
        if(el.dataset.prevTabindex !== undefined){
          if(el.dataset.prevTabindex === '') el.removeAttribute('tabindex');
          else el.setAttribute('tabindex',el.dataset.prevTabindex);
          delete el.dataset.prevTabindex;
        }
      }else{
        if(el.dataset.prevTabindex === undefined){
          el.dataset.prevTabindex=el.getAttribute('tabindex') || '';
        }
        el.setAttribute('tabindex','-1');
      }
    });
  };

  const update=()=>{
    const projectsRect=projects.getBoundingClientRect();

    // The header appears when the Projects section begins entering the viewport.
    // This guarantees it is absent on the hero and during the entire
    // Experience animation/timeline, then returns immediately afterwards.
    const visible=projectsRect.top < innerHeight*.92;

    header.classList.toggle('is-visible',visible);
    setInteractive(visible);
  };

  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update,{passive:true});
  update();
})();
