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

test('desktop lifecycle forms and self-service controls are connected to authenticated APIs',()=>{
 const admin=fs.readFileSync(path.join(root,'desktop/admin.html'),'utf8');
 const adminJs=fs.readFileSync(path.join(root,'desktop/admin.js'),'utf8');
 const player=fs.readFileSync(path.join(root,'desktop/player.html'),'utf8');
 const playerJs=fs.readFileSync(path.join(root,'desktop/player.js'),'utf8');
 assert.match(admin,/id="lifecycle-create-form"/);assert.match(admin,/id="lifecycle-action-form"/);
 assert.match(adminJs,/\/api\/admin\/lifecycle/);assert.match(adminJs,/\/api\/admin\/lifecycle\/action/);
 assert.match(player,/id="lifecycle-player-list"/);assert.match(playerJs,/\/api\/lifecycle\/register/);assert.match(playerJs,/\/api\/lifecycle\/check-in/);
});
