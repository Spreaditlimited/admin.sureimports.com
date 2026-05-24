import { PrismaClient } from '@prisma/client';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/app/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const pidBlog = formData.get('pidBlog') as string;
    const blogTitle = formData.get('blogTitle') as string;
    const blogContent = formData.get('blogContent') as string;
    const blogBy = formData.get('blogBy') as string || 'Admin';
    const blogPublished = formData.get('blogPublished') === 'true';
    const blogFeatured = formData.get('blogFeatured') === 'true';
    const blogExt1 = formData.get('blogExt1') as string || ''; // Can be used for video URL
    const blogExt2 = formData.get('blogExt2') as string || ''; // Can be used for SEO data
    const categoryId = formData.get('categoryId') as string || null;
    const publisherId = formData.get('publisherId') as string || null;
    
    // Validate required fields
    if (!blogTitle || !blogContent) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Blog title and content are required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Get file from form
    const file = formData.get('file') as File | null;
    let newFileName = '';
    let fileType = '';

    // Handle image upload if file is provided
    if (file) {
      const imageCode: string = randomGenerator(20);
      const originalFileName = file.name;
      fileType = file.type;
      const fileExt = getFileExt(originalFileName);

      // Check file validity
      const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG', 'webp', 'gif'];
      const fileOK = fileFilter(fileExt, allowedExt);

      if (!fileOK) {
        return NextResponse.json(
          {
            responsex: {
              message: `Please select only valid images. ${fileExt} is not allowed`,
              status: 'INVALID_IMAGE_UPLOAD',
            },
            successx: false,
          },
          { status: 400 }
        );
      }

      newFileName = `BLOG_${imageCode}`;
    }

    // Generate slug
    const blogSlug = generateSlug(blogTitle);

    // Create blog post in database
    const blog = await prisma.blog.create({
      data: {
        pidBlog,
        blogTitle,
        blogContent,
        blogSlug,
        blogPublished,
        blogFeatured,
        blogImage: newFileName,
        blogBy,
        blogExt1,
        blogExt2,
        categoryId: categoryId || null,
        publisherId: publisherId || null,
        xStaus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Upload image to Cloudinary if file exists
    if (file && blog && blog.id) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadBufferToCloudinary(buffer, {
          folder: 'admin-sureimports/blog',
          publicId: newFileName,
          useFilename: false,
          uniqueFilename: false,
          overwrite: true,
        });

        return NextResponse.json(
          {
            responsex: {
              message: 'Blog post was successfully published',
              status: 'SUCCESS',
            },
            successx: true,
            data: blog,
          },
          { status: 200 }
        );
      } catch (error) {
        return NextResponse.json(
          {
            responsex: {
              message: `Blog created but image upload failed. ERROR: ${error}`,
              status: 'IMAGE_UPLOAD_FAILED',
            },
            successx: false,
            data: blog,
          },
          { status: 500 }
        );
      }
    }

    // Return success if no image
    return NextResponse.json(
      {
        responsex: {
          message: 'Blog post was successfully published',
          status: 'SUCCESS',
        },
        successx: true,
        data: blog,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error creating blog:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to create blog post',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
