'use strict';
const DEFAULT_MAX_IMAGE_BYTES = 25 * 1024 * 1024;
function formatMegabytes(bytes) { return (bytes / (1024 * 1024)).toFixed(1); }
function tooLargeError(maxBytes) { return new Error(`Image is too large. Maximum allowed size is ${formatMegabytes(maxBytes)} MB.`); }
async function readBoundedResponseBody(body, maxBytes) {
  if (!body || typeof body.getReader !== 'function') throw new Error('The image download did not provide a readable response body.');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('Maximum image size must be a positive safe integer.');
  const reader=body.getReader(),chunks=[];let total=0;
  try {
    while(true){
      const {done,value}=await reader.read();if(done)break;
      const chunk=Buffer.from(value);total+=chunk.length;
      if(total>maxBytes){try{await reader.cancel();}catch{}throw tooLargeError(maxBytes);}
      chunks.push(chunk);
    }
  }catch(error){try{await reader.cancel(error);}catch{}throw error;}
  finally{try{reader.releaseLock();}catch{}}
  return Buffer.concat(chunks,total);
}
async function downloadImage(attachment,options={}) {
  const maxBytes=options.maxBytes??DEFAULT_MAX_IMAGE_BYTES,fetchImpl=options.fetchImpl??globalThis.fetch,timeoutMs=options.timeoutMs??30_000;
  if(!attachment||!attachment.url)throw new TypeError('An image attachment URL is required.');
  if(typeof fetchImpl!=='function')throw new TypeError('A fetch implementation is required.');
  if(attachment.size&&attachment.size>maxBytes)throw tooLargeError(maxBytes);
  const response=await fetchImpl(attachment.url,{signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok){try{await response.body?.cancel?.();}catch{}throw new Error(`Could not download the image (HTTP ${response.status}).`);}
  const declaredLength=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(declaredLength)&&declaredLength>maxBytes){try{await response.body?.cancel?.();}catch{}throw tooLargeError(maxBytes);}
  const buffer=await readBoundedResponseBody(response.body,maxBytes);
  if(buffer.length===0)throw new Error('The downloaded image was empty.');
  return buffer;
}
module.exports={DEFAULT_MAX_IMAGE_BYTES,readBoundedResponseBody,downloadImage};
