import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript'),sharp=require('sharp');
test('generated source cannot intrude into report typography zones',async()=>{
 const input=await sharp({create:{width:1536,height:1024,channels:3,background:'#ffffff'}}).png().toBuffer();
 const exports={};const src=readFileSync(new URL('../lib/intelligence/reportCover.ts',import.meta.url),'utf8')+'\nexport {generateCoverBuffer};';
 vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:id=>id.startsWith('@/')?{}:require(id),process:{env:{OPENAI_API_KEY:'synthetic'}},Buffer,AbortSignal,fetch:async(url,options)=>{assert.equal(JSON.parse(options.body).size,'1536x1024');return Response.json({data:[{b64_json:input.toString('base64')}]});}});
 const buffer=await exports.generateCoverBuffer({name:'Scrubs',suppliers:[{productsMade:['scrub tops']}]});const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1024);assert.equal(info.height,1536);
 for(const y of [0,100,644,1260,1535])for(const x of [0,100,512,1023])assert.deepEqual([...data.subarray((y*1024+x)*3,(y*1024+x)*3+3)],[7,20,38]);
 assert.deepEqual([...data.subarray((850*1024+512)*3,(850*1024+512)*3+3)],[255,255,255]);
});
