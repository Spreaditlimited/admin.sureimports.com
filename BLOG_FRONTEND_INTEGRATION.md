# Blog Frontend Integration Guide

## Overview
This document provides comprehensive information for integrating the backend blog management system with the public-facing frontend blog. The blog system uses R2 (Cloudflare R2) object storage for images and supports both text and video content.

---

## Database Model Schema

### Blog Model (Prisma Schema)

```prisma
model blog {
  id            Int       @id @default(autoincrement())
  pidBlog       String    @unique(map: "Blog_pidBlog_key")
  blogTitle     String    @db.VarChar(255)
  blogContent   String?   @db.Text
  blogSlug      String?   @db.VarChar(255)
  blogPublished Boolean   @default(false)
  blogImage     String?   @db.VarChar(255)
  blogBy        String?   @db.VarChar(100)
  blogExt1      String?   @db.VarChar(500)  // Used for video URL
  blogExt2      String?   @db.VarChar(500)  // Reserved for future use
  xStaus        String?   @db.VarChar(50)
  createdAt     DateTime? @default(now())
  updatedAt     DateTime?
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | Int | Auto-incrementing primary key | 1, 2, 3... |
| `pidBlog` | String | Unique blog identifier | "BLOG1735123456789" |
| `blogTitle` | String | Blog post title | "How to Import from China" |
| `blogContent` | String | Full blog content (HTML supported) | `<p>Content here...</p>` |
| `blogSlug` | String | URL-friendly slug | "how-to-import-from-china" |
| `blogPublished` | Boolean | Publication status | true (published) / false (draft) |
| `blogImage` | String | R2 storage image filename | "BLOG_abc123xyz456" |
| `blogBy` | String | Author name | "Admin", "John Doe" |
| `blogExt1` | String | Video URL (YouTube, Vimeo, etc.) | "https://youtube.com/watch?v=..." |
| `blogExt2` | String | Reserved for future metadata | null |
| `xStaus` | String | Record status | "active" |
| `createdAt` | DateTime | Creation timestamp | "2025-12-25T10:30:00Z" |
| `updatedAt` | DateTime | Last update timestamp | "2025-12-25T15:45:00Z" |

---

## API Endpoints

All API endpoints are located under `/api/crud/blog/`

### 1. Fetch All Blogs (with Pagination)

**Endpoint:** `GET /api/crud/blog/fetch`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for title, content, or author
- `status` (optional): Filter by status ("published" or leave empty for drafts)

**Example Request:**
```javascript
const response = await fetch('/api/crud/blog/fetch?page=1&limit=10&status=published');
const data = await response.json();
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pidBlog": "BLOG1735123456789",
      "blogTitle": "Sample Blog Post",
      "blogContent": "<p>This is the blog content...</p>",
      "blogSlug": "sample-blog-post",
      "blogPublished": true,
      "blogImage": "BLOG_abc123xyz456",
      "blogBy": "Admin",
      "blogExt1": "https://youtube.com/watch?v=example",
      "blogExt2": null,
      "createdAt": "2025-12-25T10:30:00.000Z",
      "updatedAt": "2025-12-25T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 2. Fetch Single Blog Post

**Endpoint:** `GET /api/crud/blog/fetch-single`

**Query Parameters:**
- `pidBlog` (optional): Blog unique ID
- `slug` (optional): Blog URL slug

**Note:** At least one parameter (pidBlog or slug) is required.

**Example Request:**
```javascript
// By slug (recommended for public frontend)
const response = await fetch('/api/crud/blog/fetch-single?slug=sample-blog-post');

// By pidBlog
const response = await fetch('/api/crud/blog/fetch-single?pidBlog=BLOG1735123456789');

const data = await response.json();
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "pidBlog": "BLOG1735123456789",
    "blogTitle": "Sample Blog Post",
    "blogContent": "<p>Full blog content here...</p>",
    "blogSlug": "sample-blog-post",
    "blogPublished": true,
    "blogImage": "BLOG_abc123xyz456",
    "blogBy": "Admin",
    "blogExt1": "https://youtube.com/watch?v=example",
    "blogExt2": null,
    "createdAt": "2025-12-25T10:30:00.000Z",
    "updatedAt": "2025-12-25T10:30:00.000Z"
  }
}
```

---

### 3. Create Blog Post (Admin Only)

**Endpoint:** `POST /api/crud/blog/create`

**Request Type:** `multipart/form-data`

