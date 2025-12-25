'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface Blog {
  id: number;
  pidBlog: string;
  blogTitle: string;
  blogContent: string | null;
  blogSlug: string | null;
  blogPublished: boolean;
  blogImage: string | null;
  blogBy: string | null;
  blogExt1: string | null;
  blogExt2: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApiResponse {
  responsex: any;
  successx: boolean;
  data?: any;
}

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
  const [blogData, setBlogData] = useState<Blog | null>(null);

  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogBy, setBlogBy] = useState('Admin');
  const [blogPublished, setBlogPublished] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [blogSlug, setBlogSlug] = useState('');

  useEffect(() => {
    if (pidBlog) {
      fetchBlog();
    } else {
      toast.error('Blog ID is missing');
      router.push('/dashboard/blog/view');
    }
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
        setVideoUrl(blog.blogExt1 || '');
        setMetaDescription(blog.blogExt2 || '');
        setExistingImage(blog.blogImage || '');
        setBlogSlug(blog.blogSlug || '');
      } else {
        toast.error('Blog not found');
        router.push('/dashboard/blog/view');
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog');
    } finally {
      setLoadingBlog(false);
    }
  };

  const handleImageChange = (file: File) => {
    setFile(file);
  };

  const handleEditorChange = useCallback((content: string) => {
    setBlogContent(content);
  }, []);

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

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('pidBlog', pidBlog!);
    formData.append('blogTitle', blogTitle.trim());
    formData.append('blogContent', blogContent);
    formData.append('blogBy', blogBy.trim() || 'Admin');
    formData.append('blogPublished', blogPublished.toString());
    formData.append('blogExt1', videoUrl.trim());
    formData.append('blogExt2', metaDescription.trim());

    try {
      const res = await fetch('/api/crud/blog/update', {
        method: 'PUT',
        body: formData,
      });

      const data: ApiResponse = await res.json();

      if (data.responsex.status === 'SUCCESS') {
        toast.success(data.responsex.message);
        router.push('/dashboard/blog/view');
      } else {
        toast.error(data.responsex.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/crud/blog/delete?pidBlog=${pidBlog}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.responsex.status === 'SUCCESS') {
        toast.success('Blog deleted successfully');
        router.push('/dashboard/blog/view');
      } else {
        toast.error(data.responsex.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getImageUrl = (imageName: string | null) => {
    if (!imageName) return '/assets/images/default-blog.jpg';
    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${imageName}`;
  };

  const handleSave = async () => {
    const form = document.getElementById('blog-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  if (loadingBlog) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading blog...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/blog/view')}
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Edit Blog Post
          </h1>
          {blogData?.createdAt && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Created: {new Date(blogData.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {blogData.updatedAt && blogData.updatedAt !== blogData.createdAt && (
                <span className="ml-2">
                  | Last updated: {new Date(blogData.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
            </p>
          )}
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
          {blogSlug && (
            <a
              href={`/blog/${blogSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Live
            </a>
          )}
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
              {blogSlug && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Current URL: <span className="font-mono">/blog/{blogSlug}</span>
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

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Featured Image */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Featured Image
              </h3>

              {/* Current Image Preview */}
              {existingImage && !file && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current image:</p>
                  <img
                    src={getImageUrl(existingImage)}
                    alt="Current blog image"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}

              <ImageBox onImageChange={handleImageChange} />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {file
                  ? 'New image selected - will replace current image on save'
                  : 'Upload a new image to replace the current one'}
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

                  {/* Meta Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meta Description (SEO)
                    </label>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Brief description for search engines..."
                      rows={3}
                      maxLength={160}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {metaDescription.length}/160 characters
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-6">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                Danger Zone
              </h3>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors border border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete This Post
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
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

export default EditBlogForm;
