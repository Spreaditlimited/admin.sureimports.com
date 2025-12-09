import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import sendStoreSalesEmail from '@/lib/email/sendStoreSalesEmail';

// Valid status transitions
const VALID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

// Interface for product items in email
interface ProductItem {
  product_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, newStatus, trackingNumber, trackingCompany, store = 'main' } = body;

    // Validate required fields
    if (!orderId || !newStatus) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'orderId and newStatus are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { statusx: 'ERROR', message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate store type
    if (!['main', 'faya'].includes(store)) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Invalid store type. Must be "main" or "faya"' },
        { status: 400 }
      );
    }

    let orderItems: any[] = [];

    // Fetch all products in this order group (by ext1 or pidStore)
    // orderId could be ext1 (order group ID) or pidStore (for single-item orders)
    if (store === 'faya') {
      // First try to find by ext1 (order group ID)
      orderItems = await prisma.store_sales_faya.findMany({
        where: { ext1: orderId },
      });
      // If not found by ext1, try by pidStore (single-item order)
      if (orderItems.length === 0) {
        const singleItem = await prisma.store_sales_faya.findUnique({
          where: { pidStore: orderId },
        });
        if (singleItem) orderItems = [singleItem];
      }
    } else {
      // Main store
      orderItems = await prisma.store_sales.findMany({
        where: { ext1: orderId },
      });
      if (orderItems.length === 0) {
        const singleItem = await prisma.store_sales.findUnique({
          where: { pidStore: orderId },
        });
        if (singleItem) orderItems = [singleItem];
      }
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Order not found' },
        { status: 404 }
      );
    }

    const firstItem = orderItems[0];
    const previousStatus = firstItem.status;

    // Build update data - use ext2 for tracking number since ext1 is order group ID
    const updateData: any = {
      status: newStatus,
    };

    if (trackingNumber) {
      updateData.ext2 = trackingNumber; // Store tracking in ext2
    }

    // Update ALL products in this order group
    let updatedCount = 0;
    if (store === 'faya') {
      // Update by ext1 if it exists, otherwise by pidStore
      if (firstItem.ext1) {
        const result = await prisma.store_sales_faya.updateMany({
          where: { ext1: orderId },
          data: updateData,
        });
        updatedCount = result.count;
      } else {
        await prisma.store_sales_faya.update({
          where: { pidStore: orderId },
          data: updateData,
        });
        updatedCount = 1;
      }
    } else {
      if (firstItem.ext1) {
        const result = await prisma.store_sales.updateMany({
          where: { ext1: orderId },
          data: updateData,
        });
        updatedCount = result.count;
      } else {
        await prisma.store_sales.update({
          where: { pidStore: orderId },
          data: updateData,
        });
        updatedCount = 1;
      }
    }

    console.log(`✅ Order ${orderId} [${store.toUpperCase()}] - ${updatedCount} item(s) updated from ${previousStatus} to ${newStatus}`);

    // Fetch user details for email notification
    // For faya store, strip "faya_" prefix from pidUser before lookup
    let userDetails: {
      pidUser: string;
      userFirstname: string | null;
      userLastname: string | null;
      userEmail: string;
      userPhone: string | null;
    } | null = null;
    let userEmail: string | null = null;
    let mainStoreShippingAddress: string | null = null; // Store shipping address for main store

    if (firstItem.pidUser) {
      if (store === 'faya') {
        // Faya store: pidUser contains "faya_email@example.com" format
        // Strip the "faya_" prefix to get the actual email
        const cleanPidUser = firstItem.pidUser.replace(/^faya_/, '');
        console.log(`🔍 Faya store email lookup: "${firstItem.pidUser}" → "${cleanPidUser}"`);

        userDetails = await prisma.users.findFirst({
          where: {
            OR: [
              { pidUser: cleanPidUser },
              { userEmail: cleanPidUser },
            ],
          },
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
          },
        });

        userEmail = userDetails?.userEmail || (cleanPidUser.includes('@') ? cleanPidUser : null);
      } else {
        // Main store: pidUser is the actual user ID - lookup in users table (includes shipping addresses)
        console.log(`🔍 Main store email lookup using pidUser: "${firstItem.pidUser}"`);

        const mainStoreUserDetails = await prisma.users.findUnique({
          where: { pidUser: firstItem.pidUser },
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
            userShippingAddress: true,
            userShippingAddress2: true,
          },
        });

        if (mainStoreUserDetails) {
          console.log(`✅ Main store user found: ${mainStoreUserDetails.userEmail} (${mainStoreUserDetails.userFirstname} ${mainStoreUserDetails.userLastname})`);
          // Extract shipping address with priority: userShippingAddress2 > userShippingAddress
          mainStoreShippingAddress = mainStoreUserDetails.userShippingAddress2?.trim() || mainStoreUserDetails.userShippingAddress?.trim() || null;
          // Assign common fields to userDetails for name usage
          userDetails = {
            pidUser: mainStoreUserDetails.pidUser,
            userFirstname: mainStoreUserDetails.userFirstname,
            userLastname: mainStoreUserDetails.userLastname,
            userEmail: mainStoreUserDetails.userEmail,
            userPhone: mainStoreUserDetails.userPhone,
          };
        } else {
          console.warn(`⚠️ Main store user not found for pidUser: "${firstItem.pidUser}"`);
        }

        userEmail = mainStoreUserDetails?.userEmail || null;
      }
    }

    // Build products array for email
    const products: ProductItem[] = orderItems.map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    // Calculate order totals
    const totalQuantity = orderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const orderTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);

    // Send ONE email notification for the entire order (non-blocking)
    if (userEmail) {
      try {
        const userName = store === 'faya'
          ? (firstItem.fullName || `${userDetails?.userFirstname || ''} ${userDetails?.userLastname || ''}`.trim() || 'Valued Customer')
          : (`${userDetails?.userFirstname || ''} ${userDetails?.userLastname || ''}`.trim() || 'Valued Customer');

        // Shipping address: Faya uses order.address, Main uses pre-computed mainStoreShippingAddress
        const shippingAddress = store === 'faya'
          ? (firstItem.address || 'N/A')
          : (mainStoreShippingAddress || 'N/A');
        const deliveryOption = store === 'faya' ? (firstItem.deliveryOption || 'Standard Delivery') : 'Standard Delivery';

        const emailSent = await sendStoreSalesEmail({
          userEmail,
          userName,
          orderId,
          products, // Array of products
          totalQuantity: totalQuantity.toString(),
          orderTotal: orderTotal.toFixed(2),
          orderStatus: newStatus,
          shippingAddress,
          deliveryOption,
          trackingNumber: trackingNumber || firstItem.ext2 || null,
          trackingCompany: trackingCompany || null,
          orderDate: firstItem.createdAt.toISOString(),
        });

        if (emailSent) {
          console.log(`📧 Email notification sent to ${userEmail} for order ${orderId} (${orderItems.length} items) [${store.toUpperCase()}]`);
        } else {
          console.warn(`⚠️ Email notification failed for order ${orderId}, but status was updated`);
        }
      } catch (emailError: any) {
        console.error(`❌ Email sending error for order ${orderId}:`, emailError.message);
      }
    } else {
      console.warn(`⚠️ No email address found for order ${orderId} [${store.toUpperCase()}]`);
    }

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: `Order status updated to ${newStatus} (${updatedCount} item(s))`,
      data: { orderId, updatedCount, newStatus },
      previousStatus,
      store,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to update order status', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

