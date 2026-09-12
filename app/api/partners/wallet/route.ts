import { prisma } from '@/lib/prisma';
import { requirePartnerReviewer, reviewResponse } from '@/lib/partners/review';
import { WalletError, walletView, executeWalletTransfer, reconcileWalletTransfer, reviewWalletCredit } from '@/lib/partners/wallet';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
function failure(error: unknown) { return reviewResponse({ message: error instanceof WalletError ? error.message : 'Wallet operation needs reconciliation. Refresh before retrying.' }, error instanceof WalletError ? error.status : 503); }
export async function GET(request: Request) {
  try {
    if (!await requirePartnerReviewer()) return reviewResponse({ message: 'Not authorized.' }, 403);
    const id = new URL(request.url).searchParams.get('partnerId');
    if (id) return reviewResponse(await walletView(id));
    const businesses = await prisma.$queryRaw<Array<{ id: string; legalName: string }>>`SELECT p.id,p.legalName FROM procurement_partners p WHERE EXISTS (SELECT 1 FROM partner_wallet_accounts w WHERE w.partnerId=p.id) ORDER BY p.legalName LIMIT 250`;
    return reviewResponse({ businesses });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) return reviewResponse({ message: 'Invalid origin.' }, 403);
    const admin = await requirePartnerReviewer(); if (!admin) return reviewResponse({ message: 'Not authorized.' }, 403);
    const reader = request.body?.getReader(); if (!reader) throw new WalletError('Request required.', 422);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); throw new WalletError('Request too large.', 413); } chunks.push(value); }
    let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new WalletError('Invalid request.', 422); }
    if (!body || typeof body !== 'object') throw new WalletError('Invalid request.', 422);
    if (body.action === 'EXECUTE' && body.confirmed !== true) throw new WalletError('Confirm that you authorize this bank transfer.', 422);
    if (body.action === 'EXECUTE') await executeWalletTransfer(String(body.id || ''), admin.pidUser, body.otp ? String(body.otp) : undefined);
    else if (body.action === 'RECONCILE') await reconcileWalletTransfer(String(body.id || ''));
    else if (['HOLD', 'RELEASE', 'REVERSE'].includes(body.action) && body.confirmed === true) await reviewWalletCredit(String(body.id || ''), admin.pidUser, body.action, String(body.evidence || ''));
    else throw new WalletError('Choose an action and confirm the financial review.', 422);
    return reviewResponse({ message: 'Wallet updated. Refresh to see the latest verified status.' });
  } catch (error) { return failure(error); }
}
