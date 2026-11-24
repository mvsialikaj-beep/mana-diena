(function(){
  'use strict';
  const top=document.querySelector('.top-controls');if(!top)return;
  const media=window.matchMedia('(max-width:850px)'),items=[...top.querySelectorAll('button')].filter(button=>!button.closest('.workspace-switch'));
  const entries=items.map(button=>{const marker=document.createComment('tools-'+button.id);button.before(marker);const label=document.createElement('span');label.className='mobile-action-label';button.append(label);return {button,marker,label}});
  const trigger=document.createElement('button');trigger.type='button';trigger.id='mobileToolsOpen';trigger.textContent='☰';trigger.title='Rīki un iestatījumi';trigger.setAttribute('aria-label','Rīki un iestatījumi');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','mobileToolsDialog');top.append(trigger);
  const dialog=document.createElement('dialog');dialog.id='mobileToolsDialog';dialog.setAttribute('aria-labelledby','mobileToolsTitle');
  const head=document.createElement('div');head.className='mobile-tools-heading';const title=document.createElement('h3');title.id='mobileToolsTitle';title.textContent='Rīki un iestatījumi';const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Aizvērt rīkus');close.onclick=()=>dialog.close();head.append(title,close);
  const list=document.createElement('div');list.className='mobile-tools-list';dialog.append(head,list);document.body.append(dialog);
  trigger.onclick=()=>{for(const entry of entries)entry.label.textContent=entry.button.getAttribute('aria-label')||entry.button.title||entry.button.textContent;dialog.showModal();trigger.setAttribute('aria-expanded','true')};
  dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));
  list.addEventListener('click',event=>{const button=event.target.closest('button');if(entries.some(entry=>entry.button===button))dialog.close()},true);
  window.PLANNER_POPUPS?.bindBackdrop(dialog,()=>dialog.close());
  function update(){if(dialog.open)dialog.close();for(const entry of entries){if(media.matches)list.append(entry.button);else entry.marker.after(entry.button)}}
  media.addEventListener('change',update);update();
})();
