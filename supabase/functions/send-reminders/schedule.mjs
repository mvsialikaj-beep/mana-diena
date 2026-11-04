import './holidays.js';
const formatRiga = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

export function rigaClock(instant) {
  const parts = formatRiga.formatToParts(instant);
  const value = type => parts.find(part => part.type === type).value;
  return { day: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` };
}

const dateAtNoon = day => new Date(`${day}T12:00:00Z`);
const sameDay = (a, b) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
function nextWorkday(date) {
  return dateAtNoon(LATVIAN_HOLIDAYS.nextWorkday(date.toISOString().slice(0, 10), true));
}

export function occurs(task, day) {
  if (!task || task.kind || !/^\d{4}-\d\d-\d\d$/.test(task.date || '')) return false;
  if (task.postponedDates?.[day]) return false;
  if (task.postponedDates && Object.values(task.postponedDates).includes(day)) return true;
  const personal = task.workspace === 'personal';
  if (!personal && !LATVIAN_HOLIDAYS.isWorkday(day)) return false;
  const repeat = task.repeat || 'none';
  const target = dateAtNoon(day);
  if (Number.isNaN(target.getTime())) return false;
  if (repeat === 'none') {
    if (!task.project || personal) return task.date === day;
    return day >= task.date &&
      (!task.done || day <= (task.completedOn || task.date));
  }
  if (day < task.date || ((!personal || repeat === 'daily' || repeat === 'weekdays') &&
    [0, 6].includes(target.getUTCDay()))) return false;
  const start = dateAtNoon(task.date);
  if (Number.isNaN(start.getTime())) return false;
  const interval = Number.isInteger(task.repeatInterval) && task.repeatInterval >= 1 && task.repeatInterval <= 12
    ? task.repeatInterval : 1;
  if (repeat === 'everyday' && personal) {
    return Math.round((target - start) / 86400000) % interval === 0;
  }
  if (repeat === 'daily' || repeat === 'weekdays' || repeat === 'everyday') {
    const first = nextWorkday(new Date(start));
    if (target < first) return false;
    const elapsed = LATVIAN_HOLIDAYS.countWorkdays(first.toISOString().slice(0, 10), day);
    return elapsed % interval === 0;
  }
  if (repeat === 'weekly') {
    const first = personal ? new Date(start) : nextWorkday(new Date(start));
    if (personal) return target >= first && Math.round((target - first) / 86400000) % (interval * 7) === 0;
    const weeks = Math.floor((target - first) / (86400000 * 7 * interval));
    for (let n = Math.max(0, weeks - 1); n <= weeks + 1; n++) {
      const candidate = new Date(first);
      candidate.setUTCDate(candidate.getUTCDate() + n * interval * 7);
      if (sameDay(nextWorkday(candidate), target)) return true;
    }
    return false;
  }
  if (repeat === 'monthly') {
    for (let offset = 0; offset <= 1; offset++) {
      const month = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() - offset, 1, 12));
      const distance = (month.getUTCFullYear() - start.getUTCFullYear()) * 12 + month.getUTCMonth() - start.getUTCMonth();
      if (distance < 0 || distance % interval !== 0) continue;
      const candidate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), start.getUTCDate(), 12));
      if (candidate.getUTCMonth() !== month.getUTCMonth()) continue;
      if (sameDay(personal ? candidate : nextWorkday(candidate), target)) return true;
    }
    return false;
  }
  if (repeat === 'yearly') {
    for (let year = target.getUTCFullYear() - 1; year <= target.getUTCFullYear(); year++) {
      if (year < start.getUTCFullYear() || (year - start.getUTCFullYear()) % interval !== 0) continue;
      const candidate = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate(), 12));
      if (candidate.getUTCMonth() !== start.getUTCMonth()) continue;
      if (sameDay(personal ? candidate : nextWorkday(candidate), target)) return true;
    }
  }
  return false;
}

export function isDone(task, day) {
  if (task.repeat && task.repeat !== 'none') return !!task.completedDates?.[day];
  if (task.project) return !!task.done && (!task.completedOn || day >= task.completedOn);
  return !!task.done;
}

function repeatStartDay(task, currentDay) {
  if (!task.repeat || task.repeat === 'none') {
    const start = task.workspace === 'personal' ? task.date : LATVIAN_HOLIDAYS.nextWorkday(task.date, true);
    return currentDay >= start && !task.done ? start : null;
  }
  const cursor = dateAtNoon(currentDay);
  const first = dateAtNoon(task.date);
  for (let i = 0; i < 5000 && cursor >= first; i++) {
    const day = cursor.toISOString().slice(0, 10);
    if (occurs(task, day)) return isDone(task, day) ? null : day;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return null;
}

function wallMinutes(day, time) {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)), Number(time.slice(0, 2)), Number(time.slice(3, 5))) / 60000;
}

export function reminderEvents(task, now) {
  if (!task || task.kind) return [];
  const current = rigaClock(now);
  const validTime = typeof task.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time);
  const reminderTime = typeof task.reminderTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.reminderTime)
    ? task.reminderTime : '09:00';
  const events = [];
  if (task.dayReminder && occurs(task, current.day) && !isDone(task, current.day)) {
    if (current.time >= reminderTime) {
      events.push({ day: current.day, type: 'day', title: `Šodien ieplānots: ${task.text}`,
        body: validTime ? `Plkst. ${task.time}` : (task.category || 'Uzdevums bez norādīta laika') });
    }
  }
  if (validTime) {
    for (let minutes = 10; minutes <= 15; minutes++) {
      const upcoming = rigaClock(new Date(now.getTime() + minutes * 60000));
      if (upcoming.time === task.time && occurs(task, upcoming.day) && !isDone(task, upcoming.day)) {
        events.push({ day: upcoming.day, type: 'before_time', title: `Drīz: ${task.text}`,
          body: `Ieplānots plkst. ${task.time} (${upcoming.day}).` });
        break;
      }
    }
    if (task.nagReminder) {
      const startDay = repeatStartDay(task, current.day);
      if (startDay) {
        const slot = Math.floor((wallMinutes(current.day, current.time) - wallMinutes(startDay, task.time)) / 15);
        if (slot >= 0) events.push({ day: startDay, type: `repeat_${slot}`,
          title: `Vēl jāizdara: ${task.text}`, body: `Ieplānots plkst. ${task.time}. Atzīmē uzdevumu kā paveiktu, lai apturētu atgādinājumus.` });
      }
    }
  }
  return events;
}
