'use strict';
const crypto = require('node:crypto');
const Tournament = require('./tournament');
const BattleRecord = require('./battle-record');
const YoloFormats = require('./yolo-formats');

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
      const aggregate={doubloons:total,estimatedValue:total*0.54/100};
      const formats=(current.yoloTournaments || []).map(t=>({
        id:t.id,name:t.name,format:t.format,status:t.status,startsAt:t.startsAt,endsAt:t.endsAt,
        season:t.season?{durationWeeks:t.season.durationWeeks,startsAt:t.season.startsAt,endsAt:t.season.endsAt}:null,
        stages:(t.stages || []).map(s=>({type:s.type,status:s.status})),
      }));
      const base={aggregate,maxPlayers:Tournament.MAX_PLAYERS,events: Tournament.EVENTS,eventLabels:Tournament.EVENT_LABELS,formats};
      if(principal.role==='player') {
        const player=Tournament.findPlayer(current,principal.player.id);
        if(!player) throw Object.assign(new Error('Your linked roster entry no longer exists.'),{status:403,code:'PLAYER_UNLINKED'});
        return {...base,role:'player',player,standing:rows.find(r=>r.id===player.id)||null,
          publicStandings:rows.map((r,i)=>({rank:i+1,...r}))};
      }
      return {...base,role:'admin',roster:current.players,standings:rows.map((r,i)=>({rank:i+1,...r})),
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
        let result;
        try {
          result=Tournament.recordResult(current,{player:player.id,event,gameNumber,shipClass,tier,recordId:entry.record_id,damage,kills,time});
        } catch(error) {
          if(!error.status) { error.status=400; error.code='INVALID_MAPPING_VALUE'; }
          throw error;
        }
        entry.status='mapped';entry.mapped_at=new Date().toISOString();
        entry.tournament_mapping={player_id:result.player.id,player_name:result.player.name,event,game_number:gameNumber,ship_class:shipClass,tier,mapped_via:'desktop-ui'};
        // A Discord attachment may already have an interactive mapping prompt.
        // Desktop completion must remove that pending prompt before saving so a
        // later Discord reply cannot race or duplicate the same battle result.
        current.pendingSubmissions=(current.pendingSubmissions||[]).filter(item=>item?.record_id!==entry.record_id);
        current.pendingOcrCorrections=(current.pendingOcrCorrections||[]).filter(item=>item?.record_id!==entry.record_id&&item?.recordId!==entry.record_id);
        await options.saveState();
        const standing=result.scores.find(r=>r.id===player.id);
        const total=result.scores.reduce((s,r)=>s+r.total,0);
        return {status:'mapped',player:{id:player.id,name:player.name},event,gameNumber,standing,
          aggregate:{doubloons:total,estimatedValue:total*0.54/100}};
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
    async listYoloTournaments(principal) {
      role(principal,['admin']);
      return { items: [...(state().yoloTournaments || [])] };
    },
    async createYoloTournament(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const tournament=YoloFormats.createTournament(body || {});
        const current=state();
        if((current.yoloTournaments || []).some(item=>item.id===tournament.id))
          throw Object.assign(new Error('Tournament ID already exists.'),{status:409,code:'DUPLICATE_TOURNAMENT'});
        current.yoloTournaments ||= [];
        current.yoloTournaments.push(tournament);
        await options.saveState();
        return tournament;
      });
    },
    async createYoloEventNight(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),tournament=(current.yoloTournaments || []).find(item=>item.id===body?.tournamentId);
        if(!tournament) throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});
        if(tournament.status==='completed'||tournament.status==='cancelled')
          throw Object.assign(new Error('Cannot add an event night to a closed tournament.'),{status:409,code:'TOURNAMENT_CLOSED'});
        if(tournament.format==='pilot'&&body?.stage)
          throw Object.assign(new Error('Pilot YOLO event nights cannot be assigned to Full season stages.'),{status:400,code:'PILOT_HAS_NO_STAGES'});
        if(tournament.format==='full'&&!body?.stage)
          throw Object.assign(new Error('Full YOLO event nights must belong to a declared season stage.'),{status:400,code:'FULL_STAGE_REQUIRED'});
        if(tournament.format==='full'&&!tournament.stages.some(stage=>stage.type===body.stage))
          throw Object.assign(new Error('Stage is not part of this Full YOLO season.'),{status:400,code:'INVALID_SEASON_STAGE'});
        const night=YoloFormats.createEventNight(body || {});
        if((current.eventNights || []).some(item=>item.id===night.id))
          throw Object.assign(new Error('Event-night ID already exists.'),{status:409,code:'DUPLICATE_EVENT_NIGHT'});
        current.eventNights ||= [];
        current.eventNights.push(night);
        tournament.eventNights ||= [];
        tournament.eventNights.push(night.id);
        await options.saveState();
        return night;
      });
    },
    async registerYoloParticipant(principal,eventNightId,body={}) {
      role(principal,['admin','player']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>item.id===eventNightId);
        if(!night) throw Object.assign(new Error('Event night was not found.'),{status:404,code:'EVENT_NIGHT_NOT_FOUND'});
        const participant=principal.role==='player'?ownPlayer(principal,current):Tournament.findPlayer(current,body.playerId);
        if(!participant) throw Object.assign(new Error('A valid linked roster participant is required.'),{status:400,code:'PARTICIPANT_REQUIRED'});
        const updated=YoloFormats.registerParticipant(night,String(participant.id));
        night.registrations=updated.registrations;
        await options.saveState();
        return {eventNightId,participantId:participant.id,registered:true};
      });
    },
    async transitionYoloStage(principal,tournamentId,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),index=(current.yoloTournaments || []).findIndex(item=>item.id===tournamentId);
        if(index<0) throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});
        const updated=YoloFormats.transitionStage(current.yoloTournaments[index],body?.stage,body?.status,principal.discordUserId);
        current.yoloTournaments[index]=updated;
        await options.saveState();
        return updated;
      });
    },
    async transitionYoloTournament(principal,tournamentId,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),index=(current.yoloTournaments || []).findIndex(item=>item.id===tournamentId);
        if(index<0) throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});
        const updated=YoloFormats.transitionTournament(current.yoloTournaments[index],body?.status,principal.discordUserId);
        current.yoloTournaments[index]=updated;
        await options.saveState();
        return updated;
      });
    },
    async exportBackup(principal) {
      role(principal,['admin']);
      return JSON.stringify(Tournament.makeArchiveSnapshot(state()),null,2);
    },
  };
}
module.exports={createDesktopService,publicSubmission,identityMatches};
