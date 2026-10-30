const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8');
assert(!html.includes('—'));
const assetDir=path.dirname(process.argv[2]||path.join(__dirname,'..','index.html'));
const logo=fs.readFileSync(path.join(assetDir,'mv-logo.png'));
const manifest=JSON.parse(fs.readFileSync(path.join(assetDir,'manifest.webmanifest'),'utf8'));
assert.equal(logo.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(manifest.icons[0].sizes,`${logo.readUInt32BE(16)}x${logo.readUInt32BE(20)}`);
assert(html.includes('<img src="./mv-logo.png" alt=""'));
assert(html.includes('<link rel="icon" type="image/png" href="./mv-logo.png">'));
assert(html.includes('<link rel="manifest" href="./manifest.webmanifest">'));
const planner=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean)[0];
new Function(planner);
function section(start,end){let a=planner.indexOf(start),b=planner.indexOf(end,a);assert(a>=0&&b>a,`Missing ${start}`);return planner.slice(a,b)}
const motivationElements={dailyMotivationText:{dataset:{},textContent:''},dailyMotivationExplanation:{textContent:''},dailyMotivation:{open:true}};
const motivation=new Function('$',section('const motivationMessages=[','renderDailyMotivation();setInterval')+'return {motivationMessages,motivationExplanations,motivationForDay,motivationExplanationForDay,currentRigaDay,renderDailyMotivation}')(
  selector=>motivationElements[selector.slice(1)]);
assert(motivation.motivationMessages.length>=30);
assert.equal(motivation.motivationExplanations.length,motivation.motivationMessages.length);
assert.equal(new Set(motivation.motivationMessages).size,motivation.motivationMessages.length);
assert(motivation.motivationMessages.every(message=>message.length<=150));
assert(motivation.motivationExplanations.every(explanation=>explanation.length>50&&explanation.length<=250));
assert(!motivation.motivationMessages.some(message=>message.includes('—')));
assert.equal(motivation.currentRigaDay(new Date('2026-10-28T21:59:00Z')),'2026-10-28');
assert.equal(motivation.currentRigaDay(new Date('2026-10-28T22:01:00Z')),'2026-10-29');
motivation.renderDailyMotivation(new Date('2026-10-28T22:01:00Z'));
assert.equal(motivationElements.dailyMotivationText.textContent,motivation.motivationForDay('2026-10-29'));
assert.equal(motivationElements.dailyMotivationExplanation.textContent,motivation.motivationExplanationForDay('2026-10-29'));
assert.equal(motivationElements.dailyMotivation.open,false);
motivationElements.dailyMotivation.open=true;
motivation.renderDailyMotivation(new Date('2026-10-28T22:20:00Z'));
assert.equal(motivationElements.dailyMotivation.open,true,'Explanation stays open during the same day');
assert.notEqual(motivation.motivationForDay('2026-10-29'),motivation.motivationForDay('2026-10-30'));
assert(html.includes('class="motivation-strip"')&&html.includes('<details class="daily-motivation"'));
const recurrence=new Function(section('function occurs(t,d){','function isDone(t,d){')+'return {occurs,repeatLabel}')();
const repeatTask={date:'2026-10-29',repeat:'weekly',repeatInterval:2};
assert.equal(recurrence.occurs(repeatTask,'2026-11-05'),false);
assert.equal(recurrence.occurs(repeatTask,'2026-11-12'),true);
assert.equal(recurrence.repeatLabel(repeatTask),'Katru otro nedēļu');
assert.equal(recurrence.occurs({...repeatTask,repeatInterval:undefined},'2026-11-05'),true,'Existing weekly tasks keep their schedule');
assert.equal(recurrence.occurs({...repeatTask,repeat:'daily'},'2026-10-30'),false);
assert.equal(recurrence.occurs({...repeatTask,repeat:'daily'},'2026-11-02'),true);
assert.equal(recurrence.occurs({...repeatTask,repeat:'monthly'},'2026-11-30'),false);
assert.equal(recurrence.occurs({...repeatTask,repeat:'monthly'},'2026-12-29'),true);
assert.equal(recurrence.occurs({...repeatTask,repeat:'yearly'},'2027-10-29'),false);
assert.equal(recurrence.occurs({...repeatTask,repeat:'yearly'},'2028-10-30'),true);
assert(html.includes('id="repeatInterval" min="1" max="12"'));

const tasks=[
  {id:'open-old',text:'Old',date:'2026-08-10',done:false,repeat:'none'},
  {id:'open-new',text:'New',date:'2026-11-10',done:false,repeat:'none'},
  {id:'done-old',text:'Done old',date:'2026-07-01',done:true,completedAt:'2026-08-01T10:00:00Z',repeat:'none'},
  {id:'done-new',text:'Done new',date:'2026-09-01',done:true,completedAt:'2026-10-01T10:00:00Z',repeat:'none'},
  {id:'repeat',text:'Weekly',date:'2026-09-01',repeat:'weekly',completedDates:{'2026-09-03':true,'2026-10-01':true}},
  {id:'private',text:'Private',date:'2026-10-29',done:false,repeat:'none',workspace:'personal'}
];
const date={value:'2026-10-29'};
const occurs=(t,d)=>t.date===d;
const isDone=(t,d)=>t.repeat==='weekly'?!!t.completedDates?.[d]:!!t.done;
const views=new Function('tasks','filter','date','today','occurs','isDone','workspaceTasks',section('let expandedTasks={};','function render(){')+'return {visibleEntries,setFilter:value=>filter=value}')(
  tasks,'all',date,()=> '2026-10-29',occurs,isDone,()=>tasks.filter(t=>t.workspace!=='personal'));
