import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname;
const require=createRequire(root+'package.json');
const ts=require('typescript');
const read=p=>fs.readFileSync(root+p,'utf8');
function load(file,deps={}){const exports={};new Function('exports','require',ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports,id=>deps[id]);return exports;}
const access=load('lib/accessControl.ts');
assert.deepEqual([...access.ALL_SERVICE_KEYS].sort(),access.ADMIN_SERVICE_OPTIONS.map(x=>x.key).sort());
assert.equal(new Set(access.ADMIN_SERVICE_OPTIONS.map(x=>x.key)).size,access.ALL_SERVICE_KEYS.length);
assert.equal(access.getRequiredServiceForPath('/dashboard/refunds'),'refunds');
assert.equal(access.getFirstAllowedDashboardRoute('L2',['refunds']),'/dashboard/refunds');
assert.equal(access.hasServiceAccess('refunds','L2',['refunds']),true);
assert.equal(access.hasServiceAccess('refunds','L2',['payout_requests']),false);
assert.equal(access.hasServiceAccess('payout_requests','L2',['refunds']),false);
for(const file of ['app/api/crud/admin/create/route.ts','app/api/crud/admin/permissions/route.ts'])assert.match(read(file),/new Set<string>\(ALL_SERVICE_KEYS\)/);
for(const file of ['app/(dashboard)/dashboard/admin/add/components/AdminForm.tsx','app/(dashboard)/dashboard/admin/view/components/AdminTable.tsx'])assert.match(read(file),/SERVICE_OPTIONS = ADMIN_SERVICE_OPTIONS/);
for(const file of ['app/api/refunds/route.ts','app/api/refunds/[pidRefund]/mark-paid/route.ts']){assert.match(read(file),/["']refunds["']/);assert.doesNotMatch(read(file),/["']payout_requests["']/);}
let granted=null;
const auth=load('app/api/_lib/adminAccess.ts',{
 'next/headers':{cookies:async()=>({get:()=>({value:'MOCK'})})},
 'next/server':{NextResponse:{json:(_,options)=>({status:options.status})}},
 '@/lib/jwt':{verifyToken:()=>({pidUser:'TEST_ONLY'})},
 '@/lib/prisma':{prisma:{admin:{findUnique:async()=>({pidUser:'TEST_ONLY',userStatus:'L2'})},admin_permissions:{findFirst:async args=>args.where.serviceKey.in.includes('refunds')?granted:null}}},
});
assert.equal((await auth.requireAdminServiceAccess('refunds','view')).response.status,403);
granted={canView:true,canEdit:false};
assert.equal((await auth.requireAdminServiceAccess('refunds','view')).ok,true);
assert.equal((await auth.requireAdminServiceAccess('refunds','edit')).response.status,403);
granted={canView:true,canEdit:true};
assert.equal((await auth.requireAdminServiceAccess('refunds','edit')).ok,true);
assert.equal((await auth.requireAdminServiceAccess('payout_requests','view')).response.status,403);
console.log('PASS: catalog parity, independent refund routing, forms/API registration, view/edit authorization and cross-feature denial. No database mutations.');
