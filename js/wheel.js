(() => {
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  let rotation = 0;
  let animation = null;
  let lastOptions = null, lastPalette = null;
  const SIZE = 720;
  const MAX_DPR = 2;
  let dpr = 1;
  const TAU = Math.PI * 2;
  const easeOut = t => 1 - Math.pow(1-t, 5);
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function inkFor(hex) {
    const raw=String(hex).replace("#","");
    const full=raw.length===3?raw.split("").map(c=>c+c).join(""):raw;
    const r=parseInt(full.slice(0,2),16)||0,g=parseInt(full.slice(2,4),16)||0,b=parseInt(full.slice(4,6),16)||0;
    return (0.2126*r+0.7152*g+0.0722*b)/255>0.6?"#0B0D0E":"#F4F1E8";
  }
  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    if (lastOptions) drawRotated(lastOptions, lastPalette);
  }
  function segments(options) {
    const total = options.reduce((s,o)=>s+Math.max(.1,Number(o.weight)||1),0);
    let angle = -Math.PI/2;
    return options.map(o => {
      const span = (Math.max(.1,Number(o.weight)||1)/total)*TAU;
      const item = {option:o,start:angle,end:angle+span,mid:angle+span/2,span};
      angle += span;return item;
    });
  }
  function draw(options,palette) {
    const size=SIZE, center=size/2, radius=size*.465;
    ctx.save();ctx.translate(center,center);
    if (!options.length) {
      ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.fillStyle="#121415";ctx.fill();
      ctx.strokeStyle="rgba(255,176,0,.35)";ctx.lineWidth=5;ctx.setLineDash([10,12]);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="rgba(244,241,232,.55)";ctx.font="600 23px JetBrains Mono, monospace";ctx.textAlign="center";ctx.fillText("AGREGA OPCIONES",0,8);
      ctx.restore();return;
    }
    const segs=segments(options);
    segs.forEach((s,i)=>{
      const fill=palette[i%palette.length];
      const ink=inkFor(fill);
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,radius,s.start,s.end);ctx.closePath();
      ctx.fillStyle=fill;ctx.fill();
      ctx.strokeStyle="#0B0D0E";ctx.lineWidth=5;ctx.stroke();
      ctx.save();ctx.rotate(s.mid);
      const flip=Math.cos(s.mid)<0;
      if(flip)ctx.rotate(Math.PI);
      ctx.textAlign=flip?"left":"right";ctx.textBaseline="middle";
      const maxWidth=radius*.62;
      let label=s.option.text;
      ctx.font=`700 ${Math.max(15,Math.min(23, 300/Math.max(8,options.length)))}px Archivo, sans-serif`;
      while(ctx.measureText(label).width>maxWidth && label.length>5) label=label.slice(0,-2)+"…";
      ctx.fillStyle=ink;
      ctx.shadowColor=ink==="#0B0D0E"?"rgba(0,0,0,0)":"rgba(0,0,0,.55)";
      ctx.shadowBlur=ink==="#0B0D0E"?0:5;
      ctx.fillText(label,flip?-radius*.82:radius*.82,0);
      ctx.restore();
    });
    ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.strokeStyle="rgba(255,176,0,.55)";ctx.lineWidth=7;ctx.stroke();
    ctx.restore();
  }
  function randomFloat() {
    const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;
  }
  function spin(options,palette,onTick,onDone) {
    if (animation || options.length<2) return;
    const segs=segments(options);
    const target=randomFloat()*TAU;
    let cursor=0,chosen=segs[segs.length-1];
    for(const s of segs){if(target>=cursor && target<cursor+s.span){chosen=s;break;}cursor+=s.span;}
    // Canvas angle is rotated; the pointer is at -90 degrees.
    const desiredRotation = -Math.PI/2 - chosen.mid;
    const currentNorm=((rotation%TAU)+TAU)%TAU;
    const desiredNorm=((desiredRotation%TAU)+TAU)%TAU;
    const delta=((desiredNorm-currentNorm)%TAU+TAU)%TAU;
    const start=rotation, end=rotation + (reduceMotion?1:7)*TAU + delta;
    const duration=reduceMotion?600:5200, started=performance.now();
    let lastTick=-1;
    function frame(now){
      const t=Math.min(1,(now-started)/duration), eased=easeOut(t);
      rotation=start+(end-start)*eased;
      drawRotated(options,palette);
      const tick=Math.floor(eased*(reduceMotion?8:28));
      if(tick!==lastTick){lastTick=tick;if(onTick)onTick();}
      if(t<1){animation=requestAnimationFrame(frame);}
      else {
        animation=null;rotation=((rotation%TAU)+TAU)%TAU;
        drawRotated(options,palette);
        if(onDone)onDone(chosen.option);
      }
    }
    animation=requestAnimationFrame(frame);
  }
  function drawRotated(options,palette){
    lastOptions=options;lastPalette=palette;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.save();ctx.translate(SIZE/2,SIZE/2);ctx.rotate(rotation);ctx.translate(-SIZE/2,-SIZE/2);
    draw(options,palette);ctx.restore();
  }
  function redraw(options,palette){drawRotated(options,palette);}
  setupCanvas();
  window.addEventListener("resize",()=>{
    const next=Math.min(window.devicePixelRatio||1,MAX_DPR);
    if(Math.abs(next-dpr)>0.01)setupCanvas();
  });
  window.SpinWheel={spin,redraw,segments};
})();
