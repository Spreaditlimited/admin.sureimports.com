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
} from 'lucide-react';
import ImageBox from '@/componentsx/ImageBox';
import dynamic from 'next/dynamic';

// Dynamic import for the editor to avoid SSR issues
const BlogEditor = dynamic(() => import('@/components/blog-editor/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg h-96 flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading editor...</div>
    </div>
  ),
});

interface User {
  pidUser: string;
  email: string;
  name: string;
}

interface ApiResponse {
  responsex: any;
  successx: boolean;
  userx: User;
  data?: any;
}

interface SeoData {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  keywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  noIndex: boolean;
  noFollow: boolean;
}

interface BlogCategory {
  pidCategory: string;
  categoryName: string;
  categorySlug: string | null;
  categoryColor: string | null;
  status: string | null;
}

interface BlogPublisher {
  pidPublisher: string;
  publisherName: string;
  publisherRole: string | null;
  publisherImage: string | null;
  status: string | null;
}

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

  // Category state
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Publisher state
  const [publishers, setPublishers] = useState<BlogPublisher[]>([]);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('');
  const [loadingPublishers, setLoadingPublishers] = useState(true);

  // Fetch categories and publishers on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/crud/blog-category/fetch');
        const data = await res.json();
        if (data.success && data.data) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    const fetchPublishers = async () => {
      try {
        const res = await fetch('/api/crud/blog-publisher/fetch');
        const data = await res.json();
        if (data.successx && data.data) {
          setPublishers(data.data.filter((p: BlogPublisher) => p.status === 'active'));
        }
      } catch (error) {
        console.error('Error fetching publishers:', error);
      } finally {
        setLoadingPublishers(false);
      }
    };

    fetchCategories();
    fetchPublishers();
  }, []);

  // SEO State
  const [seoData, setSeoData] = useState<SeoData>({
    metaTitle: '',
    metaDescription: '',
    focusKeyword: '',
    keywords: [],
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    twitterTitle: '',
    twitterDescription: '',
    noIndex: false,
    noFollow: false,
  });
  const [keywordInput, setKeywordInput] = useState('');

  const handleImageChange = (file: File) => {
    setFile(file);
  };

  const handleEditorChange = useCallback((content: string) => {
    setBlogContent(content);
  }, []);

  // SEO Helper Functions
  const updateSeoField = (field: keyof SeoData, value: string | boolean | string[]) => {
    setSeoData((prev) => ({ ...prev, [field]: value }));
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !seoData.keywords.includes(keyword) && seoData.keywords.length < 10) {
      updateSeoField('keywords', [...seoData.keywords, keyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateSeoField('keywords', seoData.keywords.filter((k) => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  // SEO Score Calculation
  const seoScore = useMemo(() => {
    let score = 0;
    const checks: { passed: boolean; message: string; importance: 'high' | 'medium' | 'low' }[] = [];

    // Meta Title checks
    const metaTitle = seoData.metaTitle || blogTitle;
    if (metaTitle.length > 0) {
      score += 10;
      checks.push({ passed: true, message: 'Meta title is set', importance: 'high' });
    } else {
      checks.push({ passed: false, message: 'Add a meta title', importance: 'high' });
    }
    if (metaTitle.length >= 30 && metaTitle.length <= 60) {
      score += 10;
      checks.push({ passed: true, message: 'Meta title length is optimal (30-60 chars)', importance: 'medium' });
    } else if (metaTitle.length > 0) {
      checks.push({ passed: false, message: `Meta title should be 30-60 chars (currently ${metaTitle.length})`, importance: 'medium' });
    }

    // Meta Description checks
    const metaDesc = seoData.metaDescription;
    if (metaDesc.length > 0) {
      score += 15;
      checks.push({ passed: true, message: 'Meta description is set', importance: 'high' });
    } else {
      checks.push({ passed: false, message: 'Add a meta description', importance: 'high' });
    }
    if (metaDesc.length >= 120 && metaDesc.length <= 160) {
      score += 10;
      checks.push({ passed: true, message: 'Meta description length is optimal (120-160 chars)', importance: 'medium' });
    } else if (metaDesc.length > 0) {
      checks.push({ passed: false, message: `Meta description should be 120-160 chars (currently ${metaDesc.length})`, importance: 'medium' });
    }

    // Focus Keyword checks
    if (seoData.focusKeyword.length > 0) {
      score += 15;
      checks.push({ passed: true, message: 'Focus keyword is set', importance: 'high' });

      // Check if focus keyword is in title
      if (metaTitle.toLowerCase().includes(seoData.focusKeyword.toLowerCase())) {
        score += 10;
        checks.push({ passed: true, message: 'Focus keyword appears in title', importance: 'medium' });
      } else {
        checks.push({ passed: false, message: 'Add focus keyword to title', importance: 'medium' });
      }

      // Check if focus keyword is in meta description
      if (metaDesc.toLowerCase().includes(seoData.focusKeyword.toLowerCase())) {
        score += 10;
        checks.push({ passed: true, message: 'Focus keyword appears in meta description', importance: 'medium' });
      } else {
        checks.push({ passed: false, message: 'Add focus keyword to meta description', importance: 'medium' });
      }
    } else {
      checks.push({ passed: false, message: 'Set a focus keyword', importance: 'high' });
    }

    // Additional keywords
    if (seoData.keywords.length >= 3) {
      score += 10;
      checks.push({ passed: true, message: 'At least 3 keywords added', importance: 'low' });
    } else {
      checks.push({ passed: false, message: 'Add at least 3 keywords', importance: 'low' });
    }

    // Content length check
    const contentText = blogContent.replace(/<[^>]*>/g, '');
    const wordCount = contentText.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) {
      score += 10;
      checks.push({ passed: true, message: `Content has ${wordCount} words (good length)`, importance: 'medium' });
    } else {
      checks.push({ passed: false, message: `Content has ${wordCount} words (aim for 300+)`, importance: 'medium' });
    }

    return { score: Math.min(score, 100), checks };
  }, [seoData, blogTitle, blogContent]);

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeoScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!blogTitle.trim()) {
      toast.error('Please provide a blog title');
      setIsLoading(false);
      return;
    }

    if (!blogContent.trim() || blogContent === '<p></p>') {
      toast.error('Please provide blog content');
      setIsLoading(false);
      return;
    }

    // Prepare SEO data as JSON
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
    formData.append('blogBy', blogBy.trim() || 'Admin');
    formData.append('blogPublished', blogPublished.toString());
    formData.append('blogFeatured', blogFeatured.toString());
    formData.append('blogExt1', videoUrl.trim());
    formData.append('blogExt2', seoJsonData);
    if (selectedCategory) formData.append('categoryId', selectedCategory);
    if (selectedPublisher) formData.append('publisherId', selectedPublisher);

    try {
      const res = await fetch('/api/crud/blog/create', {
        method: 'POST',
        body: formData,
      });

      const data: ApiResponse = await res.json();

      if (data.responsex.status === 'SUCCESS') {
        toast.success(data.responsex.message);
        router.push('/dashboard/blog/view');
      } else if (data.responsex.status === 'NO_IMAGE_SELECTED') {
        toast.warning(data.responsex.message);
      } else if (data.responsex.status === 'INVALID_IMAGE_UPLOAD') {
        toast.warning(data.responsex.message);
      } else if (data.responsex.status === 'IMAGE_UPLOAD_FAILED') {
        toast.warning(data.responsex.message);
      } else if (data.responsex.status === 'ACTION_FAILED') {
        toast.error(data.responsex.message);
      } else {
        toast.error('An error occurred');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setBlogPublished(false);
    const form = document.getElementById('blog-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  const handlePublish = async () => {
    setBlogPublished(true);
    const form = document.getElementById('blog-form') as HTMLFormElement;
    if (form) {
      setTimeout(() => form.requestSubmit(), 100);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Create New Blog Post
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Write and publish your content with our rich text editor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      <form id="blog-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Input */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Blog Title <span className="text-red-500">*</span>
              </label>
              <input
                name="blogTitle"
                onChange={(e) => setBlogTitle(e.target.value)}
                value={blogTitle}
                type="text"
                required
                placeholder="Enter an engaging title for your blog post..."
                className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
              />
              {blogTitle && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  URL slug: <span className="font-mono">/blog/{blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}</span>
                </p>
              )}
            </div>

            {/* Editor */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use the toolbar to format your content. You can add images, videos, tables, and more.
                </p>
              </div>
              <BlogEditor
                content={blogContent}
                onChange={handleEditorChange}
                placeholder="Start writing your amazing blog post..."
                minHeight="500px"
              />
            </div>

            {/* Preview */}
            {showPreview && blogContent && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Content Preview
                </h3>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <article
                    className="prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: blogContent }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Publish Settings
              </h3>

              {/* Status Toggle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBlogPublished(false)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      !blogPublished
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-2 border-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlogPublished(true)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      blogPublished
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                    }`}
                  >
                    Published
                  </button>
                </div>
              </div>

              {/* Featured Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${blogFeatured ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <Star className={`w-4 h-4 ${blogFeatured ? 'text-white fill-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Featured Post</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Highlight this post on the blog</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlogFeatured(!blogFeatured)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      blogFeatured ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        blogFeatured ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Author */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Author
                </label>
                <input
                  name="blogBy"
                  onChange={(e) => setBlogBy(e.target.value)}
                  value={blogBy}
                  type="text"
                  placeholder="Author name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FolderOpen className="w-4 h-4 inline mr-1" />
                  Category
                </label>
                {loadingCategories ? (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 animate-pulse">
                    Loading categories...
                  </div>
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.pidCategory} value={category.pidCategory}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                )}
                {selectedCategory && (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: categories.find(c => c.pidCategory === selectedCategory)?.categoryColor || '#6366f1',
                        color: 'white',
                      }}
                    >
                      {categories.find(c => c.pidCategory === selectedCategory)?.categoryName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Publisher */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Publisher
                </label>
                {loadingPublishers ? (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 animate-pulse">
                    Loading publishers...
                  </div>
                ) : (
                  <select
                    value={selectedPublisher}
                    onChange={(e) => setSelectedPublisher(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a publisher</option>
                    {publishers.map((publisher) => (
                      <option key={publisher.pidPublisher} value={publisher.pidPublisher}>
                        {publisher.publisherName} {publisher.publisherRole ? `(${publisher.publisherRole})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {selectedPublisher && (
                  <div className="mt-2 flex items-center gap-2">
                    {publishers.find(p => p.pidPublisher === selectedPublisher)?.publisherImage && (
                      <img
                        src={
                          (() => {
                            const publisherImage = publishers.find(
                              (p) => p.pidPublisher === selectedPublisher
                            )?.publisherImage;
                            if (!publisherImage) return '/assets/images/default-blog.jpg';
                            if (
                              publisherImage.startsWith('http://') ||
                              publisherImage.startsWith('https://')
                            ) {
                              return publisherImage;
                            }
                            return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${publisherImage}`;
                          })()
                        }
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {publishers.find(p => p.pidPublisher === selectedPublisher)?.publisherName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPublisher('')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="w-5 h-5" />
                  {isLoading ? 'Publishing...' : 'Publish Now'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  Save as Draft
                </button>
              </div>
            </div>

            {/* Featured Image */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Featured Image
              </h3>
              <ImageBox onImageChange={handleImageChange} />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Recommended size: 1200x630 pixels for optimal social sharing
              </p>
            </div>

            {/* Advanced Options */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Advanced Options
                </span>
                {showAdvancedOptions ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showAdvancedOptions && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Video URL */}
                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Video className="w-4 h-4 inline mr-1" />
                      Video URL (Optional)
                    </label>
                    <input
                      id="videoUrl"
                      name="videoUrl"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) => setVideoUrl(e.target.value)}
                      value={videoUrl}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Featured video for this post
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEO Section - Full Width Below */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* SEO Header with Score */}
              <button
                type="button"
                onClick={() => setShowSeoSection(!showSeoSection)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    SEO Settings
                  </span>
                  {/* SEO Score Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSeoScoreColor(seoScore.score)} bg-opacity-10 ${seoScore.score >= 80 ? 'bg-green-100 dark:bg-green-900/30' : seoScore.score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      Score: {seoScore.score}/100
                    </div>
                  </div>
                </div>
                {showSeoSection ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showSeoSection && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {/* SEO Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setSeoTab('general')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        seoTab === 'general'
                          ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Search className="w-4 h-4 inline mr-2" />
                      General SEO
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoTab('social')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        seoTab === 'social'
                          ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Share2 className="w-4 h-4 inline mr-2" />
                      Social Media
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoTab('advanced')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        seoTab === 'advanced'
                          ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Advanced
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Main SEO Fields */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* General SEO Tab */}
                        {seoTab === 'general' && (
                          <>
                            {/* Focus Keyword */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Tag className="w-4 h-4 inline mr-1" />
                                Focus Keyword
                              </label>
                              <input
                                type="text"
                                value={seoData.focusKeyword}
                                onChange={(e) => updateSeoField('focusKeyword', e.target.value)}
                                placeholder="Enter your main target keyword"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The primary keyword you want this page to rank for
                              </p>
                            </div>

                            {/* Meta Title */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Globe className="w-4 h-4 inline mr-1" />
                                SEO Title
                              </label>
                              <input
                                type="text"
                                value={seoData.metaTitle}
                                onChange={(e) => updateSeoField('metaTitle', e.target.value)}
                                placeholder={blogTitle || 'Enter SEO title (defaults to blog title)'}
                                maxLength={60}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                              <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Appears in search results and browser tabs
                                </p>
                                <span className={`text-xs ${(seoData.metaTitle || blogTitle).length > 60 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {(seoData.metaTitle || blogTitle).length}/60
                                </span>
                              </div>
                            </div>

                            {/* Meta Description */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Meta Description
                              </label>
                              <textarea
                                value={seoData.metaDescription}
                                onChange={(e) => updateSeoField('metaDescription', e.target.value)}
                                placeholder="Write a compelling description for search engines..."
                                rows={3}
                                maxLength={160}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                              />
                              <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Appears below the title in search results
                                </p>
                                <span className={`text-xs ${seoData.metaDescription.length > 160 ? 'text-red-500' : seoData.metaDescription.length >= 120 ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {seoData.metaDescription.length}/160
                                </span>
                              </div>
                            </div>

                            {/* Keywords */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Tag className="w-4 h-4 inline mr-1" />
                                Keywords
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={keywordInput}
                                  onChange={(e) => setKeywordInput(e.target.value)}
                                  onKeyDown={handleKeywordKeyDown}
                                  placeholder="Type keyword and press Enter"
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={addKeyword}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                              {seoData.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {seoData.keywords.map((keyword) => (
                                    <span
                                      key={keyword}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                                    >
                                      {keyword}
                                      <button
                                        type="button"
                                        onClick={() => removeKeyword(keyword)}
                                        className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {seoData.keywords.length}/10 keywords added
                              </p>
                            </div>

                            {/* Google Preview */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Google Search Preview
                              </h4>
                              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer truncate">
                                  {seoData.metaTitle || blogTitle || 'Your page title'}
                                </div>
                                <div className="text-green-700 dark:text-green-500 text-sm mt-1 truncate">
                                  https://sureimports.com/blog/{blogTitle ? blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'your-post-slug'}
                                </div>
                                <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                                  {seoData.metaDescription || 'Add a meta description to see how it will appear in search results...'}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Social Media Tab */}
                        {seoTab === 'social' && (
                          <>
                            {/* Open Graph Settings */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Open Graph (Facebook, LinkedIn)
                              </h4>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  OG Title
                                </label>
                                <input
                                  type="text"
                                  value={seoData.ogTitle}
                                  onChange={(e) => updateSeoField('ogTitle', e.target.value)}
                                  placeholder={blogTitle || 'Title for social sharing'}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  OG Description
                                </label>
                                <textarea
                                  value={seoData.ogDescription}
                                  onChange={(e) => updateSeoField('ogDescription', e.target.value)}
                                  placeholder={seoData.metaDescription || 'Description for social sharing'}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                                />
                              </div>
                            </div>

                            {/* Twitter Card Settings */}
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Share2 className="w-4 h-4" />
                                Twitter Card
                              </h4>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Twitter Title
                                </label>
                                <input
                                  type="text"
                                  value={seoData.twitterTitle}
                                  onChange={(e) => updateSeoField('twitterTitle', e.target.value)}
                                  placeholder={blogTitle || 'Title for Twitter'}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Twitter Description
                                </label>
                                <textarea
                                  value={seoData.twitterDescription}
                                  onChange={(e) => updateSeoField('twitterDescription', e.target.value)}
                                  placeholder={seoData.metaDescription || 'Description for Twitter'}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                                />
                              </div>
                            </div>

                            {/* Social Preview */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Social Share Preview
                              </h4>
                              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                                  <ImageIcon className="w-12 h-12 text-gray-400" />
                                </div>
                                <div className="p-3">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                    sureimports.com
                                  </div>
                                  <div className="font-semibold text-gray-900 dark:text-white mt-1 line-clamp-1">
                                    {seoData.ogTitle || seoData.metaTitle || blogTitle || 'Your post title'}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                    {seoData.ogDescription || seoData.metaDescription || 'Your post description...'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Advanced Tab */}
                        {seoTab === 'advanced' && (
                          <>
                            {/* Canonical URL */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Link2 className="w-4 h-4 inline mr-1" />
                                Canonical URL
                              </label>
                              <input
                                type="url"
                                value={seoData.canonicalUrl}
                                onChange={(e) => updateSeoField('canonicalUrl', e.target.value)}
                                placeholder="https://sureimports.com/blog/your-post"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Use this to specify the preferred URL if content exists at multiple URLs
                              </p>
                            </div>

                            {/* Robot Meta Tags */}
                            <div className="space-y-4 pt-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Search Engine Directives
                              </h4>

                              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    No Index
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Prevent search engines from indexing this page
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateSeoField('noIndex', !seoData.noIndex)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    seoData.noIndex ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      seoData.noIndex ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    No Follow
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Prevent search engines from following links on this page
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateSeoField('noFollow', !seoData.noFollow)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    seoData.noFollow ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      seoData.noFollow ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              {(seoData.noIndex || seoData.noFollow) && (
                                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                    <strong>Warning:</strong> This page will {seoData.noIndex ? 'not be indexed' : ''}{seoData.noIndex && seoData.noFollow ? ' and ' : ''}{seoData.noFollow ? 'links will not be followed' : ''} by search engines.
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* SEO Score Sidebar */}
                      <div className="space-y-4">
                        {/* Score Circle */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                          <div className="relative inline-flex items-center justify-center">
                            <svg className="w-24 h-24 transform -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-gray-200 dark:text-gray-700"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * seoScore.score) / 100}
                                className={getSeoScoreBg(seoScore.score)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className={`absolute text-2xl font-bold ${getSeoScoreColor(seoScore.score)}`}>
                              {seoScore.score}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            SEO Score
                          </p>
                        </div>

                        {/* SEO Checklist */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            SEO Checklist
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {seoScore.checks.map((check, index) => (
                              <div
                                key={index}
                                className={`flex items-start gap-2 text-sm ${
                                  check.passed
                                    ? 'text-green-600 dark:text-green-400'
                                    : check.importance === 'high'
                                    ? 'text-red-600 dark:text-red-400'
                                    : check.importance === 'medium'
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                {check.passed ? (
                                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                )}
                                <span>{check.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SEO Tips */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                SEO Tip
                              </h4>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                {seoScore.score < 50
                                  ? 'Start by adding a focus keyword and meta description to improve your SEO score.'
                                  : seoScore.score < 80
                                  ? 'Good progress! Make sure your focus keyword appears in both the title and description.'
                                  : 'Excellent SEO setup! Your post is well-optimized for search engines.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateBlogForm;
