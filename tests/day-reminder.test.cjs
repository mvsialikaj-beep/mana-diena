const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
const planner = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[0];
const start = planner.indexOf('const reminderInFlight=');
const end = planner.indexOf('status();alignSideMonth();render();', start);
assert(start >= 0 && end > start);

const notices = [];
function Notification(title, options) { notices.push({title, body: options.body}); }
Notification.permission = 'granted';
const reminded = {};
const saved = [];
const tasks = [
  {id:'daily',text:'Dienas darbs',date:'2026-10-30',done:false,dayReminder:true,time:''},
  {id:'timed',text:'Sapulce',date:'2026-10-30',done:false,dayReminder:true,time:'10:00'},
  {id:'custom',text:'Pēcpusdienas darbs',date:'2026-10-30',done:false,dayReminder:true,reminderTime:'12:30',time:''},
  {id:'done',text:'Pabeigts',date:'2026-10-30',done:true,dayReminder:true,time:''},
  {id:'off',text:'Bez atgādinājuma',date:'2026-10-30',done:false,dayReminder:false,time:''}
];
const check = new Function('tasks','Notification','window','occurs','isDone','reminded','localStorage','reminderKey','today','navigator',
  planner.slice(start, end) + 'return checkReminders;')(
    tasks, Notification, {Notification}, (task, day) => task.date === day,
    task => task.done, reminded, {setItem: (_key, value) => saved.push(JSON.parse(value))},
    'reminders', () => '2026-10-30', {});

check(new Date('2026-10-30T08:55:00'));
assert.equal(notices.length, 0, 'No untimed daily reminder before 09:00');
check(new Date('2026-10-30T09:01:00'));
assert.deepEqual(notices.map(item => item.title), [
  'Šodien ieplānots: Dienas darbs', 'Šodien ieplānots: Sapulce'
]);
check(new Date('2026-10-30T09:02:00'));
assert.equal(notices.length, 2, 'Daily reminders fire once per task and date');
check(new Date('2026-10-30T09:46:00'));
assert.equal(notices.at(-1).title, 'Drīz: Sapulce', '15 minute reminder still fires');
assert.equal(notices.length, 3);
check(new Date('2026-10-30T12:29:00'));
assert.equal(notices.length, 3, 'Custom reminder waits until its chosen time');
check(new Date('2026-10-30T12:30:00'));
assert.equal(notices.at(-1).title, 'Šodien ieplānots: Pēcpusdienas darbs');
assert.equal(saved.length, 4);

assert(html.includes('id="dayReminder"'));
assert(html.includes('id="reminderTime" type="time"'));
assert(html.includes("dayReminder:$('#dayReminder').checked"));
assert(html.includes("reminderTime:$('#dayReminder').checked?$('#reminderTime').value:''"));
assert(html.includes("$('#dayReminder').checked=!!t.dayReminder"));
assert(html.includes("$('#reminderTime').value=t.reminderTime||'09:00'"));
assert(html.includes("navigator.serviceWorker.register('./sw.js')"));
const safeTaskStart = planner.indexOf('function safeTask(t){');
const safeTaskEnd = planner.indexOf('try{reminded=', safeTaskStart);
const safeTask = new Function(planner.slice(safeTaskStart, safeTaskEnd) + 'return safeTask;')();
const sample = {id:'check',text:'Darbs',date:'2026-10-30',done:false};
assert(safeTask({...sample, reminderTime:'16:45'}));
assert.equal(safeTask({...sample, reminderTime:'25:00'}), false);
const reminderField = {hidden:false};
const reminderCheck = {checked:false};
const reminderTime = {value:'',disabled:false};
const fields = {'#dayReminder':reminderCheck,'#reminderTime':reminderTime,'#reminderTimeField':reminderField};
const syncReminderFields = new Function('$', planner.slice(planner.indexOf('function syncReminderFields(){'), planner.indexOf('function categorySequence(){')) + 'return syncReminderFields;')(selector => fields[selector]);
syncReminderFields();
assert.equal(reminderField.hidden, true);
assert.equal(reminderTime.disabled, true);
reminderCheck.checked = true;
syncReminderFields();
assert.equal(reminderField.hidden, false);
assert.equal(reminderTime.disabled, false);
assert.equal(reminderTime.value, '09:00');

(async () => {
  const phoneNotices = [];
  function MobileNotification() { throw new Error('Use service worker'); }
  MobileNotification.permission = 'granted';
  const phoneTasks = [{id:'phone',text:'Telefona uzdevums',date:'2026-10-30',done:false,dayReminder:true,time:''}];
  const phoneCheck = new Function('tasks','Notification','window','occurs','isDone','reminded','localStorage','reminderKey','today','navigator',
    planner.slice(start, end) + 'return checkReminders;')(
      phoneTasks, MobileNotification, {Notification:MobileNotification}, (task, day) => task.date === day,
      task => task.done, {}, {setItem(){}}, 'reminders', () => '2026-10-30',
      {serviceWorker:{ready:Promise.resolve({showNotification: async (title, options) => phoneNotices.push({title, options})})}});
  phoneCheck(new Date('2026-10-30T09:05:00'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(phoneNotices.length, 1, 'Phone notification uses service worker fallback');
  phoneCheck(new Date('2026-10-30T09:06:00'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(phoneNotices.length, 1, 'Phone notification is not repeated');
  console.log('Daily, timed, and phone reminders verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
