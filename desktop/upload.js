'use strict';
(async()=>{
  const D=window.DWDesktop,status=D.setStatus;
  let file=null,previewUrl=null;
  try{
    const session=await D.initSession();
    if(session.role==='unlinked'){status('Ask a tournament admin to link this Discord account before submitting screenshots.','error');D.$('browse-button').disabled=true;return;}
  }catch(error){status(error.message,'error');if(error.status===401)location.href='/';return;}
  const input=D.$('image-file'),zone=D.$('drop-zone'),preview=D.$('preview-panel'),image=D.$('image-preview');
  const result=D.$('upload-result'),progress=D.$('upload-progress');
  function clearFile(){
    file=null;input.value='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;
    image.removeAttribute('src');preview.classList.add('hidden');zone.classList.remove('hidden');result.classList.add('hidden');
  }
  function choose(next){
    if(!next)return;
    const allowed=['image/png','image/jpeg','image/webp','image/bmp','image/tiff'];
    const ext=(next.name.split('.').pop()||'').toLowerCase();
    if(!allowed.includes(next.type)&&!['png','jpg','jpeg','webp','bmp','tif','tiff'].includes(ext)){status('Choose a PNG, JPG, WEBP, BMP or TIFF screenshot.','error');return;}
    if(next.size>10*1024*1024){status('The maximum upload size is 10 MB.','error');return;}
    if(next.size===0){status('The selected file is empty.','error');return;}
    file=next;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(next);
    image.src=previewUrl;D.$('file-name').textContent=next.name;
    D.$('file-meta').textContent=(next.size/1024/1024).toFixed(2)+' MB · '+(next.type||'image type detected by server');
    zone.classList.add('hidden');preview.classList.remove('hidden');result.classList.add('hidden');
    status('Image selected. Review the preview before submitting.','success');
  }
  D.$('browse-button').addEventListener('click',()=>input.click());
  zone.addEventListener('click',e=>{if(e.target.id!=='browse-button')input.click();});
  zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}});
  input.addEventListener('change',()=>choose(input.files?.[0]));
  for(const name of ['dragenter','dragover'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.add('dragover');});
  for(const name of ['dragleave','drop'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.remove('dragover');});
  zone.addEventListener('drop',e=>choose(e.dataTransfer?.files?.[0]));
  D.$('remove-file').addEventListener('click',clearFile);
  D.$('upload-button').addEventListener('click',()=>{
    if(!file)return;
    const button=D.$('upload-button');button.disabled=true;progress.classList.remove('hidden');
    result.classList.add('hidden');D.$('progress-label').textContent='Uploading screenshot…';
    D.$('progress-detail').textContent='The image is sent to the local Node bot service and enters the shared OCR queue.';
    const xhr=new XMLHttpRequest();xhr.open('POST','/api/upload');xhr.withCredentials=true;
    const csrfToken=D.csrfToken();
    if(!csrfToken){button.disabled=false;progress.classList.add('hidden');status('Your local session expired. Refresh and sign in again.','error');return;}
    xhr.setRequestHeader('X-CSRF-Token',csrfToken);
    xhr.setRequestHeader('X-File-Name',file.name);
    if(file.type)xhr.setRequestHeader('X-File-Content-Type',file.type);
    xhr.upload.addEventListener('progress',e=>{
      if(e.lengthComputable){const percent=Math.round(e.loaded/e.total*100);D.$('progress-percent').textContent=percent+'%';D.$('progress-bar').style.width=percent+'%';}
    });
    xhr.addEventListener('load',()=>{
      button.disabled=false;progress.classList.add('hidden');
      let data={};try{data=JSON.parse(xhr.responseText);}catch{}
      result.className='notice '+(xhr.status>=200&&xhr.status<300?'info':'warning');result.classList.remove('hidden');
      result.replaceChildren(D.node('h2','',xhr.status>=200&&xhr.status<300?'Screenshot accepted':'Upload rejected'));
      result.append(D.node('p','',data.message||('Status: '+(data.status||xhr.status))));
      if(data.submissionId)result.append(D.node('p','muted','Record ID: '+data.submissionId));
      if(data.missingFields?.length)result.append(D.node('p','',data.missingFields.length+' mandatory field(s) need exact confirmation. Open the Player page to review the correction prompts.'));
      if(data.status==='admin-review')result.append(D.node('p','', 'OCR identity does not match the linked player automatically. An administrator must review this record.'));
      if(xhr.status>=200&&xhr.status<300){D.$('progress-label').textContent='Screenshot accepted into the OCR pipeline';status('The local OCR service accepted the image.','success');}
      else status(data.message||data.error||'Upload failed.','error');
    });
    xhr.addEventListener('error',()=>{button.disabled=false;progress.classList.add('hidden');status('Could not reach the local bot service. Check that the bot is running.','error');});
    xhr.addEventListener('abort',()=>{button.disabled=false;progress.classList.add('hidden');status('Upload cancelled.','error');});
    xhr.send(file);
  });
  window.addEventListener('beforeunload',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);});
})();