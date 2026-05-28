'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  FolderOpen,
  FileText,
  X,
  Palette,
  Tag,
  ArrowLeft,
  Hash,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

interface BlogCategory {
  id: number;
  pidCategory: string;
  categoryName: string;
  categorySlug: string | null;
  categoryDescription: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  categoryOrder: number | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  _count: {
    blogs: number;
  };
}

interface CategoryFormData {
  categoryName: string;
  categoryDescription: string;
  categoryColor: string;
  categoryIcon: string;
  categoryOrder: number;
}

const initialFormData: CategoryFormData = {
  categoryName: '',
  categoryDescription: '',
  categoryColor: '#6366f1',
  categoryIcon: 'folder',
  categoryOrder: 0,
};

const colorOptions = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#64748b', label: 'Slate' },
];

const BlogCategories = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crud/blog-category/fetch');
      const data = await res.json();
      if (data.success) setCategories(data.data);
      else toast.error('Taxonomy sync failed');
    } catch (error) {
      toast.error('Network error during sync');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const filteredCategories = categories.filter((cat) =>
    cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (category: BlogCategory) => {
    setFormData({
      categoryName: category.categoryName,
      categoryDescription: category.categoryDescription || '',
      categoryColor: category.categoryColor || '#6366f1',
      categoryIcon: category.categoryIcon || 'folder',
      categoryOrder: category.categoryOrder || 0,
    });
    setIsEditing(true);
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryName.trim()) return toast.error('Identity name required');
    setSubmitting(true);

    try {
      const url = isEditing ? '/api/crud/blog-category/update' : '/api/crud/blog-category/create';
      const body = isEditing ? { ...formData, pidCategory: editingCategory?.pidCategory } : formData;
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.successx) {
        toast.success(data.responsex.message);
        setIsModalOpen(false);
        fetchCategories();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pidCategory: string) => {
    try {
      const res = await fetch(`/api/crud/blog-category/delete?pidCategory=${pidCategory}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.successx) {
        toast.success('Classification removed');
        setDeleteConfirm(null);
        fetchCategories();
      }
    } catch (error) {
      toast.error('Revocation failed');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Control Bar & Actions */}
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
              placeholder="Search Taxonomy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Category
          </button>
        </div>
      </div>

      {/* 2. Statistical Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Categories', val: categories.length, icon: Layers, color: 'text-primary' },
          { label: 'Manuscript Volume', val: categories.reduce((acc, cat) => acc + cat._count.blogs, 0), icon: FileText, color: 'text-blue-500' },
          { label: 'Active Clusters', val: categories.filter(c => c.status === 'active').length, icon: Activity, color: 'text-emerald-500' }
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

      {/* 3. Taxonomy Ledger Grid */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Synchronizing Archive...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-border border-l border-t border-border">
            {filteredCategories.map((category) => (
              <div
                key={category.pidCategory}
                className="group p-6 hover:bg-muted/30 transition-all duration-300 relative flex flex-col justify-between min-h-[180px]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center ring-1 ring-border/50"
                        style={{ backgroundColor: `${category.categoryColor}15` }}
                      >
                        <Tag className="w-4 h-4" style={{ color: category.categoryColor || '#6366f1' }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {category.categoryName}
                        </h3>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                          UID: {category.pidCategory}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(category)} className="p-2 hover:bg-primary/10 text-primary rounded-md transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(category.pidCategory)} className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {category.categoryDescription || 'No classification briefing provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-foreground uppercase">{category._count.blogs} Posts</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-mono text-muted-foreground">Order: {category.categoryOrder || 0}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Taxonomy Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                {isEditing ? 'Modify Classification' : 'Provision Taxonomy'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category Identity *</label>
                <input
                  type="text"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  placeholder="e.g. Strategic Logistics"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Functional Description</label>
                <textarea
                  value={formData.categoryDescription}
                  onChange={(e) => setFormData({ ...formData, categoryDescription: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Classification briefing..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Palette className="w-3 h-3" /> Brand Accent</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, categoryColor: color.value })}
                        className={`w-6 h-6 rounded-md transition-all ring-offset-2 ring-offset-background ${
                          formData.categoryColor === color.value ? 'ring-2 ring-primary scale-110 shadow-sm' : 'hover:scale-105 opacity-60'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Hash className="w-3 h-3" /> Display Weight</label>
                  <input
                    type="number"
                    value={formData.categoryOrder}
                    onChange={(e) => setFormData({ ...formData, categoryOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 text-sm border border-border rounded-lg bg-background font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted border border-border rounded-lg transition-colors uppercase tracking-widest">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : isEditing ? 'Sync Changes' : 'Provision Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-destructive/20">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Revoke Classification</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed px-4">
                This action is destructive. Associated content will remain, but the taxonomic link will be severed.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-[10px] font-bold text-foreground hover:bg-muted border border-border rounded-lg uppercase tracking-widest transition-colors">Abort</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-destructive/90 transition-all shadow-sm">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal icon for the modal title
const Settings2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
);

export default BlogCategories;