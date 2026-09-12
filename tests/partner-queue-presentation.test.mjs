import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationStage,filterApplications} from '../lib/partners/queue-presentation.ts';
const base={id:'1',legalName:'Example Business',registrationNumber:'RC123456',businessStatus:'PENDING',status:'SUBMITTED',submittedAt:null,revision:1};
test('queue labels business-fit approval without mislabelling it final approval',()=>{
 assert.equal(applicationStage(base).label,'Needs business-fit review');
 assert.equal(applicationStage({...base,businessFitDecision:'PILOT_APPROVED'}).label,'Needs business verification');
 assert.equal(applicationStage({...base,businessFitDecision:'PILOT_APPROVED',status:'VERIFIED'}).label,'Awaiting Agreement Acceptance by Business');
 assert.equal(applicationStage({...base,businessStatus:'ACTIVE'}).complete,3);
 assert.equal(applicationStage({...base,status:'DRAFT'}).group,'corrections');
 assert.equal(applicationStage({...base,status:'REJECTED'}).group,'decided');
});
test('queue search is case-insensitive and combines with the selected page filter',()=>{
 const rows=[base,{...base,id:'2',legalName:'Another Shop',businessStatus:'ACTIVE'}];
 assert.equal(filterApplications(rows,'rc123','all').length,2);
 assert.equal(filterApplications(rows,'example','review').length,1);
 assert.equal(filterApplications(rows,'example','approved').length,0);
 assert.equal(filterApplications(rows,'','approved')[0].id,'2');
});
