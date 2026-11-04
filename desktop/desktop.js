'use strict';
(() => {
  let session = null;
  const labels = {
    result:'Battle Result',player:'Player',map:'Map',mode:'Battle Mode',
    battleStart:'Battle Start Time',credits:'Credits',freeXp:'Free XP',damage:'Damage',xp:'XP',
  };
  const $ = (id,root=document) => root.getElementById(id);
  const node = (tag,cls,text) => {
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=String(text);
    return el;
  };
  const setStatus = (message,type='') => {
    const target=$('page-status');
    if(!target)return;
    target.textContent=message||'';
    target.className='status-line'+(type?' '+type:'');
  };
  async function api(url,options={}) {
    const method=String(options.method||'GET').toUpperCase();
    const headers=new Headers(options.headers||{});
    if(options.body!==undefined && !(options.body instanceof ArrayBuffer) && !ArrayBuffer.isView(options.body) && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
      if(typeof options.body!=='string')options.body=JSON.stringify(options.body);
      if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    }
    if(method!=='GET'&&method!=='HEAD'&&session?.csrfToken)headers.set('X-CSRF-Token',session.csrfToken);
    const response=await fetch(url,{...options,method,headers,credentials:'same-origin',cache:'no-store'});
    const type=response.headers.get('content-type')||'';
    let result=null;
    if(type.includes('application/json'))result=await response.json();
    else result=await response.text();
    if(!response.ok) {
      const error=new Error(result?.message||result?.error||'The request was rejected.');
      error.status=response.status;error.code=result?.error||'REQUEST_FAILED';
      throw error;
    }
    return result;
  }
  const number = value => Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const money = value => Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const date = value => value?new Date(value).toLocaleString():'—';
  function eventLabel(key){return({damage:'Damage',kills:'Kills',race:'Race',grand:'Grand Yolo'})[key]||key;}
  async function initSession() {
    session=await api('/api/session');
    const user=$('signed-in-user');
    if(user)user.textContent=session.user.username+' · '+session.role;
    const admin=$('admin-link');
    if(admin&&session.role==='admin')admin.classList.remove('hidden');
    const logout=$('logout');
    if(logout)logout.addEventListener('click',async()=>{
      try{await api('/api/logout',{method:'POST',body:{}});location.href='/';}
      catch(error){setStatus(error.message,'error');}
    });
    return session;
  }
  function pill(status) {
    const p=node('span','status-pill',String(status||'unknown').replace(/-/g,' '));
    if(status==='mapped')p.classList.add('good');
    else if(status==='needs-correction'||status==='admin-review')p.classList.add('warn');
    return p;
  }
  function submitCorrectionForm(submission,{admin=false,onDone=()=>{}}={}) {
    const details=node('details','review-block');
    const missing=submission.missingFields||[];
    details.open=admin||missing.length>0;
    const summary=node('summary','',admin?'Review / correct all nine required OCR fields':'Review your OCR field values');
    details.append(summary);
    if(missing.length)details.append(node('p','muted','Missing or unresolved: '+missing.map(field=>field.label).join(', ')+'. Enter exact values from the screenshot.'));
    const form=node('form','form-grid');
    const inputs={};
    for(const [key,labelText] of Object.entries(labels)){
      const label=node('label','',labelText);
      const input=node('input');
      const original=String(submission.requiredValues?.[key]??'');
      input.name=key;
      input.autocomplete='off';
      input.value=original==='Not detected'?'':original;
      input.dataset.original=input.value;
      input.placeholder=missing.some(field=>field.key===key)?'Enter exact value shown in screenshot':'Current OCR value · change only if incorrect';
      if(key==='credits'||key==='freeXp'||key==='xp'||key==='damage')input.inputMode='numeric';
      label.append(input);form.append(label);inputs[key]=input;
    }
    const button=node('button','button secondary span-all', 'Save exact OCR corrections');
    button.type='submit';form.append(button);
    form.addEventListener('submit',async event=>{
      event.preventDefault();button.disabled=true;
      const values={};
      for(const [key,input] of Object.entries(inputs)){
        const next=input.value.trim();
        if(next!==input.dataset.original)values[key]=next;
      }
      if(!Object.keys(values).length){
        button.disabled=false;
        details.prepend(node('p','muted','No field values were changed.'));
        return;
      }
      try{
        const result=await api('/api/submissions/'+encodeURIComponent(submission.recordId)+'/corrections',{method:'POST',body:{values}});
        details.replaceChildren(node('p','form-success','Corrections saved. Status: '+result.status+'.'));
        if(result.invalidCorrections?.length)details.append(node('p','form-error',result.invalidCorrections.map(item=>item.label+': '+item.reason).join(' · ')));
        await onDone();
      }catch(error){button.disabled=false;details.prepend(node('p','form-error',error.message));}
    });
    details.append(form);return details;
  }
  function mappingForm(submission,{admin=false,roster=[],onDone=()=>{}}={}) {
    const block=node('div','review-block');
    block.append(node('h4','','Map this screenshot to a tournament game'));
    const form=node('form','form-grid');
    const addSelect=(name,title,items,required=true)=>{
      const label=node('label','',title),select=node('select');select.name=name;select.required=required;
      for(const [value,text] of items){const option=node('option','',text);option.value=value;select.append(option);}
      label.append(select);form.append(label);return select;
    };
    const addInput=(name,title,type='number',required=true,placeholder='')=>{
      const label=node('label','',title),input=node('input');input.name=name;input.type=type;input.required=required;
      if(type==='number'){input.min='0';input.step='1';}
      if(placeholder)input.placeholder=placeholder;
      label.append(input);form.append(label);return input;
    };
    if(admin)addSelect('playerId','Roster player',[['','Select roster player…'],...roster.map(p=>[String(p.id),'#'+p.id+' · '+p.name])]);
    const eventSelect=addSelect('event','Event',[['','Select event…'],['damage','Damage'],['kills','Kills'],['race','Race'],['grand','Grand Yolo']]);
    addInput('gameNumber','Game number','number',true,'1–7');
    addSelect('shipClass','Ship class',[['','Select class…'],['DD','DD'],['CA','CA'],['BB','BB']]);
    addInput('tier','Ship tier','number',true,'1–11');
    const metricArea=node('div','form-grid span-all');
    const addMetric=(name,title,required=false)=>{
      const label=node('label','',title),input=node('input');input.name=name;input.type='number';input.min='0';input.step='1';input.required=required;
      label.append(input);metricArea.append(label);
    };
    const timeLabel=node('label','', 'Race time (seconds)'),timeInput=node('input');
    timeInput.name='time';timeInput.type='number';timeInput.min='0.01';timeInput.step='0.01';timeInput.required=false;
    timeLabel.append(timeInput);metricArea.append(timeLabel);
    const killsLabel=node('label','', 'Kills override (only when ribbon count is missing)'),killsInput=node('input');
    killsInput.name='kills';killsInput.type='number';killsInput.min='0';killsInput.step='1';
    killsLabel.append(killsInput);metricArea.append(killsLabel);
    form.append(metricArea);
    const button=node('button','button primary span-all','Confirm mapping and save score');button.type='submit';form.append(button);
    const updateRequired=()=>{
      const event=eventSelect.value;
      timeInput.required=event==='race'||event==='grand';
      killsInput.required=(event==='kills'||event==='grand')&&submission.metrics?.kills==null;
      timeLabel.classList.toggle('hidden',!(event==='race'||event==='grand'));
      killsLabel.classList.toggle('hidden',!(event==='kills'||event==='grand'));
    };
    eventSelect.addEventListener('change',updateRequired);updateRequired();
    form.addEventListener('submit',async event=>{
      event.preventDefault();button.disabled=true;
      const data=Object.fromEntries(new FormData(form).entries());
      for(const key of ['playerId','gameNumber','tier','kills'])if(data[key]!==undefined&&data[key]!=='')data[key]=Number(data[key]);
      try{
        const result=await api('/api/submissions/'+encodeURIComponent(submission.recordId)+'/mapping',{method:'POST',body:data});
        block.replaceChildren(node('p','form-success','Saved '+result.player.name+' · '+eventLabel(result.event)+' game '+result.gameNumber+'.'));
        await onDone();
      }catch(error){button.disabled=false;block.prepend(node('p','form-error',error.message));}
    });
    block.append(form);return block;
  }
  function renderSubmission(submission,options={}) {
    const card=node('article','submission-card');
    const head=node('div','submission-head'),left=node('div');
    left.append(node('h3','',submission.sourceFile||submission.recordId));
    left.append(node('p','submission-meta','ID '+submission.recordId+' · '+date(submission.capturedAt)));
    head.append(left,pill(submission.status));card.append(head);
    const cells=node('div','submission-summary');
    const values=[
      ['Player',submission.playerName],['Result',submission.result],['Map',submission.map],
      ['Mode',submission.mode],['Damage',submission.metrics?.damage??'—'],['XP',submission.rewards?.xp??'—'],
    ];
    for(const [label,value] of values){const cell=node('div','summary-cell');cell.append(node('span','',label),node('strong','',value));cells.append(cell);}
    card.append(cells);
    if(submission.status!=='mapped')card.append(submitCorrectionForm(submission,options));
    if(!submission.missingFields?.length&&submission.status!=='mapped'&&(options.admin||submission.status==='awaiting-mapping'))card.append(mappingForm(submission,options));
    if(submission.status==='admin-review')card.append(node('p','form-error','Player identity or record mapping requires administrator review.'));
    if(submission.sourceEvidence?.sha256){
      card.append(node('p','submission-meta','SHA-256 '+submission.sourceEvidence.sha256));
    }
    return card;
  }
  window.DWDesktop={api,initSession,setStatus,$,node,number,money,date,eventLabel,renderSubmission};
})();