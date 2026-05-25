import xMail from '@/lib/email/xMail2';

// Interface for individual product items
interface ProductItem {
  product_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface StoreSalesEmailData {
  userEmail: string;
  userName: string;
  orderId: string;
  products: ProductItem[]; // Array of products in the order
  totalQuantity: string;
  orderTotal: string;
  orderStatus: string;
  shippingAddress: string;
  deliveryOption: string;
  trackingNumber?: string | null;
  trackingCompany?: string | null;
  orderDate: string;
}

// Status-specific email subjects
const STATUS_SUBJECTS: Record<string, string> = {
  PAID: 'Payment Confirmed',
  PROCESSING: 'Your Order is Being Prepared',
  SHIPPED: 'Your Order Has Been Shipped',
  DELIVERED: 'Your Order Has Been Delivered',
  COMPLETED: 'Order Completed - Thank You!',
};

export default async function sendStoreSalesEmail(data: StoreSalesEmailData): Promise<boolean> {
  try {
    console.log('🔄 Starting store sales email sending process...');
    console.log('📧 Email data:', {
      userEmail: data.userEmail,
      userName: data.userName,
      orderId: data.orderId,
      orderStatus: data.orderStatus,
      productCount: data.products.length,
    });

    const {
      userEmail,
      userName,
      orderId,
      products,
      totalQuantity,
      orderTotal,
      orderStatus,
      shippingAddress,
      deliveryOption,
      trackingNumber,
      trackingCompany,
      orderDate,
    } = data;

    // Validate email address
    if (!userEmail || !userEmail.includes('@')) {
      console.error('❌ Invalid email address:', userEmail);
      return false;
    }

    const subjectPrefix = STATUS_SUBJECTS[orderStatus] || 'Order Update';
    const itemCount = products.length > 1 ? ` (${products.length} items)` : '';
    const subject = `${subjectPrefix} - Order #${orderId.slice(0, 20)}${itemCount}`;

    console.log('📝 Email subject:', subject);
    console.log('🎨 Generating email template...');

    const lines = products
      .map(
        (product) =>
          `<tr>
            <td style="padding:6px;border:1px solid #e5e7eb;">${product.product_name}</td>
            <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">${product.quantity}</td>
            <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">₦${Number(product.unit_price || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">₦${Number(product.total_price || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>`,
      )
      .join('');

    const details = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Order ID</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${orderId}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Status</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${orderStatus}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Order Date</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${orderDate}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Total Quantity</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${totalQuantity}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Order Total</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>₦${Number(orderTotal || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td></tr>
</table>
<div style="margin-top:10px;">
  <b>Order Items</b>
  <table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
    <tr>
      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left;background:#f8fafc;">Product</th>
      <th style="padding:6px;border:1px solid #e5e7eb;text-align:right;background:#f8fafc;">Qty</th>
      <th style="padding:6px;border:1px solid #e5e7eb;text-align:right;background:#f8fafc;">Unit Price</th>
      <th style="padding:6px;border:1px solid #e5e7eb;text-align:right;background:#f8fafc;">Total</th>
    </tr>
    ${lines}
  </table>
</div>
<div style="margin-top:10px;">
  <b>Delivery Address</b><br />
  ${shippingAddress}<br />
  <b>Delivery Option:</b> ${deliveryOption}<br />
  ${trackingNumber ? `<b>Tracking Number:</b> ${trackingNumber}<br />` : ''}
  ${trackingCompany ? `<b>Tracking Company:</b> ${trackingCompany}<br />` : ''}
</div>`;

    await xMail({
      xEmail: userEmail,
      xTitle: subject,
      xBodyTitle: `Order Update - ${orderStatus}`,
      xBody1: `Hello ${userName},<br />${STATUS_SUBJECTS[orderStatus] || 'There is an update to your order.'}`,
      xBody2: details,
      xButtonTitle: 'View Order',
      xButtonLink: 'https://sureimports.com/dashboard/orders',
    });

    console.log(`✅ Store sales email sent successfully to ${userEmail} (Order: ${orderId}, ${products.length} items, Status: ${orderStatus})`);
    return true;
  } catch (error) {
    console.error('❌ Error sending store sales email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return false;
  }
}
