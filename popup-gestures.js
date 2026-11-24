(function(root){
  'use strict';
  function bindBackdrop(element,close){
    let start=null,ready=false;
    element.addEventListener('pointerdown',event=>{ready=false;start=event.target===element&&event.button===0&&event.isPrimary!==false?{id:event.pointerId,x:event.clientX,y:event.clientY}:null});
    element.addEventListener('pointerup',event=>{ready=!!start&&event.target===element&&event.pointerId===start.id&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<=6;start=null});
    element.addEventListener('pointercancel',()=>{start=null;ready=false});
    element.addEventListener('click',event=>{const shouldClose=ready&&event.target===element;start=null;ready=false;if(shouldClose)close()});
  }
  const api={bindBackdrop};root.PLANNER_POPUPS=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
