(function(){
  'use strict';
  const mobile=window.matchMedia('(max-width:850px)'),panel=document.getElementById('taskFormPanel'),glance=document.getElementById('calendarGlance'),main=document.querySelector('main.main');
  if(!panel||!main||!glance)return;
  const today=document.getElementById('today'),dateWrap=document.getElementById('date')?.closest('.date-input-wrap'),todayHome=document.createComment('mobile-today-home');if(today)today.before(todayHome);
  const panelHome=document.createComment('mobile-task-form-home'),glanceHome=document.createComment('mobile-clock-home');panel.before(panelHome);glance.before(glanceHome);
  const month=document.getElementById('sideCalendar'),namedays=document.querySelector('.namedays');
  const monthHome=document.createComment('mobile-month-home'),namedaysHome=document.createComment('mobile-namedays-home'),originalSide=document.querySelector('.layout>.side:not(.progress-column)');if(month)month.before(monthHome);if(namedays){if(originalSide)originalSide.append(namedaysHome);else namedays.before(namedaysHome)}
  const clockCard=document.createElement('section');clockCard.id='personalClockCard';clockCard.className='mobile-personal-block mobile-personal-clock';clockCard.setAttribute('aria-label','Laiks un laikapstākļi');clockCard.hidden=true;
  const calendarCard=document.createElement('section');calendarCard.id='personalCalendarCard';calendarCard.className='calendar-widget mobile-personal-block';calendarCard.setAttribute('aria-label','Ikdienas mēneša kalendārs');calendarCard.hidden=true;main.before(clockCard);main.before(calendarCard);
  const preferenceKey='mana-ikdiena-personal-mobile-v1',preferences={clock:true,calendar:true,tasks:true,namedays:true};
  try{const saved=JSON.parse(localStorage.getItem(preferenceKey)||'{}');for(const key of Object.keys(preferences))if(typeof saved?.[key]==='boolean')preferences[key]=saved[key]}catch{}
  const settings=document.getElementById('settingsDialog')?.querySelector('.settings-panel');
  if(settings){const group=document.createElement('details');group.className='settings-section';group.id='personalMobileBlocks';const title=document.createElement('summary');title.textContent='Ikdienas bloki telefonā';group.append(title);
    for(const [key,label]of [['clock','Laiks un laikapstākļi'],['calendar','Kalendārs'],['tasks','Uzdevumu bloks'],['namedays','Vārdadienas']]){const row=document.createElement('label');row.className='settings-checkbox';const input=document.createElement('input');input.type='checkbox';input.id='personal-mobile-'+key;input.checked=preferences[key];input.onchange=()=>{preferences[key]=input.checked;try{localStorage.setItem(preferenceKey,JSON.stringify(preferences))}catch{}update()};row.append(input,document.createTextNode(' '+label));group.append(row)}settings.append(group)}
  const dialog=document.createElement('dialog');dialog.id='mobileTaskDialog';dialog.setAttribute('aria-label','Uzdevuma pievienošana vai rediģēšana');document.body.append(dialog);
  function fitTask(){
    if(!mobile.matches)return;
    const viewport=window.visualViewport,width=viewport?.width||window.innerWidth||document.documentElement.clientWidth,height=viewport?.height||window.innerHeight||document.documentElement.clientHeight;
    for(const [key,value] of Object.entries({width,height,left:viewport?.offsetLeft||0,top:viewport?.offsetTop||0}))dialog.style.setProperty('--mobile-viewport-'+key,Math.max(0,value)+'px');
  }
  function openTask(){if(!mobile.matches)return;if(panel.parentElement!==dialog)dialog.append(panel);if(!panel.open)panel.open=true;fitTask();if(!dialog.open){dialog.showModal();dialog.scrollTop=0}window.requestAnimationFrame?.(fitTask)}
  function closeTask(){if(dialog.open)dialog.close();if(mobile.matches&&panel.open)panel.open=false}
  function update(){
    const personal=mobile.matches&&document.documentElement?.dataset.workspace==='personal';
    clockCard.hidden=!personal||!preferences.clock;calendarCard.hidden=!personal||!preferences.calendar;
    main.classList?.toggle('personal-mobile-hidden',personal&&!preferences.tasks);namedays?.classList?.toggle('personal-mobile-hidden',personal&&!preferences.namedays);
    if(personal){main.before(clockCard);main.before(calendarCard);clockCard.append(glance);if(month)calendarCard.append(month);if(namedays){if(preferences.calendar)calendarCard.append(namedays);else calendarCard.after(namedays)}}
    else{if(month)monthHome.after(month);if(namedays&&[main.parentElement,calendarCard,main].includes(namedays.parentElement))namedaysHome.after(namedays)}
    if(mobile.matches){if(today&&dateWrap)dateWrap.append(today);if(!personal){main.prepend(glance);if(namedays)glance.after(namedays)}dialog.append(panel);if(panel.open)openTask()}
    else{if(today)todayHome.after(today);if(dialog.open)dialog.close();glanceHome.after(glance);panelHome.after(panel)}
  }
  dialog.addEventListener('cancel',()=>{panel.open=false});
  dialog.addEventListener('close',()=>{if(!dialog.open&&mobile.matches&&panel.open)panel.open=false});
  window.PLANNER_POPUPS?.bindBackdrop(dialog,()=>{panel.open=false;closeTask()});
  new MutationObserver(()=>{if(!mobile.matches)return;if(panel.open)openTask();else closeTask()}).observe(panel,{attributes:true,attributeFilter:['open']});
  window.visualViewport?.addEventListener('resize',fitTask);window.visualViewport?.addEventListener('scroll',fitTask);window.addEventListener?.('resize',fitTask);dialog.addEventListener('focusin',fitTask);
  if(document.documentElement)new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['data-workspace']});
  mobile.addEventListener('change',update);window.PLANNER_MOBILE_UI={openTask,closeTask,fitTask,update,active:()=>mobile.matches};update();
})();
