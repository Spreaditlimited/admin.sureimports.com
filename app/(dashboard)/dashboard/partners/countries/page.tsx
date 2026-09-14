import {redirect} from 'next/navigation';
import {requirePartnerReviewer} from '@/lib/partners/review';
import CountryPolicies from './CountryPolicies';
export const dynamic='force-dynamic';
export default async function Page(){if(!await requirePartnerReviewer())redirect('/dashboard');return <div className="space-y-6 pb-10"><header><h1 className="text-2xl font-bold text-foreground">Partner countries</h1><p className="mt-2 text-sm text-muted-foreground">Eligibility, verification and platform pricing by country.</p></header><CountryPolicies/></div>;}
