import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SYNC_CONTENT = process.argv.includes('--sync-content');
const SITE = 'https://www.sureimports.com';
const AFFILIATE = 'https://affiliate.sureimports.com';
const IMAGE_ROOT = process.env.AFFILIATE_BLOG_IMAGE_ROOT || path.resolve(process.cwd(), '../sureimports.com/public/blog-affiliate-images');
const VERIFIED_ON = '11 September 2026';

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const paragraphs = (items) => items.map((item) => `<p>${item}</p>`).join('\n');
const list = (items, ordered = false) => `<${ordered ? 'ol' : 'ul'}>${items.map((item) => `<li>${item}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const section = (heading, body) => `<h2>${heading}</h2>\n${body}`;
const sub = (heading, body) => `<h3>${heading}</h3>\n${body}`;
const faq = (items) => section('Frequently asked questions', items.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join('\n'));
const cta = (lead = 'Ready to build a commission channel around real import and shipping needs?') => `<blockquote><p><strong>${lead}</strong> <a href="${AFFILIATE}/sign-up">Create a free Sure Imports affiliate account</a>, review the <a href="${AFFILIATE}/affiliate-terms">affiliate terms</a>, and use the current service links and commission rules shown in your dashboard.</p></blockquote>`;

const ratesTable = () => table(
  ['Eligible service', `Commission verified ${VERIFIED_ON}`, 'Commission basis', 'Review period'],
  [
    ['Buy From Chinese Websites', '2%', 'Product cost only', '14 days'],
    ['Supplier Reports', '₦5,000 or US$5', 'One eligible paid report', '14 days'],
    ['Phones and Laptops', '₦20,000 or US$15', 'One eligible completed purchase', '14 days'],
    ['Supplier Intelligence', '10% recurring', 'Eligible subscription payments', '14 days'],
    ['Supplier Verification', '₦10,000 or US$10', 'One eligible paid verification', '14 days'],
    ['Ship with Us', 'US$0.50/kg, ₦750/kg, or ₦10,000/CBM', 'Final eligible billed weight or volume', '14 days'],
    ['LineScout Sourcing', '10% / 2%', 'Eligible commitment fee / eligible product or sourcing project payment', '14 days'],
  ],
);

const makeContent = ({ intro, sections, faqs, conclusion, showRates = false }) => [
  paragraphs(intro),
  showRates ? section('Sure Imports affiliate commission rates at a glance', `${ratesTable()}<p><em>Rates, eligibility rules and currencies can change. The configuration displayed in the affiliate dashboard at the time of an eligible transaction is authoritative. Commissions are not earned for clicks, account registrations or unpaid requests.</em></p>`) : '',
  ...sections.map(({ heading, body }) => section(heading, body)),
  conclusion ? section('The practical next step', paragraphs(conclusion)) : '',
  faq(faqs),
  cta(),
].filter(Boolean).join('\n');

