'use strict';
const crypto = require('node:crypto');
const Tournament = require('./tournament');
const BattleRecord = require('./battle-record');
const Lifecycle = Tournament.TournamentLifecycle;

const CORRECTION_LABELS = Object.freeze({
  result:'Battle Result', player:'Player', map:'Map', mode:'Battle Mode',
  battleStart:'Battle Start Time', credits:'Credits', freeXp:'Free XP',
  damage:'Damage', xp:'XP',
});
function identityMatches(record, player) {
  return Boolean(player && String(record?.player || '').trim().toLowerCase() === String(player.name || '').trim().toLowerCase());
}
function wholeNumber(value, label, minimum = 0) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < minimum) throw Object.assign(new Error(label + ' must be a whole number of at least ' + minimum + '.'), { status: 400, code: 'INVALID_MAPPING_VALUE' });
  return n;
}
function publicSubmission(entry) {
  const battle = entry.record?.battle || {};
  const ocr = entry.ocr_record || {};
  const rewards = battle.rewards || {};
  const metrics = battle.metrics || {};
  const requiredValues = {
    result: String(ocr.result ?? battle.result ?? ''),
    player: String(ocr.player ?? battle.player_name ?? ''),
    map: String(ocr.map ?? battle.map ?? ''),
    mode: String(ocr.mode ?? battle.mode ?? ''),
    battleStart: String(ocr.battleStart ?? battle.battle_start_time ?? ''),
    credits: String(ocr.credits ?? rewards.credits ?? ''),
    freeXp: String(ocr.freeXp ?? rewards.free_xp ?? ''),
    damage: String(ocr.damage ?? metrics.damage ?? ''),
    xp: String(ocr.xp ?? rewards.xp ?? ''),
  };
  return {
    recordId:entry.record_id, status:entry.status, capturedAt:entry.captured_at,
    sourceFile:entry.source_file, playerName:battle.player_name || 'Not detected',
    ship:battle.ship || 'Not detected', result:battle.result || 'Not detected',
    map:battle.map || 'Not detected', mode:battle.mode || 'Not detected',
    battleStart:battle.battle_start_time || 'Not detected',
    rewards, metrics, requiredValues,
    requiredFieldsComplete:entry.record?.verification?.required_fields_complete === true,
    missingFields:entry.missing_fields || [], confidence:Number(entry.ocr_confidence) || 0,
    pageSegmentationMode:entry.page_segmentation_mode || null,
    sourceEvidence:entry.record?.source?.evidence || null,
    tournamentMapping:entry.tournament_mapping || null,
  };
}

