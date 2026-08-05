import { prisma } from '@/lib/prisma';

export type SocialSource = {
  type: 'blog' | 'service'; ref: string; title: string; summary: string;
  pillar: 'educational' | 'bottom_funnel'; url: string;
};

const services: Omit<SocialSource, 'pillar'>[] = [
  { type: 'service', ref: 'procurement', title: 'China product sourcing and procurement', summary: 'Sure Imports helps Nigerian businesses source products, coordinate suppliers and manage procurement from China with clearer controls.', url: 'https://www.sureimports.com/source-products-from-china' },
  { type: 'service', ref: 'shipping', title: 'Shipping from China to Nigeria', summary: 'Sure Imports coordinates international shipping so importers can make better logistics decisions and reduce avoidable surprises.', url: 'https://www.sureimports.com/ship-with-us' },
  { type: 'service', ref: 'supplier-payment', title: 'Pay suppliers in China', summary: 'Sure Imports provides a structured route for Nigerian businesses to pay verified Chinese suppliers and preserve transaction clarity.', url: 'https://www.sureimports.com/dashboard/pay-supplier/create' },
  { type: 'service', ref: 'supplier-intelligence', title: 'Supplier intelligence', summary: 'Sure Imports helps buyers investigate suppliers and surface risks before committing to a transaction.', url: 'https://www.sureimports.com/supplier-intelligence' },
  { type: 'service', ref: 'corporate-sourcing', title: 'Corporate sourcing', summary: 'Sure Imports manages tailored sourcing for organisations that need consistency, coordination and accountable delivery.', url: 'https://www.sureimports.com/corporate-sourcing' },
];

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4500);
}

export async function selectDailySocialSource(now = new Date()): Promise<SocialSource> {
  const watDay = new Date(now.getTime() + 60 * 60 * 1000).getUTCDay();
  const pillar: SocialSource['pillar'] = [1, 2, 4, 6].includes(watDay) ? 'educational' : 'bottom_funnel';
  const recent = await prisma.social_campaign.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 21 * 86400000) } },
    select: { sourceRef: true }, orderBy: { createdAt: 'desc' }, take: 30,
  });
  const used = new Set(recent.map((item) => item.sourceRef).filter(Boolean));

  if (pillar === 'educational') {
    const blogs = await prisma.blog.findMany({
      where: { blogPublished: true, blogContent: { not: null } },
      select: { pidBlog: true, blogTitle: true, blogSlug: true, blogContent: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }], take: 40,
    });
    const blog = blogs.find((item) => !used.has(item.pidBlog)) || blogs[0];
    if (blog) return {
      type: 'blog', ref: blog.pidBlog, title: blog.blogTitle,
      summary: stripHtml(blog.blogContent || ''), pillar,
      url: `https://www.sureimports.com/blog/${blog.blogSlug || ''}`,
    };
  }

  const index = Math.floor(now.getTime() / 86400000) % services.length;
  const service = [...services.slice(index), ...services.slice(0, index)].find((item) => !used.has(item.ref)) || services[index];
  return { ...service, pillar };
}
