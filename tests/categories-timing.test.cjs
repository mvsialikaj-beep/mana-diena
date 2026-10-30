const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8');
const planner=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean)[0];
new Function(planner);
function section(start,end){let a=planner.indexOf(start),b=planner.indexOf(end,a);assert(a>=0&&b>a,`Missing ${start}`);return planner.slice(a,b)}

const categorySource=section('function categoryRecord(','function refreshCategoryOptions(){');
function makeCategories(tasks,activeWorkspace='work',confirmResult=true){
  let saves=0,questions=[];const cf={value:'Amazon'},select={value:'Amazon'};
  const api=new Function('tasks','activeWorkspace','defaultCategories','cf','$','confirm','save','today','document','openNewTask',
    `function taskWorkspace(t){return t.workspace==='personal'?'personal':'work'}function workspaceTasks(){return tasks.filter(t=>taskWorkspace(t)===activeWorkspace)}`+
    categorySource+'return {categorySequence,deleteCategory,categoryRecord,getTasks:()=>tasks}')(
    tasks,activeWorkspace,['Amazon','Mācības'],cf,()=>select,message=>{questions.push(message);return confirmResult},()=>saves++,()=> '2026-10-30',{},()=>{});
  return {api,cf,select,questions,getSaves:()=>saves};
}
const workTask={id:'work',text:'Darbs',date:'2026-10-30',done:false,category:'Amazon'};
const personalTask={id:'personal',text:'Privāts',date:'2026-10-30',done:false,category:'Amazon',workspace:'personal'};
const categories=makeCategories([workTask,personalTask]);
assert(categories.api.categorySequence().includes('Amazon'));
categories.api.deleteCategory('Amazon');
assert.equal(workTask.category,'');
assert.equal(personalTask.category,'Amazon','Other workspace stays untouched');
assert(!categories.api.categorySequence().includes('Amazon'),'Default category stays hidden');
assert.deepEqual(categories.api.categoryRecord().hiddenCategories,['Amazon']);
assert.equal(categories.cf.value,'');
assert.equal(categories.select.value,'');
assert.equal(categories.getSaves(),1);
assert(categories.questions[0].includes('1 uzdevums paliks saglabāts'));
categories.api.deleteCategory('Bez kategorijas');
assert.equal(categories.getSaves(),1,'Uncategorized cannot be deleted');

const customTask={id:'custom-task',text:'Darbs',date:'2026-10-30',done:false,category:'Vecā'};
const customCategory={id:'custom-category',kind:'category',workspace:'personal',text:'Vecā',date:'2026-10-30',done:false};
const personal=makeCategories([customTask,customCategory], 'personal');
personal.api.deleteCategory('Vecā');
assert.equal(personal.api.getTasks().some(t=>t.id==='custom-category'),false);
assert.equal(customTask.category,'Vecā','A work task with the same category name stays untouched');
assert.deepEqual(personal.api.categoryRecord().hiddenCategories,['Vecā']);
const cancelled=makeCategories([{...workTask,category:'Amazon'}],'work',false);
cancelled.api.deleteCategory('Amazon');
assert.equal(cancelled.getSaves(),0);
assert(cancelled.api.categorySequence().includes('Amazon'));
assert(html.includes('Pārvaldīt kategorijas'));
assert(html.includes('record.hiddenCategories=record.hiddenCategories.filter(value=>value!==hiddenName)'),'Deleted categories can be added again');
const safeTask=new Function('t',section('function safeTask(t){','try{reminded=')+'return safeTask(t)');
assert(safeTask(categories.api.categoryRecord()));
assert.equal(safeTask({...categories.api.categoryRecord(),hiddenCategories:[42]}),false);

const orderSource=section('function priorityFirstGroups(','function categoryColor(');
const ordering=new Function('categorySequence','isDone',orderSource+'return {priorityFirstGroups,compareScheduledTasks,compareTimelineTasks}')(
  ()=>['Amazon','Mācības','Bez kategorijas'],()=>false);
const groups=new Map([
  ['Amazon',[{id:'priority',category:'Amazon',priority:true,time:'',text:'Prioritāte'},{id:'afternoon',category:'Amazon',priority:false,time:'14:00',text:'Pēcpusdiena'}]],
  ['Mācības',[{id:'morning',category:'Mācības',priority:false,time:'09:00',text:'Rīts'},{id:'midday',category:'Mācības',priority:true,time:'11:00',text:'Pusdienlaiks'},{id:'normal',category:'Mācības',priority:false,time:'',text:'Bez laika'}]]
]);
const ordered=ordering.priorityFirstGroups(groups,'2026-10-30');
assert.deepEqual(ordered.groups.map(group=>group[2]),['timed','priority','regular']);
assert.deepEqual(ordered.groups[0][1].map(t=>t.id),['morning','midday','afternoon'],'Timed tasks lead in chronological order');
assert.deepEqual(ordered.groups[1][1].map(t=>t.id),['priority']);
assert(ordering.compareTimelineTasks({time:'09:00',priority:false,text:'A'},{time:'',priority:true,text:'B'})<0);
assert(ordering.compareTimelineTasks({time:'09:00',priority:false,text:'A'},{time:'14:00',priority:true,text:'B'})<0);
assert(html.includes("type==='timed'||filter!=='open'&&t.category"),'Timed rows show their category');
assert(html.includes("filter==='open'&&type!=='timed'&&!cf.value"),'Chronological rows cannot be manually reordered');
console.log('Category deletion and chronological timed-task ordering verified.');
