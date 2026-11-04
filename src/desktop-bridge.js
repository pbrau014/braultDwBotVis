'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const SESSION_COOKIE = 'dwbot_session';
const OAUTH_COOKIE = 'dwbot_oauth';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const OAUTH_TTL_MS = 10 * 60 * 1000;
const JSON_LIMIT = 64 * 1024;

class DesktopHttpError extends Error {
  constructor(status,code,message){super(message);this.status=status;this.code=code;}
}
function randomToken(bytes=32){return crypto.randomBytes(bytes).toString('base64url');}
function cookies(header=''){
  const out={};
  for(const part of String(header).split(';')){
    const at=part.indexOf('=');
    if(at>0)out[part.slice(0,at).trim()]=part.slice(at+1).trim();
  }
  return out;
}
function sameSecret(a,b){
  const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function detectImageMime(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length<12)return null;
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg';
  if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'image/webp';
  if(buffer.toString('ascii',0,2)==='BM')return 'image/bmp';
  if(buffer.subarray(0,4).equals(Buffer.from([73,73,42,0]))||buffer.subarray(0,4).equals(Buffer.from([77,77,0,42])))return 'image/tiff';
  return null;
}
function safeFilename(value){
  const source=String(value||'screenshot').replace(/[\r\n\0]/g,'_');
  const base=path.basename(source).replace(/[^\w.() -]/g,'_').trim().slice(0,120);
  return base||'screenshot';
}
function sendJson(res,status,value,headers={}){
  const body=Buffer.from(JSON.stringify(value));
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store',...headers});
  res.end(body);
}
function securityHeaders(res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Cache-Control','no-store');
}
async function readBody(req,limit){
  const declared=Number(req.headers['content-length']);
  if(Number.isFinite(declared)&&declared>limit)throw new DesktopHttpError(413,'BODY_TOO_LARGE','Request body exceeds the configured limit.');
  const chunks=[];let size=0,tooLarge=false;
  for await(const chunk of req){
    size+=chunk.length;
    if(size>limit){tooLarge=true;continue;}
    if(!tooLarge)chunks.push(chunk);
  }
  if(tooLarge)throw new DesktopHttpError(413,'BODY_TOO_LARGE','Request body exceeds the configured limit.');
  return Buffer.concat(chunks,size);
}
async function readJson(req){
  const type=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
  if(type!=='application/json')throw new DesktopHttpError(415,'JSON_REQUIRED','This endpoint requires application/json.');
  try{
    const parsed=JSON.parse((await readBody(req,JSON_LIMIT)).toString('utf8'));
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Expected an object.');
    return parsed;
  }catch(error){
    if(error instanceof DesktopHttpError)throw error;
    throw new DesktopHttpError(400,'INVALID_JSON','Request body is not a valid JSON object.');
  }
}

