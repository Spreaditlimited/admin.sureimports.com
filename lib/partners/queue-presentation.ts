export type ApplicationRow = { id: string; legalName: string; registrationNumber: string; businessStatus: string; status: string; businessFitDecision?: string | null; agreementStatus?: string; submittedAt: string | null; revision: number };
export function applicationStage(row: ApplicationRow) {
  if (row.businessStatus === 'ACTIVE') return { label: 'Approved business', detail: 'Ready for storefront setup', group: 'approved', complete: 3 };
  if (row.businessStatus !== 'PENDING') return { label: 'Account review required', detail: row.businessStatus.replaceAll('_', ' ').toLowerCase(), group: 'review', complete: 0 };
  if (row.status === 'REJECTED' || row.businessFitDecision === 'NOT_READY') return { label: 'Not approved', detail: 'Decision recorded', group: 'decided', complete: 0 };
  if (row.status === 'DRAFT' || row.businessFitDecision === 'REQUEST_CHANGES') return { label: 'Corrections requested', detail: 'Awaiting the business’s response', group: 'corrections', complete: 0 };
  const fit = row.businessFitDecision === 'PILOT_APPROVED';
  const verified = row.status === 'VERIFIED';
  return { label: fit && verified ? row.agreementStatus === 'AWAITING_CONFIRMATION' ? 'Agreement accepted — activation pending' : 'Awaiting Agreement Acceptance by Business' : fit ? 'Needs business verification' : 'Needs business-fit review', detail: fit && verified ? row.agreementStatus === 'AWAITING_CONFIRMATION' ? 'Activation follows business acceptance automatically' : 'Business: Read and Accept Agreement' : fit ? 'Business fit approved' : verified ? 'Verification already accepted' : 'Application submitted', group: 'review', complete: Number(fit) + Number(verified) };
}
export function filterApplications(rows: ApplicationRow[], query: string, group: string) {
  const text = query.trim().toLowerCase();
  return rows.filter(row => (group === 'all' || applicationStage(row).group === group) && (!text || `${row.legalName} ${row.registrationNumber}`.toLowerCase().includes(text)));
}
