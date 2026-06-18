
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup
import { getShippingOnlyStatusVariantsForFilter } from '@/lib/shippingOnlyStatus';
import { encodeShippingOnlyLinkedRequestId } from '@/lib/invoiceLinkedService';

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status') as any;
  const statusVariants = getShippingOnlyStatusVariantsForFilter(status);

  const orderALL = await prisma.shipping_only.findMany({
    where: statusVariants.length > 0 ? { status: { in: statusVariants } } : { status: status }, // Filter by selected stage with legacy aliases
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      pidShippingOnly: true,
      pidUser: true,
      whatsappNumber: true,
      shippingName: true,
      shippingTo: true,
      grossWeight: true,
      trackingNumber: true,
      shippingPlan: true,
      expectedShipments: true,
      wantProductVerification: true,
      wantConsolidation: true,
      multipleSuppliers: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  const shippingToValues = Array.from(
    new Set(orderALL.map((row) => String(row.shippingTo || '').trim()).filter(Boolean)),
  );
  const shippingPlanValues = Array.from(
    new Set(orderALL.map((row) => String(row.shippingPlan || '').trim()).filter(Boolean)),
  );
  const linkedRequestIds = orderALL.map((row) => encodeShippingOnlyLinkedRequestId(row.pidShippingOnly));

  const [countriesByPid, countriesBySlug, countriesByName, plansByPid, plansBySlug, plansByName, linkedInvoices] =
    await Promise.all([
      prisma.country.findMany({
        where: { pidCountry: { in: shippingToValues } },
        select: { pidCountry: true, countryName: true },
      }),
      prisma.country.findMany({
        where: { countrySlug: { in: shippingToValues } },
        select: { countrySlug: true, countryName: true },
      }),
      prisma.country.findMany({
        where: { countryName: { in: shippingToValues } },
        select: { countryName: true },
      }),
      prisma.shippingplan.findMany({
        where: { pidShippingPlan: { in: shippingPlanValues } },
        select: { pidShippingPlan: true, shippingPlanName: true },
      }),
      prisma.shippingplan.findMany({
        where: { shippingPlanSlug: { in: shippingPlanValues } },
        select: { shippingPlanSlug: true, shippingPlanName: true },
      }),
      prisma.shippingplan.findMany({
        where: { shippingPlanName: { in: shippingPlanValues } },
        select: { shippingPlanName: true },
      }),
      prisma.invoices.findMany({
        where: { linkedRequestId: { in: linkedRequestIds } },
        select: {
          pidInvoice: true,
          invoiceNumber: true,
          linkedRequestId: true,
          status: true,
          balanceDue: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  const countryMap = new Map<string, string>();
  countriesByPid.forEach((item) => {
    if (item.pidCountry && item.countryName) countryMap.set(item.pidCountry, item.countryName);
  });
  countriesBySlug.forEach((item) => {
    if (item.countrySlug && item.countryName) countryMap.set(item.countrySlug, item.countryName);
  });
  countriesByName.forEach((item) => {
    if (item.countryName) countryMap.set(item.countryName, item.countryName);
  });

  const planMap = new Map<string, string>();
  plansByPid.forEach((item) => {
    if (item.pidShippingPlan && item.shippingPlanName) {
      planMap.set(item.pidShippingPlan, item.shippingPlanName);
    }
  });
  plansBySlug.forEach((item) => {
    if (item.shippingPlanSlug && item.shippingPlanName) {
      planMap.set(item.shippingPlanSlug, item.shippingPlanName);
    }
  });
  plansByName.forEach((item) => {
    if (item.shippingPlanName) {
      planMap.set(item.shippingPlanName, item.shippingPlanName);
    }
  });

  const invoiceMap = new Map<string, (typeof linkedInvoices)[number]>();
  linkedInvoices.forEach((invoice) => {
    if (invoice.linkedRequestId && !invoiceMap.has(invoice.linkedRequestId)) {
      invoiceMap.set(invoice.linkedRequestId, invoice);
    }
  });

  const result = orderALL.map((row) => ({
    ...row,
    shippingToName: row.shippingTo ? countryMap.get(row.shippingTo) || row.shippingTo : row.shippingTo,
    shippingPlanName: row.shippingPlan ? planMap.get(row.shippingPlan) || row.shippingPlan : row.shippingPlan,
    invoice: invoiceMap.get(encodeShippingOnlyLinkedRequestId(row.pidShippingOnly)) || null,
  }));

  return NextResponse.json(result);
}
