const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),editor=require('../description-editor.js');
assert.equal(editor.edit('Pirmais\nOtrais',0,14,'bullet').value,'• Pirmais\n• Otrais');
assert.equal(editor.edit('[x] A\n[ ] B',0,11,'number').value,'1. A\n2. B');
assert.equal(editor.edit('A\nB\nC',2,4,'checkbox').value,'A\n[ ] B\nC','Selection ending at a newline does not format the following line');
assert.equal(editor.edit('\nA',0,0,'bullet').value,'• \nA');
assert.equal(editor.edit('darbs',0,5,'bold').value,'**darbs**');
assert.equal(editor.continueLine('[x] Gatavs',10,10).value,'[x] Gatavs\n[ ] ');
assert.equal(editor.continueLine('2. Otrais',9,9).value,'2. Otrais\n3. ');
assert.equal(editor.continueLine('• ',2,2).value,'');assert.equal(editor.continueLine('Parasts teksts',5,5),null);
assert.equal(editor.checkbox('• A'),null);assert(editor.checkbox('- A'));assert.equal(editor.checkbox('[x] A').checked,true);
const old='[ ] Pirmais\n[ ] Otrais',states={single:{0:true,1:false},'2026-11-24':{1:true}};
assert.deepEqual(editor.reconcile(old,'## Plāns\n[ ] **Otrais**\n[ ] Pirmais',states),{single:{1:false,2:true},'2026-11-24':{1:true}},'Formatting and reordering retain per-occurrence checks');
assert.deepEqual(editor.reconcile(old,'[x] Pirmais\n[ ] Otrais',states),{single:{1:false},'2026-11-24':{1:true}},'Editing the checkbox marker explicitly overrides its old initial state');
assert.deepEqual(editor.reconcile('[ ] A\n[ ] A','[ ] A\n[ ] A',{single:{0:true,1:false}}),{single:{0:true,1:false}});
for(const value of ['javascript:alert(1)','data:text/html,x','file:///private','https://user:password@example.com'])assert.equal(editor.safeLink(value),null);
class Element{
  constructor(tag,text=''){this.tagName=tag;this.children=[];this.textContent=text;this.attributes={};this.events={};this.value='';this.selectionStart=0;this.selectionEnd=0;this.hidden=false;this.maxLength=3000}
  remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1)}}
  append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n)}}
  before(n){n.remove();n.parentElement=this.parentElement;const a=this.parentElement.children;a.splice(a.indexOf(this),0,n)}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  setAttribute(k,v){this.attributes[k]=String(v)}addEventListener(k,fn){this.events[k]=fn}dispatchEvent(e){this.events[e.type]?.(e)}
  focus(){this.focused=true}setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}
  click(){this.onclick?.()}walk(){return [this,...this.children.flatMap(n=>n.walk())]}
}
const body=new Element('body'),form=new Element('form'),field=new Element('textarea');field.id='description';field.form=form;form.append(field);body.append(form);
const document={readyState:'complete',createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text),getElementById:id=>body.walk().find(x=>x.id===id)},window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../description-editor.js'),'utf8'),{window,document,URL,Event:class{constructor(type){this.type=type}}});const api=window.PLANNER_DESCRIPTION;
assert(!document.getElementById('descriptionToolbar'),'The formatting toolbar has been removed');assert.equal(field.parentElement,form,'The description remains a plain textarea');
const target=new Element('div');api.appendInline(target,'**Svarīgi** un *viegli* ~~vecs~~ `kods` [Veikals](https://e-meistars.lv/) <img src=x onerror=alert(1)> https://example.com.');
assert(target.walk().some(x=>x.tagName==='strong'));assert(target.walk().some(x=>x.tagName==='em'));assert(target.walk().some(x=>x.tagName==='s'));assert(target.walk().some(x=>x.tagName==='code'));assert(!target.walk().some(x=>x.tagName==='img'));
assert(target.walk().filter(x=>x.tagName==='a').every(a=>a.href.startsWith('https://')&&a.rel==='noopener noreferrer'));
const rich=new Element('div');api.preview(rich,'• Punkts\n1. Solis\n## Virsraksts\n> Citāts\n[ ] Darāmais');for(const tag of ['ul','ol','h4','blockquote'])assert(rich.walk().some(x=>x.tagName===tag));
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(html.includes('description-editor.js?v=2'));assert(html.includes('window.PLANNER_DESCRIPTION.reconcile'));assert(html.includes('description-field'));assert(!html.includes('<label class="wide">Apraksts'));
assert.equal(editor.plainText('## Plāns\n**Svarīgi** [veikals](https://example.com)'), 'Plāns Svarīgi veikals');
const statsSource=html.slice(html.indexOf('function checklistStats('),html.indexOf('function renderProject('));const stats=new Function(statsSource+'return checklistStats')();
assert.deepEqual(stats({description:'• Aizzīme\n1. Solis\n[ ] Jādara\n[x] Gatavs'},'2026-11-24'),{total:2,done:1,percent:50},'Only checkboxes affect project progress; visual lists do not');
assert.deepEqual(editor.reconcile('[ ] A','[ ] [A](https://example.com)',{single:{0:true}}),{single:{0:true}},'Adding a link retains a checked item');
console.log('Plain description field, safe legacy rendering, links and checkbox progress preservation verified.');
