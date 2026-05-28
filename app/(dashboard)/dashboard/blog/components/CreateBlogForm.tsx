'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  PlusCircle,
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
  LayoutDashboard,
  ShieldCheck,
  MousePointer2,
  CloudUpload
} from 'lucide-react';
import ImageBox from '@/componentsx/ImageBox';
import dynamic from 'next/dynamic';

const BlogEditor = dynamic(() => import('@/components/blog-editor/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-muted rounded-lg h-96 flex flex-col items-center justify-center gap-3">
      <RefreshCw className="w-8 h-8 text-muted-foreground/20 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Initializing Editorial Engine...</span>
    </div>
  ),
});

// [Interfaces preserved from your original code]
interface User { pidUser: string; email: string; name: string; }
interface ApiResponse { responsex: any; successx: boolean; userx: User; data?: any; }
interface SeoData { metaTitle: string; metaDescription: string; focusKeyword: string; keywords: string[]; canonicalUrl: string; ogTitle: string; ogDescription: string; twitterTitle: string; twitterDescription: string; noIndex: boolean; noFollow: boolean; }
interface BlogCategory { pidCategory: string; categoryName: string; categorySlug: string | null; categoryColor: string | null; status: string | null; }
interface BlogPublisher { pidPublisher: string; publisherName: string; publisherRole: string | null; publisherImage: string | null; status: string | null; }

