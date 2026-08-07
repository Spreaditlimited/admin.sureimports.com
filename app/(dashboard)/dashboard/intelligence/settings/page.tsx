import IntelligencePlanSettingsForm from './IntelligencePlanSettingsForm';

export default function IntelligenceSettingsPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Supplier Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Pricing Settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Configure one-time manufacturer report prices and monthly subscription
          pricing. Changes to report pricing apply across the full report library.
        </p>
      </div>

      <IntelligencePlanSettingsForm />
    </main>
  );
}
