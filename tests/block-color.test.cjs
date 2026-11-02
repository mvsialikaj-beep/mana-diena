const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];
function section(start, end) {
  const from = planner.indexOf(start), to = planner.indexOf(end, from);
  assert(from >= 0 && to > from);
  return planner.slice(from, to);
}
const safeTask = new Function('t', section('function safeTask(t){', 'try{reminded=') +
  'return safeTask(t)');
const task = { id: 'one', text: 'Darbs', date: '2026-11-02', done: false };
assert(safeTask({ ...task, color: '#00aaff' }));
assert.equal(safeTask({ ...task, color: 'red' }), false);
assert(safeTask({ ...task, timedOrder: 2 }));
assert.equal(safeTask({ ...task, timedOrder: 'second' }), false);
assert(safeTask({ ...task, kind: 'category-order', categoryColors: { Amazon: '#f0e0d0' } }));
assert.equal(safeTask({ ...task, kind: 'category-order', categoryColors: { Amazon: 'url(bad)' } }), false);

const record = { categoryColors: { Amazon: '#2468ac' } };
const color = new Function('categoryRecord', section('function validHexColor(', 'let expandedTasks=') +
  'return {validHexColor,readableColor,categoryColor,customCategoryColor}')(() => record);
assert.equal(color.readableColor('#ffffff'), '#172b32');
assert.equal(color.readableColor('#000000'), '#ffffff');
assert.equal(color.categoryColor('Amazon'), '#2468ac');
let saves = 0;
const setCategoryColor = new Function('categoryRecord', 'validHexColor', 'save',
  section('function setCategoryColor(', 'function deleteCategory(') +
  'return setCategoryColor')(() => record, color.validHexColor, () => saves++);
setCategoryColor('Amazon', '#abcdef');
assert.equal(record.categoryColors.Amazon, '#abcdef');
setCategoryColor('Amazon', null);
assert.equal(record.categoryColors.Amazon, undefined);
assert.equal(saves, 2);
assert(html.includes("colorInput.type='color'"));
assert(html.includes("colorInput.className='category-color-input'"));
assert(html.includes('.task.custom-color'));
console.log('Task and category color selection, contrast, and validation verified.');
