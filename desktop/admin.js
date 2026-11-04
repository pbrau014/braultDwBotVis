'use strict';
(async()=>{
  const D=window.DWDesktop,status=D.setStatus;
  try{
    const session=await D.initSession();
    if(session.role!=='admin'){D.$('admin-denied').classList.remove('hidden');return;}
    D.$('admin-content').classList.remove('hidden');
    let overview=null;
    function competitionAction(body){
      return D.api('/api/admin/competition',{method:'POST',body});
    }
    function renderCompetitions(){
      const target=D.$('competition-list');target.replaceChildren();
      const items=overview.competition?.tournaments||[];
      if(!items.length){target.append(D.node('p','muted','No tournaments created. Create a Pilot or Full YOLO draft above.'));return;}
      for(const tournament of items){
        const card=D.node('article','submission-card');
        card.append(D.node('h3','',tournament.name+' · '+(tournament.format==='pilot'?'Pilot YOLO':'Full YOLO')));
        card.append(D.node('p','submission-meta','ID '+tournament.id+' · '+tournament.status+' · '+(tournament.config?.seasonWeeks?tournament.config.seasonWeeks+' weeks':'single-event format')));
        const stages=D.node('div','event-list');
        for(const [stageIndex,stage] of tournament.stages.entries()){
          const row=D.node('div','event-row');
          row.append(D.node('span','',stage.key.replace(/_/g,' ')+' · '+stage.status));
          if(stage.status==='active'){
            const complete=D.node('button','button secondary small','Complete stage');
            complete.type='button';complete.addEventListener('click',async()=>{
              complete.disabled=true;
              try{await competitionAction({action:'complete_stage',tournamentId:tournament.id,stageKey:stage.key});await load();}
              catch(error){complete.disabled=false;status(error.message,'error');}
            });row.append(complete);
          }else if(stage.status!=='complete'&&tournament.status!=='draft'&&(stageIndex===0||tournament.stages[stageIndex-1].status==='complete')){
            const activate=D.node('button','button secondary small','Activate stage');
            activate.type='button';activate.addEventListener('click',async()=>{
              activate.disabled=true;
              try{await competitionAction({action:'activate_stage',tournamentId:tournament.id,stageKey:stage.key});await load();}
              catch(error){activate.disabled=false;status(error.message,'error');}
            });row.append(activate);
          }
          stages.append(row);
        }
        card.append(stages);
        const controls=D.node('div','button-row');
        if(tournament.status==='draft'){
          const publish=D.node('button','button primary small','Publish tournament');
          publish.type='button';publish.addEventListener('click',async()=>{
            publish.disabled=true;
            const approval={};
            if(tournament.format==='full'){
              approval.approvedBy=D.$('match-method-approver').value.trim();
              approval.matchOutcomeMethod={approved:true,publishedAt:new Date().toISOString(),
                version:D.$('match-method-version').value.trim(),
                aggregation:D.$('match-method-aggregation').value,
                weights:{damage:Number(D.$('match-method-damage').value),kills:Number(D.$('match-method-kills').value)}};
            }
            try{await competitionAction({action:'publish',tournamentId:tournament.id,approval});await load();}
            catch(error){publish.disabled=false;status(error.message,'error');}
          });controls.append(publish);
        }
        if(tournament.config?.registrationOpen){
          const close=D.node('button','button quiet small','Close registration');
          close.type='button';close.addEventListener('click',async()=>{
            close.disabled=true;
            try{await competitionAction({action:'close_registration',tournamentId:tournament.id});await load();}
            catch(error){close.disabled=false;status(error.message,'error');}
          });controls.append(close);
        }
        card.append(controls);target.append(card);
      }
    }
    async function load(){
      [overview]=await Promise.all([D.api('/api/overview')]);
      const submissions=await D.api('/api/submissions');
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
      const list=D.$('admin-submissions');list.replaceChildren();
      if(!submissions.items.length)list.append(D.node('p','muted','No screenshot records in the archive yet.'));
      for(const item of submissions.items)list.append(D.renderSubmission(item,{admin:true,roster:overview.roster,onDone:load}));
      renderCompetitions();
      status('Admin state loaded from the active tournament store.','success');
      updateSettingFields();
    }
    function zonedInputToIso(value,timeZone){
      const match=/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})$/.exec(value||'');
      if(!match)throw new Error('Enter a valid local date and time.');
      const target={year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5])};
      const targetUtc=Date.UTC(target.year,target.month-1,target.day,target.hour,target.minute);
      const formatter=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
      const partsAt=instant=>{
        const parts=Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
        return {year:parts.year,month:parts.month,day:parts.day,hour:parts.hour,minute:parts.minute};
      };
      const same=instant=>{const p=partsAt(instant);return Object.keys(target).every(key=>p[key]===target[key]);};
      let instant=targetUtc;
      for(let i=0;i<5;i++){
        const p=partsAt(instant);
        const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
        instant+=targetUtc-represented;
      }
      if(!same(instant))throw new Error('That local time does not exist in the selected timezone because of a daylight-saving transition.');
      if(same(instant-3600000)||same(instant+3600000))throw new Error('That local time is ambiguous in the selected timezone. Choose a different time outside the daylight-saving transition.');
      return new Date(instant).toISOString();
    }
    const competitionForm=D.$('competition-create-form');
    const formatSelect=competitionForm.elements.format;
    function updateFormatFields(){
      const pilot=formatSelect.value==='pilot';
      D.$('event-start-label').textContent=pilot?'Pilot start':'Season start';
      D.$('event-end-label').textContent=pilot?'Pilot end':'Season end';
      D.$('season-weeks-field').classList.toggle('hidden',pilot);
    }
    formatSelect.addEventListener('change',updateFormatFields);updateFormatFields();
    competitionForm.addEventListener('submit',async e=>{
      e.preventDefault();const button=competitionForm.querySelector('button');button.disabled=true;
      const format=formatSelect.value;
      const config={timezone:competitionForm.elements.timezone.value.trim()};
      const start=competitionForm.elements.eventStart.value,end=competitionForm.elements.eventEnd.value;
      if(start)config.eventStart=zonedInputToIso(start,config.timezone);
      if(end)config.eventEnd=zonedInputToIso(end,config.timezone);
      if(format==='full')config.seasonWeeks=Number(competitionForm.elements.seasonWeeks.value);
      try{
        await competitionAction({action:'create_tournament',tournament:{
          id:competitionForm.elements.id.value.trim(),name:competitionForm.elements.name.value.trim(),format,config,
        }});
        competitionForm.reset();updateFormatFields();await load();
      }catch(error){status(error.message,'error');}finally{button.disabled=false;}
    });
    D.$('competition-action-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{
        const payload=JSON.parse(form.elements.payload.value||'{}');
        payload.action=form.elements.action.value;
        const result=await competitionAction(payload);
        status('Operation completed: '+payload.action,'success');
        form.reset();
        await load();
      }catch(error){status(error instanceof SyntaxError?'Payload must be valid JSON.':error.message,'error');}
      finally{button.disabled=false;}
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