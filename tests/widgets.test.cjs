const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const tools=require('../widgets.js');
assert.equal(tools.catalog.length,9);
for(const [expression,result] of [['250 × 20%',50],['(250 + 50) * 20%',60],['-5 * -2',10],['1,5 + 2,5',4],['100 / (2 + 3)',20]])assert.equal(tools.calculate(expression),result);
for(const bad of ['1/0','alert(1)','1e10','(1+2','NaN','<script>'])assert.throws(()=>tools.calculate(bad));
assert.equal(tools.safeUrl('example.com'),'https://example.com/');
for(const unsafe of ['javascript:alert(1)','data:text/html,hello','file:///C:/secret','ftp://example.com','https://user:password@example.com'])assert.equal(tools.safeUrl(unsafe),null);
assert.equal(tools.normalize('focus',{minutes:50}).remaining,3000);
assert.equal(tools.remaining({running:true,endAt:10000},9000),1);assert.equal(tools.remaining({running:true,endAt:10000},11000),0);
assert.equal(tools.validDate('2026-02-30'),false);assert.equal(tools.validDate('2028-02-29'),true);
assert.equal(tools.normalize('links',{links:[{url:'javascript:bad'},{url:'https://example.com'}]}).links.length,1);
assert.equal(tools.normalize('worldclock',{zones:['Bad/Zone','Europe/Riga','Europe/Riga']}).zones.length,1);
let now=Date.parse('2026-11-24T10:00:00Z'),interval,visibility,persisted=0;
class TestDate extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.attributes={};this.className=''}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n)}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  setAttribute(key,value){this.attributes[key]=value}
  get isConnected(){return this===body||!!this.parentElement?.isConnected}
  walk(){return this.children.flatMap(n=>[n,...n.walk()])}
}
const body=new Element('body'),doc={hidden:false,createElement:tag=>new Element(tag),addEventListener:(name,fn)=>{if(name==='visibilitychange')visibility=fn}},win={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../widgets.js'),'utf8'),{window:win,document:doc,Date:TestDate,Intl,URL,setInterval:fn=>interval=fn,console});
const api=win.PLANNER_WIDGETS;
function mount(type,data={}){const host=new Element();body.append(host);const item={id:type,title:type,widgetType:type,widgetData:data};api.mount(host,item,()=>persisted++);return {item,host,all:()=>host.walk(),find:cls=>host.walk().find(n=>n.className.split(' ').includes(cls)),button:label=>host.walk().find(n=>n.tagName==='button'&&n.textContent===label)}}
const timer=mount('focus');timer.button('Sākt').onclick();assert(timer.item.widgetData.running);
now+=60000;interval();assert.equal(timer.find('widget-timer').textContent,'24:00');
timer.button('Pauze').onclick();assert.equal(timer.item.widgetData.remaining,1440);assert(!timer.item.widgetData.running);
timer.button('Atiestatīt').onclick();assert.equal(timer.find('widget-timer').textContent,'25:00');
timer.button('5 min pauze').onclick();timer.button('Sākt').onclick();now+=301000;interval();assert.equal(timer.item.widgetData.remaining,0);assert(!timer.item.widgetData.running);
const checklist=mount('checklist'),entry=checklist.all().find(n=>n.placeholder==='Jauns punkts');entry.value='Pārbaudīt kampaņu';checklist.find('widget-inline-form').onsubmit({preventDefault(){}});
assert.equal(checklist.item.widgetData.items.length,1);const check=checklist.all().find(n=>n.type==='checkbox');check.checked=true;check.onchange();assert(checklist.item.widgetData.items[0].done);
const habit=mount('habits'),habitEntry=habit.all().find(n=>n.placeholder==='Jauns ieradums');habitEntry.value='Pastaiga';habit.find('widget-inline-form').onsubmit({preventDefault(){}});const habitCheck=habit.all().find(n=>n.type==='checkbox');habitCheck.checked=true;habitCheck.onchange();assert.equal(Object.keys(habit.item.widgetData.checks['2026-11-24']).length,1);
now+=86400000;interval();assert.equal(habit.all().find(n=>n.type==='checkbox').checked,false,'Habit checks reset for the new day while keeping yesterday');
const links=mount('links'),linkFields=links.all().filter(n=>n.tagName==='input');linkFields[0].value='Rīks';linkFields[1].value='javascript:bad';links.find('widget-form').onsubmit({preventDefault(){}});assert.equal(links.item.widgetData.links.length,0);
linkFields[1].value='example.com';links.find('widget-form').onsubmit({preventDefault(){}});assert.equal(links.find('widget-link').href,'https://example.com/');assert.equal(links.find('widget-link').rel,'noopener noreferrer');
const calculator=mount('calculator');const expression=calculator.all().find(n=>n.tagName==='input');expression.value='250 * 20%';expression.oninput();assert.equal(calculator.find('widget-result').textContent,'50');
const percent=mount('percent'),values=percent.all().filter(n=>n.tagName==='input'),mode=percent.all().find(n=>n.tagName==='select');values[0].value='250';values[1].value='10';mode.value='discount';mode.onchange();assert.equal(percent.find('widget-result').textContent,'225');
const countdown=mount('countdown',{date:'2026-11-25'});assert.equal(countdown.find('widget-big').textContent,'Šodien');
const clocks=mount('worldclock');assert.equal(clocks.item.widgetData.zones.length,3);assert(/^\d\d:\d\d$/.test(clocks.find('widget-clock').textContent));
assert(persisted>=10);
assert.deepEqual(tools.normalize('checklist',JSON.parse(JSON.stringify(checklist.item.widgetData))).items.map(x=>x.done),[true]);
console.log('Widget catalogue, calculation safety, links, timers, daily habits, checklists, countdowns, clocks and persistence verified.');
