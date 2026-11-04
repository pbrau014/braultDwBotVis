'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('Player and Admin workspaces explain both formats and expose accessible quick notes',()=>{
 for(const file of ['desktop/player.html','desktop/admin.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/Pilot YOLO/);assert.match(html,/Full YOLO/);
  assert.match(html,/class="quick-help"/);assert.match(html,/aria-describedby=/);assert.match(html,/data-tip=/);
 }
 const css=fs.readFileSync(path.join(root,'desktop/desktop.css'),'utf8');
 assert.match(css,/\.quick-help:hover::after/);assert.match(css,/\.quick-help:focus-visible::after/);
});
