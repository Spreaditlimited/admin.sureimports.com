import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Interface for individual product items
interface ProductItem {
  pidStore: string;
  pidProduct: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

// Interface for grouped order
interface GroupedOrder {
  orderId: string; // ext1 or pidStore for single-item orders
  pidUser: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  items: ProductItem[];
  totalQuantity: number;
  totalPrice: number;
  // Customer info (for display)
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  deliveryOption?: string | null;
  deliveryLocation?: string | null;
  userEmail?: string | null;
  activeTab?: string | null;
  purchaseType?: string | null;
  // For tracking (now using ext2 since ext1 is order group ID)
  trackingNumber?: string | null;
  trackingCompany?: string | null;
}

// Helper function to group sales by ext1 (order ID)
function groupSalesByOrderId(sales: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  for (const sale of sales) {
    // Use ext1 as order group ID; if null/empty, use pidStore as unique order
    const orderId = sale.ext1 || sale.pidStore;

    if (!grouped.has(orderId)) {
      grouped.set(orderId, []);
    }
    grouped.get(orderId)!.push(sale);
  }

  return grouped;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const store = searchParams.get('store') || 'main'; // 'main' or 'faya' (default: main)

    // Build where clause based on store type
    const where: any = {};

    // Search filter - different fields for each store
    if (search) {
      if (store === 'faya') {
        where.OR = [
          { pidStore: { contains: search } },
          { product_name: { contains: search } },
          { pidUser: { contains: search } },
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { address: { contains: search } },
          { ext1: { contains: search } }, // Search by order ID
        ];
      } else {
        where.OR = [
          { pidStore: { contains: search } },
          { product_name: { contains: search } },
          { pidUser: { contains: search } },
          { ext1: { contains: search } }, // Search by order ID
        ];
      }
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    console.log(`Store Sales [${store.toUpperCase()}] Where clause:`, JSON.stringify(where, null, 2));

    let allSales: any[] = [];
    let allFilteredSales: { total_price: string }[];

    if (store === 'faya') {
      // Get all matching sales for faya store
      allSales = await prisma.store_sales_faya.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      allFilteredSales = allSales;
    } else {
      // Get all matching sales for main store
      allSales = await prisma.store_sales.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      allFilteredSales = allSales;
    }

    // Build a fallback lookup for product names in case legacy rows have empty product_name.
    const pidProducts = Array.from(
      new Set(
        allSales
          .map((sale) => sale.pidProduct)
          .filter((pid): pid is string => typeof pid === 'string' && pid.trim().length > 0)
      )
    );

    const storeProducts = pidProducts.length
      ? await prisma.store.findMany({
          where: { pidProduct: { in: pidProducts } },
          select: { pidProduct: true, productName: true },
        })
      : [];

    const productNameByPid = new Map<string, string>();
    for (const p of storeProducts) {
      if (p.pidProduct) {
        productNameByPid.set(p.pidProduct, p.productName || '');
      }
    }

    // Preload user records for main store in one query (avoids N+1 lookups).
    const userByPid = new Map<
      string,
      {
        userFirstname: string | null;
        userLastname: string | null;
        userEmail: string | null;
        userPhone: string | null;
        userShippingAddress: string | null;
        userShippingAddress2: string | null;
      }
    >();
    const paymentByTxRef = new Map<string, { paymentExt1: string | null; paymentExt2: string | null }>();

    if (store === 'main') {
      const pidUsers = Array.from(
        new Set(
          allSales
            .map((sale) => sale.pidUser)
            .filter((pid): pid is string => typeof pid === 'string' && pid.trim().length > 0)
        )
      );

      if (pidUsers.length) {
        const users = await prisma.users.findMany({
          where: { pidUser: { in: pidUsers } },
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

        for (const u of users) {
          userByPid.set(u.pidUser, {
            userFirstname: u.userFirstname,
            userLastname: u.userLastname,
            userEmail: u.userEmail,
            userPhone: u.userPhone,
            userShippingAddress: u.userShippingAddress,
            userShippingAddress2: u.userShippingAddress2,
          });
        }
      }
    }

    const refs = Array.from(new Set(allSales.map((sale) => sale.ext1).filter(Boolean)));
    if (refs.length > 0) {
      const payments = await prisma.payments.findMany({
        where: { txRef: { in: refs as string[] } },
        select: { txRef: true, paymentExt1: true, paymentExt2: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const payment of payments) {
        if (!payment.txRef || paymentByTxRef.has(payment.txRef)) continue;
        paymentByTxRef.set(payment.txRef, {
          paymentExt1: payment.paymentExt1,
          paymentExt2: payment.paymentExt2,
        });
      }
    }

    // Group sales by order ID (ext1)
    const groupedSalesMap = groupSalesByOrderId(allSales);

    // Convert to array of grouped orders
    const allGroupedOrders: GroupedOrder[] = [];

    for (const [orderId, items] of groupedSalesMap) {
      const firstItem = items[0];

      // Calculate totals
      const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
      const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);

      // Build product items array
      const productItems: ProductItem[] = items.map(item => ({
        pidStore: item.pidStore,
        pidProduct: item.pidProduct,
        product_name: item.product_name || productNameByPid.get(item.pidProduct) || 'Unnamed Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      // Get user details for main store (includes shipping addresses)
      const userDetails = store === 'main' && firstItem.pidUser
        ? userByPid.get(firstItem.pidUser) || null
        : null;

      const paymentMeta = firstItem.ext1 ? paymentByTxRef.get(firstItem.ext1) : null;

      // For main store: use payment-time shipping snapshot first, then profile fallback.
      const mainStoreShippingAddress = paymentMeta?.paymentExt1?.trim()
        || userDetails?.userShippingAddress2?.trim()
        || userDetails?.userShippingAddress?.trim()
        || null;

      const groupedOrder: GroupedOrder = {
        orderId,
        pidUser: firstItem.pidUser,
        status: firstItem.status,
        createdAt: firstItem.createdAt,
        updatedAt: firstItem.updatedAt,
        items: productItems,
        totalQuantity,
        totalPrice,
        // Customer info
        fullName: store === 'faya'
          ? firstItem.fullName
          : (userDetails ? `${userDetails.userFirstname || ''} ${userDetails.userLastname || ''}`.trim() || null : null),
        phone: store === 'faya' ? firstItem.phone : userDetails?.userPhone || null,
        // Shipping address: Faya uses order.address, Main uses userShippingAddress2 (priority) or userShippingAddress
        address: store === 'faya' ? firstItem.address : mainStoreShippingAddress,
        deliveryOption: store === 'faya' ? firstItem.deliveryOption : null,
        deliveryLocation: store === 'faya' ? firstItem.deliveryLocation : null,
        userEmail: store === 'faya' ? null : userDetails?.userEmail || null,
        activeTab: store === 'faya' ? firstItem.activeTab : null,
        purchaseType: store === 'faya' ? firstItem.purchaseType : null,
        // Tracking info is stored on payment metadata to avoid clashing with payment method.
        trackingNumber: paymentMeta?.paymentExt2 || null,
        trackingCompany: null, // No longer using ext2 for company
      };

      allGroupedOrders.push(groupedOrder);
    }

    // Sort by createdAt descending
    allGroupedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to grouped orders
    const totalCount = allGroupedOrders.length;
    const skip = (page - 1) * limit;
    const paginatedOrders = allGroupedOrders.slice(skip, skip + limit);

    // Calculate total amount from all filtered records
    const filteredTotalAmount = allFilteredSales.reduce((sum, sale) => {
      return sum + (parseFloat(sale.total_price) || 0);
    }, 0);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`Found ${paginatedOrders.length} grouped orders [${store.toUpperCase()}], total orders: ${totalCount}, total amount: ${filteredTotalAmount}`);

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: paginatedOrders,
      totalCount,
      totalPages,
      currentPage: page,
      perPage: limit,
      totalAmount: filteredTotalAmount,
      store,
    });
  } catch (error: any) {
    console.error('Error fetching store sales:', error);
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to fetch store sales',
        error: error.message,
        data: [],
        totalCount: 0,
        totalPages: 0,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
