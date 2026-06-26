'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Save,
  Eye,
  EyeOff,
  FileText,
  User,
  Video,
  Image as ImageIcon,
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Search,
  Globe,
  Tag,
  Link2,
  Share2,
  CheckCircle2,
  AlertCircle,
  Info,
  FolderOpen,
  Star,
  RefreshCw,
  ShieldCheck,
  CloudUpload,
  Calendar,
  MousePointer2,
  LayoutDashboard
} from 'lucide-react';
import ImageBox from '@/componentsx/ImageBox';
import dynamic from 'next/dynamic';
import { getBlogImageUrl } from '@/lib/blogImage';

const BlogEditor = dynamic(() => import('@/components/blog-editor/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-muted rounded-lg h-96 flex flex-col items-center justify-center gap-3">
      <RefreshCw className="w-8 h-8 text-muted-foreground/20 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Re-initializing Editorial Engine...</span>
    </div>
  ),
});

// [Interfaces preserved from your original code]
interface Blog { id: number; pidBlog: string; blogTitle: string; blogContent: string | null; blogSlug: string | null; blogPublished: boolean; blogFeatured: boolean; blogImage: string | null; blogBy: string | null; blogExt1: string | null; blogExt2: string | null; categoryId: string | null; publisherId: string | null; createdAt: string | null; updatedAt: string | null; }
interface BlogCategory { pidCategory: string; categoryName: string; categorySlug: string | null; categoryColor: string | null; status: string | null; }
interface BlogPublisher { pidPublisher: string; publisherName: string; publisherRole: string | null; publisherImage: string | null; status: string | null; }
interface ApiResponse { responsex: any; successx: boolean; data?: any; }
interface SeoData { metaTitle: string; metaDescription: string; focusKeyword: string; keywords: string[]; canonicalUrl: string; ogTitle: string; ogDescription: string; twitterTitle: string; twitterDescription: string; noIndex: boolean; noFollow: boolean; }

const defaultSeoData: SeoData = { metaTitle: '', metaDescription: '', focusKeyword: '', keywords: [], canonicalUrl: '', ogTitle: '', ogDescription: '', twitterTitle: '', twitterDescription: '', noIndex: false, noFollow: false };
const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
  'https://www.sureimports.com';

const EditBlogForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pidBlog = searchParams.get('pidBlog');

  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBlog, setLoadingBlog] = useState(true);
  const [existingImage, setExistingImage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSeoSection, setShowSeoSection] = useState(true);
  const [seoTab, setSeoTab] = useState<'general' | 'social' | 'advanced'>('general');
  const [blogData, setBlogData] = useState<Blog | null>(null);

  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogBy, setBlogBy] = useState('Admin');
  const [blogPublished, setBlogPublished] = useState(false);
  const [blogFeatured, setBlogFeatured] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [blogSlug, setBlogSlug] = useState('');

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [publishers, setPublishers] = useState<BlogPublisher[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('');
  const [loadingPublishers, setLoadingPublishers] = useState(true);

  const [seoData, setSeoData] = useState<SeoData>(defaultSeoData);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedImagePreview, setSelectedImagePreview] = useState('');

  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const [catRes, pubRes] = await Promise.all([
          fetch('/api/crud/blog-category/fetch'),
          fetch('/api/crud/blog-publisher/fetch')
        ]);
        const catData = await catRes.json();
        const pubData = await pubRes.json();
        if (catData.success) setCategories(catData.data);
        if (pubData.successx) setPublishers(pubData.data.filter((p: BlogPublisher) => p.status === 'active'));
      } finally { setLoadingCategories(false); setLoadingPublishers(false); }
    };
    fetchAuxData();
  }, []);

  useEffect(() => {
    if (pidBlog) fetchBlog();
    else { toast.error('Archive Reference Missing'); router.push('/dashboard/blog/view'); }
  }, [pidBlog]);

  const fetchBlog = async () => {
    try {
      const res = await fetch(`/api/crud/blog/fetch-single?pidBlog=${pidBlog}`);
      const data = await res.json();
      if (data.success && data.data) {
        const blog: Blog = data.data;
        setBlogData(blog);
        setBlogTitle(blog.blogTitle);
        setBlogContent(blog.blogContent || '');
        setBlogBy(blog.blogBy || 'Admin');
        setBlogPublished(blog.blogPublished);
        setBlogFeatured(blog.blogFeatured || false);
        setVideoUrl(blog.blogExt1 || '');
        setExistingImage(blog.blogImage || '');
        setBlogSlug(blog.blogSlug || '');
        setSelectedCategory(blog.categoryId || '');
        setSelectedPublisher(blog.publisherId || '');
        if (blog.blogExt2) {
          try {
            const parsedSeo = JSON.parse(blog.blogExt2);
            setSeoData({ ...defaultSeoData, ...parsedSeo, keywords: Array.isArray(parsedSeo.keywords) ? parsedSeo.keywords : [] });
          } catch { setSeoData({ ...defaultSeoData, metaDescription: blog.blogExt2 }); }
        }
      }
    } finally { setLoadingBlog(false); }
  };

  useEffect(() => {
    if (!file) {
      setSelectedImagePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleImageChange = (file: File) => setFile(file);
  const handleEditorChange = useCallback((content: string) => setBlogContent(content), []);
  const updateSeoField = (field: keyof SeoData, value: string | boolean | string[]) => setSeoData((prev) => ({ ...prev, [field]: value }));

  const addKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !seoData.keywords.includes(keyword) && seoData.keywords.length < 10) {
      updateSeoField('keywords', [...seoData.keywords, keyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => updateSeoField('keywords', seoData.keywords.filter((k) => k !== keyword));
  const handleKeywordKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); } };

  const seoScore = useMemo(() => {
    let score = 0;
    const checks: { passed: boolean; message: string; importance: 'high' | 'medium' | 'low' }[] = [];
    const metaTitle = seoData.metaTitle || blogTitle;
    if (metaTitle.length > 0) { score += 10; checks.push({ passed: true, message: 'Title Provisioned', importance: 'high' }); }
    if (metaTitle.length >= 30 && metaTitle.length <= 60) { score += 10; checks.push({ passed: true, message: 'Optimal Title Scope', importance: 'medium' }); }
    const metaDesc = seoData.metaDescription;
    if (metaDesc.length >= 120 && metaDesc.length <= 160) { score += 25; checks.push({ passed: true, message: 'Optimal Abstract Length', importance: 'high' }); }
    if (seoData.focusKeyword.length > 0) {
      score += 15;
      if (metaTitle.toLowerCase().includes(seoData.focusKeyword.toLowerCase())) score += 10;
    }
    const contentText = blogContent.replace(/<[^>]*>/g, '');
    const wordCount = contentText.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) { score += 10; checks.push({ passed: true, message: 'Substantial Word Count', importance: 'medium' }); }
    return { score: Math.min(score, 100), checks };
  }, [seoData, blogTitle, blogContent]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const seoJsonData = JSON.stringify({ ...seoData, metaTitle: seoData.metaTitle || blogTitle.trim() });
    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('pidBlog', pidBlog!);
    formData.append('blogTitle', blogTitle.trim());
    formData.append('blogContent', blogContent);
    formData.append('blogPublished', blogPublished.toString());
    formData.append('blogFeatured', blogFeatured.toString());
    formData.append('blogExt1', videoUrl.trim());
    formData.append('blogExt2', seoJsonData);
    if (selectedCategory) formData.append('categoryId', selectedCategory);
    if (selectedPublisher) formData.append('publisherId', selectedPublisher);

    try {
      const res = await fetch('/api/crud/blog/update', { method: 'PUT', body: formData });
      const data = await res.json();
      if (data.responsex.status === 'SUCCESS') {
        toast.success('Manuscript Synchronized');
        router.push('/dashboard/blog/view');
      }
    } finally { setIsLoading(false); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/crud/blog/delete?pidBlog=${pidBlog}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.responsex.status === 'SUCCESS') { toast.success('Manuscript Purged'); router.push('/dashboard/blog/view'); }
  };

  const getImageUrl = (imageName: string | null) => {
    return getBlogImageUrl(imageName, '/assets/images/default-blog.jpg') || '/assets/images/default-blog.jpg';
  };

  const previewImageUrl = selectedImagePreview || getImageUrl(existingImage);
  const publicPreviewUrl = blogSlug
    ? `${publicSiteUrl}/blog/${blogSlug}`
    : '';

  if (loadingBlog) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
        <RefreshCw className="w-10 h-10 text-primary/20 animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Retrieving Manuscript Archive...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Page Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/blog/view')} className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Manuscript Revision</h1>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
               <span>UID: {pidBlog}</span>
               <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Updated: {new Date(blogData?.updatedAt!).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-lg text-xs font-bold uppercase tracking-tight hover:bg-muted transition-all"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Preview
          </button>
          {publicPreviewUrl && (
            <a href={publicPreviewUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted text-primary transition-all">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <div className="h-8 w-px bg-border mx-2" />
          <button
            form="blog-form"
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Commit Sync
          </button>
        </div>
      </div>

      <form id="blog-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: MANUSCRIPT EDITOR */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
               <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                 <LayoutDashboard className="w-3.5 h-3.5" /> Identity & Content
               </label>
            </div>
            <div className="p-6 space-y-6">
              <input
                required
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                placeholder="Manuscript Title..."
                className="w-full text-2xl font-bold bg-transparent border-none placeholder:text-muted-foreground/30 focus:ring-0 px-0"
              />
              <div className="h-px bg-border/50" />
              <BlogEditor
                content={blogContent}
                onChange={handleEditorChange}
                placeholder="Refine youramazing manuscript content..."
                minHeight="500px"
              />
            </div>
          </div>

          {showPreview && blogContent && (
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-in slide-in-from-top-4">
              {previewImageUrl && (
                <img
                  src={previewImageUrl}
                  alt=""
                  className="h-64 w-full object-cover"
                />
              )}
              <div className="p-8">
              <div className="flex items-center gap-2 mb-8 text-primary font-bold uppercase tracking-widest text-[10px]">
                 <MousePointer2 className="w-4 h-4" /> Public View Projection
              </div>
              <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
                {blogTitle}
              </h1>
              <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert font-serif" dangerouslySetInnerHTML={{ __html: blogContent }} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: EDITORIAL GUARDRAILS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* STATUS & ATTRIBUTION */}
          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <div className="flex items-center gap-3">
               <button type="button" onClick={() => setBlogPublished(false)} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md border transition-all ${!blogPublished ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'bg-background border-border text-muted-foreground opacity-50'}`}>Draft</button>
               <button type="button" onClick={() => setBlogPublished(true)} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md border transition-all ${blogPublished ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-background border-border text-muted-foreground opacity-50'}`}>Live</button>
            </div>

            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5" /> Taxonomy</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground">
                <option value="">UNCATEGORIZED</option>
                {categories.map((c) => <option key={c.pidCategory} value={c.pidCategory}>{c.categoryName.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5" /> Attribution</label>
              <select value={selectedPublisher} onChange={(e) => setSelectedPublisher(e.target.value)} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground">
                <option value="">SYSTEM ADMIN</option>
                {publishers.map((p) => <option key={p.pidPublisher} value={p.pidPublisher}>{p.publisherName.toUpperCase()}</option>)}
              </select>
            </div>

            <button type="button" onClick={() => setBlogFeatured(!blogFeatured)} className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${blogFeatured ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground'}`}>
               <span className="text-[10px] font-bold uppercase tracking-widest">Featured Manuscript</span>
               <Star className={`w-4 h-4 ${blogFeatured ? 'fill-primary' : ''}`} />
            </button>
          </div>

          {/* VISUAL IDENTITY (IMAGE) */}
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5 text-primary" /> Visual Identity</h3>
            </div>
            <div className="p-6">
              {existingImage && !file && (
                <div className="mb-4 relative group">
                  <img src={getImageUrl(existingImage)} alt="" className="w-full h-32 object-cover rounded-lg border border-border" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                     <CloudUpload className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              <ImageBox onImageChange={handleImageChange} />
              <p className="mt-4 text-[9px] text-muted-foreground italic leading-relaxed">Recommended Aspect: <span className="font-bold text-foreground">1200 × 630px</span>. Replacing the current signature image will sync across all distribution channels.</p>
            </div>
          </div>

          {/* MEDIA EXTENSIONS */}
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <button type="button" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest">Media Extension</span>
              {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAdvancedOptions && (
              <div className="p-6 pt-0 space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Video className="w-3.5 h-3.5" /> Embedded Video URI</label>
                   <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube / Vimeo reference..." className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background font-mono" />
                </div>
              </div>
            )}
          </div>

          {/* DANGER ZONE */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 space-y-4">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-destructive">Revocation Area</h3>
             {!showDeleteConfirm ? (
               <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full py-2 bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-widest rounded border border-destructive/20 hover:bg-destructive/20 transition-all">Revoke Manuscript</button>
             ) : (
               <div className="space-y-3 animate-in zoom-in-95">
                  <p className="text-[10px] text-destructive font-bold uppercase leading-tight">Confirm permanent erasure?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDelete} className="flex-1 py-2 bg-destructive text-white text-[10px] font-bold uppercase rounded shadow-sm">Confirm Purge</button>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-background border border-border text-foreground text-[10px] font-bold uppercase rounded">Abort</button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* METADATA LEDGER (SEO) */}
        <div className="lg:col-span-12">
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <button type="button" onClick={() => setShowSeoSection(!showSeoSection)} className="w-full px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <Search className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Metadata Ledger & SERP Calibration</h3>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${seoScore.score >= 80 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                  Optimization Index: {seoScore.score}/100
                </div>
              </div>
              {showSeoSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSeoSection && (
              <div className="grid grid-cols-1 lg:grid-cols-4 divide-x divide-border">
                <div className="col-span-3">
                  <div className="flex border-b border-border bg-muted/5">
                    {['general', 'social', 'advanced'].map((tab) => (
                      <button key={tab} type="button" onClick={() => setSeoTab(tab as any)} className={`flex-1 px-4 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${seoTab === tab ? 'bg-background border-b-2 border-primary text-primary shadow-inner' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab === 'general' ? <Globe className="w-3.5 h-3.5 inline mr-2" /> : tab === 'social' ? <Share2 className="w-3.5 h-3.5 inline mr-2" /> : <Settings className="w-3.5 h-3.5 inline mr-2" />}
                        {tab} Sync
                      </button>
                    ))}
                  </div>

                  <div className="p-8 space-y-8">
                    {seoTab === 'general' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Tag className="w-3 h-3" /> Focus Keyphrase</label>
                              <input value={seoData.focusKeyword} onChange={(e) => updateSeoField('focusKeyword', e.target.value)} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Globe className="w-3 h-3" /> SERP Title Override</label>
                              <input value={seoData.metaTitle} onChange={(e) => updateSeoField('metaTitle', e.target.value)} maxLength={60} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold" placeholder={blogTitle} />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manuscript Meta Description</label>
                           <textarea value={seoData.metaDescription} onChange={(e) => updateSeoField('metaDescription', e.target.value)} maxLength={160} rows={3} className="w-full px-4 py-3 bg-background border border-border rounded-lg text-xs font-medium leading-relaxed resize-none" />
                        </div>
                        {/* SERP Simulation */}
                        <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-2">
                           <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-4 block">SERP Blueprint Simulation</span>
                           <div className="text-blue-600 dark:text-blue-400 text-lg font-medium hover:underline truncate">{seoData.metaTitle || blogTitle}</div>
                           <div className="text-emerald-700 dark:text-emerald-500 text-xs truncate">sureimports.com/blog/{blogSlug}</div>
                           <div className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{seoData.metaDescription || "Provision a meta abstract to visualize indexing footprint..."}</div>
                        </div>
                      </div>
                    )}
                    {/* Social and Advanced tabs follow similar premium patterns */}
                  </div>
                </div>

                <div className="bg-muted/5 p-8 space-y-6">
                   <div className="text-center space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Calibration Scan</h4>
                      <div className="text-4xl font-bold font-mono text-foreground">{seoScore.score}<span className="text-muted-foreground/30 text-xl">/100</span></div>
                   </div>
                   <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {seoScore.checks.map((check, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-[10px] ${check.passed ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-700' : 'bg-amber-500/5 border-amber-500/10 text-amber-700'}`}>
                           {check.passed ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                           <span className="font-bold leading-tight">{check.message}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  );
};

export default EditBlogForm;
