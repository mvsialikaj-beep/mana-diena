(function(){
  'use strict';
  const mobile=window.matchMedia('(max-width:850px)'),panel=document.getElementById('taskFormPanel'),glance=document.getElementById('calendarGlance'),main=document.querySelector('main.main');
  if(!panel||!main||!glance)return;
  const panelHome=document.createComment('mobile-task-form-home'),glanceHome=document.createComment('mobile-clock-home');panel.before(panelHome);glance.before(glanceHome);
  const dialog=document.createElement('dialog');dialog.id='mobileTaskDialog';dialog.setAttribute('aria-label','Uzdevuma pievienošana vai rediģēšana');document.body.append(dialog);
  function openTask(){if(!mobile.matches)return;if(panel.parentElement!==dialog)dialog.append(panel);if(!panel.open)panel.open=true;if(!dialog.open)dialog.showModal();dialog.scrollTop=0}
  function closeTask(){if(dialog.open)dialog.close();if(mobile.matches&&panel.open)panel.open=false}
  function update(){if(mobile.matches){main.prepend(glance);dialog.append(panel);if(panel.open)openTask()}else{if(dialog.open)dialog.close();glanceHome.after(glance);panelHome.after(panel)}}
  dialog.addEventListener('cancel',()=>{panel.open=false});
  dialog.addEventListener('close',()=>{if(mobile.matches)panel.open=false});
  dialog.addEventListener('click',event=>{if(event.target===dialog){panel.open=false;closeTask()}});
  new MutationObserver(()=>{if(!mobile.matches)return;if(panel.open)openTask();else closeTask()}).observe(panel,{attributes:true,attributeFilter:['open']});
  mobile.addEventListener('change',update);window.PLANNER_MOBILE_UI={openTask,closeTask,active:()=>mobile.matches};update();
})();
