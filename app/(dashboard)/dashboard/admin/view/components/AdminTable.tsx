'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Trash2, 
  Mail, 
  Phone, 
  RefreshCw, 
  Search, 
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  X,
  Save,
  Lock,
  UserCog
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

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

interface AdminProps {
  id: number;
  pidUser: string; 
  userFirstname: string; 
  userLastname: string;
  userEmail: string; 
  userPhone: string; 
  userStatus: string; 
  userExt1: string;
  createdAt: string;
}

export default function AdminTable() {
  const router = useRouter();
  const navigateWithAlert = useNavigationWithAlert();
      
  const [adminUsers, setAdminUsers] = useState<AdminProps[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Permissions State
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(false);
  const [permissionsSaving, setPermissionsSaving] = useState<boolean>(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/get-data/admin`);
      const responseData = await response.json();
      let rows: AdminProps[] = [];

      // Support both legacy array response and wrapped API response shapes.
      if (Array.isArray(responseData)) {
        rows = responseData;
      } else if (responseData?.statusx === 'SUCCESS' && Array.isArray(responseData?.data)) {
        rows = responseData.data;
      } else if (responseData?.statusx === 'FORBIDDEN' || responseData?.statusx === 'UNAUTHORIZED') {
        throw new Error(responseData?.message || 'Access denied');
      } else {
        throw new Error('Unexpected admin response format');
      }

      setAdminUsers(rows);
      setTotalPages(1);
    } catch (err) {
      setError('Failed to sync administrative ledger');
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleDelete = async (pidUser: string) => {
    if (!confirm("Are you sure you want to revoke this admin's access?")) return;
    toast.info('Revoking access...');
    try {
      const res = await fetch(`/api/crud/admin/delete?pidUser=${pidUser}`);
      const data = await res.json();
      if (data.statusx === 'SUCCESS') {
        navigateWithAlert('/dashboard/admin/view', 'success', 'Admin removed');
        fetchAdmins();
      }
    } catch (err) {
      toast.error('Revocation failed');
    }
  };

  const openPermissionsEditor = async (pidUser: string, userStatus: string) => {
    if (userStatus === 'L1' || userStatus === 'superadmin') {
      toast.info('Super Admins possess implicit global access');
      return;
    }
    setPermissionsLoading(true);
    try {
      const res = await fetch(`/api/crud/admin/permissions?pidUser=${encodeURIComponent(pidUser)}`);
      const data = await res.json();
      if (data.statusx === 'SUCCESS') {
        const keys = Array.isArray(data.permissions)
          ? data.permissions.filter((p: any) => p.canView).map((p: any) => p.serviceKey)
          : [];
        setSelectedServices(keys);
        setEditingPermissionsFor(pidUser);
      }
    } finally {
      setPermissionsLoading(false);
    }
  };

  const savePermissions = async () => {
    if (!editingPermissionsFor) return;
    setPermissionsSaving(true);
    try {
      const res = await fetch('/api/crud/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pidUser: editingPermissionsFor, serviceKeys: selectedServices }),
      });
      const data = await res.json();
      if (data.statusx === 'SUCCESS') {
        toast.success('Access privileges synchronized');
        setEditingPermissionsFor(null);
      }
    } finally {
      setPermissionsSaving(false);
    }
  };

  const toggleService = (key: string) => {
    setSelectedServices(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const getRoleBadge = (status: string) => {
    const s = status?.toLowerCase() || 'admin';
    let style = 'bg-muted text-muted-foreground border-border';
    if (s === 'superadmin' || s === 'l1') style = 'bg-primary/10 text-primary border-primary/20 font-bold';
    else if (s === 'l2') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider border ${style}`}>
        {(s === 'superadmin' || s === 'l1') && <ShieldCheck className="w-2.5 h-2.5" />}
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Control Bar */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins by name, email or ID..."
            className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
            <button onClick={fetchAdmins} className="p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => router.push('/dashboard/admin/add')} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-sm hover:bg-primary/90 transition-all">
                <Plus className="w-4 h-4" /> Add Admin
            </button>
        </div>
      </div>

      {/* 2. Main Ledger */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        {error && (
          <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 w-16 text-center">S/N</th>
                <th className="px-6 py-4">Security Identity</th>
                <th className="px-6 py-4">Contact & Access</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-20 text-center"><RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin mx-auto" /></td></tr>
              ) : adminUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-20 text-center text-muted-foreground italic">No administrative accounts found.</td></tr>
              ) : (
                adminUsers.map((user, index) => (
                  <Fragment key={user.pidUser}>
                    <tr className={`hover:bg-muted/30 transition-colors ${editingPermissionsFor === user.pidUser ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4 text-center text-muted-foreground font-medium">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-foreground">{user.userFirstname} {user.userLastname}</span>
                             {getRoleBadge(user.userStatus)}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">ID: {user.pidUser}</span>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-tight mt-1">Account: {user.userExt1 || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-foreground font-medium truncate">
                             <Mail className="w-3 h-3 text-muted-foreground" /> {user.userEmail}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                             <Phone className="w-3 h-3" /> {user.userPhone || 'No phone linked'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 italic border-t border-border/50">
                             <Calendar className="w-3 h-3" /> Provisioned: {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openPermissionsEditor(user.pidUser, user.userStatus)}
                            disabled={permissionsLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border hover:bg-muted text-primary rounded-md text-xs font-bold transition-all shadow-sm"
                          >
                            <UserCog className="w-3.5 h-3.5" /> ACL
                          </button>
                          {user.userStatus !== 'superadmin' && (
                            <button onClick={() => handleDelete(user.pidUser)} className="p-2 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-md transition-colors border border-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Permissions Interface */}
                    {editingPermissionsFor === user.pidUser && (
                      <tr>
                        <td colSpan={4} className="p-0 animate-in slide-in-from-top-2 duration-300">
                          <div className="m-4 bg-muted/30 border border-border rounded-xl shadow-inner overflow-hidden">
                            <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4 text-primary" />
                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">Access Control Ledger: <span className="text-primary font-mono">{user.userFirstname}</span></h4>
                                </div>
                                <button onClick={() => setEditingPermissionsFor(null)} className="p-1 hover:bg-muted rounded text-muted-foreground"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {SERVICE_OPTIONS.map((service) => (
                                  <label key={service.key} className="flex items-center gap-3 p-3 bg-card border border-border rounded-md hover:border-primary/40 transition-all cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={selectedServices.includes(service.key)}
                                      onChange={() => toggleService(service.key)}
                                      className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{service.label}</span>
                                  </label>
                                ))}
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-border">
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                                    <Lock className="w-3 h-3" /> Changes take effect on next user session.
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingPermissionsFor(null)} className="px-4 py-2 text-xs font-bold text-foreground hover:bg-muted rounded-md transition-colors">Cancel</button>
                                  <button
                                    onClick={savePermissions}
                                    disabled={permissionsSaving}
                                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm hover:bg-primary/90 transition-all"
                                  >
                                    {permissionsSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Sync Privileges
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">Page <span className="text-foreground font-bold">{page}</span> of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="p-2 border border-border rounded-md bg-card hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="p-2 border border-border rounded-md bg-card hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
