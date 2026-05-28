const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function one(sql){
  const rows = await prisma.$queryRawUnsafe(sql);
  return rows[0];
}

(async()=>{
  const ordersCount = await one("SELECT COUNT(*) AS c FROM orders");
  const distinctProductOrders = await one("SELECT COUNT(DISTINCT pidOrder) AS c FROM products WHERE pidOrder IS NOT NULL AND pidOrder <> ''");
  const distinctBankOrders = await one("SELECT COUNT(DISTINCT pidOrder) AS c FROM bank_payment WHERE pidOrder IS NOT NULL AND pidOrder <> ''");
  const distinctStoreSalesGroups = await one("SELECT COUNT(DISTINCT COALESCE(NULLIF(ext1,''), pidStore)) AS c FROM store_sales");

  const orphanProducts = await one("SELECT COUNT(DISTINCT p.pidOrder) AS c FROM products p LEFT JOIN orders o ON o.pidOrder = p.pidOrder WHERE p.pidOrder IS NOT NULL AND p.pidOrder <> '' AND o.pidOrder IS NULL");
  const sampleOrphans = await prisma.$queryRawUnsafe("SELECT p.pidOrder, COUNT(*) AS productRows, MIN(p.createdAt) AS firstSeen, MAX(p.createdAt) AS lastSeen FROM products p LEFT JOIN orders o ON o.pidOrder = p.pidOrder WHERE p.pidOrder IS NOT NULL AND p.pidOrder <> '' AND o.pidOrder IS NULL GROUP BY p.pidOrder ORDER BY lastSeen DESC LIMIT 30");

  const orphanBank = await one("SELECT COUNT(DISTINCT b.pidOrder) AS c FROM bank_payment b LEFT JOIN orders o ON o.pidOrder = b.pidOrder WHERE b.pidOrder IS NOT NULL AND b.pidOrder <> '' AND o.pidOrder IS NULL");
  const sampleBankOrphans = await prisma.$queryRawUnsafe("SELECT b.pidOrder, COUNT(*) AS bankRows, MIN(b.createdAt) AS firstSeen, MAX(b.createdAt) AS lastSeen FROM bank_payment b LEFT JOIN orders o ON o.pidOrder = b.pidOrder WHERE b.pidOrder IS NOT NULL AND b.pidOrder <> '' AND o.pidOrder IS NULL GROUP BY b.pidOrder ORDER BY lastSeen DESC LIMIT 30");

  console.log(JSON.stringify({
    ordersCount: Number(ordersCount.c),
    distinctPidOrderInProducts: Number(distinctProductOrders.c),
    distinctPidOrderInBankPayment: Number(distinctBankOrders.c),
    distinctOrderGroupInStoreSales: Number(distinctStoreSalesGroups.c),
    orphanPidOrdersFromProducts: Number(orphanProducts.c),
    orphanPidOrdersFromBankPayment: Number(orphanBank.c),
    sampleProductOrphanOrderIds: sampleOrphans,
    sampleBankOrphanOrderIds: sampleBankOrphans,
  }, null, 2));

  await prisma.$disconnect();
})().catch(async (e)=>{
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
