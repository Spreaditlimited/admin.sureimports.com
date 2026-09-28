import { prisma } from '@/lib/prisma';
import { vehicleAdmin } from '@/lib/vehicles/access';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await vehicleAdmin(false, true)) return new Response('Access denied', { status: 403 });
  const { id } = await params; const proof = await prisma.vehicle_payment_proofs.findUnique({ where: { id } });
  if (!proof) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(proof.content), { headers: { 'Content-Type': proof.mime, 'Content-Disposition': `attachment; filename="${proof.filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