**Form Fields:**
- `pidBlog` (required): Unique blog ID (format: "BLOG" + timestamp)
- `blogTitle` (required): Blog title
- `blogContent` (required): Blog content
- `blogBy` (optional): Author name (default: "Admin")
- `blogPublished` (required): "true" or "false"
- `blogExt1` (optional): Video URL
- `file` (optional): Image file (JPG, PNG, WEBP, GIF)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('pidBlog', 'BLOG' + Date.now());
formData.append('blogTitle', 'New Blog Post');
formData.append('blogContent', '<p>Content here...</p>');
formData.append('blogPublished', 'true');
formData.append('blogBy', 'John Doe');
formData.append('file', imageFile); // File object

const response = await fetch('/api/crud/blog/create', {
  method: 'POST',
  body: formData,
});
```

---

### 4. Update Blog Post (Admin Only)

**Endpoint:** `PUT /api/crud/blog/update`

**Request Type:** `multipart/form-data`

**Form Fields:** Same as Create, but `pidBlog` must be of existing blog

---

### 5. Delete Blog Post (Admin Only)

**Endpoint:** `DELETE /api/crud/blog/delete`

**Query Parameters:**
- `pidBlog` (required): Blog unique ID to delete

---

## R2 Image Storage

### Image URL Format

All blog images are stored in Cloudflare R2 object storage. To display images on the frontend:

```javascript
// Image filename is stored in blogImage field
const imageUrl = `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${blog.blogImage}`;
```

**Environment Variable Required:**
```env
NEXT_PUBLIC_CLOUDINARY_BASE_URL=https://your-r2-public-url.com
```

### Example Image Display:

```jsx
<img 
  src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${blog.blogImage}`}
  alt={blog.blogTitle}
  className="w-full h-auto"
/>
```

### Fallback for Missing Images:

