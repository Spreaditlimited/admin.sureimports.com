import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/destroy';

async function getAuthPidUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;
  return payload.pidUser;
}

export async function GET() {
  try {
    const pidUser = await getAuthPidUser();
    if (!pidUser) return NextResponse.json({ statusx: 'ERROR', message: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.admin.findUnique({
      where: { pidUser },
      select: {
        pidUser: true,
        userEmail: true,
        userFirstname: true,
        userLastname: true,
        userPhone: true,
        userImage: true,
        userStatus: true,
        createdAt: true,
      },
    });

    if (!admin) return NextResponse.json({ statusx: 'ERROR', message: 'Admin not found' }, { status: 404 });

    return NextResponse.json({ statusx: 'SUCCESS', data: admin });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to fetch profile', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pidUser = await getAuthPidUser();
    if (!pidUser) return NextResponse.json({ statusx: 'ERROR', message: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.admin.findUnique({
      where: { pidUser },
      select: { userImage: true },
    });
    if (!existing) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Admin not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const userFirstname = String(formData.get('userFirstname') || '').trim();
    const userLastname = String(formData.get('userLastname') || '').trim();
    const userPhoneRaw = formData.get('userPhone');
    const imageFile = formData.get('image') as File | null;

    const data: any = {
      userFirstname: userFirstname || null,
      userLastname: userLastname || null,
      updatedAt: new Date(),
    };

    if (userPhoneRaw !== undefined && userPhoneRaw !== null && String(userPhoneRaw).trim() !== '') {
      const parsed = Number(String(userPhoneRaw).replace(/[^0-9]/g, ''));
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ statusx: 'ERROR', message: 'Invalid phone number' }, { status: 400 });
      }
      data.userPhone = parsed;
    }

    let cloudinarySync: any = null;
    if (imageFile && imageFile.size > 0) {
      const ext = (imageFile.name.split('.').pop() || '').toLowerCase();
      const allowed = ['png', 'jpg', 'jpeg', 'webp'];
      if (!allowed.includes(ext)) {
        return NextResponse.json(
          { statusx: 'ERROR', message: `Invalid image type .${ext}. Use png, jpg, jpeg, or webp.` },
          { status: 400 },
        );
      }

      const publicId = `ADMIN_PROFILE_${pidUser}_${Date.now()}`;
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const uploaded = await uploadBufferToCloudinary(buffer, {
        folder: 'admin-sureimports/admin-profile',
        publicId,
        useFilename: false,
        uniqueFilename: false,
        overwrite: true,
      });

      data.userImage = uploaded.publicId;
      cloudinarySync = {
        publicId: uploaded.publicId,
        url: uploaded.url,
        bytes: uploaded.bytes,
        format: uploaded.format,
      };

      if (existing.userImage) {
        try {
          await destroyCloudinaryAsset(existing.userImage);
        } catch (error) {
          console.error('Failed to delete previous profile image:', error);
        }
      }
    }

    const updated = await prisma.admin.update({
      where: { pidUser },
      data,
      select: {
        pidUser: true,
        userEmail: true,
        userFirstname: true,
        userLastname: true,
        userPhone: true,
        userImage: true,
        userStatus: true,
      },
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Profile updated successfully',
      data: updated,
      cloudinarySync,
    });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to update profile', error: error.message }, { status: 500 });
  }
}
