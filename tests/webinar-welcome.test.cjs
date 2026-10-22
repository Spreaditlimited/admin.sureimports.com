const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(path,deps={}){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',js)(n=>deps[n]||require(n),m,m.exports);return m.exports;}
const copy=load('lib/webinar/content.ts');
const renderer=load('lib/marketing/content.ts',{'../email/temp/mailTemplate2':load('lib/email/temp/mailTemplate2.ts')});
fs.mkdirSync('/private/tmp/webinar-email-previews',{recursive:true});
for(const account of [true,false])for(const watched of [true,false]){
 const content=copy.webinarWelcome(account,watched,!account);
 const out=renderer.renderMarketingEmail({...content,bodyTitle:content.title,firstName:'Alex',includeManagedUnsubscribe:!account,unsubscribeUrl:'https://www.sureimports.com/email-preferences'});
 assert.ok(out.html.includes('href="https://apps.apple.com/app/id507097717"'));
 assert.ok(out.html.includes('href="https://play.google.com/store/apps/details?id=com.alibaba.wireless"'));
 assert.ok(out.html.includes('Hi Alex'));
 assert.equal(out.html.includes('Unsubscribe from these emails'),!account);
 assert.ok(out.text.includes('Google Chrome'));
 fs.writeFileSync(`/private/tmp/webinar-email-previews/${account?'account':'insights'}-${watched?'watched':'unwatched'}.html`,out.html);
}
assert.ok(!renderer.marketingTextToHtml('<script>alert(1)</script>').includes('<script>'));
let state='PENDING',history=null;
const db={marketing_deliveries:{findFirst:async()=>history},$executeRaw:async(strings,...values)=>{const sql=strings.join('?');if(sql.includes("SET welcomeStatus = 'SENT'")){if(state==='PENDING')state='SENT';return 1;}if(sql.includes("SET welcomeStatus = 'SENDING'")){if(state!=='PENDING')return 0;state='SENDING';return 1;}return 0;}};
const delivery=load('lib/webinar/delivery.ts',{'@/lib/prisma':{prisma:db},'@/lib/email/config/nodemailerConfig':{},'@/lib/marketing/content':renderer,'@/lib/marketing/preferences':{},'@/lib/marketing/brevoConsent':{},'./content':copy});
(async()=>{const results=await Promise.all([delivery.claimWelcome('test@example.com'),delivery.claimWelcome('test@example.com')]);assert.equal(results.filter(Boolean).length,1,'Only one overlapping sender can claim');state='SENT';assert.equal(await delivery.claimWelcome('test@example.com'),false);state='REVIEW_REQUIRED';assert.equal(await delivery.claimWelcome('test@example.com'),false);state='PENDING';history={sentAt:new Date()};assert.equal(await delivery.claimWelcome('test@example.com'),false);assert.equal(state,'SENT');console.log('Passed: four rendered emails, clickable links, personalization, unsubscribe separation, HTML escaping, concurrent claims, prior sends and uncertain delivery suppression.');})().catch(e=>{console.error(e);process.exitCode=1});
