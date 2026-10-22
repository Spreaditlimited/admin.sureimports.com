// Run with node --env-file=.env.local scripts/webinar/migrate.cjs --apply.
// Creates only the shared welcome ledger: no enrollment, backfill or email sending.
const fs = require('node:fs');
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async()=>{try {
 if(!process.argv.includes('--apply')) throw new Error('Pass --apply to create the webinar welcome ledger.');
 const sql=fs.readFileSync(require('node:path').join(__dirname,'schema.sql'),'utf8').trim();
 await db.$executeRawUnsafe(sql);
 console.log('Webinar welcome ledger ready. No customer records or deliveries changed.');
} finally {await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});