function createDesktopBridge(options={}){
  const service=options.service;
  if(!service||typeof service.resolvePrincipal!=='function')throw new TypeError('Desktop bridge requires a server-side tournament service.');
  const host=String(options.host||'127.0.0.1');
  if(host!=='127.0.0.1')throw new Error('Desktop bridge must bind to IPv4 loopback 127.0.0.1 only.');
  const port=Number.isInteger(options.port)?options.port:Number(process.env.DESKTOP_UI_PORT||8787);
  if(!Number.isInteger(port)||port<0||port>65535)throw new RangeError('Desktop UI port must be from 0 through 65535.');
  const maxUploadBytes=Math.max(1024,Number(options.maxUploadBytes)||10*1024*1024);
  const publicDirectory=path.resolve(options.publicDirectory||path.join(__dirname,'..','desktop'));
  const oauth=options.oauth||{};
  const clientId=String(oauth.clientId||''),clientSecret=String(oauth.clientSecret||'');
  const fetchImpl=options.fetchImpl||globalThis.fetch;
  const sessions=new Map(),transactions=new Map(),limits=new Map();
  let server=null,origin=null;

  const redirectUri=()=>String(oauth.redirectUri||((origin||'http://127.0.0.1:'+port)+'/auth/discord/callback'));
  const cookie=(name,value,pathName,age,sameSite='Strict')=>name+'='+value+'; Path='+pathName+'; HttpOnly; SameSite='+sameSite+'; Max-Age='+age;
  function exactOrigin(req){
    if(req.headers.origin!==origin)throw new DesktopHttpError(403,'ORIGIN_REJECTED','Request origin is not the local desktop application.');
    if(String(req.headers.host||'').toLowerCase()!==new URL(origin).host.toLowerCase())
      throw new DesktopHttpError(403,'HOST_REJECTED','Request host does not match the local desktop application.');
  }
  function sessionFor(req){
    const id=cookies(req.headers.cookie)[SESSION_COOKIE],session=id?sessions.get(id):null;
    if(!session||session.expiresAt<=Date.now()){
      if(id)sessions.delete(id);
      throw new DesktopHttpError(401,'AUTH_REQUIRED','Sign in with Discord to use the desktop interface.');
    }
    return{id,session};
  }
  async function principalFor(req){
    const current=sessionFor(req);
    const principal=await service.resolvePrincipal(current.session.user);
    if(!principal||!['admin','player','unlinked'].includes(principal.role))
      throw new DesktopHttpError(403,'ROLE_UNRESOLVED','This Discord account has no configured tournament role.');
    return{...current,principal};
  }
  function role(principal,allowed){
    if(!allowed.includes(principal.role))throw new DesktopHttpError(403,'FORBIDDEN','Your tournament role does not permit this operation.');
  }
  function csrf(req,session){
    exactOrigin(req);
    if(!sameSecret(req.headers['x-csrf-token'],session.csrfToken))
      throw new DesktopHttpError(403,'CSRF_REJECTED','The request security token is missing or expired. Refresh the page.');
  }
  function rateLimit(key){
    const now=Date.now();let item=limits.get(key);
    if(!item||now-item.startedAt>60_000){item={startedAt:now,count:0};limits.set(key,item);}
    item.count++;
    if(item.count>120)throw new DesktopHttpError(429,'RATE_LIMITED','Too many local requests. Wait briefly and retry.');
  }
  function audit(principal,action){
    const id=String(principal.discordUserId||'').replace(/\D/g,'').slice(0,20)||'unknown';
    console.info('[desktop] actor='+id+' role='+principal.role+' action='+action+' accepted');
  }
  async function call(name,...args){
    if(typeof service[name]!=='function')throw new DesktopHttpError(503,'SERVICE_UNAVAILABLE','This desktop operation is not available.');
    return service[name](...args);
  }
  async function oauthStart(res){
    if(!clientId||!clientSecret||typeof fetchImpl!=='function')
      throw new DesktopHttpError(503,'OAUTH_NOT_CONFIGURED','Discord OAuth credentials are not configured in the local bot environment.');
    const state=randomToken(24),nonce=randomToken(24);
    transactions.set(state,{nonce,expiresAt:Date.now()+OAUTH_TTL_MS});
    const auth=new URL('https://discord.com/oauth2/authorize');
    auth.searchParams.set('client_id',clientId);
    auth.searchParams.set('redirect_uri',redirectUri());
    auth.searchParams.set('response_type','code');
    auth.searchParams.set('scope','identify');
    auth.searchParams.set('state',state);
    res.writeHead(302,{Location:auth.toString(),'Set-Cookie':cookie(OAUTH_COOKIE,nonce,'/auth/discord/callback',600,'Lax'),'Cache-Control':'no-store'});
    res.end();
  }
  async function oauthCallback(req,res,url){
    if(url.searchParams.has('error'))throw new DesktopHttpError(401,'OAUTH_DENIED','Discord sign-in was cancelled or denied.');
    const state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';
    const transaction=transactions.get(state);transactions.delete(state);
    const nonce=cookies(req.headers.cookie)[OAUTH_COOKIE];
    if(!transaction||transaction.expiresAt<=Date.now()||!sameSecret(transaction.nonce,nonce)||!code)
      throw new DesktopHttpError(400,'OAUTH_STATE_INVALID','Discord sign-in could not be validated. Start sign-in again.');
    let tokenResponse;
    try{
      tokenResponse=await fetchImpl('https://discord.com/api/oauth2/token',{
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',code,redirect_uri:redirectUri()}),
        signal:AbortSignal.timeout(15_000),
      });
    }catch{throw new DesktopHttpError(502,'OAUTH_TOKEN_FAILED','Could not contact Discord to complete sign-in.');}
    if(!tokenResponse.ok)throw new DesktopHttpError(502,'OAUTH_TOKEN_REJECTED','Discord did not accept the sign-in exchange.');
    let tokenData;
    try{tokenData=await tokenResponse.json();}catch{throw new DesktopHttpError(502,'OAUTH_TOKEN_INVALID','Discord returned an invalid sign-in response.');}
    const access=String(tokenData?.access_token||'');
    if(!access||String(tokenData?.token_type||'').toLowerCase()!=='bearer')
      throw new DesktopHttpError(502,'OAUTH_TOKEN_INVALID','Discord returned an incomplete sign-in response.');
    let identityResponse;
    try{
      identityResponse=await fetchImpl('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(15_000)});
    }catch{throw new DesktopHttpError(502,'OAUTH_IDENTITY_FAILED','Could not retrieve the signed-in Discord account.');}
    if(!identityResponse.ok)throw new DesktopHttpError(502,'OAUTH_IDENTITY_REJECTED','Discord did not verify the signed-in account.');
    let user;
    try{user=await identityResponse.json();}catch{throw new DesktopHttpError(502,'OAUTH_IDENTITY_INVALID','Discord returned an invalid account response.');}
    const id=String(user?.id||''),username=String(user?.username||'').trim();
    if(!/^\d{17,20}$/.test(id)||!username)throw new DesktopHttpError(502,'OAUTH_IDENTITY_INVALID','Discord returned incomplete account identity details.');
    const sid=randomToken(32);
    sessions.set(sid,{user:{id,username:username.slice(0,64)},csrfToken:randomToken(32),expiresAt:Date.now()+SESSION_TTL_MS});
    res.writeHead(303,{Location:'/player.html','Set-Cookie':[
      cookie(SESSION_COOKIE,sid,'/',Math.floor(SESSION_TTL_MS/1000)),
      cookie(OAUTH_COOKIE,'','/auth/discord/callback',0,'Lax'),
    ],'Cache-Control':'no-store'});
    res.end();
  }

  const staticFiles={
    '/':['index.html','text/html; charset=utf-8',false],
    '/index.html':['index.html','text/html; charset=utf-8',false],
    '/player.html':['player.html','text/html; charset=utf-8',true],
    '/admin.html':['admin.html','text/html; charset=utf-8',true],
    '/upload.html':['upload.html','text/html; charset=utf-8',true],
    '/desktop.css':['desktop.css','text/css; charset=utf-8',false],
    '/desktop.js':['desktop.js','text/javascript; charset=utf-8',false],
    '/player.js':['player.js','text/javascript; charset=utf-8',false],
    '/admin.js':['admin.js','text/javascript; charset=utf-8',false],
    '/upload.js':['upload.js','text/javascript; charset=utf-8',false],
  };
  async function serveStatic(req,res,pathname){
    const item=staticFiles[pathname];if(!item)return false;
    if(item[2]){
      const {principal}=await principalFor(req);
      if(pathname==='/admin.html')role(principal,['admin']);
      else role(principal,['admin','player','unlinked']);
    }
    const full=path.resolve(publicDirectory,item[0]);
    if(!full.startsWith(publicDirectory+path.sep))throw new DesktopHttpError(404,'NOT_FOUND','Page not found.');
    let bytes;
    try{bytes=await fs.readFile(full);}catch(error){
      if(error.code==='ENOENT')throw new DesktopHttpError(404,'UI_NOT_BUILT','Desktop interface files are not installed.');
      throw error;
    }
    res.writeHead(200,{'Content-Type':item[1],'Content-Length':bytes.length,'Cache-Control':'no-store'});
    res.end(bytes);return true;
  }
  async function api(req,res,url){
    const p=url.pathname;
    if(req.method==='GET'&&p==='/api/session'){
      const {session,principal}=await principalFor(req);
      sendJson(res,200,{user:session.user,role:principal.role,player:principal.player||null,csrfToken:session.csrfToken});
      return true;
    }
    if(req.method==='POST'&&p==='/api/logout'){
      const {id,session}=sessionFor(req);csrf(req,session);sessions.delete(id);
      sendJson(res,200,{ok:true},{'Set-Cookie':cookie(SESSION_COOKIE,'','/',0)});return true;
    }
    const {id,session,principal}=await principalFor(req);rateLimit(id);
    if(req.method==='GET'&&p==='/api/overview'){
      role(principal,['admin','player']);
      sendJson(res,200,await call('getOverview',principal));return true;
    }
    if(req.method==='GET'&&p==='/api/submissions'){
      role(principal,['admin','player']);sendJson(res,200,await call('listSubmissions',principal));return true;
    }
    if(req.method==='POST'&&p==='/api/upload'){
      csrf(req,session);role(principal,['admin','player']);
      const buffer=await readBody(req,maxUploadBytes),mime=detectImageMime(buffer);
      if(!mime)throw new DesktopHttpError(415,'IMAGE_TYPE_REJECTED','Upload must be a PNG, JPEG, WEBP, BMP, or TIFF image.');
      const declared=String(req.headers['x-file-content-type']||'').toLowerCase();
      if(declared&&declared!==mime&&!(declared==='image/jpg'&&mime==='image/jpeg'))
        throw new DesktopHttpError(415,'IMAGE_TYPE_MISMATCH','Declared media type does not match the image data.');
      const result=await call('submitImage',principal,{buffer,filename:safeFilename(req.headers['x-file-name']),contentType:mime});
      audit(principal,'image-upload');sendJson(res,202,result);return true;
    }
    const correction=p.match(/^\/api\/submissions\/([a-f0-9]{24})\/corrections$/i);
    if(req.method==='POST'&&correction){
      csrf(req,session);role(principal,['admin','player']);
      const result=await call('correctSubmission',principal,correction[1],await readJson(req));
      audit(principal,'ocr-correction');sendJson(res,200,result);return true;
    }
    const mapping=p.match(/^\/api\/submissions\/([a-f0-9]{24})\/mapping$/i);
    if(req.method==='POST'&&mapping){
      csrf(req,session);role(principal,['admin','player']);
      const result=await call('mapSubmission',principal,mapping[1],await readJson(req));
      audit(principal,'tournament-mapping');sendJson(res,200,result);return true;
    }
    if(p.startsWith('/api/admin/')){
      role(principal,['admin']);
      if(req.method==='GET'&&p==='/api/admin/backup'){
        const backup=await call('exportBackup',principal),body=Buffer.from(backup);
        res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,
          'Content-Disposition':'attachment; filename="dwbot-recovery.json"','Cache-Control':'no-store'});
        res.end(body);return true;
      }
      if(req.method==='GET'&&p==='/api/admin/yolo-tournaments'){
        const result=await call('listYoloTournaments',principal);sendJson(res,200,result);return true;
      }
      csrf(req,session);
      if(req.method==='POST'&&p==='/api/admin/players'){
        const result=await call('addPlayer',principal,await readJson(req));audit(principal,'player-add');sendJson(res,201,result);return true;
      }
      const link=p.match(/^\/api\/admin\/players\/(\d+)\/discord-account$/);
      if(link&&req.method==='PUT'){
        const result=await call('linkPlayer',principal,Number(link[1]),await readJson(req));audit(principal,'player-account-link');sendJson(res,200,result);return true;
      }
      if(link&&req.method==='DELETE'){
        const result=await call('unlinkPlayer',principal,Number(link[1]));audit(principal,'player-account-unlink');sendJson(res,200,result);return true;
      }
      if(req.method==='POST'&&p==='/api/admin/results'){
        const result=await call('recordResult',principal,await readJson(req));audit(principal,'manual-score-entry');sendJson(res,200,result);return true;
      }
      if(req.method==='POST'&&p==='/api/admin/settings'){
        const result=await call('setSetting',principal,await readJson(req));audit(principal,'scoring-setting');sendJson(res,200,result);return true;
      }
      if(req.method==='POST'&&p==='/api/admin/yolo-tournaments'){
        const result=await call('createYoloTournament',principal,await readJson(req));audit(principal,'yolo-tournament-create');sendJson(res,201,result);return true;
      }
      const yoloAction=p.match(/^\\/api\\/admin\\/yolo-tournaments\\/([A-Za-z0-9-]+)\\/([a-z-]+)$/);
      if(req.method==='POST'&&yoloAction){
        const result=await call('updateYoloTournament',principal,yoloAction[1],yoloAction[2],await readJson(req));audit(principal,'yolo-tournament-'+yoloAction[2]);sendJson(res,200,result);return true;
      }
    }
    return false;
  }
  async function handle(req,res){
    securityHeaders(res);
    try{
      const url=new URL(req.url,origin||'http://127.0.0.1');
      if(req.method==='GET'&&url.pathname==='/auth/discord'){await oauthStart(res);return;}
      if(req.method==='GET'&&url.pathname==='/auth/discord/callback'){await oauthCallback(req,res,url);return;}
      if(url.pathname.startsWith('/api/')){
        if(await api(req,res,url))return;
        throw new DesktopHttpError(404,'NOT_FOUND','API route not found.');
      }
      if(req.method==='GET'&&await serveStatic(req,res,url.pathname))return;
      throw new DesktopHttpError(404,'NOT_FOUND','Page not found.');
    }catch(error){
      const status=Number(error.status)||500;
      const code=String(error.code||'INTERNAL_ERROR');
      const message=status>=500?'Local desktop service could not complete the request.':String(error.message||'Request rejected.');
      if(!res.headersSent)sendJson(res,status,{error:code,message});else res.destroy();
      if(status>=500)console.error('[desktop] request failed:',error?.message||error);
    }
  }
  return {
    async listen(){
      if(server)throw new Error('Desktop bridge is already listening.');
      if(!clientId||!clientSecret)throw new Error('ENABLE_DESKTOP_UI requires DISCORD_OAUTH_CLIENT_ID and DISCORD_OAUTH_CLIENT_SECRET in the local .env file.');
      server=http.createServer(handle);
      await new Promise((resolve,reject)=>{
        server.once('error',reject);
        server.listen(port,host,()=>{server.removeListener('error',reject);resolve();});
      });
      const address=server.address();
      origin='http://127.0.0.1:'+address.port;
      return{host,port:address.port,origin,redirectUri:redirectUri()};
    },
    async close(){
      if(!server)return;
      const current=server;server=null;sessions.clear();transactions.clear();limits.clear();
      await new Promise((resolve,reject)=>current.close(error=>error?reject(error):resolve()));
    },
    get origin(){return origin;},
    get listening(){return Boolean(server?.listening);},
    get sessionCount(){return sessions.size;},
  };
}
module.exports={createDesktopBridge,detectImageMime,safeFilename};
