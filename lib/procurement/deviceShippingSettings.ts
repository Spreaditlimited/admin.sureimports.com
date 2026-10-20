import { prisma } from '@/lib/prisma';
import { defaultDeviceRates } from './deviceShipping';
export async function getDeviceShippingSettings() {
  const rows = await prisma.$queryRaw<{ phoneNgn: number; laptopNgn: number; revision: number }[]>`SELECT phoneNgn, laptopNgn, revision FROM nigeria_device_shipping_settings WHERE id = 1`;
  const row = rows[0];
  return row ? { phoneNgn: Number(row.phoneNgn), laptopNgn: Number(row.laptopNgn), revision: row.revision } : { ...defaultDeviceRates, revision: 0 };
}
