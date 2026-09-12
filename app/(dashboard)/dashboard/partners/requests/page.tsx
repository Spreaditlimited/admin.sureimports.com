import { redirect } from 'next/navigation';
// Retired: unapproved customer drafts must never enter an SI procurement queue.
export default function RetiredPartnerRequestsPage() {
  redirect('/dashboard/partners');
}
