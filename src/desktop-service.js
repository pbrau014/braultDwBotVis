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
  function auditLifecycle(record,principal,action,details={}) {
    record.audit ||= [];
    record.audit.push({action,actor:String(principal?.discordUserId||'unknown'),at:new Date().toISOString(),...details});
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
      const playerForRegistration=principal.role==='player'?Tournament.findPlayer(current,principal.player.id):null;
      const eventNights=(current.eventNights || []).map(night=>({
        id:night.id,tournamentId:night.tournamentId,stage:night.stage,startsAt:night.startsAt,status:night.status,
        registrationCount:(night.registrations || []).length,
        isRegistered:Boolean(playerForRegistration && (night.registrations || []).some(r=>String(r.participantId)===String(playerForRegistration.id))),
      }));
      const base={aggregate,maxPlayers:Tournament.MAX_PLAYERS,events: Tournament.EVENTS,eventLabels:Tournament.EVENT_LABELS,formats,eventNights};
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
      return { items: [...(state().yoloTournaments || [])], eventNights: [...(state().eventNights || [])] };
    },
    async createYoloTournament(principal,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const tournament=YoloFormats.createTournament(body || {});
        const current=state();
        if((current.yoloTournaments || []).some(item=>item.id===tournament.id))
          throw Object.assign(new Error('Tournament ID already exists.'),{status:409,code:'DUPLICATE_TOURNAMENT'});
        current.yoloTournaments ||= [];
        tournament.audit.push({type:'tournament-created',actor:String(principal.discordUserId),at:new Date().toISOString()});
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
        auditLifecycle(night,principal,'event-night-created');
        current.eventNights.push(night);
        tournament.eventNights ||= [];
        tournament.eventNights.push(night.id);
        await options.saveState();
        return night;
      });
    },
    async transitionYoloEventNight(principal,eventNightId,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),index=(current.eventNights || []).findIndex(item=>item.id===eventNightId);
        if(index<0) throw Object.assign(new Error('Event night was not found.'),{status:404,code:'EVENT_NIGHT_NOT_FOUND'});
        const night=current.eventNights[index];
        if(body?.status==='completed'){
          if((night.games || []).some(game=>!['evidence-accepted','evidence-rejected'].includes(game.status)))
            throw Object.assign(new Error('Every game must have evidence accepted or rejected before event closeout.'),{status:409,code:'EVENT_EVIDENCE_UNRESOLVED'});
          if((night.matches || []).some(match=>match.outcome?.status!=='certified'))
            throw Object.assign(new Error('Every match outcome must be certified before event closeout.'),{status:409,code:'EVENT_MATCH_UNRESOLVED'});
        }
        const updated=YoloFormats.transitionEventNight(night,body?.status,principal.discordUserId);
        current.eventNights[index]=updated;
        auditLifecycle(updated,principal,'event-night-transitioned',{status:updated.status});
        await options.saveState();
        return updated;
      });
    },
    async createYoloTeam(principal,eventNightId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>item.id===eventNightId);
        if(!night) throw Object.assign(new Error('Event night was not found.'),{status:404,code:'EVENT_NIGHT_NOT_FOUND'});
        const participantIds=(body.participantIds || []).map(id=>String(id));
        const registered=new Set((night.registrations || []).map(item=>String(item.participantId)));
        if(participantIds.some(id=>!registered.has(id)))
          throw Object.assign(new Error('Every team member must be registered for this event night.'),{status:409,code:'TEAM_MEMBER_NOT_REGISTERED'});
        const alreadyAssigned=new Set((night.teams || []).flatMap(team=>team.participantIds || []));
        if(participantIds.some(id=>alreadyAssigned.has(id)))
          throw Object.assign(new Error('A participant can belong to only one team in this event night.'),{status:409,code:'PARTICIPANT_ALREADY_ASSIGNED'});
        const team=YoloFormats.createTeam({...body,eventNightId});
        if((night.teams || []).some(item=>item.id===team.id)) throw Object.assign(new Error('Team ID already exists.'),{status:409,code:'DUPLICATE_TEAM'});
        night.teams.push(team);auditLifecycle(night,principal,'team-created',{teamId:team.id,participantIds:team.participantIds});await options.saveState();return team;
      });
    },
    async createYoloFixture(principal,eventNightId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>item.id===eventNightId);
        if(!night) throw Object.assign(new Error('Event night was not found.'),{status:404,code:'EVENT_NIGHT_NOT_FOUND'});
        const teams=new Set((night.teams || []).map(team=>team.id));
        if(!teams.has(body.homeTeamId)||!teams.has(body.awayTeamId))
          throw Object.assign(new Error('Both fixture teams must belong to this event night.'),{status:400,code:'FIXTURE_TEAM_SCOPE'});
        const fixture=YoloFormats.createFixture({...body,eventNightId});
        if(night.fixtures.some(item=>item.id===fixture.id)) throw Object.assign(new Error('Fixture ID already exists.'),{status:409,code:'DUPLICATE_FIXTURE'});
        night.fixtures.push(fixture);auditLifecycle(night,principal,'fixture-created',{fixtureId:fixture.id,homeTeamId:fixture.homeTeamId,awayTeamId:fixture.awayTeamId});await options.saveState();return fixture;
      });
    },
    async createYoloMatch(principal,fixtureId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>(item.fixtures || []).some(f=>f.id===fixtureId));
        if(!night) throw Object.assign(new Error('Fixture was not found.'),{status:404,code:'FIXTURE_NOT_FOUND'});
        const fixture=night.fixtures.find(item=>item.id===fixtureId);
        const match=YoloFormats.createMatch({...body,fixtureId});
        if((night.matches || []).some(item=>item.id===match.id)||fixture.matchIds.includes(match.id))
          throw Object.assign(new Error('Match ID already exists.'),{status:409,code:'DUPLICATE_MATCH'});
        if(fixture.matchIds.length>=fixture.seriesLength) throw Object.assign(new Error('Fixture already has its full series of matches.'),{status:409,code:'SERIES_COMPLETE'});
        night.matches.push(match);fixture.matchIds.push(match.id);auditLifecycle(night,principal,'match-created',{matchId:match.id,fixtureId:fixture.id});await options.saveState();return match;
      });
    },
    async createYoloRaceSideEvent(principal,eventNightId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const night=(state().eventNights || []).find(item=>item.id===eventNightId);
        if(!night) throw Object.assign(new Error('Event night was not found.'),{status:404,code:'EVENT_NIGHT_NOT_FOUND'});
        if(!body.approvedSettingsId||!body.scoringPolicyId)
          throw Object.assign(new Error('An approved event settings record and scoring policy ID are required for a Race side-event.'),{status:400,code:'RACE_SIDE_EVENT_APPROVAL_REQUIRED'});
        const sideEvent=YoloFormats.createRaceSideEvent({...body,eventNightId});
        night.raceSideEvents ||= [];
        if(night.raceSideEvents.some(item=>item.id===sideEvent.id)) throw Object.assign(new Error('Race side-event ID already exists.'),{status:409,code:'DUPLICATE_RACE_SIDE_EVENT'});
        night.raceSideEvents.push(sideEvent);
        auditLifecycle(night,principal,'race-side-event-created',{sideEventId:sideEvent.id,approvedSettingsId:sideEvent.approvedSettingsId});
        await options.saveState();return sideEvent;
      });
    },
    async recordYoloRaceTime(principal,gameId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const night=(state().eventNights || []).find(item=>(item.games || []).some(game=>game.id===gameId));
        if(!night) throw Object.assign(new Error('Game was not found.'),{status:404,code:'GAME_NOT_FOUND'});
        const game=night.games.find(item=>item.id===gameId);
        const evidenceRecordId=String(body.evidenceRecordId||'');
        if(game.status!=='evidence-accepted'||!(game.evidenceRecordIds || []).includes(evidenceRecordId))
          throw Object.assign(new Error('Race time must be tied to evidence already accepted for this game.'),{status:409,code:'RACE_TIME_EVIDENCE_REQUIRED'});
        const metric=YoloFormats.raceMetric(body.elapsedSeconds);
        game.raceTimeMetric={...metric,evidenceRecordId,recordedBy:principal.discordUserId,recordedAt:new Date().toISOString()};
        auditLifecycle(night,principal,'race-time-recorded',{gameId,evidenceRecordId,elapsedSeconds:metric.elapsedSeconds});
        await options.saveState();return game.raceTimeMetric;
      });
    },
    async certifyYoloMatchOutcome(principal,matchId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>(item.matches || []).some(m=>m.id===matchId));
        if(!night) throw Object.assign(new Error('Match was not found.'),{status:404,code:'MATCH_NOT_FOUND'});
        const match=night.matches.find(item=>item.id===matchId);
        if(match.outcome?.status==='certified') throw Object.assign(new Error('Match outcome is already certified.'),{status:409,code:'OUTCOME_ALREADY_CERTIFIED'});
        const fixture=(night.fixtures || []).find(item=>item.id===match.fixtureId);
        if(!fixture) throw Object.assign(new Error('Fixture for this match was not found.'),{status:409,code:'FIXTURE_NOT_FOUND'});
        const winnerTeamId=String(body.winnerTeamId||'');
        if(![fixture.homeTeamId,fixture.awayTeamId].includes(winnerTeamId))
          throw Object.assign(new Error('Winner must be one of the two teams in this fixture.'),{status:400,code:'INVALID_MATCH_WINNER'});
        const validated=YoloFormats.validateMatchOutcome(body);
        const acceptedEvidence=new Set((match.gameIds || []).flatMap(id=>{
          const game=(night.games || []).find(item=>item.id===id);
          return game?.status==='evidence-accepted'?(game.evidenceRecordIds || []):[];
        }));
        if(validated.acceptedPerformanceRecordIds.some(id=>!acceptedEvidence.has(id)))
          throw Object.assign(new Error('Every accepted performance record must be linked to an evidence-accepted game in this match.'),{status:409,code:'MATCH_EVIDENCE_NOT_ACCEPTED'});
        const decisionReference=String(body.decisionReference||'').trim();
        if(!decisionReference) throw Object.assign(new Error('An external decision reference is required; the bot does not calculate an unapproved scoring formula.'),{status:400,code:'DECISION_REFERENCE_REQUIRED'});
        match.outcome={status:'certified',winnerTeamId,approvedScoringMethodId:validated.approvedScoringMethodId,
          acceptedPerformanceRecordIds:validated.acceptedPerformanceRecordIds,aggregation:validated.aggregation,
          rounding:validated.rounding,tieBreakOrder:validated.tieBreakOrder,decisionReference,
          certifiedBy:principal.discordUserId,certifiedAt:new Date().toISOString()};
        match.status='completed';
        auditLifecycle(night,principal,'match-outcome-certified',{matchId,winnerTeamId,approvedScoringMethodId:validated.approvedScoringMethodId,decisionReference});
        await options.saveState();
        return {matchId,outcome:match.outcome};
      });
    },
    async createYoloGame(principal,matchId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>(item.matches || []).some(m=>m.id===matchId));
        if(!night) throw Object.assign(new Error('Match was not found.'),{status:404,code:'MATCH_NOT_FOUND'});
        const match=night.matches.find(item=>item.id===matchId);
        const game=YoloFormats.createGame({...body,matchId});
        if((night.games || []).some(item=>item.id===game.id)||match.gameIds.includes(game.id))
          throw Object.assign(new Error('Game ID already exists.'),{status:409,code:'DUPLICATE_GAME'});
        if(match.gameIds.some(id=>night.games.find(item=>item.id===id)?.gameNumber===game.gameNumber))
          throw Object.assign(new Error('Game number already exists in this match.'),{status:409,code:'DUPLICATE_GAME_NUMBER'});
        night.games.push(game);match.gameIds.push(game.id);auditLifecycle(night,principal,'game-created',{gameId:game.id,matchId:match.id});await options.saveState();return game;
      });
    },
    async linkYoloGameEvidence(principal,gameId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>(item.games || []).some(g=>g.id===gameId));
        if(!night) throw Object.assign(new Error('Game was not found.'),{status:404,code:'GAME_NOT_FOUND'});
        const game=night.games.find(item=>item.id===gameId),entry=current.battleRecords.find(item=>item.record_id===body.recordId);
        if(!entry||entry.status!=='mapped'||entry.missing_fields?.length)
          throw Object.assign(new Error('Only complete, mapped screenshot records can be linked as game evidence.'),{status:409,code:'EVIDENCE_NOT_ACCEPTED'});
        if(night.games.some(other=>other.id!==game.id&&(other.evidenceRecordIds || []).includes(entry.record_id)))
          throw Object.assign(new Error('This evidence record is already linked to another game.'),{status:409,code:'EVIDENCE_ALREADY_LINKED'});
        game.evidenceRecordIds ||= [];
        if(!game.evidenceRecordIds.includes(entry.record_id))game.evidenceRecordIds.push(entry.record_id);
        game.status='awaiting-evidence-review';
        game.evidenceReview={status:'pending',linkedBy:principal.discordUserId,linkedAt:new Date().toISOString()};
        auditLifecycle(night,principal,'game-evidence-linked',{gameId:game.id,recordId:entry.record_id});
        await options.saveState();return {gameId,evidenceRecordId:entry.record_id,status:game.status};
      });
    },
    async reviewYoloGameEvidence(principal,gameId,body={}) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),night=(current.eventNights || []).find(item=>(item.games || []).some(g=>g.id===gameId));
        if(!night) throw Object.assign(new Error('Game was not found.'),{status:404,code:'GAME_NOT_FOUND'});
        const game=night.games.find(item=>item.id===gameId);
        if(game.status!=='awaiting-evidence-review'||!game.evidenceRecordIds?.length)
          throw Object.assign(new Error('Game has no evidence awaiting review.'),{status:409,code:'EVIDENCE_NOT_PENDING'});
        const accepted=body.accepted===true;
        const reason=String(body.reason||'').trim();
        if(!accepted&&!reason) throw Object.assign(new Error('A rejection reason is required.'),{status:400,code:'EVIDENCE_REJECTION_REASON_REQUIRED'});
        game.evidenceReview={status:accepted?'accepted':'rejected',reviewedBy:principal.discordUserId,reviewedAt:new Date().toISOString(),reason:reason||null};
        game.status=accepted?'evidence-accepted':'evidence-rejected';
        auditLifecycle(night,principal,'game-evidence-reviewed',{gameId:game.id,reviewStatus:game.status,reason:reason||null});
        await options.saveState();return {gameId,status:game.status,evidenceReview:game.evidenceReview};
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
        auditLifecycle(night,principal,'participant-registered',{participantId:String(participant.id)});
        await options.saveState();
        return {eventNightId,participantId:participant.id,registered:true};
      });
    },
    async transitionYoloStage(principal,tournamentId,body) {
      role(principal,['admin']);
      return mutate(async()=>{
        const current=state(),index=(current.yoloTournaments || []).findIndex(item=>item.id===tournamentId);
        if(index<0) throw Object.assign(new Error('Tournament was not found.'),{status:404,code:'TOURNAMENT_NOT_FOUND'});
        const tournament=current.yoloTournaments[index];
        if(body?.status==='completed'){
          const nights=(current.eventNights || []).filter(night=>night.tournamentId===tournament.id&&night.stage===body.stage);
          if(!nights.length||nights.some(night=>!['completed','cancelled'].includes(night.status)))
            throw Object.assign(new Error('Every event night in this stage must be completed or cancelled first.'),{status:409,code:'STAGE_EVENT_NIGHTS_OPEN'});
          if(nights.some(night=>(night.matches || []).some(match=>match.outcome?.status!=='certified')))
            throw Object.assign(new Error('Every match in this stage requires a certified outcome.'),{status:409,code:'STAGE_MATCHES_UNRESOLVED'});
        }
        const updated=YoloFormats.transitionStage(tournament,body?.stage,body?.status,principal.discordUserId);
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
        const tournament=current.yoloTournaments[index];
        if(body?.status==='completed'&&(current.eventNights || []).some(night=>night.tournamentId===tournament.id&&!['completed','cancelled'].includes(night.status)))
          throw Object.assign(new Error('All tournament event nights must be completed or cancelled before season closeout.'),{status:409,code:'TOURNAMENT_EVENT_NIGHTS_OPEN'});
        const updated=YoloFormats.transitionTournament(tournament,body?.status,principal.discordUserId);
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
