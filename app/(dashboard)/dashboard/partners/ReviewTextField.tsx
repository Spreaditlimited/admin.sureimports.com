'use client';

import { useId, useRef, useState } from 'react';
import { appendReviewSuggestion, reviewSuggestions } from '@/lib/partners/review-suggestions';

export default function ReviewTextField({ name, label, suggestions, maxLength = 2000, minLength, required, disabled, hint, placeholder }: {
  name: string; label: string; suggestions: keyof typeof reviewSuggestions; maxLength?: number;
  minLength?: number; required?: boolean; disabled?: boolean; hint?: string; placeholder?: string;
}) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [notice, setNotice] = useState('');
  function add(text: string) {
    const next = appendReviewSuggestion(value, text, maxLength);
    setNotice(next === value ? 'Already added, or there is not enough space. You can edit the text below.' : 'Added. Edit the text as needed.');
    setValue(next);
    input.current?.focus({ preventScroll: true });
  }
  return <div className="space-y-3">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <details className="rounded-lg border border-border bg-background p-3 text-sm">
      <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Add a standard response</summary>
      <p className="mt-3 text-muted-foreground">Choose only statements that match your review. Text is added, never replaced.</p>
      {(['positive', 'negative'] as const).map(tone => <div key={tone} className="mt-4 space-y-2">
        <p className="font-medium">{tone === 'positive' ? 'Positive findings' : 'Concerns / corrections'}</p>
        <div className="flex flex-wrap gap-2">{reviewSuggestions[suggestions][tone].map(text => <button key={text} type="button" disabled={disabled || appendReviewSuggestion(value, text, maxLength) === value} onClick={() => add(text)} className="min-h-11 max-w-full rounded-lg border border-border px-3 py-2 text-left leading-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{text}</button>)}</div>
      </div>)}
    </details>
    <textarea ref={input} id={id} name={name} value={value} onChange={event => { setValue(event.target.value); setNotice(''); }} required={required} minLength={minLength} maxLength={maxLength} disabled={disabled} placeholder={placeholder} rows={3} aria-describedby={`${id}-hint`} className="w-full rounded-lg border border-input bg-background px-3 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    <p id={`${id}-hint`} className="text-sm text-muted-foreground">{hint || 'You can edit this response or add your own wording.'}</p>
    <span role="status" className="sr-only">{notice}</span>
  </div>;
}
