const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];

const start = planner.indexOf('function read(){');
const end = planner.indexOf('function save(){', start);
assert(start >= 0 && end > start);
const storage = new Map();
const state = new Function('localStorage', `let key='account-a',tasks=[];${planner.slice(start, end)}return {read,setKey:value=>key=value,getTasks:()=>tasks}`)({
  getItem: key => storage.get(key) ?? null
});

storage.set('account-a', JSON.stringify([{id:'a',text:'Privāts A',date:'2026-10-30',done:false}]));
state.read();
assert.equal(state.getTasks()[0].id, 'a');
state.setKey('account-b');
state.read();
assert.deepEqual(state.getTasks(), [], 'Another account must never inherit the previous account’s tasks');
storage.set('account-b', '{broken json');
state.read();
assert.deepEqual(state.getTasks(), [], 'Malformed storage must not reveal old tasks');

assert(html.includes('id="openTaskModal"'));
assert(html.includes('id="closeTaskModal"'));
assert(html.includes('<div class="category-filter-actions"><select id="categoryFilter"'));
assert(html.includes("$('#openTaskModal').onclick=()=>openNewTask('')"));
assert(html.includes("window.matchMedia('(min-width:851px)').matches"));
assert(html.includes('@media(min-width:851px){.filters #categoryFilter'));
assert(html.includes('.desktop-add-task,.task-modal-head{display:none}'));
const copySource = planner.slice(planner.indexOf('function uncheckedCopyDescription('), planner.indexOf('function priorityFirstGroups('));
assert(copySource.startsWith('function uncheckedCopyDescription('));
const fields = Object.fromEntries(['taskFormPanel','text','taskDate','description','category','time','dayReminder','reminderTime','repeat','repeatInterval','project','projectDue','priority','submit','cancel','form'].map(id => ['#'+id, {value:'',checked:false,hidden:true}]));
fields['#text'].focus = () => {};
fields['#form'].scrollIntoView = () => {};
let resets = 0;
const copy = new Function('$','date','resetForm','validHexColor','syncReminderFields','syncRepeatFields','syncProjectFields',
  'let editing=null,copyingColor=null;'+copySource+'return {openTaskFromExisting,getMode:()=>({editing,copyingColor})}')(selector => fields[selector],{value:'2026-11-02'},()=>resets++,value=>/^#[0-9a-f]{6}$/i.test(value),()=>{},()=>{},()=>{});
const original = {id:'original',text:'Projekts',date:'2026-10-20',description:'- [x] Gatavs\n- [ ] Jādara',category:'Amazon',time:'14:00',dayReminder:true,reminderTime:'13:30',repeat:'weekly',repeatInterval:2,project:true,projectDue:'2026-11-04',priority:true,color:'#aabbcc',done:true,comments:[{text:'Vecs komentārs'}],checklist:{single:{0:true}}};
copy.openTaskFromExisting(original,true);
assert.equal(resets,1);
assert.equal(fields['#taskDate'].value,'2026-11-02');
assert.equal(fields['#description'].value,'- [ ] Gatavs\n- [ ] Jādara');
assert.equal(fields['#reminderTime'].value,'13:30');
assert.equal(fields['#repeatInterval'].value,2);
assert.equal(fields['#submit'].textContent,'Pievienot kopiju');
assert.deepEqual(copy.getMode(),{editing:null,copyingColor:'#aabbcc'});
assert.equal(original.description,'- [x] Gatavs\n- [ ] Jādara');
copy.openTaskFromExisting(original,false);
assert.equal(fields['#taskDate'].value,'2026-10-20');
assert.equal(fields['#description'].value,original.description);
assert.deepEqual(copy.getMode(),{editing:'original',copyingColor:null});
assert(html.includes("copy.textContent='Kopēt'"));

console.log('Account isolation and desktop task modal verified.');
