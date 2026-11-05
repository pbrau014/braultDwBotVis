'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {downloadImage,readBoundedResponseBody}=require('../src/attachment-download');
function streamFrom(chunks,onCancel=()=>{}){let i=0;return new ReadableStream({pull(c){if(i<chunks.length)c.enqueue(Uint8Array.from(chunks[i++]));else c.close();},cancel(reason){onCancel(reason);}});}
test('image downloader reads a response incrementally and accepts the exact byte limit',async()=>{
 const response=new Response(streamFrom([[1,2],[3,4]]),{status:200});
 const buffer=await downloadImage({url:'https://synthetic.invalid/image.png',size:4},{maxBytes:4,fetchImpl:async()=>response});
 assert.deepEqual([...buffer],[1,2,3,4]);
});
test('image downloader cancels an oversized stream before retaining excess bytes',async()=>{
 let cancelled=false;const response=new Response(streamFrom([[1,2,3],[4,5],[6]],()=>{cancelled=true;}),{status:200});
 await assert.rejects(downloadImage({url:'https://synthetic.invalid/large.png',size:0},{maxBytes:4,fetchImpl:async()=>response}),/Image is too large/);
 assert.equal(cancelled,true);
});
test('image downloader rejects declared oversized attachments before making a request',async()=>{
 let requested=false;
 await assert.rejects(downloadImage({url:'https://synthetic.invalid/large.png',size:5},{maxBytes:4,fetchImpl:async()=>{requested=true;throw new Error('unexpected request');}}),/Image is too large/);
 assert.equal(requested,false);
});
test('bounded response reader rejects missing bodies and invalid limits',async()=>{
 await assert.rejects(readBoundedResponseBody(null,4),/readable response body/);
 await assert.rejects(readBoundedResponseBody(streamFrom([[1]]),0),/positive safe integer/);
});
