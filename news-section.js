(function(){
  'use strict';
  const provider=window.PLANNER_NEWS_WIDGET,top=document.querySelector('.top-controls');if(!provider||!top)return;
  const key='mana-ikdiena-news-preferences-v1';let options;
  try{options=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  // Move an existing news tile into the on-demand section, preserving its filters.
  try{const layoutKey='mana-ikdiena-dashboard-v1',layout=JSON.parse(localStorage.getItem(layoutKey)||'null');if(Array.isArray(layout?.items)&&layout.items.some(item=>item.widgetType==='industrynews')){if(!options)options=layout.items.find(item=>item.widgetType==='industrynews').widgetData;localStorage.setItem(key,JSON.stringify(provider.normalize(options)));layout.items=layout.items.filter(item=>item.widgetType!=='industrynews');localStorage.setItem(layoutKey,JSON.stringify(layout))}}catch{}
  const item={widgetData:provider.normalize(options)};
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
  const button=make('button');button.id='newsOpen';button.type='button';button.title='Nozares ziņas';button.setAttribute('aria-label','Nozares ziņas');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','newsDialog');button.setAttribute('aria-expanded','false');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v4H7zM15 8h2m-2 4h2M7 16h10"/></svg>';
  top.append(button);
  const dialog=make('dialog');dialog.id='newsDialog';dialog.setAttribute('aria-labelledby','newsHeading');
  const head=make('div','news-section-head'),heading=make('div'),title=make('h2','','Nozares ziņas');title.id='newsHeading';heading.append(title,make('p','','Tehnoloģijas, AI un e-komercija'));
  const close=make('button','','×');close.type='button';close.setAttribute('aria-label','Aizvērt ziņas');close.onclick=()=>dialog.close();head.append(heading,close);
  const body=make('div','news-section-body widget-industrynews');dialog.append(head,body);document.body.append(dialog);let cleanup=null;
  button.onclick=()=>{if(dialog.open)return;dialog.showModal();button.setAttribute('aria-expanded','true');body.replaceChildren();cleanup=provider.mount(body,item,()=>{try{localStorage.setItem(key,JSON.stringify(item.widgetData))}catch{}})};
  dialog.addEventListener('close',()=>{cleanup?.();cleanup=null;body.replaceChildren();button.setAttribute('aria-expanded','false');button.focus()});
  window.PLANNER_POPUPS?.bindBackdrop(dialog,()=>dialog.close());
})();