function withoutPrizeEstimate(row) { const {estimatedValue,...safe}=row; return safe; }
function tournamentStandings(current,tournament,season=null) {
  const registrations=tournament.format==='pilot'?tournament.registrations:(season?.registrations||[]);
  const ids=new Set(registrations.map(x=>String(x.participantId)));
  const players=current.players.filter(p=>ids.has(String(p.id))).map(p=>({...JSON.parse(JSON.stringify(p)),events:Object.fromEntries(Tournament.EVENTS.map(key=>[key,Array.from({length:7},()=>key==='grand'?{class:'-',classWeight:0,tier:1,damage:0,kills:0,time:0}:{class:'-',classWeight:0,tier:1,metric:0})]))}));
  const byId=new Map(players.map(p=>[String(p.id),p]));
  for(const entry of tournament.scoreEntries||[]){
    const player=byId.get(String(entry.participantId));if(!player)continue;
    const game=player.events[entry.category][entry.gameNumber-1];
    game.class=entry.shipClass;game.classWeight=Tournament.classWeightFor(entry.shipClass);game.tier=entry.tier;
    if(entry.category==='grand')Object.assign(game,{damage:entry.damage,kills:entry.kills,time:entry.time});
    else game.metric=entry.metric;
  }
  return Tournament.standings({...current,players});
}
function auditLifecycle(current,principal,action,details={}) {
  current.lifecycle||=Lifecycle.createLifecycleState(current);
  current.lifecycle.auditLog.push({action,actor:String(principal?.discordUserId||''),at:new Date().toISOString(),details:JSON.parse(JSON.stringify(details))});
}
function createDesktopService(options = {}) {
  for (const name of ['getState','saveState','extractImage','isAdminId','validateScreenshot']) {
    if (typeof options[name] !== 'function') throw new TypeError('Desktop service requires ' + name + '().');
  }
  let queue = Promise.resolve();
  const mutate = task => {
    const result = queue.then(task, task);
    queue = result.catch(() => {});
    return result;
  };
  function state() {
    const current = options.getState();
    if (!current) throw Object.assign(new Error('Tournament state is not loaded.'),{status:503,code:'STATE_NOT_READY'});
    current.battleRecords ||= [];
    current.importedBattleRecordIds ||= [];
    current.playerAccountLinks ||= {};
    return current;
  }
  function role(principal, allowed) {
    if (!principal || !allowed.includes(principal.role)) throw Object.assign(new Error('Your tournament role does not permit this operation.'),{status:403,code:'FORBIDDEN'});
  }
  function findEntry(current,id) {
    const entry=current.battleRecords.find(item=>item.record_id===id);
    if(!entry) throw Object.assign(new Error('Screenshot record was not found.'),{status:404,code:'SUBMISSION_NOT_FOUND'});
    return entry;
  }
  function ownEntry(entry,principal) {
    if(principal.role==='admin') return;
    if(principal.role!=='player'||entry.desktop_owner_id!==principal.discordUserId)
      throw Object.assign(new Error('Screenshot record was not found.'),{status:404,code:'SUBMISSION_NOT_FOUND'});
  }
  function ownPlayer(principal,current=state()) {
    return principal.role==='player' ? Tournament.findPlayer(current,principal.player.id) : null;
  }
  function evidence(buffer,mime) {
    return {platform:'desktop',attachmentId:'',messageId:'',channelId:'',messageUrl:'',
      sha256:crypto.createHash('sha256').update(buffer).digest('hex'),sizeBytes:buffer.length,
      contentType:mime,retrievedAt:new Date().toISOString()};
  }
  function makeExport(record,filename,proof) {
    return BattleRecord.makeTournamentExport(record,{sourceFileName:filename,sourceEvidence:proof});
  }
  function refreshEntry(entry,record,exported) {
    entry.ocr_record=record;
    entry.record=exported;
    entry.record_id=exported.record_id;
    entry.missing_fields=BattleRecord.getMissingRequiredFields(record).map(x=>({key:x.key,label:x.label,reason:x.reason}));
    entry.record.verification.required_fields_complete=entry.missing_fields.length===0;
  }
  return {
    async resolvePrincipal(user) {
      const id=String(user?.id||'');
      if(!/^\d{17,20}$/.test(id)) return {role:'unlinked',discordUserId:''};
      if(options.isAdminId(id)) return {role:'admin',discordUserId:id};
      const player=Tournament.findPlayerByDiscordUserId(state(),id);
      return player?{role:'player',discordUserId:id,player:{id:player.id,name:player.name}}:{role:'unlinked',discordUserId:id};
    },
    async getOverview(principal) {
      role(principal,['admin','player']);
      const current=state(), rows=Tournament.standings(current);
      const total=rows.reduce((s,r)=>s+r.total,0);
      const aggregate={doubloons:total};
      const lifecycle=current.lifecycle||Lifecycle.createLifecycleState(current);
      const publicTournaments=lifecycle.tournaments.map(t=>{const season=lifecycle.seasons.find(x=>x.id===t.seasonId)||null;return{id:t.id,name:t.name,format:t.format,status:t.status,seasonId:t.seasonId||null,eventNights:(t.format==='pilot'?t.eventNights:(season?.eventNights||[])).map(n=>({id:n.id,startsAt:n.startsAt,status:n.status})),standings:tournamentStandings(current,t,season).map((r,i)=>({rank:i+1,...withoutPrizeEstimate(r)}))};});
      const base={aggregate,maxPlayers:Tournament.MAX_PLAYERS,events: Tournament.EVENTS,eventLabels:Tournament.EVENT_LABELS,formats:Lifecycle.FORMATS,scoringCategories:Lifecycle.SCORING_CATEGORIES,tournaments:publicTournaments};
      if(principal.role==='player') {
        const player=Tournament.findPlayer(current,principal.player.id);
        if(!player) throw Object.assign(new Error('Your linked roster entry no longer exists.'),{status:403,code:'PLAYER_UNLINKED'});
        return {...base,role:'player',player,standing:rows.find(r=>r.id===player.id)?withoutPrizeEstimate(rows.find(r=>r.id===player.id)):null,
          publicStandings:rows.map((r,i)=>({rank:i+1,...withoutPrizeEstimate(r)}))};
      }
      return {...base,role:'admin',roster:current.players,standings:rows.map((r,i)=>({rank:i+1,...withoutPrizeEstimate(r)})),
        settings:current.settings,
        playerAccountLinks:Object.entries(current.playerAccountLinks).map(([playerId,discordUserId])=>({playerId:Number(playerId),discordUserId})),
        pendingCount:current.battleRecords.filter(r=>r.status!=='mapped').length};
    },
    async listSubmissions(principal) {
      role(principal,['admin','player']);
      return {items:state().battleRecords
        .filter(r=>principal.role==='admin'||r.desktop_owner_id===principal.discordUserId)
        .sort((a,b)=>String(b.captured_at||'').localeCompare(String(a.captured_at||'')))
        .map(publicSubmission)};
    },
    async submitImage(principal,file) {
      role(principal,['admin','player']);
      if(!Buffer.isBuffer(file?.buffer)||!file.buffer.length) throw Object.assign(new Error('Uploaded image is empty.'),{status:400,code:'EMPTY_IMAGE'});
      const extracted=await options.extractImage(file.buffer);
      if(!Array.isArray(extracted?.attempts)||!extracted.attempts.length) throw Object.assign(new Error('OCR returned no validated independent reads.'),{status:503,code:'OCR_NO_ATTEMPTS'});
      const validations=extracted.attempts.map(attempt=>options.validateScreenshot(attempt,extracted.fields||{}));
      validations.sort((a,b)=>a.missing.length-b.missing.length||b.confidence-a.confidence);
      const best=validations[0], record=best.record, missing=BattleRecord.getMissingRequiredFields(record);
      const proof=evidence(file.buffer,file.contentType);
      const exported=makeExport(record,file.filename,proof);
      return mutate(async()=>{
        const current=state();
        if(current.battleRecords.some(r=>r.record_id===exported.record_id)||current.importedBattleRecordIds.includes(exported.record_id))
          throw Object.assign(new Error('This screenshot matches an existing battle record. No duplicate was created.'),{status:409,code:'DUPLICATE_RECORD'});
        const player=ownPlayer(principal,current);
        const matches=identityMatches(record,player);
        const entry={
          record_id:exported.record_id,status:missing.length?'needs-correction':(matches?'awaiting-mapping':'admin-review'),
          captured_at:new Date().toISOString(),source_file:file.filename,
          desktop_owner_id:principal.discordUserId,desktop_owner_role:principal.role,
          ocr_record:record,record:exported,
          missing_fields:missing.map(x=>({key:x.key,label:x.label,reason:x.reason})),
          ocr_confidence:best.confidence,page_segmentation_mode:best.pageSegmentationMode,
        };
        current.battleRecords.push(entry);
        await options.saveState();
        return {submissionId:entry.record_id,status:entry.status,missingFields:entry.missing_fields,
          playerIdentityMatched:matches,record:publicSubmission(entry)};
      });
    },
    async correctSubmission(principal,id,body) {
      role(principal,['admin','player']);
      const values=body?.values;
      if(!values||typeof values!=='object'||Array.isArray(values)) throw Object.assign(new Error('Correction values must be an object.'),{status:400,code:'INVALID_CORRECTIONS'});
      const keys=Object.keys(values);
      if(!keys.length||keys.some(k=>!Object.hasOwn(CORRECTION_LABELS,k))) throw Object.assign(new Error('Only the nine mandatory OCR fields may be corrected.'),{status:400,code:'INVALID_CORRECTIONS'});
      return mutate(async()=>{
        const current=state(),entry=findEntry(current,id);
        ownEntry(entry,principal);
        if(entry.status==='mapped') throw Object.assign(new Error('Mapped tournament records cannot be edited here.'),{status:409,code:'RECORD_ALREADY_MAPPED'});
        const player=ownPlayer(principal,current);
        if(principal.role==='player'&&Object.hasOwn(values,'player')&&String(values.player).trim().toLowerCase()!==String(player?.name||'').trim().toLowerCase())
          throw Object.assign(new Error('Participants may only confirm the player identity linked to their Discord account.'),{status:403,code:'PLAYER_IDENTITY_MISMATCH'});
        const text=keys.map(k=>CORRECTION_LABELS[k]+': '+String(values[k]??'')).join('\n');
        const corrected=BattleRecord.applyCorrections(entry.ocr_record||{},text);
        if(!corrected.recognized&&!corrected.invalid.length) throw Object.assign(new Error('No valid correction was recognized.'),{status:400,code:'NO_VALID_CORRECTIONS'});
        const old=entry.record?.source?.evidence||{};
        const proof=old?{platform:old.platform,messageId:old.message_id,channelId:old.channel_id,messageUrl:old.message_url,
          attachmentId:old.attachment_id,sha256:old.sha256,sizeBytes:old.size_bytes,contentType:old.content_type,retrievedAt:old.retrieved_at}:null;
        const exported=makeExport(corrected.record,entry.source_file,proof);
        if(current.battleRecords.some(r=>r!==entry&&r.record_id===exported.record_id)||current.importedBattleRecordIds.includes(exported.record_id))
          throw Object.assign(new Error('Corrected screenshot identity duplicates another battle record.'),{status:409,code:'DUPLICATE_RECORD'});
        const previousRecordId=entry.record_id;
        refreshEntry(entry,corrected.record,exported);
        const stillOwn=principal.role==='admin'||identityMatches(corrected.record,player);
        entry.status=entry.missing_fields.length?'needs-correction':(stillOwn?'awaiting-mapping':'admin-review');
        // Corrections can change the deterministic battle-record ID. Cancel any
        // older Discord-side guided mapping so the next mapping uses this exact
        // corrected record and no stale prompt can save the previous identity.
        current.pendingSubmissions=(current.pendingSubmissions||[]).filter(item=>item?.record_id!==previousRecordId&&item?.record_id!==entry.record_id);
        current.pendingOcrCorrections=(current.pendingOcrCorrections||[]).filter(item=>item?.record_id!==previousRecordId&&item?.recordId!==previousRecordId&&item?.record_id!==entry.record_id&&item?.recordId!==entry.record_id);
        await options.saveState();
        return {submissionId:entry.record_id,status:entry.status,missingFields:entry.missing_fields,
          invalidCorrections:corrected.invalid,record:publicSubmission(entry)};
      });
    },
    async mapSubmission(principal,id,body) {
      role(principal,['admin','player']);
      return mutate(async()=>{
        const current=state(),entry=findEntry(current,id);
        ownEntry(entry,principal);
        if(entry.status==='mapped') throw Object.assign(new Error('This record has already been mapped.'),{status:409,code:'RECORD_ALREADY_MAPPED'});
        if(entry.missing_fields?.length) throw Object.assign(new Error('All nine required OCR fields must be confirmed before mapping.'),{status:409,code:'OCR_FIELDS_INCOMPLETE'});
        const player=principal.role==='player'?ownPlayer(principal,current):Tournament.findPlayer(current,body?.playerId);
        if(!player) throw Object.assign(new Error('Choose a valid roster player.'),{status:400,code:'PLAYER_REQUIRED'});
        if(principal.role==='player'&&!identityMatches(entry.ocr_record,player))
          throw Object.assign(new Error('OCR player identity does not match your linked roster entry. An admin must review it.'),{status:403,code:'PLAYER_IDENTITY_MISMATCH'});
        const event=String(body?.event||'').trim().toLowerCase();
        if(!Tournament.EVENTS.includes(event)) throw Object.assign(new Error('Choose Damage, Kills, Race, or Grand Yolo.'),{status:400,code:'INVALID_EVENT'});
        const gameNumber=wholeNumber(body?.gameNumber,'Game number',1);
        if(gameNumber>7) throw new Error('Game number must be from 1 to 7.');
        const shipClass=String(body?.shipClass||'').trim().toUpperCase();
        const tier=wholeNumber(body?.tier,'Ship tier',1);
        if(tier>11) throw new Error('Ship tier must be from 1 to 11.');
        const battle=entry.record?.battle||{},metrics=battle.metrics||{};
        const damage=metrics.damage==null?null:wholeNumber(metrics.damage,'Damage');
        const destroyed=(battle.ribbons||[]).find(r=>String(r.label||'').toLowerCase()==='destroyed');
        const kills=body?.kills===''||body?.kills===undefined?(destroyed?.count==null?null:wholeNumber(destroyed.count,'Kills')):wholeNumber(body.kills,'Kills');
        const time=body?.time===''||body?.time===undefined?null:Number(body.time);
        let result,scopedTournament=null,scopedStanding=null;
        try {
          if(body?.tournamentId){
            current.lifecycle||=Lifecycle.createLifecycleState(current);
            scopedTournament=current.lifecycle.tournaments.find(x=>x.id===body.tournamentId);
            if(!scopedTournament)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});
            const season=scopedTournament.format==='full'?current.lifecycle.seasons.find(x=>x.id===scopedTournament.seasonId):null;
            const scoreEntry=Lifecycle.recordScoreEntry(scopedTournament,{participantId:String(player.id),category:event,gameNumber,shipClass,tier,evidenceId:entry.record_id,eventNightId:body?.eventNightId,damage,kills,time},season);
            auditLifecycle(current,principal,'tournament.score.mapped',{tournamentId:scopedTournament.id,eventNightId:scoreEntry.eventNightId,participantId:String(player.id),category:event,gameNumber,evidenceId:entry.record_id});
            scopedStanding=tournamentStandings(current,scopedTournament,season).find(x=>String(x.id)===String(player.id))||null;
            result={player,event,gameNumber,game:scoreEntry,scores:tournamentStandings(current,scopedTournament,season)};
          }else{
            result=Tournament.recordResult(current,{player:player.id,event,gameNumber,shipClass,tier,recordId:entry.record_id,damage,kills,time});
          }
        } catch(error) {
          if(!error.status) { error.status=400; error.code='INVALID_MAPPING_VALUE'; }
          throw error;
        }
        entry.status='mapped';entry.mapped_at=new Date().toISOString();
        entry.tournament_mapping={player_id:result.player.id,player_name:result.player.name,tournament_id:scopedTournament?.id||null,event,game_number:gameNumber,ship_class:shipClass,tier,mapped_via:'desktop-ui'};
        // A Discord attachment may already have an interactive mapping prompt.
        // Desktop completion must remove that pending prompt before saving so a
        // later Discord reply cannot race or duplicate the same battle result.
        current.pendingSubmissions=(current.pendingSubmissions||[]).filter(item=>item?.record_id!==entry.record_id);
        current.pendingOcrCorrections=(current.pendingOcrCorrections||[]).filter(item=>item?.record_id!==entry.record_id&&item?.recordId!==entry.record_id);
        await options.saveState();
        const standing=scopedTournament?scopedStanding:result.scores.find(r=>r.id===player.id);
        const total=result.scores.reduce((s,r)=>s+r.total,0);
        return {status:'mapped',player:{id:player.id,name:player.name},event,gameNumber,standing,
          aggregate:{doubloons:total},tournamentId:scopedTournament?.id||null};
      });
    },
    async addPlayer(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const p=Tournament.addPlayer(state(),body?.name);await options.saveState();return{id:p.id,name:p.name};});
    },
    async linkPlayer(principal,id,body) {
      role(principal,['admin']);
      return mutate(async()=>{const r=Tournament.linkPlayerDiscordAccount(state(),id,body?.discordUserId);await options.saveState();return{player:{id:r.player.id,name:r.player.name},discordUserId:r.discordUserId};});
    },
    async unlinkPlayer(principal,id) {
      role(principal,['admin']);
      return mutate(async()=>{const r=Tournament.unlinkPlayerDiscordAccount(state(),id);await options.saveState();return{player:{id:r.player.id,name:r.player.name},unlinkedDiscordUserId:r.discordUserId};});
    },
    async recordResult(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const r=Tournament.recordResult(state(),{player:body?.playerId,event:body?.event,gameNumber:body?.gameNumber,shipClass:body?.shipClass,tier:body?.tier,damage:body?.damage,kills:body?.kills,time:body?.time});await options.saveState();return{player:{id:r.player.id,name:r.player.name},event:r.event,gameNumber:r.gameNumber,standing:r.scores.find(x=>x.id===r.player.id)};});
    },
    async setSetting(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const value=Tournament.setSetting(state(),String(body?.event||''),String(body?.field||''),body?.value);await options.saveState();return{event:body.event,field:body.field,value};});
    },


    async registerPilotParticipant(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const t=current.lifecycle?.tournaments.find(x=>x.id===body?.tournamentId);if(!t)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});const player=Tournament.findPlayer(current,body?.participantId);if(!player)throw Object.assign(new Error('Participant must be an existing roster player.'),{status:400,code:'PLAYER_REQUIRED'});const row=Lifecycle.registerPilotParticipant(t,{participantId:String(player.id),displayName:player.name});auditLifecycle(current,principal,'pilot.participant.registered',{tournamentId:t.id,participantId:row.participantId});await options.saveState();return row;});
    },
    async createPilotEventNight(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const t=current.lifecycle?.tournaments.find(x=>x.id===body?.tournamentId);if(!t)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});const row=Lifecycle.createPilotEventNight(t,{id:body?.id||crypto.randomUUID(),startsAt:body?.startsAt,settings:body?.settings});auditLifecycle(current,principal,'pilot.event-night.created',{tournamentId:t.id,eventNightId:row.id});await options.saveState();return row;});
    },
    async recordTournamentScore(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const t=current.lifecycle?.tournaments.find(x=>x.id===body?.tournamentId);if(!t)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});const player=Tournament.findPlayer(current,body?.participantId);if(!player)throw Object.assign(new Error('Participant was not found.'),{status:404,code:'PLAYER_REQUIRED'});const season=t.format==='full'?current.lifecycle.seasons.find(x=>x.id===t.seasonId):null;const entry=Lifecycle.recordScoreEntry(t,{...body,participantId:String(player.id),evidenceId:body?.evidenceId||('manual-'+crypto.randomUUID()),eventNightId:body?.eventNightId},season);auditLifecycle(current,principal,'tournament.score.recorded',{tournamentId:t.id,eventNightId:entry.eventNightId,participantId:entry.participantId,category:entry.category,gameNumber:entry.gameNumber,evidenceId:entry.evidenceId});await options.saveState();return{entry,standings:tournamentStandings(current,t,season).map(withoutPrizeEstimate)};});
    },
    async createTournament(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();current.lifecycle||=Lifecycle.createLifecycleState(current);const tournament=Lifecycle.createTournament({id:body?.id||crypto.randomUUID(),name:body?.name,format:body?.format});if(current.lifecycle.tournaments.some(x=>x.id===tournament.id))throw Object.assign(new Error('Tournament id already exists.'),{status:409,code:'TOURNAMENT_EXISTS'});current.lifecycle.tournaments.push(tournament);auditLifecycle(current,principal,'tournament.created',{tournamentId:tournament.id,format:tournament.format});await options.saveState();return tournament;});
    },
    async createSeason(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();current.lifecycle||=Lifecycle.createLifecycleState(current);const tournament=current.lifecycle.tournaments.find(x=>x.id===body?.tournamentId);if(!tournament)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});const season=Lifecycle.createSeason(tournament.id,{id:body?.id||crypto.randomUUID(),name:body?.name,tournament});if(tournament.seasonId)throw Object.assign(new Error('A season is already attached to this tournament.'),{status:409,code:'SEASON_EXISTS'});tournament.seasonId=season.id;current.lifecycle.seasons.push(season);auditLifecycle(current,principal,'season.created',{seasonId:season.id,tournamentId:tournament.id});await options.saveState();return season;});
    },
    async addStage(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();current.lifecycle||=Lifecycle.createLifecycleState(current);const season=current.lifecycle.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const stage=Lifecycle.createStage(season.id,body?.type,{id:body?.id||crypto.randomUUID()});if(season.stages.some(x=>x.id===stage.id||x.type===stage.type))throw Object.assign(new Error('Stage id or type already exists.'),{status:409,code:'STAGE_EXISTS'});season.stages.push(stage);auditLifecycle(current,principal,'stage.created',{seasonId:season.id,stageId:stage.id,type:stage.type});await options.saveState();return stage;});
    },
    async activateStage(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const stage=Lifecycle.activateStage(season,body?.stageId);auditLifecycle(current,principal,'stage.activated',{seasonId:season.id,stageId:stage.id});await options.saveState();return stage;});
    },
    async createTeam(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const team=Lifecycle.createTeam(season,{id:body?.id||crypto.randomUUID(),name:body?.name});auditLifecycle(current,principal,'team.created',{seasonId:season.id,teamId:team.id});await options.saveState();return team;});
    },
    async registerParticipant(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const registration=Lifecycle.registerParticipant(season,{participantId:body?.participantId,displayName:body?.displayName});auditLifecycle(current,principal,'participant.registered',{seasonId:season.id,participantId:registration.participantId});await options.saveState();return registration;});
    },
    async assignRoster(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const assignment=Lifecycle.assignRoster(season,{participantId:body?.participantId,teamId:body?.teamId,eventNightId:body?.eventNightId});auditLifecycle(current,principal,'roster.assigned',{seasonId:season.id,eventNightId:assignment.eventNightId,participantId:assignment.participantId,teamId:assignment.teamId});await options.saveState();return assignment;});
    },

    async transitionEventNight(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();let night=null,season=null,tournament=null;if(body?.seasonId){season=current.lifecycle?.seasons.find(x=>x.id===body.seasonId);night=season?.eventNights.find(x=>x.id===body?.eventNightId);}else if(body?.tournamentId){tournament=current.lifecycle?.tournaments.find(x=>x.id===body.tournamentId);night=tournament?.eventNights.find(x=>x.id===body?.eventNightId);}if(!night)throw Object.assign(new Error('Event night was not found in the selected tournament/season.'),{status:404,code:'EVENT_NIGHT_NOT_FOUND'});Lifecycle.transitionEventNight(night,body?.status,{actor:principal.discordUserId,reason:body?.reason});auditLifecycle(current,principal,'event-night.status.changed',{eventNightId:night.id,status:night.status,seasonId:season?.id||null,tournamentId:tournament?.id||null});await options.saveState();return night;});
    },
    async createEventNight(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const eventNight=Lifecycle.createEventNight(season,{id:body?.id||crypto.randomUUID(),stageId:body?.stageId,startsAt:body?.startsAt,settings:body?.settings});auditLifecycle(current,principal,'event-night.created',{seasonId:season.id,eventNightId:eventNight.id,stageId:eventNight.stageId});await options.saveState();return eventNight;});
    },
    async createFixture(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const fixture=Lifecycle.createFixture(season,{id:body?.id||crypto.randomUUID(),stageId:body?.stageId,eventNightId:body?.eventNightId,teamA:body?.teamA,teamB:body?.teamB,scheduledAt:body?.scheduledAt});auditLifecycle(current,principal,'fixture.created',{seasonId:season.id,fixtureId:fixture.id});await options.saveState();return fixture;});
    },
    async createMatch(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const match=Lifecycle.createMatch(season,body?.fixtureId,{id:body?.id||crypto.randomUUID(),gameNumber:body?.gameNumber});auditLifecycle(current,principal,'match.created',{seasonId:season.id,matchId:match.id,fixtureId:match.fixtureId});await options.saveState();return match;});
    },
    async recordMatchOutcome(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const approval=current.lifecycle?.approvals?.find(x=>x.id===body?.methodId&&x.status==='approved');if(!approval||!String(approval.scope).toLowerCase().includes('match outcome'))throw Object.assign(new Error('A recorded organizer approval for match-outcome scoring is required.'),{status:409,code:'SCORING_APPROVAL_REQUIRED'});const outcome=Lifecycle.recordMatchOutcome(season,{...body,method:{approved:true,methodId:approval.id,approvedAt:approval.approvedAt,approvedBy:approval.approvedBy}});auditLifecycle(current,principal,'match.outcome.recorded',{seasonId:season.id,outcomeId:outcome.id,matchId:outcome.matchId,methodId:approval.id});await options.saveState();return outcome;});
    },
    async advanceBracket(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const approval=current.lifecycle?.approvals?.find(x=>x.id===body?.methodId&&x.status==='approved');if(!approval||!String(approval.scope).toLowerCase().includes('match outcome'))throw Object.assign(new Error('A recorded organizer approval for match-outcome scoring is required for bracket advancement.'),{status:409,code:'SCORING_APPROVAL_REQUIRED'});const progression=Lifecycle.advanceBracket(season,{...body,method:{approved:true,methodId:approval.id,approvedAt:approval.approvedAt,approvedBy:approval.approvedBy}});auditLifecycle(current,principal,'bracket.advanced',{seasonId:season.id,outcomeId:progression.fromOutcomeId,fixtureId:progression.toFixtureId});await options.saveState();return progression;});
    },

    async recordRaceSideEventResult(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const result=Lifecycle.recordRaceSideEventResult(season,body?.eventId,{participantId:body?.participantId,damage:body?.damage,evidenceId:body?.evidenceId});auditLifecycle(current,principal,'race-side-event.result.recorded',{seasonId:season.id,eventId:body.eventId,participantId:result.participantId,evidenceId:result.evidenceId});await options.saveState();return result;});
    },
    async createRaceSideEvent(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const event=Lifecycle.createRaceSideEvent(body||{});const season=current.lifecycle?.seasons.find(x=>x.id===event.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});if(!season.eventNights.some(x=>x.id===event.eventNightId))throw Object.assign(new Error('Race side-event must reference an event night in this season.'),{status:400,code:'EVENT_NIGHT_REQUIRED'});season.raceSideEvents||=[];season.raceSideEvents.push(event);current.lifecycle.raceSideEvents.push(event);auditLifecycle(current,principal,'race-side-event.created',{seasonId:season.id,eventNightId:event.eventNightId,eventId:event.id});await options.saveState();return event;});
    },

    async transitionTournament(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const t=current.lifecycle?.tournaments.find(x=>x.id===body?.tournamentId);if(!t)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});Lifecycle.transitionTournament(t,body?.status,{actor:principal.discordUserId,reason:body?.reason});auditLifecycle(current,principal,'tournament.status.changed',{tournamentId:t.id,status:t.status,reason:body?.reason||''});await options.saveState();return t;});
    },
    async completeStage(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();const season=current.lifecycle?.seasons.find(x=>x.id===body?.seasonId);if(!season)throw Object.assign(new Error('Season was not found.'),{status:404,code:'SEASON_NOT_FOUND'});const stage=Lifecycle.completeStage(season,body?.stageId);auditLifecycle(current,principal,'stage.completed',{seasonId:season.id,stageId:stage.id});await options.saveState();return stage;});
    },

    async createApprovalRecord(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();current.lifecycle||=Lifecycle.createLifecycleState(current);const record=Lifecycle.createApprovalRecord({...body,approvedBy:principal.discordUserId});if(current.lifecycle.approvals.some(x=>x.id===record.id))throw Object.assign(new Error('Approval id already exists.'),{status:409,code:'APPROVAL_EXISTS'});current.lifecycle.approvals.push(record);auditLifecycle(current,principal,'organizer-approval.recorded',{approvalId:record.id,scope:record.scope,version:record.version});await options.saveState();return record;});
    },
    async createAward(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{const current=state();current.lifecycle||=Lifecycle.createLifecycleState(current);const tournament=current.lifecycle.tournaments.find(x=>x.id===body?.tournamentId);if(!tournament)throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});const season=current.lifecycle.seasons.find(x=>x.id===tournament.seasonId);const recipientId=String(body?.recipientId||'');const recipientExists=tournament.format==='pilot'?tournament.registrations.some(x=>x.participantId===recipientId):Boolean(season&&(season.registrations.some(x=>x.participantId===recipientId)||season.teams.some(x=>x.id===recipientId)));if(!recipientExists)throw Object.assign(new Error('Award recipient must be registered in the tournament or be a season team.'),{status:400,code:'AWARD_RECIPIENT_REQUIRED'});const approval=current.lifecycle.approvals.find(x=>x.id===body?.approvalId&&x.status==='approved');if(!approval||!String(approval.scope).toLowerCase().includes('award'))throw Object.assign(new Error('A recorded organizer award approval is required.'),{status:409,code:'AWARD_APPROVAL_REQUIRED'});if(current.lifecycle.awards.some(x=>x.id===body?.id))throw Object.assign(new Error('Award id already exists.'),{status:409,code:'AWARD_EXISTS'});const award=Lifecycle.createAward(body||{});current.lifecycle.awards.push(award);auditLifecycle(current,principal,'award.recorded',{awardId:award.id,tournamentId:award.tournamentId,recipientId:award.recipientId,approvalId:approval.id});await options.saveState();return award;});
    },
    async exportBackup(principal) {
      role(principal,['admin']);
      return JSON.stringify(Tournament.makeArchiveSnapshot(state()),null,2);
    },
  };
}
module.exports={createDesktopService,publicSubmission,identityMatches};
