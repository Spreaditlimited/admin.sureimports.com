# Blog System - Quick Reference Guide

## Admin Access

### View All Blogs
- Navigate to: **Dashboard → Blog Management → View All Posts**
- URL: `http://localhost:3000/dashboard/blog/view`

### Create New Blog
- Navigate to: **Dashboard → Blog Management → Create New Post**
- URL: `http://localhost:3000/dashboard/blog/create`

### Edit Blog
- Click "Edit" button on any blog in the list view
- URL: `http://localhost:3000/dashboard/blog/edit?pidBlog=BLOGXXXXXXXXXX`

---

## Database Model

```prisma
model blog {
  id            Int       @id @default(autoincrement())
  pidBlog       String    @unique
  blogTitle     String    @db.VarChar(255)
  blogContent   String?
  blogSlug      String?
  blogPublished Boolean   @default(false)
  blogImage     String?
  blogBy        String?
  blogExt1      String?   // Video URL
  blogExt2      String?   // Reserved
  xStaus        String?
  createdAt     DateTime? @default(now())
  updatedAt     DateTime?
}
```

---

## API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/crud/blog/fetch` | GET | Fetch all blogs with pagination |
| `/api/crud/blog/fetch-single?slug=xxx` | GET | Fetch single blog by slug |
| `/api/crud/blog/fetch-single?pidBlog=xxx` | GET | Fetch single blog by ID |
| `/api/crud/blog/create` | POST | Create new blog post |
| `/api/crud/blog/update` | PUT | Update existing blog post |
| `/api/crud/blog/delete?pidBlog=xxx` | DELETE | Delete blog post |

---

## Frontend Integration (1-Minute Setup)

### 1. Fetch Published Blogs

```javascript
const response = await fetch('/api/crud/blog/fetch?status=published');
const { data, pagination } = await response.json();
```

### 2. Display Blog Image

```jsx
<img 
  src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${blog.blogImage}`}
  alt={blog.blogTitle}
/>
```

### 3. Render Blog Content

```jsx
<div dangerouslySetInnerHTML={{ __html: blog.blogContent }} />
```

### 4. Embed Video (if exists)

```jsx
{blog.blogExt1 && (
  <iframe src={convertToEmbedUrl(blog.blogExt1)} />
)}
```

---

## Environment Variables

```env
# Backend
CLOUDINARY_CLOUD_NAME=your-account-id
CLOUDINARY_API_KEY=your-access-key
CLOUDINARY_API_SECRET=your-secret-key
CLOUDINARY_UPLOAD_PRESET=your-bucket-name

# Frontend
NEXT_PUBLIC_CLOUDINARY_BASE_URL=https://your-r2-url.com
```

---

## File Structure

```
app/
├── api/crud/blog/
│   ├── create/route.ts          # Create blog
│   ├── update/route.ts          # Update blog
│   ├── delete/route.ts          # Delete blog
│   ├── fetch/route.ts           # Fetch all blogs
│   └── fetch-single/route.ts    # Fetch single blog
│
└── (dashboard)/dashboard/blog/
    ├── view/page.tsx            # Blog list view
    ├── create/page.tsx          # Create blog page
    ├── edit/page.tsx            # Edit blog page
    └── components/
        ├── ViewBlog.tsx         # Blog list component
        ├── CreateBlogForm.tsx   # Create form
        └── EditBlogForm.tsx     # Edit form
```

---

## Key Features

✅ Full CRUD operations  
✅ R2 image storage  
✅ Video embedding (YouTube, Vimeo)  
✅ Publish/Draft status  
✅ Search & pagination  
✅ SEO-friendly slugs  
✅ Responsive admin UI  

---

## For Complete Documentation

See **BLOG_FRONTEND_INTEGRATION.md** for:
- Detailed API documentation
- Complete frontend examples
- SEO optimization
- Security best practices
- Troubleshooting guide

---

**Quick Start:** Navigate to `/dashboard/blog/view` to start managing your blog posts!
