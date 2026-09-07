// ==========================================================
// V4 SILK SYSTEM
// Global silk everywhere + richer local hero silk.
// ==========================================================
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createSilk(canvas, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha:true });
    const fixed = !!opts.fixed;
    const palette = opts.palette || [
      [132,42,7],[174,58,10],[209,91,22],[234,130,56],[247,177,108],[255,219,182]
    ];
    const count = opts.count || 9;
    const ribbons = Array.from({length:count}, (_,i)=>({
      y:(i+.35)/count,
      amp:30+Math.random()*72,
      width:58+Math.random()*110,
      freq:.0015+Math.random()*.003,
      speed:.45+Math.random()*.9,
      alpha:.12+Math.random()*.13,
      color:palette[i%palette.length]
    }));

    let w=1,h=1,dpr=1,last=performance.now(),flow=Math.random()*50;
    let lastY=scrollY,velocity=0;

    function resize(){
      const rect = fixed ? {width:innerWidth,height:innerHeight} : canvas.getBoundingClientRect();
      w=Math.max(1,rect.width); h=Math.max(1,rect.height);
      dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
      canvas.style.width=w+'px'; canvas.style.height=h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function wave(r,x,phase){
      return r.y*h
        + Math.sin(x*r.freq+phase)*r.amp
        + Math.sin(x*r.freq*.46-phase*1.22)*r.amp*.48
        + Math.sin(x/w*Math.PI*2.2+phase*.33)*r.amp*.17;
    }
    function draw(r,phase){
      const step=Math.max(13,w/105);
      const pts=[];
      for(let x=-step;x<=w+step;x+=step) pts.push([x,wave(r,x,phase)]);
      ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);
      }
      const end=pts.at(-1);
      ctx.lineTo(end[0],end[1]+r.width);
      for(let i=pts.length-1;i>0;i--){
        const a=pts[i],b=pts[i-1];
        ctx.quadraticCurveTo(a[0],a[1]+r.width,(a[0]+b[0])/2,(a[1]+b[1])/2+r.width);
      }
      ctx.closePath();

      const [R,G,B]=r.color;
      const g=ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,`rgba(${R},${G},${B},0)`);
      g.addColorStop(.18,`rgba(${R},${G},${B},${r.alpha})`);
      g.addColorStop(.48,`rgba(255,239,220,${Math.min(.34,r.alpha*1.65)})`);
      g.addColorStop(.77,`rgba(${R},${G},${B},${r.alpha*1.15})`);
      g.addColorStop(1,`rgba(${R},${G},${B},0)`);
      ctx.fillStyle=g;
      ctx.fill();

      ctx.save();
      ctx.globalAlpha=Math.min(.36,r.alpha*1.7);
      ctx.strokeStyle='rgba(255,248,239,.95)';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]+r.width*.16);
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        ctx.quadraticCurveTo(a[0],a[1]+r.width*.16,(a[0]+b[0])/2,(a[1]+b[1])/2+r.width*.16);
      }
      ctx.stroke();
      ctx.restore();
    }
    function frame(now){
      const dt=Math.min(34,now-last); last=now;
      velocity*=.90;
      const dir=Math.abs(velocity)<.02 ? 1 : Math.sign(velocity);
      const energy=Math.min(Math.abs(velocity)*.012,3.2);
      flow+=(reduced?0:.24+energy)*dir*(dt/16.67);

      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation=opts.blend || 'source-over';
      ribbons.forEach((r,i)=>draw(r,flow*r.speed*.045+i*.83));
      ctx.globalCompositeOperation='source-over';
      if(!reduced) requestAnimationFrame(frame);
    }
    addEventListener('scroll',()=>{
      const y=scrollY;
      velocity += y-lastY;
      lastY=y;
    },{passive:true});
    addEventListener('resize',resize,{passive:true});
    resize(); frame(performance.now());
  }

  // Global silk.
  createSilk(document.getElementById('site-silk-canvas'), {
    fixed:true, count:10, blend:'source-over'
  });

  // Bring back the more dramatic moving silk specifically inside the hero.
  document.querySelectorAll('.hero--cloth .cloth-canvas').forEach((c)=>{
    createSilk(c, {
      count:12,
      blend:'screen',
      palette:[
        [92,25,5],[145,43,7],[192,70,12],[232,112,39],[255,181,110],[255,222,184]
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

    // Title remains essentially intact until the user has moved roughly
    // five conventional wheel-scroll lengths through the section.
    const holdDistance=Math.max(1500, innerHeight*1.75);
    const dissolveDistance=Math.max(760, innerHeight*.95);
    const travelled=Math.max(0,-r.top);

    const hold=Math.min(1,travelled/holdDistance);
    const dissolve=Math.max(0,Math.min(1,(travelled-holdDistance)/dissolveDistance));

    // Keep title at full strength during hold; disintegrate after.
    p={hold,dissolve,travelled};
  }

  function render(now){
    const dt=Math.min(40,now-last); last=now;
    const dissolve=reduced?1:p.dissolve;

    ctx.clearRect(0,0,w,h);

    // Matrix starts only when the title begins disintegrating.
    if(dissolve>.01 && dissolve<.98){
      const intensity=Math.sin(Math.PI*Math.min(1,dissolve))*0.96;
      ctx.save();
      ctx.globalAlpha=intensity;
      columns.forEach((col,i)=>{
        const step=col.size*1.12;
        const head=(col.offset+now*.042*col.speed)% (h+step*18);
        const tail=10+Math.floor(dissolve*18);
        for(let n=0;n<tail;n++){
          const yy=head-n*step;
          if(yy<0||yy>h) continue;
          const fade=(1-n/tail);
          ctx.fillStyle=n===0
            ? `rgba(220,255,226,${fade*.96})`
            : `rgba(18,170,78,${fade*.86})`;
          ctx.font=`600 ${col.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          const digit=chars[(Math.floor(now*.012+i*5+n*7+col.phase))%10];
          ctx.fillText(digit,col.x,yy);
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

    // Reveal timeline only after matrix has substantially completed.
    const reveal=Math.max(0,Math.min(1,(d-.68)/.32));
    content.style.opacity=String(.45+reveal*.55);
    content.style.transform=`translateY(${(1-reveal)*28}px)`;

    section.classList.toggle('is-matrixing',d>.01&&d<.98);
    section.classList.toggle('is-timeline',d>=.94);

    if(!reduced) requestAnimationFrame(render);
  }

  addEventListener('scroll',updateProgress,{passive:true});
  addEventListener('resize',()=>{resize();updateProgress();},{passive:true});
  resize(); updateProgress(); render(performance.now());
})();

// Header reveal.
(() => {
  const header=document.querySelector('.site-header[data-reveal-on-scroll]');
  if(!header) return;
  const update=()=>{
    const visible=scrollY>120;
    header.classList.toggle('is-visible',visible);
    header.querySelectorAll('a').forEach(a=>{
      if(visible)a.removeAttribute('tabindex');
      else a.setAttribute('tabindex','-1');
    });
  };
  addEventListener('scroll',update,{passive:true});
  update();
})();
