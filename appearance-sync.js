
(() => {
  const client = window.plannerDesignClient;
  if (!client) return;
  const designKey = 'mana-ikdiena-design-v1';
  const themeKey = 'mana-diena-theme';
  const gradientPrefix = 'mana-gradient:';
  const remoteKey = 'planner_appearance';
  const status = document.getElementById('designSyncStatus');
  const button = document.getElementById('designSyncUpload');
  let accountId = null;
  let lastSnapshot = '';
  let queued = null;
  let busy = false;
  let timer;
  let enabled = false;

  function snapshot() {
    const itemGradients = Object.create(null);
    for (const key of Object.keys(localStorage).sort()) {
      if (key.startsWith(gradientPrefix)) itemGradients[key] = localStorage.getItem(key);
    }
    return JSON.stringify({design:localStorage.getItem(designKey),theme:localStorage.getItem(themeKey),itemGradients});
  }
  function restore(value) {
    const appearance = JSON.parse(value);
    if (!appearance || typeof appearance !== 'object') throw Error('Invalid appearance');
    if (typeof appearance.design === 'string') localStorage.setItem(designKey,appearance.design);
    else localStorage.removeItem(designKey);
    const theme=appearance.theme==='dark'?'dark':'light';
    localStorage.setItem(themeKey,theme);
    applyTheme(theme);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(gradientPrefix)) localStorage.removeItem(key);
    }
    for (const [key,value] of Object.entries(appearance.itemGradients || {})) {
      if (key.startsWith(gradientPrefix) && typeof value==='string') localStorage.setItem(key,value);
    }
    window.reloadPlannerDesign?.();
    render();
  }

  async function syncAppearance() {
    if (busy || document.hidden) return;
    busy=true;
    try {
      const {data:{session}}=await client.auth.getSession();
      const id=session?.user?.id;
      if (accountId!==id) {
        accountId=id;
        queued=null;
        enabled=false;
        lastSnapshot=snapshot();
      }
      button.disabled=!id;
      if (!id) {status.textContent='Pieraksties, lai sinhronizētu dizainu.';return;}
      if (queued) {
        const value=queued;
        const {error}=await client.auth.updateUser({data:{[remoteKey]:value}});
        if (error) throw error;
        if (queued===value) queued=null;
        enabled=true;
        status.textContent='Dizains saglabāts kontā.';
        return;
      }
      const {data,error}=await client.auth.getUser();
      if (error) throw error;
      if (data.user?.id!==id || queued) return;
      const value=data.user.user_metadata?.[remoteKey];
      if (typeof value==='string') {
        if (value!==snapshot()) restore(value);
        enabled=true;
        lastSnapshot=snapshot();
        status.textContent='Dizains sinhronizēts ar kontu.';
      } else status.textContent='Sāc datorā ar “Saglabāt šīs ierīces dizainu kontā”.';
    } catch {
      status.textContent='Dizaina sinhronizācija pašlaik nav pieejama. Mēģināsim vēlreiz.';
    } finally {busy=false}
  }
  function queueAppearance() {
    if (!enabled) return;
    const value=snapshot();
    if (value===lastSnapshot) return;
    lastSnapshot=value;
    queued=value;
    clearTimeout(timer);
    timer=setTimeout(syncAppearance,700);
  }
  button.onclick=()=>{
    if (!accountId) return;
    queued=lastSnapshot=snapshot();
    void syncAppearance();
  };
  window.addEventListener('planner-appearance-change',queueAppearance);
  document.addEventListener('click',event=>{
    if (event.target.closest('#themeToggle')) queueAppearance();
  });
  document.addEventListener('visibilitychange',syncAppearance);
  setInterval(syncAppearance,20000);
  void syncAppearance();
})();
