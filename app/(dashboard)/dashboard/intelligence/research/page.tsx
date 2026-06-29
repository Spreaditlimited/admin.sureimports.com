import IntelligenceResearchAgent from './ResearchAgent';

export default function IntelligenceResearchPage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Supplier Research Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate supplier research drafts, review the evidence, then approve
          before anything becomes visible to customers.
        </p>
      </div>

      <IntelligenceResearchAgent />
    </div>
  );
}
