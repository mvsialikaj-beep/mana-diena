(function () {
  'use strict';
  const defaults = [['tasks','Uzdevumi'],['calendar','Kalendārs un laiks'],['namedays','Vārdadienas'],['progress','Tavs progress']];
  const clamp = (value, low, high, fallback) => Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Math.round(Number(value)))) : fallback;
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const columns = clamp(value.columns, 1, 4, 4);
    const seen = new Set();
    const items = [];
    for (const item of Array.isArray(value.items) ? value.items.slice(0, 60) : []) {
      if (!item || typeof item.id !== 'string' || seen.has(item.id)) continue;
      const builtin = defaults.find(([id]) => id === item.id);
      if (!builtin && !/^note-[a-z0-9-]{1,80}$/i.test(item.id)) continue;
      seen.add(item.id);
      items.push({id:item.id, title:builtin ? builtin[1] : String(item.title || 'Piezīmes').slice(0,80),
        text:builtin ? '' : String(item.text || '').slice(0,20000), hidden:!!item.hidden,
        span:clamp(item.span,1,4,item.id === 'tasks' ? 2 : 1), height:clamp(item.height,0,1800,0),
        column:Number.isInteger(item.column) ? clamp(item.column,0,3,0) : null});
    }
    for (const [id,title] of defaults) if (!seen.has(id)) items.push({id,title,text:'',hidden:false,span:id === 'tasks' ? 2 : 1,height:0,column:null});
    return {enabled:!!value.enabled,columns,items};
  }
  function move(items, id, target, after) {
    const from = items.findIndex(x => x.id === id), to = items.findIndex(x => x.id === target);
    if (from < 0 || to < 0 || from === to) return items;
    const result = items.filter(x => x.id !== id), index = result.findIndex(x => x.id === target);
    result.splice(index + (after ? 1 : 0), 0, items[from]);
    return result;
  }
  // Each column stacks independently, including when a neighbouring tile is tall.
  function arrange(items, columns, width, heights, gap = 12) {
    const count=clamp(columns,1,4,4), unit=Math.max(1,(width-gap*(count-1))/count), bottoms=Array(count).fill(0);
    return items.map(item=>{
      const span=clamp(item.span,1,count,1);
      let column=Number.isInteger(item.column)?clamp(item.column,0,count-span,0):0;
      if(!Number.isInteger(item.column)){
        let lowest=Infinity;
        for(let i=0;i<=count-span;i++){const top=Math.max(...bottoms.slice(i,i+span));if(top<lowest){column=i;lowest=top}}
      }
      const y=Math.max(...bottoms.slice(column,column+span)), height=Math.max(0,heights[item.id]||0);
      for(let i=column;i<column+span;i++)bottoms[i]=y+height+gap;
      return {id:item.id,column,span,x:column*(unit+gap),y,width:unit*span+gap*(span-1),height};
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {normalize,move,arrange};
  if (typeof document === 'undefined') return;
  const key = 'mana-ikdiena-dashboard-v1';
  let state;
  try { state = normalize(JSON.parse(localStorage.getItem(key) || '{}')); } catch { state = normalize(); }
  const desktop = matchMedia('(min-width:851px)');
  const layout = document.querySelector('.layout');
  const board = document.createElement('div'); board.className = 'dashboard-grid'; layout.after(board);
  const origins = new Map(), widgets = new Map();
  let editing = false, gesture = null;
  let layoutFrame=null;
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>scheduleLayout()):null;
  function scheduleLayout(){
    if(layoutFrame!==null)return;
    if(typeof requestAnimationFrame!=='function'){layoutTiles();return}
    layoutFrame=requestAnimationFrame(()=>{layoutFrame=null;layoutTiles()});
  }
  function layoutTiles(){
    const active=state.enabled&&desktop.matches;
    if(!active){board.style.height='';for(const tile of board.children){tile.style.width='';tile.style.left='';tile.style.top=''}return}
    const visible=state.items.filter(item=>!item.hidden&&widgets.has(item.id)), heights={};
    const unit=Math.max(1,(board.clientWidth-12*(state.columns-1))/state.columns);
    for(const item of visible){const tile=widgets.get(item.id);tile.style.width=(unit*Math.min(item.span,state.columns)+12*(Math.min(item.span,state.columns)-1))+'px';heights[item.id]=tile.offsetHeight}
    const positions=arrange(visible,state.columns,board.clientWidth,heights);
    for(const position of positions){const tile=widgets.get(position.id);tile.style.left=position.x+'px';tile.style.top=position.y+'px';tile.dataset.layoutColumn=String(position.column)}
    board.style.height=Math.max(0,...positions.map(position=>position.y+position.height))+'px';
  }
  observer?.observe(board);
  window.addEventListener?.('resize',scheduleLayout);
  const sources = {tasks:document.querySelector('main.main'),calendar:document.querySelector('.calendar-widget'),
    namedays:document.querySelector('.namedays'),progress:document.getElementById('dayProgress')};
  for (const [id,element] of Object.entries(sources)) {
    if (!element) continue;
    const marker = document.createComment('dashboard-' + id); element.before(marker); origins.set(id,{element,marker});
  }
  // Dialogs remain reachable even when the original layout is hidden.
  const categories = document.getElementById('categoriesDialog'); if (categories) document.body.append(categories);
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.id = 'layoutOpen';
  trigger.title = 'Bloku izkārtojums'; trigger.setAttribute('aria-label', trigger.title); trigger.setAttribute('aria-pressed','false');
  trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="10" height="18" rx="2"/><rect x="16" y="3" width="5" height="8" rx="1"/><rect x="16" y="14" width="5" height="7" rx="1"/></svg>';
  document.getElementById('settingsOpen').before(trigger);
  const toolbar = document.createElement('div'); toolbar.className = 'dashboard-toolbar'; toolbar.hidden = true; board.before(toolbar);
  const hint = document.createElement('span'); hint.textContent = 'Pārvieto aiz augšējā roktura. Platumu maini aiz labās malas, augstumu - aiz apakšējā stūra.';
  const finish = document.createElement('button'); finish.type = 'button'; finish.textContent = 'Gatavs';
  toolbar.append(hint,finish);
  const settings = document.createElement('details'); settings.className = 'settings-section dashboard-settings';
  const summary = document.createElement('summary'); summary.textContent = 'Bloku izkārtojums'; settings.append(summary);
  const controls = document.createElement('div'); controls.className = 'dashboard-settings-body'; settings.append(controls);
  document.querySelector('#settingsDialog .settings-panel').append(settings);
  const enabledLabel = document.createElement('label'), enabled = document.createElement('input'); enabled.type = 'checkbox';
  enabledLabel.append(enabled, document.createTextNode(' Pielāgots bloku izkārtojums')); controls.append(enabledLabel);
  const columnLabel = document.createElement('label'); columnLabel.textContent = 'Kolonnu skaits datorā';
  const columns = document.createElement('select');
  for (let i=1;i<=4;i++) { const option = document.createElement('option'); option.value=i; option.textContent=i; columns.append(option); }
  columnLabel.append(columns); controls.append(columnLabel);
  const editButton = document.createElement('button'); editButton.type='button'; editButton.textContent='Pārvietot un mainīt izmērus'; controls.append(editButton);
  const add = document.createElement('button'); add.type='button'; add.textContent='+ Piezīmju bloks'; controls.append(add);
  const list = document.createElement('div'); list.className='dashboard-block-list'; controls.append(list);
  const reset = document.createElement('button'); reset.type='button'; reset.textContent='Atjaunot sākotnējo izkārtojumu'; controls.append(reset);
  const notice = document.createElement('p'); notice.className='muted'; notice.textContent='Izkārtojums un papildu piezīmju bloki saglabājas šajā pārlūkā. Telefonā saglabājas kompakts vienas kolonnas skats.'; controls.append(notice);
  function save() { try { localStorage.setItem(key,JSON.stringify(state)); } catch { notice.textContent='Neizdevās saglabāt izkārtojumu. Pārbaudi pārlūka brīvo vietu.'; } }
  function itemById(id) { return state.items.find(item => item.id === id); }
  function restoreSources() { for (const {element,marker} of origins.values()) { marker.before(element); element.hidden=false; } }
  function widget(item) {
    if (widgets.has(item.id)) return widgets.get(item.id);
    const tile=document.createElement('section'); tile.className='card dashboard-widget'; tile.dataset.block=item.id;
    const bar=document.createElement('div'); bar.className='dashboard-widget-bar';
    const handle=document.createElement('button');handle.type='button';handle.className='dashboard-drag';handle.textContent='⠿';handle.title='Velc, lai pārvietotu. Ar bulttaustiņiem maini vietu.';handle.setAttribute('aria-label','Pārvietot: '+item.title);
    const title=document.createElement('span');title.textContent=item.title;
    const hide=document.createElement('button');hide.type='button';hide.textContent='×';hide.setAttribute('aria-label','Paslēpt: '+item.title);
    hide.onclick=()=>{item.hidden=true;save();render()};bar.append(handle,title,hide);
    const body=document.createElement('div');body.className='dashboard-content';
    const resize=document.createElement('button');resize.type='button';resize.className='dashboard-resize';resize.textContent='◢';resize.setAttribute('aria-label','Mainīt izmēru: '+item.title);resize.title='Velc, lai mainītu izmēru. Bulttaustiņi maina platumu un augstumu. Divreiz nospied, lai atjaunotu automātisku augstumu.';
    const widthResize=document.createElement('button');widthResize.type='button';widthResize.className='dashboard-width-resize';widthResize.textContent='↔';widthResize.setAttribute('role','slider');widthResize.setAttribute('aria-orientation','horizontal');widthResize.setAttribute('aria-label','Mainīt bloka platumu: '+item.title);widthResize.title='Velc pa labi vai pa kreisi, lai mainītu platumu pa kolonnām. Augstums nemainās.';
    const size=document.createElement('span');size.className='dashboard-size';
    tile.append(bar,body,size,resize,widthResize);
    if (origins.has(item.id)) body.append(origins.get(item.id).element);
    else {
      const heading=document.createElement('input');heading.className='dashboard-note-title';heading.value=item.title;heading.maxLength=80;heading.setAttribute('aria-label','Bloka nosaukums');
      const text=document.createElement('textarea');text.className='dashboard-note-text';text.value=item.text;text.maxLength=20000;text.placeholder='Ātrās piezīmes…';text.setAttribute('aria-label','Piezīmju teksts');
      heading.oninput=()=>{item.title=heading.value;title.textContent=item.title;save()};text.oninput=()=>{item.text=text.value;save()};body.append(heading,text);
    }
    if (item.id==='notes') { const newNote=document.createElement('button');newNote.type='button';newNote.textContent='+ Piezīme';newNote.onclick=()=>document.getElementById('noteOpen').click();body.append(newNote); }
    handle.onpointerdown=e=>start(e,tile,'move');resize.onpointerdown=e=>start(e,tile,'resize');
    widthResize.onpointerdown=e=>start(e,tile,'width');
    widthResize.onkeydown=e=>{if(!editing||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();item.span=e.key==='Home'?1:e.key==='End'?state.columns:clamp(item.span+(e.key==='ArrowRight'?1:-1),1,state.columns,1);save();sizeTile(tile,item)};
    handle.onkeydown=e=>{if(!editing||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const visible=state.items.filter(x=>!x.hidden);const index=visible.indexOf(item),next=visible[index+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)];if(next){item.column=Number(widgets.get(next.id)?.dataset.layoutColumn)||0;state.items=move(state.items,item.id,next.id,['ArrowDown','ArrowRight'].includes(e.key));save();render();handle.focus()}};
    resize.onkeydown=e=>{if(!editing)return;const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-40],ArrowDown:[0,40]};if(!steps[e.key])return;e.preventDefault();const [x,y]=steps[e.key];item.span=clamp(item.span+x,1,state.columns,1);if(y)item.height=clamp((item.height||tile.offsetHeight)+y,140,1800,0);save();sizeTile(tile,item)};
    resize.ondblclick=()=>{item.height=0;save();sizeTile(tile,item)};
    widgets.set(item.id,tile);observer?.observe(tile);return tile;
  }
  function sizeTile(tile,item) {
    const active=desktop.matches;
    tile.style.gridColumn=active?'span '+Math.min(item.span,state.columns):'auto';
    tile.style.height=active&&item.height?item.height+'px':'';
    tile.querySelector('.dashboard-size').textContent=Math.min(item.span,state.columns)+' / '+state.columns+' kol. · '+(item.height?item.height+' px':'auto');
    const widthHandle=tile.querySelector('.dashboard-width-resize');widthHandle.setAttribute('aria-valuemin','1');widthHandle.setAttribute('aria-valuemax',String(state.columns));widthHandle.setAttribute('aria-valuenow',String(Math.min(item.span,state.columns)));widthHandle.setAttribute('aria-valuetext',Math.min(item.span,state.columns)+' no '+state.columns+' kolonnām');
    scheduleLayout();
  }
  function renderList() {
    list.replaceChildren();
    for(const item of state.items){
      const row=document.createElement('div');row.className='dashboard-block-row';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=!item.hidden;label.append(check,document.createTextNode(' '+item.title));
      check.onchange=()=>{item.hidden=!check.checked;save();render()};row.append(label);
      if(item.id.startsWith('note-')){const remove=document.createElement('button');remove.type='button';remove.textContent='Dzēst';remove.onclick=()=>{if(!confirm('Dzēst bloku “'+item.title+'” un tā piezīmes?'))return;state.items=state.items.filter(x=>x.id!==item.id);if(widgets.has(item.id))observer?.unobserve(widgets.get(item.id));widgets.get(item.id)?.remove();widgets.delete(item.id);save();render()};row.append(remove)}
      list.append(row);
    }
  }
  function render() {
    restoreSources();
    const active=state.enabled&&desktop.matches;
    document.documentElement.classList.toggle('dashboard-active',active);
    document.documentElement.classList.toggle('dashboard-editing',active&&editing);
    layout.hidden=active;board.style.setProperty('--dashboard-columns',state.columns);
    toolbar.hidden=!(active&&editing);trigger.setAttribute('aria-pressed',String(active&&editing));
    board.replaceChildren();
    for(const item of state.items){
      if(item.hidden)continue;
      if(!active&&(!state.enabled||origins.has(item.id)))continue;
      const tile=widget(item);
      if(origins.has(item.id))tile.querySelector('.dashboard-content').prepend(origins.get(item.id).element);
      sizeTile(tile,item);board.append(tile);
    }
    enabled.checked=state.enabled;columns.value=state.columns;renderList();layoutTiles();
  }
  function start(event,tile,mode) {
    if(!editing||!desktop.matches||event.button!==0)return;
    event.preventDefault();
    const target=event.currentTarget;target.setPointerCapture(event.pointerId);
    gesture={id:tile.dataset.block,mode,target,x:event.clientX,y:event.clientY,width:tile.offsetWidth,height:tile.offsetHeight,span:itemById(tile.dataset.block).span};
    tile.classList.add('dashboard-dragging');
  }
  document.addEventListener('pointermove',event=>{
    if(!gesture)return;
    const tile=widgets.get(gesture.id),item=itemById(gesture.id);
    if(gesture.mode==='resize'||gesture.mode==='width'){
      const unit=(board.clientWidth-12*(state.columns-1))/state.columns+12;
      item.span=clamp(gesture.span+Math.round((event.clientX-gesture.x)/unit),1,state.columns,1);
      if(gesture.mode==='resize')item.height=clamp(gesture.height+event.clientY-gesture.y,140,1800,0);sizeTile(tile,item);return;
    }
    for(const card of board.children){card.classList.remove('dashboard-drop-before','dashboard-drop-after')}
    let target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.dashboard-widget');
    if(!target||target===tile||!board.contains(target)){
      // Blank space below a short tile is a valid drop destination too.
      let nearest=Infinity;target=null;
      for(const candidate of board.children){
        if(candidate===tile)continue;
        const rect=candidate.getBoundingClientRect(),bottom=rect.top+rect.height;
        if(event.clientX>=rect.left&&event.clientX<=rect.left+rect.width&&event.clientY>=rect.top){
          const distance=Math.abs(event.clientY-bottom);if(distance<nearest){nearest=distance;target=candidate}
        }
      }
    }
    gesture.drop=null;
    if(target&&target!==tile&&board.contains(target)){
      const rect=target.getBoundingClientRect(),after=event.clientY>rect.top+rect.height/2;
      gesture.drop={id:target.dataset.block,after,column:Number(target.dataset.layoutColumn)||0};target.classList.add(after?'dashboard-drop-after':'dashboard-drop-before');
    }
    if(event.clientY<70)window.scrollBy(0,-14);else if(event.clientY>innerHeight-70)window.scrollBy(0,14);
  });
  function stop(event){
    if(!gesture)return;
    const current=gesture;gesture=null;
    if(current.target.hasPointerCapture(event.pointerId))current.target.releasePointerCapture(event.pointerId);
    widgets.get(current.id).classList.remove('dashboard-dragging');
    if(event.type!=='pointercancel'&&current.drop){itemById(current.id).column=current.drop.column;state.items=move(state.items,current.id,current.drop.id,current.drop.after)}
    save();render();
  }
  document.addEventListener('pointerup',stop);document.addEventListener('pointercancel',stop);
  trigger.onclick=()=>{if(!desktop.matches){document.getElementById('settingsOpen').click();settings.open=true;settings.scrollIntoView({block:'nearest'});return}state.enabled=true;editing=!editing;save();render()};
  finish.onclick=()=>{editing=false;render()};
  enabled.onchange=()=>{state.enabled=enabled.checked;editing=false;save();render()};
  columns.onchange=()=>{state.columns=Number(columns.value);save();render()};
  editButton.onclick=()=>{document.getElementById('settingsDialog').close();state.enabled=true;editing=true;save();render()};
  add.onclick=()=>{if(state.items.filter(x=>x.id.startsWith('note-')).length>=54){notice.textContent='Vienā izkārtojumā var pievienot līdz 54 piezīmju blokiem.';return}state.enabled=true;state.items.push({id:'note-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),title:'Piezīmes',text:'',hidden:false,span:1,height:0});save();render()};
  reset.onclick=()=>{state.enabled=false;state.columns=4;for(const item of state.items){item.hidden=false;item.column=null;item.span=item.id==='tasks'?2:1;item.height=0}state.items=[...defaults.map(([id])=>itemById(id)),...state.items.filter(item=>item.id.startsWith('note-'))];editing=false;save();render()};
  desktop.addEventListener('change',()=>{editing=false;render()});
  render();
})();
