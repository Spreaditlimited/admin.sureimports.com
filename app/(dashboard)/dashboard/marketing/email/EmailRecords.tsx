'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatWatDateTime } from '@/lib/time/wat';

type ContactRecord = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  consentStatus: string;
  consentSource: string | null;
  joinedAt: string | null;
  consentAt: string | null;
  optInRequestedAt: string | null;
  optInExpiresAt: string | null;
  unsubscribedAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SequenceStep = {
  pidStep: string;
  stepNumber: number;
  title: string;
  subject: string;
};

function SearchField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function Timestamp({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {value ? (
        <time dateTime={value} className="mt-0.5 block text-[11px] font-medium text-foreground/80">
          {formatWatDateTime(value)}
        </time>
      ) : (
        <p className="mt-0.5 text-[11px] text-muted-foreground">—</p>
      )}
    </div>
  );
}

function statusClass(status: string) {
  if (status === 'OPTED_IN') return 'bg-emerald-500/10 text-emerald-700';
  if (status === 'PENDING_CONFIRMATION') return 'bg-amber-500/10 text-amber-700';
  if (status === 'TEST_ONLY') return 'bg-blue-500/10 text-blue-700';
  return 'bg-rose-500/10 text-rose-700';
}

export default function EmailRecords({
  contacts,
  steps,
  sequenceName,
}: {
  contacts: ContactRecord[];
  steps: SequenceStep[];
  sequenceName: string | null;
}) {
  const [contactQuery, setContactQuery] = useState('');
  const [sequenceQuery, setSequenceQuery] = useState('');
  const deferredContactQuery = useDeferredValue(contactQuery.trim().toLowerCase());
  const deferredSequenceQuery = useDeferredValue(sequenceQuery.trim().toLowerCase());

  const filteredContacts = useMemo(() => {
    if (!deferredContactQuery) return contacts;
    return contacts.filter((contact) => {
      const searchableDates = [
        contact.joinedAt,
        contact.createdAt,
        contact.optInRequestedAt,
        contact.consentAt,
        contact.unsubscribedAt,
        contact.bouncedAt,
        contact.complainedAt,
        contact.updatedAt,
      ]
        .filter(Boolean)
        .map((value) => formatWatDateTime(value as string));
      return [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.status,
        contact.consentStatus,
        contact.consentSource,
        ...searchableDates,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(deferredContactQuery);
    });
  }, [contacts, deferredContactQuery]);

  const filteredSteps = useMemo(() => {
    if (!deferredSequenceQuery) return steps;
    return steps.filter((step) =>
      `${step.stepNumber} ${step.title} ${step.subject}`
        .toLowerCase()
        .includes(deferredSequenceQuery),
    );
  }, [deferredSequenceQuery, steps]);

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="flex flex-col justify-between gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold">Post-cutover email contacts</h2>
            <p className="text-xs text-muted-foreground">
              Pending contacts have received a confirmation request. Only confirmed contacts can enter a future SES sequence. All times are shown in WAT.
            </p>
          </div>
          <SearchField
            value={contactQuery}
            onChange={setContactQuery}
            label="Search post-cutover contacts"
            placeholder="Search name, email, status or date"
          />
        </div>
        <div className="border-b border-border bg-muted/30 px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Showing {filteredContacts.length} of {contacts.length} contacts
        </div>
        <div className="max-h-[560px] divide-y divide-border overflow-y-auto overscroll-contain">
          {filteredContacts.length ? (
            filteredContacts.map((contact) => (
              <article key={contact.email} className="px-6 py-4 text-sm">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Subscriber'}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">{contact.email}</p>
                    {contact.consentSource ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Source: {contact.consentSource.replaceAll('_', ' ')}
                      </p>
                    ) : null}
                  </div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${statusClass(contact.consentStatus)}`}>
                    {contact.consentStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3 md:grid-cols-4">
                  <Timestamp label="Account joined" value={contact.joinedAt} />
                  <Timestamp label="Contact added" value={contact.createdAt} />
                  <Timestamp label="Confirmation sent" value={contact.optInRequestedAt} />
                  <Timestamp label="Opted in" value={contact.consentAt} />
                  <Timestamp label="Confirmation expires" value={contact.optInExpiresAt} />
                  <Timestamp label="Unsubscribed" value={contact.unsubscribedAt} />
                  <Timestamp label="Bounced / complained" value={contact.bouncedAt || contact.complainedAt} />
                  <Timestamp label="Last updated" value={contact.updatedAt} />
                </div>
              </article>
            ))
          ) : (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {contacts.length ? 'No contacts match your search.' : 'No post-cutover contacts yet.'}
            </p>
          )}
        </div>
      </section>

      {steps.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Imported sequence</h2>
              <p className="text-xs text-muted-foreground">{sequenceName}</p>
            </div>
            <SearchField
              value={sequenceQuery}
              onChange={setSequenceQuery}
              label="Search imported sequence"
              placeholder="Search number, subject or title"
            />
          </div>
          <div className="border-b border-border bg-muted/30 px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Showing {filteredSteps.length} of {steps.length} emails
          </div>
          <div className="max-h-[560px] divide-y divide-border overflow-y-auto overscroll-contain">
            {filteredSteps.length ? (
              filteredSteps.map((step) => (
                <article key={step.pidStep} className="grid gap-1 px-6 py-4 md:grid-cols-[80px_1fr]">
                  <span className="text-xs font-bold text-primary">Email {step.stepNumber}</span>
                  <div>
                    <p className="text-sm font-semibold">{step.subject}</p>
                    <p className="text-xs text-muted-foreground">{step.title}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No sequence emails match your search.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
