import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import randomGenerator from '@/lib/helpers/randomGenerator';

interface TransferItem {
  amount: number;
  recipient: string;
  reference: string;
  reason: string;
}

interface UserDetails {
  pidUser: string;
  userEmail: string;
  userFirstname: string | null;
  userLastname: string | null;
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

/**
 * Generate a unique debit ID
 */
function generateDebitId(): string {
  return `DEB_${Date.now()}_${randomGenerator(8)}`;
}

/**
 * Fetch user details for debit record creation
 */
async function fetchUserDetails(pidUser: string): Promise<UserDetails | null> {
  try {
    const user = await prisma.users.findUnique({
      where: { pidUser },
      select: {
        pidUser: true,
        userEmail: true,
        userFirstname: true,
        userLastname: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      pidUser: user.pidUser,
      userEmail: user.userEmail,
      userFirstname: user.userFirstname,
      userLastname: user.userLastname,
    };
  } catch (error) {
    console.error(`Error fetching user details for ${pidUser}:`, error);
    return null;
  }
}

/**
 * Create a debit record for a successful payout
 */
async function createDebitRecord(
  payout: any,
  transferCode: string,
  userDetails: UserDetails
): Promise<boolean> {
  try {
    const pidDebit = generateDebitId();
    const payerName = `${userDetails.userFirstname || ''} ${userDetails.userLastname || ''}`.trim() || 'Unknown';

    await prisma.debits.create({
      data: {
        pidDebit,
        pidUser: userDetails.pidUser,
        email: userDetails.userEmail,
        payerName,
        txID: transferCode,
        txRef: payout.reference || payout.pidPayout,
        paymentStatus: 'DEBITED',
        paymentType: 'BANK_PAYOUT',
        currency: 'NGN',
        amount: payout.amount || 0,
        serviceID: payout.pidPayout,
        serviceName: 'Bank Payout',
        serviceDescription: payout.reason || 'Wallet withdrawal to bank account',
        status1: 'SUCCESS',
        status2: null,
        debitExt1: payout.recipient, // Store recipient code
        debitExt2: null,
        xStatus: 'success',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Debit record created: ${pidDebit} for payout ${payout.pidPayout}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to create debit record for payout ${payout.pidPayout}:`, error);

    // If duplicate pidDebit, retry once with new ID
    if (error.code === 'P2002' && error.meta?.target?.includes('pidDebit')) {
      try {
        const newPidDebit = generateDebitId();
        const payerName = `${userDetails.userFirstname || ''} ${userDetails.userLastname || ''}`.trim() || 'Unknown';

        await prisma.debits.create({
          data: {
            pidDebit: newPidDebit,
            pidUser: userDetails.pidUser,
            email: userDetails.userEmail,
            payerName,
            txID: transferCode,
            txRef: payout.reference || payout.pidPayout,
            paymentStatus: 'DEBITED',
            paymentType: 'BANK_PAYOUT',
            currency: 'NGN',
            amount: payout.amount || 0,
            serviceID: payout.pidPayout,
            serviceName: 'Bank Payout',
            serviceDescription: payout.reason || 'Wallet withdrawal to bank account',
            status1: 'SUCCESS',
            status2: null,
            debitExt1: payout.recipient,
            debitExt2: null,
            xStatus: 'success',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        console.log(`✅ Debit record created (retry): ${newPidDebit} for payout ${payout.pidPayout}`);
        return true;
      } catch (retryError) {
        console.error(`❌ Retry failed for debit record creation:`, retryError);
        return false;
      }
    }

    return false;
  }
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

    // Process results and update database with debit records
    const results: TransferResult[] = [];

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

      // Process successful transfers with debit record creation
      if (isSuccess) {
        try {
          // Validate that pidUser exists
          if (!payout.pidUser) {
            console.error(`❌ Payout ${payout.pidPayout} has no pidUser - cannot create debit record`);
            results.push({
              pidPayout: payout.pidPayout,
              success: false,
              message: 'Payout has no associated user - debit record creation failed',
              transfer_code: transfer.transfer_code,
            });
            continue;
          }

          // Fetch user details
          const userDetails = await fetchUserDetails(payout.pidUser);

          if (!userDetails) {
            console.error(`❌ User not found for pidUser: ${payout.pidUser}`);
            results.push({
              pidPayout: payout.pidPayout,
              success: false,
              message: 'User not found - cannot create debit record',
              transfer_code: transfer.transfer_code,
            });
            continue;
          }

          // Use Prisma transaction to ensure atomicity
          await prisma.$transaction(async (tx) => {
            // Create debit record first
            const pidDebit = generateDebitId();
            const payerName = `${userDetails.userFirstname || ''} ${userDetails.userLastname || ''}`.trim() || 'Unknown';

            await tx.debits.create({
              data: {
                pidDebit,
                pidUser: userDetails.pidUser,
                email: userDetails.userEmail,
                payerName,
                txID: transfer.transfer_code,
                txRef: payout.reference || payout.pidPayout,
                paymentStatus: 'DEBITED',
                paymentType: 'BANK_PAYOUT',
                currency: 'NGN',
                amount: payout.amount || 0,
                serviceID: payout.pidPayout,
                serviceName: 'Bank Payout',
                serviceDescription: payout.reason || 'Wallet withdrawal to bank account',
                status1: 'SUCCESS',
                status2: null,
                debitExt1: payout.recipient, // Store recipient code
                debitExt2: transfer.transfer_code, // Store transfer code
                xStatus: transfer.status,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            console.log(`✅ Debit record created: ${pidDebit} for payout ${payout.pidPayout}`);

            // Then update payout request status
            await tx.payoutrequest.update({
              where: { pidPayout: payout.pidPayout },
              data: {
                status: 'Paid',
                xStatus: transfer.status,
                reference: transfer.transfer_code,
                updatedAt: new Date(),
              },
            });

            console.log(`✅ Payout ${payout.pidPayout} marked as Paid`);
          });

          // Transaction successful
          results.push({
            pidPayout: payout.pidPayout,
            success: true,
            message: 'Transfer initiated successfully and debit record created',
            transfer_code: transfer.transfer_code,
          });

          console.log(`✅ Successfully processed payout ${payout.pidPayout} with debit record`);

        } catch (error: any) {
          console.error(`❌ Error processing payout ${payout.pidPayout}:`, error);

          // If transaction fails, mark as failed
          results.push({
            pidPayout: payout.pidPayout,
            success: false,
            message: `Database update failed: ${error.message}`,
            transfer_code: transfer.transfer_code,
          });

          // Log the failure for audit
          console.error(`❌ CRITICAL: Paystack transfer succeeded but database update failed for ${payout.pidPayout}`);
          console.error(`Transfer Code: ${transfer.transfer_code}, Amount: ${payout.amount}`);
        }
      } else {
        // Handle failed transfers
        try {
          await prisma.payoutrequest.update({
            where: { pidPayout: payout.pidPayout },
            data: {
              status: 'Failed',
              xStatus: transfer.status,
              updatedAt: new Date(),
            },
          });

          results.push({
            pidPayout: payout.pidPayout,
            success: false,
            message: `Transfer failed: ${transfer.status}`,
            transfer_code: transfer.transfer_code,
          });

          console.log(`⚠️ Payout ${payout.pidPayout} marked as Failed`);
        } catch (error: any) {
          console.error(`❌ Error updating failed payout ${payout.pidPayout}:`, error);
          results.push({
            pidPayout: payout.pidPayout,
            success: false,
            message: `Transfer and database update failed: ${error.message}`,
            transfer_code: transfer.transfer_code,
          });
        }
      }
    }

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

