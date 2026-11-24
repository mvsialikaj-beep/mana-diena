const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.open=false;this.attributes={};this.scrollTop=0;this.style={setProperty(k,v){this[k]=v}}}
  remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null}}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node)}}
  prepend(node){node.remove();node.parentElement=this;this.children.unshift(node)}
  before(node){node.remove();node.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this),0,node)}
  after(node){node.remove();node.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this)+1,0,node)}
  setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){this.events[k]=fn}
  showModal(){this.open=true;this.modalShows=(this.modalShows||0)+1}close(){this.open=false;this.events.close?.()}
}
const body=new Element('body'),main=new Element('main'),calendar=new Element('section'),clock=new Element('div'),panel=new Element('details'),list=new Element('div');body.append(main,calendar);const dateWrap=new Element('div'),date=new Element('input'),today=new Element('button');date.closest=()=>dateWrap;dateWrap.append(date);main.append(dateWrap,today,list,panel);calendar.append(clock);
const media={matches:true,addEventListener(_,fn){this.change=fn}};let changed;
const document={body,getElementById:id=>({taskFormPanel:panel,calendarGlance:clock,date,today})[id],querySelector:()=>main,createElement:tag=>new Element(tag),createComment:()=>new Element('#comment')};
const viewport={width:390,height:844,offsetLeft:0,offsetTop:0,events:{},addEventListener(k,fn){this.events[k]=fn}},window={matchMedia:()=>media,visualViewport:viewport,PLANNER_POPUPS:require('../popup-gestures.js')},MutationObserver=class{constructor(fn){changed=fn}observe(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile-ui.js'),'utf8'),{window,document,MutationObserver});
const api=window.PLANNER_MOBILE_UI,dialog=body.children.find(x=>x.tagName==='dialog');assert(dialog);assert.equal(main.children[0],clock);assert.equal(panel.parentElement,dialog);assert.equal(list.parentElement,main);assert.equal(today.parentElement,dateWrap,'Today sits next to the date inside a real grid wrapper');
api.openTask();assert(panel.open&&dialog.open);assert.equal(dialog.modalShows,1);assert.equal(dialog.style['--mobile-viewport-width'],'390px');viewport.height=310;viewport.offsetTop=234;viewport.events.resize();assert.equal(dialog.style['--mobile-viewport-height'],'310px');assert.equal(dialog.style['--mobile-viewport-top'],'234px');viewport.width=320;viewport.offsetLeft=12;viewport.events.scroll();assert.equal(dialog.style['--mobile-viewport-width'],'320px');assert.equal(dialog.style['--mobile-viewport-left'],'12px');changed();assert.equal(dialog.modalShows,1,'Opening an already-open panel must not show another modal');
panel.open=false;changed();assert(!dialog.open,'Saving a task closes the dialog when the existing form closes');
api.openTask();dialog.events.cancel();changed();assert(!panel.open&&!dialog.open,'Escape/native cancellation closes the form');
api.openTask();dialog.events.pointerdown({target:panel,button:0,pointerId:1,clientX:20,clientY:20});dialog.events.pointerup({target:dialog,pointerId:1,clientX:40,clientY:20});dialog.events.click({target:dialog});assert(dialog.open,'Text selection ending outside the form does not close it');dialog.events.pointerdown({target:dialog,button:0,pointerId:1,clientX:10,clientY:10});dialog.events.pointerup({target:dialog,pointerId:1,clientX:10,clientY:10});dialog.events.click({target:dialog});assert(!dialog.open&&!panel.open,'Backdrop clicks close the form');
media.matches=false;media.change();assert.equal(clock.parentElement,calendar);assert.equal(panel.parentElement,main);assert.equal(today.parentElement,main,'Desktop date controls return to their original position');assert(!dialog.open);assert(!api.active());api.openTask();assert(!dialog.open,'Desktop keeps the existing form behavior');
media.matches=true;media.change();assert.equal(main.children[0],clock);assert.equal(panel.parentElement,dialog);assert.equal(main.children.filter(x=>x===clock).length,1,'Resize does not duplicate the clock');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(html.includes('mobile-ui.js?v=4'));assert(html.includes('window.PLANNER_MOBILE_UI?.openTask()'));assert(html.includes('#dayProgress,.calendar-widget{display:none!important}'));assert(html.includes('.datebar .main-date{display:contents}'));
assert(!html.includes("if(window.matchMedia('(max-width:850px)').matches)$('#taskFormPanel').scrollIntoView"));
console.log('Mobile clock relocation, compact date controls, task popup lifecycle, save/cancel/backdrop and desktop restoration verified.');
