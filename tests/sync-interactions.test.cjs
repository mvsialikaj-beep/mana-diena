const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean);
assert.equal(scripts.length, 2, 'Expected the planner and sync scripts');
scripts.forEach(script => new Function(script));
const [planner, sync] = scripts;
function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `Missing source section: ${start}`);
  return source.slice(from, to);
}

let renders = 0;
const original = [{ id: 'one', text: 'Uzdevums', date: '2026-10-29', done: false }];
const syncHarness = new Function('tasks', 'snapshot', 'index', 'localStorage', 'key', 'render',
  section(sync, 'function stableTaskData(value){', 'function show(msg){') +
  'return {sameTaskSet,applyIncoming,getTasks:()=>tasks}')(
    original, new Map(), () => new Map(), { setItem() {} }, 'test', () => renders++);

for (let i = 0; i < 3; i++) {
  assert.equal(syncHarness.applyIncoming([{ done: false, date: '2026-10-29', text: 'Uzdevums', id: 'one' }]), false);
  assert.equal(syncHarness.getTasks()[0], original[0], 'Polling must keep live task references');
}
assert.equal(renders, 0, 'Unchanged polls must not interrupt input');
assert(syncHarness.sameTaskSet(
  [{ id: 'one', checklist: { single: { a: true, b: false } } }, { id: 'two' }],
  [{ id: 'two' }, { checklist: { single: { b: false, a: true } }, id: 'one' }]));
assert.equal(syncHarness.applyIncoming([{ id: 'one', text: 'Uzdevums', date: '2026-10-29', done: false, description: 'Remote edit' }]), true);
assert.equal(renders, 1);

let saved = 0;
const filterButtons = ['open', 'done'].map(value => ({
  dataset: { filter: value }, classList: { toggle() {} }
}));
const completion = new Function('save', 'document', 'filter',
  section(planner, 'function setCompletion(t,day,done){', 'function occurs(t,d){') +
  'return setCompletion')(() => saved++, { querySelectorAll: () => filterButtons }, 'open');
const checkboxHandler = section(planner, 'check.onchange=()=>{', 'let body=document.createElement');
const check = { checked: true };
const staleTask = original[0];
const tasks = syncHarness.getTasks();
const handler = new Function('check', 'tasks', 't', 'date', 'setCompletion',
  checkboxHandler + 'return check.onchange')(check, tasks, staleTask,
    { value: '2026-10-29' }, completion);
handler();
assert.equal(tasks[0].done, true, 'Checkbox must update the current task after a remote edit');
check.checked = false;
handler();
assert.equal(tasks[0].done, false, 'Completed task must be reversible');

class Element {
  constructor() { this.children = []; this.dataset = {}; this.value = ''; }
  append(...children) { this.children.push(...children); }
  setAttribute() {}
  addEventListener() {}
}
const drafts = {}, open = {};
const comments = new Function('document', 'appendLinks', 'commentDrafts', 'commentOpen', 'tasks', 'save',
  section(planner, 'function renderComments(t){', 'let commentOpen={}') +
  'return renderComments')({ createElement: () => new Element() }, () => {}, drafts, open, tasks, () => saved++);
const panel = comments(staleTask);
const form = panel.children.at(-1);
const input = form.children[0];
input.value = 'Pārbaudes komentārs';
input.oninput();
assert.equal(comments(staleTask).children.at(-1).children[0].value, input.value,
  'Comment draft must survive a redraw');
form.onsubmit({ preventDefault() {} });
assert.equal(tasks[0].comments[0].text, input.value,
  'Comment must be added to the current task after a remote edit');
assert.equal(open.one, true);
assert.equal(saved, 3);
console.log('Sync, checkbox, and comment regression tests passed.');

