import assert from 'node:assert/strict';
import { occurs, reminderEvents, rigaClock } from '../supabase/functions/send-reminders/schedule.mjs';

assert.deepEqual(rigaClock(new Date('2026-10-30T07:00:00Z')),
  { day: '2026-10-30', time: '09:00' });

const task = { id: 'one', text: 'Darbs', date: '2026-10-30',
  done: false, time: '14:00', dayReminder: true, repeat: 'none' };
assert.deepEqual(reminderEvents(task, new Date('2026-10-30T07:00:00Z')).map(e => e.type), ['day']);
assert.deepEqual(reminderEvents(task, new Date('2026-10-30T11:46:00Z')).map(e => e.type), ['day', 'before_time']);
assert.deepEqual(reminderEvents({ ...task, done: true }, new Date('2026-10-30T11:46:00Z')), []);

const weekly = { text: 'Nedēļas darbs', date: '2026-10-30',
  done: false, repeat: 'weekly', repeatInterval: 2 };
assert(occurs(weekly, '2026-10-30'));
assert(!occurs(weekly, '2026-11-06'));
assert(occurs(weekly, '2026-11-13'));

const project = { text: 'Projekts', date: '2026-10-30', project: true,
  done: false, repeat: 'none', dayReminder: true };
assert(!occurs(project, '2026-10-31'));
assert(occurs(project, '2026-11-02'));
assert.equal(reminderEvents(project, new Date('2026-11-02T07:01:00Z'))[0].type, 'day');

console.log('Background push schedule and recurrence verified.');
