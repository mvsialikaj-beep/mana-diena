(function(){
  'use strict';
  const dialog=document.getElementById('settingsDialog'),trigger=document.getElementById('settingsOpen'),top=document.querySelector('.top-controls'),panel=dialog?.querySelector('.settings-panel');if(!panel||!trigger||!top)return;
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
  const groups=new Map();for(const [id,title]of [['appearance','Izskats un izkārtojums'],['planning','Uzdevumi un plānošana'],['reminders','Atgādinājumi'],['tools','Piezīmes'],['account','Konts un dati'],['application','Aplikācija']]){const section=make('details','settings-topic'),summary=make('summary','',title),body=make('div','settings-topic-body'),actions=make('div','settings-topic-actions');section.dataset.topic=id;body.append(actions);section.append(summary,body);groups.set(id,{section,body,actions})}
  const entries=[];for(const [id,group]of [['fontOpen','appearance'],['layoutOpen','appearance'],['categoryOpen','planning'],['sickToggle','planning'],['noteOpen','tools'],['refresh','application']]){const button=document.getElementById(id);if(!button)continue;const label=make('span','settings-action-label');button.append(label);groups.get(group).actions.append(button);entries.push({button,label})}
  function labels(){for(const {button,label}of entries)label.textContent=button.getAttribute('aria-label')||button.title}
  labels();trigger.title='Iestatījumi';trigger.setAttribute('aria-label','Iestatījumi');const title=document.getElementById('settingsTitle');if(title)title.textContent='Iestatījumi';
  for(const section of [...panel.querySelectorAll(':scope > .settings-section')]){const name=section.querySelector('summary')?.textContent||'';const group=(section.classList.contains('dashboard-settings')||section.id==='personalMobileBlocks')?'appearance':name.includes('pārcelšana')?'planning':name.includes('Atgādinājumi')?'reminders':'account';groups.get(group).body.append(section)}
  for(const {section}of groups.values())panel.append(section);panel.open=true;trigger.addEventListener('click',labels);
  panel.addEventListener('click',event=>{const button=event.target.closest('button');if(entries.some(entry=>entry.button===button)&&button.id!=='sickToggle'&&dialog.open)dialog.close()},true);
  panel.addEventListener('click',()=>setTimeout(labels,0));
})();
