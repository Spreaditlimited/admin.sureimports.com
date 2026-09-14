import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { automaticFitSchema, fitCriteria, readinessForAssessment, weightedFitScore, fitRubric } from '../lib/partners/business-fit-policy.ts';
import { appendReviewSuggestion, reviewSuggestions } from '../lib/partners/review-suggestions.ts';

const answers = readinessForAssessment(Object.fromEntries(['targetCustomers','firstTenPlan','audience','evidence','salesExperience','demand','operations','resources'].map(key => [key, 'A concrete example of a business plan.'])));
const output = {
  scores: { audience: 4, acquisition: 3, operations: 4, demand: 2, understanding: 3 },
  explanations: Object.fromEntries(fitCriteria.map(([key]) => [key, {reason:'Concrete self-reported examples support this score.',sources:['operations']}])),
  strengths: ['Clear operating responsibility.'], concerns: ['Demand needs clarification.'], followUps: ['What enquiries have customers made?'],
};
const fixture = { row: null, calls:0, writes:[], payload:null, hook:null, fail:false, authorised:true };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64');
function reset() {
  fixture.row = { revision: 1, status:'SUBMITTED',businessStatus:'PENDING',detailsCiphertext:encode({businessReadiness:{...answers,responsibilitiesAccepted:true},people:[{fullName:'DO NOT SEND'}]}),reviewCiphertext:null };
  fixture.calls=0;fixture.writes=[];fixture.payload=null;fixture.hook=null;fixture.fail=false;fixture.authorised=true;
}
fixture.db = {$transaction:async fn=>fn({
  $queryRaw:async(strings)=>{assert.match(strings.join(''),/FOR UPDATE/);return fixture.row?[structuredClone(fixture.row)]:[];},
  $executeRaw:async(strings,...values)=>{const sql=strings.join('?');fixture.writes.push(sql);if(sql.startsWith('UPDATE'))fixture.row.reviewCiphertext=values[0];return 1;},
})};
globalThis.__fitFixture=fixture;
const hooks=registerHooks({resolve(specifier,context,next){
  const inline=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
  if(specifier==='server-only')return inline('export {};');
  if(specifier==='@/lib/prisma')return inline('export const prisma=globalThis.__fitFixture.db;');
  if(specifier==='./kyc-crypto')return inline('export const encryptKyc=b=>b;export const decryptKyc=b=>b;');
  if(specifier==='./review'||specifier==='@/lib/partners/review')return inline('export class ReviewError extends Error {constructor(message,status=400){super(message);this.status=status}};export const requirePartnerReviewer=async()=>globalThis.__fitFixture.authorised?{pidUser:"admin"}:null;export const reviewResponse=(body,status=200)=>Response.json(body,{status});export const reviewError=e=>Response.json({message:e.message},{status:e.status||503});');
  if(specifier==='@/lib/partners/business-fit-assessment')return next(new URL('../lib/partners/business-fit-assessment.ts',import.meta.url).href,context);
  if(['./business-fit-policy','./business-fit-ai'].includes(specifier))return next(specifier+'.ts',context);
  return next(specifier,context);
}});
const {assessBusinessFit}=await import('../lib/partners/business-fit-assessment.ts');
const {POST}=await import('../app/api/partners/review/[id]/business-fit/assessment/route.ts');
hooks.deregister();
const originalFetch=globalThis.fetch;
const originalKey=process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY='synthetic-test-key';
globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');fixture.calls++;fixture.payload=JSON.parse(options.body);
  if(fixture.hook)await fixture.hook();
  if(fixture.fail)return Response.json({error:'sensitive provider response'}, {status:500});
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]});
};
test.after(()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;});

