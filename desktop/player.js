'use strict';
(async()=>{
  const D=window.DWDesktop;
  const status=D.setStatus;
  try{
    const session=await D.initSession();
    if(session.role==='admin'){location.href='/admin.html';return;}
    if(session.role==='unlinked'){
      D.$('player-title').textContent='Account not linked';
      D.$('player-subtitle').textContent='No tournament data is available for this Discord account.';
      D.$('unlinked-panel').classList.remove('hidden');
      return;
    }
    const [overview,submissions]=await Promise.all([D.api('/api/overview'),D.api('/api/submissions')]);
    D.$('player-content').classList.remove('hidden');
    D.$('player-title').textContent=overview.player.name;
    D.$('player-subtitle').textContent='Roster entry #'+overview.player.id+' · signed in as '+session.user.username;
    const formatList=D.$('tournament-format-list');formatList.replaceChildren();
    for(const tournament of overview.tournaments||[]){
      const card=D.node('article','submission-card');
      card.append(D.node('h3','',tournament.name+' · '+(tournament.format==='pilot'?'Pilot YOLO':'Full YOLO')));
      card.append(D.node('p','submission-meta',tournament.status+' · '+(tournament.format==='pilot'?'single-evening event':(tournament.seasonWeeks?tournament.seasonWeeks+' week season':'season duration pending'))));
      const stages=D.node('p','muted',tournament.stages.map(stage=>stage.key.replace(/_/g,' ')+' ('+stage.status+')').join(' → '));
      card.append(stages);
      if(tournament.format==='pilot'&&Array.isArray(tournament.pilotStandings)&&tournament.pilotStandings.length){
        const current=tournament.pilotStandings.find(row=>String(row.playerId)===String(overview.player.id));
        if(current)card.append(D.node('p','muted','Your Pilot placement: #'+current.rank+' · '+D.number(current.totalDamage)+' Damage'));
      }
      if(tournament.registered)card.append(D.node('p','form-success','You are registered for this tournament.'));
      else if(tournament.registrationOpen&&['published','active'].includes(tournament.status)){
        const register=D.node('button','button primary small','Register for this tournament');
        register.type='button';register.addEventListener('click',async()=>{
          register.disabled=true;
          try{await D.api('/api/competition/'+encodeURIComponent(tournament.id)+'/register',{method:'POST',body:{}});status('Registration confirmed.','success');location.reload();}
          catch(error){register.disabled=false;status(error.message,'error');}
        });card.append(register);
      }else card.append(D.node('p','muted',tournament.registrationOpen?'Registration opens when the tournament is published.':'Registration is closed.'));
      formatList.append(card);
    }
    if(!(overview.tournaments||[]).length)formatList.append(D.node('p','muted','No Pilot or Full YOLO tournament is currently published.'));
    const standing=overview.standing||{};
    D.$('player-total').textContent=D.number(standing.total)+' 🪙';
    D.$('player-value').textContent=D.money(standing.estimatedValue);
    const rank=overview.publicStandings.findIndex(x=>x.id===overview.player.id)+1;
    D.$('player-rank').textContent=rank?('#'+rank):'—';
    D.$('roster-count').textContent=overview.publicStandings.length+' active participants';
    const open=submissions.items.filter(x=>x.status!=='mapped').length;
    D.$('open-submissions').textContent=String(open);
    const eventList=D.$('event-totals');eventList.replaceChildren();
    for(const [key,label] of Object.entries(overview.eventLabels)){
      const row=D.node('div','event-row');
      row.append(D.node('span','',label),D.node('strong','',D.number(standing.events?.[key])));
      eventList.append(row);
    }
    const tbody=D.$('standings-body');tbody.replaceChildren();
    for(const row of overview.publicStandings){
      const tr=document.createElement('tr');
      for(const value of [row.rank,row.name,D.number(row.total),D.money(row.estimatedValue)]){
        const td=document.createElement('td');td.textContent=String(value);tr.append(td);
      }
      if(row.id===overview.player.id)tr.classList.add('current-player');
      tbody.append(tr);
    }
    const list=D.$('submission-list');list.replaceChildren();
    if(!submissions.items.length)list.append(D.node('p','muted','No desktop screenshot submissions yet. Submit a battle result screenshot to begin.'));
    for(const item of submissions.items){
      list.append(D.renderSubmission(item,{admin:false,onDone:()=>location.reload()}));
    }
    status('Tournament data loaded from the local bot service.','success');
    async function refresh(){
      const latest=await D.api('/api/submissions');list.replaceChildren();
      for(const item of latest.items)list.append(D.renderSubmission(item,{admin:false,onDone:()=>location.reload()}));
      D.$('open-submissions').textContent=String(latest.items.filter(x=>x.status!=='mapped').length);
    }
  }catch(error){status(error.message,'error');if(error.status===401)location.href='/';}
})();