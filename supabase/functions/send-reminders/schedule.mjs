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
  const weekday = date.getUTCDay();
  if (weekday === 6) date.setUTCDate(date.getUTCDate() + 2);
  if (weekday === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function occurs(task, day) {
  if (!task || task.kind || !/^\d{4}-\d\d-\d\d$/.test(task.date || '')) return false;
  if (task.postponedDates?.[day]) return false;
  if (task.postponedDates && Object.values(task.postponedDates).includes(day)) return true;
  const repeat = task.repeat || 'none';
  const target = dateAtNoon(day);
  if (Number.isNaN(target.getTime())) return false;
  if (repeat === 'none') {
    if (!task.project) return task.date === day;
    const weekday = target.getUTCDay();
    return day >= task.date && weekday !== 0 && weekday !== 6 &&
      (!task.done || day <= (task.completedOn || task.date));
  }
  if (day < task.date || [0, 6].includes(target.getUTCDay())) return false;
  const start = dateAtNoon(task.date);
  if (Number.isNaN(start.getTime())) return false;
  const interval = Number.isInteger(task.repeatInterval) && task.repeatInterval >= 1 && task.repeatInterval <= 12
    ? task.repeatInterval : 1;
  if (repeat === 'daily' || repeat === 'weekdays') {
    const first = nextWorkday(new Date(start));
    if (target < first) return false;
    const days = Math.round((target - first) / 86400000);
    const weeks = Math.floor(days / 7);
    let elapsed = weeks * 5;
    for (let i = 1; i <= days % 7; i++) {
      const weekday = (first.getUTCDay() + i) % 7;
      if (weekday !== 0 && weekday !== 6) elapsed++;
    }
    return elapsed % interval === 0;
  }
  if (repeat === 'weekly') {
    const first = nextWorkday(new Date(start));
    return target >= first && Math.round((target - first) / 86400000) % (interval * 7) === 0;
  }
  if (repeat === 'monthly') {
    for (let offset = 0; offset <= 1; offset++) {
      const month = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() - offset, 1, 12));
      const distance = (month.getUTCFullYear() - start.getUTCFullYear()) * 12 + month.getUTCMonth() - start.getUTCMonth();
      if (distance < 0 || distance % interval !== 0) continue;
      const candidate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), start.getUTCDate(), 12));
      if (candidate.getUTCMonth() !== month.getUTCMonth()) continue;
      if (sameDay(nextWorkday(candidate), target)) return true;
    }
    return false;
  }
  if (repeat === 'yearly') {
    for (let year = target.getUTCFullYear() - 1; year <= target.getUTCFullYear(); year++) {
      if (year < start.getUTCFullYear() || (year - start.getUTCFullYear()) % interval !== 0) continue;
      const candidate = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate(), 12));
      if (candidate.getUTCMonth() !== start.getUTCMonth()) continue;
      if (sameDay(nextWorkday(candidate), target)) return true;
    }
  }
  return false;
}

export function isDone(task, day) {
  if (task.repeat && task.repeat !== 'none') return !!task.completedDates?.[day];
  if (task.project) return !!task.done && (!task.completedOn || day >= task.completedOn);
  return !!task.done;
}

export function reminderEvents(task, now) {
  if (!task || task.kind) return [];
  const current = rigaClock(now);
  const validTime = typeof task.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time);
  const events = [];
  if (task.dayReminder && occurs(task, current.day) && !isDone(task, current.day)) {
    const startTime = validTime && task.time < '09:00' ? '00:00' : '09:00';
    if (current.time >= startTime && (!validTime || current.time < task.time)) {
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
  }
  return events;
}
