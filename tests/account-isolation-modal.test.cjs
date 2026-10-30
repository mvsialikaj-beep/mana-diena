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

console.log('Account isolation and desktop task modal verified.');
