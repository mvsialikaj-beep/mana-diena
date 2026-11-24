(function(root){
  'use strict';
  const catalog=[
    {type:'note',icon:'✎',title:'Piezīmes',description:'Atsevišķa vieta idejām un ātrām domām.'},
    {type:'utm',icon:'↗',title:'UTM saišu veidotājs',fresh:true,description:'Veido marķētas saites e-pastiem, reklāmām un kampaņām.'},
    {type:'textstats',icon:'Aa',title:'Teksta darbnīca',fresh:true,description:'Rakstzīmes, vārdi, rindas un aptuvens lasīšanas ilgums.'},
    {type:'memory',icon:'▦',title:'Atmiņas spēle',fresh:true,description:'Atrodi 6 simbolu pārus un pārspēj savu gājienu rekordu.'},
    {type:'wheel',icon:'✺',title:'Izvēles rats',description:'Ieraksti variantus un ļauj ratam izvēlēties vienu.'},
    {type:'mood',icon:'☺',title:'Dienas noskaņa',description:'Kā šodien jūties? Emocija, īsa piezīme un 7 dienu vēsture.'},
    {type:'goal',icon:'◎',title:'Mērķa progress',description:'Grāmatas, kampaņas vai cits tavs mērķis ar progresa joslu.'},
    {type:'stopwatch',icon:'◴',title:'Hronometrs',description:'Izmēri patērēto laiku un saglabā apļu laikus.'},
    {type:'ideas',icon:'✦',title:'Mārketinga ideju mikseris',description:'Nejaušs satura virziens tavam produktam vai tēmai.'},
    {type:'timeprogress',icon:'◔',title:'Laika progress',description:'Nedēļas, mēneša vai gada progress un atlikušās dienas.'},
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
    if(type==='utm')return {url:text(data.url,2048),source:text(data.source),medium:text(data.medium),campaign:text(data.campaign,240),content:text(data.content,240),term:text(data.term,240)};
    if(type==='textstats')return {text:text(data.text,20000)};
    if(type==='memory'){
      const counts=Array(6).fill(0),valid=Array.isArray(data.deck)&&data.deck.length===12&&data.deck.every(x=>Number.isInteger(x)&&x>=0&&x<6&&(counts[x]++,true))&&counts.every(x=>x===2);
      return {deck:valid?[...data.deck]:[],matched:valid?[...new Set((Array.isArray(data.matched)?data.matched:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<6))]:[],moves:Math.round(number(data.moves,0,1e6,0)),best:Number.isInteger(data.best)&&data.best>0?data.best:null};
    }
    if(type==='wheel')return {options:(Array.isArray(data.options)?data.options:['Sākt ar svarīgāko','Pabeigt kādu mazu darbu','Paņemt īsu pauzi']).map(x=>text(x,120).trim()).filter(Boolean).slice(0,30),result:text(data.result),rotation:number(data.rotation,0,1e9,0)};
    if(type==='mood'){const days={};for(const day of Object.keys(data.days||{}).filter(validDate).sort().slice(-180)){const entry=data.days[day];if(entry&&typeof entry==='object')days[day]={mood:Math.round(number(entry.mood,0,5,0)),note:text(entry.note,500)}}return {days}}
    if(type==='goal')return {target:number(data.target,1,1e9,10),current:number(data.current,0,1e9,0),step:number(data.step,.01,1e9,1),unit:text(data.unit,30)||'vienības'};
    if(type==='stopwatch')return {elapsed:number(data.elapsed,0,31536000000,0),running:!!data.running&&Number.isFinite(data.startedAt)&&data.startedAt>0,startedAt:number(data.startedAt,0,1e15,0),laps:(Array.isArray(data.laps)?data.laps:[]).filter(Number.isFinite).map(x=>number(x,0,31536000000,0)).slice(-20)};
    if(type==='ideas')return {topic:text(data.topic),channel:['social','email','video'].includes(data.channel)?data.channel:'social',result:text(data.result,1000)};
    if(type==='timeprogress')return {period:['week','month','year'].includes(data.period)?data.period:'month'};
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
  function pickIndex(length,sample=Math.random()){return length>0?Math.min(length-1,Math.max(0,Math.floor(number(sample,0,1,0)*length))):-1}
  function stopwatchElapsed(data,now=Date.now()){return Math.max(0,data.elapsed+(data.running?Math.max(0,now-data.startedAt):0))}
  function periodProgress(day,period){
    if(!validDate(day))return {elapsed:0,total:1,remaining:1,percent:0};
    const d=new Date(day+'T12:00:00Z'),year=d.getUTCFullYear(),month=d.getUTCMonth();let elapsed,total;
    if(period==='week'){elapsed=(d.getUTCDay()+6)%7+1;total=7}else if(period==='year'){elapsed=Math.round((d-new Date(Date.UTC(year,0,1,12)))/86400000)+1;total=Math.round((Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000)}else{elapsed=d.getUTCDate();total=new Date(Date.UTC(year,month+1,0)).getUTCDate()}
    return {elapsed,total,remaining:total-elapsed,percent:Math.round(elapsed/total*100)};
  }
  function buildCampaignUrl(data){const safe=safeUrl(data.url);if(!safe)return null;const url=new URL(safe);for(const key of ['source','medium','campaign','content','term']){const value=text(data[key],240).trim();if(value)url.searchParams.set('utm_'+key,value);else url.searchParams.delete('utm_'+key)}return url.href}
  function textStats(value){const content=String(value||''),words=(content.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]).length;return {characters:Array.from(content).length,withoutSpaces:Array.from(content.replace(/\s/g,'')).length,words,lines:content?content.split(/\r\n|\r|\n/).length:0,minutes:Math.ceil(words/200)}}
  function shuffledDeck(random=Math.random){const deck=Array.from({length:12},(_,i)=>Math.floor(i/2));for(let i=deck.length-1;i>0;i--){const j=pickIndex(i+1,random());[deck[i],deck[j]]=[deck[j],deck[i]]}return deck}
  const api={catalog,zones,normalize,calculate,safeUrl,validDate,dayInRiga,remaining,pickIndex,stopwatchElapsed,periodProgress,buildCampaignUrl,textStats,shuffledDeck};
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
    const save=()=>persist();let tick=null,cleanup=null;
    if(item.widgetType==='utm'){
      const definitions=[['url','Galamērķa saite','https://...'],['source','Avots (utm_source)','newsletter, facebook…'],['medium','Kanāls (utm_medium)','email, social, cpc…'],['campaign','Kampaņa (utm_campaign)','black_friday_2026'],['content','Saturs (nav obligāts)','banner_a'],['term','Atslēgvārds (nav obligāts)','']];
      const fields=definitions.map(([key,label,placeholder])=>{const control=field(label,data[key],placeholder);control.input.maxLength=key==='url'?2048:240;control.input.oninput=()=>{data[key]=control.input.value;save();paint()};return control});
      const output=element('textarea','widget-utm-result');output.readOnly=true;output.rows=3;output.setAttribute('aria-label','Marķētā kampaņas saite');const hint=element('p','widget-hint');
      const copy=button('Nokopēt saiti',async()=>{if(!output.value)return;try{if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(output.value);hint.textContent='Saite nokopēta.'}catch{output.focus?.();output.select?.();hint.textContent='Saite atlasīta. Nokopē to ar savas ierīces kopēšanas komandu.'}});
      function paint(){const url=buildCampaignUrl(data);output.value=url||'';copy.disabled=!url;hint.textContent=!url?'Ievadi derīgu http vai https galamērķa saiti.':!data.source.trim()||!data.medium.trim()||!data.campaign.trim()?'Norādi arī avotu, kanālu un kampaņu.':'Saite gatava. Galamērķa lapā jābūt iestatītai analītikai.'}
      container.append(...fields.map(x=>x.wrap),output,copy,hint);paint();
    }else if(item.widgetType==='textstats'){
      const input=element('textarea','widget-text-workbench');input.value=data.text;input.rows=6;input.maxLength=20000;input.placeholder='Ielīmē tekstu…';input.setAttribute('aria-label','Teksts skaitīšanai');const stats=element('div','widget-text-stats'),hint=element('p','widget-hint');
      function paint(){const value=textStats(data.text);stats.replaceChildren();for(const [label,count] of [['Rakstzīmes',value.characters],['Bez atstarpēm',value.withoutSpaces],['Vārdi',value.words],['Rindas',value.lines]]){const cell=element('div');cell.append(element('strong','',String(count)),element('span','',label));stats.append(cell)}hint.textContent='Aptuvens lasīšanas ilgums: '+(value.words?Math.max(1,value.minutes):0)+' min.'}
      input.oninput=()=>{data.text=input.value;save();paint()};container.append(input,stats,hint);paint();
    }else if(item.widgetType==='memory'){
      const symbols=['☀','☾','★','♥','◆','♣'],status=element('p','widget-hint'),grid=element('div','widget-memory-grid'),best=element('p','widget-hint');let revealed=[],flipTimer=null;
      function paint(){grid.replaceChildren();status.textContent=data.matched.length===6?'Visi pāri atrasti! 🎉':'Gājieni: '+data.moves+' · Pāri: '+data.matched.length+'/6';best.textContent=data.best?'Labākais rezultāts: '+data.best+' gājieni':'Atver divas kartītes un atrodi vienādos simbolus.';
        data.deck.forEach((symbol,index)=>{const shown=data.matched.includes(symbol)||revealed.includes(index),card=button(shown?symbols[symbol]:'?',()=>turn(index));card.className='widget-memory-card'+(data.matched.includes(symbol)?' matched':'');card.disabled=data.matched.includes(symbol);card.setAttribute('aria-label',shown?'Simbols '+symbols[symbol]:'Atvērt kartīti '+(index+1));card.setAttribute('aria-pressed',String(shown));grid.append(card)})}
      function turn(index){if(revealed.includes(index)||data.matched.includes(data.deck[index])||revealed.length===2)return;revealed.push(index);if(revealed.length===2){data.moves++;if(data.deck[revealed[0]]===data.deck[revealed[1]]){data.matched.push(data.deck[index]);revealed=[];if(data.matched.length===6&&(!data.best||data.moves<data.best))data.best=data.moves;save()}else{save();flipTimer=setTimeout(()=>{revealed=[];flipTimer=null;paint()},850)}}paint()}
      function restart(){if(flipTimer)clearTimeout(flipTimer);flipTimer=null;revealed=[];data.deck=shuffledDeck();data.matched=[];data.moves=0;save();paint()}
      container.append(status,grid,button('Jauna spēle',restart),best);if(!data.deck.length)restart();else paint();cleanup=()=>{if(flipTimer)clearTimeout(flipTimer)};
    }else if(item.widgetType==='wheel'){
      const wheel=element('div','widget-wheel'),disc=element('div','widget-wheel-disc'),pointer=element('span','widget-wheel-pointer','▼'),center=element('span','widget-wheel-center','?');disc.setAttribute('aria-hidden','true');wheel.append(disc,center,pointer);
      const output=element('p','widget-choice-result',data.result||'Ko šodien izvēlamies?');output.setAttribute('role','status');
      const options=element('textarea','widget-options');options.value=data.options.join('\n');options.rows=4;options.maxLength=3600;options.setAttribute('aria-label','Izvēles varianti, katrs savā rindā');
      const palette=['#cbdce8','#e6d3df','#eadfc1','#d4d0e8','#cbdedb','#e8d2c8'];
      function paint(){const entries=data.options.length?data.options:[''],angle=360/entries.length;disc.style.background='conic-gradient('+entries.map((_,i)=>palette[i%palette.length]+' '+i*angle+'deg '+(i+1)*angle+'deg').join(',')+')';disc.style.transform='rotate('+data.rotation+'deg)'}
      const spin=button('Griezt ratu',()=>{if(!data.options.length){output.textContent='Vispirms pievieno vismaz vienu variantu.';return}const chosen=pickIndex(data.options.length);data.result=data.options[chosen];const destination=360-(chosen+.5)*360/data.options.length;data.rotation=(Math.floor(data.rotation/360)+4)*360+destination;output.textContent='Izvēle: '+data.result;save();paint()});
      options.oninput=()=>{data.options=options.value.split('\n').map(x=>x.trim().slice(0,120)).filter(Boolean).slice(0,30);save();paint()};container.append(wheel,output,spin,element('p','widget-hint','Katru izvēles variantu raksti jaunā rindā.'),options);paint();
    }else if(item.widgetType==='mood'){
      const faces=['','😞','😕','😐','🙂','😄'],labels=['','Smaga diena','Grūtāk','Vidēji','Labi','Ļoti labi'];
      const choices=element('div','widget-moods'),history=element('div','widget-history'),note=element('textarea','widget-mood-note'),hint=element('p','widget-hint');note.rows=2;note.maxLength=500;note.placeholder='Īsa piezīme par šodienu…';note.setAttribute('aria-label','Piezīme par dienas noskaņu');
      function entry(){const day=dayInRiga();if(!data.days[day])data.days[day]={mood:0,note:''};return data.days[day]}
      const buttons=[];for(let i=1;i<=5;i++){const face=button(faces[i],()=>{entry().mood=i;save();paint()});face.setAttribute('aria-label',labels[i]);buttons.push(face);choices.append(face)}
      let lastDay=dayInRiga();function paint(){const current=data.days[dayInRiga()]||{mood:0,note:''};buttons.forEach((face,i)=>face.setAttribute('aria-pressed',String(current.mood===i+1)));note.value=current.note;hint.textContent=current.mood?'Šodien: '+labels[current.mood]:'Kā tev šodien klājas?';history.replaceChildren();
        for(let i=6;i>=0;i--){const d=new Date(dayInRiga()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);const day=d.toISOString().slice(0,10),dot=element('span','widget-day widget-mood-day',faces[data.days[day]?.mood]||'·');dot.title=day+(data.days[day]?.mood?' · '+labels[data.days[day].mood]:'');history.append(dot)}}
      note.oninput=()=>{entry().note=note.value;save()};container.append(hint,choices,note,history);paint();tick=()=>{if(lastDay!==dayInRiga()){lastDay=dayInRiga();paint()}};
    }else if(item.widgetType==='goal'){
      const display=element('div','widget-big'),hint=element('p','widget-hint'),track=element('div','widget-goal-track'),fill=element('div');track.append(fill);track.setAttribute('role','progressbar');track.setAttribute('aria-label','Mērķa izpilde');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
      const current=field('Jau paveikts',data.current),target=field('Mērķis',data.target),unit=field('Mērvienība',data.unit,'grāmatas, kampaņas…'),step=field('Viena soļa lielums',data.step);for(const control of [current.input,target.input,step.input]){control.type='number';control.step='any';control.min=control===current.input?'0':'.01'}
      const actions=element('div','widget-actions');actions.append(button('− Solis',()=>{data.current=Math.max(0,data.current-data.step);current.input.value=data.current;save();paint()}),button('+ Solis',()=>{data.current=Math.min(1e9,data.current+data.step);current.input.value=data.current;save();paint()}));
      function paint(){const percent=Math.min(100,Math.round(data.current/data.target*100));display.textContent=percent+'%';fill.style.width=percent+'%';track.setAttribute('aria-valuenow',String(percent));hint.textContent=fmt(data.current)+' / '+fmt(data.target)+' '+data.unit+(percent===100?' · Mērķis sasniegts! 🎉':'')}
      for(const control of [current.input,target.input,step.input,unit.input])control.onchange=()=>{data.current=number(current.input.value,0,1e9,0);data.target=number(target.input.value,1,1e9,10);data.step=number(step.input.value,.01,1e9,1);data.unit=unit.input.value.slice(0,30)||'vienības';current.input.value=data.current;target.input.value=data.target;step.input.value=data.step;save();paint()};container.append(display,hint,track,actions,current.wrap,target.wrap,unit.wrap,step.wrap);paint();
    }else if(item.widgetType==='stopwatch'){
      const display=element('div','widget-big widget-timer'),actions=element('div','widget-actions'),laps=element('div','widget-list');let start;
      const duration=ms=>{const seconds=Math.floor(ms/1000);return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(x=>String(x).padStart(2,'0')).join(':')};
      function paint(){display.textContent=duration(stopwatchElapsed(data));start.textContent=data.running?'Apturēt':'Sākt'}
      function paintLaps(){laps.replaceChildren();data.laps.forEach((lap,i)=>laps.append(element('p','widget-hint','Aplis '+(i+1)+' · '+duration(lap))))}
      start=button('Sākt',()=>{if(data.running){data.elapsed=stopwatchElapsed(data);data.running=false;data.startedAt=0}else{data.startedAt=Date.now();data.running=true}save();paint()});
      actions.append(start,button('Aplis',()=>{if(data.laps.length>=20)return;data.laps.push(stopwatchElapsed(data));save();paintLaps()}),button('Atiestatīt',()=>{data.elapsed=0;data.running=false;data.startedAt=0;data.laps=[];save();paint();paintLaps()}));container.append(display,actions,laps);paint();paintLaps();tick=paint;
    }else if(item.widgetType==='ideas'){
      const topic=field('Produkts vai tēma',data.topic,'Piemēram, CARELIKA'),channel=element('select'),result=element('p','widget-idea-result',data.result||'Ievadi tēmu un sajauc ideju.');topic.input.maxLength=120;channel.setAttribute('aria-label','Satura formāts');for(const [value,label] of [['social','Sociālo tīklu ieraksts'],['email','E-pasts'],['video','Īss video']]){const option=element('option','',label);option.value=value;channel.append(option)}channel.value=data.channel;
      const directions=['Atbildi uz vienu bieži uzdotu jautājumu par tēmu “{t}”.','Parādi vienu praktisku piemēru par tēmu “{t}”.','Izveido trīs soļu kontrolsarakstu par tēmu “{t}”.','Pastāsti par tēmu “{t}” ar vienu īsu ikdienas situāciju.','Pajautā auditorijai, ko tā gribētu uzzināt par tēmu “{t}”.','Izveido aizkulišu stāstu, kas saistīts ar tēmu “{t}”.'];
      const endings={social:'Noslēgumā uzdod vienu konkrētu jautājumu komentāriem.',email:'Sāc ar skaidru ieguvumu lasītājam un noslēdz ar vienu aicinājumu rīkoties.',video:'Pirmajās sekundēs parādi jautājumu, pēc tam vienu saprotamu piemēru.'};
      topic.input.oninput=()=>{data.topic=topic.input.value;save()};channel.onchange=()=>{data.channel=channel.value;save()};container.append(topic.wrap,channel,button('Sajaukt ideju',()=>{const subject=data.topic.trim();if(!subject){result.textContent='Vispirms ieraksti produktu vai tēmu.';return}data.result=directions[pickIndex(directions.length)].replace('{t}',subject)+' '+endings[data.channel];result.textContent=data.result;save()}),result,element('p','widget-hint','Gatavi ideju virzieni. Pielāgo tekstu savam produktam un auditorijai.'));
    }else if(item.widgetType==='timeprogress'){
      const select=element('select'),ring=element('div','widget-period-ring'),value=element('strong'),hint=element('p','widget-hint');ring.append(value);select.setAttribute('aria-label','Laika periods');for(const [key,label] of [['week','Nedēļa'],['month','Mēnesis'],['year','Gads']]){const option=element('option','',label);option.value=key;select.append(option)}select.value=data.period;
      function paint(){const stats=periodProgress(dayInRiga(),data.period);ring.style.background='conic-gradient(var(--blue,#2f6675) '+stats.percent+'%,var(--line,#dce5e8) 0)';value.textContent=stats.percent+'%';hint.textContent='Atlikušas '+stats.remaining+' dienas · '+stats.elapsed+' no '+stats.total+' kalendāra dienām'}
      select.onchange=()=>{data.period=select.value;save();paint()};container.append(select,ring,hint);paint();let lastDay=dayInRiga();tick=()=>{if(lastDay!==dayInRiga()){lastDay=dayInRiga();paint()}};
    }else if(item.widgetType==='focus'){
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
    live.set(item.id,{container,tick,cleanup});return container;
  }
  function unmount(id){live.get(id)?.cleanup?.();live.delete(id)}
  api.mount=mount;api.unmount=unmount;
  setInterval(()=>{if(document.hidden)return;for(const view of live.values())if(view.container.isConnected&&view.tick)view.tick()},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)for(const view of live.values())if(view.container.isConnected&&view.tick)view.tick()});
})(typeof window!=='undefined'?window:globalThis);