```javascript
const getImageUrl = (imageName) => {
  if (!imageName) return '/assets/images/default-blog.jpg';
  return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${imageName}`;
};
```

---

## Frontend Implementation Examples

### 1. Blog List Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Blog {
  pidBlog: string;
  blogTitle: string;
  blogContent: string;
  blogSlug: string;
  blogImage: string;
  blogBy: string;
  createdAt: string;
}

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await fetch('/api/crud/blog/fetch?status=published&limit=12');
      const data = await response.json();
      
      if (data.success) {
        setBlogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageName: string) => {
    if (!imageName) return '/assets/images/default-blog.jpg';
    return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${imageName}`;
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    const strippedText = text.replace(/<[^>]*>/g, '');
    return strippedText.length > maxLength 
      ? strippedText.substring(0, maxLength) + '...' 
      : strippedText;
  };

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogs.map((blog) => (
          <div key={blog.pidBlog} className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={getImageUrl(blog.blogImage)}
              alt={blog.blogTitle}
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-2">{blog.blogTitle}</h2>
              <p className="text-gray-600 mb-4">
                {truncateText(blog.blogContent)}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  By {blog.blogBy} • {new Date(blog.createdAt).toLocaleDateString()}
                </span>
                <Link 
                  href={`/blog/${blog.blogSlug}`}
                  className="text-blue-600 hover:underline"
                >
                  Read More →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 2. Single Blog Post Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface Blog {
  pidBlog: string;
  blogTitle: string;
  blogContent: string;
  blogSlug: string;
  blogImage: string;
  blogBy: string;
  blogExt1: string; // Video URL
  createdAt: string;
  updatedAt: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const response = await fetch(`/api/crud/blog/fetch-single?slug=${slug}`);
      const data = await response.json();
      
      if (data.success) {
        setBlog(data.data);
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageName: string) => {
    if (!imageName) return '/assets/images/default-blog.jpg';
    return `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${imageName}`;
  };

  const getVideoEmbedUrl = (url: string) => {
    // Convert YouTube URL to embed URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1] || url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert Vimeo URL to embed URL
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  if (!blog) {
    return <div className="text-center py-20">Blog post not found</div>;
  }

  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Featured Image */}
      <img
        src={getImageUrl(blog.blogImage)}
        alt={blog.blogTitle}
        className="w-full h-96 object-cover rounded-lg mb-8"
      />

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{blog.blogTitle}</h1>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-gray-600 mb-8 pb-8 border-b">
        <span>By {blog.blogBy}</span>
        <span>•</span>
        <span>{new Date(blog.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</span>
      </div>

      {/* Video Embed (if exists) */}
      {blog.blogExt1 && (
        <div className="mb-8">
          <div className="aspect-video">
            <iframe
              src={getVideoEmbedUrl(blog.blogExt1)}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: blog.blogContent }}
      />

      {/* Share Section */}
      <div className="mt-12 pt-8 border-t">
        <p className="text-gray-600">Share this post:</p>
        {/* Add social share buttons here */}
      </div>
    </article>
  );
}
```

---

## SEO Optimization

### Metadata for Blog Post Pages

```tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const slug = params.slug;
  
  // Fetch blog data
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/crud/blog/fetch-single?slug=${slug}`);
  const data = await response.json();
  
  if (!data.success) {
    return {
      title: 'Blog Not Found',
    };
  }
  
  const blog = data.data;
  const imageUrl = blog.blogImage 
    ? `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${blog.blogImage}`
    : '/assets/images/default-blog.jpg';
  
  return {
    title: blog.blogTitle,
    description: blog.blogContent.replace(/<[^>]*>/g, '').substring(0, 160),
    openGraph: {
      title: blog.blogTitle,
      description: blog.blogContent.replace(/<[^>]*>/g, '').substring(0, 160),
      images: [imageUrl],
      type: 'article',
      publishedTime: blog.createdAt,
      modifiedTime: blog.updatedAt,
      authors: [blog.blogBy],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.blogTitle,
      description: blog.blogContent.replace(/<[^>]*>/g, '').substring(0, 160),
      images: [imageUrl],
    },
  };
}
```

---

## Environment Variables Required

### Backend (.env)
```env
DATABASE_URL="mysql://user:password@host:port/database"
CLOUDINARY_CLOUD_NAME="your-cloudflare-account-id"
CLOUDINARY_API_KEY="your-r2-access-key"
CLOUDINARY_API_SECRET="your-r2-secret-key"
CLOUDINARY_UPLOAD_PRESET="your-bucket-name"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_CLOUDINARY_BASE_URL="https://your-r2-public-url.com"
NEXT_PUBLIC_API_URL="http://localhost:3000" # or your production URL
```

---

## Styling Recommendations

### CSS for Blog Content

```css
/* styles/blog-content.css */

.prose {
  @apply text-gray-800 leading-relaxed;
}

.prose h1, .prose h2, .prose h3, .prose h4 {
  @apply font-bold mb-4 mt-6;
}

.prose h1 { @apply text-4xl; }
.prose h2 { @apply text-3xl; }
.prose h3 { @apply text-2xl; }
.prose h4 { @apply text-xl; }

.prose p {
  @apply mb-4;
}

.prose ul, .prose ol {
  @apply ml-6 mb-4;
}

.prose ul {
  @apply list-disc;
}

.prose ol {
  @apply list-decimal;
}

.prose a {
  @apply text-blue-600 hover:underline;
}

.prose img {
  @apply rounded-lg my-6;
}

.prose blockquote {
  @apply border-l-4 border-gray-300 pl-4 italic my-6;
}

.prose code {
  @apply bg-gray-100 px-2 py-1 rounded text-sm;
}

.prose pre {
  @apply bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-6;
}
```

---

## Testing Checklist

- [ ] Fetch all published blogs from homepage
- [ ] Fetch single blog by slug
- [ ] Display blog images from R2 storage
- [ ] Handle missing images with fallback
- [ ] Embed YouTube/Vimeo videos if URL provided
- [ ] Render HTML content safely
- [ ] Implement pagination for blog list
- [ ] Add SEO metadata for blog posts
- [ ] Test responsive design on mobile
- [ ] Implement search functionality
- [ ] Add social share buttons
- [ ] Test loading states
- [ ] Handle 404 for non-existent blogs

---

## Security Considerations

1. **Content Sanitization:** Always sanitize blog content before rendering to prevent XSS attacks
2. **Image URLs:** Use environment variables for R2 URLs to avoid hardcoding
3. **API Access:** Ensure only published blogs are accessible on the public frontend
4. **Admin Routes:** Protect all admin blog management routes with authentication
5. **Input Validation:** Validate all user inputs on both frontend and backend

---

## Support & Maintenance

### Common Issues

**Issue:** Images not displaying
- **Solution:** Check `NEXT_PUBLIC_CLOUDINARY_BASE_URL` environment variable
- **Solution:** Verify R2 bucket permissions are set to public

**Issue:** Blog content not rendering
- **Solution:** Ensure `dangerouslySetInnerHTML` is used for HTML content
- **Solution:** Check for proper HTML formatting in blog content

**Issue:** Videos not embedding
- **Solution:** Verify video URL format in `blogExt1` field
- **Solution:** Check iframe permissions and allowFullScreen attribute

---

## Version History

- **v1.0.0** (December 2025) - Initial blog system implementation
  - CRUD API endpoints
  - R2 image storage integration
  - Admin dashboard for blog management
  - Support for text, images, and video content

---

## Contact

For questions or issues regarding the blog system integration, please contact the development team.

---

**Last Updated:** December 25, 2025
