'use strict';

function recordPilotResult(tournament,input,actor='organizer') {
  if(tournament.format!=='pilot') throw new Error('Pilot result belongs to Pilot YOLO only.');
  if(!tournament.stages.some(s=>s.key==='pilot_event'&&s.status==='active')) throw new Error('Pilot results require an active Pilot Event stage.');
  const playerId=String(input.playerId||'').trim();
  if(!tournament.registrations.some(r=>r.playerId===playerId&&r.status==='registered')) throw new Error('Player must have an active registration.');
  const gameNumber=Number(input.gameNumber),damage=input.damage;
  if(!Number.isInteger(gameNumber)||gameNumber<1) throw new Error('Game number must be a positive integer.');
  if(damage===null||damage===undefined||(typeof damage==='string'&&!damage.trim())||!Number.isFinite(Number(damage))||Number(damage)<0) throw new Error('Damage must be an explicit non-negative number.');
  if(tournament.pilotResults.some(r=>r.playerId===playerId&&r.gameNumber===gameNumber)) throw new Error('Pilot result slot already exists.');
  const evidenceId=String(input.evidenceId||'').trim();
  if(!tournament.evidence.some(e=>e.id===evidenceId)) throw new Error('Pilot result requires registered original screenshot evidence.');
  const result={id:tournament.id+':pilot-result:'+(tournament.pilotResults.length+1),playerId,gameNumber,damage:Number(damage),evidenceId,recordedAt:new Date().toISOString(),recordedBy:String(actor)};
  tournament.pilotResults.push(result);
  tournament.audit.push({id:'audit-'+(tournament.audit.length+1),action:'pilot_result_recorded',actor:String(actor),at:new Date().toISOString(),details:{resultId:result.id,playerId,gameNumber,damage:result.damage,evidenceId}});
  return result;
}

function pilotStandings(tournament) {
  if(tournament.format!=='pilot') throw new Error('Pilot standings belong to Pilot YOLO only.');
  const totals=new Map();
  for(const r of tournament.registrations) totals.set(r.playerId,{playerId:r.playerId,name:r.displayName,totalDamage:0,games:0});
  for(const result of tournament.pilotResults){const row=totals.get(result.playerId);if(row){row.totalDamage+=result.damage;row.games++;}}
  const rows=[...totals.values()].sort((a,b)=>b.totalDamage-a.totalDamage||a.name.localeCompare(b.name));
  let prior=null,rank=0;rows.forEach((row,index)=>{if(prior===null||row.totalDamage!==prior)rank=index+1;row.rank=rank;prior=row.totalDamage;});
  return rows;
}
module.exports={recordPilotResult,pilotStandings};
