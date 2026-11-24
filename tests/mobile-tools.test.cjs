const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.events={};this.textContent='';this.open=false}
  remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1)}}
  append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n)}}
  before(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this),0,n)}
  after(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this)+1,0,n)}
  setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]||null}
  addEventListener(k,fn,capture){this.events[k]=fn;if(capture)this.capture=true}
  closest(selector){if(selector==='button'&&this.tagName==='button'||selector==='.workspace-switch'&&this.className==='workspace-switch')return this;return this.parentElement?.closest(selector)||null}
  walk(){return [this,...this.children.flatMap(x=>x.walk())]}querySelectorAll(tag){return this.walk().filter(x=>x!==this&&x.tagName===tag)}
  showModal(){this.open=true}close(){this.open=false;this.events.close?.()}
}
const body=new Element('body'),top=new Element('div'),nav=new Element('nav');nav.className='workspace-switch';top.append(nav);body.append(top);for(let i=0;i<2;i++)nav.append(new Element('button'));
const icons=['fontOpen','categoryOpen','layoutOpen','sickToggle','refresh','settingsOpen','noteOpen'].map(id=>{const button=new Element('button');button.id=id;button.setAttribute('aria-label',id);top.append(button);return button});
const media={matches:true,addEventListener:(key,fn)=>media.change=fn},window={matchMedia:()=>media},document={body,querySelector:()=>top,createElement:tag=>new Element(tag),createComment:()=>new Element('#comment')};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile-tools.js'),'utf8'),{window,document});const dialog=body.walk().find(x=>x.id==='mobileToolsDialog'),trigger=top.walk().find(x=>x.id==='mobileToolsOpen'),list=body.walk().find(x=>x.className==='mobile-tools-list');
assert.equal(top.children.filter(x=>x.tagName==='button').length,1,'Only the tools trigger remains beside the workspace switch');assert.equal(list.children.length,7);assert.equal(nav.children.length,2);
trigger.onclick();assert(dialog.open);assert.equal(trigger.attributes['aria-expanded'],'true');assert.equal(icons[0].children[0].textContent,'fontOpen');
let called=0;icons[0].onclick=()=>{assert(!dialog.open,'The menu closes before another popup opens');called++};list.events.click({target:icons[0].children[0]});icons[0].onclick();assert.equal(called,1);assert(list.capture);
icons[3].setAttribute('aria-label','Atsākt darbu');trigger.onclick();assert.equal(icons[3].children[0].textContent,'Atsākt darbu','Stateful actions get updated labels');
media.matches=false;media.change();assert(!dialog.open);assert(icons.every(button=>button.parentElement===top),'Desktop restores the same buttons and their handlers');assert.equal(icons[0].onclick instanceof Function,true);
media.matches=true;media.change();assert(icons.every(button=>button.parentElement===list));assert.equal(list.children.length,7,'Resizing does not duplicate actions');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(html.includes('mobile-tools.js?v=1'));assert(!html.includes('id="themeToggle"'));assert(html.includes("function applyTheme(){activeTheme='light'"));
console.log('Single mobile tools menu, original action handlers, popup handoff, stateful labels and desktop restoration verified.');
