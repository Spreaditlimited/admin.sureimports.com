const WAT_OFFSET_MS = 60 * 60 * 1000;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatWatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const source = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(source.getTime())) return '—';

  const wat = new Date(source.getTime() + WAT_OFFSET_MS);
  const hours = wat.getUTCHours();
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 || 12;

  return `${pad(wat.getUTCDate())} ${MONTHS[wat.getUTCMonth()]} ${wat.getUTCFullYear()}, ${pad(displayHour)}:${pad(wat.getUTCMinutes())} ${period} WAT`;
}
