import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Facebook,
  FileClock,
  Instagram,
  Megaphone,
  MessageCircle,
  PlugZap,
  Radio,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { getSocialAdmin, requireSocialAdmin } from '@/lib/social/auth';
import { formatWat } from '@/lib/social/time';
import {
  approveSocialCampaign,
  generateSocialDraft,
  publishSocialCampaignNow,
  rejectSocialCampaign,
  resendSocialApproval,
  saveSocialCampaign,
} from './actions';

export const metadata: Metadata = { title: 'Social Studio | Sure Imports Admin' };

const statusClass: Record<string, string> = {
  awaiting_approval: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  published: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  partial: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  failed: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  rejected: 'border-border bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass[status] || statusClass.rejected}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 border-t border-border/50 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        defaultValue={value}
        disabled={disabled}
        required
        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-70"
      />
    </label>
  );
}

function Caption({
  label,
  name,
  value,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
}) {
  const count = value.trim().split(/\s+/).filter(Boolean).length;
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{count} words</span>
      </span>
      <textarea
        name={name}
        defaultValue={value}
        disabled={disabled}
        required
        rows={8}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-70"
      />
    </label>
  );
}

export default async function SocialStudioPage() {
  await requireSocialAdmin('view');
  const canEdit = !!(await getSocialAdmin('edit'));
  const [campaigns, connection] = await Promise.all([
    prisma.social_campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { publications: true },
      take: 30,
    }),
    prisma.social_connection.findUnique({ where: { platform: 'meta' } }),
  ]);

  const awaitingCount = campaigns.filter(
    (campaign) => campaign.status === 'awaiting_approval',
  ).length;
  const approvedCount = campaigns.filter(
    (campaign) => campaign.status === 'approved',
  ).length;
  const publishedCount = campaigns.filter(
    (campaign) => campaign.status === 'published',
  ).length;

  return (
    <main className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-6 border-b border-border px-1 pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Social Studio</h1>
            <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Daily content generation, approval and publishing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {connection?.status === 'active' ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Radio className="h-4 w-4" />@{connection.instagramUsername} connected
            </span>
          ) : canEdit ? (
            <Link
              href="/api/social/meta/connect"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              <PlugZap className="h-4 w-4" />
              Connect Meta
            </Link>
          ) : null}
          {canEdit ? (
            <form action={generateSocialDraft}>
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
                <Sparkles className="h-4 w-4" />
                Generate draft
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Awaiting Approval"
          value={awaitingCount}
          note="Drafts that require an authorised admin decision."
          icon={FileClock}
        />
        <MetricCard
          label="Approved Queue"
          value={approvedCount}
          note="Campaigns cleared for the next publishing run."
          icon={CheckCircle2}
        />
        <MetricCard
          label="Published"
          value={publishedCount}
          note="Campaigns successfully delivered to both platforms."
          icon={Send}
        />
        <MetricCard
          label="Publishing Window"
          value="10:00 WAT"
          note="Automated once-daily publication, seven days a week."
          icon={CalendarClock}
        />
      </div>

      {!connection ? (
        <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            Drafting and approval are available. Publishing remains disabled until
            the Sure Imports Facebook Page and connected @sureimport Business
            account are authorised through Meta.
          </p>
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Your admin role has view-only Social Studio access.
        </div>
      ) : null}

      <section className="space-y-6">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-20 text-center shadow-soft">
            <Megaphone className="mb-4 h-11 w-11 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">No campaigns yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate the first approval-ready campaign to start the calendar.
            </p>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const locked =
              !canEdit || ['published', 'partial'].includes(campaign.status);
            return (
              <article
                id={campaign.pidCampaign}
                key={campaign.pidCampaign}
                className="scroll-mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-soft"
              >
                <div className="flex flex-col gap-4 border-b border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={campaign.status} />
                      <span className="rounded bg-muted px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {campaign.pidCampaign}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {campaign.contentPillar.replace(/_/g, ' ')} campaign
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    Scheduled for {formatWat(campaign.scheduledFor)} WAT
                  </div>
                </div>

                <div className="grid xl:grid-cols-[420px_1fr]">
                  <div className="border-b border-border bg-muted/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
                    {campaign.designImageUrl ? (
                      <img
                        src={campaign.designImageUrl}
                        alt={campaign.headline}
                        className="aspect-square w-full rounded-lg border border-border object-cover shadow-soft"
                      />
                    ) : (
                      <div className="aspect-square rounded-lg border border-dashed border-border bg-muted" />
                    )}

                    <div className="mt-5 rounded-lg border border-border bg-card p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Content source
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {campaign.sourceTitle}
                      </p>
                    </div>

                    {campaign.publications.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {campaign.publications.map((publication) => (
                          <div
                            key={publication.pidPublication}
                            className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-xs"
                          >
                            <span className="flex items-center gap-2 font-semibold capitalize text-foreground">
                              {publication.platform === 'instagram' ? (
                                <Instagram className="h-4 w-4 text-primary" />
                              ) : (
                                <Facebook className="h-4 w-4 text-primary" />
                              )}
                              {publication.platform}
                            </span>
                            {publication.externalUrl ? (
                              <a
                                href={publication.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                View post <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="capitalize text-muted-foreground">
                                {publication.status}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="p-5 sm:p-6 lg:p-8">
                    {campaign.demandRationale ? (
                      <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          Demand mechanism
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {campaign.demandRationale}
                        </p>
                      </div>
                    ) : null}
                    {campaign.lastError ? (
                      <div className="mb-5 flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>{campaign.lastError}</p>
                      </div>
                    ) : null}

                    <form action={saveSocialCampaign} className="space-y-5">
                      <input
                        type="hidden"
                        name="pidCampaign"
                        value={campaign.pidCampaign}
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Headline"
                          name="headline"
                          value={campaign.headline}
                          disabled={locked}
                        />
                        <Field
                          label="Primary emphasis"
                          name="accentPhrase"
                          value={campaign.accentPhrase || ''}
                          disabled={locked}
                        />
                      </div>
                      <Field
                        label="Subtext"
                        name="subtext"
                        value={campaign.subtext}
                        disabled={locked}
                      />
                      <Field
                        label="Call to action"
                        name="actionLabel"
                        value={campaign.actionLabel}
                        disabled={locked}
                      />
                      <Caption
                        label="Instagram caption"
                        name="instagramCaption"
                        value={campaign.instagramCaption}
                        disabled={locked}
                      />
                      <Caption
                        label="Facebook caption"
                        name="facebookCaption"
                        value={campaign.facebookCaption}
                        disabled={locked}
                      />
                      <label className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm font-semibold text-foreground">
                        <input
                          type="checkbox"
                          name="includeWhatsapp"
                          defaultChecked={campaign.includeWhatsapp}
                          disabled={locked}
                          className="h-4 w-4 accent-primary"
                        />
                        <MessageCircle className="h-4 w-4 text-primary" />
                        Include “WhatsApp only: +234 803 764 9956”
                      </label>
                      {!locked ? (
                        <button className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted">
                          <Save className="h-4 w-4" />
                          Save and re-render
                        </button>
                      ) : null}
                    </form>

                    {canEdit ? (
                      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                        {campaign.status === 'awaiting_approval' ? (
                          <>
                            <form action={approveSocialCampaign}>
                              <input
                                type="hidden"
                                name="pidCampaign"
                                value={campaign.pidCampaign}
                              />
                              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                                <CheckCircle2 className="h-4 w-4" />
                                Approve campaign
                              </button>
                            </form>
                            <form action={rejectSocialCampaign} className="flex gap-2">
                              <input
                                type="hidden"
                                name="pidCampaign"
                                value={campaign.pidCampaign}
                              />
                              <input
                                name="rejectionNote"
                                placeholder="Reason for rejection"
                                className="min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                              />
                              <button className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </form>
                          </>
                        ) : null}

                        {['approved', 'partial', 'failed'].includes(
                          campaign.status,
                        ) && connection ? (
                          <form action={publishSocialCampaignNow}>
                            <input
                              type="hidden"
                              name="pidCampaign"
                              value={campaign.pidCampaign}
                            />
                            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                              {campaign.status === 'partial' ? (
                                <RefreshCw className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              {campaign.status === 'partial'
                                ? 'Retry failed platform'
                                : 'Publish now'}
                            </button>
                          </form>
                        ) : null}

                        {['awaiting_approval', 'rejected'].includes(
                          campaign.status,
                        ) ? (
                          <form action={resendSocialApproval}>
                            <input
                              type="hidden"
                              name="pidCampaign"
                              value={campaign.pidCampaign}
                            />
                            <button className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                              <RefreshCw className="h-4 w-4" />
                              Resend approval email
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
