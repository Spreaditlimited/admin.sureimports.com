const WAT_OFFSET_MS = 60 * 60 * 1000;

export function nextWatPublishingSlot(now = new Date(), forceNextDay = false) {
  const wat = new Date(now.getTime() + WAT_OFFSET_MS);
  const target = new Date(Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate(), 9));
  if (forceNextDay || target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  return target;
}

export function watDayStart(now = new Date()) {
  const wat = new Date(now.getTime() + WAT_OFFSET_MS);
  return new Date(Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate()) - WAT_OFFSET_MS);
}

export function formatWat(value?: Date | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short', hour12: true,
  }).format(value);
}
