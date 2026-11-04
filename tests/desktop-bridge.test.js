'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createDesktopBridge,detectImageMime,safeFilename}=require('../src/desktop-bridge');

function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});}
function cookieHeader(res,name){
  const values=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():[res.headers.get('set-cookie')||''];
  const value=values.find(x=>String(x).startsWith(name+'='));
  assert.ok(value,'expected '+name+' cookie');
  return String(value).split(';')[0];
}
async function fixture(t,options={}){
  const actions=[];
  const service={
    async resolvePrincipal(user){
      if(user.id==='12345678901234567')return{role:'player',discordUserId:user.id,player:{id:4,name:'Player Four'}};
      if(user.id==='22345678901234567')return{role:'admin',discordUserId:user.id};
      return{role:'unlinked',discordUserId:user.id};
    },
    async getOverview(p){return{role:p.role};},
    async listSubmissions(p){return{items:[{owner:p.discordUserId}]};},
    async submitImage(p,file){actions.push({name:'upload',role:p.role,filename:file.filename,mime:file.contentType,bytes:file.buffer.length});return{submissionId:'a'.repeat(24),status:'processing'};},
    async correctSubmission(p,id,body){actions.push({name:'correct',id,body});return{status:'corrected'};},
    async mapSubmission(p,id,body){actions.push({name:'map',id,body});return{status:'mapped'};},
    async addPlayer(p,body){actions.push({name:'add',body});return{id:7,name:body.name};},
    async linkPlayer(p,id,body){actions.push({name:'link',id,body});return{linked:true};},
    async unlinkPlayer(p,id){actions.push({name:'unlink',id});return{linked:false};},
    async recordResult(p,body){actions.push({name:'score',body});return{ok:true};},
    async setSetting(p,body){actions.push({name:'setting',body});return{ok:true};},
    async listYoloTournaments(){return{items:[]};},
    async createYoloTournament(p,body){actions.push({name:'yolo-create',body});return{id:body.id,format:body.format};},
    async createYoloEventNight(p,body){actions.push({name:'yolo-night',body});return{id:body.id};},
    async transitionYoloEventNight(p,id,body){actions.push({name:'yolo-night-status',id,body});return{status:body.status};},
    async createYoloTeam(p,id,body){actions.push({name:'yolo-team',id,body});return{id:body.id};},
    async createYoloFixture(p,id,body){actions.push({name:'yolo-fixture',id,body});return{id:body.id};},
    async createYoloMatch(p,id,body){actions.push({name:'yolo-match',id,body});return{id:body.id};},
    async createYoloGame(p,id,body){actions.push({name:'yolo-game',id,body});return{id:body.id};},
    async certifyYoloMatchOutcome(p,id,body){actions.push({name:'yolo-outcome',id,body});return{matchId:id};},
    async linkYoloGameEvidence(p,id,body){actions.push({name:'yolo-evidence-link',id,body});return{status:'awaiting-evidence-review'};},
    async reviewYoloGameEvidence(p,id,body){actions.push({name:'yolo-evidence-review',id,body});return{status:'evidence-accepted'};},
    async registerYoloParticipant(p,id,body){actions.push({name:'yolo-register',id,body,role:p.role});return{registered:true};},
    async transitionYoloStage(p,id,body){actions.push({name:'yolo-stage',id,body});return{status:body.status};},
    async transitionYoloTournament(p,id,body){actions.push({name:'yolo-status',id,body});return{status:body.status};},
    async exportBackup(){return JSON.stringify({format:'dwbot-test-archive'});},
  };
  const fetchImpl=async(url,init={})=>{
    const u=String(url);
    if(u.endsWith('/api/oauth2/token')){
      const body=new URLSearchParams(init.body);
      return response({access_token:body.get('code')==='admin-code'?'access-admin':'access-player',token_type:'Bearer'});
    }
    if(u.endsWith('/api/users/@me')){
      const admin=init.headers?.Authorization==='Bearer access-admin';
      return response({id:admin?'22345678901234567':'12345678901234567',username:admin?'Admin':'Player'});
    }
    throw new Error('Unexpected URL '+u);
  };
  const bridge=createDesktopBridge({
    host:'127.0.0.1',port:0,service,fetchImpl,
    oauth:{clientId:'test-client',clientSecret:'test-secret'},
    maxUploadBytes:options.maxUploadBytes||1024,
    publicDirectory:options.publicDirectory||'/tmp/dwbot-desktop-static-test',
  });
  const info=await bridge.listen();
  t.after(()=>bridge.close());
  return{bridge,origin:info.origin,actions};
}
async function login(origin,who='player'){
  const start=await fetch(origin+'/auth/discord',{redirect:'manual'});
  assert.equal(start.status,302);
  const auth=new URL(start.headers.get('location'));
  assert.equal(auth.hostname,'discord.com');
  assert.equal(auth.searchParams.get('scope'),'identify');
  const state=auth.searchParams.get('state');
  const oauthCookie=cookieHeader(start,'dwbot_oauth');
  const callback=await fetch(origin+'/auth/discord/callback?code='+(who==='admin'?'admin-code':'player-code')+'&state='+encodeURIComponent(state),{
    headers:{Cookie:oauthCookie},redirect:'manual',
  });
  assert.equal(callback.status,303);
  const sessionCookie=cookieHeader(callback,'dwbot_session');
  const sessionResponse=await fetch(origin+'/api/session',{headers:{Cookie:sessionCookie}});
  assert.equal(sessionResponse.status,200);
  return{cookie:sessionCookie,session:await sessionResponse.json()};
}

