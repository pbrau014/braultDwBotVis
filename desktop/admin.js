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
      populateLifecycleSelectors(overview.lifecycle||{},overview.roster||[]);
      const tournamentList=D.$('admin-tournament-list');tournamentList.replaceChildren();
      if(!(overview.tournaments||[]).length)tournamentList.append(D.node('p','muted','No Pilot or Full tournament instances have been created.'));
      for(const tournament of overview.tournaments||[]){
        const row=D.node('div','event-row');
        const left=D.node('span','',tournament.name+' · '+(tournament.format==='pilot'?'Pilot YOLO':'Full YOLO')+' · '+tournament.status);
        const right=D.node('strong','',String((tournament.standings||[]).length)+' registered');
        row.append(left,right);tournamentList.append(row);
      }

      D.$('admin-roster-count').textContent=overview.roster.length+'/'+overview.maxPlayers;
      D.$('admin-total').textContent=D.number(overview.aggregate.doubloons);
      D.$('admin-value').textContent='Not published';
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
        for(const value of [row.rank,row.name,D.number(row.events.damage),D.number(row.events.kills),D.number(row.events.race),D.number(row.events.grand),D.number(row.total),'Not published']){
          const td=document.createElement('td');td.textContent=String(value);tr.append(td);
        }
        standings.append(tr);
      }
      const list=D.$('admin-submissions');list.replaceChildren();
      if(!submissions.items.length)list.append(D.node('p','muted','No screenshot records in the archive yet.'));
      for(const item of submissions.items)list.append(D.renderSubmission(item,{admin:true,roster:overview.roster,tournaments:overview.tournaments||[],onDone:load}));
      status('Admin state loaded from the active tournament store.','success');
      updateSettingFields();
    }

    function populateLifecycleSelectors(lifecycle,roster=[]){
      const groups={
        tournaments:(lifecycle.tournaments||[]).map(t=>[t.id,t.name+' ('+t.format+')']),
        fullTournaments:(lifecycle.tournaments||[]).filter(t=>t.format==='full').map(t=>[t.id,t.name]),
        pilotTournaments:(lifecycle.tournaments||[]).filter(t=>t.format==='pilot').map(t=>[t.id,t.name]),
        allTournaments:(lifecycle.tournaments||[]).map(t=>[t.id,t.name+' ('+t.format+')']),
        players:roster.map(p=>[String(p.id),p.name]),
        seasons:(lifecycle.seasons||[]).map(x=>[x.id,x.name||x.id]),
        stages:(lifecycle.seasons||[]).flatMap(x=>(x.stages||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.type])),
        teams:(lifecycle.seasons||[]).flatMap(x=>(x.teams||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.name])),
        pilotTeams:(lifecycle.tournaments||[]).filter(x=>x.format==='pilot').flatMap(x=>(x.teams||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.name])),
        pilotFixtures:(lifecycle.tournaments||[]).filter(x=>x.format==='pilot').flatMap(x=>(x.fixtures||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.id])),
        eventNights:[...(lifecycle.seasons||[]).flatMap(x=>(x.eventNights||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.id])),...(lifecycle.tournaments||[]).filter(x=>x.format==='pilot').flatMap(x=>(x.eventNights||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.id]))],
        raceSideEvents:(lifecycle.seasons||[]).flatMap(x=>(x.raceSideEvents||[]).map(y=>[y.id,(x.name||x.id)+' · '+y.map])),
        approvals:(lifecycle.approvals||[]).filter(x=>x.status==='approved').map(x=>[x.id,x.scope+' · '+x.version]),
      };
      for(const select of document.querySelectorAll('select[data-entity]')){
        const values=groups[select.dataset.entity]||[];
        const previous=select.value;select.replaceChildren();
        const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=values.length?'Select…':'No records yet';select.append(placeholder);
        for(const [value,label] of values){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
        if(values.some(x=>x[0]===previous))select.value=previous;
      }
    }
    for(const form of document.querySelectorAll('form[data-lifecycle-endpoint]')){
      form.addEventListener('submit',async event=>{
        event.preventDefault();const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
        try{
          const body=Object.fromEntries(new FormData(form).entries());
          for(const key of ['scoreA','scoreB','gameNumber','elapsedSeconds','amount','time','damage','kills','tier'])if(body[key]!==undefined&&body[key]!=='')body[key]=Number(body[key]);
          for(const [key,value] of Object.entries(body))if(value==='')delete body[key];
          if(body.confirmed!==undefined)body.confirmed=body.confirmed==='true';
          if(body.startsAt)body.startsAt=new Date(body.startsAt).toISOString();
          if(body.approvedAt)body.approvedAt=new Date(body.approvedAt).toISOString();
          await D.api(form.dataset.lifecycleEndpoint,{method:'POST',body});
          form.reset();await load();status('Lifecycle change saved.','success');
        }catch(error){status(error.message,'error');}
        finally{if(button)button.disabled=false;}
      });
    }
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