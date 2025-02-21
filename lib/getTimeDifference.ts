// lib/getTimeDifference.ts

/**
 * Calculates the time difference between order creation and now
 * @param createdAt - Date string in format "YYYY-MM-DD HH:mm:ss.SSS"
 * @returns string - Time difference in days or hours ago
 */
export function getTimeDifference(createdAt: string): string {
    try {
      // Parse the input date
      const orderDate = new Date(createdAt);
      const now = new Date();
  
      // Validate date
      if (isNaN(orderDate.getTime())) {
        throw new Error('Invalid date format');
      }
  
      // Calculate difference in milliseconds
      const diffMs = now.getTime() - orderDate.getTime();
  
      // Convert to hours and days
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
      if (diffDays >= 1) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      }
    } catch (error) {
      console.error('Error calculating time difference:', error);
      return 'Time unavailable';
    }
  }
  
// Example usage component
//   import { getTimeDifference } from '@/lib/getTimeDifference';
  
//   interface OrderCardProps {
//     order: {
//       id: string;
//       createdAt: string;
//     };
//   }
  
//   export default function OrderCard({ order }: OrderCardProps) {
//     const timeAgo = getTimeDifference(order.createdAt);
  
//     return (
//       <div className="order-card">
//         <p>Order ID: {order.id}</p>
//         <p>Created: {timeAgo}</p>
//       </div>
//     );
//   }
  
//   // Example usage:
//   const sampleOrder = {
//     id: '123',
//     createdAt: '2025-02-05 19:40:57.291'
//   };
//   // getTimeDifference(sampleOrder.createdAt) 
//   // On Feb 21, 2025 would return "16 days ago"