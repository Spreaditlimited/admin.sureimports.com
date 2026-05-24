import { PrismaClient } from '@prisma/client';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/app/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const publisherName = formData.get('publisherName') as string;
    const publisherEmail = formData.get('publisherEmail') as string || '';
    const publisherBio = formData.get('publisherBio') as string || '';
    const publisherRole = formData.get('publisherRole') as string || '';
    const publisherSocialX = formData.get('publisherSocialX') as string || '';
    const publisherSocialLinkedin = formData.get('publisherSocialLinkedin') as string || '';
    const publisherSocialFacebook = formData.get('publisherSocialFacebook') as string || '';
    const publisherSocialInstagram = formData.get('publisherSocialInstagram') as string || '';
    const publisherWebsite = formData.get('publisherWebsite') as string || '';

    // Validate required fields
    if (!publisherName?.trim()) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Publisher name is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if publisher with same name exists
    const existingPublisher = await prisma.blog_publisher.findFirst({
      where: {
        publisherName: publisherName.trim(),
      },
    });

    if (existingPublisher) {
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

    // Handle image upload
    const file = formData.get('image') as File | null;
    let newFileName = '';
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
    }

    // Generate unique ID and slug
    const pidPublisher = 'PUB' + Date.now().toString();
    const publisherSlug = generateSlug(publisherName);

    // Create publisher
    const publisher = await prisma.blog_publisher.create({
      data: {
        pidPublisher,
        publisherName: publisherName.trim(),
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Upload image to Cloudinary if file exists
    if (file && publisher && publisher.id) {
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
          message: 'Publisher created successfully',
          status: 'SUCCESS',
        },
        successx: true,
        data: publisher,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error creating publisher:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to create publisher',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
