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
    const formatList=D.$('player-format-list');formatList.replaceChildren();
    if(!(overview.formats||[]).length)formatList.append(D.node('p','muted','No published Pilot or Full YOLO events are available yet.'));
    for(const item of overview.formats||[]){
      const card=D.node('article','event-row');
      const info=document.createElement('div');
      info.append(D.node('strong','',item.name+' · '+(item.format==='pilot'?'PILOT YOLO':'FULL YOLO')));
      info.append(D.node('span','',item.status+(item.season?' · '+item.season.durationWeeks+' week season':' · single-evening format')));
      if(item.stages?.length)info.append(D.node('span','',item.stages.map(s=>s.type.replaceAll('-',' ')+': '+s.status).join(' · ')));
      card.append(info);formatList.append(card);
    }
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