test('bridge rejects public and non-loopback network bindings',()=>{
  assert.throws(()=>createDesktopBridge({host:'0.0.0.0',service:{resolvePrincipal(){}}}),/loopback/);
  assert.throws(()=>createDesktopBridge({host:'::1',service:{resolvePrincipal(){}}}),/loopback/);
});
test('image file signature detection and filename sanitation are bounded',()=>{
  assert.equal(detectImageMime(Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])),'image/png');
  assert.equal(detectImageMime(Buffer.from([255,216,255,0,0,0,0,0,0,0,0,0])),'image/jpeg');
  assert.equal(detectImageMime(Buffer.from('RIFF0000WEBP')),'image/webp');
  assert.equal(detectImageMime(Buffer.from('BM0000000000')),'image/bmp');
  assert.equal(detectImageMime(Buffer.from([73,73,42,0,0,0,0,0,0,0,0,0])),'image/tiff');
  assert.equal(detectImageMime(Buffer.from('plain text data')),null);
  assert.equal(safeFilename('../../battle\r\n.png'),'battle__.png');
});
test('Discord OAuth state cookie and signed-in session are required',async t=>{
  const f=await fixture(t),loginResult=await login(f.origin);
  assert.equal(loginResult.session.role,'player');
  assert.equal(loginResult.session.player.name,'Player Four');
  assert.ok(loginResult.session.csrfToken);
  const anonymous=await fetch(f.origin+'/api/overview');
  assert.equal(anonymous.status,401);
});
test('upload requires same-origin session, CSRF, image signature and bounded body',async t=>{
  const f=await fixture(t),auth=await login(f.origin);
  const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const headers={Cookie:auth.cookie,Origin:f.origin,'X-CSRF-Token':auth.session.csrfToken,
    'X-File-Name':'../battle.png','X-File-Content-Type':'image/png','Content-Type':'application/octet-stream'};
  const noCsrf=await fetch(f.origin+'/api/upload',{method:'POST',headers:{...headers,'X-CSRF-Token':''},body:png});
  assert.equal(noCsrf.status,403);
  const uploaded=await fetch(f.origin+'/api/upload',{method:'POST',headers,body:png});
  assert.equal(uploaded.status,202);
  assert.equal(f.actions[0].filename,'battle.png');
  const mismatch=await fetch(f.origin+'/api/upload',{method:'POST',headers:{...headers,'X-File-Content-Type':'image/jpeg'},body:png});
  assert.equal(mismatch.status,415);
  const invalid=await fetch(f.origin+'/api/upload',{method:'POST',headers,body:Buffer.from('not an image')});
  assert.equal(invalid.status,415);
  const wrongOrigin=await fetch(f.origin+'/api/upload',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:png});
  assert.equal(wrongOrigin.status,403);
});
test('participant cannot access admin static page or call admin endpoints',async t=>{
  const f=await fixture(t),auth=await login(f.origin);
  const page=await fetch(f.origin+'/admin.html',{headers:{Cookie:auth.cookie}});
  assert.equal(page.status,403);
  const add=await fetch(f.origin+'/api/admin/players',{method:'POST',headers:{Cookie:auth.cookie,Origin:f.origin,'X-CSRF-Token':auth.session.csrfToken,'Content-Type':'application/json'},body:JSON.stringify({name:'Tamper'})});
  assert.equal(add.status,403);
  assert.equal(f.actions.length,0);
});
test('admin can invoke guarded roster, link, scoring, settings and backup routes',async t=>{
  const f=await fixture(t),auth=await login(f.origin,'admin');
  const headers={Cookie:auth.cookie,Origin:f.origin,'X-CSRF-Token':auth.session.csrfToken,'Content-Type':'application/json'};
  const add=await fetch(f.origin+'/api/admin/players',{method:'POST',headers,body:JSON.stringify({name:'Charlie'})});
  assert.equal(add.status,201);
  const link=await fetch(f.origin+'/api/admin/players/7/discord-account',{method:'PUT',headers,body:JSON.stringify({discordUserId:'32345678901234567'})});
  assert.equal(link.status,200);
  const score=await fetch(f.origin+'/api/admin/results',{method:'POST',headers,body:JSON.stringify({playerId:7,event:'damage',gameNumber:1,shipClass:'DD',tier:5,damage:1000})});
  assert.equal(score.status,200);
  const setting=await fetch(f.origin+'/api/admin/settings',{method:'POST',headers,body:JSON.stringify({event:'grand',field:'tierWeight',value:0.9})});
  assert.equal(setting.status,200);
  const backup=await fetch(f.origin+'/api/admin/backup',{headers:{Cookie:auth.cookie}});
  assert.equal(backup.status,200);
  assert.match(await backup.text(),/dwbot-test-archive/);
  assert.deepEqual(f.actions.map(x=>x.name),['add','link','score','setting']);
});
test('OAuth callback rejects missing transaction state',async t=>{
  const f=await fixture(t);
  const responseResult=await fetch(f.origin+'/auth/discord/callback?code=stolen&state=missing',{redirect:'manual'});
  assert.equal(responseResult.status,400);
});

