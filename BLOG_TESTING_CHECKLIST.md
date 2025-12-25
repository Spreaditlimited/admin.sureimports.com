# Blog System Testing Checklist

## Pre-Testing Setup

### Environment Variables
- [ ] `DATABASE_URL` is properly configured in `.env`
- [ ] `R2_ACCOUNT_ID` is set in `.env`
- [ ] `R2_ACCESS_KEY_ID` is set in `.env`
- [ ] `R2_SECRET_ACCESS_KEY` is set in `.env`
- [ ] `R2_BUCKET_NAME` is set in `.env`
- [ ] `NEXT_PUBLIC_R2_PUBLIC_URL` is set for frontend

### Database
- [ ] Prisma schema is up to date
- [ ] Database migrations are applied
- [ ] `blog` table exists in database
- [ ] Can connect to database successfully

### R2 Storage
- [ ] R2 bucket exists and is accessible
- [ ] Bucket has proper CORS settings
- [ ] Bucket has public read access for images

---

## Backend API Testing

### 1. Create Blog API
**Endpoint:** `POST /api/crud/blog/create`

- [ ] Can create blog with all required fields
- [ ] Can create blog with optional image
- [ ] Can create blog with video URL
- [ ] Rejects blog without title
- [ ] Rejects blog without content
- [ ] Rejects invalid image formats
- [ ] Successfully uploads image to R2
- [ ] Auto-generates correct slug from title
- [ ] Sets publish status correctly
- [ ] Returns success response with blog data
- [ ] Returns error response with descriptive message

