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
assert(html.includes("filter==='open'&&type!=='timed'&&items.length>1"));
assert(!html.includes("className='order-actions task-order-actions'"));

function classList() {
  const values = new Set();
  return { add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name) };
}
function scenario(pointerType, from, toY, expected) {
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
  api.attachTaskDrag(handle, rows[from], group, tasks, from);
  handle.onpointerdown({ button: 0, pointerType, pointerId: 7,
    clientY: 105 + from * 60, preventDefault() {} });
  handle.onpointermove({ pointerType, pointerId: 7, clientY: toY });
  handle.onpointerup({ pointerType, pointerId: 7 });
  assert.deepEqual(tasks.sort((a, b) => a.sortOrder - b.sortOrder).map(task => task.id), expected);
  assert.equal(saves, 1);
  assert.equal(handle.captured, false);
  assert.equal(rows[from].style.transform, '');
}

scenario('mouse', 0, 280, ['b', 'c', 'a']);
scenario('touch', 2, 110, ['c', 'a', 'b']);
console.log('Mouse and touch task dragging verified.');
