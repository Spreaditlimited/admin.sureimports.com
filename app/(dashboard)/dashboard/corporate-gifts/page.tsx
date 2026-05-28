import { prisma } from '@/lib/prisma';
import {
  Briefcase,
  Calendar,
  MessageCircle,
  Mail,
  MapPin,
  Package,
  ExternalLink,
  FileText,
  Layers,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getNextCorporateGiftStatus } from '@/lib/notifications/corporateGifts';
import {
  assignCorporateGiftRequestAction,
  updateCorporateGiftRequestAction,
} from './actions';
import Link from 'next/link';
import CancelProjectCard from './components/CancelProjectCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CorporateGiftsAdminPage() {
  const sourceSiteUrl =
    process.env.SUREIMPORTS_SITE_URL || 'https://www.sureimports.com';

  const entries = await prisma.corporate_gift_request.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6 pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Corporate Gift Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and review sourcing enquiries from corporate clients.
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/50 px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-foreground">
            {entries.length} Total Requests
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-20 text-center shadow-soft">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            No requests yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            New sourcing requests will appear here as they come in.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => {
            const entryView = entry as typeof entry & {
              status?: string;
              handledByName?: string | null;
              cancellationReason?: string | null;
            };
            const entryStatus = entryView.status || 'Pending';
            const nextStatus = getNextCorporateGiftStatus(entryStatus);
            const canCancel =
              entryStatus !== 'Delivered' && entryStatus !== 'Cancelled';
              
            return (
              <div
                key={entry.id}
                className="bg-card border border-border shadow-soft rounded-lg overflow-hidden transition-all duration-200"
              >
                <div className="p-5 sm:p-6">
                  
                  {/* Card Header: Title & Quick Contact */}
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {entry.businessName}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(entry.createdAt).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                            ID: {entry.pidRequest}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${entry.whatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                      <a
                        href={`mailto:${entry.contactEmail}`}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                    </div>
                  </div>

                  {/* Core Request Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border-y border-border py-5">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Package className="h-3 w-3" /> Product Needed
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {entry.productOrItemNeeded}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Layers className="h-3 w-3" /> Quantity / Quality
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {entry.quantityNeeded} units • {entry.preferredQualityLevel}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Calendar className="h-3 w-3" /> Delivery Goal
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {entry.expectedDeliveryDate}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <MapPin className="h-3 w-3" /> Location
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate">
                        {entry.finalDeliveryLocationNigeria}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Specs & Notes */}
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" /> Detailed Specifications
                      </h4>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {entry.detailedSpecifications}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Requirement Checklist
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className="border-border bg-background text-foreground text-xs px-2.5 py-0.5"
                          >
                            Branding: {entry.brandingCustomizationRequired}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-border bg-background text-foreground text-xs px-2.5 py-0.5"
                          >
                            Timeline: {entry.proceedTimeline || 'Unstated'}
                          </Badge>
                        </div>
                      </div>

                      {entry.additionalNotes && (
                        <div className="rounded-lg border border-border bg-muted/50 p-4">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Additional Notes
                          </p>
                          <p className="text-sm italic leading-relaxed text-foreground">
                            {entry.additionalNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attached Files & UTM Data */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-3 text-xs">
                      {entry.referenceFileUrl && (
                        <a
                          href={
                            entry.referenceFileUrl.startsWith('http')
                              ? entry.referenceFileUrl
                              : `${sourceSiteUrl}${entry.referenceFileUrl}`
                          }
                          target="_blank"
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-medium text-primary transition-colors hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Ref Image:{' '}
                          {entry.referenceFileName || 'View'}
                        </a>
                      )}
                      {entry.logoFileUrl && (
                        <a
                          href={
                            entry.logoFileUrl.startsWith('http')
                              ? entry.logoFileUrl
                              : `${sourceSiteUrl}${entry.logoFileUrl}`
                          }
                          target="_blank"
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-medium text-primary transition-colors hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Logo:{' '}
                          {entry.logoFileName || 'View'}
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3 font-mono text-[10px] text-muted-foreground">
                      <span>Source: {entry.utmSource || 'direct'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Medium: {entry.utmMedium || 'organic'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Campaign: {entry.utmCampaign || 'n/a'}</span>
                    </div>
                  </div>

                  {/* Status & Administrative Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
                    
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Status:
                        </span>
                        <Badge
                          variant="outline"
                          className="border-border bg-background text-foreground text-xs"
                        >
                          {entryStatus}
                        </Badge>
                        <span className="ml-2 text-xs font-medium text-muted-foreground border-l border-border pl-2">
                          Handler: <span className="text-foreground">{entryView.handledByName || 'Unassigned'}</span>
                        </span>
                      </div>
                      {entryStatus === 'Cancelled' && (
                        <p className="text-xs font-medium text-destructive">
                          Reason: {entryView.cancellationReason || 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <Link
                        href={`/dashboard/invoicing/create?linkedRequestId=${entry.pidRequest}`}
                        className="flex-1 sm:flex-none text-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                      >
                        Create Invoice
                      </Link>
                      
                      <form action={assignCorporateGiftRequestAction} className="flex-1 sm:flex-none">
                        <input type="hidden" name="pidRequest" value={entry.pidRequest} />
                        <button
                          type="submit"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                        >
                          Assign To Me
                        </button>
                      </form>

                      <form action={updateCorporateGiftRequestAction} className="flex-1 sm:flex-none">
                        <input type="hidden" name="pidRequest" value={entry.pidRequest} />
                        {nextStatus ? (
                          <>
                            <input type="hidden" name="status" value={nextStatus} />
                            <button
                              type="submit"
                              className="w-full rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                            >
                              Move to {nextStatus}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground w-full text-center">
                            Final status reached
                          </span>
                        )}
                      </form>
                    </div>

                  </div>

                  {canCancel && (
                    <div className="mt-4">
                      <CancelProjectCard
                        pidRequest={entry.pidRequest}
                        action={updateCorporateGiftRequestAction}
                      />
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}