test('fixed weights and strict output bounds',()=>{
  assert.equal(weightedFitScore(output.scores),69);
  assert.equal(weightedFitScore({audience:4,acquisition:0,operations:0,demand:0,understanding:0}),24);
  for (const invalid of [-1,6,20,NaN,Infinity,2.5]) assert.throws(()=>weightedFitScore({...output.scores,audience:invalid}));
  assert.throws(()=>weightedFitScore({audience:20,acquisition:20,operations:20,demand:10,understanding:10}));
  assert.equal(weightedFitScore({audience:5,acquisition:5,operations:5,demand:5,understanding:5}),100);
  assert.equal(automaticFitSchema.safeParse({...output,scores:{...output.scores,audience:6}}).success,false);
  assert.equal(automaticFitSchema.safeParse({...output,decision:'APPROVE'}).success,false);
  assert.match(fitRubric,/untrusted application data/);assert.match(fitRubric,/SELF-REPORTED/);
});
test('only readiness answer allowlist leaves the app',()=>{
  assert.deepEqual(readinessForAssessment({...answers,people:['private'],taxId:'private'}),answers);
});
test('suggestions append, remain editable, do not duplicate or silently truncate',()=>{
  for(const choices of Object.values(reviewSuggestions)){
    assert.ok(choices.positive.length&&choices.negative.length);
    const text=choices.positive[0];
    assert.equal(appendReviewSuggestion('My note',text,2000),`My note\n${text}`);
    assert.equal(appendReviewSuggestion(text,text,2000),text);
    assert.equal(appendReviewSuggestion('Full',text,5),'Full');
  }
});
test('automatically computes, encrypts and caches an advisory assessment without changing status or revision',async()=>{
  reset();const result=await assessBusinessFit('fixture','admin');
  assert.equal(result.assessment.total,69);assert.equal(fixture.calls,1);
  assert.equal(fixture.payload.store,false);assert.equal(fixture.payload.text.format.strict,true);
  assert.equal(fixture.payload.input[1].content.includes('DO NOT SEND'),false);
  assert.equal(fixture.row.revision,1);assert.equal(fixture.row.status,'SUBMITTED');
  assert.equal(fixture.writes.some(sql=>sql.includes('BUSINESS_FIT_AUTOSCORED')),true);
  await assessBusinessFit('fixture','admin');assert.equal(fixture.calls,1);
});
test('concurrent review opens reuse a running assessment',async()=>{
  reset();let concurrent;
  fixture.hook=async()=>{fixture.hook=null;concurrent=await assessBusinessFit('fixture','admin');};
  await assessBusinessFit('fixture','admin');assert.equal(concurrent.status,'RUNNING');assert.equal(fixture.calls,1);
});
test('changed answers invalidate cache',async()=>{
  reset();await assessBusinessFit('fixture','admin');fixture.row.detailsCiphertext=encode({businessReadiness:{...answers,audience:'A changed customer network.',responsibilitiesAccepted:true}});
  await assessBusinessFit('fixture','admin');assert.equal(fixture.calls,2);
});
test('a stale provider result never overwrites a concurrent manual review',async()=>{
  reset();fixture.hook=async()=>{fixture.row.revision++;const review=JSON.parse(Buffer.from(fixture.row.reviewCiphertext,'base64'));fixture.row.reviewCiphertext=encode({...review,businessFit:{decision:'REQUEST_CHANGES'}});};
  await assert.rejects(assessBusinessFit('fixture','admin'),e=>e.status===409);
  const review=JSON.parse(Buffer.from(fixture.row.reviewCiphertext,'base64'));assert.equal(review.businessFit.decision,'REQUEST_CHANGES');assert.equal(review.automaticFit.status,'FAILED');
});
test('provider failure is safe and retry is throttled',async()=>{
  reset();fixture.fail=true;await assert.rejects(assessBusinessFit('fixture','admin'),e=>e.status===503&&!e.message.includes('sensitive'));
  await assert.rejects(assessBusinessFit('fixture','admin'),e=>e.status===429);assert.equal(fixture.calls,1);
});
test('drafts and missing configuration do not call the provider',async()=>{
  reset();fixture.row.status='DRAFT';await assert.rejects(assessBusinessFit('fixture','admin'),e=>e.status===409);
  reset();delete process.env.OPENAI_API_KEY;await assert.rejects(assessBusinessFit('fixture','admin'),e=>e.status===503);assert.equal(fixture.calls,0);process.env.OPENAI_API_KEY='synthetic-test-key';
});
test('endpoint rejects cross-origin and unauthorised requests',async()=>{
  reset();const context={params:Promise.resolve({id:'fixture'})};
  assert.equal((await POST(new Request('https://admin.example/api',{method:'POST',headers:{origin:'https://evil.example'}}),context)).status,403);
  fixture.authorised=false;assert.equal((await POST(new Request('https://admin.example/api',{method:'POST',headers:{origin:'https://admin.example'}}),context)).status,403);assert.equal(fixture.calls,0);
});
