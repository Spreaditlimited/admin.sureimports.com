import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const paystackSecretKey = process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'Paystack secret key not configured',
        },
        { status: 500 }
      );
    }

    // Call Paystack Balance API
    const response = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.status && data.data) {
      // Paystack returns balance in kobo, convert to naira
      const balanceInNaira = data.data[0].balance / 100;

      return NextResponse.json({
        success: true,
        balance: {
          available: balanceInNaira,
          currency: data.data[0].currency,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Failed to fetch balance from Paystack',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check balance',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