const articles = [
  {
    title: 'Sure Imports Affiliate Program: Earn From Import and Shipping Referrals',
    slug: 'sure-imports-affiliate-program-earn-from-import-and-shipping-referrals',
    focusKeyword: 'Sure Imports affiliate program',
    keywords: ['Sure Imports affiliate program', 'LineScout affiliate program', 'import affiliate program Nigeria', 'shipping affiliate program Nigeria', 'sourcing affiliate program'],
    description: 'Learn how the Sure Imports affiliate program covers importing, shipping and LineScout sourcing, with current rates, tracking and payout guidance.',
    image: 'sure-imports-affiliate-program.png',
    publishAt: null,
    featured: true,
    content: makeContent({
      showRates: true,
      intro: [
        'The <strong>Sure Imports affiliate program</strong> gives creators, consultants, community operators and businesses a structured way to earn when customers they introduce complete eligible import, supplier-intelligence or shipping transactions. It is not a scheme that pays for traffic alone. It connects a useful recommendation to a real service, records the relationship, and calculates commission only when the qualifying commercial event occurs.',
        `That distinction matters in cross-border trade. A customer may need help buying from a Chinese website today, verifying a supplier next month and shipping cargo later. The programme is designed around those practical needs, with service-specific tracking, review rules and reporting in one affiliate workspace. This guide explains the complete model as verified on ${VERIFIED_ON}.`,
        'The strongest affiliates will not simply paste links everywhere. They will help an audience understand a costly or confusing decision, recommend the right Sure Imports route, and set accurate expectations about what earns commission. That approach creates trust, protects conversion quality and can turn useful education into a durable acquisition channel.',
      ],
      sections: [
        { heading: 'What the Sure Imports affiliate program is', body: paragraphs([
          'An affiliate receives trackable programme links for eligible Sure Imports services. When a referred customer follows the appropriate journey and later completes the qualifying paid transaction, the system can attribute that outcome to the affiliate. Eligible commission then enters a review period before it becomes available under the programme rules.',
          'The programme covers more than a single product category. Its current portfolio spans assisted buying, supplier research, device procurement, recurring supplier intelligence, supplier verification, freight and LineScout sourcing. This breadth is useful because import audiences rarely have only one problem. A business owner might first need a machine, bulk product or white-label sourcing project, then shipment execution.',
          'Joining does not make an affiliate an employee, freight carrier, customs broker, supplier, or official representative with authority to make promises on behalf of Sure Imports. Affiliates introduce customers and explain published services accurately. Sure Imports remains responsible for accepting, pricing and delivering the underlying service.',
        ])},
        { heading: 'Who the programme is built for', body: paragraphs([
          'The programme can fit import educators, YouTube and TikTok creators, newsletter publishers, bloggers, WhatsApp or Telegram community administrators, procurement consultants, business associations, software platforms and agencies whose customers already ask about China purchasing or shipping. Audience relevance matters more than raw follower count.',
          'A niche operator with 500 business owners who trust their recommendations may create more eligible outcomes than an entertainment page with a much larger but unrelated audience. Before applying, identify the recurring questions people already bring to you: how to pay a Chinese seller, whether a supplier is genuine, how to source a production machine or white-label product, how much freight may cost, or how to move cargo to Nigeria.',
        ]) + list([
          '<strong>Creators:</strong> publish demonstrations, comparisons, checklists and case-led education.',
          '<strong>Consultants and agents:</strong> refer needs that fall outside their own scope without pretending to deliver the Sure Imports service.',
          '<strong>Communities:</strong> place the right service link beside genuinely helpful answers and resources.',
          '<strong>Businesses and platforms:</strong> use the developer workspace and API contract where programmatic shipping-request creation suits their customer journey.',
        ])},
        { heading: 'The seven eligible service routes', body: sub('Buy From Chinese Websites', paragraphs([
          'This route is for customers who have product links from supported Chinese websites and need Sure Imports to help complete the purchase. Commission is based on the eligible product cost, not the entire invoice. Shipping, duties, handling, penalties and other non-product charges are excluded from the percentage basis.',
        ])) + sub('Supplier Reports', paragraphs([
          'A supplier report gives a buyer structured information for a sourcing decision. The affiliate earns the configured fixed amount when an eligible referred report is paid and survives review. A search, form start or unpaid request is not enough.',
        ])) + sub('Phones and Laptops', paragraphs([
          'This route serves customers buying eligible devices through Sure Imports. It uses a fixed commission per qualifying completed purchase. Affiliates should avoid advertising a specific device price unless that price appears on a current Sure Imports page, because inventory, specifications and exchange-rate conditions can change.',
        ])) + sub('Supplier Intelligence', paragraphs([
          'Supplier Intelligence has a recurring commission model. An affiliate can earn the configured percentage from eligible subscription payments attributed to the referred customer. Recurring does not mean guaranteed forever: each payment must qualify, and refunds, reversals, cancellations or other exclusions can affect eligibility.',
        ])) + sub('Supplier Verification', paragraphs([
          'This service helps customers investigate a supplier before committing more capital. It uses a fixed commission for an eligible paid verification. Factory-visit transport and other expressly excluded charges do not increase the affiliate commission.',
        ])) + sub('Ship with Us', paragraphs([
          'Ship with Us lets affiliates introduce customers who already have goods to move. The configured commission depends on the shipment billing unit and currency. Weight-based routes can pay per final eligible kilogram, while qualifying sea freight to Nigeria can pay per final eligible cubic metre.',
        ])) + sub('LineScout Sourcing', paragraphs([
          'LineScout is the Sure Imports sourcing workspace for individuals and small businesses that need machinery, bulk finished products or white-label products. Affiliates receive a dedicated LineScout referral link in the dashboard. The configured commission is 10% of an eligible commitment fee, excluding applicable fees, and 2% of the eligible product or sourcing-project payment, excluding shipping and processing fees.',
          `Shipping remains a separate Ship with Us commission based on final eligible billed KG or CBM. Banks, large companies, institutions, government bodies, NGOs and other organisations with formal procurement requirements should use <a href="${SITE}/corporate-sourcing">Sure Imports Corporate Sourcing</a>, not LineScout.`,
        ]))},
        { heading: 'How attribution works from link to commission', body: paragraphs([
          'Attribution begins when a potential customer uses an affiliate’s tracked route or when an authorised business integration creates a shipping request under that affiliate’s API credentials. The system stores the relevant ownership data so that a later eligible transaction can be connected to the referring partner.',
          'A tracked visit is evidence of a referral interaction, not a commission. The customer must complete the service-specific qualifying event. For shipping, an early quantity is only an estimate. Commission is calculated from the final eligible billed weight or volume after the linked invoice is fully paid, using the configured rate and currency.',
          'API-created shipping requests have explicit affiliate ownership. That ownership is attached to the accepted request and is not silently replaced by another affiliate. Request-level ownership is separate from the customer’s general affiliate relationship, which helps businesses create requests for their customers without rewriting unrelated account history.',
          `For LineScout, use the dedicated referral URL displayed in the affiliate dashboard. It sends the prospect into the LineScout account journey and preserves the referral relationship when validly claimed. Affiliates should copy that personalised link rather than inventing a referral parameter on a public LineScout URL.`,
        ])},
        { heading: 'Pending, approved, available and reversed are different states', body: paragraphs([
          'A useful affiliate dashboard must show more than a headline balance. Sure Imports separates the operational stages so partners can understand what has been recorded, what remains under review and what can be paid. A newly generated commission normally begins in a pending or review state. The current configured review period is 14 days for the eligible services listed above.',
          'Review protects customers, affiliates and the company when a payment is refunded, reversed, duplicated, disputed or attached to an ineligible charge. Once a commission satisfies the rules, its status can progress according to the payout workflow. Affiliates should plan cash flow around available commission, not around clicks, estimates or pending amounts.',
        ])},
        { heading: 'How to promote the programme without damaging trust', body: paragraphs([
          'Start with the user’s question, not with your link. Explain the decision, show the cost components people commonly overlook, identify who a service is suitable for, and state what information the customer should prepare. Then disclose that you may earn a commission and place the link where it naturally helps the reader act.',
          'Good content can rank in search because it resolves a specific intent: shipping from China to Nigeria, checking a Chinese supplier, buying from 1688 or Alibaba, or importing a laptop. One accurate guide can keep attracting qualified readers long after publication. Messaging communities can also work, but repeated unsolicited posts are more likely to create complaints than customers.',
          'LineScout creates additional high-intent topics: how to write a machine specification, how to compare production-line quotations, how to source bulk finished goods, how to choose packaging for a white-label product, and what information a sourcing brief must contain. These subjects help prospects prepare for a real project instead of sending vague enquiries.',
        ]) + list([
          'Use the exact service-specific link from the affiliate dashboard.',
          'Place a clear affiliate disclosure near the recommendation.',
          'Do not promise guaranteed savings, delivery dates, approval or earnings.',
          'Do not alter screenshots or quote obsolete commission rates as permanent.',
          'Measure completed eligible outcomes, not vanity traffic alone.',
        ])},
        { heading: 'A 30-day launch plan for a new affiliate', body: table(['Week', 'Primary job', 'Useful output', 'Metric to watch'], [
          ['Week 1', 'Choose one audience problem', 'One service guide and one comparison post', 'Qualified visits'],
          ['Week 2', 'Build practical proof', 'Checklist, walkthrough or frequently asked questions', 'Started service journeys'],
          ['Week 3', 'Distribute with context', 'Newsletter, video, community answer and follow-up', 'Attributed requests'],
          ['Week 4', 'Review and improve', 'Update weak calls to action and answer objections', 'Eligible paid outcomes'],
        ]) + paragraphs([
          'Do not begin by covering every service. Select the route closest to your audience’s present demand. An import education channel may start with Buy From Chinese Websites or Supplier Verification. A manufacturing or private-label community may start with LineScout. A logistics platform may start with Ship with Us and the API. A device community may begin with Phones and Laptops.',
          'After the first month, use dashboard evidence to expand. If people click but do not create requests, the content may be too broad or the call to action unclear. If requests start but rarely become eligible transactions, improve qualification and expectation setting rather than generating more low-intent traffic.',
        ])},
        { heading: 'Business integrations and the shipping API', body: paragraphs([
          'Businesses that already serve merchants can create shipping requests programmatically for their customers and earn commission on eligible completed shipments. The developer workspace provides API-key management, scopes, documentation, request reporting and exports. This is useful for commerce tools, procurement platforms, agencies and operational teams that do not want staff to re-enter the same customer and shipment information manually.',
          `The contract includes shipping-plan discovery, idempotent request creation and request-status retrieval. An accepted API request receives a Sure Imports request identifier and locked affiliate attribution. Developers should begin inside the affiliate dashboard, protect keys as secrets and test their request mapping against the published OpenAPI document.`,
        ])},
        { heading: 'What the programme does not promise', body: paragraphs([
          'No legitimate affiliate programme can promise income simply because someone creates an account. Results depend on audience fit, accurate education, demand, conversion, service eligibility, payment completion and compliance with the terms. Commission configurations can change as services, corridors and economics evolve.',
          'Affiliates should not collect customer money on behalf of Sure Imports unless a separate written arrangement expressly authorises it. They should not present themselves as Sure Imports staff, fabricate testimonials, bid on restricted brand terms, misstate shipping costs or hide the commercial relationship. Sustainable growth comes from informed recommendations and transparent disclosure.',
        ])},
        { heading: 'Useful Sure Imports resources for your audience', body: paragraphs([
          `Readers new to the process can begin with the <a href="${SITE}/blog/how-to-import-from-china-to-nigeria-in-2026-the-complete-beginner-to-pro-guide">complete China-to-Nigeria import guide</a>. People evaluating marketplaces can use the <a href="${SITE}/blog/how-to-buy-from-alibaba-and-ship-to-nigeria-safely-in-2026">Alibaba buying and shipping guide</a>. Shipping-focused audiences can compare the <a href="${SITE}/blog/air-freight-from-china-to-nigeria-when-speed-is-worth-the-extra-cost">air-freight guide</a> with the <a href="${SITE}/blog/sea-shipping-from-china-to-nigeria-when-it-saves-money-and-when-it-delays-you">sea-shipping guide</a>.`,
          'Linking to a genuinely relevant explanation before the commercial route can improve decision quality. It also prevents an affiliate link from carrying the entire burden of education.',
        ])},
      ],
      conclusion: [
        'Choose the one Sure Imports service that best matches a problem your audience already discusses. Create a clear account, read the terms, collect the current tracking link from the dashboard and publish one genuinely useful answer. Then use completed eligible transactions, not raw clicks, to decide what to build next.',
      ],
      faqs: [
        ['Is the Sure Imports affiliate program free to join?', 'Creating an affiliate account is free. Participation and commission eligibility remain subject to the current affiliate terms, account review and service rules.'],
        ['Do I earn when someone clicks my link?', 'No. A click or registration alone does not earn commission. The referred customer must complete the qualifying paid event for an eligible service.'],
        ['Can a business become an affiliate?', 'Yes. Businesses can participate and can use the developer workspace and shipping API where programmatic request creation fits their customer journey.'],
        ['Is Ship with Us included?', 'Yes. Eligible shipments can generate commission according to the configured billing unit, route, rate and currency shown in the affiliate system.'],
        ['Can I earn from LineScout sourcing?', 'Yes. LineScout is an eligible affiliate service for machine, bulk-product and white-label sourcing. The current configuration pays 10% of an eligible commitment fee and 2% of the eligible product or sourcing-project payment. Shipping is commissioned separately under Ship with Us.'],
        ['Are Supplier Intelligence commissions recurring?', 'The configured model is recurring on eligible subscription payments. Each payment must qualify, and reversals, refunds or cancellations can affect commission.'],
        ['Where can I see the latest rates?', `Use the affiliate dashboard after signing in. The table in this article was verified on ${VERIFIED_ON}, but dashboard configuration is authoritative.`],
      ],
    }),
  },
  {
    title: 'Recurring Affiliate Commissions in Nigeria With Sure Imports Supplier Intelligence',
    slug: 'recurring-affiliate-commissions-sure-imports-supplier-intelligence',
    focusKeyword: 'recurring affiliate commissions Nigeria',
    keywords: ['recurring affiliate commissions Nigeria', 'Supplier Intelligence affiliate', 'subscription affiliate program Nigeria', 'supplier research affiliate', 'Sure Imports affiliate'],
    description: 'Learn how recurring affiliate commissions work for eligible Sure Imports Supplier Intelligence subscription payments and how to promote the service.',
    image: 'supplier-intelligence-recurring-commissions.png',
    publishAt: '2026-11-10T08:00:00.000Z',
    content: makeContent({
      intro: [
        '<strong>Recurring affiliate commissions in Nigeria</strong> are most valuable when the underlying service continues solving a real business problem. Sure Imports Supplier Intelligence currently pays affiliates 10% of eligible subscription payments attributed to their referrals, including qualifying renewals.',
        'This is different from receiving a commission forever because someone clicked once. Every subscription payment must be completed, remain eligible and pass the current 14-day review. Cancellations, failed renewals, refunds and reversals can stop or change future commission.',
      ],
      sections: [
        { heading: 'What Supplier Intelligence solves', body: paragraphs([
          'Supplier decisions are not always one-time events. Importers may need continuing visibility into companies, products, sourcing options and commercial signals as their requirements change. A subscription format suits buyers who repeatedly evaluate suppliers rather than commissioning one isolated report.',
          'Affiliates should describe the ongoing decision problem, not sell the word “recurring.” A business subscribes because the intelligence is useful. Commission is a consequence of an eligible referred payment, not the customer’s reason to buy.',
        ])},
        { heading: 'How the recurring calculation works', body: paragraphs([
          'The configured commission is 10% of each eligible subscription payment. An eligible ₦60,000 payment has an illustrative starting commission of ₦6,000. If a later ₦60,000 renewal also qualifies, that payment can create a separate ₦6,000 snapshot.',
          'These examples assume the stated payment basis and do not guarantee earnings. The dashboard configuration at transaction time is authoritative, and every snapshot follows review.',
        ]) + table(['Subscription event', 'Eligible payment', 'Illustrative 10% commission'], [
          ['Initial payment', '₦60,000', '₦6,000'],
          ['Qualifying renewal', '₦60,000', '₦6,000'],
          ['Failed or refunded renewal', 'No eligible retained payment', 'No available commission'],
        ])},
        { heading: 'Who is likely to need the service', body: list([
          'Importers comparing suppliers across several product categories.',
          'Procurement teams that revisit supplier options throughout the year.',
          'Consultants supporting repeated sourcing decisions for clients.',
          'Growing retailers that need a research process, not a one-off seller name.',
          'Businesses monitoring potential alternatives before they face a supply disruption.',
        ])},
        { heading: 'Content that supports subscription intent', body: paragraphs([
          'Publish a supplier-research workflow, a comparison of one-off checks and continuing intelligence, or a checklist for documenting factory, product and commercial evidence. Show how better records improve future decisions. Avoid claiming that research removes all supplier risk.',
          'A useful lead magnet might be a blank supplier comparison matrix with fields for company identity, product fit, evidence, sample results, communication, payment terms and unresolved risks. The affiliate route follows naturally after the reader sees why the work is ongoing.',
        ])},
        { heading: 'Retention is earned after the referral', body: paragraphs([
          'An affiliate cannot control product quality or renewal decisions, but can attract customers whose need genuinely matches the subscription. Accurate qualification improves the chance that the customer uses the service and continues because it remains relevant.',
          'Do not pressure a customer to renew merely to preserve commission. Do not present a projected lifetime value as earned income. Track initial eligible payments and renewal commission separately so your forecast reflects actual retention.',
        ])},
        { heading: 'Build a complete education sequence', body: paragraphs([
          'A single promotional post rarely explains a continuing research service. Build a sequence that begins with the cost of an uninformed supplier decision, moves to a repeatable comparison method, explains when a one-time check is insufficient, and finally shows how Supplier Intelligence fits the ongoing work. Each piece should stand on its own and link to the next logical question.',
          'Revisit the sequence when the dashboard shows strong traffic but weak eligible subscriptions. The audience may need a clearer distinction between the service routes, a better example of an ongoing decision, or more confidence about how the research will be used. Improve the explanation before increasing promotional volume.',
        ])},
        { heading: 'One-off reports, verification and intelligence', body: table(['Need', 'Likely route'], [
          ['A defined supplier information request', 'Supplier Report'],
          ['A specific supplier or operational claim needs checking', 'Supplier Verification'],
          ['Continuing supplier research across decisions', 'Supplier Intelligence'],
        ]) + paragraphs([
          'The routes can complement one another, but they should not be presented as interchangeable. Start from the customer’s decision and direct them to the most suitable current service.',
        ])},
      ],
      conclusion: ['Build content for buyers who repeatedly evaluate suppliers, explain the continuing value honestly and use the Supplier Intelligence affiliate route. Measure each eligible payment and renewal separately.'],
      faqs: [
        ['What is the current Supplier Intelligence commission?', 'The configured rate verified on 10 September 2026 is 10% of eligible subscription payments.'],
        ['Can renewal payments earn commission?', 'Yes, qualifying recurring subscription payments can create further commission snapshots.'],
        ['Is recurring commission guaranteed for life?', 'No. Each payment must qualify, and cancellations, failed payments, refunds, reversals and programme changes can affect commission.'],
        ['Is Supplier Intelligence the same as a supplier report?', 'No. A report addresses a defined research need, while Supplier Intelligence is designed for continuing research and decision support.'],
        ['When does commission become available?', 'An eligible payment creates a commission subject to the current 14-day review and programme rules.'],
      ],
    }),
  },
  {
    title: 'Chinese Website Affiliate Program in Nigeria: Earn With Sure Imports',
    slug: 'earn-when-customers-buy-from-chinese-websites-sure-imports',
    focusKeyword: 'Chinese website affiliate program Nigeria',
    keywords: ['Chinese website affiliate program Nigeria', '1688 affiliate Nigeria', 'Alibaba buying referral', 'China buying agent affiliate', 'Sure Imports buying service'],
    description: 'Help customers buy from Chinese websites through Sure Imports and understand the 2% eligible product-cost commission, exclusions and content strategy.',
    image: 'chinese-websites-affiliate.png',
    publishAt: '2026-11-17T08:00:00.000Z',
    content: makeContent({
      intro: [
        'A customer may find the right item on 1688, Taobao, Tmall or another Chinese website but still need help completing the purchase. The Sure Imports buying route lets an affiliate introduce that need and currently earn 2% of eligible product cost when the attributed transaction is completed and survives review.',
        'The commission basis is deliberately narrower than the total invoice. Freight, duties, service fees and other non-product costs do not become commissionable simply because they appear beside the goods.',
      ],
      sections: [
        { heading: 'What a qualified referral looks like', body: paragraphs([
          'The customer should ideally have a product link, product specification, quantity and delivery destination. They should understand that a displayed marketplace price may depend on variants, minimum quantities, domestic delivery and seller confirmation.',
          `Affiliates can prepare buyers with the <a href="${SITE}/blog/how-to-use-sure-imports-for-china-purchases-links-sourcing-shipping-and-supplier-payments">guide to using Sure Imports for China purchases</a> and the <a href="${SITE}/blog/how-to-buy-from-alibaba-and-ship-to-nigeria-safely-in-2026">Alibaba buying and shipping guide</a>.`,
        ])},
        { heading: 'How the 2% commission basis works', body: paragraphs([
          'Suppose the eligible products cost ₦1,200,000. The illustrative starting commission is ₦24,000. If the invoice also includes freight, duties or other excluded charges, those amounts do not increase the 2% calculation.',
          'The example is not a guarantee. The customer must complete an eligible paid transaction, the platform must retain the attribution, and the commission must pass review. Always use the rate shown in the dashboard.',
        ])},
        { heading: 'Product information affiliates should teach customers to collect', body: list([
          'The exact marketplace URL and selected variant.',
          'Model, size, colour, material or technical specification.',
          'Required quantity and any acceptable tolerance.',
          'Seller messages or quotation details relevant to the selection.',
          'Destination and any time constraint that affects shipping choice.',
          'Whether supplier checking or product verification is also needed.',
        ])},
        { heading: 'High-intent content ideas', body: list([
          'How to translate a product page into a purchase-ready specification.',
          '1688 versus Alibaba for a particular buyer type.',
          'Common invoice components when buying from China.',
          'Why a cheap listing price is not the same as landed cost.',
          'Questions to answer before paying an unfamiliar seller.',
          'When air freight or sea freight may suit the order.',
        ])},
        { heading: 'Avoid misleading marketplace claims', body: paragraphs([
          'Do not advertise a supplier, price, stock level or delivery promise as verified when it is only shown on a listing. Do not imply that Sure Imports manufactures the product. A marketplace page is an input to the buying process, not conclusive evidence about the seller or goods.',
          'If the customer needs evidence about a supplier, use the supplier-report, verification or intelligence route that fits the question. Sending every customer directly to checkout may produce more clicks but poorer decisions.',
        ])},
        { heading: 'Buying and shipping are separate commission calculations', body: paragraphs([
          'The buying commission uses eligible product cost. A later eligible Ship with Us transaction uses final billed KG or CBM under its own configured plan. Affiliates should not combine the two bases or apply the buying percentage to the full landed cost.',
          'Explain the stages separately: confirm the goods and buying request, complete the purchase process, then plan the suitable freight route using actual cargo information when available.',
        ])},
        { heading: 'Create a pre-purchase content workflow', body: paragraphs([
          'A useful buying article can begin with the customer’s intended use, then translate that need into a product specification, compare plausible listing variations, explain the parts of landed cost and finish with a preparation checklist. This structure attracts readers who are closer to a real transaction and reduces vague requests.',
          'Update pages when marketplace interfaces or Sure Imports service requirements change. Date material claims, remove broken links and send readers to the live buying route for current commercial details. An evergreen page should preserve durable principles while acknowledging that individual listings and prices move quickly.',
        ])},
      ],
      conclusion: ['Create buying content around a specific marketplace or product decision, help the customer prepare a precise link and specification, then share the correct Sure Imports route with disclosure.'],
      faqs: [
        ['What is the current buying commission?', 'The configured rate is 2% of eligible product cost for Buy From Chinese Websites.'],
        ['Does shipping count as product cost?', 'No. Shipping, duties, fees and other non-product costs are excluded from the percentage basis.'],
        ['Can I promote 1688 or Alibaba buying?', 'You can create helpful content for those customer needs and direct buyers to the relevant Sure Imports service without claiming marketplace affiliation.'],
        ['What should a customer prepare?', 'A product link, exact variant or specification, quantity, destination and any relevant seller details.'],
        ['Does a submitted link earn commission?', 'No. An eligible paid transaction and completed review are required.'],
      ],
    }),
  },
  {
    title: 'Phones and Laptops Affiliate Program in Nigeria With Sure Imports',
    slug: 'phones-laptops-affiliate-program-nigeria-sure-imports',
    focusKeyword: 'phones and laptops affiliate program Nigeria',
    keywords: ['phones and laptops affiliate program Nigeria', 'laptop affiliate Nigeria', 'phone affiliate program', 'device referral commission', 'Sure Imports phones laptops'],
    description: 'A practical guide to the Sure Imports phones and laptops affiliate route, current fixed commission, qualified content and responsible device promotion.',
    image: 'phones-laptops-affiliate.png',
    publishAt: '2026-11-24T08:00:00.000Z',
    content: makeContent({
      intro: [
        'The Sure Imports <strong>phones and laptops affiliate program in Nigeria</strong> gives eligible affiliates a fixed commission for a qualifying completed device purchase. As verified on 10 September 2026, the configured amount is ₦20,000 or US$15 per eligible transaction, depending on the transaction currency.',
        'Device audiences are commercially attractive but sensitive to errors. Model names, memory, storage, condition, keyboard, region, battery expectations and warranty terms can change the buying decision. Accurate specification content is therefore more valuable than a generic “buy now” post.',
      ],
      sections: [
        { heading: 'How the fixed commission works', body: paragraphs([
          'The rate is attached to one eligible completed Phones and Laptops transaction, rather than a percentage of the device price. An affiliate cannot choose naira or dollar after the transaction; the applicable configured currency determines the commission.',
          'Clicks, enquiries and unpaid reservations do not earn the fixed amount. The commission remains subject to the 14-day review and may be affected by refunds, reversals, duplication or eligibility issues.',
        ])},
        { heading: 'Create specification-first content', body: list([
          'State the exact model family and generation, not only a marketing name.',
          'Explain processor, memory, storage, screen size and other decision-critical variants.',
          'Distinguish new, open-box, refurbished and used condition where relevant.',
          'Clarify whether accessories, warranty or regional features are confirmed.',
          'Tell buyers to rely on the current Sure Imports listing or quotation for availability and price.',
        ])},
        { heading: 'Match content to a real use case', body: paragraphs([
          'A laptop for accounting work, a phone for field sales and a workstation for video editing are different searches. Use-case guides qualify buyers because they explain the performance and budget trade-offs that matter to a defined audience.',
          'Comparison articles should compare the same class of device and disclose where information can change. Avoid copying manufacturer copy without analysis or publishing a benchmark you did not perform.',
        ])},
        { heading: 'A responsible device referral funnel', body: list([
          'Publish a use-case guide or current buying checklist.',
          'Invite the reader to define budget, workload and essential specifications.',
          'Direct them to the current Sure Imports device route with an affiliate disclosure.',
          'Let Sure Imports confirm the actual offer, payment and fulfilment details.',
          'Use dashboard status rather than assuming an enquiry became a purchase.',
        ], true)},
        { heading: 'Claims to avoid', body: paragraphs([
          'Do not promise that a device is the cheapest, original, brand new, in stock or covered by a particular warranty unless current official information supports the claim. Do not imply that your affiliate status makes you an authorised representative of the manufacturer.',
          'Price screenshots age quickly in an import market. Prefer a durable specification guide and direct the reader to the live offer for current commercial information.',
        ])},
        { heading: 'Where the route fits in a broader import journey', body: paragraphs([
          'Some business buyers need a single device. Others need a managed procurement plan, quantity confirmation or specifications across a team. Refer the customer to the correct current Sure Imports channel and do not force a consumer affiliate link to carry a formal corporate procurement requirement.',
          'If a customer independently needs freight for other goods, Ship with Us is a separate service route with a separate commission basis. Do not double-count or combine commission models.',
        ])},
        { heading: 'Build a device content library', body: paragraphs([
          'Start with one cornerstone guide for a defined use case, then add model comparisons, specification explainers, budget trade-offs and a buying checklist. Link related pages so a reader can move from research to a confident shortlist before opening the Sure Imports route. This is more search-friendly and more useful than publishing disconnected price cards.',
          'Review older pages for discontinued generations, changed configurations and outdated availability statements. Keep the parts that explain enduring concepts, but direct current purchase intent to the live service. If readers repeatedly ask the same question after clicking, add the answer before the call to action.',
        ])},
      ],
      conclusion: ['Choose one device audience, publish a specification-first guide and direct readers to the current Phones and Laptops route. Let the live offer provide price and availability, and measure eligible completed purchases.'],
      faqs: [
        ['What is the current device commission?', 'The configured fixed rate is ₦20,000 or US$15 per eligible completed Phones and Laptops purchase.'],
        ['Can I choose the commission currency?', 'No. The configured transaction context determines the applicable rate and currency.'],
        ['Does a device enquiry earn commission?', 'No. The customer must complete the eligible paid transaction and the commission must pass review.'],
        ['Can I promise a device is in stock?', 'Only repeat current official availability. Inventory and commercial terms can change.'],
        ['What content converts best?', 'Use-case guides, specification checklists and fair comparisons tend to qualify device buyers better than generic promotion.'],
      ],
    }),
  },
  {
    title: 'Supplier Verification Affiliate Program: Help Importers Reduce Risk',
    slug: 'supplier-verification-affiliate-program-help-importers-reduce-risk',
    focusKeyword: 'supplier verification affiliate program',
    keywords: ['supplier verification affiliate program', 'Chinese supplier verification Nigeria', 'supplier check affiliate', 'China import risk', 'Sure Imports verification'],
    description: 'Promote supplier verification responsibly, understand the current Sure Imports fixed commission and help importers prepare evidence-led verification requests.',
    image: 'supplier-verification-affiliate.png',
    publishAt: '2026-12-01T08:00:00.000Z',
    content: makeContent({
      intro: [
        'A <strong>supplier verification affiliate program</strong> can create value when it encourages an importer to investigate before sending significant money. Sure Imports currently pays ₦10,000 or US$10 for an eligible paid Supplier Verification transaction, subject to attribution and the 14-day review.',
        'Verification reduces uncertainty; it does not eliminate every commercial, product or fraud risk. Responsible affiliates explain the limits, help customers define the question and avoid presenting a check as an unconditional guarantee.',
      ],
      sections: [
        { heading: 'When a buyer should consider verification', body: list([
          'The supplier is new and the proposed payment is material.',
          'Company identity, address or operating claims are unclear.',
          'The buyer needs evidence about a specific capability or representation.',
          'Samples, documents or communication contain inconsistencies.',
          'The transaction requires more confidence than a marketplace profile provides.',
        ])},
        { heading: 'How the fixed commission is calculated', body: paragraphs([
          'One eligible paid Supplier Verification transaction earns the configured fixed amount in the applicable currency. The amount does not automatically increase because a factory visit requires transport or because the customer incurs another charge.',
          'Factory-visit transport is explicitly outside the current commission basis. Affiliates should never encourage unnecessary add-ons or represent an excluded cost as commissionable.',
        ])},
        { heading: 'Help the customer define the verification question', body: paragraphs([
          '“Check this supplier” is too broad. A better brief identifies the legal entity, websites or marketplace profiles, contact details, claimed factory location, product, quotation and the exact claims causing concern. Evidence quality improves when the question is specific.',
          'Ask the customer to separate facts already documented from claims that still need evidence. That record also helps the customer compare the verification result with later samples, contracts and inspection findings.',
        ])},
        { heading: 'Verification, reports and ongoing intelligence', body: table(['Customer need', 'Suitable starting route'], [
          ['Defined background information on a supplier', 'Supplier Report'],
          ['A specific supplier claim or risk needs checking', 'Supplier Verification'],
          ['Continuing research across suppliers', 'Supplier Intelligence'],
        ])},
        { heading: 'Content ideas that serve search intent', body: list([
          'How to check a Chinese supplier before payment.',
          'Red flags that deserve additional evidence, without declaring fraud prematurely.',
          'What documents and links to prepare for supplier verification.',
          'Why marketplace badges are not a complete due-diligence process.',
          'Supplier verification versus product inspection versus sample testing.',
        ])},
        { heading: 'Use careful language', body: paragraphs([
          'Avoid calling a supplier “fake” or “fraudulent” without conclusive evidence. Explain observed inconsistencies and the additional checks a buyer can consider. Do not promise that verification guarantees delivery, quality or future conduct.',
          'An affiliate should disclose the commercial relationship and let Sure Imports define the service scope. This protects the customer from inflated expectations and protects the affiliate from assuming operational responsibility.',
        ])},
        { heading: 'Build an evidence trail before the customer pays', body: paragraphs([
          'Encourage the buyer to save the supplier’s legal name, quoted company name, payment beneficiary, website, marketplace profile, address, product specification and key messages in one folder. Differences between those records do not automatically prove misconduct, but they identify questions that deserve clarification.',
          'The buyer should also record what the verification is expected to answer. After receiving the result, they can decide whether to seek samples, inspection, contract changes or a different supplier. Verification is one control in a broader procurement process, not a substitute for every other control.',
        ])},
        { heading: 'How affiliates can assess content performance', body: paragraphs([
          'Measure whether readers arrive with enough information to describe the supplier and concern. A high number of vague enquiries may indicate that the content creates fear without teaching preparation. Improve the checklist, define the service boundary and show examples of precise questions.',
          'Measure eligible paid verifications rather than clicks alone. Keep the disclosure visible and avoid retargeting people with sensitive supplier concerns in a way that exposes their commercial activity.',
        ])},
      ],
      conclusion: ['Publish an evidence-led supplier-check checklist, help readers define the precise uncertainty and refer appropriate cases to Supplier Verification with a clear disclosure.'],
      faqs: [
        ['What is the current Supplier Verification commission?', 'The configured fixed amount is ₦10,000 or US$10 for an eligible paid verification.'],
        ['Does factory-visit transport increase commission?', 'No. Factory-visit transport is excluded from the current commission basis.'],
        ['Does verification guarantee a supplier?', 'No. It can reduce uncertainty by checking defined claims or evidence, but cannot guarantee future performance or remove all risk.'],
        ['What should a customer prepare?', 'Supplier identity details, links, contacts, quotation, product information and the specific claims or concerns to be checked.'],
        ['Is a supplier report the same service?', 'No. Choose among a report, verification and ongoing intelligence according to the decision the customer needs to make.'],
      ],
    }),
  },
  {
    title: 'Sourcing Agent vs Affiliate: Which Import Business Model Fits You?',
    slug: 'sourcing-agent-vs-affiliate-import-business-model',
    focusKeyword: 'sourcing agent vs affiliate',
    keywords: ['sourcing agent vs affiliate', 'import affiliate business model', 'China sourcing agent Nigeria', 'import referral program', 'affiliate vs procurement consultant'],
    description: 'Compare a sourcing agent vs affiliate across responsibility, revenue, customer ownership, risk and scale to choose the right import business model.',
    image: 'sourcing-agent-vs-affiliate.png',
    publishAt: '2026-12-08T08:00:00.000Z',
    content: makeContent({
      intro: [
        'The choice between a <strong>sourcing agent vs affiliate</strong> is a choice about responsibility, not merely income. A sourcing agent may define requirements, search suppliers, negotiate, coordinate samples and manage parts of procurement. An affiliate makes a transparent introduction to another company’s service and earns under that programme’s eligibility rules.',
        'Both can be legitimate. Problems begin when someone takes affiliate-level responsibility but makes agent-level promises, or charges for sourcing work without defining the scope.',
      ],
      sections: [
        { heading: 'Side-by-side comparison', body: table(['Dimension', 'Affiliate', 'Sourcing agent'], [
          ['Primary work', 'Education and referral', 'Supplier and procurement execution'],
          ['Service delivery', 'Performed by referred provider', 'Agent performs or manages agreed work'],
          ['Revenue', 'Configured eligible commission', 'Fee, retainer, margin or agreed commercial model'],
          ['Customer funds', 'Not collected without separate authority', 'May be handled only under clear contract and controls'],
          ['Operational risk', 'Mainly content, compliance and reputation', 'Broader supplier, specification and coordination risk'],
          ['Scalability', 'Content and integrations can scale', 'Often constrained by delivery capacity'],
        ])},
        { heading: 'When the affiliate model fits', body: paragraphs([
          'Choose affiliate participation when your strength is audience, education, community, lead generation or a software workflow. You want Sure Imports to assess, price and deliver the eligible service, and you are comfortable earning only when the configured qualifying event occurs.',
          'The model can work alongside another business, but disclosures and boundaries must remain clear. An API integration can automate shipping requests without turning the affiliate into the freight operator.',
        ])},
        { heading: 'When sourcing work fits', body: paragraphs([
          'Sourcing work fits when a client needs you to turn a requirement into supplier options, compare quotations, coordinate evidence, negotiate or manage a procurement process. That role needs a written scope, fee, decision authority, confidentiality terms and responsibility boundaries.',
          'Formal procurement requirements from established organisations should follow an appropriate corporate sourcing route. They should not be reduced to a generic machine-sourcing affiliate link or represented as the same journey as an individual referral.',
        ])},
        { heading: 'Can you use both models?', body: paragraphs([
          'Yes, if each engagement is transparent. You might charge a client for independent advisory work and separately disclose a commission on an eligible Sure Imports service. The customer should understand both relationships before acting.',
          'Keep records showing which work you performed, which service Sure Imports performed and how each party was paid. Do not hide a commission inside a quotation or imply that an affiliate commission pays for obligations you separately accepted.',
        ])},
        { heading: 'Decision questions', body: list([
          'Am I merely introducing the customer, or am I accepting responsibility for the sourcing result?',
          'Who confirms the product specification and supplier selection?',
          'Who contracts with and receives money from the customer?',
          'Who handles supplier communication, quality evidence and disputes?',
          'Is my revenue an eligible programme commission or a separately agreed professional fee?',
          'Can the customer clearly tell which company performs each service?',
        ])},
        { heading: 'How the Sure Imports affiliate route works', body: paragraphs([
          'The affiliate chooses the eligible service that matches the customer’s need, uses a tracked link or authorised shipping API request, and receives commission only after the qualifying paid event. The dashboard records commission basis, review and payout stages.',
          'The current portfolio includes Buy From Chinese Websites, Supplier Reports, Phones and Laptops, Supplier Intelligence, Supplier Verification and Ship with Us. The affiliate does not set Sure Imports prices or guarantee acceptance, savings, delivery or earnings.',
        ])},
        { heading: 'A low-risk way to begin', body: paragraphs([
          'If you have expertise and an audience but do not yet have the systems to deliver sourcing projects, begin as an affiliate. Publish careful education, learn which problems convert and document repeated needs. If customers later ask you to perform substantive sourcing work, design that service deliberately instead of drifting into it.',
          'If you already operate a mature sourcing practice, affiliate participation can handle defined referrals outside your scope. Preserve client consent and disclose commercial relationships.',
        ])},
      ],
      conclusion: ['Choose the model whose responsibilities you are equipped to fulfil. Use the affiliate route for transparent introductions and eligible commission; use a properly scoped sourcing engagement when you are accepting procurement work.'],
      faqs: [
        ['Is an affiliate a sourcing agent?', 'No. An affiliate introduces a customer to a service. A sourcing agent performs or manages agreed sourcing work.'],
        ['Can a sourcing consultant also be an affiliate?', 'Yes, with clear disclosure, separate scopes and no misleading representation of fees or responsibilities.'],
        ['Which model has less operational risk?', 'Affiliate participation usually has less service-delivery risk because the referred provider performs the underlying service, but compliance and reputation still matter.'],
        ['Can an affiliate collect customer payments?', 'Not on behalf of Sure Imports unless a separate written arrangement expressly authorises it.'],
        ['Can a business automate referrals?', 'Approved business affiliates can use the shipping API to create customer shipping requests while preserving request-level attribution.'],
      ],
    }),
  },
];

