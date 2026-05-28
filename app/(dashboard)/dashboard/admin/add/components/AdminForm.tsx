'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Key, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert,
  Contact,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const SERVICE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'corporate_gifts', label: 'Corporate Gifts' },
  { key: 'pay_supplier', label: 'Pay Supplier' },
  { key: 'shipping_only', label: 'Shipping Only' },
  { key: 'verify_supplier', label: 'Verify Supplier' },
  { key: 'pay_small_small', label: 'Pay Small Small' },
  { key: 'store_mgt', label: 'Store Mgt.' },
  { key: 'customer_accounts', label: 'Customer Accounts' },
  { key: 'payout_requests', label: 'Payout Requests' },
  { key: 'invoicing', label: 'Invoicing' },
  { key: 'admin_mgt', label: 'Admin Mgt.' },
  { key: 'shipping_plans', label: 'Shipping Plans' },
  { key: 'exchange_rates', label: 'Exchanges & Rates' },
  { key: 'blog_management', label: 'Blog Management' },
] as const;

const Page = () => {
    const { user } = useAuth();
    const navigateWithAlert = useNavigationWithAlert();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [pidAdminUser] = useState('ADM' + new Date().getTime().toString());
    const [accountName, setAccountName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [authorizationLevel, setAuthorizationLevel] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    const toggleService = (serviceKey: string) => {
      setSelectedServices((current) =>
        current.includes(serviceKey)
          ? current.filter((item) => item !== serviceKey)
          : [...current, serviceKey]
      );
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        toast.info('Provisioning administrative account...');

        const formData = new FormData();
        formData.append('pidAdminUser', pidAdminUser);
        formData.append('accountName', accountName);
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('password', password);
        formData.append('authorizationLevel', authorizationLevel);
        formData.append('serviceKeys', JSON.stringify(selectedServices));

        try {
            const res = await fetch('/api/crud/admin/create', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.statusx === 'SUCCESS') {
                navigateWithAlert('/dashboard/admin/view', 'success', 'Admin account successfully provisioned');
            } else {
                toast.error(data.message || 'Enrollment failed');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            
            {/* SECTION 1: IDENTITY */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Contact className="w-4 h-4 text-primary" /> 1. Admin Identity
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Account Name *</label>
                        <input
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            type="text"
                            required
                            placeholder="e.g. Operations Manager - Lagos"
                            className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name *</label>
                            <input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                type="text"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name *</label>
                            <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                type="text"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work Email *</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Number *</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                type="text"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: SECURITY CREDENTIALS */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" /> 2. Security & Security Level
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System Password *</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring font-mono tracking-widest"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Authorization Tier *</label>
                            <select
                                value={authorizationLevel}
                                onChange={(e) => setAuthorizationLevel(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background text-foreground font-semibold focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select Level</option>
                                <option value="L1">Super Admin (L1)</option>
                                <option value="L2">Regular Admin (L2)</option>
                                <option value="L3">Restricted Admin (L3)</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-5 bg-muted/30 border border-border rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                            <ShieldAlert className="w-4 h-4" /> Security Note
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <span className="font-bold text-foreground">Tier L1</span> grants unrestricted access to all modules, including financial settlement and system settings. Tier L2 and L3 accounts are restricted to the specific services selected in the next step.
                        </p>
                    </div>
                </div>
            </div>

            {/* SECTION 3: PERMISSIONS GRID */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-primary" /> 3. Service Access Control
                    </h3>
                </div>
                <div className="p-6">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-lg border border-dashed border-border transition-opacity ${authorizationLevel === 'L1' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        {SERVICE_OPTIONS.map((service) => (
                            <label key={service.key} className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-md hover:bg-muted transition-colors cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={authorizationLevel === 'L1' || selectedServices.includes(service.key)}
                                    onChange={() => toggleService(service.key)}
                                    className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                                />
                                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{service.label}</span>
                            </label>
                        ))}
                    </div>
                    {authorizationLevel === 'L1' && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-md w-fit">
                            <ShieldCheck className="w-4 h-4" /> Super Admin overrides service selection.
                        </div>
                    )}
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground italic">Verification Status</span>
                    <span className="text-[10px] text-muted-foreground">Admin ID: <span className="font-mono">{pidAdminUser}</span></span>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                    {isLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Provisioning Account...</>
                    ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Create Administrative Account</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default Page;