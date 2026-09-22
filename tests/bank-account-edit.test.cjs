const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
function load(file,mocks) {
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id in mocks?mocks[id]:require(id),URL,console,fetch:mocks.fetch});
 return exports;
}
const bank={pidBankAccount:'IBA_TEST',accountName:'Test business',accountNumber:'12345678',bankName:'Old bank',sortCode:'10-20-30',currency:'GBP',country:'United Kingdom',status:'ACTIVE'};
function api({allowed=true,exists=true}={}) {
 const writes=[];
 const result=load('app/api/invoicing/bank-accounts/route.ts',{
  '@/lib/prisma':{prisma:{$queryRaw:async()=>exists?[{pidBankAccount:bank.pidBankAccount}]:[],invoice_bank_accounts:{update:async({data})=>{writes.push(data);return {...bank,...data};},create:async({data})=>{writes.push(data);return data;}}}},
  '../_lib/invoicing':{generatePid:()=> 'IBA_NEW'},
  '@/app/api/_lib/adminAccess':{SYSTEM_SETTINGS_SERVICE_KEY:'SETTINGS',requireAdminServiceAccess:async()=>allowed?{ok:true,admin:{pidUser:'ADMIN_TEST'}}:{ok:false,response:{status:403}}},
  'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},
 });
 const request=(body,origin='https://admin.example.invalid')=>({url:'https://admin.example.invalid/api/invoicing/bank-accounts',headers:new Headers({origin}),method:'PATCH',json:async()=>body});
 return {result,writes,request};
}
test('edits existing bank without creating another account',async()=>{
 const f=api();const response=await f.result.PATCH(f.request({...bank,bankName:'Updated bank'}));
 assert.equal(response.status,200);assert.equal(f.writes.length,1);assert.equal(f.writes[0].bankName,'Updated bank');assert.equal(f.writes[0].updatedByPidUser,'ADMIN_TEST');
});
test('rejects empty bank fields and invalid currency',async()=>{
 for(const update of [{bankName:''},{accountName:''},{accountNumber:''},{currency:'POUNDS'}]){
  const f=api();const response=await f.result.PATCH(f.request({pidBankAccount:bank.pidBankAccount,...update}));
  assert.equal(response.status,400);assert.equal(f.writes.length,0);
 }
});
test('preserves status-only changes',async()=>{const f=api();assert.equal((await f.result.PATCH(f.request({pidBankAccount:bank.pidBankAccount,status:'INACTIVE'}))).status,200);assert.equal(f.writes[0].bankName,undefined);});
test('requires edit permission',async()=>{const f=api({allowed:false});assert.equal((await f.result.PATCH(f.request(bank))).status,403);assert.equal(f.writes.length,0);});
test('requires same origin',async()=>{const f=api();assert.equal((await f.result.PATCH(f.request(bank,'https://other.invalid'))).status,403);assert.equal(f.writes.length,0);});
test('reports removed accounts clearly',async()=>{const f=api({exists:false});assert.equal((await f.result.PATCH(f.request(bank))).status,404);assert.equal(f.writes.length,0);});
test('edit UI prefills, saves through PATCH, and returns to create mode',async()=>{
 const React=require('react');const states=[];let cursor=0;const calls=[];
 const component=load('app/(dashboard)/dashboard/invoicing/bank-accounts/page.tsx',{
  react:{...React,useState:initial=>{const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],value=>states[index]=typeof value==='function'?value(states[index]):value];},useEffect:()=>{},useRef:()=>({current:null})},
  sonner:{toast:{success(){},error(message){throw Error(message);}}},
  'lucide-react':new Proxy({}, {get:()=>()=>null}),
  fetch:async(_url,options={})=>{calls.push(options);return {ok:true,json:async()=>({data:options.method?[{...bank,...JSON.parse(options.body)}]:[bank]})};},
 }).default;
 function render(){cursor=0;return component();}
 function elements(node,tag){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(n=>elements(n,tag));return [...(node.type===tag?[node]:[]),...elements(node.props?.children,tag)];}
 function text(node){if(typeof node==='string')return node;if(Array.isArray(node))return node.map(text).join('');return node?.props?text(node.props.children):'';}
 render();states[3]=[bank];states[4]=false;
 let tree=render();elements(tree,'button').find(n=>text(n).includes('Edit account')).props.onClick();
 tree=render();assert.equal(elements(tree,'input').find(n=>n.props.value==='Old bank').props.value,'Old bank');
 elements(tree,'input').find(n=>n.props.value==='Old bank').props.onChange({target:{value:'New bank'}});
 tree=render();await elements(tree,'button').find(n=>text(n).includes('Save changes')).props.onClick();
 const patch=calls.find(call=>call.method==='PATCH');assert.ok(patch);assert.equal(JSON.parse(patch.body).pidBankAccount,bank.pidBankAccount);assert.equal(JSON.parse(patch.body).bankName,'New bank');assert.equal(states[0],null);
});
