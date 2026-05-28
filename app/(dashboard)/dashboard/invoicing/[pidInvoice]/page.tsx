import InvoiceDetails from '../components/InvoiceDetails';

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ pidInvoice: string }>;
}) {
  // Await the params promise as per Next.js 15 requirements
  const { pidInvoice } = await params;
  
  return (
    // Standard vertical rhythm for the dashboard canvas
    <div className="space-y-6">
      
      {/* COMPONENT ARCHITECTURE:
        We rely on InvoiceDetails to render its own internal Header 
        (Back button, Title, and Status badges). This keeps the 
        entry file light and ensures the header is tightly coupled 
        with the data fetching state inside the component.
      */}
      <InvoiceDetails pidInvoice={pidInvoice} />
      
    </div>
  );
}