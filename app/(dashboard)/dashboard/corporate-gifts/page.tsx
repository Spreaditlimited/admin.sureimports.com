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
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Corporate Gift Requests
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Manage and review sourcing enquiries from Nigerian corporate clients.
          </p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 dark:border-blue-900/50 dark:bg-blue-950/40">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {entries.length} Total Requests
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 p-20 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Package className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No requests yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            New sourcing requests will appear here as they come in.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => {
            const nextStatus = getNextCorporateGiftStatus(entry.status);
            return (
              <div
              key={entry.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />

              <div className="p-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      <Briefcase className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {entry.businessName}
                      </h2>
                      <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(entry.createdAt).toLocaleString('en-NG', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          ID: {entry.pidRequest}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${entry.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                    <a
                      href={`mailto:${entry.contactEmail}`}
                      className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 border-y border-slate-100 py-4 dark:border-slate-800 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      <Package className="h-3 w-3" /> Product Needed
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {entry.productOrItemNeeded}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      <Layers className="h-3 w-3" /> Quantity / Quality
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {entry.quantityNeeded} units • {entry.preferredQualityLevel}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      <Calendar className="h-3 w-3" /> Delivery Goal
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {entry.expectedDeliveryDate}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      <MapPin className="h-3 w-3" /> Location
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {entry.finalDeliveryLocationNigeria}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                      <FileText className="h-3.5 w-3.5" /> Detailed Specifications
                    </h4>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {entry.detailedSpecifications}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                        Requirement Checklist
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          Branding: {entry.brandingCustomizationRequired}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          Timeline: {entry.proceedTimeline || 'Unstated'}
                        </Badge>
                      </div>
                    </div>

                    {entry.additionalNotes && (
                      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <p className="mb-1 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                          Additional Notes
                        </p>
                        <p className="text-xs italic leading-relaxed text-amber-900 dark:text-amber-200">
                          {entry.additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex gap-4 text-xs">
                    {entry.referenceFileUrl && (
                      <a
                        href={
                          entry.referenceFileUrl.startsWith('http')
                            ? entry.referenceFileUrl
                            : `${sourceSiteUrl}${entry.referenceFileUrl}`
                        }
                        target="_blank"
                        className="flex items-center gap-1.5 rounded border border-blue-100 bg-blue-50 px-2 py-1 font-bold text-blue-600 transition-colors hover:text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        <ExternalLink className="h-3 w-3" /> Ref Image:{' '}
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
                        className="flex items-center gap-1.5 rounded border border-indigo-100 bg-indigo-50 px-2 py-1 font-bold text-indigo-600 transition-colors hover:text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:text-indigo-200"
                      >
                        <ExternalLink className="h-3 w-3" /> Logo:{' '}
                        {entry.logoFileName || 'View'}
                      </a>
                    )}
                  </div>

                  <div className="flex gap-3 font-mono text-[10px] italic text-slate-400 dark:text-slate-500">
                    <span>Source: {entry.utmSource || 'direct'}</span>
                    <span>•</span>
                    <span>Medium: {entry.utmMedium || 'organic'}</span>
                    <span>•</span>
                    <span>Campaign: {entry.utmCampaign || 'n/a'}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                      Status:
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {entry.status || 'Pending'}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Handler: {entry.handledByName || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={assignCorporateGiftRequestAction}>
                      <input
                        type="hidden"
                        name="pidRequest"
                        value={entry.pidRequest}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Assign To Me
                      </button>
                    </form>

                    <form
                      action={updateCorporateGiftRequestAction}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="hidden"
                        name="pidRequest"
                        value={entry.pidRequest}
                      />
                      {nextStatus ? (
                        <>
                          <input type="hidden" name="status" value={nextStatus} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                          >
                            Move to {nextStatus}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Final status reached
                        </span>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
