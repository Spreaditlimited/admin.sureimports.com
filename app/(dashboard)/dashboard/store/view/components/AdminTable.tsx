'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Trash2, 
  Mail, 
  Phone, 
  RefreshCw, 
  Search, 
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

interface AdminProps {
  id: number;
  pidUser: string; 
  userFirstname: string; // Corrected from number to string
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

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Logic assumes the API supports search/page; if not, it filters local data
      const response = await fetch(`/api/get-data/admin`);
      const data = await response.json();
      
      // Handle array or paginated response structure
      const list = Array.isArray(data) ? data : data.data || [];
      setAdminUsers(list);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('Failed to sync administrative accounts');
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleDelete = async (pidUser: string) => {
    if (!confirm("Are you sure you want to revoke this admin's access?")) return;
    
    toast.info('Revoking access...');
    try {
      const response = await fetch(`/api/crud/admin/delete?pidUser=${pidUser}`);
      const data = await response.json();

      if (data.statusx === 'SUCCESS') {
        navigateWithAlert('/dashboard/admin', 'success', 'Admin access revoked successfully');
        fetchAdmins();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (err) {
      toast.error('A network error occurred');
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const getRoleBadge = (status: string) => {
    const s = status?.toLowerCase() || 'admin';
    let style = 'bg-muted text-muted-foreground border-border';
    
    if (s === 'superadmin') style = 'bg-primary/10 text-primary border-primary/20 font-bold';
    else if (s === 'admin') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${style}`}>
        {s === 'superadmin' && <ShieldCheck className="w-3 h-3" />}
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Top Control Bar */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or ID..."
            className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchAdmins}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm font-bold hover:bg-muted transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button 
            onClick={() => router.push('/dashboard/admin/add')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
        </div>
      </div>

      {/* 2. Main Table Ledger */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 w-16 text-center">S/N</th>
                <th className="px-6 py-4">Administrative Identity</th>
                <th className="px-6 py-4">Contact & Access Level</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground/40 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Syncing accounts...</p>
                  </td>
                </tr>
              ) : adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground italic">
                    No administrative records found.
                  </td>
                </tr>
              ) : (
                adminUsers.map((user, index) => (
                  <tr key={user.pidUser} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-center text-muted-foreground font-medium">
                      {(page - 1) * 10 + index + 1}
                    </td>
                    
                    {/* Identity Cell */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-foreground">
                             {user.userFirstname} {user.userLastname}
                           </span>
                           {getRoleBadge(user.userStatus)}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                           ID: {user.pidUser}
                        </span>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-tight mt-1">
                           Account: {user.userExt1 || 'SYSTEM'}
                        </span>
                      </div>
                    </td>

                    {/* Contact Cell */}
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                           <Mail className="w-3 h-3 text-muted-foreground" />
                           {user.userEmail}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                           <Phone className="w-3 h-3" />
                           {user.userPhone || 'Not provided'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 italic">
                           <Calendar className="w-3 h-3" />
                           Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    {/* Actions Cell */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.userStatus !== 'superadmin' ? (
                          <button 
                            onClick={() => handleDelete(user.pidUser)}
                            className="p-2 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-md transition-colors border border-destructive/10"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="p-2 text-muted-foreground cursor-not-allowed opacity-30" title="Superadmins cannot be deleted">
                             <Shield className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-bold text-foreground">{page}</span> of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2 border border-border rounded-md bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 border border-border rounded-md bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
