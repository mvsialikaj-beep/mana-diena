import assert from 'node:assert/strict';
import '../holidays.js';
import { occurs, reminderEvents } from '../supabase/functions/send-reminders/schedule.mjs';

const h=globalThis.LATVIAN_HOLIDAYS;
assert.equal(h.holidayName('2026-04-03'),'Lielā Piektdiena');
assert.equal(h.holidayName('2026-04-06'),'Otrās Lieldienas');
assert.equal(h.nextWorkday('2026-04-02'),'2026-04-07');
assert.equal(h.holidayName('2026-05-04'),'Latvijas Republikas Neatkarības atjaunošanas diena');
assert.equal(h.holidayName('2028-11-20'),'Pārceltā svētku brīvdiena');
assert.equal(h.holidayName('2028-07-10'),'Pārceltā Dziesmu un deju svētku brīvdiena');
assert.equal(h.isWorkday('2026-11-18'),false);
assert.equal(h.isWorkday('2026-11-19'),true);

const work={text:'Darbs',date:'2026-04-02',repeat:'daily',workspace:'work',dayReminder:true};
assert.equal(occurs(work,'2026-04-03'),false);
assert.equal(occurs(work,'2026-04-06'),false);
assert.equal(occurs(work,'2026-04-07'),true);
assert.deepEqual(reminderEvents(work,new Date('2026-04-03T07:00:00Z')),[]);
const personal={...work,workspace:'personal',repeat:'everyday'};
assert.equal(occurs(personal,'2026-04-03'),true);
assert.equal(occurs(personal,'2026-04-04'),true);
const monthly={...work,date:'2026-03-03',repeat:'monthly'};
assert.equal(occurs(monthly,'2026-04-03'),false);
assert.equal(occurs(monthly,'2026-04-07'),true);
const weekly={...work,date:'2026-04-03',repeat:'weekly',repeatInterval:2};
assert.equal(occurs(weekly,'2026-04-07'),true);
assert.equal(occurs(weekly,'2026-04-21'),true);
console.log('Latvian holidays, work scheduling and personal dates verified.');
