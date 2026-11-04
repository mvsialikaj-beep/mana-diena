const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootPath = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(rootPath, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(rootPath, 'design-settings.js'), 'utf8');
assert(html.includes('<script src="./design-settings.js"></script>'));
assert(html.includes('html[data-design-priority] .task-section.priority-section'));
assert(html.includes('html[data-design-tasks] .task:not(.custom-color)'));

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
const taskColor = details.querySelector('#design-color-tasks');
taskColor.value='#222222'; taskColor.events.input();
assert(root.attributes.has('data-design-tasks'));
assert.equal(root.style.values['--design-tasks-ink'],'#ffffff');
root.dataset.theme='dark'; themeChanged();
assert.equal(details.querySelector('#design-color-page').value,'#142129');
details.querySelector('#designReset').events.click();
assert(!root.attributes.has('data-design-font'));
assert(!root.attributes.has('data-design-tasks'));
assert.equal(JSON.parse(store.get('mana-ikdiena-design-v1')).font,'default');
console.log('Design settings, persistence, color contrast, theme and reset verified.');