**Test Data:**
```
Title: "Test Blog Post"
Content: "<p>This is a test blog post content.</p>"
Author: "Admin"
Published: true
Image: test-image.jpg
Video URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

---

### 2. Fetch All Blogs API
**Endpoint:** `GET /api/crud/blog/fetch`

- [ ] Returns all blogs without parameters
- [ ] Pagination works correctly
- [ ] Search by title works
- [ ] Search by content works
- [ ] Search by author works
- [ ] Filter by published status works
- [ ] Filter by draft status works
- [ ] Returns correct pagination metadata
- [ ] Handles empty results gracefully
- [ ] Sorts by creation date (newest first)

**Test Queries:**
```
?page=1&limit=10
?search=test
?status=published
?page=2&limit=5&search=import&status=published
```

---

### 3. Fetch Single Blog API
**Endpoint:** `GET /api/crud/blog/fetch-single`

- [ ] Fetches blog by pidBlog
- [ ] Fetches blog by slug
- [ ] Returns 404 for non-existent blog
- [ ] Returns all blog fields
- [ ] Handles missing parameters gracefully

**Test Queries:**
```
?pidBlog=BLOG1735123456789
?slug=test-blog-post
?slug=non-existent-slug (should return 404)
```

---

### 4. Update Blog API
**Endpoint:** `PUT /api/crud/blog/update`

- [ ] Updates blog title
- [ ] Updates blog content
- [ ] Updates blog author
- [ ] Updates publish status
- [ ] Updates video URL
- [ ] Can update without changing image
- [ ] Can replace existing image
- [ ] Deletes old image from R2 when replaced
- [ ] Regenerates slug when title changes
- [ ] Returns 404 for non-existent blog
- [ ] Validates required fields

---

### 5. Delete Blog API
**Endpoint:** `DELETE /api/crud/blog/delete`

- [ ] Deletes blog from database
- [ ] Deletes associated image from R2
- [ ] Returns 404 for non-existent blog
- [ ] Returns success confirmation
- [ ] Requires pidBlog parameter

**Test:**
```
DELETE /api/crud/blog/delete?pidBlog=BLOG1735123456789
```

---

## Admin Dashboard UI Testing

### View All Blogs Page
**URL:** `/dashboard/blog/view`

- [ ] Page loads without errors
- [ ] Displays list of all blogs
- [ ] Shows blog thumbnails
- [ ] Shows blog title
- [ ] Shows blog excerpt
- [ ] Shows author name
- [ ] Shows publish status badge
- [ ] Shows creation date
- [ ] Search input is functional
- [ ] Status filter dropdown works
- [ ] Pagination controls work
- [ ] "Previous" button disabled on first page
- [ ] "Next" button disabled on last page
- [ ] Edit button navigates to edit page
- [ ] Delete button shows confirmation
- [ ] Delete button removes blog
- [ ] "Create New Post" button works
- [ ] Empty state shows when no blogs
- [ ] Loading state displays while fetching

---

### Create Blog Page
**URL:** `/dashboard/blog/create`

- [ ] Page loads without errors
- [ ] All form fields are present
- [ ] Title field accepts input
- [ ] Content textarea accepts input
- [ ] Author field has default value
- [ ] Publish status dropdown works
- [ ] Image upload component works
- [ ] Image preview shows after selection
- [ ] Video URL field accepts input
- [ ] Form validates required fields
- [ ] Submit button is disabled while loading
- [ ] Shows loading state during submission
- [ ] Shows success toast on creation
- [ ] Redirects to view page on success
- [ ] Shows error toast on failure
- [ ] Cancel button works
- [ ] Can navigate back to view page

**Test Scenarios:**
1. Create blog with all fields filled
2. Create blog without image
3. Create blog without video
4. Try to submit without title (should fail)
5. Try to submit without content (should fail)
6. Upload different image formats

---

### Edit Blog Page
**URL:** `/dashboard/blog/edit?pidBlog=XXX`

- [ ] Page loads without errors
- [ ] Loads blog data correctly
- [ ] Pre-fills title field
- [ ] Pre-fills content field
- [ ] Pre-fills author field
- [ ] Pre-fills publish status
- [ ] Pre-fills video URL
- [ ] Shows current image preview
- [ ] Can update all fields
- [ ] Can replace image
- [ ] Shows "new image selected" message
- [ ] Form validates required fields
- [ ] Submit button is disabled while loading
- [ ] Shows success toast on update
- [ ] Redirects to view page on success
- [ ] Shows error toast on failure
- [ ] Cancel button works
- [ ] Handles missing pidBlog parameter

**Test Scenarios:**
1. Edit blog title only
2. Edit blog content only
3. Change publish status
4. Replace image
5. Add video URL
6. Update all fields at once

---

## Sidebar Menu Testing

- [ ] "Blog Management" menu item is visible
- [ ] Menu is under "SYSTEM & SETTINGS" section
- [ ] Menu icon displays correctly
- [ ] Submenu expands on click
- [ ] "View All Posts" submenu item works
- [ ] "Create New Post" submenu item works
- [ ] Active state highlights correct page
- [ ] Menu works on desktop
- [ ] Menu works on mobile
- [ ] Menu works when sidebar is collapsed

---

## Image Storage Testing

### R2 Upload
- [ ] Images upload successfully
- [ ] Correct image format is maintained
- [ ] Unique filenames are generated
- [ ] Images are accessible via public URL
- [ ] Multiple images can be uploaded
- [ ] Large images are handled properly

### R2 Deletion
- [ ] Old images are deleted on update
- [ ] Images are deleted when blog is deleted
- [ ] Deletion doesn't fail if image doesn't exist
- [ ] Deletion errors are handled gracefully

### Image Display
- [ ] Images load on view page
- [ ] Images load on edit page
- [ ] Images load on public frontend
- [ ] Fallback image shows when missing
- [ ] Image URLs are correctly formatted
- [ ] Images display in correct aspect ratio

---

## Error Handling Testing

### API Errors
- [ ] 400 Bad Request for invalid input
- [ ] 404 Not Found for missing blogs
- [ ] 500 Internal Server Error handled
- [ ] Network errors handled
- [ ] Timeout errors handled

### UI Errors
- [ ] Shows user-friendly error messages
- [ ] Errors don't crash the application
- [ ] Error toasts display correctly
- [ ] Error states clear on retry
- [ ] Validation errors show inline

---

## Performance Testing

- [ ] Page loads in under 3 seconds
- [ ] API responses in under 1 second
- [ ] Images load progressively
- [ ] Pagination handles 100+ blogs
- [ ] Search results appear quickly
- [ ] No memory leaks on navigation
- [ ] Smooth scrolling on long lists

---

## Security Testing

### Authentication
- [ ] Admin routes require authentication
- [ ] Unauthenticated users redirected
- [ ] Session timeout works
- [ ] Public routes accessible without auth

### Authorization
- [ ] Only admins can create blogs
- [ ] Only admins can edit blogs
- [ ] Only admins can delete blogs
- [ ] Public can only read published blogs

### Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] File upload exploits prevented
- [ ] Large file uploads rejected
- [ ] Invalid file types rejected

---

## Browser Compatibility

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Mobile responsive (iOS)
- [ ] Mobile responsive (Android)

---

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Proper ARIA labels
- [ ] Color contrast sufficient
- [ ] Focus states visible
- [ ] Error messages accessible

---

## Integration Testing

### Frontend Integration (When Implemented)
- [ ] Public blog list displays
- [ ] Single blog page displays
- [ ] Blog images load from R2
- [ ] Video embeds work
- [ ] SEO metadata present
- [ ] Social sharing works
- [ ] Links work correctly

---

## Documentation Testing

- [ ] API documentation is accurate
- [ ] Code examples work as written
- [ ] Environment variables documented
- [ ] Installation steps are complete
- [ ] Troubleshooting guide helps
- [ ] All links work

---

## Final Checks

- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code is formatted
- [ ] Comments are clear
- [ ] Git commits are clean
- [ ] README is updated

---

## Test Results

**Date Tested:** _______________  
**Tested By:** _______________  
**Environment:** [ ] Local  [ ] Staging  [ ] Production

**Overall Status:** [ ] Pass  [ ] Fail  [ ] Needs Work

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Known Issues

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
|       |          |        |       |
|       |          |        |       |

---

## Next Steps

After all tests pass:
1. [ ] Deploy to staging environment
2. [ ] Run tests again on staging
3. [ ] Get user acceptance testing
4. [ ] Deploy to production
5. [ ] Monitor for issues
6. [ ] Update documentation as needed

---

**Testing Complete:** [ ] Yes  [ ] No  
**Ready for Production:** [ ] Yes  [ ] No
