const assert = require('node:assert/strict');
const {normalize,move,arrange,columnGeometry,resizeColumns} = require('../dashboard-layout.js');
const initial = normalize();
assert.equal(initial.enabled,false);
assert.equal(initial.items.length,4);
const custom = normalize({enabled:true,columns:99,items:[
  {id:'tasks',span:2,height:200}, {id:'tasks',span:4},
  {id:'note-abc',title:'Mana piezīme',text:'Svarīga doma',span:3,height:500},
  {id:'bad-id'}, null
]});
assert.equal(custom.columns,4);
assert.equal(custom.items.filter(x=>x.id==='tasks').length,1);
assert.equal(custom.items.length,5);
assert.equal(normalize({items:[{id:'impulse',hidden:true},{id:'notes',hidden:true}]}).items.some(x=>['impulse','notes'].includes(x.id)),false);
const reordered=move(custom.items,'note-abc','calendar',true);
assert.equal(reordered.findIndex(x=>x.id==='note-abc'),reordered.findIndex(x=>x.id==='calendar')+1);
assert.equal(reordered.find(x=>x.id==='note-abc').text,'Svarīga doma');
assert.deepEqual(normalize(JSON.parse(JSON.stringify({...custom,items:reordered}))).items,reordered);
assert.equal(normalize({columns:0,items:[{id:'note-a',height:9999,span:-2}]}).items[0].height,1800);
assert.equal(normalize({columns:0,items:[{id:'note-a',height:9999,span:-2}]}).items[0].span,1);
assert.equal(move(custom.items,'missing','tasks',true),custom.items);
assert.equal(normalize(null).items.length,4);
const tracks=columnGeometry(4,1200,[1,1,1,1]);
const resized=resizeColumns(tracks.widths,2,17);
assert.equal(resized[0],tracks.widths[0]);assert.equal(resized[3],tracks.widths[3]);
assert.equal(resized[1],tracks.widths[1]+17);assert.equal(resized[2],tracks.widths[2]-17);
assert.equal(resized.reduce((a,b)=>a+b),tracks.widths.reduce((a,b)=>a+b));
assert.deepEqual(normalize({columns:4,columnWidths:resized}).columnWidths,resized);
assert(resizeColumns(tracks.widths,2,99999)[2]>=120);
const unequal=arrange([{id:'left',column:0,span:2},{id:'right',column:2,span:1}],4,1200,{left:300,right:300},12,resized);
assert.equal(unequal[0].width,tracks.widths[0]+tracks.widths[1]+12+17);
assert.equal(unequal[1].width,tracks.widths[2]-17);
const stacked=normalize({items:[{id:'tasks',span:2},{id:'calendar'},{id:'namedays',column:2},{id:'progress'}]});
const positions=arrange(stacked.items,4,1200,{tasks:1200,calendar:300,namedays:120,progress:200});
const calendar=positions.find(x=>x.id==='calendar'),namedays=positions.find(x=>x.id==='namedays');
assert.equal(namedays.x,calendar.x);
assert.equal(namedays.y,calendar.y+calendar.height+12,'A tall task list cannot force names below the full grid row');
assert(namedays.y<1200);
assert.equal(normalize(JSON.parse(JSON.stringify(stacked))).items.find(x=>x.id==='namedays').column,2);
for(const columns of [1,2,3,4]){
  const packed=arrange(stacked.items,columns,1000,{tasks:1200,calendar:300,namedays:120,progress:200});
  for(let i=0;i<packed.length;i++)for(let j=i+1;j<packed.length;j++){
    const a=packed[i],b=packed[j];
    assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Blocks must not overlap after changing column count');
  }
}
console.log('Dashboard layout validation, note preservation, ordering and persistence verified.');
