import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = new URL('../', import.meta.url).pathname;
const require = createRequire(root + 'package.json');
const ts = require('typescript');
const React = require('react');
const icons = {};
new Function('exports', 'require', fs.readFileSync(path.join(root, 'node_modules/lucide-react/dist/cjs/lucide-react.js'), 'utf8'))(icons, require);
const { renderToStaticMarkup } = require('react-dom/server');
const { Prisma } = require('@prisma/client');
const now = new Date('2026-09-14T12:30:00Z');
const account = { id: 1, pidAffiliate: 'AFF-DEMO', firstNameCiphertext: 'Ada', lastNameCiphertext: 'Okafor', emailCiphertext: 'ada@example.invalid', phoneCiphertext: '+234 800 000 0000', country: 'Nigeria', status: 'ACTIVE', referralCode: 'ada-trade', createdAt: now, lastLoginAt: now, emailVerifiedAt: now, termsAcceptedAt: now, consentVersion: '2026-09', referralAliases: [{ id: 1, aliasCode: 'ada-linescout', sourceSystem: 'LINESCOUT', active: true }], payoutAccounts: [{ id: 1, provider: 'PAYSTACK', currency: 'NGN', status: 'VERIFIED', verifiedAt: now }], _count: { referrals: 2, conversions: 2, payouts: 1, shippingAttributions: 1 } };
const referral = { id: 2, pidReferral: 'REF-DEMO', customerReference: 'CUSTOMER-DEMO', source: 'SURE_IMPORTS', landingPath: '/', firstTouchAt: now, lastTouchAt: now, claimedAt: now, convertedAt: now, _count: { conversions: 1 } };
const conversion = { id: 3, pidConversion: 'COMMISSION-DEMO', referralId: 2, externalOrderReference: 'procurement:ORDER-DEMO', externalPaymentReference: 'PAYMENT-DEMO', sourceSystem: 'SURE_IMPORTS', sourceEventKey: 'PURCHASE', paymentCurrency: 'NGN', grossAmount: '100000', eligibleAmount: '85000', commissionCurrency: 'NGN', commissionAmount: '1700', commissionBasisUnit: null, commissionBasisQuantity: null, commissionRate: '2', status: 'AVAILABLE', releaseMode: 'AUTOMATIC', releaseAt: now, approvedAt: now, availableAt: now, voidedAt: null, reversalReason: null, reversalReference: null, createdAt: now, service: { displayName: 'Buy from Chinese websites' }, referral: { customerReference: 'CUSTOMER-DEMO' }, payoutItem: { amount: '1700', payout: { pidPayout: 'PAYOUT-DEMO', status: 'PAID', currency: 'NGN', requestedAt: now } } };

