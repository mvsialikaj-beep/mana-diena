(() => {
  'use strict';
  const storageKey = 'mana-ikdiena-design-v1';
  const root = document.documentElement;
  const panel = document.querySelector('.settings-panel');
  if (!panel) return;

  const sections = [
    ['page', 'Lapas fons', '#f5f6f4', '#142129'],
    ['header', 'Augšējā josla', '#fcfdfc', '#1d2a31'],
    ['motivation', 'Dienas impulss', '#f7f2e9', '#2d2c2a'],
    ['main', 'Uzdevumu saraksta panelis', '#ffffff', '#1d2a31'],
    ['categories', 'Kategoriju panelis', '#ffffff', '#1d2a31'],
    ['sidebar', 'Kalendāra un progresa panelis', '#ffffff', '#1d2a31'],
    ['priority', 'Prioritāšu sadaļa', '#fff9f5', '#352f2c'],
    ['regular', 'Pārējo darbu sadaļa', '#f7fafb', '#253840'],
    ['tasks', 'Uzdevumu kartītes', '#fcfdfd', '#23323a'],
    ['form', 'Uzdevuma pievienošanas logs', '#f7faf9', '#1d2a31'],
    ['notes', 'Piezīmes', '#fffdf5', '#283940'],
    ['namedays', 'Vārdadienas', '#fff8ec', '#342e29'],
    ['buttons', 'Pogas', '#f5f8f9', '#30424b'],
    ['accent', 'Aktīvās pogas un progress', '#2f6675', '#5d93a2'],
    ['text', 'Pamatteksts', '#23313d', '#eef3f5']
  ];
  const sectionKeys = new Set(sections.map(([key]) => key));
  const fineGroups = [
    ['Uzdevumu kartītes', [
      ['taskSurface','Kartītes fons','#fcfdfd','#23323a'],
      ['taskInk','Nosaukums un apraksts','#263740','#e8f0f3'],
      ['taskOutline','Kartītes rāmis','#dce5e8','#4b606a'],
      ['taskTimeSurface','Laika atzīmes fons','#eaf4f7','#314a55'],
      ['taskTimeInk','Laika atzīmes teksts','#275365','#e4f3f7'],
      ['taskDone','Paveikta darba teksts','#82909a','#9caeb7'],
      ['taskCheck','Atzīmēta izvēles rūtiņa','#4f8190','#75a8b7']
    ]],
    ['Kategorijas', [
      ['categorySurface','Kategorijas fons','#eef4f6','#2e424b'],
      ['categoryInk','Kategorijas teksts','#34424d','#edf3f5'],
      ['categoryOutline','Kategorijas bloka rāmis','#cbd9de','#526570'],
      ['categoryDot','Kategorijas punkts','#8d99a2','#a9c1cb']
    ]],
    ['Kalendāra dienas', [
      ['holidaySurface','Svētku dienas fons','#fceeee','#623b43'],
      ['holidayInk','Svētku dienas datums','#b34c55','#ffdee1'],
      ['holidayOutline','Svētku dienas rāmis','#c85b65','#d58c94'],
      ['weekendInk','Brīvdienas datums','#9daab0','#81949d'],
      ['todayOutline','Šodienas rāmis','#97bcc5','#9ac7d4'],
      ['selectedSurface','Izvēlētās dienas fons','#dceef2','#3b5661'],
      ['selectedInk','Izvēlētās dienas datums','#204f5d','#ffffff']
    ]],
    ['Citi rāmji', [
      ['cardOutline','Lielo paneļu rāmis','#e1e7e9','#40535b'],
      ['sectionOutline','Prioritāšu un darbu sadaļu rāmis','#d8e5eb','#4b6671']
    ]]
  ];
  const fineColors = fineGroups.flatMap(([,items])=>items);
  const frameDefaults = {taskBorder:1,categoryBorder:0,holidayBorder:0,cardBorder:1,sectionBorder:1,
    taskRadius:12,categoryRadius:9,holidayRadius:10,taskShadow:'default',taskBorderStyle:'solid',categoryBorderStyle:'solid'};
  const fonts = {
    default: '',
    system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    segoe: '"Segoe UI", system-ui, sans-serif',
    calibri: 'Calibri, "Segoe UI", sans-serif',
    aptos: 'Aptos, Calibri, sans-serif',
    helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    trebuchet: '"Trebuchet MS", sans-serif',
    cambria: 'Cambria, Georgia, serif',
    palatino: '"Palatino Linotype", Palatino, Georgia, serif',
    monospace: 'Consolas, Menlo, monospace',
    arial: 'Arial, Helvetica, sans-serif',
    verdana: 'Verdana, Geneva, sans-serif',
    tahoma: 'Tahoma, Geneva, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif'
  };
  const weightFields = [
    ['headingWeight', 'headings', '700'],
    ['taskWeight', 'tasks', '700'],
    ['categoryWeight', 'categories', '700'],
    ['controlWeight', 'controls', '600'],
    ['bodyWeight', 'body', '400']
  ];
  const weightOptions = [
    ['300', 'Viegls'], ['400', 'Parasts'], ['500', 'Vidējs'], ['600', 'Pustrekns'],
    ['700', 'Trekns'], ['800', 'Ļoti trekns']
  ];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  const settings = {
    font: Object.hasOwn(fonts, saved.font) ? saved.font : 'default',
    size: Number.isInteger(saved.size) && saved.size >= 14 && saved.size <= 22 ? saved.size : 16,
    density: ['normal', 'compact', 'roomy'].includes(saved.density) ? saved.density : 'normal',
    corners: Number.isInteger(saved.corners) && saved.corners >= 8 && saved.corners <= 24 ? saved.corners : 16,
    tracking: ['normal','roomy','wide'].includes(saved.tracking)?saved.tracking:'normal',
    lineHeight: ['normal','relaxed','wide'].includes(saved.lineHeight)?saved.lineHeight:'normal',
    colors: {}, fineColors: {}, frames: {...frameDefaults}
  };
  for (const [key, , initial] of weightFields) {
    settings[key] = weightOptions.some(([value]) => value === String(saved[key])) ? String(saved[key]) : initial;
  }
  for (const [key] of sections) {
    const value = saved.colors?.[key];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) settings.colors[key] = value;
  }
  for (const [key] of fineColors) {
    const value = saved.fineColors?.[key];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) settings.fineColors[key] = value;
  }
  for (const [key, initial] of Object.entries(frameDefaults)) {
    const value=saved.frames?.[key];
    const max=key==='holidayBorder'?4:key.endsWith('Border')?5:key==='holidayRadius'?18:24;
    if (typeof initial==='number' && Number.isInteger(value) && value>=0 && value<=max) settings.frames[key]=value;
    if (typeof initial==='string' && (key==='taskShadow'?['default','none','soft','strong']:['solid','dashed','dotted']).includes(value)) settings.frames[key]=value;
  }

  const details = document.createElement('details');
  details.className = 'sideblock design-settings';
  details.id = 'designSettings';
  const summary = document.createElement('summary');
  summary.textContent = 'Dizaina pielāgošana';
  details.append(summary);
  const content = document.createElement('div');
  content.className = 'design-settings-content';
  details.append(content);
  panel.querySelector('summary').insertAdjacentElement('afterend', details);

  const addHeading = title => {
    const heading = document.createElement('h4');
    heading.textContent = title;
    content.append(heading);
  };
  const addSelect = (label, key, options) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'design-control';
    wrapper.textContent = label;
    const select = document.createElement('select');
    select.id = 'design-' + key;
    for (const [value, text] of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.value = settings[key];
    select.addEventListener('change', () => {
      settings[key] = select.value;
      apply(); persist();
    });
    wrapper.append(select);
    content.append(wrapper);
  };
  const addRange = (label, key, min, max, suffix) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'design-control';
    const title = document.createElement('span');
    const output = document.createElement('output');
    output.textContent = settings[key] + suffix;
    title.textContent = label + ' ';
    title.append(output);
    const input = document.createElement('input');
    input.id = 'design-' + key;
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = '1';
    input.value = settings[key];
    input.addEventListener('input', () => {
      settings[key] = Number(input.value);
      output.textContent = input.value + suffix;
      apply(); persist();
    });
    wrapper.append(title, input);
    content.append(wrapper);
  };

  addHeading('Teksts un izkārtojums');
  addSelect('Fonts', 'font', [
    ['default', 'Noklusētais'], ['system', 'Sistēmas fonts'], ['arial', 'Arial'],
    ['verdana', 'Verdana'], ['tahoma', 'Tahoma'], ['georgia', 'Georgia'], ['segoe','Segoe UI'], ['calibri','Calibri'], ['aptos','Aptos'], ['helvetica','Helvetica'], ['trebuchet','Trebuchet MS'], ['cambria','Cambria'], ['palatino','Palatino'], ['monospace','Consolas / Menlo']
  ]);
  addRange('Teksta lielums', 'size', 14, 22, ' px');
  const fontSample = document.createElement('p');
  fontSample.textContent = 'Ātrais brūnais lapsēns. Ģ, ķ, ļ, ņ, š, ž.';
  fontSample.className = 'font-sample';
  content.append(fontSample);
  const fontShortcut = document.querySelector('#fontOpen');
  if (fontShortcut) fontShortcut.onclick = () => {
    panel.open = true;
    details.open = true;
    content.querySelector('#design-font').focus();
  };
  addSelect('Burtu atstarpes','tracking',[['normal','Parastas'],['roomy','Brīvākas'],['wide','Plašas']]);
  addSelect('Rindstarpa','lineHeight',[['normal','Parasta'],['relaxed','Brīvāka'],['wide','Plaša']]);
  addHeading('Teksta biezums');
  addSelect('Virsraksti', 'headingWeight', weightOptions);
  addSelect('Uzdevumu nosaukumi', 'taskWeight', weightOptions);
  addSelect('Kategoriju nosaukumi', 'categoryWeight', weightOptions);
  addSelect('Pogas un lauku nosaukumi', 'controlWeight', weightOptions);
  addSelect('Apraksti un pārējais teksts', 'bodyWeight', weightOptions);
  addSelect('Atstarpes', 'density', [
    ['normal', 'Parastās'], ['compact', 'Mazākas'], ['roomy', 'Plašākas']
  ]);
  addRange('Stūru noapaļojums', 'corners', 8, 24, ' px');
  addHeading('Sadaļu krāsas');
  const grid = document.createElement('div');
  grid.className = 'design-color-grid';
  content.append(grid);
  const colorInputs = new Map();

  const gradientControls = new Map();
  const refreshGradientPreviews = [];
  const gradients = Object.create(null);
  function gradientBackground(first, gradient) {
    const clamp=(value,max)=>Math.min(max,Math.max(0,Number(value)||0));
    const start=clamp(gradient.start ?? 0,100);
    const finish=Math.max(start,clamp(gradient.finish ?? 100,100));
    return 'linear-gradient('+clamp(gradient.angle,360)+'deg,'+first+' '+start+'%,'+gradient.end+' '+finish+'%)';
  }
  function addEyedropper(input,container) {
    if(typeof window==='undefined'||typeof window.EyeDropper!=='function')return;
    const button=document.createElement('button');
    button.type='button';
    button.textContent='Pipete';
    button.style.gridColumn='1 / -1';
    button.style.width='auto';
    button.addEventListener('click',()=>{
      document.getElementById('screenColorPicker')?.remove();
      const bar=document.createElement('div');
      bar.id='screenColorPicker';
      bar.setAttribute('role','group');
      bar.setAttribute('aria-label','Ekrāna krāsas izvēle');
      bar.style.cssText='position:fixed;inset:12px auto auto 12px;max-width:calc(100vw - 24px);z-index:10000;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px;border-radius:12px;background:#18283a;color:white;box-shadow:0 4px 20px #0005';
      const hint=document.createElement('span');
      hint.textContent='Aizritini līdz vajadzīgajai krāsai.';
      const pick=document.createElement('button');
      pick.type='button';
      pick.textContent='Paņemt krāsu';
      const cancel=document.createElement('button');
      cancel.type='button';
      cancel.textContent='Atcelt';
      cancel.onclick=()=>bar.remove();
      pick.onclick=async()=>{
        try {
          bar.style.visibility='hidden';
          const {sRGBHex}=await new window.EyeDropper().open();
          input.value=sRGBHex;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          bar.remove();
        } catch(error) {
          bar.style.visibility='';
          if(error.name!=='AbortError') hint.textContent='Pipeti neizdevās atvērt. Mēģini vēlreiz.';
        }
      };
      const calendar=document.createElement('button');
      calendar.type='button';
      calendar.textContent='Uz kalendāru';
      calendar.onclick=()=>{
        document.getElementById('calendarGlance')?.scrollIntoView({block:'center'});
        pick.focus({preventScroll:true});
      };
      bar.append(hint,calendar,pick,cancel);
      document.body.append(bar);
      pick.focus({preventScroll:true});
    });
    container.append(button);
  }
  function addGradient(key, input, reset, row) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Gradients';
    const end = document.createElement('input');
    end.type = 'color';
    end.setAttribute('aria-label','Gradienta otrā krāsa');
    function number(label,min,max,value) {
      const field=document.createElement('label');
      field.textContent=label;
      const control=document.createElement('input');
      control.type='number'; control.min=min; control.max=max; control.value=value;
      field.append(control);
      return {field,control};
    }
    const angle=number('Leņķis °',0,360,135);
    const start=number('Pirmā krāsa %',0,100,0);
    const finish=number('Otrā krāsa %',0,100,100);
    const preview=document.createElement('div');
    preview.style.minHeight='28px';
    preview.style.borderRadius='6px';
    preview.style.flexBasis='100%';
    const clear = document.createElement('button');
    clear.type='button'; clear.textContent='Vienkrāsains';
    const savedGradient = saved.gradients?.[key];
    if (/^#[0-9a-f]{6}$/i.test(savedGradient?.end || '') && /^\d{1,3}$/.test(savedGradient?.angle) && Number(savedGradient.angle)<=360) gradients[key]=savedGradient;
    end.value=gradients[key]?.end || input.value;
    angle.control.value=gradients[key]?.angle ?? 135;
    start.control.value=gradients[key]?.start ?? 0;
    finish.control.value=gradients[key]?.finish ?? 100;
    refreshGradientPreviews.push(() => {
      preview.style.background=gradientBackground(input.value, gradients[key] || {end:end.value,angle:angle.control.value,start:start.control.value,finish:finish.control.value});
    });
    details.open=!!gradients[key];
    function change() {
      gradients[key]={end:end.value,angle:angle.control.value,start:start.control.value,finish:finish.control.value};
      apply(); persist();
    }
    function remove() { delete gradients[key]; apply(); persist(); }
    end.addEventListener('input',change);
    for(const {control} of [angle,start,finish]) control.addEventListener('input',change);
    clear.addEventListener('click',remove);
    reset.addEventListener('click',remove);
    details.append(summary,preview,end,angle.field,start.field,finish.field,clear);
    addEyedropper(end,details);
    row.append(details);
    gradientControls.set(key,input);
  }
  for (const [key, label, light, dark] of sections) {
    const row = document.createElement('div');
    row.className = 'design-color-row';
    const name = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.id = 'design-color-' + key;
    input.value = settings.colors[key] || (root.dataset.theme === 'dark' ? dark : light);
    name.htmlFor = input.id;
    name.textContent = label;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = '↺';
    reset.title = 'Atjaunot sākotnējo krāsu: ' + label;
    reset.setAttribute('aria-label', reset.title);
    reset.disabled = !settings.colors[key];
    input.addEventListener('input', () => {
      settings.colors[key] = input.value;
      reset.disabled = false;
      apply(); persist();
    });
    reset.addEventListener('click', () => {
      delete settings.colors[key];
      input.value = root.dataset.theme === 'dark' ? dark : light;
      reset.disabled = true;
      apply(); persist();
    });
    row.append(name, input, reset);
    grid.append(row);
    colorInputs.set(key, { input, light, dark });
    addEyedropper(input,row);
    if(key!=='text') addGradient(key,input,reset,row);
  }
  const fineInputs = new Map();
  addHeading('Detalizētas krāsas un rāmji');
  for (const [title, items] of fineGroups) {
    const group=document.createElement('details');group.className='design-subgroup';
    const heading=document.createElement('summary');heading.textContent=title;group.append(heading);
    const rows=document.createElement('div');rows.className='design-color-grid';group.append(rows);content.append(group);
    for (const [key,label,light,dark] of items) {
      const row=document.createElement('div');row.className='design-color-row';
      const name=document.createElement('label');name.textContent=label;
      const input=document.createElement('input');input.type='color';input.id='design-fine-'+key;
      input.value=settings.fineColors[key]||(root.dataset.theme==='dark'?dark:light);name.htmlFor=input.id;
      const reset=document.createElement('button');reset.type='button';reset.textContent='↺';
      reset.title='Atjaunot sākotnējo krāsu: '+label;reset.setAttribute('aria-label',reset.title);
      reset.disabled=!settings.fineColors[key];
      input.addEventListener('input',()=>{settings.fineColors[key]=input.value;reset.disabled=false;apply();persist()});
      reset.addEventListener('click',()=>{delete settings.fineColors[key];input.value=root.dataset.theme==='dark'?dark:light;reset.disabled=true;apply();persist()});
      row.append(name,input,reset);rows.append(row);fineInputs.set(key,{input,light,dark});
      addEyedropper(input,row);
      if(key.endsWith('Surface')) addGradient(key,input,reset,row);
    }
  }
  const frameGroup=document.createElement('details');frameGroup.className='design-subgroup';
  const frameHeading=document.createElement('summary');frameHeading.textContent='Rāmji un stūri';frameGroup.append(frameHeading);
  const frameBody=document.createElement('div');frameBody.className='design-frame-grid';frameGroup.append(frameBody);content.append(frameGroup);
  const frameControls=new Map();
  const frameFields=[
    ['taskBorder','Uzdevuma rāmja biezums',0,5],['categoryBorder','Kategorijas bloka rāmja biezums',0,5],
    ['holidayBorder','Svētku dienas rāmja biezums',0,4],['cardBorder','Paneļa rāmja biezums',0,5],
    ['sectionBorder','Sadaļas rāmja biezums',0,5],['taskRadius','Uzdevuma stūri',0,24],
    ['categoryRadius','Kategorijas stūri',0,24],['holidayRadius','Kalendāra dienas stūri',0,18]
  ];
  for(const [key,label,min,max] of frameFields){
    const wrap=document.createElement('label');wrap.className='design-control';
    const title=document.createElement('span');title.textContent=label+' ';
    const output=document.createElement('output');output.textContent=settings.frames[key]+' px';title.append(output);
    const input=document.createElement('input');input.id='design-frame-'+key;input.type='range';
    input.min=min;input.max=max;input.step='1';input.value=settings.frames[key];
    input.addEventListener('input',()=>{settings.frames[key]=Number(input.value);output.textContent=input.value+' px';apply();persist()});
    wrap.append(title,input);frameBody.append(wrap);frameControls.set(key,{input,output});
  }
  for(const [key,label,options] of [
    ['taskBorderStyle','Uzdevuma rāmja līnija',[['solid','Vienlaidu'],['dashed','Pārtraukta'],['dotted','Punktota']]],
    ['categoryBorderStyle','Kategorijas rāmja līnija',[['solid','Vienlaidu'],['dashed','Pārtraukta'],['dotted','Punktota']]],
    ['taskShadow','Uzdevuma ēna',[['default','Noklusētā'],['none','Bez ēnas'],['soft','Viegla'],['strong','Izteikta']]]
  ]){
    const wrap=document.createElement('label');wrap.className='design-control';wrap.textContent=label;
    const select=document.createElement('select');select.id='design-frame-'+key;
    for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
    select.value=settings.frames[key];select.addEventListener('change',()=>{settings.frames[key]=select.value;apply();persist()});
    wrap.append(select);frameBody.append(wrap);frameControls.set(key,{input:select});
  }
  const resetAll = document.createElement('button');
  resetAll.type = 'button';
  resetAll.id = 'designReset';
  resetAll.textContent = 'Atjaunot sākotnējo dizainu';
  resetAll.addEventListener('click', () => {
    settings.font = 'default'; settings.size = 16;
    settings.tracking='normal';content.querySelector('#design-tracking').value='normal';
    settings.lineHeight='normal';content.querySelector('#design-lineHeight').value='normal';
    settings.density = 'normal'; settings.corners = 16;
    for (const [key, , initial] of weightFields) {
      settings[key] = initial;
      content.querySelector('#design-' + key).value = initial;
    }
    for(const key of Object.keys(gradients)) delete gradients[key];
    settings.colors = {};settings.fineColors={};settings.frames={...frameDefaults};
    content.querySelector('#design-font').value = 'default';
    content.querySelector('#design-density').value = 'normal';
    for (const key of ['size', 'corners']) {
      const input = content.querySelector('#design-' + key);
      input.value = settings[key];
      input.closest('label').querySelector('output').textContent = settings[key] + (key === 'size' ? ' px' : ' px');
    }
    for (const [key, {input, light, dark}] of colorInputs) {
      input.value = root.dataset.theme === 'dark' ? dark : light;
      input.nextElementSibling.disabled = true;
    }
    for (const {input,light,dark} of fineInputs.values()) {input.value=root.dataset.theme==='dark'?dark:light;input.nextElementSibling.disabled=true}
    for(const [key,{input,output}] of frameControls){input.value=frameDefaults[key];if(output)output.textContent=frameDefaults[key]+' px'}
    apply(); persist();
  });
  content.append(resetAll);

  function inkFor(hex) {
    const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const luminance = .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
    return luminance > .179 ? '#17242b' : '#ffffff';
  }
  function apply() {
    root.toggleAttribute('data-design-font', settings.font !== 'default');
    root.style.setProperty('--design-font', fonts[settings.font] || 'Arial, Helvetica, sans-serif');
    root.toggleAttribute('data-design-size', settings.size !== 16);
    root.style.setProperty('--design-size', settings.size + 'px');
    for (const [key, attribute, initial] of weightFields) {
      root.toggleAttribute('data-design-weight-' + attribute, settings[key] !== initial);
      root.style.setProperty('--design-weight-' + attribute, settings[key]);
    }
    root.dataset.designTracking=settings.tracking;
    root.dataset.designLineHeight=settings.lineHeight;
    root.dataset.designDensity = settings.density;
    root.toggleAttribute('data-design-corners', settings.corners !== 16);
    root.style.setProperty('--design-corners', settings.corners + 'px');
    for (const [key] of sections) {
      if (!sectionKeys.has(key)) continue;
      const color = settings.colors[key];
      const attribute = 'data-design-' + key;
      root.toggleAttribute(attribute, !!color);
      if (color) {
        root.style.setProperty('--design-' + key, color);
        root.style.setProperty('--design-' + key + '-ink', inkFor(color));
      } else {
        root.style.removeProperty('--design-' + key);
        root.style.removeProperty('--design-' + key + '-ink');
      }
    }
    for(const [key] of fineColors){
      const color=settings.fineColors[key],attr='data-fine-'+key.toLowerCase();
      root.toggleAttribute(attr,!!color);
      if(color)root.style.setProperty('--fine-'+key,color);
      else root.style.removeProperty('--fine-'+key);
    }
    for(const [kind,surface,ink] of [['task','taskSurface','taskInk'],['category','categorySurface','categoryInk'],['holiday','holidaySurface','holidayInk']]){
      const value=settings.fineColors[ink]||(settings.fineColors[surface]?inkFor(settings.fineColors[surface]):'');
      root.toggleAttribute('data-fine-'+kind+'-readable',!!value);
      if(value)root.style.setProperty('--fine-'+kind+'-readable',value);
      else root.style.removeProperty('--fine-'+kind+'-readable');
    }
    for(const [key,initial] of Object.entries(frameDefaults)){
      const value=settings.frames[key];root.toggleAttribute('data-frame-'+key.toLowerCase(),value!==initial);
      root.style.setProperty('--frame-'+key,typeof value==='number'?value+'px':value);
    }
    root.dataset.frameTaskshadow=settings.frames.taskShadow;
    for(const [key,input] of gradientControls){
      const gradient=gradients[key];
      root.toggleAttribute('data-gradient-'+key.toLowerCase(),!!gradient);
      if(gradient) root.style.setProperty('--gradient-'+key,gradientBackground(input.value,gradient));
      else root.style.removeProperty('--gradient-'+key);
    }
    refreshGradientPreviews.forEach(refresh=>refresh());
  }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({...settings, gradients})); } catch {}
  }
  new MutationObserver(() => {
    for (const [key, {input, light, dark}] of colorInputs) {
      if (!settings.colors[key]) input.value = root.dataset.theme === 'dark' ? dark : light;
    }
    for(const [key,{input,light,dark}] of fineInputs){if(!settings.fineColors[key])input.value=root.dataset.theme==='dark'?dark:light}
    apply();
  }).observe(root, {attributes:true, attributeFilter:['data-theme']});
  apply();
})();
