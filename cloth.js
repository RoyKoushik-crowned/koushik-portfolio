// ==========================================================
// V3 GLOBAL SILK FLOW
// One fixed canvas = less work per frame and smoother scrolling.
// ==========================================================
(() => {
  const canvas = document.getElementById('site-silk-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ribbons = [
    { y:.04, amp:34, width:110, freq:.0020, speed:.50, alpha:.18, c:[148,53,11] },
    { y:.17, amp:56, width:135, freq:.0017, speed:.72, alpha:.14, c:[198,82,19] },
    { y:.34, amp:42, width:160, freq:.0023, speed:.61, alpha:.13, c:[230,123,51] },
    { y:.53, amp:62, width:145, freq:.0015, speed:.86, alpha:.12, c:[243,166,101] },
    { y:.72, amp:46, width:170, freq:.0020, speed:.68, alpha:.11, c:[198,91,32] },
    { y:.89, amp:38, width:120, freq:.0026, speed:.55, alpha:.12, c:[250,199,154] }
  ];

  let w=1,h=1,dpr=1,lastY=scrollY,velocity=0,flow=0,last=performance.now();
  function resize(){
    // Cap DPR to keep the animation smooth on high-resolution screens.
    dpr = Math.min(devicePixelRatio || 1, 1.25);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    canvas.style.width = w+'px';
    canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function y(r,x,phase){
    return r.y*h +
      Math.sin(x*r.freq + phase)*r.amp +
      Math.sin(x*r.freq*.43 - phase*1.28)*r.amp*.42 +
      Math.sin((x/w)*Math.PI*2 + phase*.35)*r.amp*.16;
  }
  function ribbon(r,phase){
    const step = Math.max(18, w/72);
    const pts=[];
    for(let x=-step;x<=w+step;x+=step) pts.push([x,y(r,x,phase)]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i];
      ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);
    }
    const e=pts[pts.length-1];
    ctx.lineTo(e[0],e[1]+r.width);
    for(let i=pts.length-1;i>0;i--){
      const a=pts[i],b=pts[i-1];
      ctx.quadraticCurveTo(a[0],a[1]+r.width,(a[0]+b[0])/2,(a[1]+b[1])/2+r.width);
    }
    ctx.closePath();
    const [R,G,B]=r.c;
    const g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,`rgba(${R},${G},${B},0)`);
    g.addColorStop(.23,`rgba(${R},${G},${B},${r.alpha})`);
    g.addColorStop(.52,`rgba(255,244,230,${r.alpha*.8})`);
    g.addColorStop(.78,`rgba(${R},${G},${B},${r.alpha})`);
    g.addColorStop(1,`rgba(${R},${G},${B},0)`);
    ctx.fillStyle=g; ctx.fill();
    ctx.save();
    ctx.globalAlpha=r.alpha*.72;
    ctx.strokeStyle='rgba(255,248,239,.9)';
    ctx.lineWidth=.8;
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
    const energy=Math.min(Math.abs(velocity)*.012,2.7);
    flow+=(reduced?0:.22+energy)*dir*(dt/16.67);
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation='screen';
    ribbons.forEach((r,i)=>ribbon(r, flow*r.speed*.055+i*.9));
    ctx.globalCompositeOperation='source-over';
    if(!reduced) requestAnimationFrame(frame);
  }
  addEventListener('scroll',()=>{
    const y=scrollY;
    velocity += y-lastY;
    lastY=y;
    if(reduced) frame(performance.now());
  },{passive:true});
  addEventListener('resize',resize,{passive:true});
  resize(); frame(performance.now());
})();

// ==========================================================
// EXPERIENCE MATRIX REVEAL
// Scroll through the stage:
// Experience -> breaks apart -> green numeric rain -> timeline.
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
  let w=1,h=1,dpr=1,columns=[],matrixProgress=0,last=performance.now();

  function resize(){
    const r=stage.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,1.5);
    w=Math.max(1,r.width); h=Math.max(1,r.height);
    canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const size=Math.max(13,Math.min(20,w/70));
    const count=Math.ceil(w/(size*1.1));
    columns=Array.from({length:count},(_,i)=>({
      x:i*size*1.1,
      y:Math.random()*h,
      speed:.45+Math.random()*1.6,
      size,
      seed:Math.random()*100
    }));
  }

  function progress(){
    const r=section.getBoundingClientRect();
    // 0 when the section enters; 1 before the content is fully passed.
    const start=innerHeight*.82;
    const distance=Math.max(1,Math.min(r.height-innerHeight*.30, innerHeight*1.05));
    return Math.max(0,Math.min(1,(start-r.top)/distance));
  }

  function render(now){
    const p=reduced?1:matrixProgress;
    const dt=Math.min(40,now-last); last=now;
    ctx.clearRect(0,0,w,h);

    const intensity=Math.max(0,Math.min(1,(p-.10)/.42))*Math.max(.35,1-p*.22);
    if(intensity>.01){
      ctx.save();
      ctx.globalAlpha=intensity;
      columns.forEach((col,i)=>{
        const x=col.x;
        const step=col.size*1.15;
        const head=(col.y+now*.035*col.speed)% (h+step*10);
        const tail=7+Math.floor(p*13);
        for(let n=0;n<tail;n++){
          const yy=head-n*step;
          if(yy<0||yy>h) continue;
          const a=(1-n/tail)*.72;
          ctx.fillStyle=n===0
            ? `rgba(214,255,220,${a})`
            : `rgba(30,190,90,${a*.78})`;
          ctx.font=`600 ${col.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(chars[(Math.floor(now*.01+i*7+n*3+col.seed))%10],x,yy);
        }
      });
      ctx.restore();
    }

    // Title visibly "breaks" as matrix intensity grows.
    const breakP=Math.max(0,Math.min(1,(p-.05)/.52));
    title.style.opacity=String(1-breakP*1.05);
    title.style.letterSpacing=`${-.08 + breakP*.19}em`;
    title.style.transform=`translateY(${breakP*-42}px) scale(${1-breakP*.10})`;
    title.style.filter=`blur(${breakP*2.6}px)`;

    const reveal=Math.max(0,Math.min(1,(p-.46)/.38));
    content.style.opacity=String(.35+reveal*.65);
    content.style.transform=`translateY(${(1-reveal)*34}px)`;
    section.classList.toggle('is-matrixing',p>.08&&p<.96);
    section.classList.toggle('is-revealed',reveal>.7);

    if(!reduced) requestAnimationFrame(render);
  }

  let ticking=false;
  function update(){
    matrixProgress=progress();
    if(!ticking&&reduced){
      ticking=true; requestAnimationFrame((t)=>{render(t);ticking=false;});
    }
  }
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',()=>{resize();update();},{passive:true});
  resize(); update(); render(performance.now());
})();

// Header reveal
(() => {
  const header=document.querySelector('.site-header[data-reveal-on-scroll]');
  if(!header) return;
  const update=()=>{
    const visible=scrollY>120;
    header.classList.toggle('is-visible',visible);
    header.querySelectorAll('a').forEach(a=>visible?a.removeAttribute('tabindex'):a.setAttribute('tabindex','-1'));
  };
  addEventListener('scroll',update,{passive:true}); update();
})();
