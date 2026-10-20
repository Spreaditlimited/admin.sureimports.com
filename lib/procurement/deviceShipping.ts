/** Explicit product classification: accessories are OTHER, never inferred from a name. */
export const deviceTypes = ['OTHER', 'PHONE', 'LAPTOP'] as const;
export type DeviceType = (typeof deviceTypes)[number];
export const validDeviceType = (value: unknown): value is DeviceType => deviceTypes.includes(value as DeviceType);
export type DeviceRates = { phoneNgn: number; laptopNgn: number };
export const defaultDeviceRates: DeviceRates = { phoneNgn: 25000, laptopNgn: 50000 };
export function orderDeviceRates(order: { devicePhoneRateNgn?: number | null; deviceLaptopRateNgn?: number | null }, country: string): DeviceRates | null {
  if (country.trim().toLowerCase() !== 'nigeria' || order.devicePhoneRateNgn == null || order.deviceLaptopRateNgn == null) return null;
  return { phoneNgn: order.devicePhoneRateNgn, laptopNgn: order.deviceLaptopRateNgn };
}
export function deviceShippingBreakdown(products: { productCategory?: string | null; productQuantity?: number | null; productWeight?: number | null; shippingMeasurePerUnit?: number | null }[], rates: DeviceRates | null, measurementVersion: number | null | undefined) {
  let phones = 0, laptops = 0, measurement = 0, otherLines = 0, unclassified = 0;
  for (const product of products) {
    if (rates && !validDeviceType(product.productCategory)) unclassified++;
    const quantity = Number(product.productQuantity || 0);
    if (rates && (product.productCategory === 'PHONE' || product.productCategory === 'LAPTOP')) {
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Device quantities must be whole numbers.');
      if (product.productCategory === 'PHONE') phones += quantity; else laptops += quantity;
    } else {
      otherLines++;
      measurement += quantity * Number((measurementVersion === 2 ? product.shippingMeasurePerUnit : product.productWeight) || 0);
    }
  }
  return { phones, laptops, otherLines, unclassified, measurement, phoneRateNgn: rates?.phoneNgn || 0, laptopRateNgn: rates?.laptopNgn || 0, totalNgn: phones * (rates?.phoneNgn || 0) + laptops * (rates?.laptopNgn || 0), enabled: Boolean(rates) };
}

export function usesDeviceFlatFee(countryName: string | null | undefined, productCategory: string | null | undefined) {
  return countryName?.trim().toLowerCase() === 'nigeria' && (productCategory === 'PHONE' || productCategory === 'LAPTOP');
}
