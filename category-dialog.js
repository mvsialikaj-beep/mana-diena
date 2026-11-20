const categoryDialog = document.getElementById('categoriesDialog');
document.getElementById('categoryOpen').onclick = () => categoryDialog.showModal();
document.getElementById('categoryClose').onclick = () => categoryDialog.close();

(()=>{
const dialog=document.getElementById('settingsDialog');
const panel=dialog.querySelector('.settings-panel');
const open=document.getElementById('settingsOpen');
panel.open=true;
for(const block of [...panel.children]){
  if(!block.classList.contains('sideblock')||block.classList.contains('design-settings'))continue;
  const heading=block.querySelector('h4');
  if(!heading)continue;
  const section=document.createElement('details');section.className='settings-section';
  const summary=document.createElement('summary');summary.textContent=heading.textContent;
  block.before(section);section.append(summary,block);
}
open.onclick=()=>{
  const design=document.getElementById('designSettings');
  if(design?.classList.contains('design-floating'))document.getElementById('fontOpen').click();
  dialog.showModal();open.setAttribute('aria-expanded','true');
};
document.getElementById('settingsClose').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{open.setAttribute('aria-expanded','false');open.focus({preventScroll:true})});
})();