const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const tools=require('../widgets.js');
assert.equal(tools.catalog.length,49);
assert.equal(tools.catalog.filter(x=>x.fresh).length,34);
const campaign=new URL(tools.buildCampaignUrl({url:'https://example.com/path?foo=1&utm_source=old#top',source:'mailjet',medium:'email',campaign:'Black Friday',content:'A/B & C'}));
assert.equal(campaign.hash,'#top');assert.equal(campaign.searchParams.get('foo'),'1');assert.equal(campaign.searchParams.get('utm_source'),'mailjet');assert.equal(campaign.searchParams.get('utm_content'),'A/B & C');
assert.equal(tools.buildCampaignUrl({url:'javascript:alert(1)'}),null);
assert.equal(tools.textStats('Sveika, pasaule!\nOtra rinda.').words,4);assert.equal(tools.textStats('🙂 ā').characters,3);
assert.deepEqual([...tools.shuffledDeck(()=>0)].sort(),[0,0,1,1,2,2,3,3,4,4,5,5]);
for(const entry of tools.catalog){const data=tools.normalize(entry.type,{});assert.deepEqual(tools.normalize(entry.type,JSON.parse(JSON.stringify(data))),data,'Widget configuration survives reload: '+entry.type)}
assert.equal(tools.pickIndex(3,0),0);assert.equal(tools.pickIndex(3,1),2);assert.equal(tools.pickIndex(0),-1);
assert.equal(tools.periodProgress('2028-02-29','year').total,366);
assert.equal(tools.periodProgress('2026-11-23','week').elapsed,1);
assert.equal(tools.periodProgress('2026-11-29','week').percent,100);
assert.equal(tools.stopwatchElapsed({elapsed:250,running:true,startedAt:1000},3000),2250);
assert.equal(tools.normalize('goal',{target:0,current:-10}).target,1);
for(const [expression,result] of [['250 × 20%',50],['(250 + 50) * 20%',60],['-5 * -2',10],['1,5 + 2,5',4],['100 / (2 + 3)',20]])assert.equal(tools.calculate(expression),result);
for(const bad of ['1/0','alert(1)','1e10','(1+2','NaN','<script>'])assert.throws(()=>tools.calculate(bad));
assert.equal(tools.safeUrl('example.com'),'https://example.com/');
for(const unsafe of ['javascript:alert(1)','data:text/html,hello','file:///C:/secret','ftp://example.com','https://user:password@example.com'])assert.equal(tools.safeUrl(unsafe),null);
assert.equal(tools.normalize('focus',{minutes:50}).remaining,3000);
assert.equal(tools.remaining({running:true,endAt:10000},9000),1);assert.equal(tools.remaining({running:true,endAt:10000},11000),0);
assert.equal(tools.validDate('2026-02-30'),false);assert.equal(tools.validDate('2028-02-29'),true);
assert.equal(tools.normalize('links',{links:[{url:'javascript:bad'},{url:'https://example.com'}]}).links.length,1);
assert.equal(tools.normalize('worldclock',{zones:['Bad/Zone','Europe/Riga','Europe/Riga']}).zones.length,1);
let now=Date.parse('2026-11-24T10:00:00Z'),interval,visibility,persisted=0,nextTimeout=0;const timeouts=new Map();
class TestDate extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.attributes={};this.className='';this.style={}}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n)}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  setAttribute(key,value){this.attributes[key]=value}
  get isConnected(){return this===body||!!this.parentElement?.isConnected}
  walk(){return this.children.flatMap(n=>[n,...n.walk()])}
}
const body=new Element('body'),doc={hidden:false,createElement:tag=>new Element(tag),addEventListener:(name,fn)=>{if(name==='visibilitychange')visibility=fn}},win={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../widgets.js'),'utf8'),{window:win,document:doc,Date:TestDate,Intl,URL,setInterval:fn=>interval=fn,setTimeout:fn=>{timeouts.set(++nextTimeout,fn);return nextTimeout},clearTimeout:id=>timeouts.delete(id),console});
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
const wheel=mount('wheel');wheel.button('Griezt ratu').onclick();assert(wheel.item.widgetData.options.includes(wheel.item.widgetData.result));assert(wheel.find('widget-wheel-disc').style.transform.startsWith('rotate('));
wheel.find('widget-options').value='Darbs A\nDarbs B';wheel.find('widget-options').oninput();assert.equal(wheel.item.widgetData.options.length,2);
const goal=mount('goal');goal.button('+ Solis').onclick();assert.equal(goal.item.widgetData.current,1);assert.equal(goal.find('widget-big').textContent,'10%');assert.equal(goal.find('widget-goal-track').attributes['aria-valuenow'],'10');
const mood=mount('mood');const good=mood.all().find(n=>n.attributes['aria-label']==='Labi');good.onclick();assert.equal(Object.values(mood.item.widgetData.days)[0].mood,4);mood.find('widget-mood-note').value='Laba tikšanās';mood.find('widget-mood-note').oninput();assert.equal(Object.values(mood.item.widgetData.days)[0].note,'Laba tikšanās');
now+=86400000;interval();assert(mood.all().filter(n=>n.attributes['aria-pressed']).every(n=>n.attributes['aria-pressed']==='false'),'A new day starts without changing yesterday\'s mood');
const stopwatch=mount('stopwatch');stopwatch.button('Sākt').onclick();now+=65000;interval();assert.equal(stopwatch.find('widget-timer').textContent,'00:01:05');stopwatch.button('Aplis').onclick();assert.equal(stopwatch.item.widgetData.laps[0],65000);stopwatch.button('Apturēt').onclick();now+=5000;interval();assert.equal(stopwatch.find('widget-timer').textContent,'00:01:05');
const ideas=mount('ideas');const topic=ideas.all().find(n=>n.tagName==='input');topic.value='CARELIKA';topic.oninput();ideas.button('Sajaukt ideju').onclick();assert(ideas.item.widgetData.result.includes('CARELIKA'));
const progress=mount('timeprogress');assert.equal(progress.find('widget-period-ring').children[0].textContent,tools.periodProgress(api.dayInRiga(),'month').percent+'%');
const utm=mount('utm',{url:'https://example.com',source:'mailjet',medium:'email',campaign:'Test'});assert(utm.find('widget-utm-result').value.includes('utm_campaign=Test'));
const words=mount('textstats',{text:'Viens divi trīs'});assert.equal(words.find('widget-text-stats').children[2].children[0].textContent,'3');
const memory=mount('memory'),deck=memory.item.widgetData.deck;const match=deck.findIndex((x,i)=>i>0&&x===deck[0]);memory.find('widget-memory-grid').children[0].onclick();memory.find('widget-memory-grid').children[match].onclick();assert.equal(memory.item.widgetData.matched.length,1);assert.equal(memory.item.widgetData.moves,1);
const a=deck.findIndex(x=>!memory.item.widgetData.matched.includes(x)),b=deck.findIndex(x=>x!==deck[a]&&!memory.item.widgetData.matched.includes(x));memory.find('widget-memory-grid').children[a].onclick();memory.find('widget-memory-grid').children[b].onclick();assert.equal(timeouts.size,1);const hide=[...timeouts.values()][0];timeouts.clear();hide();assert.equal(memory.find('widget-memory-grid').children.filter(x=>x.attributes['aria-pressed']==='true').length,2);
const completedGame=mount('memory',{deck:[0,0,1,1,2,2,3,3,4,4,5,5]});for(let i=0;i<6;i++){completedGame.find('widget-memory-grid').children[i*2].onclick();completedGame.find('widget-memory-grid').children[i*2+1].onclick()}assert.equal(completedGame.item.widgetData.best,6);completedGame.button('Jauna spēle').onclick();assert.equal(completedGame.item.widgetData.best,6);assert.equal(completedGame.item.widgetData.matched.length,0);
assert(persisted>=10);
assert.deepEqual(tools.normalize('checklist',JSON.parse(JSON.stringify(checklist.item.widgetData))).items.map(x=>x.done),[true]);
console.log('Widget catalogue, calculation safety, links, timers, daily habits, checklists, countdowns, clocks and persistence verified.');
