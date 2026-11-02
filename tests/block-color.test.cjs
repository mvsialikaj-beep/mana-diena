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
assert(safeTask({ ...task, kind: 'category-order', sectionColors: { priority: '#edd3c0', regular: '#edf3f6' } }));
assert.equal(safeTask({ ...task, kind: 'category-order', sectionColors: { priority: 'red' } }), false);
assert.equal(safeTask({ ...task, kind: 'category-order', sectionColors: { other: '#ffffff' } }), false);

const record = { categoryColors: { Amazon: '#2468ac' } };
const color = new Function('categoryRecord', section('function validHexColor(', 'let expandedTasks=') +
  'return {validHexColor,readableColor,categoryColor,customCategoryColor}')(() => record);
assert.equal(color.readableColor('#ffffff'), '#172b32');
assert.equal(color.readableColor('#000000'), '#ffffff');
assert.equal(color.categoryColor('Amazon'), '#2468ac');
let saves = 0;
const setCategoryColor = new Function('categoryRecord', 'validHexColor', 'save',
  section('function setCategoryColor(', 'function deleteCategory(') +
  'return {setCategoryColor,setSectionColor}')(() => record, color.validHexColor, () => saves++);
setCategoryColor.setCategoryColor('Amazon', '#abcdef');
assert.equal(record.categoryColors.Amazon, '#abcdef');
setCategoryColor.setCategoryColor('Amazon', null);
assert.equal(record.categoryColors.Amazon, undefined);
setCategoryColor.setSectionColor('priority', '#123456');
assert.equal(record.sectionColors.priority, '#123456');
setCategoryColor.setSectionColor('regular', '#abcdef');
assert.equal(record.sectionColors.regular, '#abcdef');
setCategoryColor.setSectionColor('priority', null);
assert.equal(record.sectionColors.priority, undefined);
setCategoryColor.setSectionColor('other', '#ffffff');
assert.equal(record.sectionColors.other, undefined);
assert.equal(saves, 5);
assert(html.includes("colorInput.type='color'"));
assert(html.includes("colorInput.className='category-color-input'"));
assert(html.includes("settings.className='category-settings'"));
assert(html.includes("settings.className='section-settings'"));
assert(html.includes('head.append(settings)'));
assert(!html.includes('head.append(colorInput)'));
assert(html.includes('.task.custom-color'));
console.log('Task and category color selection, contrast, and validation verified.');
