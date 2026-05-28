'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import { 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  Save, 
  RefreshCw,
  Fingerprint,
  Contact
} from 'lucide-react';

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
            
            {/* SECTION 1: ADMINISTRATIVE IDENTITY */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Contact className="w-4 h-4 text-primary" /> 1. Profile Identity
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Account Descriptor *</label>
                        <input
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            type="text"
                            required
                            placeholder="e.g. Operations Lead - West"
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
                    </div>
                </div>
            </div>

            {/* SECTION 2: CONNECTIVITY & SECURITY */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" /> 2. Security & Communication
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Mail className="w-3 h-3" /> Work Email Address *
                            </label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Phone className="w-3 h-3" /> Primary Phone *
                            </label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                type="text"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Fingerprint className="w-3.5 h-3.5" /> Initial Password *
                            </label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="text"
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Authorization Tier *
                            </label>
                            <select
                                value={authorizationLevel}
                                onChange={(e) => setAuthorizationLevel(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background text-foreground font-semibold focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select Security Level</option>
                                <option value="L1">Super Admin (L1)</option>
                                <option value="L2">Regular Admin (L2)</option>
                                <option value="L3">Restricted Admin (L3)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground italic">Administrative Blueprint</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight">System ID: <span className="font-mono">{pidAdminUser}</span></span>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                    {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserPlus className="w-4 h-4" />
                    )}
                    {isLoading ? 'Provisioning Account...' : 'Create Admin Account'}
                </button>
            </div>
        </form>
    );
};

export default Page;