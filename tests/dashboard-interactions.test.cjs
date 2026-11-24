const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag='div') { this.tagName=tag;this.children=[];this.dataset={};this.style={setProperty(){}};this.events={};this.attributes={};this.className='';this.offsetWidth=300;this.offsetHeight=300;this.clientWidth=1200;this.hidden=false;
    this.classList={contains:c=>this.className.split(' ').includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(' '),...cs])].join(' ')},remove:(...cs)=>{this.className=this.className.split(' ').filter(c=>!cs.includes(c)).join(' ')},toggle:(c,on)=>{if(on)this.classList.add(c);else this.classList.remove(c)}};
  }
  append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n)}}
  prepend(n){n.remove();n.parentElement=this;this.children.unshift(n)}
  before(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this),0,n)}
  after(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this)+1,0,n)}
  remove(){if(this.parentElement){const a=this.parentElement.children;const i=a.indexOf(this);if(i>=0)a.splice(i,1);this.parentElement=null}}
  replaceChildren(...nodes){for(const n of [...this.children])n.remove();this.append(...nodes)}
  walk(){return this.children.flatMap(n=>[n,...n.walk()])}
  querySelector(selector){return this.walk().find(n=>selector.startsWith('.')?n.classList.contains(selector.slice(1)):selector.startsWith('#')?n.id===selector.slice(1):n.tagName===selector)}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,fn){this.events[k]=fn}
  contains(n){return this===n||this.walk().includes(n)}
  closest(selector){let n=this;while(n){if(n.classList.contains(selector.slice(1)))return n;n=n.parentElement}return null}
  setPointerCapture(){this.captured=true}hasPointerCapture(){return !!this.captured}releasePointerCapture(){this.captured=false}
  getBoundingClientRect(){return {top:parseFloat(this.style.top)||0,left:parseFloat(this.style.left)||0,height:parseFloat(this.style.height)||this.offsetHeight,width:parseFloat(this.style.width)||300}}
  focus(){}scrollIntoView(){}click(){this.onclick?.()}
  showModal(){this.open=true}close(){this.open=false}
}
const body=new Element('body'),root=new Element('html');root.append(body);
const element=(parent,cls,id,tag)=>{const e=new Element(tag);e.className=cls||'';e.id=id;parent.append(e);return e};
const top=element(body,'top-controls');element(top,'','settingsOpen','button');element(top,'','fontOpen','button');element(top,'','noteOpen','button');
const wrap=element(body,'wrap'),layout=element(wrap,'layout'),mainColumn=element(layout,'main-column');
const main=element(mainColumn,'main'),side=element(layout,'side');element(side,'calendar-widget');element(side,'namedays');element(layout,'side progress-column','dayProgress');
element(body,'daily-motivation');element(body,'quick-notes','notesList');element(mainColumn,'','categoriesDialog','dialog');
const settings=element(body,'','settingsDialog','dialog');settings.close=()=>{};const panel=element(settings,'settings-panel');
const media={matches:true,addEventListener(k,fn){this.change=fn}},events={},store=new Map();let underPointer;
const doc={body,documentElement:root,createElement:t=>new Element(t),createTextNode:t=>Object.assign(new Element('#text'),{textContent:t}),createComment:t=>new Element('#comment'),
  getElementById:id=>root.walk().find(n=>n.id===id),querySelector:s=>s==='main.main'?main:s==='#settingsDialog .settings-panel'?panel:root.querySelector(s),
  addEventListener:(k,fn)=>events[k]=fn,elementFromPoint:()=>underPointer};
