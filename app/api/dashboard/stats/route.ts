import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Fetch all stats in parallel for better performance
    const [
      totalCustomers,
      activeCustomers,
      totalOrders,
      activeOrders,
      totalProducts,
      storeProducts,
      totalServices,
      totalPayments,
      pendingPaySupplier,
      totalAffiliates,
      totalMessages,
      unreadMessages,
      totalStoreProducts,
      totalPaySmallSmall,
      completedPaySmallSmall,
    ] = await Promise.all([
      // Total customers
      prisma.users.count(),

      // Active customers (userCid = 'VERIFIED')
      prisma.users.count({
        where: { userCid: 'VERIFIED' }
      }),

      // Total orders
      prisma.orders.count(),

      // Active orders (pending/processing)
      prisma.orders.count({
        where: {
          orderStatus: {
            in: ['pending', 'processing', 'shipped', 'Pending', 'Processing', 'Shipped']
          }
        }
      }),

      // Total products in orders
      prisma.products.count(),

      // Store products
      prisma.store.count({
        where: { productVisibility: true }
      }),

      // Total services (special sourcing + shipping only + verify supplier)
      Promise.all([
        prisma.special_sourcing.count(),
        prisma.shipping_only.count(),
        prisma.verify_supplier.count(),
        prisma.pay_supplier.count(),
      ]).then(counts => counts.reduce((a, b) => a + b, 0)),

      // Total payments
      prisma.payments.count(),

      // Pending pay supplier requests
      prisma.pay_supplier.count({
        where: { status: 'pending' }
      }),

      // Total affiliates
      prisma.affiliates.count(),

      // Total messages
      prisma.messages.count(),

      // Unread messages (for admin)
      prisma.messages.count({
        where: { messageStatus: 'unread' }
      }),

      // Total store products (all)
      prisma.store.count(),

      // Total PaySmallSmall entries
      prisma.paysmallsmall.count(),

      // Completed PaySmallSmall
      prisma.paysmallsmall.count({
        where: { status: 'COMPLETED' }
      }),
    ])

    // Calculate total revenue - check for multiple possible success statuses
    const totalRevenue = await prisma.payments.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        OR: [
          { paymentStatus: 'PAID' },
          { paymentStatus: 'paid' },
          { paymentStatus: 'success' },
          { paymentStatus: 'successful' },
          { paymentStatus: 'SUCCESS' },
        ]
      },
    })

    // Recent orders (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentOrders = await prisma.orders.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    const stats = {
      totalCustomers,
      activeCustomers,
      totalOrders,
      activeOrders,
      totalProducts,
      storeProducts,
      totalServices,
      totalPayments,
      pendingPaySupplier,
      totalAffiliates,
      totalMessages,
      unreadMessages,
      totalStoreProducts,
      totalPaySmallSmall,
      completedPaySmallSmall,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentOrders,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
