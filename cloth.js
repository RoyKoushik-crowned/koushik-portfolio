// ---------- Scroll-reactive flowing silk background ----------
(function () {
  const canvases = document.querySelectorAll('.cloth-canvas');
  if (!canvases.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PALETTE = [[104,40,10],[155,62,15],[194,91,25],[225,133,62],[247,191,139],[255,233,209]];

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const host = canvas.closest('.cloth-host') || canvas.parentElement;
    const density = Number(canvas.dataset.density || 9);

    let width = 0, height = 0, dpr = 1;
    let lastScroll = window.scrollY || 0;
    let scrollVelocity = 0, flow = 0, lastTime = performance.now();

    const bands = Array.from({ length: density }, (_, i) => ({
      base:(i + .45)/density,
      amplitude:22 + Math.random()*48,
      frequency:.004 + Math.random()*.005,
      phase:Math.random()*Math.PI*2,
      width:34 + Math.random()*90,
      speed:.00013 + Math.random()*.00018,
      color:PALETTE[i % PALETTE.length],
      alpha:.13 + Math.random()*.13,
      tilt:-.16 + Math.random()*.32
    }));

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth; height = canvas.clientHeight;
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function yAt(band,x,phase){
      const nx = x / Math.max(width,1);
      return band.base*height
        + Math.sin(x*band.frequency + phase + nx*2.4)*band.amplitude
        + Math.sin(x*band.frequency*.47 - phase*1.35)*band.amplitude*.48
        + nx*height*band.tilt;
    }

    function drawBand(band,phase){
      const step = Math.max(10,Math.round(width/100));
      const pts = [];
      for(let x=-step;x<=width+step;x+=step) pts.push([x,yAt(band,x,phase)]);

      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1], b=pts[i];
        ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);
      }
      const last=pts[pts.length-1];
      ctx.lineTo(last[0],last[1]+band.width);
      for(let i=pts.length-1;i>0;i--){
        const a=pts[i], b=pts[i-1];
        ctx.quadraticCurveTo(a[0],a[1]+band.width,(a[0]+b[0])/2,(a[1]+b[1])/2+band.width);
      }
      ctx.closePath();

      const [r,g,b] = band.color;
      const grad = ctx.createLinearGradient(0,0,width,height);
      grad.addColorStop(0,`rgba(${r},${g},${b},.02)`);
      grad.addColorStop(.30,`rgba(${r},${g},${b},${band.alpha})`);
      grad.addColorStop(.56,`rgba(255,242,224,${band.alpha*.82})`);
      grad.addColorStop(.78,`rgba(${r},${g},${b},${band.alpha*1.1})`);
      grad.addColorStop(1,`rgba(${r},${g},${b},.03)`);
      ctx.fillStyle=grad; ctx.fill();

      ctx.save(); ctx.globalAlpha=band.alpha*.55; ctx.strokeStyle='rgba(255,248,238,.85)'; ctx.lineWidth=.7;
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]+band.width*.16);
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1], b=pts[i];
        ctx.quadraticCurveTo(a[0],a[1]+band.width*.16,(a[0]+b[0])/2,(a[1]+b[1])/2+band.width*.16);
      }
      ctx.stroke(); ctx.restore();
    }

    function draw(now){
      const rect = host.getBoundingClientRect();
      if(rect.bottom < -250 || rect.top > window.innerHeight + 250) return;
      const dt = Math.min(48,now-lastTime); lastTime=now;
      scrollVelocity *= .92;

      // Direction is intentional: down scroll advances the folds, up scroll reverses them.
      const direction = Math.sign(scrollVelocity);
      const boost = Math.min(Math.abs(scrollVelocity)*.018,3.4);
      const ambient = reducedMotion ? 0 : .22;
      flow += (ambient + boost*.55)*direction*(dt/16.67);

      ctx.clearRect(0,0,width,height);
      ctx.globalCompositeOperation='screen';
      bands.forEach((band,i)=>{
        const phase = band.phase + flow*band.speed*520 + Math.sin(now*.00018+i)*.22;
        drawBand(band,phase);
      });
      ctx.globalCompositeOperation='source-over';
    }

    function loop(now){ draw(now); if(!reducedMotion) requestAnimationFrame(loop); }

    window.addEventListener('scroll',()=>{
      const next = window.scrollY || 0;
      scrollVelocity += next-lastScroll;
      lastScroll=next;
      if(reducedMotion) draw(performance.now());
    },{passive:true});

    window.addEventListener('resize',()=>{resize(); if(reducedMotion) draw(performance.now());});
    resize();
    if(reducedMotion) draw(performance.now()); else requestAnimationFrame(loop);
  });
})();

// ---------- Header reveal ----------
(function () {
  const header = document.querySelector('.site-header[data-reveal-on-scroll]');
  if (!header) return;
  const sentinel = document.querySelector('[data-header-sentinel]');
  const setVisible = (visible) => {
    header.classList.toggle('is-visible', visible);
    header.querySelectorAll('a').forEach((a) => visible ? a.removeAttribute('tabindex') : a.setAttribute('tabindex','-1'));
  };
  if (sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setVisible(entry.boundingClientRect.top < 0)),
      { threshold: 0 }
    );
    io.observe(sentinel);
  } else {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