const CreateBlogForm = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showSeoSection, setShowSeoSection] = useState(true);
  const [seoTab, setSeoTab] = useState<'general' | 'social' | 'advanced'>('general');

  const blogID = 'BLOG' + new Date().getTime().toString();
  const [pidBlog] = useState(blogID);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogBy, setBlogBy] = useState('Admin');
  const [blogPublished, setBlogPublished] = useState(false);
  const [blogFeatured, setBlogFeatured] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [publishers, setPublishers] = useState<BlogPublisher[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('');
  const [loadingPublishers, setLoadingPublishers] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/crud/blog-category/fetch');
        const data = await res.json();
        if (data.success && data.data) setCategories(data.data);
      } finally { setLoadingCategories(false); }
    };
    const fetchPublishers = async () => {
      try {
        const res = await fetch('/api/crud/blog-publisher/fetch');
        const data = await res.json();
        if (data.successx && data.data) setPublishers(data.data.filter((p: BlogPublisher) => p.status === 'active'));
      } finally { setLoadingPublishers(false); }
    };
    fetchCategories();
    fetchPublishers();
  }, []);

  const [seoData, setSeoData] = useState<SeoData>({
    metaTitle: '', metaDescription: '', focusKeyword: '', keywords: [], canonicalUrl: '',
    ogTitle: '', ogDescription: '', twitterTitle: '', twitterDescription: '', noIndex: false, noFollow: false,
  });
  const [keywordInput, setKeywordInput] = useState('');

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

  // [SEO Score Logic Preserved]
  const seoScore = useMemo(() => {
    let score = 0;
    const checks: { passed: boolean; message: string; importance: 'high' | 'medium' | 'low' }[] = [];
    const metaTitle = seoData.metaTitle || blogTitle;
    if (metaTitle.length > 0) { score += 10; checks.push({ passed: true, message: 'Meta title set', importance: 'high' }); }
    if (metaTitle.length >= 30 && metaTitle.length <= 60) { score += 10; checks.push({ passed: true, message: 'Optimal title length', importance: 'medium' }); }
    const metaDesc = seoData.metaDescription;
    if (metaDesc.length > 0) { score += 15; checks.push({ passed: true, message: 'Meta description set', importance: 'high' }); }
    if (metaDesc.length >= 120 && metaDesc.length <= 160) { score += 10; checks.push({ passed: true, message: 'Optimal description length', importance: 'medium' }); }
    if (seoData.focusKeyword.length > 0) {
      score += 15; checks.push({ passed: true, message: 'Focus keyword set', importance: 'high' });
      if (metaTitle.toLowerCase().includes(seoData.focusKeyword.toLowerCase())) { score += 10; checks.push({ passed: true, message: 'Keyword in title', importance: 'medium' }); }
      if (metaDesc.toLowerCase().includes(seoData.focusKeyword.toLowerCase())) { score += 10; checks.push({ passed: true, message: 'Keyword in description', importance: 'medium' }); }
    }
    const contentText = blogContent.replace(/<[^>]*>/g, '');
    const wordCount = contentText.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) { score += 10; checks.push({ passed: true, message: 'Substantial content length', importance: 'medium' }); }
    return { score: Math.min(score, 100), checks };
  }, [seoData, blogTitle, blogContent]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!blogTitle.trim() || !blogContent.trim()) {
      toast.error('Identity and manuscript content are required.');
      setIsLoading(false); return;
    }
    const seoJsonData = JSON.stringify({
      ...seoData,
      metaTitle: seoData.metaTitle || blogTitle.trim(),
      ogTitle: seoData.ogTitle || blogTitle.trim(),
      twitterTitle: seoData.twitterTitle || blogTitle.trim(),
    });
    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('pidBlog', pidBlog);
    formData.append('blogTitle', blogTitle.trim());
    formData.append('blogContent', blogContent);
    formData.append('blogBy', blogBy.trim());
    formData.append('blogPublished', blogPublished.toString());
    formData.append('blogFeatured', blogFeatured.toString());
    formData.append('blogExt1', videoUrl.trim());
    formData.append('blogExt2', seoJsonData);
    if (selectedCategory) formData.append('categoryId', selectedCategory);
    if (selectedPublisher) formData.append('publisherId', selectedPublisher);

    try {
      const res = await fetch('/api/crud/blog/create', { method: 'POST', body: formData });
      const data: ApiResponse = await res.json();
      if (data.responsex.status === 'SUCCESS') {
        toast.success('Manuscript synchronized successfully');
        router.push('/dashboard/blog/view');
      } else { toast.error(data.responsex.message); }
    } catch (error: any) { toast.error(error.message); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Page Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Editorial Composer</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">Archive Reference: {pidBlog}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-lg text-xs font-bold uppercase tracking-tight hover:bg-muted transition-all"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Preview Post
          </button>
          <div className="h-8 w-px bg-border mx-2" />
          <button
            type="button"
            onClick={() => { setBlogPublished(false); setTimeout(() => (document.getElementById('blog-form') as HTMLFormElement)?.requestSubmit(), 50); }}
            className="px-5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
          >
            Draft
          </button>
          <button
            form="blog-form"
            type="submit"
            onClick={() => setBlogPublished(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Commit Publish
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
                placeholder="Enter an authoritative editorial title..."
                className="w-full text-2xl font-bold bg-transparent border-none placeholder:text-muted-foreground/30 focus:ring-0 px-0"
              />
              <div className="h-px bg-border/50" />
              <BlogEditor
                content={blogContent}
                onChange={handleEditorChange}
                placeholder="Start curating your amazing manuscript..."
                minHeight="500px"
              />
            </div>
          </div>

          {showPreview && blogContent && (
            <div className="bg-card border border-border rounded-xl p-8 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 mb-8 text-primary">
                 <MousePointer2 className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Public View Rendering</span>
              </div>
              <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert font-serif" dangerouslySetInnerHTML={{ __html: blogContent }} />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: EDITORIAL GUARDRAILS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* FEATURED IMAGE OVERHAUL */}
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                 <ImageIcon className="w-3.5 h-3.5 text-primary" /> Visual Identity
               </h3>
               {file && <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />}
            </div>
            <div className="p-6">
              <div className="relative group">
                <ImageBox onImageChange={handleImageChange} />
                {!file && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/10 group-hover:bg-primary/5 transition-colors">
                    <CloudUpload className="w-8 h-8 text-muted-foreground/20 mb-2" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Click to Provision Image</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                 <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                 <p className="text-[9px] leading-relaxed text-muted-foreground">
                   Optimum resolution: <span className="font-bold text-foreground">1200 × 630px</span>. 
                   Ensure high-contrast focal points for social rendering.
                 </p>
              </div>
            </div>
          </div>

          {/* CLASSIFICATION & AUTHORSHIP */}
          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5" /> Taxonomy Classification
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
              >
                <option value="">UNCATEGORIZED</option>
                {categories.map((c) => <option key={c.pidCategory} value={c.pidCategory}>{c.categoryName.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Editorial Attribution
              </label>
              <select
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
              >
                <option value="">SYSTEM ADMIN</option>
                {publishers.map((p) => <option key={p.pidPublisher} value={p.pidPublisher}>{p.publisherName.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setBlogFeatured(!blogFeatured)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  blogFeatured ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">Mark as Featured Post</span>
                <Star className={`w-4 h-4 ${blogFeatured ? 'fill-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* ADVANCED MEDIA */}
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Media Extensions</span>
              {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAdvancedOptions && (
              <div className="p-6 pt-0 space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Video className="w-3.5 h-3.5" /> Embedded Media URL</label>
                   <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="YouTube or Vimeo reference..."
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background font-mono"
                   />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. SEARCH ENGINE LEDGER (SEO) */}
        <div className="lg:col-span-12">
          <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSeoSection(!showSeoSection)}
              className="w-full px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Search className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Metadata Ledger & SEO Calibration</h3>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  seoScore.score >= 80 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  Optimization Index: {seoScore.score}/100
                </div>
              </div>
              {showSeoSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSeoSection && (
              <div className="p-0 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-4 divide-x divide-border">
                  
                  {/* SEO Configuration Tabs */}
                  <div className="col-span-3">
                    <div className="flex border-b border-border bg-muted/5">
                      {[
                        { id: 'general', label: 'Primary Sync', icon: Globe },
                        { id: 'social', label: 'Social Graph', icon: Share2 },
                        { id: 'advanced', label: 'Robots & Logic', icon: Settings }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSeoTab(tab.id as any)}
                          className={`flex-1 px-4 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            seoTab === tab.id ? 'bg-background border-b-2 border-primary text-primary shadow-inner' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-8 space-y-8">
                      {seoTab === 'general' && (
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Tag className="w-3 h-3" /> Focus Target Keyword</label>
                                <input
                                  type="text"
                                  value={seoData.focusKeyword}
                                  onChange={(e) => updateSeoField('focusKeyword', e.target.value)}
                                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold"
                                  placeholder="Primary target phrase..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Globe className="w-3 h-3" /> SERP Title Override</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={seoData.metaTitle}
                                    onChange={(e) => updateSeoField('metaTitle', e.target.value)}
                                    maxLength={60}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-xs font-bold pr-14"
                                    placeholder={blogTitle || "Defaults to post title..."}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground">{(seoData.metaTitle || blogTitle).length}/60</span>
                                </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manuscript Meta Description</label>
                              <div className="relative">
                                <textarea
                                  value={seoData.metaDescription}
                                  onChange={(e) => updateSeoField('metaDescription', e.target.value)}
                                  maxLength={160}
                                  rows={3}
                                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-xs font-medium leading-relaxed resize-none pr-14"
                                  placeholder="Compelling SERP abstract..."
                                />
                                <span className="absolute right-3 bottom-3 text-[9px] font-mono text-muted-foreground">{seoData.metaDescription.length}/160</span>
                              </div>
                           </div>

                           {/* SERP Simulation */}
                           <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-2">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-4 block">Desktop SERP Simulation</span>
                              <div className="text-blue-600 dark:text-blue-400 text-lg font-medium hover:underline cursor-pointer truncate max-w-lg">
                                {seoData.metaTitle || blogTitle || "Manuscript Identity"}
                              </div>
                              <div className="text-emerald-700 dark:text-emerald-500 text-xs truncate">
                                sureimports.com/blog/{blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                              </div>
                              <div className="text-muted-foreground text-xs leading-relaxed line-clamp-2 max-w-lg">
                                {seoData.metaDescription || "Provide an abstract to visualize the search engine indexing footprint..."}
                              </div>
                           </div>
                        </div>
                      )}

                      {/* [Social Graph and Advanced Tabs follow similar high-end patterns] */}
                      {seoTab === 'social' && (
                        <div className="space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Share2 className="w-3.5 h-3.5" /> Social Attribution</h4>
                                <input placeholder="OG Title" className="w-full px-4 py-2.5 text-xs bg-background border border-border rounded-lg font-bold" />
                                <textarea placeholder="OG Description" rows={3} className="w-full px-4 py-3 text-xs bg-background border border-border rounded-lg resize-none" />
                              </div>
                              <div className="bg-muted/20 border border-border rounded-lg p-5 flex flex-col items-center justify-center gap-4 text-center">
                                 <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                 <p className="text-[10px] text-muted-foreground italic">Social Graph relies on the Visual Identity provisioned in the sidebar.</p>
                              </div>
                           </div>
                        </div>
                      )}

                      {seoTab === 'advanced' && (
                        <div className="space-y-6 max-w-xl">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Canonical URI</label>
                              <input placeholder="https://..." className="w-full px-4 py-2.5 text-xs bg-background border border-border rounded-lg font-mono" />
                           </div>
                           <div className="flex items-center justify-between p-4 bg-muted/10 border border-border rounded-lg">
                              <div>
                                <p className="text-xs font-bold uppercase">De-index Manuscript</p>
                                <p className="text-[10px] text-muted-foreground italic">Prevent search engines from crawling this content.</p>
                              </div>
                              <button type="button" onClick={() => updateSeoField('noIndex', !seoData.noIndex)} className={`h-5 w-10 rounded-full transition-colors ${seoData.noIndex ? 'bg-primary' : 'bg-muted border border-border'}`} />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SEO SCAN REPORT */}
                  <div className="bg-muted/5 p-8 space-y-6">
                    <div className="text-center space-y-2">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Optimization Scan</h4>
                       <div className="text-4xl font-bold font-mono text-foreground">{seoScore.score}<span className="text-muted-foreground/30 text-xl">/100</span></div>
                    </div>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {seoScore.checks.map((check, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-[10px] ${
                          check.passed ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-700' : 'bg-amber-500/5 border-amber-500/10 text-amber-700'
                        }`}>
                           {check.passed ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                           <span className="font-bold leading-tight">{check.message}</span>
                        </div>
                      ))}
                    </div>
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

export default CreateBlogForm;