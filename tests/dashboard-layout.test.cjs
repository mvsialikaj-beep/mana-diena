const assert = require('node:assert/strict');
const {normalize,move} = require('../dashboard-layout.js');
const initial = normalize();
assert.equal(initial.enabled,false);
assert.equal(initial.items.length,6);
const custom = normalize({enabled:true,columns:99,items:[
  {id:'tasks',span:2,height:200}, {id:'tasks',span:4},
  {id:'note-abc',title:'Mana piezīme',text:'Svarīga doma',span:3,height:500},
  {id:'bad-id'}, null
]});
assert.equal(custom.columns,4);
assert.equal(custom.items.filter(x=>x.id==='tasks').length,1);
assert.equal(custom.items.length,7);
const reordered=move(custom.items,'note-abc','calendar',true);
assert.equal(reordered.findIndex(x=>x.id==='note-abc'),reordered.findIndex(x=>x.id==='calendar')+1);
assert.equal(reordered.find(x=>x.id==='note-abc').text,'Svarīga doma');
assert.deepEqual(normalize(JSON.parse(JSON.stringify({...custom,items:reordered}))).items,reordered);
assert.equal(normalize({columns:0,items:[{id:'note-a',height:9999,span:-2}]}).items[0].height,1800);
assert.equal(normalize({columns:0,items:[{id:'note-a',height:9999,span:-2}]}).items[0].span,1);
assert.equal(move(custom.items,'missing','tasks',true),custom.items);
assert.equal(normalize(null).items.length,6);
console.log('Dashboard layout validation, note preservation, ordering and persistence verified.');