const existingEvergreenSlugs = new Set([
  'how-to-import-from-china-to-nigeria-in-2026-the-complete-beginner-to-pro-guide',
  'how-to-buy-from-alibaba-and-ship-to-nigeria-safely-in-2026',
  'sea-shipping-from-china-to-nigeria-when-it-saves-money-and-when-it-delays-you',
  'air-freight-from-china-to-nigeria-when-speed-is-worth-the-extra-cost',
  'how-to-use-sure-imports-for-china-purchases-links-sourcing-shipping-and-supplier-payments',
]);

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function internalSlugs(html) {
  return [...html.matchAll(/href=["'](?:https:\/\/(?:www\.)?sureimports\.com)?\/blog\/([^"'?#/]+)/gi)].map((match) => match[1].toLowerCase());
}

const conciseSeoTitles = {
  'sure-imports-affiliate-program-earn-from-import-and-shipping-referrals': 'Sure Imports Affiliate Program: Complete Guide',
  'shipping-affiliate-program-nigeria-earn-with-ship-with-us': 'Shipping Affiliate Program in Nigeria: How It Works',
  'sure-imports-shipping-affiliate-api-integration-guide-businesses': 'Shipping Affiliate API Integration Guide for Businesses',
  'sure-imports-affiliate-commission-rates-how-earnings-are-calculated': 'Sure Imports Affiliate Commission Rates Explained',
  'importation-affiliate-program-nigeria-earn-without-buying-stock': 'Importation Affiliate Program in Nigeria: No Stock Needed',
  'how-sure-imports-affiliate-tracking-and-attribution-work': 'Affiliate Tracking and Attribution at Sure Imports',
  'sure-imports-affiliate-payouts-review-periods-balances-withdrawals': 'Sure Imports Affiliate Payouts Explained',
  'who-can-join-sure-imports-affiliate-program': 'Who Can Join the Sure Imports Affiliate Program?',
  'promote-sure-imports-affiliate-link-whatsapp-without-spamming': 'Promote an Affiliate Link on WhatsApp Without Spam',
  'recurring-affiliate-commissions-sure-imports-supplier-intelligence': 'Recurring Affiliate Commissions From Supplier Intelligence',
  'earn-when-customers-buy-from-chinese-websites-sure-imports': 'Chinese Website Affiliate Program in Nigeria',
  'phones-laptops-affiliate-program-nigeria-sure-imports': 'Phones and Laptops Affiliate Program in Nigeria',
  'supplier-verification-affiliate-program-help-importers-reduce-risk': 'Supplier Verification Affiliate Program Guide',
  'sourcing-agent-vs-affiliate-import-business-model': 'Sourcing Agent vs Affiliate: Business Model Guide',
};

function seoTitleFor(article) {
  return conciseSeoTitles[article.slug] || article.title.slice(0, 60).trim();
}

function validateArticles() {
  const issues = [];
  const seen = new Map();
  for (const article of articles) {
    if (seen.has(article.slug)) issues.push(`Duplicate slug: ${article.slug}`);
    seen.set(article.slug, article);
    const words = stripHtml(article.content).split(/\s+/).filter(Boolean).length;
    if (words < 750) issues.push(`${article.slug}: only ${words} words`);
    if (article.description.length < 120 || article.description.length > 160) issues.push(`${article.slug}: meta description has ${article.description.length} characters`);
    const meaningfulKeywordTerms = article.focusKeyword.toLowerCase().split(/\s+/).filter((term) => term.length > 3);
    if (!meaningfulKeywordTerms.every((term) => article.title.toLowerCase().includes(term))) issues.push(`${article.slug}: title does not reflect focus keyword`);
    if (/[—–]/.test(article.content) || /[—–]/.test(article.title)) issues.push(`${article.slug}: contains an em or en dash`);
    if (/established organisations[^<]{0,240}linescout\.sureimports\.com/i.test(article.content) || /formal procurement[^<]{0,240}linescout\.sureimports\.com/i.test(article.content)) issues.push(`${article.slug}: routes a corporate audience to LineScout`);
  }
  for (const article of articles) {
    const articleTime = article.publishAt ? new Date(article.publishAt).getTime() : Date.now();
    for (const slug of internalSlugs(article.content)) {
      if (existingEvergreenSlugs.has(slug)) continue;
      const target = seen.get(slug);
      if (!target) issues.push(`${article.slug}: unknown internal link /blog/${slug}`);
      else {
        const targetTime = target.publishAt ? new Date(target.publishAt).getTime() : Date.now();
        if (targetTime > articleTime) issues.push(`${article.slug}: links to future article /blog/${slug}`);
      }
    }
  }
  return issues;
}

async function uploadImage(article) {
  const input = await readFile(path.join(IMAGE_ROOT, article.image));
  const digest = createHash('sha256').update(input).digest('hex').slice(0, 18).toUpperCase();
  const publicId = `BLOG_AFF${digest}`;
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'admin-sureimports/blog',
      public_id: publicId,
      resource_type: 'image',
      overwrite: false,
      use_filename: false,
      unique_filename: false,
      tags: ['blog', 'affiliate-cluster-2026', article.slug],
    }, (error, value) => error ? reject(error) : resolve(value));
    stream.end(input);
  });
  return result.public_id;
}

