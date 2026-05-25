import { redirect } from 'next/navigation';

export default async function CustomerInvoicePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  redirect(`https://www.sureimports.com/invoice/${encodeURIComponent(accessToken)}`);
}
