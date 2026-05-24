import { PrismaClient } from '@prisma/client';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/app/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/destroy';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();

    const pidPublisher = formData.get('pidPublisher') as string;
    const publisherName = formData.get('publisherName') as string;
    const publisherEmail = formData.get('publisherEmail') as string || '';
    const publisherBio = formData.get('publisherBio') as string || '';
    const publisherRole = formData.get('publisherRole') as string || '';
    const publisherSocialX = formData.get('publisherSocialX') as string || '';
    const publisherSocialLinkedin = formData.get('publisherSocialLinkedin') as string || '';
    const publisherSocialFacebook = formData.get('publisherSocialFacebook') as string || '';
    const publisherSocialInstagram = formData.get('publisherSocialInstagram') as string || '';
    const publisherWebsite = formData.get('publisherWebsite') as string || '';

    if (!pidPublisher) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Publisher ID is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if publisher exists
    const existingPublisher = await prisma.blog_publisher.findUnique({
      where: { pidPublisher },
    });

    if (!existingPublisher) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Publisher not found',
            status: 'NOT_FOUND',
          },
          successx: false,
        },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current publisher)
    if (publisherName?.trim()) {
      const duplicatePublisher = await prisma.blog_publisher.findFirst({
        where: {
          publisherName: publisherName.trim(),
          pidPublisher: { not: pidPublisher },
        },
      });

      if (duplicatePublisher) {
        return NextResponse.json(
          {
            responsex: {
              message: 'A publisher with this name already exists',
              status: 'DUPLICATE_ERROR',
            },
            successx: false,
          },
          { status: 400 }
        );
      }
    }

    // Handle image upload
    const file = formData.get('image') as File | null;
    let newFileName = existingPublisher.publisherImage || '';
    let fileType = '';

    if (file) {
      const imageCode: string = randomGenerator(20);
      const originalFileName = file.name;
      fileType = file.type;
      const fileExt = getFileExt(originalFileName);

      const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG', 'webp'];
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

      newFileName = `PUBLISHER_${imageCode}`;

      // Delete old image from Cloudinary if exists
      if (existingPublisher.publisherImage) {
        try {
          await destroyCloudinaryAsset(existingPublisher.publisherImage);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }
    }

    // Generate new slug if name changed
    const publisherSlug = publisherName !== existingPublisher.publisherName
      ? generateSlug(publisherName)
      : existingPublisher.publisherSlug;

    // Update publisher
    const updatedPublisher = await prisma.blog_publisher.update({
      where: { pidPublisher },
      data: {
        publisherName: publisherName?.trim() || existingPublisher.publisherName,
        publisherSlug,
        publisherEmail: publisherEmail.trim() || null,
        publisherBio: publisherBio.trim() || null,
        publisherRole: publisherRole.trim() || null,
        publisherImage: newFileName || null,
        publisherSocialX: publisherSocialX.trim() || null,
        publisherSocialLinkedin: publisherSocialLinkedin.trim() || null,
        publisherSocialFacebook: publisherSocialFacebook.trim() || null,
        publisherSocialInstagram: publisherSocialInstagram.trim() || null,
        publisherWebsite: publisherWebsite.trim() || null,
        updatedAt: new Date(),
      },
    });

    // Upload new image to Cloudinary if file exists
    if (file) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadBufferToCloudinary(buffer, {
          folder: 'admin-sureimports/blog-publisher',
          publicId: newFileName,
          useFilename: false,
          uniqueFilename: false,
          overwrite: true,
        });
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    return NextResponse.json(
      {
        responsex: {
          message: 'Publisher updated successfully',
          status: 'SUCCESS',
        },
        successx: true,
        data: updatedPublisher,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating publisher:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to update publisher',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
