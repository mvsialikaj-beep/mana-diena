const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(root, 'index.html'), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];
const start = planner.indexOf('function reorderTaskItems(');
const end = planner.indexOf('function categoryColor(', start);
assert(start >= 0 && end > start);
assert(html.includes('touch-action:none'));
assert(html.includes("if(filter==='open'){let handle=document.createElement('button')"));
assert(!html.includes("className='order-actions task-order-actions'"));

function classList() {
  const values = new Set();
  return { add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name) };
}
function scenario(pointerType, from, toY, expected, field = 'sortOrder') {
  const tasks = ['a', 'b', 'c'].map((id, sortOrder) => ({ id, sortOrder }));
  let saves = 0;
  const rows = tasks.map((task, i) => ({ id: task.id, classList: classList(), style: {},
    getBoundingClientRect: () => ({ top: 100 + i * 60, height: 44 }) }));
  const group = { querySelectorAll: selector => selector.includes(':scope') ? rows
    : rows.filter(row => row.classList.contains('drop-before') || row.classList.contains('drop-after')) };
  const handle = { captured: false, setPointerCapture() { this.captured = true },
    hasPointerCapture() { return this.captured }, releasePointerCapture() { this.captured = false } };
  const source = planner.slice(start, end);
  const api = new Function('tasks', 'save', 'document', 'window', 'requestAnimationFrame',
    'cancelAnimationFrame', 'innerHeight', source + 'return {attachTaskDrag,reorderTaskItems}')(
      tasks, () => saves++, { body: { classList: classList() } }, { scrollBy() {} },
      () => 1, () => {}, 900);
  api.attachTaskDrag(handle, rows[from], group, tasks, from, field);
  handle.onpointerdown({ button: 0, pointerType, pointerId: 7,
    clientY: 105 + from * 60, preventDefault() {} });
  handle.onpointermove({ pointerType, pointerId: 7, clientY: toY });
  handle.onpointerup({ pointerType, pointerId: 7 });
  assert.deepEqual(tasks.sort((a, b) => a[field] - b[field]).map(task => task.id), expected);
  assert.equal(saves, 1);
  assert.equal(handle.captured, false);
  assert.equal(rows[from].style.transform, '');
}

scenario('mouse', 0, 280, ['b', 'c', 'a']);
scenario('touch', 2, 110, ['c', 'a', 'b']);
scenario('touch', 0, 280, ['b', 'c', 'a'], 'timedOrder');
{
  const tasks = [{ id: 'a', category: 'A', sortOrder: 0 },
    { id: 'b', category: 'B', sortOrder: 0 }];
  let saves = 0;
  const groupA = { dataset: { categoryName: 'A' } };
  const groupB = { dataset: { categoryName: 'B' } };
  const rows = [groupA, groupB].map((group, i) => ({ parentElement: group,
    dataset: { taskId: tasks[i].id }, classList: classList(), style: {},
    getBoundingClientRect: () => ({ top: 100 + i * 120, height: 44 }) }));
  const handle = { dataset: { taskId: 'a' }, captured: false,
    setPointerCapture() { this.captured = true },
    hasPointerCapture() { return this.captured },
    releasePointerCapture() { this.captured = false } };
  const api = new Function('tasks', 'save', 'document', 'window', 'requestAnimationFrame',
    'cancelAnimationFrame', 'innerHeight', planner.slice(start, end) +
    'return {attachTaskDrag}')(
      tasks, () => saves++, { body: { classList: classList() } },
      { scrollBy() {} }, () => 1, () => {}, 900);
  api.attachTaskDrag(handle, rows[0], groupA, [tasks[0]], 0, 'sortOrder', () => rows);
  handle.onpointerdown({ button: 0, pointerType: 'touch', pointerId: 8,
    clientY: 105, preventDefault() {} });
  handle.onpointermove({ pointerType: 'touch', pointerId: 8, clientY: 280 });
  handle.onpointerup({ pointerType: 'touch', pointerId: 8 });
  assert.equal(tasks[0].category, 'B');
  assert.equal(tasks[0].sortOrder, 1);
  assert.equal(tasks[1].sortOrder, 0);
  assert.equal(saves, 1);
}
console.log('Mouse and touch task dragging verified.');
