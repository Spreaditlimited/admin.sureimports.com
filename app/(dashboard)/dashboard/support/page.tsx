import { notFound, redirect } from 'next/navigation';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import styles from './support-admin.module.css';
import AdminPushSettings from '@/components/support/AdminPushSettings';
import SupportWorkspace from '@/components/support/SupportWorkspace';
export const metadata = { title: 'Customer support' };
export default async function SupportPage() {
  if (process.env.SUPPORT_CHAT_ENABLED !== 'true') notFound();
  const access = await requireAdminServiceAccess('customer_support', 'view');
  if (!access.ok) redirect('/dashboard');
  const edit = await requireAdminServiceAccess('customer_support', 'edit');
  return <div className={styles.root}><AdminPushSettings /><SupportWorkspace agent canEdit={edit.ok} /></div>;
}
