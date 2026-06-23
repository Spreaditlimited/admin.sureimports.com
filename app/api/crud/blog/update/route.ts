import { PrismaClient } from '@prisma/client';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/app/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/destroy';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { BLOG_IMAGE_FOLDER, normalizeBlogImagePublicId } from '@/lib/blogImage';

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    
    const pidBlog = formData.get('pidBlog') as string;
    const blogTitle = formData.get('blogTitle') as string;
    const blogContent = formData.get('blogContent') as string;
    const blogBy = formData.get('blogBy') as string || 'Admin';
    const blogPublished = formData.get('blogPublished') === 'true';
    const blogFeatured = formData.get('blogFeatured') === 'true';
    const blogExt1 = formData.get('blogExt1') as string || '';
    const blogExt2 = formData.get('blogExt2') as string || '';
    const categoryId = formData.get('categoryId') as string || null;
    const publisherId = formData.get('publisherId') as string || null;
    
    if (!pidBlog) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Blog ID is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if blog exists
    const existingBlog = await prisma.blog.findUnique({
      where: { pidBlog },
    });

    if (!existingBlog) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Blog not found',
            status: 'NOT_FOUND',
          },
          successx: false,
        },
        { status: 404 }
      );
    }

    // Handle image upload if new file is provided
    const file = formData.get('file') as File | null;
    let newFileName = existingBlog.blogImage || '';

    if (file) {
      const imageCode: string = randomGenerator(20);
      const originalFileName = file.name;
      const fileExt = getFileExt(originalFileName);

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

    // Generate new slug if title changed
    const blogSlug = blogTitle !== existingBlog.blogTitle 
      ? generateSlug(blogTitle) 
      : existingBlog.blogSlug;

    // Update blog post
    const updatedBlog = await prisma.blog.update({
      where: { pidBlog },
      data: {
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
        updatedAt: new Date(),
      },
    });

    if (file && existingBlog.blogImage) {
      try {
        const oldPublicId = normalizeBlogImagePublicId(existingBlog.blogImage);
        if (oldPublicId && oldPublicId !== newFileName) {
          await destroyCloudinaryAsset(oldPublicId);
        }
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    return NextResponse.json(
      {
        responsex: {
          message: 'Blog post was successfully updated',
          status: 'SUCCESS',
        },
        successx: true,
        data: updatedBlog,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating blog:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to update blog post',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
