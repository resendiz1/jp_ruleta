(() => {
  const KEY = "spinit.data.v1";
  const palettes = {
    neon: ["#FFB000","#FFC400","#FFD166","#E69A00","#FFCA28","#F59E0B","#FFE0A3","#D97706"],
    ocean: ["#E08A00","#F97316","#FB923C","#C2410C","#F59E0B","#EA580C","#FDBA74","#9A3412"],
    sunset: ["#D4A017","#FACC15","#EAB308","#A16207","#FFD54F","#CA8A04","#FFE082","#854D0E"],
    forest: ["#6B7280","#9CA3AF","#FFB000","#4B5563","#D1D5DB","#374151","#FFC400","#78716C"],
    esmeralda: ["#34D399","#10B981","#059669","#6EE7B7","#14B8A6","#047857","#A7F3D0","#065F46"],
    oceano: ["#38BDF8","#0EA5E9","#0284C7","#7DD3FC","#06B6D4","#0369A1","#BAE6FD","#075985"],
    violeta: ["#A78BFA","#8B5CF6","#7C3AED","#C4B5FD","#6366F1","#6D28D9","#DDD6FE","#4C1D95"],
    rubi: ["#F43F5E","#E11D48","#BE123C","#FB7185","#EC4899","#9F1239","#FECDD3","#881337"]
  };
  const removeModes = ["ask","auto","keep"];
  function normalizeMode(w) {
    if (removeModes.includes(w.removeMode)) return w.removeMode;
    return w.removeWinner === false ? "keep" : "ask";
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const starter = () => ({
    id: uid(), name: "Mi primera ruleta", palette: "neon", removeMode: "ask",
    options: [
      {id:uid(),text:"Opción 1",weight:1},
      {id:uid(),text:"Opción 2",weight:1},
      {id:uid(),text:"Opción 3",weight:1},
      {id:uid(),text:"Opción 4",weight:1}
    ],
    history: []
  });
  function normalizeWheel(w) {
    return {
      id: String(w.id || uid()), name: String(w.name || "Ruleta").slice(0,48),
      palette: palettes[w.palette] ? w.palette : "neon",
      removeMode: normalizeMode(w),
      options: Array.isArray(w.options) ? w.options.slice(0,100).map(o => ({
        id:String(o.id || uid()), text:String(o.text || "Opción").slice(0,48),
        weight:Math.max(0.1,Math.min(100,Number(o.weight) || 1))
      })) : [],
      history: Array.isArray(w.history) ? w.history.slice(0,100).map(h => ({
        text:String(h.text || ""), time:Number(h.time) || Date.now()
      })) : []
    };
  }
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY));
      if (parsed && Array.isArray(parsed.wheels) && parsed.wheels.length) {
        return {wheels:parsed.wheels.map(normalizeWheel),activeId:parsed.activeId};
      }
    } catch (e) { console.warn("No se pudo leer JP Ruleta:", e); }
    const first = starter();
    return {wheels:[first],activeId:first.id};
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn("No se pudo guardar JP Ruleta:", e); }
  }
  function getState() { return state; }
  function getActive() {
    let found = state.wheels.find(w => w.id === state.activeId);
    if (!found) { found = state.wheels[0]; state.activeId = found.id; }
    return found;
  }
  function setActive(id) { if (state.wheels.some(w => w.id === id)) { state.activeId=id; save(); } }
  function addWheel(name="Nueva ruleta") {
    const w = {id:uid(),name:name.slice(0,48),palette:"neon",removeMode:"ask",options:[],history:[]};
    state.wheels.push(w);state.activeId=w.id;save();return w;
  }
  function deleteWheel(id) {
    if (state.wheels.length <= 1) return false;
    state.wheels=state.wheels.filter(w=>w.id!==id);
    if (state.activeId===id) state.activeId=state.wheels[0].id;
    save();return true;
  }
  function replaceWheels(wheels, activeId) {
    state={wheels:wheels.map(normalizeWheel),activeId};
    if (!state.wheels.length) { const w=starter();state.wheels=[w];state.activeId=w.id; }
    if (!state.wheels.some(w=>w.id===state.activeId)) state.activeId=state.wheels[0].id;
    save();
  }
  window.SpinStorage = {palettes,uid,load,getState,getActive,save,setActive,addWheel,deleteWheel,replaceWheels};
})();
