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
    const columnWidths=Array.from({length:columns},(_,i)=>Number.isFinite(value.columnWidths?.[i])&&value.columnWidths[i]>0?Math.max(1,Math.min(10000,value.columnWidths[i])):1);
    return {enabled:!!value.enabled,columns,items,columnWidths};
  }
  function move(items, id, target, after) {
    const from = items.findIndex(x => x.id === id), to = items.findIndex(x => x.id === target);
    if (from < 0 || to < 0 || from === to) return items;
    const result = items.filter(x => x.id !== id), index = result.findIndex(x => x.id === target);
    result.splice(index + (after ? 1 : 0), 0, items[from]);
    return result;
  }
  // Each column stacks independently, including when a neighbouring tile is tall.
  function columnGeometry(columns,width,weights,gap=12){
    const count=clamp(columns,1,4,4),available=Math.max(count,width-gap*(count-1));
    const values=Array.from({length:count},(_,i)=>Number.isFinite(weights?.[i])&&weights[i]>0?weights[i]:1),total=values.reduce((a,b)=>a+b,0);
    const widths=values.map(value=>available*value/total),offsets=[];let x=0;
    for(const size of widths){offsets.push(x);x+=size+gap}
    return {widths,offsets};
  }
  function resizeColumns(widths,boundary,delta,minimum=120){
    const result=[...widths];if(boundary<1||boundary>=result.length||!Number.isFinite(delta))return result;
    const pair=result[boundary-1]+result[boundary],limit=Math.min(minimum,pair/3);
    const left=Math.max(limit,Math.min(pair-limit,result[boundary-1]+delta));
    result[boundary-1]=left;result[boundary]=pair-left;return result;
  }
  function arrange(items, columns, width, heights, gap = 12, weights) {
    const count=clamp(columns,1,4,4),tracks=columnGeometry(count,width,weights,gap),bottoms=Array(count).fill(0);
    return items.map(item=>{
      const span=clamp(item.span,1,count,1);
      let column=Number.isInteger(item.column)?clamp(item.column,0,count-span,0):0;
      if(!Number.isInteger(item.column)){
        let lowest=Infinity;
        for(let i=0;i<=count-span;i++){const top=Math.max(...bottoms.slice(i,i+span));if(top<lowest){column=i;lowest=top}}
      }
      const tileWidth=tracks.widths.slice(column,column+span).reduce((a,b)=>a+b,0)+gap*(span-1);
      const y=Math.max(...bottoms.slice(column,column+span)), height=Math.max(0,(typeof heights==='function'?heights(item,{column,span,width:tileWidth}):heights[item.id])||0);
      for(let i=column;i<column+span;i++)bottoms[i]=y+height+gap;
      return {id:item.id,column,span,x:tracks.offsets[column],y,width:tileWidth,height};
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {normalize,move,arrange,columnGeometry,resizeColumns};
  if (typeof document === 'undefined') return;
  const key = 'mana-ikdiena-dashboard-v1';
  let state;
  try { state = normalize(JSON.parse(localStorage.getItem(key) || '{}')); } catch { state = normalize(); }
  const desktop = matchMedia('(min-width:851px)');
  const layout = document.querySelector('.layout');
  const board = document.createElement('div'); board.className = 'dashboard-grid'; layout.after(board);
  const dividers=document.createElement('div');dividers.className='dashboard-dividers';board.after(dividers);
  const separators=new Map();
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
    if(!active){board.style.height='';dividers.replaceChildren();for(const tile of board.children){tile.style.width='';tile.style.left='';tile.style.top=''}return}
    const visible=state.items.filter(item=>!item.hidden&&widgets.has(item.id));
    const positions=arrange(visible,state.columns,board.clientWidth,(item,position)=>{const tile=widgets.get(item.id);tile.style.width=position.width+'px';return tile.offsetHeight},12,state.columnWidths);
    for(const position of positions){const tile=widgets.get(position.id);tile.style.left=position.x+'px';tile.style.top=position.y+'px';tile.dataset.layoutColumn=String(position.column)}
    const height=Math.max(0,...positions.map(position=>position.y+position.height));board.style.height=height+'px';
    updateDividers(positions,height);
  }
  function updateDividers(positions,height){
    dividers.style.top=-height+'px';
    const used=new Set(),tracks=columnGeometry(state.columns,board.clientWidth,state.columnWidths);
    if(editing)for(let boundary=1;boundary<state.columns;boundary++){
      const left=positions.filter(p=>p.column+p.span===boundary),right=positions.filter(p=>p.column===boundary);
      for(const a of left)for(const b of right){
        const top=Math.max(a.y,b.y),bottom=Math.min(a.y+a.height,b.y+b.height);if(bottom-top<28)continue;
        const key=boundary+':'+a.id+':'+b.id;used.add(key);let divider=separators.get(key);
        if(!divider){
          divider=document.createElement('button');divider.type='button';divider.className='dashboard-divider';divider.dataset.boundary=String(boundary);divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','vertical');
          divider.setAttribute('aria-label','Regulēt platumu starp blokiem: '+itemById(a.id).title+' un '+itemById(b.id).title);divider.title='Velc robežu pa labi vai pa kreisi. Divreiz nospied, lai izlīdzinātu platumus.';
          divider.onpointerdown=event=>{if(!editing||!desktop.matches||event.button!==0)return;event.preventDefault();event.stopPropagation?.();divider.setPointerCapture(event.pointerId);gesture={mode:'columns',target:divider,boundary,x:event.clientX,widths:columnGeometry(state.columns,board.clientWidth,state.columnWidths).widths};divider.classList.add('dragging')};
          divider.onkeydown=event=>{if(!editing||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();state.columnWidths=resizeColumns(columnGeometry(state.columns,board.clientWidth,state.columnWidths).widths,boundary,event.key==='ArrowRight'?20:-20);save();scheduleLayout()};
          divider.ondblclick=()=>{if(!editing)return;const sizes=columnGeometry(state.columns,board.clientWidth,state.columnWidths).widths;state.columnWidths=resizeColumns(sizes,boundary,(sizes[boundary]-sizes[boundary-1])/2);save();scheduleLayout()};
          separators.set(key,divider);
        }
        divider.style.left=tracks.offsets[boundary]-12+'px';divider.style.top=top+4+'px';divider.style.height=bottom-top-8+'px';
        divider.setAttribute('aria-valuemin','0');divider.setAttribute('aria-valuemax','100');divider.setAttribute('aria-valuenow',String(Math.round((tracks.offsets[boundary]-6)/board.clientWidth*100)));
        divider.setAttribute('aria-valuetext',Math.round(tracks.widths[boundary-1])+' px / '+Math.round(tracks.widths[boundary])+' px');
        if(divider.parentElement!==dividers)dividers.append(divider);
      }
    }
    for(const [key,divider] of separators)if(!used.has(key)&&gesture?.target!==divider)divider.remove();
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
  const hint = document.createElement('span'); hint.textContent = 'Pārvieto aiz augšējā roktura. Platumu regulē aiz līnijas starp blokiem, augstumu - aiz apakšējā stūra.';
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
    const size=document.createElement('span');size.className='dashboard-size';
    tile.append(bar,body,size,resize);
    if (origins.has(item.id)) body.append(origins.get(item.id).element);
    else {
      const heading=document.createElement('input');heading.className='dashboard-note-title';heading.value=item.title;heading.maxLength=80;heading.setAttribute('aria-label','Bloka nosaukums');
      const text=document.createElement('textarea');text.className='dashboard-note-text';text.value=item.text;text.maxLength=20000;text.placeholder='Ātrās piezīmes…';text.setAttribute('aria-label','Piezīmju teksts');
      heading.oninput=()=>{item.title=heading.value;title.textContent=item.title;save()};text.oninput=()=>{item.text=text.value;save()};body.append(heading,text);
    }
    if (item.id==='notes') { const newNote=document.createElement('button');newNote.type='button';newNote.textContent='+ Piezīme';newNote.onclick=()=>document.getElementById('noteOpen').click();body.append(newNote); }
    handle.onpointerdown=e=>start(e,tile,'move');resize.onpointerdown=e=>start(e,tile,'resize');
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
    if(gesture.mode==='columns'){state.columnWidths=resizeColumns(gesture.widths,gesture.boundary,event.clientX-gesture.x);scheduleLayout();return}
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
    if(current.mode==='columns'){current.target.classList.remove('dragging');save();layoutTiles();return}
    widgets.get(current.id).classList.remove('dashboard-dragging');
    if(event.type!=='pointercancel'&&current.drop){itemById(current.id).column=current.drop.column;state.items=move(state.items,current.id,current.drop.id,current.drop.after)}
    save();render();
  }
  document.addEventListener('pointerup',stop);document.addEventListener('pointercancel',stop);
  trigger.onclick=()=>{if(!desktop.matches){document.getElementById('settingsOpen').click();settings.open=true;settings.scrollIntoView({block:'nearest'});return}state.enabled=true;editing=!editing;save();render()};
  finish.onclick=()=>{editing=false;render()};
  enabled.onchange=()=>{state.enabled=enabled.checked;editing=false;save();render()};
  columns.onchange=()=>{state.columns=Number(columns.value);state.columnWidths=Array(state.columns).fill(1);save();render()};
  editButton.onclick=()=>{document.getElementById('settingsDialog').close();state.enabled=true;editing=true;save();render()};
  add.onclick=()=>{if(state.items.filter(x=>x.id.startsWith('note-')).length>=54){notice.textContent='Vienā izkārtojumā var pievienot līdz 54 piezīmju blokiem.';return}state.enabled=true;state.items.push({id:'note-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),title:'Piezīmes',text:'',hidden:false,span:1,height:0});save();render()};
  reset.onclick=()=>{state.enabled=false;state.columns=4;state.columnWidths=[1,1,1,1];for(const item of state.items){item.hidden=false;item.column=null;item.span=item.id==='tasks'?2:1;item.height=0}state.items=[...defaults.map(([id])=>itemById(id)),...state.items.filter(item=>item.id.startsWith('note-'))];editing=false;save();render()};
  desktop.addEventListener('change',()=>{editing=false;render()});
  render();
})();
