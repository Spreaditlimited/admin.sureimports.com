import sendEmail from '@/lib/email/config/sendEmail';
import storeSalesMailTemplate from '@/lib/email/temp/storeSalesMailTemplate';

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

    const htmlContent = storeSalesMailTemplate({
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
    });

    console.log('📤 Sending email via SMTP...');
    await sendEmail(userEmail, subject, htmlContent);

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

