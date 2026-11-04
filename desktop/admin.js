'use strict';
(async()=>{
  const D=window.DWDesktop,status=D.setStatus;
  try{
    const session=await D.initSession();
    if(session.role!=='admin'){D.$('admin-denied').classList.remove('hidden');return;}
    D.$('admin-content').classList.remove('hidden');
    let overview=null;
    async function load(){
      let yoloTournaments=[];
      [overview,yoloTournaments]=await Promise.all([D.api('/api/overview'),D.api('/api/admin/yolo-tournaments')]);
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
      const yoloList=D.$('yolo-tournament-list');yoloList.replaceChildren();
      if(!yoloTournaments.items.length)yoloList.append(D.node('p','muted','No Pilot or Full YOLO tournaments have been created yet.'));
      for(const item of yoloTournaments.items){
        const card=D.node('article','submission-card'),head=D.node('div','submission-head'),title=D.node('div');
        title.append(D.node('h3','',item.title));
        title.append(D.node('p','submission-meta',item.format.toUpperCase()+' · '+item.lifecycle.toUpperCase()+(item.stage?' · '+item.stage:'')+' · '+item.registrationCount+' registrations · '+item.teamCount+' teams · '+item.fixtureCount+' fixtures'));
        head.append(title,pill(item.lifecycle==='complete'?'Complete':item.lifecycle==='active'?'Active':item.lifecycle==='published'?'Published':'Draft'));card.append(head);
        const actions=D.node('div','button-row');
        const actionButton=(label,action,body={})=>{const button=D.node('button','button secondary small',label);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{let payload=body;if(action==='publish')payload={approval:JSON.parse(D.$('yolo-approval-json').value||'{}')};await D.api('/api/admin/yolo-tournaments/'+encodeURIComponent(item.id)+'/'+action,{method:'POST',body:payload});await load();}catch(error){button.disabled=false;status(error.message,'error');}});actions.append(button);};
        if(item.lifecycle==='draft')actionButton('Publish', 'publish');
        if(item.lifecycle==='published')actionButton('Start', 'start');
        if(item.lifecycle==='active'&&item.format==='pilot')actionButton('Complete Pilot','finish-pilot');
        card.append(actions);
        if(item.format==='full'&&item.lifecycle==='active')card.append(D.node('p','muted','Full season stages, teams, fixtures, evidence-linked games and verified match outcomes are managed through the authenticated /api/admin/yolo-tournaments lifecycle actions. Stage progression remains blocked until all fixtures are resolved.'));
        yoloList.append(card);
      }
      const list=D.$('admin-submissions');list.replaceChildren();
      if(!submissions.items.length)list.append(D.node('p','muted','No screenshot records in the archive yet.'));
      for(const item of submissions.items)list.append(D.renderSubmission(item,{admin:true,roster:overview.roster,onDone:load}));
      status('Admin state loaded from the active tournament store.','success');
      updateSettingFields();
    }
    D.$('yolo-tournament-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
      try{
        const settings=JSON.parse(form.elements.settings.value);
        if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error('Format settings must be a JSON object.');
        await D.api('/api/admin/yolo-tournaments',{method:'POST',body:{title:form.elements.title.value.trim(),format:form.elements.format.value,settings}});
        form.reset();await load();
      }catch(error){status(error.message,'error');}finally{button.disabled=false;}
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