(() => {
  const $ = id => document.getElementById(id);
  const els = {
    wheelSelect:$("wheelSelect"),optionInput:$("optionInput"),optionsList:$("optionsList"),emptyOptions:$("emptyOptions"),
    optionCount:$("optionCount"),spinBtn:$("spinBtn"),spinHint:$("spinHint"),winnerCard:$("winnerCard"),winnerText:$("winnerText"),
    winnerActions:$("winnerActions"),removeWinnerBtn:$("removeWinnerBtn"),keepWinnerBtn:$("keepWinnerBtn"),
    historyList:$("historyList"),emptyHistory:$("emptyHistory"),totalWeight:$("totalWeight"),removeModeSelect:$("removeModeSelect"),
    soundToggle:$("soundToggle"),modalBackdrop:$("modalBackdrop"),modalTitle:$("modalTitle"),modalCopy:$("modalCopy"),
    modalBody:$("modalBody"),modalActions:$("modalActions"),modalEyebrow:$("modalEyebrow"),toast:$("toast")
  };
  const SOUND_KEY="spinit.sound";
  let spinning=false, soundOn=true, audioCtx=null, toastTimer=null, lastFocused=null, pendingWinner=null;
  try{ soundOn = localStorage.getItem(SOUND_KEY) !== "0"; }catch(e){}
  const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const active=()=>SpinStorage.getActive();
  const palette=()=>SpinStorage.palettes[active().palette]||SpinStorage.palettes.neon;
  function persist(){SpinStorage.save();render();}
  function toast(message){
    els.toast.textContent=message;els.toast.classList.add("show");
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove("show"),2200);
  }
  function render(){
    const state=SpinStorage.getState(),w=active();
    els.wheelSelect.innerHTML=state.wheels.map(x=>`<option value="${esc(x.id)}" ${x.id===w.id?"selected":""}>${esc(x.name)}</option>`).join("");
    els.optionCount.textContent=w.options.length;
    els.optionsList.innerHTML=w.options.map((o,i)=>`
      <div class="option-item" data-id="${esc(o.id)}">
        <span class="option-dot" style="background:${palette()[i%palette().length]}"></span>
        <span class="option-name" title="${esc(o.text)}">${esc(o.text)}</span>
        <input class="weight-input" type="number" min=".1" max="100" step=".1" value="${o.weight}" aria-label="Peso de ${esc(o.text)}" title="Peso/probabilidad relativa">
        <button class="row-icon edit" title="Editar opción" aria-label="Editar opción">✎</button>
        <button class="row-icon delete" title="Eliminar opción" aria-label="Eliminar opción">×</button>
      </div>`).join("");
    els.emptyOptions.classList.toggle("hidden",w.options.length>0);
    els.spinBtn.disabled=spinning||w.options.length<2;
    els.spinHint.textContent=w.options.length<2?"Agrega al menos dos opciones para girar.":spinning?"La ruleta está girando…":"Cada opción tiene una probabilidad proporcional a su peso.";
    els.removeModeSelect.value=w.removeMode;
    els.totalWeight.textContent=w.options.reduce((s,o)=>s+Number(o.weight||1),0).toFixed(1);
    document.querySelectorAll(".palette").forEach(b=>b.classList.toggle("active",b.dataset.palette===w.palette));
    renderHistory();
    SpinWheel.redraw(w.options,palette());
  }
  function renderHistory(){
    const history=active().history;
    els.historyList.innerHTML=history.slice(0,12).map((h,i)=>{
      const d=new Date(h.time);
      return `<div class="history-item"><span class="history-number">${history.length-i}</span><div class="history-detail"><strong>${esc(h.text)}</strong><small>${d.toLocaleDateString("es-MX",{day:"2-digit",month:"short"})} · ${d.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}</small></div></div>`;
    }).join("");
    els.emptyHistory.classList.toggle("hidden",history.length>0);
  }
  function ensureAudio(){
    try{
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended")audioCtx.resume();
      return audioCtx;
    }catch(e){console.warn("Audio no disponible",e);return null;}
  }
  function playTone(freq=440,duration=.07,volume=.035){
    if(!soundOn)return;
    const ac=ensureAudio();if(!ac)return;
    try{
      const osc=ac.createOscillator(),gain=ac.createGain();
      osc.type="sine";osc.frequency.value=freq;gain.gain.setValueAtTime(volume,ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);
      osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+duration);
    }catch(e){console.warn("Audio no disponible",e);}
  }
  function showModal({title,copy="",eyebrow="JP RULETA",body="",actions=[]}){
    lastFocused=document.activeElement;
    els.modalTitle.textContent=title;els.modalCopy.textContent=copy;els.modalEyebrow.textContent=eyebrow;
    els.modalBody.innerHTML=body;els.modalActions.innerHTML="";
    actions.forEach(a=>{
      const b=document.createElement("button");b.textContent=a.label;b.className=a.primary?"modal-primary":"secondary-button";
      b.addEventListener("click",()=>{if(a.onClick)a.onClick();if(a.close!==false)closeModal();});
      els.modalActions.appendChild(b);
    });
    els.modalBackdrop.classList.remove("hidden");
    const target=els.modalBody.querySelector("input,button,select,textarea")||els.modalActions.querySelector("button");
    setTimeout(()=>target?.focus(),0);
  }
  function closeModal(){
    if(els.modalBackdrop.classList.contains("hidden"))return;
    els.modalBackdrop.classList.add("hidden");
    const restore=lastFocused;lastFocused=null;
    if(restore&&restore.isConnected)setTimeout(()=>restore.focus(),0);
  }
  function askText(title,copy,initial,callback){
    showModal({title,copy,body:`<input class="modal-input" id="modalTextInput" maxlength="48" value="${esc(initial)}">`,actions:[
      {label:"Cancelar",onClick:()=>{}},{label:"Guardar",primary:true,onClick:()=>{const v=$("modalTextInput").value.trim();if(v)callback(v);}}
    ]});
    setTimeout(()=>{$("modalTextInput")?.focus();$("modalTextInput")?.select();},0);
  }
  function addOption(text){
    const w=active();if(w.options.length>=100){toast("Máximo 100 opciones por ruleta.");return;}
    w.options.push({id:SpinStorage.uid(),text:text.slice(0,48),weight:1});persist();
  }
  $("addOptionForm").addEventListener("submit",e=>{
    e.preventDefault();const text=els.optionInput.value.trim();if(!text)return;
    addOption(text);els.optionInput.value="";els.optionInput.focus();
  });
  els.optionsList.addEventListener("click",e=>{
    const row=e.target.closest(".option-item");if(!row)return;
    const w=active(),o=w.options.find(x=>x.id===row.dataset.id);if(!o)return;
    if(e.target.closest(".delete")){w.options=w.options.filter(x=>x.id!==o.id);persist();}
    if(e.target.closest(".edit"))askText("Editar opción","Cambia el nombre de esta opción.",o.text,v=>{o.text=v;persist();});
  });
  els.optionsList.addEventListener("change",e=>{
    if(!e.target.matches(".weight-input"))return;
    const row=e.target.closest(".option-item"),o=active().options.find(x=>x.id===row.dataset.id);
    if(!o)return;
    o.weight=Math.max(.1,Math.min(100,Number(e.target.value)||1));persist();
  });
  $("clearOptionsBtn").addEventListener("click",()=>{
    if(!active().options.length)return;
    showModal({title:"¿Vaciar la ruleta?",copy:"Se eliminarán todas las opciones de esta ruleta.",actions:[
      {label:"Cancelar"},{label:"Vaciar",primary:true,onClick:()=>{active().options=[];persist();}}
    ]});
  });
  $("shuffleOptionsBtn").addEventListener("click",()=>{
    const a=active().options;for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}persist();toast("Orden mezclado.");
  });
  els.wheelSelect.addEventListener("change",()=>{SpinStorage.setActive(els.wheelSelect.value);dismissWinner();render();});
  $("newWheelBtn").addEventListener("click",()=>askText("Nueva ruleta","Ponle un nombre para identificarla.","Nueva ruleta",name=>{SpinStorage.addWheel(name);dismissWinner();render();toast("Ruleta creada.");}));
  $("renameWheelBtn").addEventListener("click",()=>askText("Renombrar ruleta","Elige un nombre nuevo.",active().name,name=>{active().name=name;persist();}));
  $("deleteWheelBtn").addEventListener("click",()=>{
    if(SpinStorage.getState().wheels.length===1){toast("Debes conservar al menos una ruleta.");return;}
    showModal({title:"¿Eliminar esta ruleta?",copy:`Se eliminará "${active().name}" junto con sus opciones e historial.`,actions:[
      {label:"Cancelar"},{label:"Eliminar",primary:true,onClick:()=>{SpinStorage.deleteWheel(active().id);dismissWinner();render();toast("Ruleta eliminada.");}}
    ]});
  });
  els.removeModeSelect.addEventListener("change",e=>{active().removeMode=e.target.value;SpinStorage.save();});
  $("paletteList").addEventListener("click",e=>{
    const b=e.target.closest(".palette");if(!b)return;active().palette=b.dataset.palette;persist();
  });
  $("clearHistoryBtn").addEventListener("click",()=>{
    if(!active().history.length)return;
    showModal({title:"¿Borrar historial?",copy:"Esta acción no se puede deshacer.",actions:[
      {label:"Cancelar"},{label:"Borrar historial",primary:true,onClick:()=>{active().history=[];persist();}}
    ]});
  });
  els.soundToggle.addEventListener("click",()=>{
    soundOn=!soundOn;
    try{localStorage.setItem(SOUND_KEY,soundOn?"1":"0");}catch(e){}
    els.soundToggle.classList.toggle("active",soundOn);els.soundToggle.setAttribute("aria-pressed",String(soundOn));
    toast(soundOn?"Sonido activado":"Sonido desactivado");if(soundOn)playTone(660,.12);
  });
  function dismissWinner(){
    pendingWinner=null;
    els.winnerActions.classList.add("hidden");
    els.winnerCard.classList.add("hidden");
  }
  $("closeWinnerBtn").addEventListener("click",dismissWinner);
  els.keepWinnerBtn.addEventListener("click",dismissWinner);
  els.removeWinnerBtn.addEventListener("click",()=>{
    if(pendingWinner){
      const wheel=SpinStorage.getState().wheels.find(x=>x.id===pendingWinner.wheelId);
      if(wheel){
        const index=wheel.options.findIndex(o=>o.id===pendingWinner.optionId);
        if(index>=0)wheel.options.splice(index,1);
        SpinStorage.save();
      }
      const text=pendingWinner.text;
      dismissWinner();render();toast(`Opción eliminada: ${text}`);
      return;
    }
    dismissWinner();
  });
  els.spinBtn.addEventListener("click",()=>{
    const w=active();if(spinning||w.options.length<2)return;
    ensureAudio();
    spinning=true;pendingWinner=null;dismissWinner();render();
    const wheelId=w.id;
    let lastTick=0;
    SpinWheel.spin(w.options.slice(),palette(),()=>{
      const now=performance.now();if(now-lastTick>65){playTone(500+Math.random()*280,.035,.018);lastTick=now;}
    },winner=>{
      spinning=false;
      const live=SpinStorage.getState().wheels.find(x=>x.id===wheelId)||active();
      const index=live.options.findIndex(o=>o.id===winner.id);
      live.history.unshift({text:winner.text,time:Date.now()});live.history=live.history.slice(0,100);
      if(live.removeMode==="auto"&&index>=0)live.options.splice(index,1);
      pendingWinner=live.removeMode==="ask"?{wheelId:live.id,optionId:winner.id,text:winner.text}:null;
      SpinStorage.save();render();
      els.winnerText.textContent=winner.text;
      els.winnerActions.classList.toggle("hidden",live.removeMode!=="ask");
      els.winnerCard.classList.remove("hidden");
      playTone(880,.18,.055);setTimeout(()=>playTone(1175,.22,.04),130);
    });
  });
  function encodeShare(){
    const w=active();
    const payload={name:w.name,palette:w.palette,removeMode:w.removeMode,options:w.options.map(o=>({text:o.text,weight:o.weight}))};
    const bytes=new TextEncoder().encode(JSON.stringify(payload));
    let binary="";bytes.forEach(b=>binary+=String.fromCharCode(b));
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function share(){
    const url=`${location.href.split("#")[0]}#share=${encodeShare()}`;
    showModal({title:"Comparte tu ruleta",copy:"Cualquier persona con este enlace podrá abrir una copia de esta configuración. Tu historial no se comparte.",body:`<div class="share-url" id="shareUrl">${esc(url)}</div>`,actions:[
      {label:"Cerrar"},{label:"Copiar enlace",primary:true,onClick:()=>{navigator.clipboard?.writeText(url).then(()=>toast("Enlace copiado.")).catch(()=>toast("No se pudo copiar automáticamente."));}}
    ]});
  }
  $("shareTopBtn").addEventListener("click",share);
  function importShare(){
    if(!location.hash.startsWith("#share="))return;
    try{
      const raw=location.hash.slice(7).replace(/-/g,"+").replace(/_/g,"/");
      const binary=atob(raw),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      const data=JSON.parse(new TextDecoder().decode(bytes));
      if(!data||!Array.isArray(data.options)||data.options.length>100)throw new Error("Formato inválido");
      const imported=SpinStorage.addWheel(String(data.name||"Ruleta compartida").slice(0,48)+" (copia)");
      imported.palette=SpinStorage.palettes[data.palette]?data.palette:"neon";
      imported.removeMode=["ask","auto","keep"].includes(data.removeMode)?data.removeMode:(data.removeWinner===false?"keep":"ask");
      imported.options=data.options.map(o=>({id:SpinStorage.uid(),text:String(o.text||"Opción").slice(0,48),weight:Math.max(.1,Math.min(100,Number(o.weight)||1))}));
      SpinStorage.save();history.replaceState(null,"",location.pathname+location.search);render();
      toast("Ruleta compartida importada.");
    }catch(e){console.warn(e);toast("El enlace de la ruleta no es válido.");history.replaceState(null,"",location.pathname+location.search);}
  }
  $("modalCloseBtn").addEventListener("click",closeModal);
  els.modalBackdrop.addEventListener("click",e=>{if(e.target===els.modalBackdrop)closeModal();});
  els.modalBackdrop.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&e.target.id==="modalTextInput"){
      const primary=els.modalActions.querySelector(".modal-primary");
      if(primary){e.preventDefault();primary.click();}
      return;
    }
    if(e.key!=="Tab")return;
    const items=Array.from(els.modalBackdrop.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el=>!el.disabled&&el.offsetParent!==null);
    if(!items.length)return;
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
  els.soundToggle.classList.toggle("active",soundOn);
  els.soundToggle.setAttribute("aria-pressed",String(soundOn));
  importShare();render();
})();
