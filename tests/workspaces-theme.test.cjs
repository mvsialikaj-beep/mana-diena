const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8');
const planner=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean)[0];
new Function(planner);
function section(start,end){let a=planner.indexOf(start),b=planner.indexOf(end,a);assert(a>=0&&b>a,`Missing ${start}`);return planner.slice(a,b)}

const tasks=[
  {id:'old-work',text:'Darbs',date:'2026-10-30',done:false,category:'Amazon'},
  {id:'work-category',kind:'category',text:'Darba jaunā kategorija',date:'2026-10-30',done:false},
  {id:'work-order',kind:'category-order',text:'Secība',date:'2026-10-30',done:false,categoryOrder:['Amazon','Darba jaunā kategorija','Bez kategorijas']},
  {id:'private-task',text:'Mājas darbs',date:'2026-10-30',done:false,category:'Mājas',workspace:'personal'},
  {id:'private-category',kind:'category',text:'Veselība',date:'2026-10-30',done:false,workspace:'personal'},
  {id:'work-note',kind:'note',text:'Darba doma',date:'2026-10-30',done:false},
  {id:'private-note',kind:'note',text:'Mana doma',date:'2026-10-30',done:false,workspace:'personal'}
];
const scope=new Function('tasks','localStorage',section('const workspaceKey=',"const date=$('#date')")+'return {taskWorkspace,workspaceTasks,select:value=>activeWorkspace=value}')(
  tasks,{getItem:()=>null});
assert.equal(scope.taskWorkspace(tasks[0]),'work','Legacy tasks stay in work');
assert.deepEqual(scope.workspaceTasks().map(t=>t.id),['old-work','work-category','work-order','work-note']);
scope.select('personal');
assert.deepEqual(scope.workspaceTasks().map(t=>t.id),['private-task','private-category','private-note']);

const categorySource=section('function categoryRecord(','function swapCategory(');
const workCategories=new Function('tasks','defaultCategories','activeWorkspace','workspaceTasks',categorySource+'return categorySequence')(
  tasks,['Amazon','Mācības'],'work',()=>tasks.filter(t=>scope.taskWorkspace(t)==='work'))();
const privateCategories=new Function('tasks','defaultCategories','activeWorkspace','workspaceTasks',categorySource+'return categorySequence')(
  tasks,['Amazon','Mācības'],'personal',()=>tasks.filter(t=>scope.taskWorkspace(t)==='personal'))();
assert(workCategories.includes('Amazon')&&workCategories.includes('Mācības')&&workCategories.includes('Darba jaunā kategorija'));
assert.deepEqual(privateCategories,['Mājas','Veselība','Bez kategorijas']);
assert(!privateCategories.includes('Amazon'));

const safeTask=new Function('t',section('function safeTask(t){','try{reminded=')+'return safeTask(t)');
assert(safeTask(tasks[0])&&safeTask(tasks[3]));
assert.equal(safeTask({...tasks[3],workspace:'unknown'}),false);
assert(html.includes("kind:'note',workspace:activeWorkspace"));
assert(html.includes("kind:'category',workspace:activeWorkspace"));
assert(html.includes("kind:'category-order',workspace:activeWorkspace"));
assert(html.includes("let values={text,workspace:activeWorkspace,date:$('#taskDate').value"));
assert(html.includes("workspaceTasks().some(t=>occurs(t,value))"),'Calendar dots use the selected workspace');
assert(html.includes("let day=workspaceTasks().filter(t=>occurs(t,date.value))"),'Progress uses the selected workspace');
assert(html.includes("$('#workspaceHeading').textContent=activeWorkspace==='work'?'Darba uzdevumi':'Ikdienas uzdevumi'"));
class Element{constructor(){this.children=[];this.textContent=''}append(...items){this.children.push(...items)}replaceChildren(...items){this.children=[...items]}setAttribute(){}}
const notesList=new Element(),noteForm={},noteText={value:'Jauna privāta piezīme'};let notesSaved=0;
const notes=new Function('$','document','tasks','workspaceTasks','activeWorkspace','today','save','appendLinks','confirm',section('function renderNotes(){','function nextWorkday')+'return renderNotes')(
  selector=>({'#notesList':notesList,'#noteForm':noteForm,'#noteText':noteText})[selector],
  {createElement:()=>new Element()},tasks,scope.workspaceTasks,'personal',()=> '2026-10-30',()=>notesSaved++,
  (target,value)=>{target.textContent=value},()=>true);
notes();
assert.equal(notesList.children.length,1);
assert.equal(notesList.children[0].children[0].textContent,'Mana doma');
noteForm.onsubmit({preventDefault(){}});
assert.equal(tasks.at(-1).workspace,'personal');
assert.equal(tasks.at(-1).kind,'note');
assert.equal(notesSaved,1);

const navButtons=['work','personal'].map(value=>({dataset:{workspace:value},classList:{toggle(){}},setAttribute(){}}));
const filterButtons=['open','done'].map(value=>({dataset:{filter:value},classList:{toggle(){}},setAttribute(){}}));
const panels={taskFormPanel:{open:true},categoryQuick:{open:true},categoryOrganizer:{open:true},themeToggle:{textContent:'',setAttribute(name,value){this[name]=value}}};
const saved={};let resets=0,renders=0;
const fakeDocument={documentElement:{dataset:{}},querySelectorAll(selector){return selector==='.workspace-switch button'?navButtons:filterButtons}};
const ui=new Function('document','$','localStorage','cf','resetForm','render','filter','activeWorkspace','workspaceKey',section('function updateWorkspaceButtons(){','function setupSidebarWidth(){')+'return {switchWorkspace,getState:()=>({filter,activeWorkspace,activeTheme})}')(
  fakeDocument,selector=>panels[selector.slice(1)],{getItem:key=>saved[key],setItem(key,value){saved[key]=value}},
  {get value(){return this.current},set value(value){this.current=value},current:'Amazon'},()=>resets++,()=>renders++,'done','work','mana-diena-workspace');
ui.switchWorkspace('personal');
assert.deepEqual(ui.getState(),{filter:'open',activeWorkspace:'personal',activeTheme:'light'});
assert.equal(saved['mana-diena-workspace'],'personal');
assert.equal(resets,1);assert.equal(renders,1);
assert.equal(panels.taskFormPanel.open,false);
panels.themeToggle.onclick();
assert.equal(fakeDocument.documentElement.dataset.theme,'dark');
assert.equal(saved['mana-diena-theme'],'dark');
assert.equal(panels.themeToggle['aria-pressed'],'true');
panels.themeToggle.onclick();
assert.equal(fakeDocument.documentElement.dataset.theme,'light');
assert.equal(saved['mana-diena-theme'],'light');
assert(html.includes('data-workspace="work"')&&html.includes('data-workspace="personal"'));
assert(html.includes('id="themeToggle"'));
assert(html.includes('html[data-theme=dark] .card'));
assert(html.includes('color-scheme:dark'));
console.log('Work and personal views, legacy data, categories, and theme toggle verified.');
