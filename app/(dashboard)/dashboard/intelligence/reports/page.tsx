import IntelligenceReportsManager from "./IntelligenceReportsManager";

export default function IntelligenceReportsPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Supplier Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Turn an approved supplier category into a versioned, customer-ready
          report. Generate a draft, review the PDF, then publish the selected
          edition.
        </p>
      </div>
      <IntelligenceReportsManager />
    </main>
  );
}
