const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../holidays.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];
const start = planner.indexOf('function isWorkWeekend(day){');
const end = planner.indexOf('function alignSideMonth(){', start);
assert(start >= 0 && end > start);

class Element {
  constructor() { this.children=[]; this.attributes={}; this.className=''; this.textContent=''; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=[...children]; }
  setAttribute(key,value) { this.attributes[key]=value; }
}
const sidebar = new Element();
const calendar = new Function('$','document','date','workspaceTasks','occurs','today',
  "let activeWorkspace='work';" + planner.slice(start,end) +
  "sideMonth=new Date(2026,10,1);return {renderSideCalendar,setWorkspace:value=>activeWorkspace=value,isWorkWeekend}")(
    () => sidebar,{createElement:()=>new Element()},{value:'2026-11-07'},
    () => [{date:'2026-11-07'}],(task,day)=>task.date===day,()=>'2026-11-07');
const dayButton = day => sidebar.children[1].children.slice(7)
  .find(button=>button.textContent===day && !button.className.includes('other'));

calendar.renderSideCalendar();
for (const day of [7,8]) assert(dayButton(day).className.includes('work-weekend'));
assert(dayButton(7).className.includes('selected'));
assert(!dayButton(7).className.includes('today'));
assert(!dayButton(7).className.includes('has-tasks'));
assert(!dayButton(9).className.includes('work-weekend'));
assert(dayButton(18).className.includes('work-holiday'));
assert(dayButton(18).attributes['aria-label'].includes('proklamēšanas diena'));

calendar.setWorkspace('personal');
calendar.renderSideCalendar();
for (const day of [7,8]) assert(!dayButton(day).className.includes('work-weekend'));
assert(dayButton(7).className.includes('today'));
assert(dayButton(7).className.includes('has-tasks'));
assert(!dayButton(18).className.includes('work-holiday'));
assert(planner.includes("let weekend=isWorkWeekend(d),holiday=workHoliday(value)"),
  'The date picker uses the same workspace weekend rule');
console.log('Work weekends are muted; personal weekends stay active.');
