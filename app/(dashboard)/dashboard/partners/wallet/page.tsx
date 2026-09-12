import { redirect } from 'next/navigation';
import { requirePartnerReviewer } from '@/lib/partners/review';
import WalletReview from './WalletReview';
export const dynamic='force-dynamic';
export default async function WalletPage(){if(!await requirePartnerReviewer())redirect('/dashboard');return <div className="pb-10"><WalletReview/></div>;}
