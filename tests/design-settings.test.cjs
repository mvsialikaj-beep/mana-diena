const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootPath = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(rootPath, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(rootPath, 'design-settings.js'), 'utf8');
assert(html.includes('<script src="./design-settings.js?v=3"></script>'));
assert(html.includes('html[data-design-priority] .task-section.priority-section'));
assert(html.includes('html[data-design-tasks] .task:not(.custom-color)'));
assert(html.includes('html[data-fine-holidaysurface] .side-calendar-grid button.work-holiday'));
assert(html.includes('html[data-frame-taskborder] .task'));
assert(html.includes('html[data-frame-categoryborder] .task-group[data-category-name]'));
assert(html.includes("group.style.setProperty('--category-frame-color'"));

class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.events = {}; this.dataset = {};
    this.attributes = new Set(); this.style = { values:{}, setProperty:(k,v)=>this.style.values[k]=v,
      removeProperty:k=>delete this.style.values[k] };
  }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  insertAdjacentElement(_where,node) { this.parentElement.append(node); }
  querySelector(selector) {
    if (selector === 'summary') return this.children.find(node=>node.tagName === 'summary');
    if (selector === 'output') return this.walk().find(node=>node.tagName === 'output');
    if (selector.startsWith('#')) return this.walk().find(node=>node.id === selector.slice(1));
    return null;
  }
  walk() { return this.children.flatMap(node=>[node,...node.walk()]); }
  addEventListener(name,fn) { this.events[name] = fn; }
  toggleAttribute(name,on) { if(on) this.attributes.add(name); else this.attributes.delete(name); }
  setAttribute(name,value) { this[name] = value; }
  closest(tag) { let node=this.parentElement; while(node&&node.tagName!==tag)node=node.parentElement; return node; }
  get nextElementSibling() { const siblings=this.parentElement?.children||[]; return siblings[siblings.indexOf(this)+1]; }
}
const panel = new Element('details'); panel.append(new Element('summary'));
const root = new Element('html'); root.dataset.theme='light';
const store = new Map(); let themeChanged;
vm.runInNewContext(source, {
  document:{documentElement:root,querySelector:selector=>selector==='.settings-panel'?panel:null,
    createElement:tag=>new Element(tag)},
  localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},
  MutationObserver:class{constructor(callback){themeChanged=callback}observe(){}}, Object, Number, Set, Map, JSON
});
const details = panel.querySelector('#designSettings');
assert(details && details.tagName==='details');
const font = details.querySelector('#design-font');
font.value='system'; font.events.change();
assert(root.attributes.has('data-design-font'));
assert(store.get('mana-ikdiena-design-v1').includes('system'));
const headings = details.querySelector('#design-headingWeight');
headings.value='400'; headings.events.change();
assert(root.attributes.has('data-design-weight-headings'));
assert.equal(root.style.values['--design-weight-headings'],'400');
const taskTitles = details.querySelector('#design-taskWeight');
taskTitles.value='500'; taskTitles.events.change();
assert(root.attributes.has('data-design-weight-tasks'));
assert.equal(JSON.parse(store.get('mana-ikdiena-design-v1')).taskWeight,'500');
const taskColor = details.querySelector('#design-color-tasks');
taskColor.value='#222222'; taskColor.events.input();
assert(root.attributes.has('data-design-tasks'));
assert.equal(root.style.values['--design-tasks-ink'],'#ffffff');
const holidayColor=details.querySelector('#design-fine-holidaySurface');
holidayColor.value='#221133';holidayColor.events.input();
assert(root.attributes.has('data-fine-holidaysurface'));
assert.equal(root.style.values['--fine-holiday-readable'],'#ffffff');
const taskOutline=details.querySelector('#design-fine-taskOutline');
taskOutline.value='#aabbcc';taskOutline.events.input();
assert.equal(root.style.values['--fine-taskOutline'],'#aabbcc');
const taskBorder=details.querySelector('#design-frame-taskBorder');
taskBorder.value='3';taskBorder.events.input();
assert(root.attributes.has('data-frame-taskborder'));
assert.equal(root.style.values['--frame-taskBorder'],'3px');
const taskShadow=details.querySelector('#design-frame-taskShadow');
taskShadow.value='strong';taskShadow.events.change();
assert.equal(root.dataset.frameTaskshadow,'strong');
assert.equal(JSON.parse(store.get('mana-ikdiena-design-v1')).frames.taskShadow,'strong');
root.dataset.theme='dark'; themeChanged();
assert.equal(details.querySelector('#design-color-page').value,'#142129');
assert.equal(details.querySelector('#design-fine-holidaySurface').value,'#221133');
details.querySelector('#designReset').events.click();
assert(!root.attributes.has('data-design-font'));
assert(!root.attributes.has('data-design-tasks'));
assert(!root.attributes.has('data-design-weight-headings'));
assert(!root.attributes.has('data-design-weight-tasks'));
assert(!root.attributes.has('data-fine-holidaysurface'));
assert(!root.attributes.has('data-frame-taskborder'));
assert.equal(root.dataset.frameTaskshadow,'default');
assert.equal(JSON.parse(store.get('mana-ikdiena-design-v1')).font,'default');
console.log('Design settings, persistence, color contrast, theme and reset verified.');
