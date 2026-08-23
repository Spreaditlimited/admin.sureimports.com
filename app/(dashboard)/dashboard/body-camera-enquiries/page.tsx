import { Prisma } from '@prisma/client';
import {
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Globe2,
  Mail,
  MessageCircle,
  RadioTower,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { getBodyCameraAdminAccess } from '@/lib/bodyCameraAccess';
import { prisma } from '@/lib/prisma';
import { updateBodyCameraEnquiryAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const statuses = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['qualified', 'Qualified'],
  ['quotation_prepared', 'Quotation prepared'],
  ['won', 'Won'],
  ['lost', 'Lost'],
  ['archived', 'Archived'],
] as const;

function statusLabel(status: string) {
  return statuses.find(([value]) => value === status)?.[1] || status;
}

function statusClass(status: string) {
  if (status === 'new')
    return 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300';
  if (status === 'contacted')
    return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (status === 'qualified' || status === 'quotation_prepared')
    return 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300';
  if (status === 'won')
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'lost')
    return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300';
  return 'border-border bg-muted text-muted-foreground';
}

function formatDate(date: Date | null) {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(date);
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: typeof Camera;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-foreground">
        {value || 'Not specified'}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

type EnquirySearchParams = {
  q?: string | string[];
  status?: string | string[];
  enquiry?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function BodyCameraEnquiriesPage({
  searchParams,
}: {
  searchParams?: Promise<EnquirySearchParams>;
}) {
  const access = await getBodyCameraAdminAccess();
  if (!access) redirect('/auth/login');
  if (!access.canView) redirect('/dashboard');

  const params = searchParams ? await searchParams : {};
  const query = first(params.q).trim().slice(0, 160);
  const requestedStatus = first(params.status);
  const activeStatus = statuses.some(([value]) => value === requestedStatus)
    ? requestedStatus
    : 'all';
  const highlightedEnquiry = first(params.enquiry);
  const where: Prisma.body_camera_enquiriesWhereInput = {
    ...(activeStatus !== 'all' ? { status: activeStatus } : {}),
    ...(query
      ? {
          OR: [
            { pidEnquiry: { contains: query } },
            { name: { contains: query } },
            { email: { contains: query } },
            { organisation: { contains: query } },
            { phone: { contains: query } },
            { country: { contains: query } },
          ],
        }
      : {}),
  };

  const [entries, groupedStatuses, total] = await Promise.all([
    prisma.body_camera_enquiries.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 100,
    }),
    prisma.body_camera_enquiries.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.body_camera_enquiries.count(),
  ]);
  const counts = new Map(
    groupedStatuses.map((group) => [group.status, group._count._all]),
  );
  const activeCount =
    (counts.get('contacted') || 0) +
    (counts.get('qualified') || 0) +
    (counts.get('quotation_prepared') || 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Body Camera Enquiries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and progress corporate body-camera, evidence-management and
            live-command solution requests.
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/50 px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-foreground">
            {total} Total Enquiries
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="New"
          value={counts.get('new') || 0}
          detail="Awaiting first response"
        />
        <SummaryCard
          label="Active"
          value={activeCount}
          detail="Contacted through quotation"
        />
        <SummaryCard
          label="Qualified"
          value={counts.get('qualified') || 0}
          detail="Confirmed solution opportunities"
        />
        <SummaryCard
          label="Won"
          value={counts.get('won') || 0}
          detail="Converted engagements"
        />
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-end"
      >
        <label className="flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Search enquiries
          </span>
          <span className="relative mt-2 block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Organisation, contact, email, phone or enquiry ID"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </span>
        </label>
        <label className="lg:w-56">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <select
            name="status"
            defaultValue={activeStatus}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">
            Apply filters
          </button>
          {query || activeStatus !== 'all' ? (
            <Link
              href="/dashboard/body-camera-enquiries"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-16 text-center shadow-sm">
          <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            No matching enquiries
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            New solution-assessment submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const phoneDigits = entry.phone.replace(/\D/g, '');
            const openByDefault =
              highlightedEnquiry === entry.pidEnquiry || entry.status === 'new';

            return (
              <details
                key={entry.pidEnquiry}
                open={openByDefault}
                className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm"
              >
                <summary className="flex cursor-pointer list-none flex-col gap-4 px-5 py-4 transition hover:bg-muted/40 marker:hidden lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-foreground">
                          {entry.organisation}
                        </h2>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusClass(entry.status)}`}
                        >
                          {statusLabel(entry.status)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {entry.name}
                        </span>
                        <span>•</span>
                        <span>{entry.country}</span>
                        <span>•</span>
                        <span>{entry.fleetSize || 'Fleet not specified'} cameras</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span className="font-mono">ID: {entry.pidEnquiry}</span>
                        <span>{formatDate(entry.submittedAt)}</span>
                        <span>Owner: {entry.assignedOwner || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div className="hidden gap-2 xl:flex">
                      <a
                        href={`mailto:${entry.email}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                      {phoneDigits ? (
                        <a
                          href={`https://wa.me/${phoneDigits}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      ) : null}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="group-open:hidden">Open</span>
                      <span className="hidden group-open:inline">Close</span>
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-transform group-open:rotate-180">
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </div>
                </summary>

                <div className="border-t border-border p-5 sm:p-6">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {entry.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.organisation} · {entry.country}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${entry.email}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                      {phoneDigits ? (
                        <a
                          href={`https://wa.me/${phoneDigits}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                    <div className="space-y-5">
                      <div className="grid gap-5 border-y border-border py-5 sm:grid-cols-2 xl:grid-cols-3">
                        <Info label="Email" value={entry.email} icon={Mail} />
                        <Info label="Phone" value={entry.phone} icon={MessageCircle} />
                        <Info label="Organisation" value={entry.organisation} icon={Building2} />
                        <Info label="Country" value={entry.country} icon={Globe2} />
                        <Info label="Camera users" value={entry.fleetSize} icon={UsersRound} />
                        <Info label="Live command" value={entry.liveCommand} icon={RadioTower} />
                        <Info label="Target timeframe" value={entry.timeframe} icon={CalendarDays} />
                        <Info label="Submitted" value={formatDate(entry.submittedAt)} icon={Clock3} />
                        <Info label="Source" value={entry.source} icon={Camera} />
                      </div>

                      <div className="rounded-lg border border-border bg-muted/30 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          What the solution should achieve
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {entry.requirements}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Info
                          label="Admin email"
                          value={entry.adminNotificationStatus}
                          icon={Mail}
                        />
                        <Info
                          label="Customer confirmation"
                          value={entry.customerNotificationStatus}
                          icon={CheckCircle2}
                        />
                      </div>
                      {entry.notificationError ? (
                        <p className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                          Notification issue: {entry.notificationError}
                        </p>
                      ) : null}
                    </div>

                    {access.canEdit ? (
                      <form
                        action={updateBodyCameraEnquiryAction}
                        className="h-fit rounded-lg border border-border bg-background p-4"
                      >
                        <input
                          type="hidden"
                          name="pidEnquiry"
                          value={entry.pidEnquiry}
                        />
                        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          Manage enquiry
                        </h3>

                        <label className="mt-4 block">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Status
                          </span>
                          <select
                            name="status"
                            defaultValue={entry.status}
                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          >
                            {statuses.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="mt-4 block">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Assigned owner
                          </span>
                          <input
                            name="assignedOwner"
                            defaultValue={entry.assignedOwner || ''}
                            placeholder="Team member handling this lead"
                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>

                        <label className="mt-4 block">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Internal notes
                          </span>
                          <textarea
                            name="internalNotes"
                            defaultValue={entry.internalNotes || ''}
                            rows={7}
                            placeholder="Contact outcome, technical fit, next action or quotation notes"
                            className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>

                        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">
                          <CheckCircle2 className="h-4 w-4" /> Save enquiry
                        </button>
                      </form>
                    ) : (
                      <div className="h-fit rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm font-semibold text-foreground">
                          Read-only access
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Ask a super admin for edit access to change ownership,
                          status or internal notes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
