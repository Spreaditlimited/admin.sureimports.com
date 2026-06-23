import { PrismaClient } from '@prisma/client';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/app/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { BLOG_IMAGE_FOLDER } from '@/lib/blogImage';

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

    // Handle image upload if file is provided
    if (file) {
      const imageCode: string = randomGenerator(20);
      const originalFileName = file.name;
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

      const publicId = `BLOG_${imageCode}`;

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadedImage = await uploadBufferToCloudinary(buffer, {
          folder: BLOG_IMAGE_FOLDER,
          publicId,
          useFilename: false,
          uniqueFilename: false,
          overwrite: true,
        });

        newFileName = uploadedImage.publicId;
      } catch (error) {
        return NextResponse.json(
          {
            responsex: {
              message: `Image upload failed. ERROR: ${error}`,
              status: 'IMAGE_UPLOAD_FAILED',
            },
            successx: false,
          },
          { status: 500 }
        );
      }
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
