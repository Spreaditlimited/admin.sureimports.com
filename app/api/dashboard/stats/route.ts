import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ACTIVE_ORDER_STATUSES = [
  'pending',
  'approved',
  'pay-for-shipping',
  'in-transit',
  'ready-for-pickup',
]

const SUCCESS_PAYMENT_STATUSES = [
  'PAID',
  'paid',
  'success',
  'successful',
  'SUCCESS',
]

const PENDING_PAYMENT_STATUSES = new Set([
  'PENDING',
  'PENDING_CONFIRMATION',
  'INITIATED',
  'PROCESSING',
])

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function amountInNaira(
  amount: number,
  currency: string | null,
  ngnPerUsd: number,
  cnyPerUsd: number,
) {
  switch (String(currency || 'NGN').trim().toUpperCase()) {
    case 'USD':
      return amount * ngnPerUsd
    case 'CNY':
    case 'RMB':
      return (amount / cnyPerUsd) * ngnPerUsd
    default:
      return amount
  }
}

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
      legacyPayments,
      invoicePayments,
      pendingInvoiceClaims,
      exchangeRate,
      pendingPaySupplier,
      totalAffiliates,
      totalMessages,
      unreadMessages,
      totalStoreProducts,
      totalPaySmallSmall,
      completedPaySmallSmall,
      lineScoutLedger,
    ] = await Promise.all([
      // Total customers
      prisma.users.count(),

      // Active customers (userCid = 'VERIFIED')
      prisma.users.count({
        where: { userCid: 'VERIFIED' }
      }),

      // Total orders
      prisma.orders.count(),

      // Active orders in current lifecycle pipeline
      prisma.orders.count({
        where: {
          status: {
            in: ACTIVE_ORDER_STATUSES
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

      // Use the same sources and deduplication rule as the Financials screen.
      prisma.payments.findMany({
        select: {
          txID: true,
          paymentStatus: true,
          amount: true,
          currency: true,
        },
      }),

      prisma.invoice_payments.findMany({
        select: {
          pidInvoicePayment: true,
          amount: true,
          currency: true,
        },
      }),

      prisma.invoice_payment_claims.count({
        where: { status: 'PENDING_CONFIRMATION' },
      }),

      prisma.exchange_rate.findUnique({ where: { id: 1 } }),

      // Pending pay supplier requests
      prisma.pay_supplier.count({
        where: { status: 'pending' }
      }),

      // Total affiliates
      prisma.affiliate_accounts.count(),

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

      prisma.payment_ledger_entries.findMany({
        where: { sourceSystem: 'LINESCOUT' },
        select: { status: true, originalAmount: true, originalCurrency: true, settlementAmount: true, settlementCurrency: true },
      }),
    ])

    const mirroredInvoicePaymentIds = new Set(
      legacyPayments.map((payment) => payment.txID).filter(Boolean),
    )
    const independentInvoicePayments = invoicePayments.filter(
      (payment) => !mirroredInvoicePaymentIds.has(payment.pidInvoicePayment),
    )
    const completedLegacyPayments = legacyPayments.filter((payment) =>
      SUCCESS_PAYMENT_STATUSES.includes(String(payment.paymentStatus || '').trim()),
    )
    const pendingLegacyPayments = legacyPayments.filter((payment) =>
      PENDING_PAYMENT_STATUSES.has(String(payment.paymentStatus || '').trim().toUpperCase()),
    )
    const completedPayments = [
      ...completedLegacyPayments,
      ...independentInvoicePayments,
    ]
    const completedLineScoutPayments = lineScoutLedger.filter((payment) => payment.status === 'COMPLETED')
    const pendingLineScoutPayments = lineScoutLedger.filter((payment) => payment.status === 'PENDING')
    const ngnPerUsd = finite(exchangeRate?.exNairaToDollar)
    const cnyPerUsd = finite(exchangeRate?.exYuanToDollar)
    if (ngnPerUsd <= 0 || cnyPerUsd <= 0) {
      throw new Error('Exchange-rate configuration is invalid.')
    }
    const completedPaymentCount = completedPayments.length + completedLineScoutPayments.length
    const pendingPaymentCount =
      pendingLegacyPayments.length + pendingInvoiceClaims + pendingLineScoutPayments.length
    const totalPayments = completedPaymentCount + pendingPaymentCount
    const totalRevenue = completedPayments.reduce(
      (total, payment) =>
        total + amountInNaira(finite(payment.amount), payment.currency, ngnPerUsd, cnyPerUsd),
      0,
    ) + completedLineScoutPayments.reduce((total, payment) => {
      if (payment.settlementCurrency === 'NGN' && payment.settlementAmount) return total + finite(payment.settlementAmount)
      if (payment.settlementCurrency === 'USD' && payment.settlementAmount) return total + finite(payment.settlementAmount) * ngnPerUsd
      return total + amountInNaira(finite(payment.originalAmount), payment.originalCurrency, ngnPerUsd, cnyPerUsd)
    }, 0)

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
      completedPayments: completedPaymentCount,
      pendingPayments: pendingPaymentCount,
      pendingPaySupplier,
      totalAffiliates,
      totalMessages,
      unreadMessages,
      totalStoreProducts,
      totalPaySmallSmall,
      completedPaySmallSmall,
      totalRevenue,
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
