import CustomerInvoiceClient from './CustomerInvoiceClient';

export default async function CustomerInvoicePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  return <CustomerInvoiceClient accessToken={accessToken} />;
}