async function main() {
  const localIssues = validateArticles();
  if (localIssues.length) throw new Error(`Local validation failed:\n- ${localIssues.join('\n- ')}`);

  const slugs = articles.map((article) => article.slug);
  const collisions = await prisma.blog.findMany({ where: { blogSlug: { in: slugs } }, select: { blogSlug: true, blogTitle: true } });
  if (collisions.length && !SYNC_CONTENT) throw new Error(`CMS slug collision: ${collisions.map((row) => row.blogSlug).join(', ')}`);
  if (SYNC_CONTENT) {
    if (collisions.length !== articles.length) throw new Error(`Expected ${articles.length} existing affiliate articles, found ${collisions.length}`);
    const records = await prisma.blog.findMany({ where: { blogSlug: { in: slugs } }, select: { pidBlog: true, blogSlug: true, blogExt2: true } });
    const bySlug = new Map(records.map((record) => [record.blogSlug, record]));
    await prisma.$transaction(articles.map((article) => prisma.blog.update({
      where: { pidBlog: bySlug.get(article.slug).pidBlog },
      data: {
        blogContent: article.content,
        blogExt2: JSON.stringify({
          ...JSON.parse(bySlug.get(article.slug).blogExt2 || '{}'),
          metaTitle: seoTitleFor(article),
          seoTitle: seoTitleFor(article),
          metaDescription: article.description,
          focusKeyword: article.focusKeyword,
          keywords: article.keywords,
          canonicalUrl: `${SITE}/blog/${article.slug}`,
          ogTitle: article.title,
          ogDescription: article.description,
          twitterTitle: article.title,
          twitterDescription: article.description,
          tags: article.keywords,
        }),
        updatedAt: new Date(),
      },
    })), { timeout: 120000 });
    console.log(`Synchronized responsive-table content for ${articles.length} affiliate articles.`);
    return;
  }

  const linkedExisting = [...new Set(articles.flatMap((article) => internalSlugs(article.content)).filter((slug) => existingEvergreenSlugs.has(slug)))];
  const records = await prisma.blog.findMany({ where: { blogSlug: { in: linkedExisting }, blogPublished: true }, select: { blogSlug: true, createdAt: true } });
  const recordsBySlug = new Map(records.map((record) => [record.blogSlug, record]));
  for (const article of articles) {
    const time = article.publishAt ? new Date(article.publishAt) : new Date();
    for (const slug of internalSlugs(article.content).filter((value) => existingEvergreenSlugs.has(value))) {
      const target = recordsBySlug.get(slug);
      if (!target || (target.createdAt && target.createdAt > time)) throw new Error(`${article.slug}: CMS link is not public by publication time: /blog/${slug}`);
    }
  }

  const category = await prisma.blog_category.findFirst({ where: { categoryName: 'Business Tips', status: 'active' } });
  const publisher = await prisma.blog_publisher.findFirst({ where: { publisherName: 'Tochukwu Nkwocha', status: 'active' } });
  if (!category || !publisher) throw new Error('Active Business Tips category or Tochukwu Nkwocha publisher is missing');

  const report = articles.map((article) => ({
    publishAt: article.publishAt || 'immediately',
    slug: article.slug,
    words: stripHtml(article.content).split(/\s+/).filter(Boolean).length,
    metaDescriptionLength: article.description.length,
  }));
  console.table(report);
  if (!APPLY) {
    console.log('Dry run passed. Re-run with --apply to upload images and create all CMS records.');
    return;
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary environment is incomplete');
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  const images = new Map();
  for (const article of articles) {
    images.set(article.slug, await uploadImage(article));
    console.log(`Uploaded image for ${article.slug}`);
  }

  const created = await prisma.$transaction(articles.map((article) => {
    const metaTitle = seoTitleFor(article);
    const image = images.get(article.slug);
    const seo = {
      metaTitle,
      seoTitle: metaTitle,
      metaDescription: article.description,
      focusKeyword: article.focusKeyword,
      keywords: article.keywords,
      canonicalUrl: `${SITE}/blog/${article.slug}`,
      ogTitle: article.title,
      ogDescription: article.description,
      ogImage: image,
      twitterTitle: article.title,
      twitterDescription: article.description,
      twitterImage: image,
      noIndex: false,
      noFollow: false,
      category: 'Business Tips',
      tags: article.keywords,
      featured: Boolean(article.featured),
    };
    return prisma.blog.create({ data: {
      pidBlog: `BLOG${randomBytes(14).toString('hex').toUpperCase()}`,
      blogTitle: article.title,
      blogContent: article.content,
      blogSlug: article.slug,
      blogPublished: true,
      blogFeatured: Boolean(article.featured),
      blogImage: image,
      blogBy: publisher.publisherName,
      publisherId: publisher.pidPublisher,
      categoryId: category.pidCategory,
      blogExt1: '',
      blogExt2: JSON.stringify(seo),
      xStaus: 'active',
      createdAt: article.publishAt ? new Date(article.publishAt) : new Date(),
      updatedAt: new Date(),
    }});
  }), { timeout: 120000 });

  console.log(JSON.stringify({ created: created.map((row) => ({ pidBlog: row.pidBlog, slug: row.blogSlug, createdAt: row.createdAt })) }, null, 2));
}

const additionalArticles = [
  {
    title: 'Importation Affiliate Program in Nigeria: Earn Without Buying Stock',
    slug: 'importation-affiliate-program-nigeria-earn-without-buying-stock',
    focusKeyword: 'importation affiliate program Nigeria',
    keywords: ['importation affiliate program Nigeria', 'earn from import referrals', 'affiliate marketing for importers', 'China import affiliate', 'Sure Imports affiliate'],
    description: 'Learn how an importation affiliate program works in Nigeria and how to earn from useful buying, supplier and shipping referrals without holding stock.',
    image: 'importation-affiliate-program.png',
    publishAt: '2026-10-06T08:00:00.000Z',
    content: makeContent({
      intro: [
        'An <strong>importation affiliate program in Nigeria</strong> lets you earn by connecting buyers to an established import service. You do not need to purchase stock, rent a warehouse or take ownership of a customer’s cargo. Your job is to attract the right demand, explain the relevant service honestly and make a trackable introduction.',
        'Sure Imports extends that model across Chinese-website purchasing, supplier reports, devices, supplier intelligence, verification and shipping. That makes it possible to build content around the buyer’s full decision journey instead of promoting one generic link.',
      ],
      sections: [
        { heading: 'Affiliate, reseller and importer are not the same role', body: table(['Model', 'Owns inventory?', 'Sets customer price?', 'Primary risk'], [
          ['Affiliate', 'No', 'No', 'Audience and promotion effort'],
          ['Reseller', 'Usually', 'Usually', 'Stock, pricing and fulfilment'],
          ['Direct importer', 'Yes', 'Yes', 'Supplier, freight, customs and inventory'],
        ]) + paragraphs([
          'An affiliate is paid under the programme rules when an attributed customer completes an eligible transaction. A reseller buys or controls an offer and earns a margin. A direct importer takes responsibility for procurement and inventory. Confusing these roles can lead to false promises and customer disputes.',
        ])},
        { heading: 'Choose a problem before choosing a service link', body: paragraphs([
          `A beginner searching how to import may first need education. Start with the <a href="${SITE}/blog/how-to-import-from-china-to-nigeria-in-2026-the-complete-beginner-to-pro-guide">complete China-to-Nigeria import guide</a>, then recommend the service that matches the next action. A buyer with a marketplace link needs assisted buying. A buyer uncertain about a seller may need verification or a supplier report. A buyer whose goods are ready needs shipping.`,
          'This intent-based approach helps the customer and improves lead quality. A person sent to the wrong route is less likely to complete the transaction, even if the link receives a click.',
        ])},
        { heading: 'What you need to start', body: list([
          'An audience with a recurring import, supplier or freight question.',
          'A Sure Imports affiliate account and acceptance of the current terms.',
          'The correct service-specific tracking link from the dashboard.',
          'One useful channel: a website, newsletter, video platform, social page or relevant community.',
          'A clear disclosure that you may earn commission from eligible transactions.',
          'A simple routine for checking attributed requests, pending commission and available balances.',
        ])},
        { heading: 'Five content formats that can work', body: paragraphs([
          'Search guides answer a durable question. Comparison pages help a reader choose between routes. Checklists reduce mistakes before purchase or shipment. Short videos demonstrate a process visually. Community answers solve an immediate problem in context. Each format should have one specific next step, not a wall of unrelated links.',
          'For example, an Alibaba guide can explain supplier checks, payment expectations and shipping decisions before linking to the appropriate buying route. The Sure Imports guide to <a href="https://www.sureimports.com/blog/how-to-buy-from-alibaba-and-ship-to-nigeria-safely-in-2026">buying from Alibaba and shipping to Nigeria</a> is a useful supporting resource.',
        ])},
        { heading: 'How commission becomes eligible', body: paragraphs([
          'A tracked click begins the journey but does not pay commission. The customer must complete the service-specific paid event. Percentage commissions use an eligible cost basis, fixed commissions use one eligible transaction, subscription commission can recur on qualifying payments, and freight commission uses final eligible billed KG or CBM.',
          'Current services use a 14-day review period. Refunds, reversals, duplication, excluded charges and breaches of the programme terms can prevent or reverse commission. Build forecasts from available commission rather than from clicks or pending estimates.',
        ])},
        { heading: 'A focused first-month plan', body: list([
          'Days 1 to 3: list the ten import questions your audience asks most often.',
          'Days 4 to 7: select one service and publish a complete answer to the strongest question.',
          'Week 2: turn the answer into a shorter video, message or checklist with the same disclosure.',
          'Week 3: answer objections and clarify who the service is not for.',
          'Week 4: review eligible outcomes, improve the call to action and plan the next topic.',
        ], true)},
        { heading: 'Avoid the common shortcuts', body: paragraphs([
          'Do not buy fake traffic, spam groups, copy another creator’s work, fabricate reviews or promise guaranteed income. Do not quote a changing price or delivery time as permanent. Do not present yourself as a Sure Imports employee or collect money without separate written authority.',
          'The durable advantage is trust. Specific, accurate advice can keep earning attention because it helps someone avoid an expensive import mistake.',
        ])},
      ],
      conclusion: ['Pick one customer problem you already understand, publish the best answer you can, disclose the affiliate relationship and connect the reader to the correct Sure Imports service. You can expand after real conversion data shows where your audience needs more help.'],
      faqs: [
        ['Do I need stock to join?', 'No. An affiliate refers customers and does not need to own the products or cargo.'],
        ['Do I set the service price?', 'No. Sure Imports determines its service pricing and transaction terms.'],
        ['Can a small audience work?', 'Yes. A small relevant audience can outperform a large unrelated one because customer intent and trust matter.'],
        ['Can I promote more than one service?', 'Yes, but begin with the service that best matches your audience and always use the correct service-specific route.'],
        ['Is income guaranteed?', 'No. Earnings depend on attributed eligible transactions, payment, review and compliance with the programme terms.'],
      ],
    }),
  },
];

articles.push(...additionalArticles);

const additionalArticles2 = [
  {
    title: 'How Sure Imports Affiliate Tracking and Attribution Work',
    slug: 'how-sure-imports-affiliate-tracking-and-attribution-work',
    focusKeyword: 'affiliate tracking and attribution',
    keywords: ['affiliate tracking and attribution', 'Sure Imports referral tracking', 'affiliate link tracking Nigeria', 'shipping request attribution', 'affiliate ownership'],
    description: 'Understand Sure Imports affiliate tracking, referral ownership, API-created shipping requests, qualifying events and how to protect attribution.',
    image: 'affiliate-tracking-attribution.png',
    publishAt: '2026-10-13T08:00:00.000Z',
    content: makeContent({
      intro: [
        '<strong>Affiliate tracking and attribution</strong> answer two different questions: what interaction was recorded, and which affiliate owns an eligible commercial outcome. For Sure Imports, a visit is not the final outcome. Attribution must connect a partner’s introduction to the relevant paid service event.',
        'Understanding that chain helps affiliates troubleshoot responsibly. It also prevents the common mistake of treating every click, request estimate or customer registration as earned commission.',
      ],
      sections: [
        { heading: 'The attribution chain', body: list([
          'The affiliate selects the correct service link or approved API workflow.',
          'A customer uses that route and the platform records the relevant referral context.',
          'The customer starts the intended service journey.',
          'A qualifying payment or fully paid linked invoice occurs.',
          'The system applies the configured commission basis and creates a snapshot.',
          'The commission passes through the review workflow before becoming available.',
        ], true)},
        { heading: 'Why a click is not a commission', body: paragraphs([
          'Clicks reveal interest, but some visitors are researching, some abandon the process and some choose an ineligible service. Commission exists only after the configured business outcome. That design aligns the programme with delivered customer value rather than raw advertising volume.',
          'Use click and visit data to improve content, but use attributed eligible transactions to evaluate commercial performance. A page with fewer visitors can be more valuable if it answers a high-intent question precisely.',
        ])},
        { heading: 'Service-specific qualifying events', body: paragraphs([
          'Buy From Chinese Websites uses eligible product cost. Supplier Reports, Phones and Laptops, and Supplier Verification use fixed eligible transactions. Supplier Intelligence uses qualifying subscription payments. Ship with Us waits for the linked invoice to be fully paid and uses final eligible billed quantity.',
          'These distinctions explain why two referrals that begin on the same day may appear in different stages. One might be awaiting payment, another under review and another available.',
        ])},
        { heading: 'API request ownership', body: paragraphs([
          'When an authorised affiliate API key creates a shipping request and the API accepts it, that affiliate owns the request. The creation response includes attribution details and a lock time. Retries with the same idempotency key should resolve to the same logical creation instead of producing competing requests.',
          'Request ownership is deliberately narrower than the customer’s general relationship. It does not rewrite attribution for unrelated services or future journeys. This gives business integrations certainty about requests they originate without claiming every action that customer may ever take.',
        ])},
        { heading: 'How to reduce lost or disputed attribution', body: list([
          'Use the service link copied from your authenticated dashboard, not a manually edited approximation.',
          'Test the link in a clean browser and confirm that it reaches the intended service journey.',
          'Do not place another partner’s tracking parameters inside your content.',
          'For API requests, retain the external reference, idempotency key and returned request ID.',
          'Do not ask customers to create duplicates when a request already exists.',
          'Raise a support query with specific references and timestamps, never with an unsupported earnings estimate.',
        ])},
        { heading: 'Privacy-aware measurement', body: paragraphs([
          'Attribution does not justify collecting more personal data than necessary. Dashboard reports can identify operational outcomes while masking customer details where appropriate. Affiliates should protect exports and avoid sharing customer records in public communities.',
          'For content analytics, track aggregate landing-page and conversion patterns. For transaction support, use the identifiers supplied by the platform. This separation keeps marketing analysis useful without turning customer data into promotional material.',
        ])},
        { heading: 'A practical reconciliation routine', body: paragraphs([
          'Once a week, compare your published service links, attributed requests, commission statuses and completed payouts. Annotate campaigns with dates and topics so you can explain changes. For API integrations, reconcile your external reference against the Sure Imports request ID.',
          'If traffic rises but attributed requests do not, inspect link placement and intent. If requests rise but eligible payments do not, improve qualification and explain the service more accurately. If a status changes after payment, check review and reversal information before escalating.',
        ])},
      ],
      conclusion: ['Treat tracking as an evidence chain. Preserve clean links and request identifiers, explain the qualifying event accurately, and reconcile dashboard stages instead of estimating commission from traffic.'],
      faqs: [
        ['Does every tracked visit create commission?', 'No. A customer must complete the qualifying paid event for an eligible service.'],
        ['Is an API-created shipping request permanently attributed?', 'The accepted request has locked affiliate ownership. This request-level ownership does not replace the customer’s general relationship for unrelated journeys.'],
        ['What should a business store after API creation?', 'Store its external reference, idempotency key, returned request ID, status and attribution record.'],
        ['Why can commission change during review?', 'Refunds, reversals, duplication, eligibility issues or breaches can affect pending commission.'],
        ['How do I troubleshoot attribution?', 'Verify the exact link or API identifiers, note timestamps and service route, then use those records when contacting support.'],
      ],
    }),
  },
  {
    title: 'Sure Imports Affiliate Payouts: Review Periods, Balances and Withdrawals',
    slug: 'sure-imports-affiliate-payouts-review-periods-balances-withdrawals',
    focusKeyword: 'Sure Imports affiliate payouts',
    keywords: ['Sure Imports affiliate payouts', 'affiliate payout Nigeria', 'affiliate commission review period', 'affiliate balance withdrawal', 'Sure Imports commissions'],
    description: 'Learn how Sure Imports affiliate payouts move from pending commission through review to available balances, withdrawal and reconciliation.',
    image: 'affiliate-payouts.png',
    publishAt: '2026-10-20T08:00:00.000Z',
    content: makeContent({
      intro: [
        '<strong>Sure Imports affiliate payouts</strong> begin long before a withdrawal request. A transaction must first be attributed, paid, calculated on its eligible basis and reviewed. The dashboard separates these stages so affiliates can distinguish potential commission from funds that are actually available.',
        `The current configured review period for eligible services is 14 days as verified on ${VERIFIED_ON}. A review period is not a promise that every pending entry will be approved; the transaction must remain eligible under the current terms.`,
      ],
      sections: [
        { heading: 'Understand each balance state', body: table(['State', 'What it generally means', 'How to treat it'], [
          ['Tracked or requested', 'A referral interaction or service request exists', 'Operational signal, not earnings'],
          ['Pending or in review', 'A commission snapshot exists but checks remain', 'Do not count as withdrawable cash'],
          ['Available', 'The commission has satisfied the applicable review workflow', 'Use for payout planning'],
          ['Paid', 'A payout record has been completed', 'Reconcile with the destination account'],
          ['Reversed or rejected', 'Eligibility did not survive review or changed later', 'Read the reason and update records'],
        ])},
        { heading: 'Why the 14-day review exists', body: paragraphs([
          'Cross-border services can involve payment reversals, refunds, duplicated requests, invoice corrections and service cancellations. The review window gives the programme time to verify that commission was calculated on a completed eligible event and not on an excluded or temporary amount.',
          'A shipping estimate can also differ from the final billed quantity. The commission snapshot uses the final eligible KG or CBM after full invoice payment, not the quantity typed into the first request.',
        ])},
        { heading: 'Prepare payout details carefully', body: paragraphs([
          'Use accurate account-holder and payment details in the dashboard. A mismatch can delay or fail a transfer. Keep your affiliate profile current, follow any identity or tax-information request that applies, and never send sensitive payment credentials through public comments or community chats.',
          'Where the dashboard supports different currencies or payout methods, follow the options made available to your account. A commission denominated in one currency should not be assumed to convert at a rate chosen by the affiliate.',
        ])},
        { heading: 'Reconcile a payout', body: list([
          'Record the payout reference, date, amount and currency shown in the affiliate dashboard.',
          'Compare it with the receiving account and allow for the stated processing route.',
          'Keep pending commission separate from available commission in your own forecast.',
          'Map reversals or adjustments to the underlying transaction reference.',
          'Contact support with exact references if a completed payout does not arrive as expected.',
        ], true)},
        { heading: 'Common reasons commission may not become available', body: paragraphs([
          'The customer may not have paid, the service or invoice line may be excluded, the transaction may be duplicated or self-referred in breach of the terms, or a payment may have been refunded or reversed. A service request can also remain operationally active without yet creating a commission event.',
          'The best first step is to inspect status and transaction details rather than infer a system error from a click count. If the record appears inconsistent, provide the affiliate support team with the service, request or transaction reference and relevant date.',
        ])},
        { heading: 'Plan cash flow conservatively', body: paragraphs([
          'Do not commit pending commission to advertising costs, staff bonuses or partner shares before it becomes available. Use a rolling forecast with separate columns for pending, expected review date, available and paid. Apply a conservative adjustment until you have enough history to understand your own approval pattern.',
          'A sustainable affiliate business measures net available and paid commission after content and promotion costs. Gross dashboard activity can look impressive while producing little actual margin if acquisition is expensive or traffic is poorly qualified.',
        ])},
      ],
      conclusion: ['Keep accurate payout details, learn the dashboard states and reconcile by transaction reference. Base spending decisions on available and paid commission, not clicks, requests or pending balances.'],
      faqs: [
        ['How long is the Sure Imports affiliate review period?', 'The current configured period is 14 days for the eligible services documented in this series.'],
        ['Can a pending commission be reversed?', 'Yes. Refunds, reversals, duplication, ineligibility or terms violations can affect a pending entry.'],
        ['Is a shipping request immediately payable?', 'No. Commission depends on a fully paid linked invoice and the final eligible billable quantity, followed by review.'],
        ['What information should I keep for reconciliation?', 'Keep transaction or request references, dates, amounts, currencies, statuses and payout references.'],
        ['Where do I request or monitor payouts?', 'Use the authenticated affiliate dashboard and the payout options available to your account.'],
      ],
    }),
  },
  {
    title: 'Who Can Join the Sure Imports Affiliate Program?',
    slug: 'who-can-join-sure-imports-affiliate-program',
    focusKeyword: 'who can join Sure Imports affiliate program',
    keywords: ['who can join Sure Imports affiliate program', 'affiliate program for creators Nigeria', 'affiliate program for businesses', 'import consultant affiliate', 'logistics partner program'],
    description: 'See who can join the Sure Imports affiliate program, which audience types fit each service, and what creators, consultants and businesses need.',
    image: 'who-can-join-affiliate-program.png',
    publishAt: '2026-10-27T08:00:00.000Z',
    content: makeContent({
      intro: [
        'You do not need millions of followers to fit the <strong>Sure Imports affiliate program</strong>. The important question is whether people trust you for decisions connected to importing, supplier research, devices or freight. A focused community, consultancy or business workflow can produce stronger referrals than a broad audience with no trade intent.',
        'The programme supports individual publishers and business partners. Businesses that already create shipping demand can also use the affiliate developer workspace and API to submit customer requests programmatically.',
      ],
      sections: [
        { heading: 'Creators and educators', body: paragraphs([
          'YouTube educators, TikTok creators, bloggers, podcasters and newsletter publishers can turn repeated audience questions into durable guides. The best fit is a creator who explains processes and trade-offs rather than merely announcing a commission link.',
          'Useful topics include marketplace buying, supplier checks, freight methods, cost components and device sourcing. Disclose the affiliate relationship in the article, description or post where the recommendation appears.',
        ])},
        { heading: 'Community administrators', body: paragraphs([
          'WhatsApp, Telegram, Facebook and professional community operators often see high-intent questions in real time. A contextual answer can help, but repeated unsolicited promotion can damage the group. Establish clear promotion rules and create a pinned resource that explains the service before presenting a link.',
          'Do not expose customer details or screenshots of private requests. Direct people to official Sure Imports routes for quotes, payment and support.',
        ])},
        { heading: 'Consultants and sourcing professionals', body: paragraphs([
          'Consultants may receive enquiries they cannot or do not want to fulfil directly. The affiliate programme provides a referral route, but it does not transfer responsibility for the Sure Imports service to the consultant. Explain which party is performing each task.',
          'If your engagement includes separate paid consulting, document that arrangement independently. Never add an undisclosed markup while describing it as a Sure Imports charge.',
        ])},
        { heading: 'Businesses, platforms and agencies', body: paragraphs([
          'A marketplace, commerce application, agency, procurement tool or merchant network can participate when customers need an eligible service. For recurring shipping-request volume, the API allows a server-side system to discover plans, submit requests and retrieve status while locking request-level affiliate ownership.',
          'Technical participation requires secure key management, customer consent, privacy controls, idempotent request creation and operational reconciliation. The API is a workflow capability, not permission to make unauthorised commitments for Sure Imports.',
        ])},
        { heading: 'Match the audience to the service', body: table(['Audience signal', 'Likely service route'], [
          ['Has product links but cannot complete purchase', 'Buy From Chinese Websites'],
          ['Needs structured supplier information', 'Supplier Reports or Supplier Intelligence'],
          ['Wants an eligible phone or laptop', 'Phones and Laptops'],
          ['Needs a supplier checked before payment', 'Supplier Verification'],
          ['Already has goods ready to move', 'Ship with Us'],
          ['Creates customer shipping requests at scale', 'Ship with Us plus affiliate API'],
        ])},
        { heading: 'Minimum readiness checklist', body: list([
          'You can identify where your audience’s import or shipping need begins.',
          'You are willing to disclose the affiliate relationship clearly.',
          'You will use current official service information and dashboard links.',
          'You will not promise earnings, acceptance, prices or delivery outcomes.',
          'You can protect account credentials and any customer information you handle.',
          'You will follow the affiliate terms and applicable rules for your channel.',
        ])},
        { heading: 'Who should not join yet', body: paragraphs([
          'The programme is a poor fit for anyone seeking instant payment for clicks, planning to use spam, or unwilling to distinguish an estimate from a confirmed transaction. It is also unsuitable for someone who intends to impersonate Sure Imports, fabricate proof, conceal disclosures or collect customer funds without authority.',
          'If you do not yet have a relevant audience, first publish helpful import content or build a small community resource. Relevance and trust are assets you can develop before expecting commission.',
        ])},
      ],
      conclusion: ['Join if you can connect a real audience or customer workflow to a relevant Sure Imports service and communicate it accurately. Start with one route, learn from eligible outcomes and add other services only when the demand is clear.'],
      faqs: [
        ['Can an individual join?', 'Yes. Creators, educators, consultants and community operators can apply and participate subject to the terms.'],
        ['Can a registered company join?', 'Yes. Businesses can use tracked service routes and, where appropriate, the shipping affiliate API.'],
        ['Do I need a website?', 'Not necessarily. A relevant social, video, newsletter or community channel may work, provided promotion is transparent and compliant.'],
        ['Do I need a large audience?', 'No. Relevance, trust and customer intent can matter more than follower count.'],
        ['Can Sure Imports reject participation?', 'Programme access and transactions remain subject to account review, current terms, service rules and compliance requirements.'],
      ],
    }),
  },
  {
    title: 'How to Promote Your Sure Imports Affiliate Link on WhatsApp Without Spamming',
    slug: 'promote-sure-imports-affiliate-link-whatsapp-without-spamming',
    focusKeyword: 'promote affiliate link on WhatsApp',
    keywords: ['promote affiliate link on WhatsApp', 'WhatsApp affiliate marketing Nigeria', 'Sure Imports affiliate link', 'affiliate marketing without spam', 'import affiliate content'],
    description: 'Promote a Sure Imports affiliate link on WhatsApp with useful content, clear disclosure, audience consent and a practical no-spam publishing plan.',
    image: 'promote-affiliate-links-messaging.png',
    publishAt: '2026-11-03T08:00:00.000Z',
    content: makeContent({
      intro: [
        'Learning how to <strong>promote an affiliate link on WhatsApp</strong> is less about sending more messages and more about earning permission to be useful. People open WhatsApp to communicate with people and communities they know. A flood of unexplained links is intrusive; a timely answer to a real import question can be valuable.',
        'For Sure Imports affiliates, the safest approach is education first, disclosure second and one relevant next step. The link should help the reader act on the explanation, not replace the explanation.',
      ],
      sections: [
        { heading: 'Start with consent and context', body: paragraphs([
          'Use groups and broadcast lists according to their rules and the expectations under which members joined. Do not scrape numbers, add people without consent or repeatedly message contacts who have shown no interest. A private message is appropriate when someone has asked for help and the service directly answers that request.',
          'State why you are sharing the resource. If you may earn commission, disclose that fact plainly near the link. A disclosure builds trust and lets the customer evaluate the recommendation with full context.',
        ])},
        { heading: 'Use a helpful message structure', body: list([
          '<strong>Problem:</strong> repeat the specific question in the customer’s language.',
          '<strong>Useful answer:</strong> explain two or three important decision points.',
          '<strong>Fit:</strong> state who the Sure Imports service is useful for and any key limitation.',
          '<strong>Disclosure:</strong> say that you may earn commission from an eligible transaction.',
          '<strong>Action:</strong> include one service-specific dashboard link and invite questions.',
        ])},
        { heading: 'Example message patterns', body: paragraphs([
          '<strong>For a product-link buyer:</strong> “If you already have the product link, confirm the exact model, quantity and seller details first. Sure Imports can help with the Chinese-website purchase. I may earn a commission if your eligible transaction is completed through this link.”',
          '<strong>For freight:</strong> “To assess shipping, prepare the origin, destination, goods description and estimated KG or CBM. The estimate is not the final billed quantity. You can create a Ship with Us request here. I may earn commission from an eligible completed shipment.”',
          '<strong>For supplier risk:</strong> “Before paying a new supplier, decide whether you need a basic report, ongoing intelligence or a specific verification. This route explains the available option. I may earn commission if you complete an eligible paid service.”',
        ])},
        { heading: 'Build a weekly content rhythm', body: table(['Day', 'Message type', 'Purpose'], [
          ['Monday', 'One practical import tip', 'Build usefulness without a sales request'],
          ['Wednesday', 'Checklist or short explainer', 'Help members prepare for action'],
          ['Friday', 'Relevant service route with disclosure', 'Convert existing intent'],
          ['As needed', 'Direct answer to a genuine question', 'Provide contextual support'],
        ]) + paragraphs([
          'Frequency should follow the group’s purpose. A dedicated import-learning community may welcome several educational posts each week, while a general business group may need far less. Watch replies, opt-outs and complaints, not just link taps.',
        ])},
        { heading: 'Use Status for education, not just promotion', body: paragraphs([
          'A short sequence can work better than one crowded graphic. Frame one: name the mistake. Frame two: explain the consequence. Frame three: show what information to prepare. Frame four: disclose the affiliate relationship and share the appropriate route.',
          'Avoid fake countdowns, income screenshots, guaranteed savings and copied testimonials. Do not post customer documents, tracking screens or shipment details without explicit permission.',
        ])},
        { heading: 'Measure quality', body: paragraphs([
          'A message is useful when recipients ask relevant follow-up questions, create the correct service request and complete eligible transactions. Forward counts and reactions are secondary. If many people click but misunderstand the service, rewrite the message to qualify the audience more clearly.',
          'Keep separate links or campaign notes for major content themes where the dashboard permits it. This helps you distinguish shipping interest from buying or supplier-verification interest without collecting unnecessary personal data.',
        ])},
        { heading: 'What counts as spammy behaviour', body: list([
          'Sending the same promotion repeatedly to unrelated groups.',
          'Adding people to groups or broadcast campaigns without permission.',
          'Hiding that the link is commercial or using deceptive urgency.',
          'Replying to every question with a link regardless of the actual need.',
          'Continuing after a person asks not to receive messages.',
          'Using unofficial claims about pricing, delivery, approval or earnings.',
        ])},
      ],
      conclusion: ['Create one genuinely helpful WhatsApp resource for a recurring question, share it where you have permission, disclose the relationship and include one relevant affiliate route. Trust compounds; spam destroys it.'],
      faqs: [
        ['Should I disclose an affiliate link on WhatsApp?', 'Yes. Tell the reader clearly that you may earn commission if an eligible transaction is completed.'],
        ['Can I post the link in any group?', 'Only where group rules and member expectations allow it. Context and permission matter.'],
        ['How often should I post?', 'Use the lowest frequency that remains useful for the community. Educational value and response quality matter more than volume.'],
        ['Can a click earn commission?', 'No. The referred customer must complete the qualifying paid event for an eligible service.'],
        ['What should I avoid promising?', 'Do not guarantee price, savings, delivery dates, service acceptance, commission or earnings.'],
      ],
    }),
  },
  {
    title: 'Shipping Affiliate Program in Nigeria: Earn With Ship with Us',
    slug: 'shipping-affiliate-program-nigeria-earn-with-ship-with-us',
    focusKeyword: 'shipping affiliate program Nigeria',
    keywords: ['shipping affiliate program Nigeria', 'logistics affiliate program Nigeria', 'freight affiliate program', 'China shipping referral commission', 'Ship with Us affiliate'],
    description: 'A practical guide to the Sure Imports shipping affiliate program in Nigeria, including per-kg and per-CBM commissions, tracking and promotion.',
    image: 'shipping-affiliate-program-nigeria.png',
    publishAt: '2026-09-15T08:00:00.000Z',
    content: makeContent({
      intro: [
        'A <strong>shipping affiliate program in Nigeria</strong> should reward partners for introducing genuine freight demand, not merely for sending anonymous traffic. Sure Imports Ship with Us lets affiliates refer customers who need cargo moved and earn from the final eligible billed weight or volume after the shipment invoice is fully paid.',
        `As verified on ${VERIFIED_ON}, eligible weight-based shipments can pay US$0.50 per kilogram or ₦750 per kilogram, while qualifying Nigeria sea-freight volume can pay ₦10,000 per cubic metre. The actual rate and currency attached to a shipment depend on the configured plan.`,
      ],
      sections: [
        { heading: 'How shipping commission is calculated', body: paragraphs([
          'Shipping often begins with an estimate, but an estimate is not the commission basis. Cargo may be reweighed or remeasured after it arrives at the warehouse. Packaging, consolidation and the carrier’s billing rules can change the final chargeable quantity. Sure Imports therefore uses the final eligible billable KG or CBM linked to the fully paid invoice.',
          'For example, a request estimated at 80 kg that is finally billed at 74 eligible kg uses 74 kg for commission. A sea shipment billed at 2.4 eligible CBM uses that final volume. The dashboard configuration determines whether a plan is denominated in naira or US dollars.',
        ]) + table(['Example', 'Final eligible quantity', 'Configured rate', 'Illustrative commission'], [
          ['Weight plan in naira', '74 kg', '₦750/kg', '₦55,500'],
          ['Weight plan in US dollars', '74 kg', 'US$0.50/kg', 'US$37'],
          ['Nigeria sea-volume plan', '2.4 CBM', '₦10,000/CBM', '₦24,000'],
        ]) + '<p><em>Examples are arithmetic illustrations, not earnings guarantees. A transaction must remain eligible through review.</em></p>'},
        { heading: 'Charges that do not automatically increase commission', body: paragraphs([
          'The programme excludes customs duties, storage, verification, penalties, handling and unrelated invoice charges unless a future configuration expressly includes them. This prevents a partner from earning more because a customer incurred a penalty or avoidable storage cost.',
          'Affiliates should explain freight choices without representing every invoice line as commissionable. The clean message is that commission follows the final eligible logistics quantity and the plan’s configured rate.',
        ])},
        { heading: 'The referral journey', body: list([
          'Choose the Ship with Us link or approved integration route in the affiliate dashboard.',
          'Explain what information the customer needs: origin, destination, goods description, approximate weight or volume and contact details.',
          'The customer or authorised business integration creates the shipping request.',
          'Sure Imports reviews the request, confirms the applicable plan and handles the service process.',
          'After the linked invoice is fully paid, the system calculates commission from the final eligible quantity.',
          'The commission remains subject to the 14-day review period and programme rules.',
        ], true)},
        { heading: 'Content that attracts qualified shipping leads', body: paragraphs([
          `The most useful content answers questions that arise before a shipment request. Compare air and sea freight, explain actual versus volumetric weight, show how packaging affects volume, and clarify which product details influence handling. Sure Imports already has detailed guides to <a href="${SITE}/blog/air-freight-from-china-to-nigeria-when-speed-is-worth-the-extra-cost">air freight from China to Nigeria</a> and <a href="${SITE}/blog/sea-shipping-from-china-to-nigeria-when-it-saves-money-and-when-it-delays-you">sea shipping from China to Nigeria</a>.`,
          'A strong call to action follows the explanation: invite the reader to create a shipping request with the best available estimate and allow Sure Imports to confirm the operational details. Avoid publishing a universal transit time or rate where route, cargo type and current market conditions matter.',
        ])},
        { heading: 'For agencies, platforms and business communities', body: paragraphs([
          'Businesses can create shipping requests for their customers through the affiliate API. This is different from sending every customer to a public link. The API can place request creation inside a commerce, procurement, marketplace or customer-support workflow while preserving affiliate ownership of each accepted request.',
          'A business should use one external reference per request, send an idempotency key and store the returned Sure Imports request identifier. Keys require the appropriate shipping scopes and should stay in a secure server environment, never in browser code or public repositories.',
        ])},
        { heading: 'Compliance and expectation setting', body: paragraphs([
          'Do not describe yourself as the carrier unless that is independently true, and do not collect freight payments while implying they are being paid directly to Sure Imports. Disclose the affiliate relationship. Use current official information for restricted goods, service availability and quotes.',
          'Good qualification protects conversion. Ask whether the goods are already purchased, where they are located, how they are packed, the likely quantity and the destination. If the customer still needs purchasing support, direct them to the appropriate buying service instead of forcing the shipping route.',
        ])},
      ],
      conclusion: ['Build one practical shipping resource for a specific audience or cargo pattern, add a transparent disclosure, and use the Ship with Us route from your affiliate dashboard. Businesses with recurring volume can then evaluate the API for a more integrated workflow.'],
      faqs: [
        ['Does an estimated weight determine my commission?', 'No. Commission uses the final eligible billed KG or CBM after the linked invoice is fully paid.'],
        ['Can sea freight earn commission?', 'Yes. A configured Nigeria sea-volume plan can pay per final eligible CBM.'],
        ['Are customs duties commissionable?', 'Not under the current standard exclusions. Duties, storage, verification, penalties, handling and unrelated charges are excluded unless explicitly configured.'],
        ['Can my company submit requests by API?', 'Yes. Approved affiliates can use scoped API keys in the developer workspace to create and track customer shipping requests.'],
        ['How long is the review period?', 'The current configured review period is 14 days. Eligibility can still be affected by refunds, reversals, duplication or breaches of the terms.'],
      ],
    }),
  },
  {
    title: 'Sure Imports Shipping Affiliate API: Integration Guide for Businesses',
    slug: 'sure-imports-shipping-affiliate-api-integration-guide-businesses',
    focusKeyword: 'shipping affiliate API',
    keywords: ['shipping affiliate API', 'logistics API Nigeria', 'shipping request API', 'freight affiliate integration', 'Sure Imports API'],
    description: 'Integrate the Sure Imports shipping affiliate API: authentication, shipping plans, idempotent requests, attribution, errors and commission logic.',
    image: 'shipping-affiliate-api.png',
    publishAt: '2026-09-22T08:00:00.000Z',
    content: makeContent({
      intro: [
        'The <strong>Sure Imports shipping affiliate API</strong> allows an approved business affiliate to create shipping requests for its customers without sending staff through a separate manual form for every enquiry. It is designed for commerce tools, procurement platforms, agencies, communities and operational systems that already collect the basic customer and cargo information.',
        'The integration preserves affiliate ownership at the request level. When Sure Imports accepts a request created with your API key, the response includes the attribution identifier and lock time. If the linked shipping invoice is eventually paid and remains eligible, commission is calculated using the final billable shipping quantity and the rate configuration for that plan.',
      ],
      sections: [
        { heading: 'API base resources', body: table(['Purpose', 'Method and endpoint'], [
          ['Discover eligible shipping plans', 'GET https://www.sureimports.com/api/v1/shipping-plans?destinationCountry=Nigeria'],
          ['Create a customer shipping request', 'POST https://www.sureimports.com/api/v1/shipping-requests'],
          ['Retrieve a request', 'GET https://www.sureimports.com/api/v1/shipping-requests/REQUEST_ID'],
          ['OpenAPI 3.1 contract', 'GET https://www.sureimports.com/api/v1/openapi'],
        ]) + paragraphs([
          'Read the live OpenAPI contract during implementation rather than copying an old payload from a screenshot or article. The machine-readable contract is the source for current field constraints and response shapes.',
        ])},
        { heading: 'Authentication and key safety', body: paragraphs([
          'The API uses a Bearer API key issued in the affiliate developer workspace. Shipping creation and retrieval require the appropriate <code>shipping:write</code> and <code>shipping:read</code> scopes. A secret is displayed once and can be revoked, so store it in a server-side secret manager immediately.',
          'Never place the key in frontend JavaScript, a mobile application bundle, analytics events, support screenshots or a public source repository. If a key may have leaked, revoke it and issue a replacement. Use separate keys where independent systems need distinct audit and rotation boundaries.',
        ])},
        { heading: 'Discover a plan before creating a request', body: paragraphs([
          'A shipping plan determines operational context including destination and billing unit. Query the plan list using the customer’s destination, present only suitable choices in your interface and store the selected <code>shippingPlanId</code>. Do not hard-code an identifier indefinitely because available plans can evolve.',
          'The request quantity must be expressed in the returned plan’s unit. The current contract uses <code>shipment.estimatedQuantity</code>. Your interface should label that value clearly as an estimate and should not imply that it fixes the final freight charge or commission.',
        ])},
        { heading: 'Create an idempotent shipping request', body: `<pre><code>POST /api/v1/shipping-requests
Authorization: Bearer YOUR_SECRET_API_KEY
Idempotency-Key: your-stable-request-key
Content-Type: application/json

{
  "customer": {
    "firstName": "Customer first name",
    "email": "customer@example.com",
    "phone": "+234..."
  },
  "shipment": {
    "shippingName": "Internal shipment label",
    "destinationCountry": "Nigeria",
    "shippingPlanId": "selected-plan-id",
    "estimatedQuantity": 25,
    "description": "Clear description of the goods"
  },
  "externalReference": "your-unique-reference"
}</code></pre>` + paragraphs([
          'The <code>Idempotency-Key</code> must contain 8 to 120 characters. Generate one stable key for the logical creation attempt and reuse it when retrying after a timeout. Do not generate a fresh key for every retry, because that defeats duplicate protection.',
          'Use a unique external reference that maps to your own order, lead or service record. Store the request ID and status returned by Sure Imports. A successful creation returns HTTP 201 with the request identifiers, customer identifier and locked ownership details.',
        ])},
        { heading: 'Attribution and commission semantics', body: paragraphs([
          'An accepted API-created request is owned by the affiliate whose active key created it. That ownership is locked for the request. Request ownership does not overwrite the customer’s general affiliate relationship for unrelated journeys.',
          'Request creation does not itself generate payable commission. The early estimated quantity does not set commission either. When a linked shipping invoice becomes fully paid, the system uses the final eligible billable KG or CBM and the plan’s configured commission rate and currency to create the commission snapshot.',
        ])},
        { heading: 'Design for errors and retries', body: table(['HTTP status', 'Meaning and handling'], [
          ['400', 'Fix invalid fields, units, formats or missing required data before retrying.'],
          ['401', 'Check the Bearer credential; rotate it if exposure is possible.'],
          ['403', 'The key or affiliate lacks the required scope or permission.'],
          ['404', 'The plan or request resource was not found. Refresh plan data where relevant.'],
          ['409', 'Resolve an idempotency or external-reference conflict. Do not create blind duplicates.'],
          ['429', 'Respect Retry-After and back off with jitter.'],
          ['500 or 503', 'Retry safely with the same idempotency key and alert if failures persist.'],
        ])},
        { heading: 'Production integration checklist', body: list([
          'Keep keys in a managed server-side secret store and document rotation ownership.',
          'Cache plan discovery briefly, but refresh when a plan is unavailable or changes.',
          'Validate required customer and shipment fields before making the API call.',
          'Use one stable idempotency key and one unique external reference per logical request.',
          'Log request IDs, response status and your reference without logging the API secret.',
          'Handle 429 responses using Retry-After and bounded exponential backoff.',
          'Reconcile request status and eligible commission through the affiliate dashboard and exports.',
          'Tell customers that Sure Imports will assess and confirm the request; do not present an estimate as a final quote.',
        ])},
        { heading: 'Privacy and customer communication', body: paragraphs([
          'Submit customer data only when you have a lawful basis and have told the customer that the information will be shared with Sure Imports to handle the shipping request. Collect only the fields needed for the transaction. Protect exported reports and restrict access to operational staff.',
          'The affiliate dashboard uses privacy-conscious reporting, including masked information where appropriate. Your own application should follow the same principle. Avoid placing full customer data in idempotency keys, external references or logs.',
        ])},
      ],
      conclusion: ['Create an affiliate account, open the developer workspace, read the live OpenAPI contract and implement plan discovery before request creation. Start with a small controlled flow, verify attribution and reconciliation, then expand the integration once error handling and customer consent are proven.'],
      faqs: [
        ['Can the API create shipping requests for my customers?', 'Yes. An approved business affiliate can create requests under its API credentials and preserve request-level affiliate attribution.'],
        ['Which field contains the estimated weight or volume?', 'Use shipment.estimatedQuantity in the unit returned by the selected shipping plan.'],
        ['Why is an idempotency key required?', 'It lets a client safely retry a creation attempt without unintentionally producing duplicate requests.'],
        ['Does HTTP 201 mean commission has been earned?', 'No. It means the request was accepted. Eligible commission depends on a fully paid linked invoice, final billable quantity and programme review.'],
        ['Where is the API documentation?', 'The developer workspace links to the documentation, and the current OpenAPI 3.1 contract is available from the public API endpoint listed above.'],
      ],
    }),
  },
  {
    title: 'Sure Imports Affiliate Commission Rates and How Earnings Are Calculated',
    slug: 'sure-imports-affiliate-commission-rates-how-earnings-are-calculated',
    focusKeyword: 'Sure Imports affiliate commission rates',
    keywords: ['Sure Imports affiliate commission rates', 'import affiliate commission', 'shipping referral commission', 'affiliate earnings Nigeria', 'Supplier Intelligence commission'],
    description: 'See current Sure Imports affiliate commission rates and understand eligible revenue, fixed, recurring, per-kg and per-CBM commission calculations.',
    image: 'affiliate-commission-rates.png',
    publishAt: '2026-09-29T08:00:00.000Z',
    content: makeContent({
      showRates: true,
      intro: [
        '<strong>Sure Imports affiliate commission rates</strong> use four different calculation models because buying support, research, subscriptions, verification and freight do not produce value in the same way. Understanding the basis is more important than memorising the headline number.',
        `This guide documents the active configuration verified on ${VERIFIED_ON}, shows worked examples and explains exclusions. Always treat the affiliate dashboard and terms as authoritative because rates and eligible services may change.`,
      ],
      sections: [
        { heading: 'Percentage of eligible product cost', body: paragraphs([
          'Buy From Chinese Websites currently pays 2% of eligible product cost. The percentage does not apply to freight, customs duties, service fees, penalties or unrelated non-product invoice lines.',
          'If eligible products cost ₦800,000, the arithmetic starting point is ₦16,000. If the total invoice is higher because shipping and other charges were added, those excluded lines do not increase the calculation. The transaction must still be fully paid and remain eligible through review.',
        ])},
        { heading: 'Fixed commission per eligible transaction', body: paragraphs([
          'Supplier Reports, Phones and Laptops, and Supplier Verification use fixed commissions. This makes the calculation easy: the eligible completed transaction earns the configured amount in its currency, regardless of excluded add-ons.',
          'The current rates are ₦5,000 or US$5 for Supplier Reports, ₦20,000 or US$15 for Phones and Laptops, and ₦10,000 or US$10 for Supplier Verification. The applicable currency comes from the configured transaction context; an affiliate cannot choose the more attractive conversion after the event.',
        ])},
        { heading: 'Recurring subscription commission', body: paragraphs([
          'Supplier Intelligence currently pays 10% of eligible subscription payments on a recurring basis. If a referred customer makes a qualifying ₦50,000 subscription payment, the starting calculation is ₦5,000. A later qualifying renewal can create another commission.',
          'Recurring does not mean irrevocable or lifetime-guaranteed. Each payment must be successfully completed and satisfy the programme rules. Cancellations, failed renewals, refunds, reversals and account or attribution conditions can affect future or pending commission.',
        ])},
        { heading: 'Per-unit freight commission', body: paragraphs([
          'Ship with Us uses final eligible billed quantity. Depending on the plan, that may be US$0.50 per KG, ₦750 per KG, or ₦10,000 per CBM for an eligible Nigeria sea-volume route.',
          'If a shipment is estimated at 100 kg but finally billed at 92 eligible kg on the ₦750 plan, the calculation begins at ₦69,000. If a sea shipment is finally billed at 1.8 eligible CBM on the ₦10,000 plan, it begins at ₦18,000. Duties, storage, verification, penalties, handling and unrelated charges remain excluded unless explicitly configured.',
        ])},
        { heading: 'Why commission enters review', body: paragraphs([
          'The current review period is 14 days. A review window lets the platform account for payment reversals, refunds, duplicated transactions, service cancellations, fraud indicators and eligibility problems. It also gives partners a clearer distinction between pending and available balances.',
          'Do not treat pending commission as cash already owed or promise collaborators a share before it becomes available. Use the dashboard status, transaction reference and timestamps for reconciliation.',
        ])},
        { heading: 'What does not earn commission', body: list([
          'Clicks, impressions, copied links or account registrations by themselves.',
          'Unpaid quotations, abandoned requests or rejected transactions.',
          'Invoice components explicitly excluded from the commission basis.',
          'Refunded, reversed, duplicated, fraudulent or self-dealing transactions that breach the terms.',
          'A service that is not enabled for affiliate commission in the current dashboard configuration.',
        ])},
        { heading: 'How to forecast responsibly', body: paragraphs([
          'Forecast from a funnel, not from a fantasy income claim. Estimate qualified visitors, the proportion who create the right service request, the proportion who complete payment, the typical eligible transaction basis, and the proportion that survives review. Keep each assumption visible.',
          'For shipping, separate KG and CBM plans. For Supplier Intelligence, separate first payments from renewals. For fixed services, count eligible completed purchases rather than total leads. This produces a model you can improve with actual dashboard data.',
        ])},
      ],
      conclusion: ['Use the rate model to select content with the best audience fit, then measure eligible paid outcomes. If the dashboard rate differs from an older article or screenshot, use the current dashboard configuration and update your promotion.'],
      faqs: [
        ['Which Sure Imports service has recurring commission?', 'Supplier Intelligence currently pays 10% on eligible subscription payments, including qualifying renewals.'],
        ['Does the 2% buying commission include shipping?', 'No. It is based on eligible product cost; shipping, duties, fees and other non-product costs are excluded.'],
        ['When is shipping commission calculated?', 'After the linked invoice is fully paid, using the final eligible billed KG or CBM and the configured plan rate.'],
        ['Can rates change?', 'Yes. Services, rates, currencies and eligibility rules may change. The affiliate dashboard is authoritative.'],
        ['Are the examples guaranteed earnings?', 'No. They only illustrate the arithmetic. Actual commission requires eligible, paid and reviewed transactions.'],
      ],
    }),
  },
];

articles.push(...additionalArticles2);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
