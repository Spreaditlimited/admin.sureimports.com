import 'server-only';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { encryptKyc, decryptKyc } from './kyc-crypto';
import { walletTotals, walletAmount, transferState } from './wallet-policy';

type DB = Prisma.TransactionClient;
export class WalletError extends Error { constructor(message: string, public status = 400) { super(message); } }
type Credit = { orderId: string; partnerId: string; state: string; amountMinor: bigint; deliveryConfirmedAt: Date | null; deliveryMode: string | null; createdAt: Date };
type Withdrawal = { id: string; partnerId: string; amountMinor: bigint; status: string; destinationCiphertext: string; transferCode: string | null; failureCode: string | null; processingAt: Date | null; createdAt: Date };
type Destination = { recipient: string; bankName: string; accountName: string; accountNumberMasked: string };
const encode = (value: unknown, id: string) => encryptKyc(Buffer.from(JSON.stringify(value)), `wallet:${id}`).toString('base64');
const decode = <T,>(value: string, id: string): T => JSON.parse(decryptKyc(Buffer.from(value, 'base64'), `wallet:${id}`).toString('utf8'));
export async function walletAudit(db: DB, partnerId: string, subjectId: string, actor: string, action: string, details: unknown = {}) {
  const id = randomUUID(), encrypted = encode(details, partnerId);
  await db.$executeRaw`INSERT INTO partner_wallet_events (id,partnerId,subjectId,actorPid,action,detailsCiphertext) VALUES (${id},${partnerId},${subjectId},${actor},${action},${encrypted})`;
  if (['BANK_VERIFIED','EARNING_PENDING','CUSTOMER_RECEIPT_CONFIRMED','EARNING_HELD','EARNING_REVERSED','WITHDRAWAL_REQUESTED','TRANSFER_PAID','TRANSFER_FAILED','TRANSFER_REVERSED','ADMIN_HOLD','ADMIN_RELEASE','ADMIN_REVERSE'].includes(action)) {
    const notificationAction = `WALLET_${action}`;
    await db.$executeRaw`INSERT INTO procurement_partner_kyc_events (id,partnerId,actorPid,action,emailStatus,createdAt) SELECT ${id},${partnerId},${actor},${notificationAction},'QUEUED',NOW(3) FROM procurement_partner_kyc WHERE partnerId=${partnerId}`;
  }
}
export async function lockWallet(db: DB, partnerId: string) {
  await db.$executeRaw`INSERT INTO partner_wallet_accounts (partnerId) VALUES (${partnerId}) ON DUPLICATE KEY UPDATE partnerId=VALUES(partnerId)`;
  const [row] = await db.$queryRaw<Array<{ bankCiphertext: string | null }>>`SELECT bankCiphertext FROM partner_wallet_accounts WHERE partnerId=${partnerId} FOR UPDATE`;
  return row;
}
async function owner(db: DB, partnerId: string, actorPid: string, active = true) {
  const [p] = await db.$queryRaw<Array<{ ownerPidUser: string; status: string; country: string; settlementCurrency: string; kycStatus: string }>>`SELECT p.ownerPidUser,p.status,p.country,p.settlementCurrency,k.status AS kycStatus FROM procurement_partners p LEFT JOIN procurement_partner_kyc k ON k.partnerId=p.id WHERE p.id=${partnerId}`;
  if (!p || p.ownerPidUser !== actorPid) throw new WalletError('Wallet not found.', 404);
  if (p.country !== 'NG' || p.settlementCurrency !== 'NGN' || (active && (p.status !== 'ACTIVE' || p.kycStatus !== 'VERIFIED'))) throw new WalletError('Complete business verification before withdrawing earnings.', 403);
}
async function totals(db: DB, partnerId: string) {
  const credits = await db.$queryRaw<Credit[]>`SELECT state,amountMinor FROM partner_wallet_credits WHERE partnerId=${partnerId}`;
  const withdrawals = await db.$queryRaw<Withdrawal[]>`SELECT status,amountMinor FROM partner_wallet_withdrawals WHERE partnerId=${partnerId}`;
  return walletTotals(credits, withdrawals);
}
export async function walletView(partnerId: string, actorPid?: string) {
  return prisma.$transaction(async db => {
  if (actorPid) await owner(db, partnerId, actorPid, false);
  const [account] = await db.$queryRaw<Array<{ bankCiphertext: string | null }>>`SELECT bankCiphertext FROM partner_wallet_accounts WHERE partnerId=${partnerId}`;
  const bank = account?.bankCiphertext ? decode<Destination>(account.bankCiphertext, partnerId) : null;
  const credits = await db.$queryRaw<Credit[]>`SELECT orderId,partnerId,state,amountMinor,deliveryConfirmedAt,deliveryMode,createdAt FROM partner_wallet_credits WHERE partnerId=${partnerId} ORDER BY createdAt DESC LIMIT 100`;
  const withdrawals = await db.$queryRaw<Withdrawal[]>`SELECT id,amountMinor,status,failureCode,createdAt,destinationCiphertext FROM partner_wallet_withdrawals WHERE partnerId=${partnerId} ORDER BY createdAt DESC LIMIT 100`;
  return { balances: await totals(db, partnerId), bank: bank ? { bankName: bank.bankName, accountName: bank.accountName, accountNumberMasked: bank.accountNumberMasked } : null,
    credits: credits.map(row => ({ ...row, amountMinor: String(row.amountMinor) })), withdrawals: withdrawals.map(row => {
      const destination = decode<Destination>(row.destinationCiphertext, partnerId);
      return { id: row.id, amountMinor: String(row.amountMinor), status: row.status, failureCode: row.failureCode, createdAt: row.createdAt, bank: { bankName: destination.bankName, accountName: destination.accountName, accountNumberMasked: destination.accountNumberMasked } };
    }) };
  }, { isolationLevel: 'RepeatableRead', timeout: 10000 });
}
// Called inside the verified-payment transaction. Never backfill old automatic-split checkouts.
export async function creditWallet(db: DB, partnerId: string, orderId: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new WalletError('Invalid earning snapshot.', 409);
  await lockWallet(db, partnerId);
  const [existing] = await db.$queryRaw<Credit[]>`SELECT amountMinor FROM partner_wallet_credits WHERE orderId=${orderId} FOR UPDATE`;
  if (existing) { if (BigInt(existing.amountMinor) !== BigInt(amount)) throw new WalletError('Earning reconciliation required.', 409); return; }
  await db.$executeRaw`INSERT INTO partner_wallet_credits (orderId,partnerId,amountMinor,state) VALUES (${orderId},${partnerId},${BigInt(amount)},'PENDING')`;
  await walletAudit(db, partnerId, orderId, 'PAYSTACK', 'EARNING_PENDING', { amountMinor: String(amount) });
}
export async function holdWalletCredit(db: DB, partnerId: string, orderId: string, reversed: boolean, actor: string) {
  await lockWallet(db, partnerId);
  const [row] = await db.$queryRaw<Credit[]>`SELECT * FROM partner_wallet_credits WHERE orderId=${orderId} AND partnerId=${partnerId} FOR UPDATE`;
  if (!row || row.state === 'REVERSED') return;
  const state = reversed ? 'REVERSED' : 'HELD';
  if (row.state === state) return;
  await db.$executeRaw`UPDATE partner_wallet_credits SET state=${state},updatedAt=NOW(3) WHERE orderId=${orderId}`;
  await walletAudit(db, partnerId, orderId, actor, reversed ? 'EARNING_REVERSED' : 'EARNING_HELD');
}
export async function confirmCustomerReceipt(slug: string, actorPid: string, orderId: string, mode: string) {
  if (!['DELIVERED', 'PICKED_UP'].includes(mode)) throw new WalletError('Choose delivery or pickup.', 422);
  return prisma.$transaction(async db => {
    const [order] = await db.$queryRaw<Array<{ partnerId: string; customerPidUser: string; ownerPidUser: string; slug: string; paymentStatus: string; operationalStatus: string }>>`SELECT o.partnerId,o.customerPidUser,p.ownerPidUser,p.slug,o.paymentStatus,r.status AS operationalStatus FROM procurement_partner_customer_orders o INNER JOIN procurement_partners p ON p.id=o.partnerId LEFT JOIN orders r ON r.pidOrder=o.releasedOrderId WHERE o.id=${orderId} FOR UPDATE`;
    if (!order || order.slug !== slug || order.customerPidUser !== actorPid || order.ownerPidUser === actorPid) throw new WalletError('Order not found.', 404);
    if (order.operationalStatus !== 'completed' || order.paymentStatus !== 'PAID') throw new WalletError('Receipt confirmation is available after fulfilment is complete and payment is clear.', 409);
    await lockWallet(db, order.partnerId);
    const [credit] = await db.$queryRaw<Credit[]>`SELECT * FROM partner_wallet_credits WHERE orderId=${orderId} FOR UPDATE`;
    if (!credit || !['PENDING', 'AVAILABLE'].includes(credit.state)) throw new WalletError('This order requires support review.', 409);
    if (credit.deliveryConfirmedAt) return { message: 'Your receipt confirmation is already recorded.' };
    await db.$executeRaw`UPDATE partner_wallet_credits SET state='AVAILABLE',deliveryConfirmedAt=NOW(3),deliveryMode=${mode},updatedAt=NOW(3) WHERE orderId=${orderId}`;
    await walletAudit(db, order.partnerId, orderId, actorPid, 'CUSTOMER_RECEIPT_CONFIRMED', { mode });
    return { message: 'Thank you. Your receipt of the goods has been confirmed.' };
  });
}
export async function walletPaystack(path: string, body?: unknown, envelope = false) {
  const key = process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || '';
  const catalogueOnly = path.startsWith('/bank?') && !body;
  if (!key.startsWith('sk_live_') && !(catalogueOnly && key.startsWith('sk_test_'))) throw new WalletError('Live Paystack is required to save a real withdrawal destination or send money. This environment uses test credentials; no money has been sent.', 503);
  const response = await fetch(`https://api.paystack.co${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok || result.status !== true) {
    if (/insufficient.*balance|balance.*insufficient/i.test(String(result.message || ''))) throw new WalletError('The Paystack balance is too low. Fund the Sure Imports Paystack balance, then retry this same withdrawal reference.', 502);
    if (response.status === 429) throw new WalletError('Paystack is limiting requests. Wait briefly, then reconcile the existing withdrawal.', 429);
    throw new WalletError('Paystack could not complete this request. Check funding, bank details or reconcile the transfer before retrying.', 502);
  }
  return envelope ? result : result.data;
}
export async function walletBanks() {
  const banks = new Map<string, { code: string; name: string }>();
  const cursors = new Set<string>(); let next = '';
  for (let page = 0; page < 10; page++) {
    const result = await walletPaystack(`/bank?country=nigeria&currency=NGN&type=nuban&use_cursor=true&perPage=100${next ? `&next=${encodeURIComponent(next)}` : ''}`, undefined, true);
    if (!Array.isArray(result.data)) throw new WalletError('The bank list is temporarily unavailable.', 503);
    for (const row of result.data) if (typeof row.code === 'string' && typeof row.name === 'string' && row.active !== false && row.is_deleted !== true) banks.set(row.code, { code: row.code, name: row.name });
    next = typeof result.meta?.next === 'string' ? result.meta.next : '';
    if (!next) return [...banks.values()].sort((a,b) => a.name.localeCompare(b.name));
    if (cursors.has(next)) break;
    cursors.add(next);
  }
  throw new WalletError('The bank list could not be fully loaded. Please retry.', 503);
}
export async function saveWalletBank(partnerId: string, actorPid: string, bankCode: string, accountNumber: string) {
  if (!/^\d{3,12}$/.test(bankCode) || !/^\d{10}$/.test(accountNumber)) throw new WalletError('Select a bank and enter its 10-digit account number.', 422);
  await owner(prisma, partnerId, actorPid, false);
  const banks = await walletBanks(); const bank = banks.find(row => row.code === bankCode);
  if (!bank) throw new WalletError('Choose a supported Nigerian bank.', 422);
  const account = await walletPaystack(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  if (account.account_number !== accountNumber || !account.account_name) throw new WalletError('Account verification did not match.', 409);
  const recipient = await walletPaystack('/transferrecipient', { type: 'nuban', name: account.account_name, account_number: accountNumber, bank_code: bankCode, currency: 'NGN' });
  if (!/^RCP_/.test(recipient.recipient_code || '') || recipient.active !== true || recipient.currency !== 'NGN' || recipient.details?.account_number !== accountNumber || recipient.details?.bank_code !== bankCode) throw new WalletError('Paystack recipient verification failed.', 409);
  await prisma.$transaction(async db => {
    await owner(db, partnerId, actorPid, false); await lockWallet(db, partnerId);
    const encrypted = encode({ recipient: recipient.recipient_code, bankName: bank.name, accountName: account.account_name, accountNumberMasked: `••••••${accountNumber.slice(-4)}` }, partnerId);
    await db.$executeRaw`UPDATE partner_wallet_accounts SET bankCiphertext=${encrypted},bankVerifiedAt=NOW(3),updatedAt=NOW(3) WHERE partnerId=${partnerId}`;
    await walletAudit(db, partnerId, partnerId, actorPid, 'BANK_VERIFIED');
  });
}
export async function requestWalletWithdrawal(partnerId: string, actorPid: string, amountInput: unknown, retryKey: string) {
  let amount: bigint; try { amount = walletAmount(amountInput); } catch { throw new WalletError('Enter a valid withdrawal amount.', 422); }
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(retryKey)) throw new WalletError('A valid request key is required.', 422);
  return prisma.$transaction(async db => {
    await owner(db, partnerId, actorPid); const account = await lockWallet(db, partnerId);
    const [previous] = await db.$queryRaw<Withdrawal[]>`SELECT * FROM partner_wallet_withdrawals WHERE partnerId=${partnerId} AND retryKey=${retryKey}`;
    if (previous) { if (BigInt(previous.amountMinor) !== amount) throw new WalletError('This request key was used for another amount.', 409); return { id: previous.id }; }
    if (!account.bankCiphertext) throw new WalletError('Set up your verified withdrawal bank account first.', 409);
    const balance = await totals(db, partnerId);
    if (amount > BigInt(balance.available)) throw new WalletError('This amount exceeds your available earnings.', 409);
    const id = `pww_${randomUUID()}`;
    await db.$executeRaw`INSERT INTO partner_wallet_withdrawals (id,partnerId,retryKey,amountMinor,destinationCiphertext) VALUES (${id},${partnerId},${retryKey},${amount},${account.bankCiphertext})`;
    await walletAudit(db, partnerId, id, actorPid, 'WITHDRAWAL_REQUESTED', { amountMinor: amount.toString() });
    return { id };
  });
}
export async function cancelWalletWithdrawal(partnerId: string, actorPid: string, id: string) {
  await prisma.$transaction(async db => {
    await owner(db, partnerId, actorPid); await lockWallet(db, partnerId);
    const changed = await db.$executeRaw`UPDATE partner_wallet_withdrawals SET status='CANCELLED',updatedAt=NOW(3) WHERE id=${id} AND partnerId=${partnerId} AND status='REQUESTED'`;
    if (changed !== 1) throw new WalletError('Only a withdrawal not yet sent for processing can be cancelled.', 409);
    await walletAudit(db, partnerId, id, actorPid, 'WITHDRAWAL_CANCELLED');
  });
}
async function withdrawal(id: string) {
  if (!/^pww_[a-f0-9-]{36}$/.test(id)) throw new WalletError('Invalid withdrawal reference.', 422);
  const [row] = await prisma.$queryRaw<Withdrawal[]>`SELECT * FROM partner_wallet_withdrawals WHERE id=${id}`;
  if (!row) throw new WalletError('Withdrawal not found.', 404);
  return row;
}
export async function reconcileWalletTransfer(id: string) {
  const row = await withdrawal(id);
  if (['REQUESTED', 'CANCELLED'].includes(row.status)) throw new WalletError('This withdrawal has not been sent to Paystack.', 409);
  const verified = await walletPaystack(`/transfer/verify/${encodeURIComponent(id)}`);
  const bank = decode<Destination>(row.destinationCiphertext, row.partnerId);
  if (verified.reference !== id || verified.currency !== 'NGN' || BigInt(verified.amount) !== BigInt(row.amountMinor) || verified.recipient?.recipient_code !== bank.recipient || (verified.domain && verified.domain !== 'live')) throw new WalletError('Transfer details do not match this withdrawal. Reconciliation required.', 409);
  const state = transferState(String(verified.status));
  await prisma.$transaction(async db => {
    await lockWallet(db, row.partnerId);
    const [current] = await db.$queryRaw<Withdrawal[]>`SELECT * FROM partner_wallet_withdrawals WHERE id=${id} FOR UPDATE`;
    if (!current || current.status === 'CANCELLED' || current.status === 'REQUESTED' || current.status === 'REVERSED') return;
    if (current.status === 'PAID' && state !== 'REVERSED') return;
    if (current.status === 'FAILED' && !['PAID', 'REVERSED'].includes(state)) return;
    if (current.status === state) return;
    await db.$executeRaw`UPDATE partner_wallet_withdrawals SET status=${state},transferCode=${String(verified.transfer_code || '')},failureCode=NULL,updatedAt=NOW(3) WHERE id=${id}`;
    await walletAudit(db, row.partnerId, id, 'PAYSTACK', `TRANSFER_${state}`);
  });
  return { status: state };
}
export async function executeWalletTransfer(id: string, actorPid: string, otp?: string) {
  const initial = await withdrawal(id);
  const bank = decode<Destination>(initial.destinationCiphertext, initial.partnerId);
  if (otp) {
    if (initial.status !== 'OTP_REQUIRED' || !initial.transferCode || !/^\d{4,10}$/.test(otp)) throw new WalletError('A valid OTP is required for this transfer.', 422);
    await prisma.$transaction(async db => {
      await lockWallet(db, initial.partnerId);
      const [p] = await db.$queryRaw<Array<{ status: string; kycStatus: string }>>`SELECT p.status,k.status AS kycStatus FROM procurement_partners p INNER JOIN procurement_partner_kyc k ON k.partnerId=p.id WHERE p.id=${initial.partnerId}`;
      const [current] = await db.$queryRaw<Withdrawal[]>`SELECT * FROM partner_wallet_withdrawals WHERE id=${id} FOR UPDATE`;
      if (p?.status !== 'ACTIVE' || p.kycStatus !== 'VERIFIED' || current?.status !== 'OTP_REQUIRED' || BigInt((await totals(db, initial.partnerId)).adjustmentDue) > BigInt(0)) throw new WalletError('Resolve business approval or held earnings before authorizing this transfer.', 409);
      await walletAudit(db, initial.partnerId, id, actorPid, 'TRANSFER_OTP_AUTHORIZED');
    });
    await walletPaystack('/transfer/finalize_transfer', { transfer_code: initial.transferCode, otp });
    return reconcileWalletTransfer(id);
  }
  if (initial.status !== 'REQUESTED') {
    if (initial.status === 'PROCESSING' && initial.failureCode === 'PROVIDER_UNCERTAIN' && initial.processingAt && Date.now() - initial.processingAt.getTime() > 120000) {
      // Same reference only. Never create a second transfer while an outcome is uncertain.
    } else return reconcileWalletTransfer(id);
  }
  await prisma.$transaction(async db => {
    await lockWallet(db, initial.partnerId);
    const [p] = await db.$queryRaw<Array<{ status: string; kycStatus: string }>>`SELECT p.status,k.status AS kycStatus FROM procurement_partners p INNER JOIN procurement_partner_kyc k ON k.partnerId=p.id WHERE p.id=${initial.partnerId}`;
    if (p?.status !== 'ACTIVE' || p.kycStatus !== 'VERIFIED') throw new WalletError('Business approval must be current before payout.', 409);
    const [current] = await db.$queryRaw<Withdrawal[]>`SELECT * FROM partner_wallet_withdrawals WHERE id=${id} FOR UPDATE`;
    if (current.status !== initial.status || (current.status === 'PROCESSING' && (!current.processingAt || Date.now() - current.processingAt.getTime() <= 120000))) throw new WalletError('This withdrawal is already processing.', 409);
    if (BigInt((await totals(db, initial.partnerId)).adjustmentDue) > BigInt(0)) throw new WalletError('A disputed or reversed earning must be resolved before this withdrawal can be sent.', 409);
    await db.$executeRaw`UPDATE partner_wallet_withdrawals SET status='PROCESSING',processingAt=NOW(3),failureCode=NULL,updatedAt=NOW(3) WHERE id=${id}`;
    await walletAudit(db, initial.partnerId, id, actorPid, 'TRANSFER_INITIATED');
  });
  try {
    const result = await walletPaystack('/transfer', { source: 'balance', amount: Number(initial.amountMinor), currency: 'NGN', recipient: bank.recipient, reference: id, reason: 'Sure Imports partner earnings' });
    if (result.reference !== id) throw new WalletError('Unexpected transfer reference.', 409);
    // Persist the OTP code even before verification; never consider initialization proof of payout.
    await prisma.$executeRaw`UPDATE partner_wallet_withdrawals SET transferCode=${String(result.transfer_code || '')} WHERE id=${id}`;
    return await reconcileWalletTransfer(id);
  } catch (error) {
    await prisma.$executeRaw`UPDATE partner_wallet_withdrawals SET failureCode='PROVIDER_UNCERTAIN',updatedAt=NOW(3) WHERE id=${id} AND status='PROCESSING'`;
    throw error;
  }
}
export async function walletTransferWebhook(raw: string, signature: string) {
  const key = process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || '';
  if (!key.startsWith('sk_live_')) throw new WalletError('Webhook verification unavailable.', 503);
  const expected = createHmac('sha512', key).update(raw).digest('hex');
  if (!/^[a-f0-9]{128}$/i.test(signature) || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) throw new WalletError('Invalid signature.', 401);
  const event = JSON.parse(raw);
  if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) await reconcileWalletTransfer(String(event.data?.reference || ''));
  return { received: true };
}
export async function reconcilePendingWalletTransfers() {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM partner_wallet_withdrawals WHERE status IN ('PROCESSING','OTP_REQUIRED') ORDER BY updatedAt ASC LIMIT 5`;
  let reconciled = 0;
  for (const row of rows) {
    try { await reconcileWalletTransfer(row.id); reconciled++; } catch { /* Keep uncertain funds reserved. */ }
    // Rotate the bounded queue so long-running transfers cannot starve newer ones.
    await prisma.$executeRaw`UPDATE partner_wallet_withdrawals SET updatedAt=NOW(3) WHERE id=${row.id} AND status IN ('PROCESSING','OTP_REQUIRED')`;
  }
  return { checked: rows.length, reconciled };
}
export async function reviewWalletCredit(orderId: string, actorPid: string, action: string, evidence: string) {
  if (!['HOLD', 'RELEASE', 'REVERSE'].includes(action) || evidence.trim().length < 20 || evidence.length > 2000) throw new WalletError('Choose an action and record the evidence for this review (at least 20 characters).', 422);
  await prisma.$transaction(async db => {
    const [order] = await db.$queryRaw<Array<{ partnerId: string; paymentStatus: string; releasedOrderId: string | null; checkoutReference: string | null }>>`SELECT partnerId,paymentStatus,releasedOrderId,checkoutReference FROM procurement_partner_customer_orders WHERE id=${orderId} FOR UPDATE`;
    if (!order) throw new WalletError('Order not found.', 404);
    await lockWallet(db, order.partnerId);
    const [credit] = await db.$queryRaw<Credit[]>`SELECT * FROM partner_wallet_credits WHERE orderId=${orderId} FOR UPDATE`;
    if (!credit || credit.state === 'REVERSED') throw new WalletError('This earning cannot be changed. Reversed earnings require a separate reconciliation.', 409);
    if (action === 'RELEASE' && (credit.state !== 'HELD' || order.paymentStatus === 'REVERSED')) throw new WalletError('Release requires a held earning and no processed refund.', 409);
    // Clearing a hold must not bypass the customer's receipt confirmation.
    const state = action === 'REVERSE' ? 'REVERSED' : action === 'HOLD' ? 'HELD' : credit.deliveryConfirmedAt ? 'AVAILABLE' : 'PENDING';
    if (action === 'RELEASE' && order.paymentStatus === 'DISPUTED') {
      const partnerReview = order.releasedOrderId ? 'APPROVED' : 'AWAITING_REVIEW';
      await db.$executeRaw`UPDATE procurement_partner_customer_orders SET paymentStatus='PAID',partnerReview=${partnerReview},updatedAt=NOW(3) WHERE id=${orderId}`;
      if (order.checkoutReference) await db.payments.updateMany({ where: { txRef: order.checkoutReference, serviceName: 'PARTNER_PROCUREMENT', paymentStatus: 'DISPUTED' }, data: { paymentStatus: 'PAID', updatedAt: new Date() } });
      // Operational on-hold orders still require the fulfilment team's separate review.
    }
    await db.$executeRaw`UPDATE partner_wallet_credits SET state=${state},updatedAt=NOW(3) WHERE orderId=${orderId}`;
    await walletAudit(db, order.partnerId, orderId, actorPid, `ADMIN_${action}`, { evidence, previousState: credit.state, nextState: state });
  });
}
