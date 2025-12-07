// Interface for individual product items
interface ProductItem {
  product_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface StoreSalesEmailProps {
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

// Status-specific configurations
const STATUS_CONFIG: Record<string, { icon: string; title: string; color: string; message: string }> = {
  PAID: {
    icon: '💳',
    title: 'Payment Confirmed!',
    color: '#10b981',
    message: 'Your payment has been successfully received and your order is now being processed.',
  },
  PROCESSING: {
    icon: '📦',
    title: 'Order Being Prepared',
    color: '#3b82f6',
    message: 'Great news! Your order is currently being prepared for shipment.',
  },
  SHIPPED: {
    icon: '🚚',
    title: 'Order Shipped!',
    color: '#8b5cf6',
    message: 'Your order is on its way! It has been dispatched and is heading to your delivery address.',
  },
  DELIVERED: {
    icon: '📬',
    title: 'Order Delivered!',
    color: '#10b981',
    message: 'Your order has been successfully delivered to your address.',
  },
  COMPLETED: {
    icon: '✅',
    title: 'Order Completed!',
    color: '#059669',
    message: 'Thank you for shopping with us! Your order has been completed successfully.',
  },
};

const formatCurrency = (amount: string) => {
  const num = parseFloat(amount) || 0;
  return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const storeSalesMailTemplate = (props: StoreSalesEmailProps): string => {
  const config = STATUS_CONFIG[props.orderStatus] || STATUS_CONFIG.PAID;
  
  const trackingSection = props.orderStatus === 'SHIPPED' && props.trackingNumber ? `
    <!-- Tracking Info -->
    <tr>
      <td style="padding: 20px 30px;">
        <div style="background-color: #ede9fe; border-left: 4px solid #8b5cf6; padding: 15px; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #6b21a8; font-size: 14px; font-weight: 600;">
            📍 Track Your Package
          </p>
          <p style="margin: 0; color: #7c3aed; font-size: 13px;">
            <strong>Tracking Number:</strong> ${props.trackingNumber}<br/>
            ${props.trackingCompany ? `<strong>Carrier:</strong> ${props.trackingCompany}` : ''}
          </p>
        </div>
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update - ${props.orderId}</title>
</head>
<body style="font-family: Calibri, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 20px 10px 20px;">
              <div style="font-size: 50px; margin-bottom: 10px;">${config.icon}</div>
              <h2 style="margin: 10px 0 0 0; color: ${config.color}; font-size: 24px;">${config.title}</h2>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 30px 10px 30px;">
              <p style="margin: 0; color: #333333; font-size: 16px;">Dear <strong>${props.userName}</strong>,</p>
              <p style="margin: 15px 0 0 0; color: #666666; font-size: 15px; line-height: 1.6;">${config.message}</p>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td style="padding: 20px 30px;">
              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid ${config.color}; padding-bottom: 10px;">Order Details</h3>
                    
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order ID:</td>
                        <td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${props.orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order Date:</td>
                        <td align="right" style="padding: 8px 0; color: #374151; font-size: 14px;">${formatDate(props.orderDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                        <td align="right" style="padding: 8px 0;">
                          <span style="background-color: ${config.color}20; color: ${config.color}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${props.orderStatus}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Product Details -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">Order Items (${props.products.length})</h3>
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                      ${props.products.map((product, index) => `
                      <tr${index > 0 ? ' style="border-top: 1px solid #e5e7eb;"' : ''}>
                        <td style="padding: 10px 0 4px 0; color: #374151; font-size: 14px;"><strong>${product.product_name}</strong></td>
                        <td align="right" style="padding: 10px 0 4px 0; color: #374151; font-size: 14px;">×${product.quantity}</td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px 0; color: #6b7280; font-size: 12px;">${formatCurrency(product.unit_price)} each</td>
                        <td align="right" style="padding: 0 0 10px 0; color: #374151; font-size: 13px; font-weight: 500;">${formatCurrency(product.total_price)}</td>
                      </tr>
                      `).join('')}
                      <tr><td colspan="2" style="border-top: 2px solid #e5e7eb; padding-top: 12px;"></td></tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total Items:</td>
                        <td align="right" style="padding: 8px 0; color: #374151; font-size: 14px;">${props.totalQuantity}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700;">Order Total:</td>
                        <td align="right" style="padding: 8px 0; color: ${config.color}; font-size: 18px; font-weight: 700;">${formatCurrency(props.orderTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${trackingSection}

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">📍 Delivery Address</h3>
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                      ${props.shippingAddress}<br/>
                      <strong>Delivery Option:</strong> ${props.deliveryOption}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="padding: 20px 30px;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                Have questions about your order? Contact our support team for assistance.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <img src="https://sureimports.com/images/logo.png" height="35" alt="SureImports Logo" style="margin-bottom: 10px;" />
              <p style="margin: 10px 0; color: #666666; font-size: 14px; font-style: italic;">
                Start your importation with peace of mind
              </p>

              <p style="margin: 15px 0 5px 0; color: #9ca3af; font-size: 11px;">
                <a href="https://www.facebook.com/spreaditng" style="color: #6b7280; text-decoration: none;">Facebook</a> &nbsp;|&nbsp;
                <a href="https://www.youtube.com/@sureimports" style="color: #6b7280; text-decoration: none;">Youtube</a> &nbsp;|&nbsp;
                <a href="https://www.tiktok.com/@tochukwunkwocha" style="color: #6b7280; text-decoration: none;">Tiktok</a> &nbsp;|&nbsp;
                <a href="https://www.instagram.com/sureimport" style="color: #6b7280; text-decoration: none;">Instagram</a>
              </p>

              <p style="margin: 10px 0; color: #666666; font-size: 13px;">
                <a href="https://sureimports.com" style="color: #10b981; text-decoration: none; font-weight: 600;">www.sureimports.com</a>
              </p>

              <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                This is an automated notification. Please do not reply to this email.<br/>
                © ${new Date().getFullYear()} SureImports. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export default storeSalesMailTemplate;

