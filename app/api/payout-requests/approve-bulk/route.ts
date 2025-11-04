import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TransferItem {
  amount: number;
  recipient: string;
  reference: string;
  reason: string;
}

interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: Array<{
    reference: string;
    recipient: string;
    amount: number;
    transfer_code: string;
    currency: string;
    status: string;
  }>;
}

interface TransferResult {
  pidPayout: string;
  success: boolean;
  message: string;
  transfer_code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payoutIds, passcode } = body;

    // Validate inputs
    if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payout IDs',
        },
        { status: 400 }
      );
    }

    if (!passcode) {
      return NextResponse.json(
        {
          success: false,
          message: 'Passcode is required',
        },
        { status: 400 }
      );
    }

    // Validate passcode
    const adminPasscode = process.env.ADMIN_PAYOUT_PASSCODE || 'admin123'; // Default for development
    if (passcode !== adminPasscode) {
      // Log failed attempt
      console.warn(`Failed payout approval attempt with incorrect passcode at ${new Date().toISOString()}`);
      
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid passcode',
        },
        { status: 401 }
      );
    }

    // Get Paystack secret key
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

    // Fetch payout requests from database
    const payoutRequests = await prisma.payoutrequest.findMany({
      where: {
        pidPayout: {
          in: payoutIds,
        },
        status: 'Pending', // Only process pending requests
      },
    });

    if (payoutRequests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid pending payout requests found',
        },
        { status: 404 }
      );
    }

    // Validate that all payouts have recipient codes
    const invalidPayouts = payoutRequests.filter((p) => !p.recipient);
    if (invalidPayouts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${invalidPayouts.length} payout(s) missing recipient code`,
          invalidPayouts: invalidPayouts.map((p) => p.pidPayout),
        },
        { status: 400 }
      );
    }

    // Prepare transfers for Paystack
    const transfers: TransferItem[] = payoutRequests.map((payout) => ({
      amount: Math.round((payout.amount || 0) * 100), // Convert to kobo
      recipient: payout.recipient!,
      reference: payout.reference || payout.pidPayout,
      reason: payout.reason || 'Payout transfer',
    }));

    // Log the bulk transfer attempt
    console.log(`Initiating bulk transfer for ${transfers.length} payouts at ${new Date().toISOString()}`);
    console.log('Transfer details:', JSON.stringify(transfers, null, 2));

    // Call Paystack Bulk Transfer API
    const paystackResponse = await fetch('https://api.paystack.co/transfer/bulk', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'NGN',
        source: 'balance',
        transfers: transfers,
      }),
    });

    const paystackData: PaystackTransferResponse = await paystackResponse.json();

    console.log('Paystack response:', JSON.stringify(paystackData, null, 2));

    if (!paystackData.status) {
      // Log failed bulk transfer
      console.error(`Bulk transfer failed: ${paystackData.message}`);
      
      return NextResponse.json(
        {
          success: false,
          message: paystackData.message || 'Failed to initiate bulk transfer',
        },
        { status: 400 }
      );
    }

    // Process results and update database
    const results: TransferResult[] = [];
    const updatePromises: Promise<any>[] = [];

    for (const transfer of paystackData.data) {
      // Find the corresponding payout request
      const payout = payoutRequests.find(
        (p) => p.reference === transfer.reference || p.pidPayout === transfer.reference
      );

      if (!payout) {
        results.push({
          pidPayout: transfer.reference,
          success: false,
          message: 'Payout request not found in database',
        });
        continue;
      }

      const isSuccess = transfer.status === 'success' || transfer.status === 'pending';

      results.push({
        pidPayout: payout.pidPayout,
        success: isSuccess,
        message: isSuccess ? 'Transfer initiated successfully' : `Transfer failed: ${transfer.status}`,
        transfer_code: transfer.transfer_code,
      });

      // Update database record
      if (isSuccess) {
        updatePromises.push(
          prisma.payoutrequest.update({
            where: { pidPayout: payout.pidPayout },
            data: {
              status: 'Paid',
              xStatus: transfer.status,
              reference: transfer.transfer_code,
              updatedAt: new Date(),
            },
          })
        );
      } else {
        updatePromises.push(
          prisma.payoutrequest.update({
            where: { pidPayout: payout.pidPayout },
            data: {
              status: 'Failed',
              xStatus: transfer.status,
              updatedAt: new Date(),
            },
          })
        );
      }
    }

    // Execute all database updates
    await Promise.all(updatePromises);

    // Log successful completion
    const successCount = results.filter((r) => r.success).length;
    console.log(`Bulk transfer completed: ${successCount}/${results.length} successful`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} transfers`,
      results,
    });
  } catch (error: any) {
    console.error('Bulk approval error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process bulk approval',
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

