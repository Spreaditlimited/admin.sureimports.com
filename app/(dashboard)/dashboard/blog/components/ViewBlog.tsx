'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Calendar,
  User,
  FileText,
  MoreVertical,
  ExternalLink,
  Copy,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Clock,
  TrendingUp,
  Star,
  Layers,
  ArrowRight,
  Fingerprint,
  Globe
} from 'lucide-react';

interface Blog {
  id: number;
  pidBlog: string;
  blogTitle: string;
  blogContent: string | null;
  blogSlug: string | null;
  blogPublished: boolean;
  blogFeatured: boolean;
  blogImage: string | null;
  blogBy: string | null;
  blogExt1: string | null;
  blogExt2: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ViewMode = 'grid' | 'list';

const ViewBlog = () => {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  });

  const fetchBlogs = useCallback(async (page = 1, search = searchTerm, status = statusFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const res = await fetch(`/api/crud/blog/fetch?${params}`);
      const data = await res.json();

      if (data.success) {
        setBlogs(data.data);
        setPagination(data.pagination);
      } else {
        toast.error('Archive synchronization failed');
      }
    } catch (error) {
      toast.error('Network error during sync');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, pagination.limit]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async (pidBlog: string) => {
    try {
      const res = await fetch(`/api/crud/blog/delete?pidBlog=${pidBlog}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.responsex.status === 'SUCCESS') {
        toast.success('Manuscript purged from archive');
        setDeleteConfirm(null);
        fetchBlogs(pagination.page);
      }
    } catch (error) {
      toast.error('Purge operation failed');
    }
  };

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(`/blog/${slug}`);
    toast.success('URI copied to clipboard');
  };

  const getImageUrl = (imageName: string | null) => {
    if (!imageName) return null;
    if (imageName.startsWith('http')) return imageName;
    return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${imageName}`;
  };

  const stripHtml = (html: string | null) => {
    if (!html) return 'No content provisioned.';
    return html.replace(/<[^>]*>/g, '').substring(0, 120) + '...';
  };

  const getRelativeTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Editorial Archive</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Platform Content Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 mr-2">
            <Link href="/dashboard/blog/categories" className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg bg-card shadow-sm flex items-center gap-2">
              <Layers className="w-3 h-3" /> Taxonomy
            </Link>
            <Link href="/dashboard/blog/publishers" className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg bg-card shadow-sm flex items-center gap-2">
              <User className="w-3 h-3" /> Board
            </Link>
          </div>
          <button onClick={() => fetchBlogs(pagination.page)} className="p-2.5 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/dashboard/blog/create" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" /> New Manuscript
          </Link>
        </div>
      </div>

      {/* 2. Statistical Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Manuscripts', val: pagination.total, icon: FileText, color: 'text-primary' },
          { label: 'Live Content', val: blogs.filter(b => b.blogPublished).length, icon: Globe, color: 'text-emerald-500' },
          { label: 'Manuscript Drafts', val: blogs.filter(b => !b.blogPublished).length, icon: EyeOff, color: 'text-amber-500' },
          { label: 'Recent Activity', val: blogs.length, icon: Clock, color: 'text-blue-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-foreground font-mono">{stat.val}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-muted/50 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Archive Filters */}
      <div className="bg-card border border-border rounded-xl shadow-soft p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archive by title, author or URI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchBlogs(1)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-44">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchBlogs(1, searchTerm, e.target.value); }}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs font-bold uppercase tracking-widest text-foreground appearance-none cursor-pointer"
            >
              <option value="">Status: ALL</option>
              <option value="published">Status: LIVE</option>
              <option value="draft">Status: DRAFT</option>
            </select>
          </div>
          <div className="flex items-center bg-muted/50 border border-border rounded-lg p-1 shrink-0">
             <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid className="w-4 h-4" /></button>
             <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* 4. The Manuscript Vault */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-muted-foreground border border-border rounded-xl bg-card/50">
          <RefreshCw className="w-10 h-10 animate-spin opacity-20" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Synchronizing Archive Metadata...</p>
        </div>
      ) : blogs.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border rounded-xl bg-muted/5">
           <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-sm text-muted-foreground italic px-6">No manuscripts match the current search criteria.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <div key={blog.pidBlog} className="group bg-card border border-border rounded-xl overflow-hidden shadow-soft hover:border-primary/40 transition-all duration-300 flex flex-col">
              <div className="relative h-44 bg-muted overflow-hidden">
                {getImageUrl(blog.blogImage) ? (
                  <img src={getImageUrl(blog.blogImage)!} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon className="w-12 h-12" /></div>
                )}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                   <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border backdrop-blur-md ${blog.blogPublished ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {blog.blogPublished ? 'Live' : 'Draft'}
                   </span>
                   {blog.blogFeatured && <Star className="w-4 h-4 fill-amber-500 text-amber-500 drop-shadow-sm" />}
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground uppercase tracking-tight">
                      <Fingerprint className="w-3 h-3" /> {blog.pidBlog}
                   </div>
                   <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                      {blog.blogTitle}
                   </h3>
                   <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
                      "{stripHtml(blog.blogContent)}"
                   </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {blog.blogBy || 'Admin'}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {getRelativeTime(blog.createdAt)}</div>
                   </div>
                   <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/dashboard/blog/edit?pidBlog=${blog.pidBlog}`)} className="p-2 hover:bg-primary/10 text-primary rounded-md transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(blog.pidBlog)} className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
           <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <tr>
                    <th className="px-6 py-4">Manuscript Information</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Identity</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-border">
                 {blogs.map((blog) => (
                    <tr key={blog.pidBlog} className="hover:bg-muted/30 transition-colors">
                       <td className="px-6 py-4 max-w-md">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border">
                                {getImageUrl(blog.blogImage) ? <img src={getImageUrl(blog.blogImage)!} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 m-auto opacity-10" />}
                             </div>
                             <div className="min-w-0">
                                <h4 className="font-bold text-foreground truncate">{blog.blogTitle}</h4>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                                   <Calendar className="w-3 h-3" /> {new Date(blog.createdAt!).toLocaleDateString()}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${blog.blogPublished ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                             {blog.blogPublished ? 'Live' : 'Draft'}
                          </span>
                       </td>
                       <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
                          {blog.pidBlog}
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                             <button onClick={() => router.push(`/dashboard/blog/edit?pidBlog=${blog.pidBlog}`)} className="p-2 hover:bg-primary/10 text-primary rounded-md transition-colors"><Edit3 className="w-4 h-4" /></button>
                             <button onClick={() => setDeleteConfirm(blog.pidBlog)} className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* 5. Pagination Ledger */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Indexing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-foreground">{pagination.total}</span> Manuscripts
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchBlogs(pagination.page - 1)} disabled={pagination.page === 1} className="p-2 border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-1">
               {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(num => (
                 <button key={num} onClick={() => fetchBlogs(num)} className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all ${pagination.page === num ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}>{num}</button>
               ))}
            </div>
            <button onClick={() => fetchBlogs(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="p-2 border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* 6. Revocation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in zoom-in-95 duration-200 px-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-destructive/20">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Confirm Manuscript Purge</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This operation is final. The record and associated media will be permanently decoupled from the global archive.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-[10px] font-bold text-foreground hover:bg-muted border border-border rounded-lg uppercase tracking-widest">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-destructive text-white text-[10px] font-bold rounded-lg uppercase tracking-widest shadow-sm">Confirm Purge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewBlog;