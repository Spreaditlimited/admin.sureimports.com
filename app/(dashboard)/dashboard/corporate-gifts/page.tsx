import { prisma } from '@/lib/prisma';

export default async function CorporateGiftsAdminPage() {
  const sourceSiteUrl =
    process.env.SUREIMPORTS_SITE_URL || 'https://www.sureimports.com';

  const entries = await prisma.corporate_gift_request.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Corporate Gift Requests</h1>

      {entries.length === 0 ? (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          No corporate gift sourcing requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{entry.businessName}</h2>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <p><strong>Request ID:</strong> {entry.pidRequest}</p>
                <p><strong>Contact person:</strong> {entry.contactPersonFullName}</p>
                <p><strong>Email:</strong> {entry.contactEmail}</p>
                <p><strong>WhatsApp:</strong> {entry.whatsappNumber}</p>
                <p><strong>Product:</strong> {entry.productOrItemNeeded}</p>
                <p><strong>Quantity:</strong> {entry.quantityNeeded}</p>
                <p><strong>Quality:</strong> {entry.preferredQualityLevel}</p>
                <p><strong>Branding:</strong> {entry.brandingCustomizationRequired}</p>
                <p><strong>Expected delivery:</strong> {entry.expectedDeliveryDate}</p>
                <p><strong>Delivery location:</strong> {entry.finalDeliveryLocationNigeria}</p>
                <p><strong>Proceed timeline:</strong> {entry.proceedTimeline || 'Not provided'}</p>
                <p><strong>How they heard:</strong> {entry.hearAboutSureImports || 'Not provided'}</p>
              </div>

              <div className="mt-3 text-sm">
                <p className="font-semibold">Detailed specifications</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {entry.detailedSpecifications}
                </p>
              </div>

              {entry.additionalNotes ? (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">Additional notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {entry.additionalNotes}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 text-sm">
                <p><strong>Tracking:</strong> {entry.pageUrl || 'N/A'} | {entry.utmSource || 'N/A'} | {entry.utmMedium || 'N/A'} | {entry.utmCampaign || 'N/A'}</p>
                <p><strong>Submitted at:</strong> {entry.submittedAt || 'N/A'}</p>
                {entry.referenceFileUrl ? (
                  <p>
                    <strong>Reference file:</strong>{' '}
                    <a className="text-blue-600 hover:underline" href={entry.referenceFileUrl.startsWith('http') ? entry.referenceFileUrl : `${sourceSiteUrl}${entry.referenceFileUrl}`} target="_blank" rel="noreferrer">
                      {entry.referenceFileName || 'View file'}
                    </a>
                  </p>
                ) : null}
                {entry.logoFileUrl ? (
                  <p>
                    <strong>Logo file:</strong>{' '}
                    <a className="text-blue-600 hover:underline" href={entry.logoFileUrl.startsWith('http') ? entry.logoFileUrl : `${sourceSiteUrl}${entry.logoFileUrl}`} target="_blank" rel="noreferrer">
                      {entry.logoFileName || 'View file'}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
