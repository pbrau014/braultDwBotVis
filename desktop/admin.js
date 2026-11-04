'use strict';
(async()=>{
  const D=window.DWDesktop,status=D.setStatus;
  try{
    const session=await D.initSession();
    if(session.role!=='admin'){D.$('admin-denied').classList.remove('hidden');return;}
    D.$('admin-content').classList.remove('hidden');
    let overview=null;
    async function load(){
      [overview]=await Promise.all([D.api('/api/overview')]);
      const submissions=await D.api('/api/submissions');
      const yoloFormats=await D.api('/api/admin/yolo-tournaments');
      D.$('admin-roster-count').textContent=overview.roster.length+'/'+overview.maxPlayers;
      D.$('admin-total').textContent=D.number(overview.aggregate.doubloons);
      D.$('admin-value').textContent=D.money(overview.aggregate.estimatedValue);
      D.$('admin-pending').textContent=String(overview.pendingCount);
      const roster=D.$('roster-body'),playerOptions=[['','Select player…'],...overview.roster.map(p=>[String(p.id),'#'+p.id+' · '+p.name])];
      roster.replaceChildren();
      const links=new Map(overview.playerAccountLinks.map(x=>[x.playerId,x.discordUserId]));
      for(const p of overview.roster){
        const tr=document.createElement('tr');
        for(const value of [p.id,p.name]){
          const td=document.createElement('td');td.textContent=String(value);tr.append(td);
        }
        const linkCell=document.createElement('td');
        linkCell.textContent=links.get(p.id)||'Not linked';
        if(links.has(p.id)){
          const button=D.node('button','button quiet small','Unlink');
          button.type='button';button.style.marginLeft='8px';button.addEventListener('click',async()=>{
            button.disabled=true;
            try{await D.api('/api/admin/players/'+p.id+'/discord-account',{method:'DELETE'});await load();}
            catch(error){button.disabled=false;status(error.message,'error');}
          });
          linkCell.append(button);
        }
        tr.append(linkCell);roster.append(tr);
      }
      for(const id of ['link-player-select','score-player-select']){
        const select=D.$(id);select.replaceChildren();
        for(const [value,label] of playerOptions){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
      }
      const standings=D.$('admin-standings');standings.replaceChildren();
      for(const row of overview.standings){
        const tr=document.createElement('tr');
        for(const value of [row.rank,row.name,D.number(row.events.damage),D.number(row.events.kills),D.number(row.events.race),D.number(row.events.grand),D.number(row.total),D.money(row.estimatedValue)]){
          const td=document.createElement('td');td.textContent=String(value);tr.append(td);
        }
        standings.append(tr);
      }
      const formatList=D.$('yolo-tournament-list');formatList.replaceChildren();
      if(!yoloFormats.items.length)formatList.append(D.node('p','muted','No Pilot or Full YOLO tournament records have been created.'));
      for(const item of yoloFormats.items){
        const card=D.node('article','event-row','');
        const details=document.createElement('div');
        const heading=D.node('strong','',item.name+' · '+item.format.toUpperCase());
        const meta=D.node('span','',item.status+' · '+(item.season?item.season.durationWeeks+' week season':'single-evening event'));
        details.append(heading,meta);
        if(item.stages?.length){const stages=D.node('span','',item.stages.map(s=>s.type+': '+s.status).join(' · '));details.append(stages);}
        card.append(details);formatList.append(card);
      }
      const tournamentSelect=D.$('yolo-event-tournament');tournamentSelect.replaceChildren();
      for(const item of yoloFormats.items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+item.format.toUpperCase();option.dataset.format=item.format;tournamentSelect.append(option);}
      const nightSelect=D.$('yolo-event-night-select');nightSelect.replaceChildren();
      for(const id of ['yolo-team-night','yolo-fixture-night'])D.$(id).replaceChildren();
      const eventNightList=D.$('yolo-event-night-list');eventNightList.replaceChildren();
      for(const night of yoloFormats.eventNights||[]){
        const tournament=yoloFormats.items.find(item=>item.id===night.tournamentId);
        const option=document.createElement('option');option.value=night.id;option.textContent=(tournament?.name||night.tournamentId)+' · '+night.id;nightSelect.append(option);
        for(const id of ['yolo-team-night','yolo-fixture-night']){const copy=document.createElement('option');copy.value=night.id;copy.textContent=option.textContent;D.$(id).append(copy);}
        const row=D.node('div','event-row');
        row.append(D.node('strong','',night.id),D.node('span','',(night.stage||'Pilot event')+' · '+night.status+' · '+night.startsAt));
        eventNightList.append(row);
      }
      if(!(yoloFormats.eventNights||[]).length)eventNightList.append(D.node('p','muted','No event nights scheduled.'));
      const registrationPlayer=D.$('yolo-registration-player');registrationPlayer.replaceChildren();
      for(const [value,label] of playerOptions){const option=document.createElement('option');option.value=value;option.textContent=label;registrationPlayer.append(option);}
      const list=D.$('admin-submissions');list.replaceChildren();
      if(!submissions.items.length)list.append(D.node('p','muted','No screenshot records in the archive yet.'));
      for(const item of submissions.items)list.append(D.renderSubmission(item,{admin:true,roster:overview.roster,onDone:load}));
      status('Admin state loaded from the active tournament store.','success');
      updateSettingFields();
      updateStageFields();
    }
    const formatSelect=D.$('yolo-format-select'),durationWrap=D.$('yolo-duration-wrap');
    function updateFormatFields(){durationWrap.classList.toggle('hidden',formatSelect.value!=='full');}
    formatSelect.addEventListener('change',updateFormatFields);updateFormatFields();
    function updateStageFields(){
      const selected=D.$('yolo-event-tournament').selectedOptions[0];
      const isFull=selected?.dataset.format==='full';
      D.$('yolo-stage-wrap').classList.toggle('hidden',!isFull);
      D.$('yolo-event-stage').required=Boolean(isFull);
      if(!isFull)D.$('yolo-event-stage').value='';
    }
    D.$('yolo-event-tournament').addEventListener('change',updateStageFields);
    D.$('yolo-event-night-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      const startsAt=new Date(form.elements.startsAt.value);
      const body={id:form.elements.id.value.trim(),tournamentId:form.elements.tournamentId.value,startsAt:startsAt.toISOString()};
      if(form.elements.stage.value)body.stage=form.elements.stage.value;
      try{await D.api('/api/admin/yolo-event-nights',{method:'POST',body});form.reset();updateStageFields();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-registration-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/yolo-event-nights/'+encodeURIComponent(form.elements.eventNightId.value)+'/registrations',{method:'POST',body:{playerId:Number(form.elements.playerId.value)}});await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-team-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      const body={id:form.elements.id.value.trim(),name:form.elements.name.value.trim(),participantIds:form.elements.participantIds.value.split(',').map(x=>x.trim()).filter(Boolean)};
      try{await D.api('/api/admin/yolo-event-nights/'+encodeURIComponent(form.elements.eventNightId.value)+'/teams',{method:'POST',body});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-fixture-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      const body={id:form.elements.id.value.trim(),homeTeamId:form.elements.homeTeamId.value.trim(),awayTeamId:form.elements.awayTeamId.value.trim(),scheduledAt:new Date(form.elements.scheduledAt.value).toISOString(),seriesLength:Number(form.elements.seriesLength.value)};
      try{await D.api('/api/admin/yolo-event-nights/'+encodeURIComponent(form.elements.eventNightId.value)+'/fixtures',{method:'POST',body});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-match-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/yolo-fixtures/'+encodeURIComponent(form.elements.fixtureId.value.trim())+'/matches',{method:'POST',body:{id:form.elements.id.value.trim(),matchNumber:Number(form.elements.matchNumber.value)}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-game-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/yolo-matches/'+encodeURIComponent(form.elements.matchId.value.trim())+'/games',{method:'POST',body:{id:form.elements.id.value.trim(),gameNumber:Number(form.elements.gameNumber.value)}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-evidence-link-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/yolo-games/'+encodeURIComponent(form.elements.gameId.value.trim())+'/evidence',{method:'POST',body:{recordId:form.elements.recordId.value.trim()}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-evidence-review-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/yolo-games/'+encodeURIComponent(form.elements.gameId.value.trim())+'/evidence-review',{method:'POST',body:{accepted:form.elements.accepted.value==='true',reason:form.elements.reason.value.trim()}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('yolo-tournament-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      const id=form.elements.id.value.trim(),format=form.elements.format.value;
      const body={id,name:form.elements.name.value.trim(),format};
      if(format==='full')body.season={id:id.slice(0,56)+'-season',durationWeeks:Number(form.elements.durationWeeks.value)};
      try{await D.api('/api/admin/yolo-tournaments',{method:'POST',body});form.reset();updateFormatFields();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('add-player-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/players',{method:'POST',body:{name:form.elements.name.value.trim()}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('link-player-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/players/'+Number(form.elements.playerId.value)+'/discord-account',{method:'PUT',body:{discordUserId:form.elements.discordUserId.value.trim()}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('manual-result-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      const body={};
      for(const key of ['playerId','gameNumber','tier','damage','kills','time']){
        const value=form.elements[key].value;
        if(value!=='')body[key]=Number(value);
      }
      body.event=form.elements.event.value;body.shipClass=form.elements.shipClass.value;
      try{await D.api('/api/admin/results',{method:'POST',body});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    function updateSettingFields(){
      const event=D.$('setting-event').value;
      const values=Object.keys(overview.settings.events[event]||{});
      const field=D.$('setting-field');field.replaceChildren();
      for(const v of values){const opt=document.createElement('option');opt.value=v;opt.textContent=v;field.append(opt);}
    }
    D.$('setting-event').addEventListener('change',updateSettingFields);
    D.$('settings-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{await D.api('/api/admin/settings',{method:'POST',body:{event:form.elements.event.value,field:form.elements.field.value,value:Number(form.elements.value.value)}});form.reset();await load();}
      catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    await load();
  }catch(error){status(error.message,'error');if(error.status===401)location.href='/';}
})();