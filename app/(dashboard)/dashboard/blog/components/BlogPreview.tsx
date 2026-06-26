'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { getBlogImageUrl } from '@/lib/blogImage';

interface Blog {
  pidBlog: string;
  blogTitle: string;
  blogContent: string | null;
  blogSlug: string | null;
  blogPublished: boolean;
  blogImage: string | null;
  blogBy: string | null;
  blogExt2: string | null;
  createdAt: string | null;
  category?: {
    categoryName: string;
    categorySlug: string | null;
  } | null;
  publisher?: {
    publisherName: string;
    publisherRole: string | null;
    publisherBio: string | null;
    publisherImage: string | null;
  } | null;
}

const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
  'https://www.sureimports.com';

function stripHtml(html: string | null) {
  return String(html || '').replace(/<[^>]*>/g, ' ');
}

function estimateReadTime(html: string | null) {
  const wordCount = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function getExcerpt(blog: Blog) {
  if (blog.blogExt2) {
    try {
      const parsed = JSON.parse(blog.blogExt2);
      if (typeof parsed?.metaDescription === 'string') {
        return parsed.metaDescription;
      }
    } catch {
      if (blog.blogExt2.length < 220) return blog.blogExt2;
    }
  }

  return `${stripHtml(blog.blogContent).slice(0, 180).trim()}...`;
}

function getArticleStatus(blog: Blog) {
  if (!blog.blogPublished) return 'Draft';
  if (blog.createdAt && new Date(blog.createdAt).getTime() > Date.now()) {
    return 'Scheduled';
  }
  return 'Published';
}

function formatDate(date: string | null) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogPreview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pidBlog = searchParams.get('pidBlog') || '';
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchBlog() {
      if (!pidBlog) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/crud/blog/fetch-single?pidBlog=${encodeURIComponent(pidBlog)}`,
        );
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setBlog(data.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBlog();

    return () => {
      cancelled = true;
    };
  }, [pidBlog]);

  const imageUrl = getBlogImageUrl(blog?.blogImage, null);
  const publicUrl = blog?.blogSlug ? `${publicSiteUrl}/blog/${blog.blogSlug}` : '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
        <p className="text-xs font-bold uppercase tracking-widest">
          Loading preview...
        </p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">Blog post not found.</p>
      </div>
    );
  }

  const status = getArticleStatus(blog);
  const authorName = blog.publisher?.publisherName || blog.blogBy || 'Admin';
  const authorRole = blog.publisher?.publisherRole || 'Author';
  const authorImage = getBlogImageUrl(
    blog.publisher?.publisherImage || null,
    '/assets/images/default-avatar.png',
  );

  return (
    <div className="bg-[#fcfcfd] pb-20 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-muted"
          >
            Public URL
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <article className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] uppercase tracking-widest text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400">
              {blog.category?.categoryName || 'Import Guide'}
            </span>
            <span className="flex items-center gap-1.5 uppercase tracking-widest">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(blog.createdAt)}
            </span>
            <span className="flex items-center gap-1.5 uppercase tracking-widest">
              <Clock className="h-3.5 w-3.5" />
              {estimateReadTime(blog.blogContent)} min read
            </span>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${
                  status === 'Published'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                    : status === 'Scheduled'
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-600'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                }`}
              >
                {status}
              </span>
          </div>

          <h1 className="mb-8 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl leading-[1.1]">
            {blog.blogTitle}
          </h1>

          <p className="mx-auto max-w-3xl text-xl font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {getExcerpt(blog)}
          </p>

          <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center justify-between gap-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:px-8">
            <div className="flex items-center gap-4 text-left">
              <img
                src={authorImage || '/assets/images/default-avatar.png'}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {authorName}
                </p>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {authorRole}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:w-auto"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Preview Mode
            </button>
          </div>
        </header>

        {imageUrl && (
          <div className="relative mb-16 overflow-hidden rounded-[40px] border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <img
              src={imageUrl}
              alt=""
              className="h-[300px] w-full object-cover md:h-[500px]"
            />
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          <div
            className="blog-html-content"
            dangerouslySetInnerHTML={{ __html: blog.blogContent || '' }}
          />
        </div>
      </article>

      <style jsx global>{`
        .blog-html-content {
          font-family: inherit;
          font-size: 1.125rem;
          line-height: 2;
          color: #475569;
        }
        .dark .blog-html-content {
          color: #cbd5e1;
        }
        .blog-html-content h2 {
          font-size: 2rem;
          font-weight: 900;
          color: #0f172a;
          margin-top: 3.5rem;
          margin-bottom: 1.5rem;
          line-height: 1.3;
        }
        .dark .blog-html-content h2 {
          color: #ffffff;
        }
        .blog-html-content h3 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e293b;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.4;
        }
        .dark .blog-html-content h3 {
          color: #f8fafc;
        }
        .blog-html-content p {
          margin-bottom: 1.5rem;
        }
        .blog-html-content strong,
        .blog-html-content b {
          font-weight: 700;
          color: #0f172a;
        }
        .dark .blog-html-content strong,
        .dark .blog-html-content b {
          color: #ffffff;
        }
        .blog-html-content a {
          color: #4f46e5;
          font-weight: 600;
          text-decoration-line: underline;
          text-decoration-color: #c7d2fe;
          text-decoration-thickness: 2px;
          text-underline-offset: 4px;
        }
        .blog-html-content blockquote {
          border-left: 4px solid #4f46e5;
          background: #eef2ff;
          padding: 1.5rem 2rem;
          border-radius: 0 1rem 1rem 0;
          margin: 2.5rem 0;
          font-style: italic;
          color: #312e81;
          font-weight: 500;
          font-size: 1.25rem;
        }
        .blog-html-content ul {
          list-style: none;
          padding-left: 0.5rem;
          margin-bottom: 2rem;
          margin-top: 1rem;
        }
        .blog-html-content ul li {
          position: relative;
          padding-left: 2rem;
          margin-bottom: 0.75rem;
        }
        .blog-html-content ul li::before {
          content: '•';
          position: absolute;
          left: 0.5rem;
          color: #4f46e5;
          font-weight: 900;
          font-size: 1.5rem;
          line-height: 1.5rem;
        }
        .blog-html-content ol {
          padding-left: 1.5rem;
          margin-bottom: 2rem;
          margin-top: 1rem;
        }
        .blog-html-content ol li {
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }
        .blog-html-content img {
          max-width: 100%;
          height: auto;
          border-radius: 1.5rem;
          margin: 2.5rem 0;
          border: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
}
