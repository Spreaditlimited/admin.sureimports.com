import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SITE = 'https://www.sureimports.com';
const AFFILIATE = 'https://affiliate.sureimports.com';
const LINESCOUT = 'https://linescout.sureimports.com';
const IMAGE_ROOT = process.env.AFFILIATE_BLOG_IMAGE_ROOT || path.resolve(process.cwd(), '../sureimports.com/public/blog-affiliate-images');

const paragraphs = (items) => items.map((item) => `<p>${item}</p>`).join('\n');
const list = (items, ordered = false) => `<${ordered ? 'ol' : 'ul'}>${items.map((item) => `<li>${item}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map((item) => `<th>${item}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((item) => `<td>${item}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const section = (heading, body) => `<h2>${heading}</h2>\n${body}`;
const sub = (heading, body) => `<h3>${heading}</h3>\n${body}`;

const article = {
  title: 'LineScout Affiliate Program: Earn From Machine, Bulk and White-Label Sourcing',
  metaTitle: 'LineScout Affiliate Program: Sourcing Commission Guide',
  slug: 'linescout-affiliate-program-machine-bulk-white-label-sourcing',
  focusKeyword: 'LineScout affiliate program',
  keywords: [
    'LineScout affiliate program',
    'machine sourcing affiliate program',
    'bulk product sourcing affiliate',
    'white label affiliate program',
    'China sourcing affiliate program',
    'Sure Imports LineScout affiliate',
  ],
  description: 'Learn how the LineScout affiliate program pays on eligible machine, bulk-product and white-label sourcing projects, with rates and promotion ideas.',
  image: 'linescout-affiliate-program.png',
  publishAt: new Date('2026-12-15T08:00:00.000Z'),
};

article.content = [
  paragraphs([
    'The <strong>LineScout affiliate program</strong> lets eligible Sure Imports affiliates earn when referred customers complete qualifying machine, bulk-product or white-label sourcing payments. It brings sourcing projects into the same central affiliate system used for other Sure Imports services, while giving partners a dedicated LineScout referral link for the customer journey.',
    'This matters because sourcing is rarely a one-click purchase. A prospective customer may begin with a rough product idea, develop a precise brief, compare suppliers and quotations, pay a commitment fee, approve the commercial direction and later fund the product or project. The commission model reflects that longer journey with separate qualifying events instead of treating an enquiry as a completed sale.',
    `As verified on 11 September 2026, the active configuration pays <strong>10% of an eligible LineScout commitment fee</strong> and <strong>2% of an eligible product or sourcing-project payment</strong>. Shipping is not included in that percentage basis. If the same customer later completes an eligible shipment, freight commission is calculated separately under Ship with Us. For the full portfolio, read the <a href="${SITE}/blog/sure-imports-affiliate-program-earn-from-import-and-shipping-referrals">Sure Imports affiliate program guide</a>.`,
  ]),
  section('What LineScout is', paragraphs([
    `LineScout is a digital sourcing workspace built by Sure Imports for individuals and small businesses. It helps customers move from an idea or operational need to a better-defined sourcing project. The workspace supports product discovery, structured briefs, supplier research, quotations, negotiation, purchasing, fulfilment, payments, project records, shipment visibility and reorder history. Visit the <a href="${LINESCOUT}/">LineScout overview</a> to see the current customer journey.`,
    'The combination of technology and sourcing support is important. Early guidance can help a customer clarify options, but supplier selection and commercial execution still require evidence, communication and disciplined decision-making. Affiliates should present LineScout as a structured route into sourcing, not as a promise that every idea, price, specification or delivery target will be accepted.',
    `LineScout is not the route for banks, large companies, institutions, government bodies, NGOs or other established organisations running formal procurement. Those buyers should review <a href="${SITE}/corporate-sourcing">Sure Imports Corporate Sourcing</a>. Keeping this distinction clear sends each prospect into the workflow designed for its requirements.`,
  ])),
  section('The three sourcing routes affiliates can explain', table(
    ['LineScout route', 'Typical customer need', 'Information that improves the brief'],
    [
      ['Machine sourcing', 'Production equipment, processing machinery or a complete line', 'Product, input material, capacity, output quality, utilities, packaging, space and budget'],
      ['Bulk-product sourcing', 'Finished products in commercial quantities', 'Exact specification, quantity, quality level, target price, destination and delivery window'],
      ['White-label sourcing', 'Existing products sold with the customer’s own branding and packaging', 'Product format, ingredients or materials, packaging, artwork readiness, order quantity and market requirements'],
    ],
  ) + sub('Machine sourcing', paragraphs([
    'Machine sourcing begins with the required output, not with a random equipment photo. A useful brief defines what the machine must process or produce, input conditions, target capacity per hour or day, acceptable output quality, available power, water, fuel or compressed air, factory space, operator expectations, packaging formats and budget range.',
    'Affiliates serving manufacturers, food processors, agricultural businesses and technical entrepreneurs can publish specification guides that help prospects prepare these details. This attracts stronger intent than a generic list of machines because it addresses the questions that affect configuration, quotation quality and supplier comparison.',
  ])) + sub('Bulk-product sourcing', paragraphs([
    'Bulk sourcing is for businesses that need finished goods at commercial scale. The customer should define the product precisely, including materials, dimensions, variants, certifications or test needs, quantity, target market, packaging, destination and timing. A vague request such as “I need cheap products from China” gives a sourcing team little basis for a reliable comparison.',
    'Useful affiliate content can explain sample decisions, minimum order quantities, specification sheets, supplier comparisons and the difference between unit price and total commercial cost. The goal is to help a buyer arrive with a decision-ready requirement rather than to guarantee a particular supplier or price.',
  ])) + sub('White-label sourcing', paragraphs([
    `White-label sourcing helps a business select an existing product and present it under its own brand, subject to supplier capability, order quantity and market requirements. LineScout currently provides a discovery catalogue with product ideas, pricing signals, demand or regulatory notes and practical product guides. The public <a href="${LINESCOUT}/white-label">white-label discovery page</a> is a useful starting point.`,
    'The brand owner still needs to make decisions about formula or material options, packaging components, artwork, claims, testing, minimum order quantity and launch economics. Affiliates can add real value by teaching those decisions instead of suggesting that putting a logo on a package is the entire product-development process.',
  ]))),
  section('How LineScout affiliate commission is calculated', paragraphs([
    'LineScout has two distinct commission events because the commitment stage and the funded project stage represent different commercial progress. Each event must be attributed, paid, eligible and retained through the current 14-day review period. Clicks, registrations, draft projects, unpaid quotations and abandoned payment attempts do not earn commission.',
  ]) + table(
    ['Qualifying event', 'Current rate', 'Eligible basis', 'Important exclusion'],
    [
      ['Commitment fee', '10%', 'Eligible LineScout commitment fee', 'Applicable fees are excluded'],
      ['Project payment', '2%', 'Eligible product or sourcing-project payment', 'Shipping and processing fees are excluded'],
      ['Later shipping payment', 'Ship with Us rate', 'Final eligible billed KG or CBM', 'Not included in the LineScout percentage'],
    ],
  ) + paragraphs([
    'For illustration, if the eligible portion of a commitment fee is ₦100,000, a 10% commission snapshot would be ₦10,000. If a later eligible product or sourcing-project payment is ₦5,000,000, a 2% snapshot would be ₦100,000. These examples explain the arithmetic only. They are not price quotations, income promises or confirmation that every invoice component qualifies.',
    'Where a payment is made in a supported non-NGN or non-USD currency, the system records the applicable payment-time USD settlement snapshot for the affiliate ledger. The dashboard and programme terms remain authoritative if a rate, currency, eligibility rule or review treatment changes after this article is published.',
  ])),
  section('How LineScout referral tracking works', paragraphs([
    'After joining the Sure Imports affiliate programme, the partner’s dashboard displays separate tracked links for Sure Imports and LineScout. The LineScout link follows the form shown in the dashboard and leads the referred prospect into the LineScout sign-in journey. Affiliates should copy that personalised URL exactly instead of adding an improvised query string to a public page.',
    'A valid referral interaction can be connected to the customer during account verification. Once a legitimate customer relationship is claimed under the programme rules, it is designed to remain attached rather than being silently overwritten by another partner. This protects the value of a genuine introduction across a sourcing process that may take time.',
    'Attribution is still not the same as commission. LineScout sends eligible, idempotent project-payment events into the central Sure Imports affiliate ledger. The ledger applies the active service rule, creates the commission snapshot and shows its review status. A refund, reversal, duplication, fraud concern or terms violation can prevent approval or reverse a previously recorded amount.',
  ])),
  section('Who should promote LineScout', list([
    '<strong>Manufacturing and agribusiness educators</strong> whose audiences ask about processing machinery or production lines.',
    '<strong>Importation trainers and trade communities</strong> that receive recurring questions about suppliers and bulk orders.',
    '<strong>Brand and ecommerce consultants</strong> helping businesses evaluate white-label product opportunities.',
    '<strong>Industry associations and business communities</strong> serving small companies planning equipment or inventory purchases.',
    '<strong>Publishers, creators and newsletters</strong> that can explain a narrow sourcing decision in depth.',
    '<strong>Service providers</strong> whose clients need sourcing outside the provider’s own professional scope.',
  ]) + paragraphs([
    'Audience fit is more important than reach alone. A technical newsletter read by a small group of factory owners may create more qualified projects than a broad entertainment channel. The best signal is not follower count; it is whether people already ask the publisher for guidance about machines, product specifications, commercial quantities, private branding or suppliers.',
  ])),
  section('Search-focused content ideas that can attract qualified projects', paragraphs([
    'A strong LineScout affiliate page should answer a concrete sourcing question before asking the reader to start a project. Search visitors are more likely to convert when the article helps them define requirements, compare options or avoid a foreseeable mistake. Build topic clusters around a specific audience, product category or production objective.',
  ]) + list([
    '<strong>Machine specification guides:</strong> how to define capacity, utilities, output quality and packaging for a rice, cassava, feed, water, cosmetics or food-processing line.',
    '<strong>Quotation comparison guides:</strong> how to compare scope, included machines, materials, motors, controls, spares, installation, training and warranty.',
    '<strong>Bulk sourcing checklists:</strong> what to include in a request for quotation and how to document samples, variants and acceptance criteria.',
    '<strong>White-label planning guides:</strong> product choice, minimum order quantity, packaging, artwork, compliance, quality checks and unit economics.',
    '<strong>Commercial explainers:</strong> commitment fee versus project payment, product cost versus shipping, and why the cheapest unit quotation may not be the lowest-risk option.',
    '<strong>Decision comparisons:</strong> a single machine versus a complete production line, generic packaging versus custom packaging, or bulk finished goods versus local production.',
  ]) + paragraphs([
    'The primary keyword for a dedicated programme page is “LineScout affiliate program.” Supporting intent includes “machine sourcing affiliate program,” “bulk product sourcing affiliate,” “white label affiliate program” and “China sourcing affiliate program.” Individual content pieces should target narrower problems rather than repeating the programme name in every title.',
  ])),
  section('A practical conversion path', list([
    'Choose one audience and one sourcing route.',
    'Publish an answer that helps the reader define a decision or prepare a brief.',
    'State clearly that you may earn commission from an eligible completed project.',
    'Direct individual and small-business prospects through the personalised LineScout link in your affiliate dashboard.',
    'Direct formal organisational procurement to Corporate Sourcing instead.',
    'Follow dashboard outcomes and improve qualification based on eligible payments, not clicks alone.',
  ], true) + paragraphs([
    'For a machine article, a useful call to action asks the reader to prepare the product, raw material, capacity, quality target, packaging formats, utilities, space and budget. For bulk goods, ask for a specification and quantity. For white label, ask for the product direction, packaging, quantity and target market. Better preparation reduces avoidable back-and-forth and makes the referral more useful to everyone.',
  ])),
  section('Promotion rules that protect trust', paragraphs([
    'Disclose the affiliate relationship close to the recommendation. Do not claim to be a Sure Imports employee, sourcing specialist or authorised representative unless a separate written agreement says so. Do not collect customer funds for Sure Imports, publish fabricated testimonials, promise guaranteed supplier approval, quote a temporary price as permanent or guarantee delivery and income.',
    'Use current service information and revisit evergreen articles when requirements or commission settings change. If the dashboard conflicts with an old screenshot, the dashboard and current terms control. This is especially important for machinery and custom projects, where specifications can change the price and scope materially.',
    'The programme works best as an education-led channel. A clear article that helps a prospect develop a viable brief can remain useful in search, sales conversations, newsletters and communities. Repeated unsolicited link drops may create traffic, but they are unlikely to build the confidence required for a serious sourcing payment.',
  ])),
  section('Frequently asked questions', [
    ['Is LineScout part of the Sure Imports affiliate program?', 'Yes. LineScout Sourcing is an active eligible service in the central Sure Imports affiliate programme.'],
    ['What LineScout projects can affiliates refer?', 'LineScout covers machine sourcing, bulk finished-product sourcing and white-label sourcing for individuals and small businesses.'],
    ['What is the current LineScout commission?', 'The active configuration verified on 11 September 2026 pays 10% of an eligible commitment fee and 2% of an eligible product or sourcing-project payment.'],
    ['Does the 2% include shipping?', 'No. Shipping and processing fees are excluded from the LineScout project-payment basis. Eligible freight is commissioned separately under Ship with Us using final billed KG or CBM.'],
    ['Do I earn from a LineScout registration?', 'No. A registration, click, draft project or unpaid quotation is not a qualifying commission event.'],
    ['Can I use the normal Sure Imports referral link?', 'The dashboard provides a dedicated personalised LineScout link. Use that link for LineScout promotions so the prospect follows the intended attribution journey.'],
    ['Is LineScout for corporate procurement?', `LineScout is designed for individuals and small businesses. Established organisations with formal procurement requirements should use <a href="${SITE}/corporate-sourcing">Corporate Sourcing</a>.`],
    ['How long is the current review period?', 'The current configured review period is 14 days. Eligibility can be affected by refunds, reversals, duplication, fraud indicators and programme-term violations.'],
  ].map(([question, answer]) => `<h3>${question}</h3><p>${answer}</p>`).join('\n')),
  section('Start with one well-defined sourcing problem', paragraphs([
    `Choose the LineScout route closest to your audience, create one genuinely useful specification or decision guide and include a transparent disclosure. Then <a href="${AFFILIATE}/sign-up">create a free Sure Imports affiliate account</a>, review the <a href="${AFFILIATE}/affiliate-terms">affiliate terms</a> and copy the personalised LineScout link from your dashboard.`,
    'Judge the channel by attributed eligible payments and the quality of the projects introduced. A well-prepared buyer is more valuable than a large volume of vague enquiries, and that principle is the foundation of a sustainable sourcing affiliate strategy.',
  ])),
].join('\n');

function wordCount(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

async function uploadImage() {
  const input = await readFile(path.join(IMAGE_ROOT, article.image));
  const digest = createHash('sha256').update(input).digest('hex').slice(0, 18).toUpperCase();
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'admin-sureimports/blog',
      public_id: `BLOG_AFF${digest}`,
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
  const issues = [];
  const words = wordCount(article.content);
  if (words < 1500) issues.push(`Article has only ${words} words`);
  if (article.description.length < 120 || article.description.length > 160) issues.push(`Meta description has ${article.description.length} characters`);
  if (/[—–]/.test(article.content) || /[—–]/.test(article.title)) issues.push('Article contains an em or en dash');
  if (/formal procurement[^<]{0,240}linescout\.sureimports\.com/i.test(article.content)) issues.push('Corporate audience is routed to LineScout');
  if (issues.length) throw new Error(`Validation failed:\n- ${issues.join('\n- ')}`);

  const collision = await prisma.blog.findFirst({ where: { blogSlug: article.slug }, select: { pidBlog: true } });
  if (collision) throw new Error(`CMS slug already exists: ${article.slug}`);

  console.table([{ slug: article.slug, words, descriptionLength: article.description.length, publishAt: article.publishAt.toISOString() }]);
  if (!APPLY) {
    console.log('Dry run passed. Re-run with --apply to upload the image and schedule the article.');
    return;
  }

  const category = await prisma.blog_category.findFirst({ where: { categoryName: 'Business Tips', status: 'active' } });
  const publisher = await prisma.blog_publisher.findFirst({ where: { publisherName: 'Tochukwu Nkwocha', status: 'active' } });
  if (!category || !publisher) throw new Error('Active Business Tips category or Tochukwu Nkwocha publisher is missing');

  cloudinary.config({
    cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key: String(process.env.CLOUDINARY_API_KEY || '').trim(),
    api_secret: String(process.env.CLOUDINARY_API_SECRET || '').trim(),
    secure: true,
  });
  const image = await uploadImage();
  const seo = {
    metaTitle: article.metaTitle,
    seoTitle: article.metaTitle,
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
    featured: false,
  };
  const created = await prisma.blog.create({ data: {
    pidBlog: `BLOG${randomBytes(14).toString('hex').toUpperCase()}`,
    blogTitle: article.title,
    blogContent: article.content,
    blogSlug: article.slug,
    blogPublished: true,
    blogFeatured: false,
    blogImage: image,
    blogBy: publisher.publisherName,
    publisherId: publisher.pidPublisher,
    categoryId: category.pidCategory,
    blogExt1: '',
    blogExt2: JSON.stringify(seo),
    xStaus: 'active',
    createdAt: article.publishAt,
    updatedAt: new Date(),
  }});
  console.log(JSON.stringify({ pidBlog: created.pidBlog, slug: created.blogSlug, publishAt: created.createdAt, image }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