assert.deepEqual(views.visibleEntries().map(t=>t.id),['open-old','open-new','repeat'],'All excludes completed work across months');
views.setFilter('done');
assert.deepEqual(views.visibleEntries().map(t=>[t.id,t._viewDate]),[
  ['done-old','2026-08-01'],['done-new','2026-10-01'],['repeat','2026-09-03'],['repeat','2026-10-01']
],'Done includes every completed occurrence from all months');

let saved=0;
const carryTasks=[
  {id:'single',date:'2026-10-29',done:false,repeat:'none'},
  {id:'finished',date:'2026-10-29',done:true,repeat:'none'},
  {id:'project',date:'2026-10-29',done:false,repeat:'none',project:true},
  {id:'repeat',date:'2026-10-29',done:false,repeat:'weekly'}
];
const carrying=new Function('tasks','autoCarry','today','save',section('function nextWorkday(value){',"$('#autoCarry').checked")+'return {carryOverdue,nextWorkday}')(
  carryTasks,true,()=> '2026-10-31',()=>saved++);
assert.equal(carrying.nextWorkday('2026-10-30'),'2026-11-02');
assert.equal(carrying.carryOverdue(),true);
assert.equal(saved,1);
assert.deepEqual(carryTasks.map(t=>t.date),['2026-11-02','2026-10-29','2026-10-29','2026-10-29']);

const sidebarSource=section('function setupSidebarWidth(){','const motivationMessages=[');
const listeners={},attrs={},stored={};let width='',desktop=true;
const layout={clientWidth:1100,style:{setProperty(_,value){width=value}},getBoundingClientRect(){return {right:1100}}};
const handle={classList:{add(){},remove(){}},setAttribute(name,value){attrs[name]=value},getAttribute(name){return attrs[name]},setPointerCapture(){},addEventListener(name,fn){listeners[name]=fn}};
const windowFake={matchMedia(){return {get matches(){return desktop}}},addEventListener(){}};
const setupSidebar=new Function('window','document','$','localStorage',sidebarSource+'return setupSidebarWidth')(
  windowFake,{querySelector(){return layout}},()=>handle,{getItem:key=>stored[key],setItem(key,value){stored[key]=value}});
setupSidebar();
assert.equal(width,'320px');
listeners.pointerdown({pointerId:1,clientX:700,preventDefault(){}});
listeners.pointermove({clientX:650});listeners.pointerup();
assert.equal(width,'444px');assert.equal(stored['mana-diena-side-width'],'444');
listeners.keydown({key:'ArrowRight',preventDefault(){}});
assert.equal(width,'424px');
desktop=false;listeners.pointerdown({pointerId:2,clientX:800,preventDefault(){}});
assert.equal(width,'424px','Mobile cannot resize panels');
assert(/@media\(max-width:850px\)\{\.layout\{grid-template-columns:minmax\(0,1fr\)\}\.column-resizer\{display:none\}/.test(html));

class Element{constructor(){this.children=[];this.dataset={};this.value=''}append(...nodes){this.children.push(...nodes)}setAttribute(){}addEventListener(){}}
const commentTasks=[{id:'commented',text:'Task',comments:[{id:'c1',text:'Old comment',createdAt:'2026-10-29T10:00:00Z'}]}];
const commentEditing={},commentEditDrafts={},commentDrafts={},commentOpen={};let commentSaves=0,rerenders=0;
const renderComments=new Function('document','appendLinks','commentEditing','commentEditDrafts','commentDrafts','commentOpen','tasks','save','render','confirm',section('function renderComments(t){','let commentOpen={}')+'return renderComments')(
  {createElement:()=>new Element()},()=>{},commentEditing,commentEditDrafts,commentDrafts,commentOpen,commentTasks,()=>commentSaves++,()=>rerenders++,()=>true);
const panel=renderComments(commentTasks[0]);
panel.children[1].children[1].children[0].onclick();
assert.equal(rerenders,1);
const editForm=renderComments(commentTasks[0]).children[1].children[0];
editForm.children[0].value='Updated comment';editForm.onsubmit({preventDefault(){}});
assert.equal(commentTasks[0].comments[0].text,'Updated comment');
renderComments(commentTasks[0]).children[1].children[1].children[1].onclick();
assert.equal(commentTasks[0].comments.length,0);
assert.equal(commentSaves,2);
console.log('Global views, automatic carry, sidebar resizing, and comment controls verified.');
