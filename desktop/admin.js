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
      const list=D.$('admin-submissions');list.replaceChildren();
      if(!submissions.items.length)list.append(D.node('p','muted','No screenshot records in the archive yet.'));
      for(const item of submissions.items)list.append(D.renderSubmission(item,{admin:true,roster:overview.roster,onDone:load}));
      status('Admin state loaded from the active tournament store.','success');
      updateSettingFields();
    }
    const formatSelect=D.$('yolo-format-select'),durationWrap=D.$('yolo-duration-wrap');
    function updateFormatFields(){durationWrap.classList.toggle('hidden',formatSelect.value!=='full');}
    formatSelect.addEventListener('change',updateFormatFields);updateFormatFields();
    D.$('yolo-tournament-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      const id=form.elements.id.value.trim(),format=form.elements.format.value;
      const body={id,name:form.elements.name.value.trim(),format};
      if(format==='full')body.season={id:id+'-season',durationWeeks:Number(form.elements.durationWeeks.value)};
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