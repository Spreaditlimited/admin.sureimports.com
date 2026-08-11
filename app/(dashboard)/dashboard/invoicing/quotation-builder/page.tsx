import type { Metadata } from 'next';

import QuotationBuilder from './QuotationBuilder';

export const metadata: Metadata = {
  title: 'Quotation Builder | Sure Imports Admin',
  description: 'Build branded Sure Imports quotations from supplier images and PDF documents.',
};

export default function QuotationBuilderPage() {
  return <QuotationBuilder />;
}
