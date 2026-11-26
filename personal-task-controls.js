(function(){
  'use strict';
  const main=document.querySelector('main.main');if(!main)return;
  const key='mana-ikdiena-personal-task-controls-collapsed';let collapsed=false;try{collapsed=localStorage.getItem(key)==='true'}catch{}
  const toggle=document.createElement('button');toggle.type='button';toggle.id='personalTaskControlsToggle';toggle.className='personal-task-controls-toggle';
  const title=document.createElement('span');title.textContent='Uzdevumi';const action=document.createElement('span');action.className='personal-task-controls-action';toggle.append(title,action);
  const ids=[];for(const [selector,id]of [['.datebar','personalTaskDateControls'],['.sectionhead','personalTaskHeading'],['.filters','personalTaskFilters']]){const node=main.querySelector(selector);if(node){if(!node.id)node.id=id;ids.push(node.id)}}toggle.setAttribute('aria-controls',ids.join(' '));
  function paint(){main.classList.toggle('personal-task-controls-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Rādīt uzdevumu datumu un filtrus':'Samazināt uzdevumu vadīklas');action.textContent=collapsed?'Rādīt vadīklas ⌄':'Samazināt ⌃'}
  toggle.onclick=()=>{collapsed=!collapsed;try{localStorage.setItem(key,String(collapsed))}catch{}paint()};main.prepend(toggle);paint();
})();
