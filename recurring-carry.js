(function (root) {
  'use strict';
  const validDay=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'));
  function shift(day,amount){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10)}
  function carryRecurring(tasks,today,{occurs,isDone,workday,pausedWork=false}) {
    if(!validDay(today))return false;
    const yesterday=shift(today,-1),ids=new Set(tasks.map(task=>task.id));
    let changed=false;
    const target=task=>task.workspace==='personal'?today:workday(today,true);
    for(const task of tasks){
      if(!task.deferredFrom||task.done||task.kind||!validDay(task.date)||pausedWork&&task.workspace!=='personal')continue;
      const next=target(task);
      if(task.date<next){task.date=next;changed=true}
    }
    for(const series of [...tasks]){
      if(series.kind||series.deferredFrom||!series.repeat||series.repeat==='none'||!validDay(series.date)||pausedWork&&series.workspace!=='personal')continue;
      let cursor;
      if(validDay(series.recurrenceCarryThrough)){
        cursor=shift(series.recurrenceCarryThrough,1);
        if(cursor<series.date)cursor=series.date;
      }else{
        // First activation handles the latest past occurrence, without flooding
        // the list with old history from before automatic carrying was enabled.
        cursor=yesterday;
        for(let i=0;i<5000&&cursor>=series.date&&!occurs(series,cursor);i++)cursor=shift(cursor,-1);
        if(cursor<series.date||!occurs(series,cursor))cursor=today;
      }
      let scanned=null;
      for(let n=0;cursor<=yesterday&&n<5000;n++,cursor=shift(cursor,1)){
        scanned=cursor;
        if(!occurs(series,cursor)||isDone(series,cursor))continue;
        const id='carry:'+series.id+':'+cursor;
        if(!ids.has(id)){
          const copy=JSON.parse(JSON.stringify(series));
          Object.assign(copy,{id,date:target(series),repeat:'none',repeatInterval:1,done:false,completedAt:null,completedOn:null,project:false,
            deferredFrom:{taskId:series.id,day:cursor}});
          copy.checklist={single:{...(series.checklist?.[cursor]||{})}};
          delete copy.completedDates;delete copy.postponedDates;delete copy.recurrenceCarryThrough;
          tasks.push(copy);ids.add(id);changed=true;
        }
        // Existing client and reminder schedulers skip truthy exceptions; an
        // object avoids treating the separate occurrence as another series day.
        series.postponedDates=series.postponedDates||{};
        const moved=tasks.find(task=>task.id===id);
        series.postponedDates[cursor]={taskId:id,date:moved.date};changed=true;
      }
      const through=scanned||yesterday;
      if(!series.recurrenceCarryThrough||series.recurrenceCarryThrough<through){series.recurrenceCarryThrough=through;changed=true}
    }
    return changed;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={carryRecurring,shift};
  root.PLANNER_RECURRING_CARRY=carryRecurring;
})(typeof window!=='undefined'?window:globalThis);