test('admin format lifecycle endpoints require session, CSRF and admin role',async t=>{
 const f=await fixture(t),auth=await login(f.origin,'admin');
 const headers={Cookie:auth.cookie,Origin:f.origin,'X-CSRF-Token':auth.session.csrfToken,'Content-Type':'application/json'};
 const list=await fetch(f.origin+'/api/admin/yolo-tournaments',{headers:{Cookie:auth.cookie}});
 assert.equal(list.status,200);
 const created=await fetch(f.origin+'/api/admin/yolo-tournaments',{method:'POST',headers,body:JSON.stringify({id:'pilot-1',name:'Pilot',format:'pilot'})});
 assert.equal(created.status,201);
 const night=await fetch(f.origin+'/api/admin/yolo-event-nights',{method:'POST',headers,body:JSON.stringify({id:'night-1',tournamentId:'pilot-1'})});
 assert.equal(night.status,201);
 const nightStatus=await fetch(f.origin+'/api/admin/yolo-event-nights/night-1/status',{method:'POST',headers,body:JSON.stringify({status:'published'})});
 assert.equal(nightStatus.status,200);
 const stage=await fetch(f.origin+'/api/admin/yolo-tournaments/full-1/stages',{method:'POST',headers,body:JSON.stringify({stage:'regular-season',status:'published'})});
 assert.equal(stage.status,200);
 const status=await fetch(f.origin+'/api/admin/yolo-tournaments/pilot-1/status',{method:'POST',headers,body:JSON.stringify({status:'published'})});
 assert.equal(status.status,200);
 assert.deepEqual(f.actions.filter(x=>x.name.startsWith('yolo-')).map(x=>x.name),['yolo-create','yolo-night','yolo-night-status','yolo-stage','yolo-status']);
 const player=await login(f.origin,'player');
 const denied=await fetch(f.origin+'/api/admin/yolo-tournaments',{headers:{Cookie:player.cookie}});
 assert.equal(denied.status,403);
});

test('linked participant can self-register only through authenticated player route',async t=>{
 const f=await fixture(t),auth=await login(f.origin,'player');
 const headers={Cookie:auth.cookie,Origin:f.origin,'X-CSRF-Token':auth.session.csrfToken,'Content-Type':'application/json'};
 const noCsrf=await fetch(f.origin+'/api/yolo-event-nights/night-1/registration',{method:'POST',headers:{...headers,'X-CSRF-Token':''},body:'{}'});
 assert.equal(noCsrf.status,403);
 const registered=await fetch(f.origin+'/api/yolo-event-nights/night-1/registration',{method:'POST',headers,body:'{}'});
 assert.equal(registered.status,201);
 assert.equal(f.actions.at(-1).role,'player');
});

test('team match game and evidence review APIs are restricted to authenticated Admin',async t=>{
 const f=await fixture(t),auth=await login(f.origin,'admin');
 const headers={Cookie:auth.cookie,Origin:f.origin,'X-CSRF-Token':auth.session.csrfToken,'Content-Type':'application/json'};
 const calls=[
  ['/api/admin/yolo-event-nights/night-1/teams',{id:'team-a',name:'A',participantIds:['1']}],
  ['/api/admin/yolo-event-nights/night-1/fixtures',{id:'fixture-a',homeTeamId:'team-a',awayTeamId:'team-b',scheduledAt:'2026-11-09T18:00:00Z'}],
  ['/api/admin/yolo-fixtures/fixture-a/matches',{id:'match-a',matchNumber:1}],
  ['/api/admin/yolo-matches/match-a/games',{id:'game-a',gameNumber:1}],
  ['/api/admin/yolo-matches/match-a/outcome',{winnerTeamId:'team-a',approvedScoringMethodId:'approved',acceptedPerformanceRecordIds:['r1'],aggregation:'sum',rounding:'nearest',tieBreakOrder:['head-to-head'],decisionReference:'ref'}],
  ['/api/admin/yolo-games/game-a/evidence',{recordId:'record-a'}],
  ['/api/admin/yolo-games/game-a/evidence-review',{accepted:true}],
 ];
 for(const [url,body] of calls){const res=await fetch(f.origin+url,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(res.status,body.scheduledAt?201:(url.endsWith('/evidence')?200:(url.endsWith('/evidence-review')||url.endsWith('/outcome')?200:201)),url);}
 const player=await login(f.origin,'player');
 const denied=await fetch(f.origin+'/api/admin/yolo-event-nights/night-1/teams',{method:'POST',headers:{Cookie:player.cookie,Origin:f.origin,'X-CSRF-Token':player.session.csrfToken,'Content-Type':'application/json'},body:'{}'});
 assert.equal(denied.status,403);
});
