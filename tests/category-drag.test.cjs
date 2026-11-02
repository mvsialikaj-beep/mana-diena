const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];
const start = planner.indexOf('function reorderVisibleCategories(');
const end = planner.indexOf('function setCategoryColor(', start);
assert(start >= 0 && end > start);
assert(html.includes('category-drag-handle'));
assert(html.includes('attachCategoryDrag(handle,group'));

function classes() {
  const set = new Set();
  return { add: (...names) => names.forEach(name => set.add(name)),
    remove: (...names) => names.forEach(name => set.delete(name)),
    contains: name => set.has(name) };
}
const record = { categoryOrder: ['A', 'B', 'C', 'D'] };
let saves = 0;
const api = new Function('categorySequence', 'categoryRecord', 'save', 'document', 'window',
  'requestAnimationFrame', 'cancelAnimationFrame', 'innerHeight',
  planner.slice(start, end) + 'return {reorderVisibleCategories,attachCategoryDrag}')(
    () => [...record.categoryOrder], () => record, () => saves++,
    { body: { classList: classes() } }, { scrollBy() {} }, () => 1, () => {}, 900);

assert.equal(api.reorderVisibleCategories(['A', 'C'], 0, 1), true);
assert.deepEqual(record.categoryOrder, ['C', 'B', 'A', 'D'], 'Other categories keep their slots');
assert.equal(saves, 1);

record.categoryOrder = ['A', 'B', 'C'];
const rows = record.categoryOrder.map((name, i) => ({ name, classList: classes(), style: {},
  getBoundingClientRect: () => ({ top: 100 + i * 60, height: 44 }) }));
const handle = { captured: false, setPointerCapture() { this.captured = true },
  hasPointerCapture() { return this.captured }, releasePointerCapture() { this.captured = false } };
api.attachCategoryDrag(handle, rows[0], () => rows, 0, ['A', 'B', 'C']);
handle.onpointerdown({ button: 0, pointerType: 'touch', pointerId: 1,
  clientY: 105, preventDefault() {} });
handle.onpointermove({ pointerType: 'touch', pointerId: 1, clientY: 280 });
handle.onpointerup({ pointerType: 'touch', pointerId: 1 });
assert.deepEqual(record.categoryOrder, ['B', 'C', 'A']);
assert.equal(saves, 2);
assert.equal(handle.captured, false);
assert.equal(rows[0].style.transform, '');
console.log('Category block dragging and persisted order verified.');
