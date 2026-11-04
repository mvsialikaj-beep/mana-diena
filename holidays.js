(function (root) {
  const cache = new Map();
  const iso = date => date.toISOString().slice(0, 10);
  function easter(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4;
    const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
    const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451);
    return new Date(Date.UTC(year,Math.floor((h+l-7*m+114)/31)-1,((h+l-7*m+114)%31)+1));
  }
  function holidays(year) {
    if(cache.has(year))return cache.get(year);
    const days=new Map(),add=(month,day,name)=>days.set(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,name);
    [[1,1,'Jaungada diena'],[5,1,'Darba svētki'],[5,4,'Latvijas Republikas Neatkarības atjaunošanas diena'],[6,23,'Līgo diena'],[6,24,'Jāņu diena'],[11,18,'Latvijas Republikas proklamēšanas diena'],[12,24,'Ziemassvētku vakars'],[12,25,'Pirmie Ziemassvētki'],[12,26,'Otrie Ziemassvētki'],[12,31,'Vecgada diena']].forEach(x=>add(...x));
    const easterDay=easter(year);
    [[-2,'Lielā Piektdiena'],[0,'Pirmās Lieldienas'],[1,'Otrās Lieldienas'],[49,'Vasarsvētki']].forEach(([offset,name])=>{let d=new Date(easterDay);d.setUTCDate(d.getUTCDate()+offset);days.set(iso(d),name)});
    const may1=new Date(Date.UTC(year,4,1)),mother=8+((7-may1.getUTCDay())%7);add(5,mother,'Mātes diena');
    // XXVIII Vispārējo latviešu Dziesmu un XVIII Deju svētku noslēgums: 2028-07-09.
    if(year===2028)add(7,9,'Vispārējo latviešu Dziesmu un deju svētku noslēgums');
    [[5,4],[11,18]].forEach(([month,day])=>{let d=new Date(Date.UTC(year,month-1,day));if([0,6].includes(d.getUTCDay())){d.setUTCDate(d.getUTCDate()+(d.getUTCDay()===6?2:1));days.set(iso(d),'Pārceltā svētku brīvdiena')}});
    if(year===2028)days.set('2028-07-10','Pārceltā Dziesmu un deju svētku brīvdiena');
    cache.set(year,days);return days;
  }
  function holidayName(day){const year=Number(String(day).slice(0,4));return Number.isInteger(year)?holidays(year).get(day)||'':''}
  function isWorkday(day){const d=new Date(`${day}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.getUTCDay()!==0&&d.getUTCDay()!==6&&!holidayName(day)}
  function nextWorkday(day,includeToday=false){const d=new Date(`${day}T12:00:00Z`);if(Number.isNaN(d.getTime()))return day;if(!includeToday)d.setUTCDate(d.getUTCDate()+1);while(!isWorkday(iso(d)))d.setUTCDate(d.getUTCDate()+1);return iso(d)}
  function countWorkdays(start,end){
    const a=new Date(`${start}T12:00:00Z`),b=new Date(`${end}T12:00:00Z`);
    if(b<=a)return 0;
    const days=Math.round((b-a)/86400000),weeks=Math.floor(days/7);
    let n=weeks*5,weekday=a.getUTCDay();
    for(let i=1;i<=days%7;i++){let current=(weekday+i)%7;if(current!==0&&current!==6)n++}
    for(let year=a.getUTCFullYear();year<=b.getUTCFullYear();year++)for(const day of holidays(year).keys()){
      if(day<=start||day>end)continue;
      const d=new Date(`${day}T12:00:00Z`);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)n--;
    }
    return n;
  }
  root.LATVIAN_HOLIDAYS={holidayName,isWorkday,nextWorkday,countWorkdays,holidays};
})(globalThis);
