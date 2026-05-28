'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  Key, 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  Save, 
  ShieldAlert,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    const loadSyncMeta = async () => {
      try {
        const res = await fetch('/api/admin/settings/password', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data?.statusx === 'SUCCESS') {
          setLastSyncAt(data?.data?.lastSyncAt || null);
        }
      } catch {
        // no-op
      }
    };
    loadSyncMeta();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data?.statusx !== 'SUCCESS') throw new Error(data?.message || 'Failed to update password');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLastSyncAt(data?.data?.lastSyncAt || new Date().toISOString());
      toast.success('Security credentials synchronized');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={onSubmit} className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        
        {/* CHAPTER HEADER */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Security Protocol
          </h3>
          <button 
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-[10px] font-bold text-muted-foreground uppercase hover:text-primary transition-colors flex items-center gap-1.5"
          >
            {showPasswords ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Reveal</>}
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Key className="w-3 h-3" /> Current Credentials
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-mono tracking-widest"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Security Key</label>
              <input
                type={showPasswords ? "text" : "password"}
                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-mono tracking-widest"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verify New Key</label>
              <input
                type={showPasswords ? "text" : "password"}
                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-mono tracking-widest"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* SECURITY ADVISORY */}
          <div className="flex gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-tight">Access Control Update</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Passwords must be at least <span className="font-bold text-foreground">8 characters</span>. Avoid using common phrases or recycle old credentials. Updating your password will invalidate all other active administrative sessions.
              </p>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="px-6 py-4 bg-muted/10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
            <Info className="w-3.5 h-3.5" /> Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}
          </div>
          
          <button 
            disabled={saving} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Updating Credentials...</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Update Admin Key</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
