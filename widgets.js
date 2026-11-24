(function(root){
  'use strict';
  const catalog=[
    {type:'note',icon:'✎',title:'Piezīmes',description:'Atsevišķa vieta idejām un ātrām domām.'},
    {type:'focus',icon:'◷',title:'Fokusa taimeris',description:'25 vai 50 minūtes darbam, īsa pauze un tavs ilgums.'},
    {type:'countdown',icon:'◴',title:'Atpakaļskaitīšana',description:'Cik dienu atlicis līdz kampaņai, ceļojumam vai citam datumam.'},
    {type:'links',icon:'↗',title:'Ātrās saites',description:'Tavi darba rīki un biežāk lietotās lapas vienuviet.'},
    {type:'checklist',icon:'☑',title:'Kontrolsaraksts',description:'Neliels saraksts ar atzīmēm un paveiktā progresu.'},
    {type:'habits',icon:'◉',title:'Ieradumi',description:'Atzīmē ikdienas ieradumus un apskati pēdējās 7 dienas.'},
    {type:'calculator',icon:'±',title:'Kalkulators',description:'Ātri aprēķini ar iekavām un procentiem, piemēram, 250 × 20%.'},
    {type:'percent',icon:'%',title:'Procentu rēķins',description:'Procenti no summas, atlaide vai summas palielinājums.'},
    {type:'worldclock',icon:'◷',title:'Pasaules pulkstenis',description:'Rīga, Londona, Ņujorka un citas laika joslas.'}
  ];
  const zones={'Europe/Riga':'Rīga','Europe/London':'Londona','America/New_York':'Ņujorka','America/Los_Angeles':'Losandželosa','Asia/Dubai':'Dubaija','Asia/Tokyo':'Tokija','Australia/Sydney':'Sidneja'};
  const number=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  const text=(value,max=120)=>typeof value==='string'?value.slice(0,max):'';
  function dayInRiga(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Riga',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const part=type=>parts.find(p=>p.type===type).value;return part('year')+'-'+part('month')+'-'+part('day');
  }
  function validDate(value){return typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}
  function safeUrl(value){
    const raw=text(value,2048).trim();if(!raw)return null;
    try{const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(raw)?raw:'https://'+raw);return ['https:','http:'].includes(url.protocol)&&url.hostname&&!url.username&&!url.password?url.href:null}catch{return null}
  }
  function listItems(value){
    const seen=new Set();return (Array.isArray(value)?value:[]).slice(0,100).filter(item=>item&&typeof item.id==='string'&&/^[a-z\d-]{1,80}$/i.test(item.id)&&!seen.has(item.id)&&(seen.add(item.id),true)).map(item=>({id:item.id,text:text(item.text,240),done:!!item.done}));
  }
  function normalize(type,value={}){
    const data=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    if(type==='focus')return {minutes:Math.round(number(data.minutes,1,180,25)),remaining:Math.round(number(data.remaining,0,10800,Math.round(number(data.minutes,1,180,25))*60)),running:!!data.running&&Number.isFinite(data.endAt)&&data.endAt>0,endAt:number(data.endAt,0,1e15,0),label:text(data.label)};
    if(type==='countdown')return {date:validDate(data.date)?data.date:''};
    if(type==='links')return {links:(Array.isArray(data.links)?data.links:[]).slice(0,50).filter(link=>link&&safeUrl(link.url)).map((link,i)=>({id:typeof link.id==='string'&&/^[a-z\d-]{1,80}$/i.test(link.id)?link.id:'link-'+i,title:text(link.title)||new URL(safeUrl(link.url)).hostname,url:safeUrl(link.url)}))};
    if(type==='checklist'||type==='habits'){
      const result={items:listItems(data.items)};
      if(type==='habits'){
        result.checks={};for(const day of Object.keys(data.checks||{}).filter(validDate).sort().slice(-180)){
          result.checks[day]={};for(const item of result.items)if(data.checks[day]?.[item.id])result.checks[day][item.id]=true;
        }
      }return result;
    }
    if(type==='calculator')return {expression:text(data.expression,200)};
    if(type==='percent')return {base:text(data.base,30)||'100',rate:text(data.rate,30)||'20',mode:['of','discount','increase'].includes(data.mode)?data.mode:'of'};
    if(type==='worldclock')return {zones:[...new Set((Array.isArray(data.zones)?data.zones:['Europe/Riga','Europe/London','America/New_York']).filter(zone=>Object.hasOwn(zones,zone)))].slice(0,7)};
    return {};
  }
  function calculate(expression){
    const source=String(expression).replace(/\s/g,'').replace(/,/g,'.').replace(/×/g,'*').replace(/÷/g,'/');
    if(!source||source.length>200)throw Error('Ievadi aprēķinu.');
    const tokens=source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/%\-]/g)||[];
    if(tokens.join('')!==source)throw Error('Atļauti tikai skaitļi, iekavas un + − × ÷ %.');
    let index=0;
    function factor(){
      if(tokens[index]==='+'||tokens[index]==='-'){const sign=tokens[index++];return (sign==='-'?-1:1)*factor()}
      let result;if(tokens[index]==='('){index++;result=sum();if(tokens[index++]!==')')throw Error('Pārbaudi iekavas.')}else{const token=tokens[index++];if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token||''))throw Error('Pārbaudi aprēķinu.');result=Number(token)}
      while(tokens[index]==='%'){result/=100;index++}return result;
    }
    function product(){let result=factor();while(tokens[index]==='*'||tokens[index]==='/'){const op=tokens[index++],value=factor();if(op==='/'&&value===0)throw Error('Ar nulli dalīt nevar.');result=op==='*'?result*value:result/value}return result}
    function sum(){let result=product();while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++],value=product();result=op==='+'?result+value:result-value}return result}
    const result=sum();if(index!==tokens.length||!Number.isFinite(result))throw Error('Pārbaudi aprēķinu.');return result;
  }
  function remaining(data,now=Date.now()){return data.running?Math.max(0,Math.ceil((data.endAt-now)/1000)):data.remaining}
  const api={catalog,zones,normalize,calculate,safeUrl,validDate,dayInRiga,remaining};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.PLANNER_WIDGETS=api;
  if(typeof document==='undefined')return;
  const live=new Map();
  const fmt=value=>new Intl.NumberFormat('lv-LV',{maximumFractionDigits:6}).format(value);
  const element=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node};
  const button=(label,handler)=>{const node=element('button','widget-button',label);node.type='button';node.onclick=handler;return node};
  const field=(label,value,placeholder)=>{const wrap=element('label','widget-field',label),input=element('input');input.value=value;input.placeholder=placeholder||'';wrap.append(input);return {wrap,input}};
  const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  function mount(body,item,persist){
    unmount(item.id);const container=element('div','planner-widget widget-'+item.widgetType);body.append(container);
    item.widgetData=normalize(item.widgetType,item.widgetData);const data=item.widgetData;
    const save=()=>persist();let tick=null;
    if(item.widgetType==='focus'){
      const label=field('Pie kā strādāsi?',data.label,'Viens konkrēts darbs');label.input.maxLength=120;label.input.oninput=()=>{data.label=label.input.value;save()};
      const display=element('div','widget-big widget-timer'),status=element('p','widget-hint');display.setAttribute('role','timer');
      const actions=element('div','widget-actions');let start;
      function paint(){const seconds=remaining(data);if(data.running&&seconds===0){data.running=false;data.remaining=0;data.endAt=0;save()}
        display.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');start.textContent=data.running?'Pauze':data.remaining===0?'Sākt no jauna':'Sākt';status.textContent=seconds===0?'Laiks beidzies. Vari paņemt pauzi.':data.running?'Fokusa laiks rit.':'Taimeris darbojas, kamēr aplikācija ir atvērta.';
      }
      start=button('Sākt',()=>{if(data.running){data.remaining=remaining(data);data.running=false;data.endAt=0}else{if(data.remaining===0)data.remaining=data.minutes*60;data.endAt=Date.now()+data.remaining*1000;data.running=true}save();paint()});
      actions.append(start,button('Atiestatīt',()=>{data.running=false;data.endAt=0;data.remaining=data.minutes*60;save();paint()}));
      const presets=element('div','widget-actions');for(const minutes of [5,25,50])presets.append(button(minutes===5?'5 min pauze':minutes+' min',()=>{data.minutes=minutes;data.remaining=minutes*60;data.running=false;data.endAt=0;duration.input.value=minutes;save();paint()}));
      const duration=field('Ilgums minūtēs',data.minutes);duration.input.type='number';duration.input.min=1;duration.input.max=180;duration.input.onchange=()=>{data.minutes=Math.round(number(duration.input.value,1,180,25));duration.input.value=data.minutes;data.remaining=data.minutes*60;data.running=false;data.endAt=0;save();paint()};
      container.append(label.wrap,display,actions,presets,duration.wrap,status);tick=paint;paint();
    }else if(item.widgetType==='countdown'){
      const display=element('div','widget-big'),hint=element('p','widget-hint'),target=field('Mērķa datums',data.date);target.input.type='date';
      function paint(){if(!data.date){display.textContent='Izvēlies datumu';hint.textContent='Piemēram, kampaņas sākumu vai ceļojumu.';return}
        const days=Math.round((Date.parse(data.date+'T12:00:00Z')-Date.parse(dayInRiga()+'T12:00:00Z'))/86400000);display.textContent=days===0?'Šodien':Math.abs(days)+' '+(Math.abs(days)===1?'diena':'dienas');hint.textContent=days<0?'kopš izvēlētā datuma':'līdz '+new Intl.DateTimeFormat('lv-LV',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.date+'T12:00:00Z'));
      }target.input.onchange=()=>{data.date=validDate(target.input.value)?target.input.value:'';save();paint()};container.append(display,hint,target.wrap);tick=paint;paint();
    }else if(item.widgetType==='links'){
      const list=element('div','widget-list'),form=element('form','widget-form'),title=field('Nosaukums','','Piemēram, Mailjet'),url=field('Saite','','https://...'),message=element('p','widget-hint');url.input.type='text';
      function paint(){list.replaceChildren();for(const link of data.links){const row=element('div','widget-row'),anchor=element('a','widget-link',link.title);anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.title=link.url;const remove=button('×',()=>{data.links=data.links.filter(x=>x.id!==link.id);save();paint()});remove.setAttribute('aria-label','Dzēst saiti '+link.title);row.append(anchor,remove);list.append(row)}if(!data.links.length)list.append(element('p','widget-hint','Pievieno savas biežāk lietotās lapas.'))}
      const submit=button('+ Saite',()=>{});submit.type='submit';form.append(title.wrap,url.wrap,submit,message);form.onsubmit=e=>{e.preventDefault();const value=safeUrl(url.input.value);if(!value){message.textContent='Ievadi derīgu http vai https saiti.';return}if(data.links.length>=50){message.textContent='Šeit var saglabāt līdz 50 saitēm.';return}data.links.push({id:id(),title:title.input.value.trim().slice(0,120)||new URL(value).hostname,url:value});title.input.value='';url.input.value='';message.textContent='';save();paint()};container.append(list,form);paint();
    }else if(item.widgetType==='checklist'||item.widgetType==='habits'){
      const habit=item.widgetType==='habits',progress=element('p','widget-hint'),list=element('div','widget-list'),history=element('div','widget-history'),form=element('form','widget-inline-form'),input=element('input');input.placeholder=habit?'Jauns ieradums':'Jauns punkts';input.maxLength=240;input.setAttribute('aria-label',input.placeholder);const submit=button('+',()=>{});submit.type='submit';submit.setAttribute('aria-label',habit?'Pievienot ieradumu':'Pievienot punktu');form.append(input,submit);
      const checked=entry=>habit?!!data.checks[dayInRiga()]?.[entry.id]:entry.done;
      let lastDay=dayInRiga();
      function paint(){list.replaceChildren();let done=0;
        for(const entry of data.items){const row=element('div','widget-row'),label=element('label','widget-check-label'),check=element('input');check.type='checkbox';check.checked=checked(entry);if(check.checked)done++;check.onchange=()=>{if(habit){const day=dayInRiga();data.checks[day]=data.checks[day]||{};if(check.checked)data.checks[day][entry.id]=true;else delete data.checks[day][entry.id]}else entry.done=check.checked;save();paint()};label.append(check,element('span',check.checked?'widget-checked':'',entry.text));const remove=button('×',()=>{data.items=data.items.filter(x=>x.id!==entry.id);for(const checks of Object.values(data.checks||{}))delete checks[entry.id];save();paint()});remove.setAttribute('aria-label','Dzēst '+entry.text);row.append(label,remove);list.append(row)}
        progress.textContent=(habit?'Šodien: ':'')+done+' no '+data.items.length+' paveikti';if(!data.items.length)list.append(element('p','widget-hint',habit?'Pievieno ieradumu, kuru vēlies atzīmēt katru dienu.':'Pievieno pirmo kontrolsaraksta punktu.'));
        if(habit){history.replaceChildren();for(let i=6;i>=0;i--){const d=new Date(dayInRiga()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);const day=d.toISOString().slice(0,10),count=data.items.filter(x=>data.checks[day]?.[x.id]).length;const dot=element('span','widget-day'+(count?' has-progress':''),new Intl.DateTimeFormat('lv-LV',{weekday:'short',timeZone:'UTC'}).format(d));dot.title=day+': '+count+'/'+data.items.length;history.append(dot)}}
      }
      form.onsubmit=e=>{e.preventDefault();const value=input.value.trim();if(!value||data.items.length>=100)return;data.items.push({id:id(),text:value,done:false});input.value='';save();paint()};container.append(progress,list,history,form);paint();if(habit)tick=()=>{const day=dayInRiga();if(day!==lastDay){lastDay=day;paint()}};
    }else if(item.widgetType==='calculator'){
      const input=field('Aprēķins',data.expression,'(250 + 50) × 20%'),result=element('output','widget-result'),hint=element('p','widget-hint','Piemērs: 250 × 20% = 50. Var izmantot komatu un iekavas.');input.input.maxLength=200;
      function paint(){try{result.textContent=input.input.value.trim()?fmt(calculate(input.input.value)):'0'}catch(error){result.textContent=error.message}}
      input.input.oninput=()=>{data.expression=input.input.value;save();paint()};container.append(input.wrap,result,hint);paint();
    }else if(item.widgetType==='percent'){
      const base=field('Summa',data.base,'100'),rate=field('Procenti',data.rate,'20'),mode=element('select'),result=element('output','widget-result'),hint=element('p','widget-hint');base.input.inputMode='decimal';rate.input.inputMode='decimal';mode.setAttribute('aria-label','Aprēķina veids');for(const [value,label] of [['of','Procenti no summas'],['discount','Summa pēc atlaides'],['increase','Palielināt summu']]){const option=element('option','',label);option.value=value;mode.append(option)}mode.value=data.mode;
      function paint(){const a=Number(base.input.value.replace(',','.')),b=Number(rate.input.value.replace(',','.'));if(!base.input.value.trim()||!rate.input.value.trim()||!Number.isFinite(a)||!Number.isFinite(b)){result.textContent='Ievadi skaitļus';return}const value=a*b/100;result.textContent=fmt(data.mode==='discount'?a-value:data.mode==='increase'?a+value:value);hint.textContent='Procentu daļa: '+fmt(value)}
      for(const field of [base.input,rate.input,mode])field.oninput=()=>{data.base=base.input.value;data.rate=rate.input.value;data.mode=mode.value;save();paint()};mode.onchange=mode.oninput;container.append(base.wrap,rate.wrap,mode,result,hint);paint();
    }else if(item.widgetType==='worldclock'){
      const list=element('div','widget-list'),form=element('div','widget-inline-form'),select=element('select');select.setAttribute('aria-label','Pievienot laika joslu');for(const [zone,label] of Object.entries(zones)){const option=element('option','',label);option.value=zone;select.append(option)}form.append(select,button('+',()=>{if(!data.zones.includes(select.value)){data.zones.push(select.value);save();paint()}}));
      let lastMinute=-1;
      function paint(){list.replaceChildren();for(const zone of data.zones){const row=element('div','widget-row'),labels=element('div'),time=element('strong','widget-clock',new Intl.DateTimeFormat('lv-LV',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()));labels.append(element('span','',zones[zone]),element('small','widget-hint',new Intl.DateTimeFormat('lv-LV',{timeZone:zone,day:'numeric',month:'short'}).format(new Date())));const remove=button('×',()=>{data.zones=data.zones.filter(x=>x!==zone);save();paint()});remove.setAttribute('aria-label','Noņemt '+zones[zone]);row.append(labels,time,remove);list.append(row)}}
      container.append(list,form);tick=()=>{const minute=Math.floor(Date.now()/60000);if(minute!==lastMinute){lastMinute=minute;paint()}};tick();
    }
    live.set(item.id,{container,tick});return container;
  }
  function unmount(id){live.delete(id)}
  api.mount=mount;api.unmount=unmount;
  setInterval(()=>{if(document.hidden)return;for(const view of live.values())if(view.container.isConnected&&view.tick)view.tick()},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)for(const view of live.values())if(view.container.isConnected&&view.tick)view.tick()});
})(typeof window!=='undefined'?window:globalThis);
