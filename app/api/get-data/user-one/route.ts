import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const pidUser = request.nextUrl.searchParams.get('pidUser');

  if (!pidUser) {
    return NextResponse.json(
      { error: 'pidUser parameter is required' },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.users.findUnique({
      where: { pidUser: pidUser },
      select: {
        id: true,
        pidUser: true,
        userFirstname: true,
        userLastname: true,
        userEmail: true,
        userPhone: true,
        bank_name: true,
        bank_account_number: true,
        bank_account_name: true,
        bank_code: true,
        bank_transfer_code: true,
        userCountry: true,
        userState: true,
        address: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

