import SupplierVerificationAdmin from "./components/SupplierVerificationAdmin";
import { prisma } from "@/lib/prisma";

const GUANGZHOU_OFFICE_ADDRESS = "广州市白云区机场路111号建发广场3FB3-1";

export const dynamic = "force-dynamic";

export default async function SupplierVerificationAdminPage() {
  const [settings, requests, exchangeRate] = await Promise.all([
    prisma.supplier_verification_settings.upsert({
      where: { settingKey: "supplier_verification" },
      update: {},
      create: {
        settingKey: "supplier_verification",
        feeNgnKobo: 40_000_000,
        feeUsdCents: 25_000,
        officeAddressChinese: GUANGZHOU_OFFICE_ADDRESS,
        officeLatitude: 23.168905,
        officeLongitude: 113.259741,
      },
    }),
    prisma.verify_supplier.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 5 },
        events: { orderBy: { createdAt: "desc" }, take: 30 },
      },
      take: 250,
    }),
    prisma.exchange_rate.findUnique({ where: { id: 1 } }),
  ]);
  const initialSettings = {
    feeNaira: settings.feeNgnKobo / 100,
    feeUsd: settings.feeUsdCents / 100,
    officeAddressChinese:
      settings.officeAddressChinese || GUANGZHOU_OFFICE_ADDRESS,
    officeLatitude:
      settings.officeLatitude == null ? "" : String(settings.officeLatitude),
    officeLongitude:
      settings.officeLongitude == null ? "" : String(settings.officeLongitude),
    onlineEnabled: settings.onlineEnabled,
    physicalEnabled: settings.physicalEnabled,
    quoteValidityDays: settings.quoteValidityDays,
    onlineTurnaroundDays: settings.onlineTurnaroundDays,
    physicalTurnaroundDays: settings.physicalTurnaroundDays,
    defaultLodgingCny: settings.defaultLodgingCnyFen / 100,
    travelContingencyPercent: settings.travelContingencyPercent,
  };
  const initialRequests = requests.map((item) => ({
    ...item,
    supplierLatitude:
      item.supplierLatitude == null ? null : Number(item.supplierLatitude),
    supplierLongitude:
      item.supplierLongitude == null ? null : Number(item.supplierLongitude),
    createdAt: item.createdAt?.toISOString() || null,
    updatedAt: item.updatedAt?.toISOString() || null,
    quoteExpiresAt: item.quoteExpiresAt?.toISOString() || null,
    submittedAt: item.submittedAt?.toISOString() || null,
    completedAt: item.completedAt?.toISOString() || null,
    payments: item.payments.map((payment) => ({
      ...payment,
      paidAt: payment.paidAt?.toISOString() || null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
    events: item.events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  }));
  return (
    <SupplierVerificationAdmin
      initialSettings={initialSettings}
      initialRequests={initialRequests}
      exchangeRates={{
        ngnPerCny: Number(exchangeRate?.exNairaToYuan || 0),
        cnyPerUsd: Number(exchangeRate?.exYuanToDollar || 0),
      }}
    />
  );
}
