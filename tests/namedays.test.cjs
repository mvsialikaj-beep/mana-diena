const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = process.argv[2] || path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dataScript = fs.readFileSync(path.join(root, 'namedays.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataScript, context);
const data = context.window.LATVIAN_NAMEDAYS;
assert.equal(Object.keys(data).length, 366);
assert.deepEqual(Array.from(data['10-29']), ['Laimonis', 'Elvijs', 'Elva', 'Elvis', 'Laimis']);
assert(Array.isArray(data['02-29']));
assert(html.includes('id="sideCalendar"') && html.includes('id="namedayNames"'));
assert(html.includes('<script src="./namedays.js"></script>'));

const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(Boolean);
const start = script.indexOf('function renderNamedays(');
const end = script.indexOf('setInterval(renderNamedays,60000)', start);
assert(start >= 0 && end > start);
const fields = { '#namedayDate': { textContent: '' }, '#namedayNames': { textContent: '' } };
const renderNamedays = new Function('$', 'window', script.slice(start, end) + 'return renderNamedays')(
  selector => fields[selector], context.window);
renderNamedays(new Date('2026-10-29T10:00:00Z'));
assert.equal(fields['#namedayNames'].textContent, data['10-29'].join(', '));
assert(fields['#namedayDate'].textContent.includes('29. oktobris'));
renderNamedays(new Date('2026-10-29T22:30:00Z'));
assert.equal(fields['#namedayNames'].textContent, data['10-30'].join(', '),
  'The day must follow Riga time at midnight');
renderNamedays(new Date('2028-02-28T22:30:00Z'));
assert.equal(fields['#namedayNames'].textContent, 'Šajā dienā vārdadienu nav.',
  'The leap-day placeholder must not be shown as a name');
console.log('Name-day data and Riga date rollover verified.');

