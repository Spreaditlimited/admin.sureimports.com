'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  X,
  ArrowLeft,
  Upload,
  Mail,
  Globe,
  User,
  Briefcase,
  Camera,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Calendar,
  Fingerprint,
  MoreHorizontal,
  ShieldCheck
} from 'lucide-react';

interface BlogPublisher {
  id: number;
  pidPublisher: string;
  publisherName: string;
  publisherSlug: string | null;
  publisherEmail: string | null;
  publisherBio: string | null;
  publisherRole: string | null;
  publisherImage: string | null;
  publisherSocialX: string | null;
  publisherSocialLinkedin: string | null;
  publisherSocialFacebook: string | null;
  publisherSocialInstagram: string | null;
  publisherWebsite: string | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  _count: {
    blogs: number;
  };
}

interface PublisherFormData {
  publisherName: string;
  publisherEmail: string;
  publisherBio: string;
  publisherRole: string;
  publisherSocialX: string;
  publisherSocialLinkedin: string;
  publisherSocialFacebook: string;
  publisherSocialInstagram: string;
  publisherWebsite: string;
}

const initialFormData: PublisherFormData = {
  publisherName: '',
  publisherEmail: '',
  publisherBio: '',
  publisherRole: '',
  publisherSocialX: '',
  publisherSocialLinkedin: '',
  publisherSocialFacebook: '',
  publisherSocialInstagram: '',
  publisherWebsite: '',
};

