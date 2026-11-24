const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function setupCalendar(inputId)'),end=html.indexOf("setupCalendar('date')",start);
assert(start>=0&&end>start);
assert(html.includes('.calendar-popover.calendar-floating{position:fixed!important'));
function harness({desktop=true,native=true,left=20,top=20}={}){
  const docEvents={},windowEvents={};
  class Element{
    constructor(){this.children=[];this.style={};this.attrs={};this.events={};this.className='';this.value='2026-11-24';this.classList={contains:c=>this.className.split(' ').includes(c),add:c=>this.className+=' '+c};if(native)this.showPopover=()=>{this.topLayer=true}}
    append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n)}}
    remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}}
    replaceChildren(...nodes){this.children=[];this.append(...nodes)}
    setAttribute(k,v){this.attrs[k]=v}
    addEventListener(k,fn){this.events[k]=fn}
    dispatchEvent(e){this.changed=e.type}
    contains(n){return this===n||this.children.some(x=>x.contains(n))}
    closest(selector){return selector==='.date-input-wrap'?wrap:null}
    querySelector(){return button}
    getBoundingClientRect(){return this===wrap?{left,top,bottom:top+44,width:180,height:44}:{width:330,height:Math.min(360,parseFloat(this.style.maxHeight)||360)}}
    click(){this.onclick()}
    showModal(){this.open=true}close(){this.open=false}
    walk(){return [this,...this.children.flatMap(x=>x.walk())]}
  }
  const wrap=new Element(),input=new Element(),button=new Element(),body=new Element();wrap.append(input,button);body.append(wrap);
  const document={body,createElement:()=>new Element(),addEventListener:(k,fn)=>docEvents[k]=fn};
  const window={innerWidth:1024,innerHeight:700,matchMedia:()=>({matches:desktop}),addEventListener:(k,fn)=>windowEvents[k]=fn};
  const setup=new Function('$','document','window','activeWorkspace','isWorkWeekend','workHoliday','LATVIAN_HOLIDAYS','today','Event',html.slice(start,end)+';return setupCalendar')(
    ()=>input,document,window,'work',d=>[0,6].includes(d.getDay()),()=>'',{isWorkday:()=>true},()=>'2026-11-24',class{constructor(type){this.type=type}}
  );setup('date');
  return {wrap,input,button,body,docEvents,windowEvents,window,open(){button.click();return body.walk().find(x=>x.className.includes('calendar-popover'))}};
}
const empty=harness();const popup=empty.open();
assert.equal(popup.topLayer,true,'The calendar must escape even an empty, clipped task card');
assert.equal(popup.attrs.popover,'manual');assert(popup.classList.contains('calendar-floating'));
assert.equal(popup.style.top,'72px');
empty.docEvents.click({target:popup.children[0]});assert(empty.wrap.contains(popup),'Clicking the picker must keep it open');
empty.docEvents.keydown({key:'Escape'});assert.equal(popup.parent,null);assert.equal(empty.input.attrs['aria-expanded'],'false');
const edge=harness({left:950,top:620}),edgePopup=edge.open();
assert(parseFloat(edgePopup.style.left)+330<=1016);assert(parseFloat(edgePopup.style.top)+360<=692);
assert(parseFloat(edgePopup.style.top)<620,'Picker near the bottom opens above its field');
const fallback=harness({native:false}),fallbackPopup=fallback.open();assert.equal(fallbackPopup.parent,fallback.body);
fallback.docEvents.click({target:fallbackPopup.children[0]});assert.equal(fallbackPopup.parent,fallback.body);
fallback.docEvents.click({target:fallback.body});assert.equal(fallbackPopup.parent,null);
const mobile=harness({desktop:false}),mobilePopup=mobile.open();
assert.equal(mobilePopup.parent.className,'mobile-calendar-dialog');assert(mobilePopup.parent.open);assert(!mobilePopup.classList.contains('calendar-floating'));assert(!mobilePopup.topLayer);
const days=mobilePopup.children[1].children.filter(x=>x.onclick);days[10].onclick();assert.equal(mobile.input.changed,'change');assert.equal(mobilePopup.parent,null);
mobile.wrap.events.click({target:mobile.input});const tapped=mobile.body.walk().find(x=>x.className.includes('calendar-popover'));assert(tapped,'Tapping the visible date opens the calendar even with a display:contents wrapper');assert.equal(tapped.parent.className,'mobile-calendar-dialog');
mobile.wrap.events.click({target:tapped.children[0]});assert.equal(tapped.parent.className,'mobile-calendar-dialog','Interacting with calendar contents must not toggle it closed');
mobile.wrap.events.click({target:mobile.input});assert.equal(tapped.parent,null,'Tapping the date again closes the calendar');
assert(html.includes('html .date-input-wrap>input[readonly][inputmode=none]{pointer-events:auto;'));
const resized=harness(),resizedPopup=resized.open();resized.window.matchMedia=()=>({matches:false});resized.windowEvents.resize();assert.equal(resizedPopup.parent,null);
console.log('Calendar layer, viewport bounds, fallback, selection, dismissal and mobile behavior verified.');
