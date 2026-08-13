import type { Metadata } from 'next';

import QuotationBuilder from './QuotationBuilder';

export const metadata: Metadata = {
  title: 'Quotation Builder | Sure Imports Admin',
  description: 'Build branded Sure Imports quotations from supplier images and PDF documents.',
};

export default async function QuotationBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ linkedRequestId?: string }>;
}) {
  const params = await searchParams;
  return <QuotationBuilder linkedRequestId={String(params.linkedRequestId || '').trim()} />;
}
