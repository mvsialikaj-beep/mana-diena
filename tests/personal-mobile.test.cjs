const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.attributes={};this.dataset={};this.className='';this.open=false;this.style={setProperty(){}};this.classList={toggle:(name,on)=>{const items=new Set(this.className.split(' ').filter(Boolean));if(on)items.add(name);else items.delete(name);this.className=[...items].join(' ')}}}
  remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null}}
  append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n)}}prepend(n){n.remove();n.parentElement=this;this.children.unshift(n)}
  replaceChildren(...nodes){for(const node of [...this.children])node.remove();this.append(...nodes)}
  before(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this),0,n)}after(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this)+1,0,n)}
  setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){this.events[k]=fn}showModal(){this.open=true}close(){this.open=false;this.events.close?.()}
  walk(){return [this,...this.children.flatMap(x=>x.walk())]}
}
function harness(saved={}){
  const body=new Element('body'),root=new Element('html'),column=new Element('div'),main=new Element('main'),side=new Element('aside'),calendar=new Element('section'),glance=new Element('div'),month=new Element('section'),namedays=new Element('section'),panel=new Element('details'),settingsDialog=new Element('dialog'),settings=new Element('div');body.append(column,side,settingsDialog);column.append(main);main.append(panel);side.append(calendar,namedays);calendar.append(glance,month);settingsDialog.append(settings);root.dataset.workspace='personal';settingsDialog.querySelector=()=>settings;
  const store=new Map([['mana-ikdiena-personal-mobile-v1',JSON.stringify(saved)]]),media={matches:true,addEventListener:(_,fn)=>media.change=fn},callbacks=new Map();
  const document={body,documentElement:root,createElement:tag=>new Element(tag),createComment:()=>new Element('#comment'),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text}),getElementById:id=>({taskFormPanel:panel,calendarGlance:glance,sideCalendar:month,settingsDialog})[id],querySelector:selector=>selector==='main.main'?main:selector==='.namedays'?namedays:selector==='.layout>.side:not(.progress-column)'?side:null};
  const window={matchMedia:()=>media,innerWidth:390,innerHeight:844},MutationObserver=class{constructor(fn){this.callback=fn}observe(target){callbacks.set(target,this.callback)}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile-ui.js'),'utf8'),{window,document,MutationObserver,localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}});
  return {body,root,column,main,side,calendar,glance,month,namedays,settings,store,media,window,changeWorkspace(value){root.dataset.workspace=value;callbacks.get(root)()}};
}
const h=harness(),clock=h.body.walk().find(x=>x.id==='personalClockCard'),calendar=h.body.walk().find(x=>x.id==='personalCalendarCard');
assert.deepEqual(h.column.children.filter(x=>x.tagName!=='#comment'),[clock,calendar,h.main,h.namedays],'The four mobile blocks have the requested order');assert.equal(h.glance.parentElement,clock);assert.equal(h.month.parentElement,calendar);
const toggle=key=>h.settings.walk().find(x=>x.id==='personal-mobile-'+key);
for(const [key,target]of [['clock',clock],['calendar',calendar],['tasks',h.main],['namedays',h.namedays]]){toggle(key).checked=false;toggle(key).onchange();assert(key==='clock'||key==='calendar'?target.hidden:target.className.includes('personal-mobile-hidden'));assert.equal(JSON.parse(h.store.get('mana-ikdiena-personal-mobile-v1'))[key],false)}
h.changeWorkspace('work');assert(clock.hidden&&calendar.hidden);assert(!h.main.className.includes('personal-mobile-hidden'));assert(!h.namedays.className.includes('personal-mobile-hidden'));assert.equal(h.glance.parentElement,h.main);assert.equal(h.month.parentElement,h.calendar);assert.equal(h.namedays.parentElement,h.side);
h.changeWorkspace('personal');assert(clock.hidden&&calendar.hidden,'Hidden preferences survive workspace changes');
h.media.matches=false;h.media.change();assert.equal(h.glance.parentElement,h.calendar);assert.equal(h.month.parentElement,h.calendar);assert.equal(h.namedays.parentElement,h.side);assert(!h.main.className.includes('personal-mobile-hidden'));
const custom=new Element('div');h.body.append(custom);custom.append(h.namedays);h.window.PLANNER_MOBILE_UI.update();assert.equal(h.namedays.parentElement,custom,'Desktop dashboard placement is preserved');
const restored=harness({clock:false,calendar:false,tasks:true,namedays:false});assert(restored.body.walk().find(x=>x.id==='personalClockCard').hidden);assert(restored.body.walk().find(x=>x.id==='personalCalendarCard').hidden);assert(!restored.main.className.includes('personal-mobile-hidden'));
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const source=html.slice(html.indexOf('function renderSideCalendar(){'),html.indexOf('function alignSideMonth(){'));
let selected='2026-11-25';const monthRoot=new Element('section'),date={value:selected,dispatchEvent(e){this.changed=e.type;selected=this.value}};
const render=new Function('$','document','activeWorkspace','isWorkWeekend','workHoliday','workspaceTasks','occurs','today','date','Event','let sideMonth=new Date(2026,10,1,12),sideWeekMode=false;'+source+'return renderSideCalendar')(
  ()=>monthRoot,{createElement:tag=>new Element(tag)},'personal',()=>false,()=>'',()=>[],()=>false,()=>'2026-11-25',date,class{constructor(type){this.type=type}});
render();const grid=monthRoot.children.find(x=>x.className==='side-calendar-grid');assert.deepEqual(grid.children.slice(0,7).map(x=>x.textContent),['P','O','T','C','Pk','S','Sv']);grid.children[7+10].onclick();assert.equal(date.changed,'change');assert.notEqual(selected,'2026-11-25','Selecting a calendar day changes the existing planner date');
console.log('Personal mobile four-block order, hide preferences, persistence, workspace/desktop restoration and calendar date selection verified.');
