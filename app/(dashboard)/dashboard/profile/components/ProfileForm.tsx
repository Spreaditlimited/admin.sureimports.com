'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Fingerprint,
  Contact,
  Camera,
  UploadCloud,
  ImageIcon
} from 'lucide-react';

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const cloudinaryBase = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL?.trim() || '';
  
  const [form, setForm] = useState({
    userEmail: '',
    userFirstname: '',
    userLastname: '',
    userPhone: '',
    userImage: '',
    userStatus: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/admin/profile', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || data?.statusx !== 'SUCCESS') throw new Error(data?.message || 'Failed to load profile');
        
        setForm({
          userEmail: data.data.userEmail || '',
          userFirstname: data.data.userFirstname || '',
          userLastname: data.data.userLastname || '',
          userPhone: data.data.userPhone ? String(data.data.userPhone) : '',
          userImage: data.data.userImage || '',
          userStatus: data.data.userStatus || '',
        });
        const img = data.data.userImage || '';
        const isAbsolute = /^https?:\/\//i.test(img);
        setImagePreview(img ? (isAbsolute ? img : `${cloudinaryBase}/${img}`) : '');
      } catch (e: any) {
        toast.error(e.message || 'Synchronization failed');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [cloudinaryBase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('userFirstname', form.userFirstname);
      payload.append('userLastname', form.userLastname);
      payload.append('userPhone', form.userPhone);
      if (imageFile) payload.append('image', imageFile);

      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        body: payload,
      });
      const data = await res.json();
      if (!res.ok || data?.statusx !== 'SUCCESS') throw new Error(data?.message || 'Failed to update profile');
      
      if (data?.cloudinarySync?.publicId) {
        toast.success(`Image synced: ${data.cloudinarySync.publicId}`);
      } else {
        toast.success('Security profile synchronized');
      }

      if (data?.data?.userImage) {
        const isAbsolute = /^https?:\/\//i.test(data.data.userImage);
        setImagePreview(isAbsolute ? data.data.userImage : `${cloudinaryBase}/${data.data.userImage}`);
      }
      setImageFile(null);
      window.dispatchEvent(new Event('auth-refresh'));
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-sm text-muted-foreground animate-pulse">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Authenticating session data...
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-4xl">
      
      {/* SECTION 1: PERSONAL IDENTITY */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Contact className="w-4 h-4 text-primary" /> 1. Personal Identity
          </h3>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* AVATAR SHOWCASE UPLOAD */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="h-32 w-32 rounded-full border-4 border-background shadow-md overflow-hidden bg-muted flex items-center justify-center ring-1 ring-border">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground/40" />
                  )}
                </div>
                {/* Overlay Trigger */}
                <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-[10px] text-white font-bold uppercase tracking-tighter">Update</span>
                </div>
                {/* Small Action Badge */}
                <div className="absolute bottom-1 right-1 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground border-2 border-background shadow-sm">
                  <UploadCloud className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profile Showcase</p>
                <p className="text-[9px] text-muted-foreground italic">JPG, PNG or WEBP (Max 2MB)</p>
              </div>

              {/* Hidden Actual Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (!file) return;
                  const previewUrl = URL.createObjectURL(file);
                  setImagePreview(previewUrl);
                }}
              />
            </div>

            {/* FORM FIELDS */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3 h-3" /> First Name
                  </label>
                  <input
                    className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                    value={form.userFirstname}
                    onChange={(e) => setForm((s) => ({ ...s, userFirstname: e.target.value }))}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name</label>
                  <input
                    className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                    value={form.userLastname}
                    onChange={(e) => setForm((s) => ({ ...s, userLastname: e.target.value }))}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Contact Number
                </label>
                <input
                  className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-mono"
                  value={form.userPhone}
                  onChange={(e) => setForm((s) => ({ ...s, userPhone: e.target.value }))}
                  placeholder="+234..."
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION 2: SYSTEM CREDENTIALS (READ-ONLY) */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-primary" /> 2. Account Meta
          </h3>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Work Email
            </label>
            <div className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-muted text-muted-foreground flex items-center gap-2 cursor-not-allowed">
              <Mail className="w-3.5 h-3.5" />
              {form.userEmail}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Authorization Status
            </label>
            <div className="w-full px-4 py-2.5 text-xs border border-input rounded-md bg-muted text-primary font-bold uppercase tracking-widest flex items-center gap-2 select-none">
              <ShieldCheck className="w-3.5 h-3.5" />
              {form.userStatus || 'Active Admin'}
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-full">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <p className="text-[10px] text-muted-foreground italic max-w-[200px]">
            Updating your profile syncs your identity across all audit logs.
          </p>
        </div>

        <button 
          disabled={saving} 
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing Details...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Profile Specs</>
          )}
        </button>
      </div>
    </form>
  );
}
