(function(root){
  'use strict';
  const formats={bold:['**','**','trekns teksts'],italic:['*','*','slīps teksts'],strike:['~~','~~','pārsvītrots teksts'],code:['`','`','kods']};
  function edit(value,start,end,action){
    start=Math.max(0,Math.min(value.length,start||0));end=Math.max(start,Math.min(value.length,end??start));
    if(formats[action]){const [before,after,fallback]=formats[action],selected=value.slice(start,end)||fallback,insert=before+selected+after;return {value:value.slice(0,start)+insert+value.slice(end),start:start+before.length,end:start+before.length+selected.length}}
    const prefixes={bullet:'• ',checkbox:'[ ] ',number:'1. ',heading:'## ',quote:'> '};if(!prefixes[action])return {value,start,end};
    const from=(start>0?value.lastIndexOf('\n',start-1):-1)+1,last=end>start&&value[end-1]==='\n'?end-1:end,next=value.indexOf('\n',last),to=next<0?value.length:next,lines=value.slice(from,to).split('\n');
    const clean=line=>line.replace(/^\s*(?:[-*•]\s+(?:\[[ xX]\]\s*)?|\[[ xX]\]\s*|[☐☑✓]\s*|\d+[.)]\s+|#{1,3}\s+|>\s?)/,'');
    const transformed=lines.map((line,i)=>(action==='number'?i+1+'. ':prefixes[action])+clean(line)).join('\n');return {value:value.slice(0,from)+transformed+value.slice(to),start:from,end:from+transformed.length};
  }
  function continueLine(value,start,end){if(start!==end)return null;const from=value.lastIndexOf('\n',start-1)+1,line=value.slice(from,start),m=line.match(/^(\s*)(• |[-*] |\[[ xX]\] |(\d+)\. )(.*)$/);if(!m)return null;if(!m[4].trim())return {value:value.slice(0,from)+value.slice(start),start:from,end:from};const prefix=m[3]?Number(m[3])+1+'. ':/^\[/.test(m[2])?'[ ] ':m[2],insert='\n'+m[1]+prefix;return {value:value.slice(0,start)+insert+value.slice(end),start:start+insert.length,end:start+insert.length}}
  function checkbox(line){const m=line.match(/^\s*(?:[-*]\s+)?\[([ xX])\]\s*(.*)$/)||line.match(/^\s*([☐☑✓])\s*(.*)$/)||line.match(/^\s*[-*]\s+(.*)$/);if(!m)return null;return {label:(m.length===2?m[1]:m[2]).replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/\*\*|~~|`|\*/g,'').trim(),checked:m.length!==2&&/[xX☑✓]/.test(m[1])}}
  function reconcile(before,after,states){
    const queues=new Map(),result={};String(before||'').split('\n').forEach((line,i)=>{const c=checkbox(line);if(c){const key=c.label+'|'+c.checked;if(!queues.has(key))queues.set(key,[]);queues.get(key).push(i)}});
    const matches=[];String(after||'').split('\n').forEach((line,i)=>{const c=checkbox(line),queue=c&&queues.get(c.label+'|'+c.checked);if(queue?.length)matches.push([queue.shift(),i])});
    for(const [day,state] of Object.entries(states||{})){if(!/^(single|\d{4}-\d{2}-\d{2})$/.test(day)||!state||typeof state!=='object')continue;const next={};for(const [oldIndex,newIndex] of matches)if(typeof state[oldIndex]==='boolean')next[newIndex]=state[oldIndex];if(Object.keys(next).length)result[day]=next}return result;
  }
  function safeLink(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}}
  function plainText(text){return String(text||'').replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/^\s*(?:#{1,3}\s+|>\s?|•\s+)/gm,'').replace(/\*\*|~~|`/g,'').replace(/\*([^*\n]+)\*/g,'$1').replace(/\s+/g,' ').trim()}
  const api={edit,continueLine,checkbox,reconcile,safeLink,plainText};root.PLANNER_DESCRIPTION=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof document==='undefined')return;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
  function appendInline(target,value,depth=0){
    const text=String(value||'');if(depth>3){target.append(document.createTextNode(text));return}
    const re=/\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|`([^`\n]+)`|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g;let last=0,m;
    while((m=re.exec(text))){target.append(document.createTextNode(text.slice(last,m.index)));if(m[5]||m[7]){let raw=m[6]||m[7],trail='';if(m[7])while(/[.,!?;:)\]]$/.test(raw)){trail=raw.slice(-1)+trail;raw=raw.slice(0,-1)}const url=safeLink(raw);if(url){const a=el('a','',m[5]||raw);a.href=url;a.target='_blank';a.rel='noopener noreferrer';target.append(a)}else target.append(document.createTextNode(m[0]));if(trail)target.append(document.createTextNode(trail))}else{const tag=m[1]?'strong':m[2]?'s':m[3]?'code':'em',node=el(tag);const inner=m[1]||m[2]||m[3]||m[4];if(tag==='code')node.textContent=inner;else appendInline(node,inner,depth+1);target.append(node)}last=m.index+m[0].length}target.append(document.createTextNode(text.slice(last)));
  }
  function appendLine(target,line){let match;if((match=line.match(/^\s*•\s+(.*)$/))){const list=el('ul','description-bullets'),li=el('li');appendInline(li,match[1]);list.append(li);target.append(list)}else if((match=line.match(/^\s*(\d+)[.)]\s+(.*)$/))){const list=el('ol','description-numbers'),li=el('li');list.start=Math.max(1,Math.min(9999,Number(match[1])));appendInline(li,match[2]);list.append(li);target.append(list)}else if((match=line.match(/^\s*#{1,3}\s+(.*)$/))){const heading=el('h4','description-heading');appendInline(heading,match[1]);target.append(heading)}else if((match=line.match(/^\s*>\s?(.*)$/))){const quote=el('blockquote','description-quote');appendInline(quote,match[1]);target.append(quote)}else appendInline(target,line)}
  function preview(target,text){target.replaceChildren();for(const line of text.split('\n')){const row=el('div'),c=checkbox(line);if(c){const label=el('label','subtask'),input=el('input');input.type='checkbox';input.checked=c.checked;input.disabled=true;input.setAttribute('aria-label',c.label||'Kontrolsaraksta punkts');label.append(input);const span=el('span');appendInline(span,c.label);label.append(span);row.append(label)}else appendLine(row,line);target.append(row)}}
  api.appendInline=appendInline;api.appendLine=appendLine;api.preview=preview;
})(typeof window!=='undefined'?window:globalThis);