const widgetEngine={...require('../widgets.js'),mount(host,item){const content=new Element();content.className='test-widget-'+item.widgetType;host.append(content)},unmount(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dashboard-layout.js'),'utf8'),{document:doc,matchMedia:()=>media,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},window:{scrollBy(){},PLANNER_WIDGETS:widgetEngine},innerHeight:900,confirm:()=>true,console});
const board=doc.querySelector('.dashboard-grid'),button=doc.getElementById('layoutOpen');
assert.equal(layout.hidden,false);assert.equal(main.parentElement,mainColumn);
button.onclick();
assert.equal(layout.hidden,true);assert.equal(board.children.length,4);assert(root.classList.contains('dashboard-editing'));
assert.equal(doc.querySelector('.daily-motivation').parentElement,body,'Daily impulse stays in its original location');
assert.equal(doc.getElementById('notesList').parentElement,body,'Quick notes stay in their original location');
assert.equal(main.parentElement.className,'dashboard-content','Move live elements without recreating task handlers');
const controls=doc.querySelector('.dashboard-settings-body');
const add=controls.children.find(x=>x.textContent==='+ Piezīmju bloks');add.onclick();
let note=board.children.find(x=>x.dataset.block.startsWith('note-'));
const text=note.querySelector('.dashboard-note-text');text.value='Saglabāta doma';text.oninput();
assert.equal(JSON.parse(store.get('mana-ikdiena-dashboard-v1')).items.find(x=>x.id===note.dataset.block).text,'Saglabāta doma');
const resize=note.querySelector('.dashboard-resize');resize.onpointerdown({button:0,currentTarget:resize,clientX:0,clientY:0,pointerId:1,preventDefault(){}});
events.pointermove({clientX:320,clientY:100});events.pointerup({type:'pointerup',pointerId:1});
let saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));
assert.equal(saved.items.find(x=>x.id===note.dataset.block).span,2);assert.equal(note.style.height,'400px');
const divider=doc.querySelector('.dashboard-dividers').children.find(x=>x.dataset.boundary==='2');
assert(divider,'A divider appears in the actual gap between neighbouring blocks');
const leftTile=board.children.find(x=>x.dataset.block==='tasks');
const rightTile=board.children.find(x=>x.dataset.block==='calendar');
const beforeLeft=parseFloat(leftTile.style.width),beforeRight=parseFloat(rightTile.style.width);
const unchangedTile=board.children.find(x=>x.dataset.block==='namedays'),beforeUnchanged=parseFloat(unchangedTile.style.width);
divider.onpointerdown({button:0,currentTarget:divider,clientX:600,clientY:20,pointerId:5,preventDefault(){}});
events.pointermove({clientX:617,clientY:500});events.pointerup({type:'pointerup',pointerId:5});
assert(Math.abs(parseFloat(leftTile.style.width)-beforeLeft-17)<0.01,'A small drag changes width immediately, without a whole-column jump');
assert(Math.abs(parseFloat(rightTile.style.width)-beforeRight+17)<0.01,'The neighbouring block shrinks by the same amount');
assert.equal(parseFloat(unchangedTile.style.width),beforeUnchanged,'Other columns keep their width');
assert.equal(note.style.height,'400px','Dragging a divider cannot change block height');
saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));
assert.equal(saved.columnWidths[1],saved.columnWidths[2]+34);
doc.querySelector('.dashboard-toolbar').children.find(x=>x.textContent==='Gatavs').onclick();
assert(!root.classList.contains('dashboard-editing'));
assert.equal(note.style.height,'328px','Closing the editor removes its toolbar/footer instead of leaving blank space');
assert.equal(doc.querySelector('.dashboard-dividers').children.length,0,'Dividers disappear outside edit mode');
const frozen=leftTile.style.width;
divider.onpointerdown({button:0,currentTarget:divider,clientX:0,clientY:0,pointerId:6,preventDefault(){}});
events.pointermove({clientX:600,clientY:300});assert.equal(leftTile.style.width,frozen);
button.onclick();assert(root.classList.contains('dashboard-editing'));
assert.equal(note.style.height,'400px','Reopening edit mode restores room for its controls without changing content height');
const handle=note.querySelector('.dashboard-drag');handle.onpointerdown({button:0,currentTarget:handle,clientX:0,clientY:0,pointerId:2,preventDefault(){}});
underPointer=board.children.find(x=>x.dataset.block==='tasks');events.pointermove({clientX:100,clientY:40});events.pointerup({type:'pointerup',pointerId:2});
saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));assert.equal(saved.items[0].id,note.dataset.block);
const reset=controls.children.find(x=>x.textContent==='Atjaunot sākotnējo izkārtojumu');reset.onclick();
assert.equal(layout.hidden,false);assert.equal(main.parentElement,mainColumn);assert.equal(text.value,'Saglabāta doma');
button.onclick();text.value='Doma pēc atiestatīšanas';text.oninput();
saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));assert.equal(saved.items.find(x=>x.id===note.dataset.block).text,'Doma pēc atiestatīšanas');
// Drop into empty space below the calendar, even while the task list is tall.
const taskTile=board.children.find(x=>x.dataset.block==='tasks');taskTile.offsetHeight=1200;
const calendarTile=board.children.find(x=>x.dataset.block==='calendar');
const namesTile=board.children.find(x=>x.dataset.block==='namedays');
const namesHandle=namesTile.querySelector('.dashboard-drag');
const rect=calendarTile.getBoundingClientRect();underPointer=null;
namesHandle.onpointerdown({button:0,currentTarget:namesHandle,clientX:rect.left+20,clientY:0,pointerId:4,preventDefault(){}});
events.pointermove({clientX:rect.left+20,clientY:rect.top+rect.height+24});events.pointerup({type:'pointerup',pointerId:4});
assert.equal(namesTile.style.left,calendarTile.style.left);
assert.equal(parseFloat(namesTile.style.top),parseFloat(calendarTile.style.top)+calendarTile.offsetHeight+12);
saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));
assert.equal(saved.items.find(x=>x.id==='namedays').column,Number(calendarTile.dataset.layoutColumn));
media.matches=false;media.change();assert.equal(layout.hidden,false);assert.equal(main.parentElement,mainColumn);assert.equal(board.children.length,1);
assert.equal(board.children[0].querySelector('.dashboard-note-text').value,'Doma pēc atiestatīšanas');
const catalog=doc.getElementById('widgetCatalog');assert(catalog);
const catalogSearch=catalog.walk().find(x=>x.attributes['aria-label']==='Meklēt logrīku');
catalogSearch.value='noskaņa';catalogSearch.oninput();
const choices=catalog.querySelector('.widget-catalog-grid').children;
assert.equal(choices.filter(x=>!x.hidden).length,1);assert.equal(choices.find(x=>!x.hidden).attributes['aria-label'],'Pievienot logrīku: Dienas noskaņa');
catalogSearch.value='';catalogSearch.oninput();assert.equal(choices.filter(x=>!x.hidden).length,15);
const calculatorChoice=catalog.walk().find(x=>x.attributes['aria-label']==='Pievienot logrīku: Kalkulators');
calculatorChoice.onclick();
saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));
assert(saved.items.some(x=>x.widgetType==='calculator'),'A catalogue choice creates a saved typed widget');
assert.equal(board.children.length,2,'Additional widgets remain available on mobile');
assert(board.walk().some(x=>x.className==='test-widget-calculator'));
reset.onclick();
saved=JSON.parse(store.get('mana-ikdiena-dashboard-v1'));
assert(saved.items.some(x=>x.widgetType==='calculator'),'Layout reset must not delete widget data');
console.log('Dashboard controls, live task preservation, drag, resize, notes, reset and mobile fallback verified.');
