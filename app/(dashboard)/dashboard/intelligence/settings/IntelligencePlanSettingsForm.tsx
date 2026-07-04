'use client';

import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

type PlanSetting = {
  planKey: 'starter' | 'pro';
  name: string;
  priceNaira: number;
  paystackPlanCode: string | null;
  monthlySearchCredits: number;
  extraCreditPriceNaira: number;
};

const emptyPlans: PlanSetting[] = [
  {
    planKey: 'starter',
    name: 'Starter Database',
    priceNaira: 10000,
    paystackPlanCode: '',
    monthlySearchCredits: 1,
    extraCreditPriceNaira: 5000,
  },
  {
    planKey: 'pro',
    name: 'Pro Review Support',
    priceNaira: 25000,
    paystackPlanCode: '',
    monthlySearchCredits: 3,
    extraCreditPriceNaira: 5000,
  },
];

export default function IntelligencePlanSettingsForm() {
  const [plans, setPlans] = useState<PlanSetting[]>(emptyPlans);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);
      try {
        const response = await fetch('/api/intelligence/settings', {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok || data?.statusx !== 'SUCCESS') {
          throw new Error(data?.message || 'Failed to load pricing settings.');
        }

        if (mounted && Array.isArray(data.data)) {
          setPlans(
            data.data.map((plan: PlanSetting) => ({
              planKey: plan.planKey,
              name: plan.name || '',
              priceNaira: Number(plan.priceNaira || 0),
              paystackPlanCode: plan.paystackPlanCode || '',
              monthlySearchCredits: Number(plan.monthlySearchCredits || 0),
              extraCreditPriceNaira: Number(plan.extraCreditPriceNaira || 0),
            })),
          );
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load pricing settings.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const updatePlan = (
    planKey: PlanSetting['planKey'],
    field: keyof Omit<PlanSetting, 'planKey'>,
    value: string,
  ) => {
    setPlans((current) =>
      current.map((plan) =>
        plan.planKey === planKey
          ? {
              ...plan,
              [field]:
                field === 'priceNaira' ||
                field === 'monthlySearchCredits' ||
                field === 'extraCreditPriceNaira'
                  ? Number(value || 0)
                  : value,
            }
          : plan,
      ),
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/intelligence/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans }),
      });
      const data = await response.json();
      if (!response.ok || data?.statusx !== 'SUCCESS') {
        throw new Error(data?.message || 'Failed to save pricing settings.');
      }
      toast.success('Supplier Intelligence pricing updated.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save pricing settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((plan) => (
          <section
            key={plan.planKey}
            className="rounded-xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {plan.planKey} plan
                </p>
                <h2 className="mt-1 text-lg font-bold text-foreground">
                  {plan.name || plan.planKey}
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Display Name
                </span>
                <input
                  value={plan.name}
                  disabled={loading}
                  onChange={(event) => updatePlan(plan.planKey, 'name', event.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Search Credits
                  </span>
                  <input
                    value={plan.monthlySearchCredits}
                    type="number"
                    min={0}
                    step={1}
                    disabled={loading}
                    onChange={(event) =>
                      updatePlan(plan.planKey, 'monthlySearchCredits', event.target.value)
                    }
                    className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Credits automatically granted when this plan renews.
                  </p>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Extra Credit Price (Naira)
                  </span>
                  <input
                    value={plan.extraCreditPriceNaira}
                    type="number"
                    min={0}
                    step={500}
                    disabled={loading}
                    onChange={(event) =>
                      updatePlan(plan.planKey, 'extraCreditPriceNaira', event.target.value)
                    }
                    className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Used when we add paid top-up credits.
                  </p>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Price (Naira)
                </span>
                <input
                  value={plan.priceNaira}
                  type="number"
                  min={1000}
                  step={500}
                  disabled={loading}
                  onChange={(event) => updatePlan(plan.planKey, 'priceNaira', event.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Paystack Plan Code
                </span>
                <input
                  value={plan.paystackPlanCode || ''}
                  disabled={loading}
                  onChange={(event) =>
                    updatePlan(plan.planKey, 'paystackPlanCode', event.target.value)
                  }
                  placeholder="PLN_xxxxxxxxx"
                  className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Create or update this recurring plan in Paystack with the same monthly amount.
                </p>
              </label>
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading || saving}
          onClick={saveSettings}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save pricing
        </button>
      </div>
    </div>
  );
}
