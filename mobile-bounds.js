(function(root){
  'use strict';
  function bounds(viewport,fallback={}){const positive=(v,otherwise)=>Number.isFinite(v)&&v>0?v:otherwise;return {width:positive(viewport?.width,positive(fallback.width,320)),height:positive(viewport?.height,positive(fallback.height,640)),left:Math.max(0,viewport?.offsetLeft||0),top:Math.max(0,viewport?.offsetTop||0)}}
  const api={bounds};root.PLANNER_MOBILE_BOUNDS=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof document==='undefined')return;
  function update(){const values=bounds(root.visualViewport,{width:root.innerWidth,height:root.innerHeight});for(const [key,value]of Object.entries(values))document.documentElement.style.setProperty('--mobile-viewport-'+key,value+'px')}
  root.addEventListener('resize',update);root.visualViewport?.addEventListener('resize',update);root.visualViewport?.addEventListener('scroll',update);document.addEventListener('focusin',update);update();
})(typeof window!=='undefined'?window:globalThis);
