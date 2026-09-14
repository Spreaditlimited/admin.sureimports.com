import { PARTNER_WALLET_READY } from './wallet-policy';
import { createHash } from 'node:crypto';
import { z } from 'zod';

// Published versions are immutable. Content changes require a new version and acceptance.
export const AGREEMENT_VERSION = 'partner-2026-09-14-v4';
export const AGREEMENT_ACTION = 'AGREEMENT_ACCEPTED';
export const agreementInput = z.object({
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  fullName: z.string().trim().min(2).max(150),
  role: z.string().trim().min(2).max(100),
  confirmed: z.literal(true),
  reachedEnd: z.literal(true),
}).strict();

export type AgreementBusiness = {
  id: string; ownerPidUser: string; legalName: string; registrationNumber: string;
  businessType: string | null; country: string; settlementCurrency: string;
  serviceChargeBps: number; partnerShareBps: number; pricingRevision: number;
};
export function agreementOffer(business: AgreementBusiness) {
  if (!((business.country === 'NG' && business.settlementCurrency === 'NGN') || (business.country === 'GB' && business.settlementCurrency === 'GBP' && ['UK_INDIVIDUAL','UK_COMPANY'].includes(business.businessType || ''))) ||
    !Number.isSafeInteger(business.serviceChargeBps) || !Number.isSafeInteger(business.partnerShareBps) ||
    business.partnerShareBps < 0 || business.serviceChargeBps < business.partnerShareBps || business.serviceChargeBps > 10000)
    throw new Error('Invalid agreement commercial configuration.');
  const schedule = {
    partnerId: business.id, ownerPidUser: business.ownerPidUser, businessName: business.legalName,
    registrationNumber: business.registrationNumber, businessType: business.businessType,
    country: business.country, currency: business.settlementCurrency,
    serviceChargeBps: business.serviceChargeBps, partnerShareBps: business.partnerShareBps,
    sureImportsShareBps: business.serviceChargeBps - business.partnerShareBps,
    pricingRevision: business.pricingRevision,
  };
  const company = business.country === 'GB' ? 'Spreadit Sourcing Limited' : 'Sure Importers Limited';
  const sections = [
    { title: "Our agreement", text: "This agreement sets out the responsibilities of your business and the Sure Imports contracting company named below. Read it together with the commercial schedule shown here. Your acceptance is recorded against this version and schedule. Business verification is completed automatically when you accept this agreement after business-fit approval and document verification. Acceptance activates your partner account, enables storefront customization and payment collection, and requires no further admin approval. Storefront publication remains a separate setup step." },
    { title: 'Your business and authority', text: `This agreement is between ${company} and ${business.legalName}${business.businessType === 'UK_INDIVIDUAL' ? ', trading as an individual' : ' (registration ' + business.registrationNumber + ')'}, acting through its authorised representative. The programme supports registered Nigerian businesses and verified UK individuals aged 18 or over or UK companies. You confirm your authority to accept these terms. You are the merchant of record for your customer sales and responsible for customer service and applicable obligations.` },
    { title: "What Sure Imports provides", text: "Sure Imports provides the procurement platform, agreed branded storefront and supported API access. We purchase from supported Chinese websites and arrange shipping to your business’s agreed delivery or collection point. Requests must include product links, quantities and specifications; photo-only sourcing is not included." },
    { title: "Your responsibilities", text: "You acquire and support your customers, review their orders, communicate accurate prices and delivery expectations, and arrange onward delivery. Sure Imports fulfils to you, not your individual customers. You keep business, ownership, banking and contact information accurate. This arrangement does not guarantee income, exclusive territory or a delivery date. Neither party may make unauthorised commitments on behalf of the other." },
    { title: "Orders and changes", text: "Customers submit product links, quantities and variants. You review and approve their requests. Sure Imports processes approved, paid orders through the procurement workflow. Additional costs or substitutions requiring approval must be communicated before the additional commitment is made. Accepted order pricing remains traceable; later configuration changes do not rewrite existing accepted order terms." },
    { title: 'Service charge and earnings', text: `The service charge is ${business.serviceChargeBps / 100}% of product cost. Your allocation is ${business.partnerShareBps / 100}% of product cost; Sure Imports retains ${(business.serviceChargeBps - business.partnerShareBps) / 100}%. These percentages apply to product cost, not to the service charge itself. Product purchase funds and shipping charges are not your earnings. Partners earn no shipping commission. Your monthly platform price and any free trial appear in Billing. The trial begins at first activation and cannot be restarted. Recurring payments require separate consent. Cancelling stops future renewals; unpaid platform access restricts new checkout and publication, not paid-order fulfilment, refunds or legitimate earnings. Domain purchase and renewal charges are separate. Price changes require new disclosure and consent.` },
    { title: "Payments and settlement", text: "Payments use the authorised checkout in the currency shown in your commercial schedule: NGN for Nigerian businesses and GBP for UK partners. Nigerian collection uses Paystack or the supported card checkout; UK collection uses PayPal and supported card payments. Actual payment processing fees are borne by the partner and deducted from partner earnings, not added as a customer surcharge. Payments outside the authorised checkout are not part of this flow. Checkout may display Sure Imports branding. Sure Imports receives the customer payment without an automatic partner split. Your allocated earnings are recorded as Pending in your earnings wallet. They become Available only when your customer confirms delivery or pickup of the goods; delivery to your business alone does not release earnings. Disputed amounts remain On hold pending review. You may request withdrawal of Available earnings to your verified payout destination. Nigerian withdrawals use Paystack Transfers in NGN; UK withdrawals use PayPal Payouts in GBP. Your payout account must belong to you or your verified business. Sure Imports funds the applicable provider balance. A payout is recorded as Paid only after provider confirmation; processing times and transfer failures may delay receipt. Refunds and reversals adjust the corresponding earnings, including amounts already paid, and any resulting shortfall must be resolved before further withdrawal. This is an earnings ledger, not a deposit account or escrow service." },
    { title: "Cancellations, refunds and disputes", text: "Unavailable goods, partial purchases, refunds and payment reversals must be reflected in order and earnings records. You cooperate in complaint handling and provide relevant order and delivery evidence. Supplier commitments and the circumstances of each order must be considered when handling cancellations. This agreement does not waive statutory rights, impose unlimited liability on the partner, or override payment-provider obligations. Additional loss-recovery or reserve arrangements require separate written agreement." },
    { title: "Goods and shipping", text: "You must not request prohibited goods or misrepresent product specifications, authenticity or required documentation. Inspection scope, customs treatment, storage, insurance and shipping measurements are set out in the applicable quote or service terms. Delivery to you and onward delivery to your customer are separate stages. Report damage, shortages or missing goods promptly with supporting evidence so the relevant parties can investigate." },
    { title: "Customer information and branding", text: "You manage your customer relationships. Customer information is used for authorised service, payment, security and compliance purposes, not unrelated marketing without an appropriate basis. Both parties protect account access and personal information and comply with applicable data-protection requirements. You must have permission for uploaded branding and must not misrepresent your business as Sure Imports." },
    { title: "Your storefront and domain", text: "Your business uses its own verified domain. Domain ownership is distinct from Sure Imports software and templates. Any hosting, renewal or additional support charge must be disclosed and agreed before it is incurred. Keep API keys confidential and never expose them in public browser code. Domain changes and transfers remain subject to verified ownership and registrar requirements." },
    { title: "Changes and ending the relationship", text: "Material changes to this agreement or your commercial schedule require a new version and renewed acceptance. Neither party may treat termination as erasing existing obligations relating to paid orders, goods in custody, refunds or amounts already earned. Contact Sure Imports to resolve outstanding orders, records and domain arrangements. This agreement does not authorise automatic forfeiture of legitimate earnings or waive rights available under applicable law." },
  ];
  const document = { version: AGREEMENT_VERSION, mode: 'CURRENT' as const, schedule, sections };
  return { ...document, hash: createHash('sha256').update(JSON.stringify(document)).digest('hex') };
}
export type AgreementOffer = ReturnType<typeof agreementOffer>;
export type AgreementReceipt = {
  reference: string; acceptedAt: string; fullName: string; role: string; actorPid: string;
  confirmed: true; offer: AgreementOffer;
  reviewRevision: number;
};
export type AgreementStatus = 'LOCKED' | 'AWAITING_ACCEPTANCE' | 'AWAITING_CONFIRMATION' | 'COMPLETE';
export function agreementWorkflow(business: AgreementBusiness & { status: string }, kyc: { status: string; revision: number } | null, review: { checkedAddressEvidence?: boolean; checkedIdentityMeeting?: boolean; checkedOwnNamePayout?: boolean; businessFit?: { decision?: string; hardBlockersCleared?: boolean } }, receipt: AgreementReceipt | null, confirmation: { reference: string; confirmedAt: string } | null) {
  const enabled = (business.country !== 'GB' || (review.checkedAddressEvidence === true && review.checkedIdentityMeeting === true && review.checkedOwnNamePayout === true)) && PARTNER_WALLET_READY && ['PENDING', 'ACTIVE'].includes(business.status) && kyc?.status === 'VERIFIED' && review.businessFit?.decision === 'PILOT_APPROVED' && review.businessFit.hardBlockersCleared === true;
  const current = Boolean(enabled && (receipt?.reviewRevision === kyc?.revision || (business.status === 'ACTIVE' && confirmation?.reference === receipt?.reference && receipt?.reviewRevision === (kyc?.revision ?? 0) - 1)) && receipt?.offer.hash === agreementOffer(business).hash);
  const complete = current && confirmation?.reference === receipt?.reference;
  const status: AgreementStatus = !enabled ? 'LOCKED' : !current ? 'AWAITING_ACCEPTANCE' : complete ? 'COMPLETE' : 'AWAITING_CONFIRMATION';
  return { enabled, current, status, confirmedAt: complete ? confirmation?.confirmedAt || null : null };
}
export function agreementText(offer: AgreementOffer, receipt?: AgreementReceipt | null) {
  return [
    'SURE IMPORTS PARTNER AGREEMENT', `Version: ${offer.version}`, `Document hash: ${offer.hash}`,
    ...offer.sections.map(section => `\n${section.title}\n${section.text}`),
    '\nCOMMERCIAL SNAPSHOT', JSON.stringify(offer.schedule, null, 2),
    receipt ? `\nACCEPTANCE RECEIPT\nReference: ${receipt.reference}\nAccepted: ${receipt.acceptedAt}\nName: ${receipt.fullName}\nRole: ${receipt.role}\nAuthority and agreement acceptance: confirmed` : '\nNot yet accepted.',
  ].join('\n');
}