export function workspaceHarness(options = {}) {
  const calls = [];
  const currentReferral = { ...referral, ...(options.linescout ? { customerReference: 'linescout:42', source: 'LINESCOUT' } : {}), ...(options.unclaimed ? { customerReference: null, claimedAt: null } : {}) };
  const samples = {
    affiliate_accounts: [account], affiliate_referrals: [currentReferral], affiliate_conversions: [conversion],
    users: [{ pidUser: 'CUSTOMER-DEMO', userFirstname: 'Chidi', userLastname: 'Nwosu', userEmail: 'chidi@example.invalid' }],
    affiliate_payouts: [{ id: 1, pidPayout: 'PAYOUT-DEMO', provider: 'PAYSTACK', currency: 'NGN', amount: '1700', status: 'PAID', providerStatus: 'success', externalReference: 'TRANSFER-DEMO', requestedAt: now, processedAt: now, failedAt: null, failureReason: null, _count: { items: 1 } }],
    shipping_request_attributions: [{ id: 1, pidShippingOnly: 'SHIPMENT-DEMO', referralId: 2, sourceType: 'PARTNER_API', sourceReference: 'CLIENT-ORDER-DEMO', lockedAt: now, _count: { invoiceSnapshots: 1 } }],
    affiliate_email_events: [{ id: 1, eventType: 'PAYOUT_PAID', status: 'SENT', attempts: 1, createdAt: now, sentAt: now }],
    payments: [{ id: 1, pidPayment: 'PAYMENT-DEMO', serviceID: 'ORDER-DEMO', txRef: 'PROVIDER-DEMO', txID: 'CAPTURE-DEMO', paymentStatus: 'SUCCESS', paymentType: 'PAYSTACK', currency: 'NGN', amount: 100000, serviceName: 'Procurement', createdAt: now }],
    payment_records: [{ id: 1, pidPayment: 'HISTORICAL-DEMO', pid_order: 'OLD-ORDER', tx_code: 'OLD-PROVIDER', payment_status: 'PAID', payment_type: 'BANK', currency_type: 'NGN', amount: '5000', service_type: 'SHIPPING', createdAt: now }],
    payment_ledger_entries: [{ id: 1, pidLedgerEntry: 'LEDGER-DEMO', sourceSystem: 'LINESCOUT', sourcePaymentType: 'PROJECT', sourcePaymentId: '42', sourceOrderReference: 'LS-ORDER-DEMO', purpose: 'PROJECT_PAYMENT', provider: 'PAYPAL', providerReference: 'PAYPAL-DEMO', status: 'COMPLETED', originalCurrency: 'USD', originalAmount: '250', settlementCurrency: 'USD', settlementAmount: '250', eligibleAmount: '250', occurredAt: now, processingStatus: 'PROCESSED', events: [{ id: 1, eventType: 'PAYMENT_STATUS_CHANGED', receivedAt: now, processedAt: now }], _count: { events: 1 }, conversion: { pidConversion: 'LS-COMMISSION', affiliateId: 1, commissionCurrency: 'USD', commissionAmount: '5', status: 'AVAILABLE' } }],
    invoice_payments: [{ id: 1, pidInvoicePayment: 'INVOICE-PAY-DEMO', pidInvoice: 'INVOICE-DEMO', amount: '120', currency: 'GBP', paymentMethod: 'BANK', reference: 'UK-BANK-DEMO', paidAt: now, invoice: { invoiceNumber: 'INV-2026-DEMO', status: 'PAID' } }],
    invoice_payment_claims: [{ id: 1, pidClaim: 'CLAIM-DEMO', pidInvoice: 'INVOICE-DEMO', claimedAmount: '120', currency: 'GBP', paymentReference: 'UK-BANK-DEMO', status: 'APPROVED', claimedAt: now, reviewedAt: now, approvedInvoicePaymentPid: 'INVOICE-PAY-DEMO' }],
    refund_records: [{ id: 1, pidRefund: 'REFUND-DEMO', pidOrder: 'ORDER-DEMO', amount: '20', currency: 'USD', refundStatus: 'paid', serviceType: 'PROCUREMENT', createdAt: now }],
    bank_payment: [{ id: 1, pidBankPayment: 'BANK-DEMO', pidOrder: 'ORDER-DEMO', amount: '100000', currency: 'NGN', trxNumber: 'BANK-REF-DEMO', serviceType: 'PROCUREMENT', bankStatus: 'VERIFIED', status: 'APPROVED', createdAt: now }],
  };
  const db = new Proxy({}, { get: (_, model) => {
    if (model === '$queryRaw') return async query => { calls.push({ model, query }); return []; };
    return new Proxy({}, { get: (_, method) => async args => {
      calls.push({ model, method, args });
      if (!['findUnique', 'findFirst', 'findMany', 'count', 'groupBy'].includes(method)) throw Error('Mutation prohibited');
      if (method === 'groupBy') return options.empty ? [] : model === 'affiliate_payouts' ? [{ currency: 'NGN', status: 'PAID', _sum: { amount: '1700' } }] : [{ commissionCurrency: 'NGN', status: 'AVAILABLE', _sum: { commissionAmount: '1700' }, _count: { _all: 1 } }, { commissionCurrency: 'USD', status: 'PENDING', _sum: { commissionAmount: '5' }, _count: { _all: 1 } }];
      if (method === 'count') return options.empty ? 0 : (samples[model] || []).length;
      if (method === 'findUnique') return args.where.id === 1 ? account : null;
      if (method === 'findFirst') return args.where.id === 2 && args.where.affiliateId === 1 && (!args.where.customerReference || currentReferral.customerReference !== null) ? currentReferral : null;
      return options.empty ? [] : samples[model] || [];
    } });
  } });
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('exports', 'require', code)(exports, id => {
      if (id === 'server-only') return {};
      if (id === 'lucide-react') return icons;
      if (id === '@/lib/prisma') return { prisma: options.database || db };
      if (id === '@/lib/affiliate/adminAuth') return { requireAffiliateAdmin: async () => options.denied ? null : { pidUser: 'MOCK-ADMIN' } };
      if (id === '@/lib/affiliate/security') return options.security || { decryptAffiliateValue: value => value, affiliateEmailHash: () => 'MOCK-HASH' };
      if (id === 'next/navigation') return { redirect: () => { throw Error('REDIRECT'); }, notFound: () => { throw Error('NOT_FOUND'); } };
      if (id === 'next/link') return { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) };
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? id.slice(2) : path.normalize(path.join(path.dirname(file), id));
        const target = ['.ts', '.tsx'].map(ext => base + ext).find(value => fs.existsSync(path.join(root, value)));
        if (target) return load(target);
      }
      return require(id);
    });
    return exports;
  }
  return { calls, db, load, async render(kind, search = {}, ids = {}) {
    const file = kind === 'profile' ? 'app/(dashboard)/dashboard/affiliates/[affiliateId]/page.tsx' : 'app/(dashboard)/dashboard/affiliates/[affiliateId]/referrals/[referralId]/page.tsx';
    const element = await load(file).default({ params: Promise.resolve({ affiliateId: '1', referralId: '2', ...ids }), searchParams: Promise.resolve(search) });
    return renderToStaticMarkup(element);
  } };
}