const BlogPublishers = () => {
  const [publishers, setPublishers] = useState<BlogPublisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<BlogPublisher | null>(null);
  const [formData, setFormData] = useState<PublisherFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPublishers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crud/blog-publisher/fetch');
      const data = await res.json();
      if (data.successx) setPublishers(data.data);
      else toast.error('Editorial Board sync failed');
    } catch (error) {
      toast.error('Network error during sync');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPublishers(); }, [fetchPublishers]);

  const filteredPublishers = publishers.filter((pub) =>
    pub.publisherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.publisherEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.publisherRole?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getImageUrl = (imageName: string | null) => {
    if (!imageName) return null;
    if (imageName.startsWith('http')) return imageName;
    return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${imageName}`;
  };

  const openCreateModal = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (publisher: BlogPublisher) => {
    setFormData({
      publisherName: publisher.publisherName,
      publisherEmail: publisher.publisherEmail || '',
      publisherBio: publisher.publisherBio || '',
      publisherRole: publisher.publisherRole || '',
      publisherSocialX: publisher.publisherSocialX || '',
      publisherSocialLinkedin: publisher.publisherSocialLinkedin || '',
      publisherSocialFacebook: publisher.publisherSocialFacebook || '',
      publisherSocialInstagram: publisher.publisherSocialInstagram || '',
      publisherWebsite: publisher.publisherWebsite || '',
    });
    setIsEditing(true);
    setEditingPublisher(publisher);
    setImagePreview(publisher.publisherImage ? getImageUrl(publisher.publisherImage) : null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast.error('Signature image must be under 2MB');
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.publisherName.trim()) return toast.error('Identity name required');
    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, val]) => formDataObj.append(key, val));
      if (imageFile) formDataObj.append('image', imageFile);
      if (isEditing && editingPublisher) formDataObj.append('pidPublisher', editingPublisher.pidPublisher);

      const res = await fetch(isEditing ? '/api/crud/blog-publisher/update' : '/api/crud/blog-publisher/create', {
        method: isEditing ? 'PUT' : 'POST',
        body: formDataObj,
      });

      const data = await res.json();
      if (data.successx) {
        toast.success(data.responsex.message);
        setIsModalOpen(false);
        fetchPublishers();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pidPublisher: string) => {
    try {
      const res = await fetch(`/api/crud/blog-publisher/delete?pidPublisher=${encodeURIComponent(pidPublisher)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data?.successx) {
        throw new Error(data?.responsex?.message || 'Failed to revoke publisher');
      }
      toast.success(data?.responsex?.message || 'Publisher removed');
      setDeleteConfirm(null);
      fetchPublishers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke publisher');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Control Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/blog/view"
            className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Editorial Board..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchPublishers} className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" /> Add Publisher
          </button>
        </div>
      </div>

      {/* 2. Board Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Board Members', val: publishers.length, icon: Users, color: 'text-primary' },
          { label: 'Cumulative Posts', val: publishers.reduce((acc, pub) => acc + pub._count.blogs, 0), icon: FileText, color: 'text-blue-500' },
          { label: 'Active Authors', val: publishers.filter(p => p.status === 'active').length, icon: ShieldCheck, color: 'text-emerald-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{stat.val}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-muted/50 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Publisher Ledger Grid */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Syncing Board Metadata...</p>
          </div>
        ) : filteredPublishers.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <Users className="w-12 h-12 text-muted-foreground/20 mx-auto" />
             <p className="text-sm text-muted-foreground italic">No editorial members found in the current ledger.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-border border-l border-t border-border">
            {filteredPublishers.map((publisher) => (
              <div key={publisher.pidPublisher} className="group p-6 hover:bg-muted/30 transition-all duration-300 relative flex flex-col justify-between min-h-[260px]">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-border bg-muted shrink-0">
                        {getImageUrl(publisher.publisherImage) ? (
                          <img src={getImageUrl(publisher.publisherImage)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><User className="w-6 h-6" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {publisher.publisherName}
                        </h3>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter truncate">
                          UID: {publisher.pidPublisher}
                        </p>
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-bold uppercase rounded border border-primary/10">
                          <Briefcase className="w-2.5 h-2.5" /> {publisher.publisherRole || 'Author'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(publisher)} className="p-2 hover:bg-primary/10 text-primary rounded-md transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(publisher.pidPublisher)} className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {publisher.publisherBio || 'No editorial briefing provided.'}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    {publisher.publisherEmail && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Mail className="w-3 h-3" /> <span className="truncate">{publisher.publisherEmail}</span>
                      </div>
                    )}
                    {publisher.publisherWebsite && (
                      <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                        <Globe className="w-3 h-3" /> <span className="truncate">{publisher.publisherWebsite.replace(/https?:\/\//, '')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-foreground uppercase">{publisher._count.blogs} Manuscripts</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{new Date(publisher.createdAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Publisher Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm overflow-y-auto py-10 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {isEditing ? 'Modify Editorial Signature' : 'Provision New Author'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Author Signature Image */}
                <div className="flex flex-col items-center gap-4">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-32 h-32 rounded-2xl overflow-hidden bg-muted border-2 border-border shadow-inner flex items-center justify-center ring-1 ring-primary/5">
                      {imagePreview ? (
                        <img src={imagePreview} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <User className="w-10 h-10 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Camera className="w-6 h-6 text-white mb-1" />
                       <span className="text-[9px] text-white font-bold uppercase">Signature</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary rounded-full border-2 border-background flex items-center justify-center shadow-lg">
                       <Upload className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <p className="text-[9px] text-muted-foreground italic text-center leading-tight">Portrait Signature<br/>Max 2MB (JPG/PNG)</p>
                </div>

                {/* Primary Identity */}
                <div className="flex-1 space-y-5">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Editorial Name *</label>
                      <input
                        required
                        value={formData.publisherName}
                        onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="e.g. Elena Vance"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Board Role</label>
                        <input
                          value={formData.publisherRole}
                          onChange={(e) => setFormData({ ...formData, publisherRole: e.target.value })}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground"
                          placeholder="e.g. Senior Strategist"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work Email</label>
                        <input
                          type="email"
                          value={formData.publisherEmail}
                          onChange={(e) => setFormData({ ...formData, publisherEmail: e.target.value })}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground"
                          placeholder="elena@sureimports.com"
                        />
                      </div>
                   </div>
                </div>
              </div>

              {/* Editorial Briefing */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author Biography / Briefing</label>
                <textarea
                  value={formData.publisherBio}
                  onChange={(e) => setFormData({ ...formData, publisherBio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Professional biography for manuscript attribution..."
                />
              </div>

              {/* Connectivity Ledger */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <LinkIcon className="w-3.5 h-3.5 text-primary" />
                   <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">Connectivity Ledger</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Globe, key: 'publisherWebsite', label: 'Personal Website' },
                    { icon: Twitter, key: 'publisherSocialX', label: 'X (Twitter) Profile' },
                    { icon: Linkedin, key: 'publisherSocialLinkedin', label: 'LinkedIn Handle' },
                    { icon: Instagram, key: 'publisherSocialInstagram', label: 'Instagram Profile' },
                  ].map((field) => (
                    <div key={field.key} className="relative group">
                       <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                       <input
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder={field.label}
                       />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-xs font-bold text-foreground hover:bg-muted border border-border rounded-lg transition-colors uppercase tracking-widest">Abort</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : isEditing ? 'Sync Editorial Record' : 'Provision Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Revocation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-destructive/20">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Revoke Board Privileges</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed px-4">
                This will remove the author from the global board. Manuscripts attributed to this publisher will remain but link to a generic attribution.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-[10px] font-bold text-foreground hover:bg-muted border border-border rounded-lg uppercase tracking-widest transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-destructive/90 transition-all shadow-sm">Confirm Revocation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPublishers;
