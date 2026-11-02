import assert from 'node:assert/strict';
import fs from 'node:fs';
import { occurs, reminderEvents, rigaClock } from '../supabase/functions/send-reminders/schedule.mjs';

assert.deepEqual(rigaClock(new Date('2026-10-30T07:00:00Z')),
  { day: '2026-10-30', time: '09:00' });

const task = { id: 'one', text: 'Darbs', date: '2026-10-30',
  done: false, time: '14:00', dayReminder: true, repeat: 'none' };
assert.deepEqual(reminderEvents(task, new Date('2026-10-30T07:00:00Z')).map(e => e.type), ['day']);
assert.deepEqual(reminderEvents(task, new Date('2026-10-30T11:46:00Z')).map(e => e.type), ['day', 'before_time']);
assert.deepEqual(reminderEvents({ ...task, done: true }, new Date('2026-10-30T11:46:00Z')), []);
const custom = { ...task, reminderTime: '12:30' };
assert.deepEqual(reminderEvents(custom, new Date('2026-10-30T10:29:00Z')), []);
assert.deepEqual(reminderEvents(custom, new Date('2026-10-30T10:30:00Z')).map(e => e.type), ['day']);
assert.deepEqual(reminderEvents({ ...custom, reminderTime: 'invalid' }, new Date('2026-10-30T07:00:00Z')).map(e => e.type), ['day']);
assert.deepEqual(reminderEvents({ ...custom, dayReminder: false }, new Date('2026-10-30T10:30:00Z')), []);

const weekly = { text: 'Nedēļas darbs', date: '2026-10-30',
  done: false, repeat: 'weekly', repeatInterval: 2 };
assert(occurs(weekly, '2026-10-30'));
assert(!occurs(weekly, '2026-11-06'));
assert(occurs(weekly, '2026-11-13'));
const personalDaily = { text: 'Ikdiena', workspace: 'personal', date: '2026-10-30',
  done: false, repeat: 'everyday', repeatInterval: 1 };
assert(occurs(personalDaily, '2026-10-31'));
assert(occurs(personalDaily, '2026-11-01'));
assert(!occurs({ ...personalDaily, repeatInterval: 2 }, '2026-10-31'));
assert(occurs({ ...personalDaily, repeatInterval: 2 }, '2026-11-01'));
assert(!occurs({ ...personalDaily, repeat: 'daily' }, '2026-10-31'));
assert(occurs({ ...personalDaily, repeat: 'weekly', date: '2026-10-31' }, '2026-11-07'));
assert(!occurs({ ...personalDaily, workspace: 'work' }, '2026-10-31'));
assert(!occurs({ ...personalDaily, repeat: 'none', project: true }, '2026-11-02'));
assert(occurs({ ...personalDaily, repeat: 'none', project: true, date: '2026-10-31' }, '2026-10-31'));
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];
const browserOccurs = new Function(planner.slice(planner.indexOf('function occurs(t,d){'),
  planner.indexOf('function isDone(t,d){')) + 'return occurs')();
const patterns = [
  {date:'2026-10-30',repeat:'daily',repeatInterval:1,workspace:'work'},
  {date:'2026-10-30',repeat:'weekly',repeatInterval:2,workspace:'work'},
  {date:'2026-10-30',repeat:'monthly',repeatInterval:1,workspace:'work'},
  {date:'2026-10-30',repeat:'everyday',repeatInterval:2,workspace:'personal'},
  {date:'2026-10-31',repeat:'weekly',repeatInterval:2,workspace:'personal'},
  {date:'2026-10-31',repeat:'monthly',repeatInterval:1,workspace:'personal'},
  {date:'2026-10-31',repeat:'none',project:true,workspace:'personal'}
];
for(let i=0;i<400;i++){
  const day=new Date(Date.UTC(2026,9,29+i)).toISOString().slice(0,10);
  for(const pattern of patterns)assert.equal(browserOccurs(pattern,day),occurs(pattern,day),
    `Browser and background reminders differ for ${pattern.workspace} ${pattern.repeat} on ${day}`);
}

const project = { text: 'Projekts', date: '2026-10-30', project: true,
  done: false, repeat: 'none', dayReminder: true };
assert(!occurs(project, '2026-10-31'));
assert(occurs(project, '2026-11-02'));
assert.equal(reminderEvents(project, new Date('2026-11-02T07:01:00Z'))[0].type, 'day');

console.log('Background push schedule and recurrence verified.');
